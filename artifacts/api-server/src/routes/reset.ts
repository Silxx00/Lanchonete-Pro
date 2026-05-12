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
      const deleted = await db.delete(categoriesTable).returning({ id: categoriesTable.id });
      const counts = { categoriesDeleted: deleted.length };
      await logReset(
        req.user?.sub, req.user?.email, "categories",
        { message: "Categorias resetadas", ...counts }, req.ip,
      );
      res.json({ message: "Categorias resetadas com sucesso", counts });
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
      const optionsDeleted = await db.delete(orderItemOptionsTable).returning({ id: orderItemOptionsTable.id });
      const itemsDeleted = await db.delete(orderItemsTable).returning({ id: orderItemsTable.id });
      const ordersDeleted = await db.delete(ordersTable).returning({ id: ordersTable.id });
      const counts = {
        ordersDeleted: ordersDeleted.length,
        orderItemsDeleted: itemsDeleted.length,
        orderItemOptionsDeleted: optionsDeleted.length,
      };
      await logReset(
        req.user?.sub, req.user?.email, "orders",
        { message: "Pedidos resetados", ...counts }, req.ip,
      );
      res.json({ message: "Pedidos resetados com sucesso", counts });
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
      const orderItemOptionsDeleted = await db.delete(orderItemOptionsTable).returning({ id: orderItemOptionsTable.id });
      const orderItemsDeleted = await db.delete(orderItemsTable).returning({ id: orderItemsTable.id });
      const ordersDeleted = await db.delete(ordersTable).returning({ id: ordersTable.id });

      // 2. Combo items que referenciam produto (set null para não quebrar combos)
      await db.execute(sql`UPDATE combo_items SET product_id = NULL, product_name = 'Produto removido' WHERE product_id IS NOT NULL`);

      // 3. Personalização do produto
      const optionsDeleted = await db.delete(productOptionsTable).returning({ id: productOptionsTable.id });
      const extrasDeleted = await db.delete(productExtrasTable).returning({ id: productExtrasTable.id });
      const ingredientsDeleted = await db.delete(productIngredientsTable).returning({ id: productIngredientsTable.id });

      // 4. Produtos
      const productsDeleted = await db.delete(productsTable).returning({ id: productsTable.id });

      const counts = {
        productsDeleted: productsDeleted.length,
        ordersDeleted: ordersDeleted.length,
        orderItemsDeleted: orderItemsDeleted.length,
        orderItemOptionsDeleted: orderItemOptionsDeleted.length,
        productOptionsDeleted: optionsDeleted.length,
        productExtrasDeleted: extrasDeleted.length,
        productIngredientsDeleted: ingredientsDeleted.length,
      };

      await logReset(
        req.user?.sub, req.user?.email, "products",
        { message: "Produtos resetados", ...counts }, req.ip,
      );
      res.json({ message: "Produtos resetados com sucesso", counts });
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
      const itemsDeleted = await db.delete(comboItemsTable).returning({ id: comboItemsTable.id });
      const combosDeleted = await db.delete(combosTable).returning({ id: combosTable.id });
      const counts = {
        combosDeleted: combosDeleted.length,
        comboItemsDeleted: itemsDeleted.length,
      };
      await logReset(
        req.user?.sub, req.user?.email, "combos",
        { message: "Combos resetados", ...counts }, req.ip,
      );
      res.json({ message: "Combos resetados com sucesso", counts });
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
      const expensesDeleted = await db.delete(expensesTable).returning({ id: expensesTable.id });
      const closingsDeleted = await db.delete(cashClosingsTable).returning({ id: cashClosingsTable.id });
      const counts = {
        expensesDeleted: expensesDeleted.length,
        cashClosingsDeleted: closingsDeleted.length,
      };
      await logReset(
        req.user?.sub, req.user?.email, "financial",
        { message: "Financeiro resetado", ...counts }, req.ip,
      );
      res.json({ message: "Financeiro resetado com sucesso", counts });
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
      const promoDeleted = await db.delete(promotionsTable).returning({ id: promotionsTable.id });
      const counts = { promotionsDeleted: promoDeleted.length };
      await logReset(
        req.user?.sub, req.user?.email, "promotions",
        { message: "Promoções resetadas", ...counts }, req.ip,
      );
      res.json({ message: "Promoções resetadas com sucesso", counts });
    } catch (err) {
      logger.error({ err }, "Erro ao resetar promoções");
      res.status(500).json({ error: "Erro ao resetar promoções" });
    }
  },
);

export default router;
