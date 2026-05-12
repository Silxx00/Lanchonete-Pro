import { Router, type IRouter } from "express";
import { and, gte, lt, lte, eq, desc, sql } from "drizzle-orm";
import * as z from "zod";
import { db } from "../db";
import { ordersTable, expensesTable, cashClosingsTable } from "../db";
import { requireAuth, requireAdminOrManager, type AuthRequest } from "../middleware/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

export const EXPENSE_CATEGORIES = [
  "Fornecedores", "Funcionários", "Aluguel", "Energia", "Água",
  "Gás", "Marketing", "Equipamentos", "Manutenção", "Outros",
];

const CreateExpenseBody = z.object({
  description: z.string().min(1),
  amount: z.number().positive(),
  category: z.string().default("Outros"),
  date: z.string(),
  notes: z.string().nullish(),
});

const UpdateExpenseBody = z.object({
  description: z.string().min(1).nullish(),
  amount: z.number().positive().nullish(),
  category: z.string().nullish(),
  date: z.string().nullish(),
  notes: z.string().nullish(),
});

const CreateCashClosingBody = z.object({
  periodStart: z.string(),
  periodEnd: z.string(),
  cashAmount: z.number().min(0).nullish(),
  pixAmount: z.number().min(0).nullish(),
  cardAmount: z.number().min(0).nullish(),
  notes: z.string().nullish(),
});

function getMonthRange(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { start, end };
}

function fmtExpense(e: typeof expensesTable.$inferSelect) {
  return {
    ...e,
    amount: parseFloat(e.amount),
    date: e.date.toISOString(),
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

function fmtClosing(c: typeof cashClosingsTable.$inferSelect) {
  return {
    ...c,
    grossRevenue: parseFloat(c.grossRevenue),
    totalExpenses: parseFloat(c.totalExpenses),
    netProfit: parseFloat(c.netProfit),
    cashAmount: c.cashAmount != null ? parseFloat(c.cashAmount) : null,
    pixAmount: c.pixAmount != null ? parseFloat(c.pixAmount) : null,
    cardAmount: c.cardAmount != null ? parseFloat(c.cardAmount) : null,
    countedTotal: c.countedTotal != null ? parseFloat(c.countedTotal) : null,
    periodStart: c.periodStart.toISOString(),
    periodEnd: c.periodEnd.toISOString(),
    createdAt: c.createdAt.toISOString(),
  };
}

// GET /api/financial/summary
router.get("/financial/summary", requireAuth, requireAdminOrManager, async (req: AuthRequest, res) => {
  try {
    const now = new Date();
    const year = parseInt(req.query.year as string) || now.getFullYear();
    const month = parseInt(req.query.month as string) || (now.getMonth() + 1);
    const { start, end } = getMonthRange(year, month);

    const [revRow, cntRow, expRow] = await Promise.all([
      db.select({ v: sql<string>`COALESCE(SUM(${ordersTable.total}), 0)` })
        .from(ordersTable)
        .where(and(eq(ordersTable.status, "delivered"), gte(ordersTable.createdAt, start), lt(ordersTable.createdAt, end))),
      db.select({ v: sql<string>`COUNT(*)` })
        .from(ordersTable)
        .where(and(eq(ordersTable.status, "delivered"), gte(ordersTable.createdAt, start), lt(ordersTable.createdAt, end))),
      db.select({ v: sql<string>`COALESCE(SUM(${expensesTable.amount}), 0)` })
        .from(expensesTable)
        .where(and(gte(expensesTable.date, start), lt(expensesTable.date, end))),
    ]);

    const grossRevenue = parseFloat(revRow[0]?.v ?? "0");
    const totalExpenses = parseFloat(expRow[0]?.v ?? "0");
    const netProfit = grossRevenue - totalExpenses;
    const orderCount = parseInt(cntRow[0]?.v ?? "0");
    const margin = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;

    res.json({ year, month, grossRevenue, totalExpenses, netProfit, orderCount, margin: +margin.toFixed(2) });
  } catch (err) {
    logger.error({ err }, "Erro ao buscar resumo financeiro");
    res.status(500).json({ error: "Erro ao buscar resumo financeiro" });
  }
});

// GET /api/financial/monthly-chart
router.get("/financial/monthly-chart", requireAuth, requireAdminOrManager, async (_req: AuthRequest, res) => {
  try {
    const now = new Date();

    const monthRanges = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      return { year, month, ...getMonthRange(year, month) };
    });

    const results = await Promise.all(
      monthRanges.map(async ({ start, end }) => {
        const [rev, exp] = await Promise.all([
          db.select({ v: sql<string>`COALESCE(SUM(${ordersTable.total}), 0)` })
            .from(ordersTable).where(and(eq(ordersTable.status, "delivered"), gte(ordersTable.createdAt, start), lt(ordersTable.createdAt, end))),
          db.select({ v: sql<string>`COALESCE(SUM(${expensesTable.amount}), 0)` })
            .from(expensesTable).where(and(gte(expensesTable.date, start), lt(expensesTable.date, end))),
        ]);

        const revenue = parseFloat(rev[0]?.v ?? "0");
        const expenses = parseFloat(exp[0]?.v ?? "0");
        return {
          month: start.toLocaleDateString("pt-BR", { month: "short", year: "2-digit", timeZone: "UTC" }),
          revenue,
          expenses,
          profit: revenue - expenses,
        };
      })
    );

    res.json(results);
  } catch (err) {
    logger.error({ err }, "Erro ao buscar gráfico mensal");
    res.status(500).json({ error: "Erro ao buscar gráfico mensal" });
  }
});

