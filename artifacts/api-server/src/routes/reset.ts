import { Router, type IRouter } from "express";
import { eq, desc, sql } from "drizzle-orm";
import {
  db,
  categoriesTable,
  productsTable,
  orderItemsTable,
  ordersTable,
  expensesTable,
  cashClosingsTable,
  promotionsTable,
  auditLogsTable,
} from "../db";
import { requireAuth, requireAdminOrManager, type AuthRequest } from "../middleware/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

async function logReset(
  userId: number | undefined,
  userEmail: string | undefined,
  resetType: string,
  details: Record<string, unknown>,
  ip?: string,
) {
  try {
    await db.insert(auditLogsTable).values({
      userId: userId ?? null,
      userEmail: userEmail ?? null,
      action: "SYSTEM_RESET",
      entity: resetType,
      details,
      ipAddress: ip ?? null,
    });
  } catch (err) {
    logger.warn({ err }, "Não foi possível registrar log de reset");
  }
}

// ── GET /api/reset/logs ────────────────────────────────────────────────────────
router.get("/api/reset/logs", requireAuth, requireAdminOrManager, async (req: AuthRequest, res): Promise<void> => {
  try {
    const logs = await db
      .select()
      .from(auditLogsTable)
      .where(eq(auditLogsTable.action, "SYSTEM_RESET"))
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(50);
    res.json(logs);
  } catch (err) {
    logger.error({ err }, "Erro ao buscar logs de reset");
    res.status(500).json({ error: "Erro ao buscar logs de reset" });
  }
});

// ── POST /api/reset/categories ────────────────────────────────────────────────
router.post("/api/reset/categories", requireAuth, requireAdminOrManager, async (req: AuthRequest, res): Promise<void> => {
  try {
    await db.execute(sql`UPDATE products SET category_id = NULL`);
    await db.delete(categoriesTable);
    await logReset(req.user?.id, req.user?.email, "categories", { message: "Todas as categorias foram removidas" }, req.ip);
    logger.info({ userId: req.user?.id, email: req.user?.email }, "RESET: categories");
    res.json({ message: "Categorias resetadas com sucesso" });
  } catch (err) {
    logger.error({ err }, "Erro ao resetar categorias");
    res.status(500).json({ error: "Erro ao resetar categorias" });
  }
});

// ── POST /api/reset/orders ────────────────────────────────────────────────────
router.post("/api/reset/orders", requireAuth, requireAdminOrManager, async (req: AuthRequest, res): Promise<void> => {
  try {
    await db.delete(orderItemsTable);
    await db.delete(ordersTable);
    await logReset(req.user?.id, req.user?.email, "orders", { message: "Todos os pedidos e itens foram removidos" }, req.ip);
    logger.info({ userId: req.user?.id, email: req.user?.email }, "RESET: orders");
    res.json({ message: "Pedidos resetados com sucesso" });
  } catch (err) {
    logger.error({ err }, "Erro ao resetar pedidos");
    res.status(500).json({ error: "Erro ao resetar pedidos" });
  }
});

// ── POST /api/reset/products ──────────────────────────────────────────────────
router.post("/api/reset/products", requireAuth, requireAdminOrManager, async (req: AuthRequest, res): Promise<void> => {
  try {
    // order_items.productId is NOT NULL FK — must delete dependents first
    await db.delete(orderItemsTable);
    await db.delete(ordersTable);
    // product_extras and product_ingredients have onDelete: cascade via FK
    await db.delete(productsTable);
    await logReset(req.user?.id, req.user?.email, "products", { message: "Produtos, adicionais, ingredientes e pedidos removidos" }, req.ip);
    logger.info({ userId: req.user?.id, email: req.user?.email }, "RESET: products");
    res.json({ message: "Produtos resetados com sucesso" });
  } catch (err) {
    logger.error({ err }, "Erro ao resetar produtos");
    res.status(500).json({ error: "Erro ao resetar produtos" });
  }
});

// ── POST /api/reset/financial ─────────────────────────────────────────────────
router.post("/api/reset/financial", requireAuth, requireAdminOrManager, async (req: AuthRequest, res): Promise<void> => {
  try {
    await db.delete(expensesTable);
    await db.delete(cashClosingsTable);
    await logReset(req.user?.id, req.user?.email, "financial", { message: "Despesas e fechamentos de caixa removidos" }, req.ip);
    logger.info({ userId: req.user?.id, email: req.user?.email }, "RESET: financial");
    res.json({ message: "Financeiro resetado com sucesso" });
  } catch (err) {
    logger.error({ err }, "Erro ao resetar financeiro");
    res.status(500).json({ error: "Erro ao resetar financeiro" });
  }
});

// ── POST /api/reset/promotions ────────────────────────────────────────────────
router.post("/api/reset/promotions", requireAuth, requireAdminOrManager, async (req: AuthRequest, res): Promise<void> => {
  try {
    await db.delete(promotionsTable);
    await logReset(req.user?.id, req.user?.email, "promotions", { message: "Todas as promoções foram removidas" }, req.ip);
    logger.info({ userId: req.user?.id, email: req.user?.email }, "RESET: promotions");
    res.json({ message: "Promoções resetadas com sucesso" });
  } catch (err) {
    logger.error({ err }, "Erro ao resetar promoções");
    res.status(500).json({ error: "Erro ao resetar promoções" });
  }
});

export default router;
