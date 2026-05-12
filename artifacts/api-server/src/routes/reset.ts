import { Router, type IRouter } from "express";
import { eq, desc, sql } from "drizzle-orm";
import {
  db,
  categoriesTable,
  productsTable,
  productOptionsTable,
  productExtrasTable,
  productIngredientsTable,
  orderItemsTable,
  orderItemOptionsTable,
  ordersTable,
  expensesTable,
  cashClosingsTable,
  promotionsTable,
  auditLogsTable,
  comboItemsTable,
  combosTable,
} from "../db";
import {
  requireAuth,
  requireAdminOrManager,
  type AuthRequest,
} from "../middleware/auth";
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

// ── LOGS ─────────────────────────────────────────────
router.get(
  "/reset/logs",
  requireAuth,
  requireAdminOrManager,
  async (req: AuthRequest, res) => {
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
  },
);

// ── CATEGORIES ───────────────────────────────────────
router.post(
  "/reset/categories",
  requireAuth,
  requireAdminOrManager,
  async (req: AuthRequest, res) => {
    try {
      await db.execute(sql`UPDATE products SET category_id = NULL`);
      await db.delete(categoriesTable);
      await logReset(req.user?.id, req.user?.email, "categories", { message: "Categorias resetadas" }, req.ip);
      res.json({ message: "Categorias resetadas com sucesso" });
    } catch (err) {
      logger.error({ err }, "Erro ao resetar categorias");
      res.status(500).json({ error: "Erro ao resetar categorias" });
    }
  },
);

// ── ORDERS ───────────────────────────────────────────
router.post(
  "/reset/orders",
  requireAuth,
  requireAdminOrManager,
  async (req: AuthRequest, res) => {
    try {
      await db.delete(orderItemOptionsTable);
      await db.delete(orderItemsTable);
      await db.delete(ordersTable);
      await logReset(req.user?.id, req.user?.email, "orders", { message: "Pedidos resetados" }, req.ip);
      res.json({ message: "Pedidos resetados com sucesso" });
    } catch (err) {
      logger.error({ err }, "Erro ao resetar pedidos");
      res.status(500).json({ error: "Erro ao resetar pedidos" });
    }
  },
);

// ── PRODUCTS (COMPLETO COM TODAS AS DEPENDÊNCIAS) ────
router.post(
  "/reset/products",
  requireAuth,
  requireAdminOrManager,
  async (req: AuthRequest, res) => {
    try {
      // 1. Dependências de order_items
      await db.delete(orderItemOptionsTable);
      await db.delete(orderItemsTable);
      await db.delete(ordersTable);

      // 2. Combo items que referenciam produto (set null para não quebrar combos)
      await db.execute(sql`UPDATE combo_items SET product_id = NULL, product_name = 'Produto removido' WHERE product_id IS NOT NULL`);

      // 3. Personalização do produto (cascade já cuidaria, mas sendo explícito)
      await db.delete(productOptionsTable);
      await db.delete(productExtrasTable);
      await db.delete(productIngredientsTable);

      // 4. Produtos
      await db.delete(productsTable);

      await logReset(req.user?.id, req.user?.email, "products", { message: "Produtos resetados" }, req.ip);
      res.json({ message: "Produtos resetados com sucesso" });
    } catch (err) {
      logger.error({ err }, "Erro ao resetar produtos");
      res.status(500).json({ error: "Erro ao resetar produtos" });
    }
  },
);

// ── COMBOS ───────────────────────────────────────────
router.post(
  "/reset/combos",
  requireAuth,
  requireAdminOrManager,
  async (req: AuthRequest, res) => {
    try {
      await db.delete(comboItemsTable);
      await db.delete(combosTable);
      await logReset(req.user?.id, req.user?.email, "combos", { message: "Combos resetados" }, req.ip);
      res.json({ message: "Combos resetados com sucesso" });
    } catch (err) {
      logger.error({ err }, "Erro ao resetar combos");
      res.status(500).json({ error: "Erro ao resetar combos" });
    }
  },
);

// ── FINANCIAL ────────────────────────────────────────
router.post(
  "/reset/financial",
  requireAuth,
  requireAdminOrManager,
  async (req: AuthRequest, res) => {
    try {
      await db.delete(expensesTable);
      await db.delete(cashClosingsTable);
      await logReset(req.user?.id, req.user?.email, "financial", { message: "Financeiro resetado" }, req.ip);
      res.json({ message: "Financeiro resetado com sucesso" });
    } catch (err) {
      logger.error({ err }, "Erro ao resetar financeiro");
      res.status(500).json({ error: "Erro ao resetar financeiro" });
    }
  },
);

// ── PROMOTIONS ───────────────────────────────────────
router.post(
  "/reset/promotions",
  requireAuth,
  requireAdminOrManager,
  async (req: AuthRequest, res) => {
    try {
      await db.delete(promotionsTable);
      await logReset(req.user?.id, req.user?.email, "promotions", { message: "Promoções resetadas" }, req.ip);
      res.json({ message: "Promoções resetadas com sucesso" });
    } catch (err) {
      logger.error({ err }, "Erro ao resetar promoções");
      res.status(500).json({ error: "Erro ao resetar promoções" });
    }
  },
);

export default router;