// GET /api/financial/expenses
router.get("/financial/expenses", requireAuth, requireAdminOrManager, async (req: AuthRequest, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const offset = (page - 1) * limit;
    const category = req.query.category as string | undefined;
    const month = req.query.month as string | undefined;

    const conds: ReturnType<typeof eq>[] = [];
    if (category) conds.push(eq(expensesTable.category, category));
    if (month) {
      const [y, m] = month.split("-").map(Number);
      const { start, end } = getMonthRange(y, m);
      conds.push(gte(expensesTable.date, start) as ReturnType<typeof eq>);
      conds.push(lt(expensesTable.date, end) as ReturnType<typeof eq>);
    }

    const where = conds.length ? and(...conds) : undefined;

    const [data, countRow] = await Promise.all([
      db.select().from(expensesTable).where(where).orderBy(desc(expensesTable.date)).limit(limit).offset(offset),
      db.select({ v: sql<string>`COUNT(*)` }).from(expensesTable).where(where),
    ]);

    res.json({ data: data.map(fmtExpense), total: parseInt(countRow[0]?.v ?? "0"), page, limit });
  } catch (err) {
    logger.error({ err }, "Erro ao listar despesas");
    res.status(500).json({ error: "Erro ao listar despesas" });
  }
});

// POST /api/financial/expenses
router.post("/financial/expenses", requireAuth, requireAdminOrManager, async (req: AuthRequest, res) => {
  try {
    const parsed = CreateExpenseBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Dados inválidos" }); return; }
    const { description, amount, category, date, notes } = parsed.data;

    const [row] = await db.insert(expensesTable).values({
      description, amount: amount.toFixed(2), category,
      date: new Date(date), notes: notes ?? null, createdBy: req.user?.sub ?? null,
    }).returning();

    res.status(201).json(fmtExpense(row));
  } catch (err) {
    logger.error({ err }, "Erro ao criar despesa");
    res.status(500).json({ error: "Erro ao criar despesa" });
  }
});

// PATCH /api/financial/expenses/:id
router.patch("/financial/expenses/:id", requireAuth, requireAdminOrManager, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }

    const parsed = UpdateExpenseBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Dados inválidos" }); return; }

    const updates: Record<string, unknown> = {};
    if (parsed.data.description != null) updates.description = parsed.data.description;
    if (parsed.data.amount != null) updates.amount = parsed.data.amount.toFixed(2);
    if (parsed.data.category != null) updates.category = parsed.data.category;
    if (parsed.data.date != null) updates.date = new Date(parsed.data.date);
    if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes ?? null;

    const [row] = await db.update(expensesTable).set(updates).where(eq(expensesTable.id, id)).returning();
    if (!row) { res.status(404).json({ error: "Despesa não encontrada" }); return; }

    res.json(fmtExpense(row));
  } catch (err) {
    logger.error({ err }, "Erro ao atualizar despesa");
    res.status(500).json({ error: "Erro ao atualizar despesa" });
  }
});

// DELETE /api/financial/expenses/:id
router.delete("/financial/expenses/:id", requireAuth, requireAdminOrManager, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }

    const [row] = await db.delete(expensesTable).where(eq(expensesTable.id, id)).returning();
    if (!row) { res.status(404).json({ error: "Despesa não encontrada" }); return; }

    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "Erro ao excluir despesa");
    res.status(500).json({ error: "Erro ao excluir despesa" });
  }
});

// GET /api/financial/cash-closings
router.get("/financial/cash-closings", requireAuth, requireAdminOrManager, async (_req: AuthRequest, res) => {
  try {
    const rows = await db.select().from(cashClosingsTable).orderBy(desc(cashClosingsTable.createdAt)).limit(20);
    res.json(rows.map(fmtClosing));
  } catch (err) {
    logger.error({ err }, "Erro ao listar fechamentos" );
    res.status(500).json({ error: "Erro ao listar fechamentos" });
  }
});

// POST /api/financial/cash-closings
router.post("/financial/cash-closings", requireAuth, requireAdminOrManager, async (req: AuthRequest, res) => {
  try {
    const parsed = CreateCashClosingBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Dados inválidos" }); return; }

    const periodStart = new Date(parsed.data.periodStart);
    const periodEnd = new Date(parsed.data.periodEnd);

    const [revRow, expRow, cntRow] = await Promise.all([
      db.select({ v: sql<string>`COALESCE(SUM(${ordersTable.total}), 0)` })
        .from(ordersTable).where(and(eq(ordersTable.status, "delivered"), gte(ordersTable.createdAt, periodStart), lte(ordersTable.createdAt, periodEnd))),
      db.select({ v: sql<string>`COALESCE(SUM(${expensesTable.amount}), 0)` })
        .from(expensesTable).where(and(gte(expensesTable.date, periodStart), lte(expensesTable.date, periodEnd))),
      db.select({ v: sql<string>`COUNT(*)` })
        .from(ordersTable).where(and(eq(ordersTable.status, "delivered"), gte(ordersTable.createdAt, periodStart), lte(ordersTable.createdAt, periodEnd))),
    ]);

    const grossRevenue = parseFloat(revRow[0]?.v ?? "0");
    const totalExpenses = parseFloat(expRow[0]?.v ?? "0");
    const netProfit = grossRevenue - totalExpenses;
    const orderCount = parseInt(cntRow[0]?.v ?? "0");

    const cashAmount = parsed.data.cashAmount ?? null;
    const pixAmount = parsed.data.pixAmount ?? null;
    const cardAmount = parsed.data.cardAmount ?? null;
    const countedTotal =
      cashAmount != null || pixAmount != null || cardAmount != null
        ? (cashAmount ?? 0) + (pixAmount ?? 0) + (cardAmount ?? 0)
        : null;

    const [row] = await db.insert(cashClosingsTable).values({
      periodStart, periodEnd,
      grossRevenue: grossRevenue.toFixed(2),
      totalExpenses: totalExpenses.toFixed(2),
      netProfit: netProfit.toFixed(2),
      orderCount,
      cashAmount: cashAmount != null ? cashAmount.toFixed(2) : null,
      pixAmount: pixAmount != null ? pixAmount.toFixed(2) : null,
      cardAmount: cardAmount != null ? cardAmount.toFixed(2) : null,
      countedTotal: countedTotal != null ? countedTotal.toFixed(2) : null,
      notes: parsed.data.notes ?? null,
      closedBy: req.user?.sub ?? null,
    }).returning();

    res.status(201).json(fmtClosing(row));
  } catch (err) {
    logger.error({ err }, "Erro ao criar fechamento de caixa");
    res.status(500).json({ error: "Erro ao criar fechamento de caixa" });
  }
});

// GET /api/financial/insights
router.get("/financial/insights", requireAuth, requireAdminOrManager, async (_req: AuthRequest, res) => {
  try {
    const now = new Date();
    const cy = now.getFullYear(), cm = now.getMonth() + 1;
    const py = cm === 1 ? cy - 1 : cy, pm = cm === 1 ? 12 : cm - 1;

    const { start: cs, end: ce } = getMonthRange(cy, cm);
    const { start: ps, end: pe } = getMonthRange(py, pm);

    const [cRev, pRev, cExp, pExp, cats] = await Promise.all([
      db.select({ v: sql<string>`COALESCE(SUM(${ordersTable.total}), 0)` }).from(ordersTable).where(and(eq(ordersTable.status, "delivered"), gte(ordersTable.createdAt, cs), lt(ordersTable.createdAt, ce))),
      db.select({ v: sql<string>`COALESCE(SUM(${ordersTable.total}), 0)` }).from(ordersTable).where(and(eq(ordersTable.status, "delivered"), gte(ordersTable.createdAt, ps), lt(ordersTable.createdAt, pe))),
      db.select({ v: sql<string>`COALESCE(SUM(${expensesTable.amount}), 0)` }).from(expensesTable).where(and(gte(expensesTable.date, cs), lt(expensesTable.date, ce))),
      db.select({ v: sql<string>`COALESCE(SUM(${expensesTable.amount}), 0)` }).from(expensesTable).where(and(gte(expensesTable.date, ps), lt(expensesTable.date, pe))),
      db.select({ category: expensesTable.category, total: sql<string>`COALESCE(SUM(${expensesTable.amount}), 0)` })
        .from(expensesTable).where(and(gte(expensesTable.date, cs), lt(expensesTable.date, ce)))
        .groupBy(expensesTable.category).orderBy(sql`SUM(${expensesTable.amount}) DESC`).limit(5),
    ]);

    const cr = parseFloat(cRev[0]?.v ?? "0"), pr = parseFloat(pRev[0]?.v ?? "0");
    const ce2 = parseFloat(cExp[0]?.v ?? "0"), pe2 = parseFloat(pExp[0]?.v ?? "0");

    const revenueGrowth = pr > 0 ? ((cr - pr) / pr) * 100 : (cr > 0 ? 100 : 0);
    const expenseGrowth = pe2 > 0 ? ((ce2 - pe2) / pe2) * 100 : (ce2 > 0 ? 100 : 0);
    const netProfit = cr - ce2;
    const margin = cr > 0 ? (netProfit / cr) * 100 : 0;

    const alerts: string[] = [];
    if (ce2 > cr * 0.8 && cr > 0) alerts.push("Gastos acima de 80% da receita — atenção ao fluxo de caixa.");
    if (revenueGrowth < -10) alerts.push("Receita caiu mais de 10% em relação ao mês anterior.");
    if (expenseGrowth > 20) alerts.push("Despesas cresceram mais de 20% em relação ao mês anterior.");
    if (margin < 15 && cr > 0) alerts.push("Margem de lucro abaixo de 15% — revise os custos operacionais.");

    res.json({
      revenueGrowth: +revenueGrowth.toFixed(2),
      expenseGrowth: +expenseGrowth.toFixed(2),
      netProfit,
      margin: +margin.toFixed(2),
      topExpenseCategory: cats[0] ? { name: cats[0].category, amount: parseFloat(cats[0].total) } : null,
      categoryBreakdown: cats.map(c => ({ name: c.category, amount: parseFloat(c.total) })),
      alerts,
      availableCategories: EXPENSE_CATEGORIES,
    });
  } catch (err) {
    logger.error({ err }, "Erro ao gerar insights financeiros");
    res.status(500).json({ error: "Erro ao gerar insights financeiros" });
  }
});

export default router;
