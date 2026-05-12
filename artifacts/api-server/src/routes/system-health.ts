import { Router, type IRouter } from "express";
import { eq, count, sql, and } from "drizzle-orm";
import {
  db,
  combosTable,
  comboItemsTable,
  productsTable,
  categoriesTable,
} from "../db";
import { requireAuth, requireAdminOrManager } from "../middleware/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

interface HealthIssue {
  type: string;
  id?: number;
  name?: string;
  severity: "critical" | "high" | "warning" | "info";
  description: string;
  count?: number;
}

router.get(
  "/admin/health-check",
  requireAuth,
  requireAdminOrManager,
  async (_req, res): Promise<void> => {
    try {
      const issues: HealthIssue[] = [];

      // 1. Combos without any items
      const combosWithoutItems = await db
        .select({ id: combosTable.id, name: combosTable.name })
        .from(combosTable)
        .leftJoin(comboItemsTable, eq(comboItemsTable.comboId, combosTable.id))
        .groupBy(combosTable.id, combosTable.name)
        .having(sql`COUNT(${comboItemsTable.id}) = 0`);

      for (const combo of combosWithoutItems) {
        issues.push({
          type: "ORPHAN_COMBO",
          id: combo.id,
          name: combo.name,
          severity: "high",
          description: `Combo "${combo.name}" (id: ${combo.id}) não possui itens vinculados`,
        });
      }

      // 2. Products without a category
      const productsWithoutCategory = await db
        .select({ id: productsTable.id, name: productsTable.name })
        .from(productsTable)
        .where(sql`${productsTable.categoryId} IS NULL`);

      if (productsWithoutCategory.length > 0) {
        issues.push({
          type: "PRODUCTS_WITHOUT_CATEGORY",
          severity: "warning",
          description: `${productsWithoutCategory.length} produto(s) sem categoria atribuída`,
          count: productsWithoutCategory.length,
        });
      }

      // 3. Duplicate product names (case-insensitive)
      const duplicateProductRows = await db
        .select({
          name: productsTable.name,
          total: count(),
        })
        .from(productsTable)
        .groupBy(productsTable.name)
        .having(sql`COUNT(*) > 1`);

      for (const dup of duplicateProductRows) {
        issues.push({
          type: "DUPLICATE_PRODUCT_NAME",
          name: dup.name,
          severity: "warning",
          description: `Produto com nome duplicado: "${dup.name}" aparece ${dup.total} vezes`,
          count: dup.total,
        });
      }

      // 4. Duplicate combo names
      const duplicateComboRows = await db
        .select({
          name: combosTable.name,
          total: count(),
        })
        .from(combosTable)
        .groupBy(combosTable.name)
        .having(sql`COUNT(*) > 1`);

      for (const dup of duplicateComboRows) {
        issues.push({
          type: "DUPLICATE_COMBO_NAME",
          name: dup.name,
          severity: "warning",
          description: `Combo com nome duplicado: "${dup.name}" aparece ${dup.total} vezes`,
          count: dup.total,
        });
      }

      // 5. Combo items with null productId (products were deleted)
      const orphanComboItems = await db
        .select({ count: count() })
        .from(comboItemsTable)
        .where(sql`${comboItemsTable.productId} IS NULL`);

      const orphanCount = orphanComboItems[0]?.count ?? 0;
      if (orphanCount > 0) {
        issues.push({
          type: "ORPHAN_COMBO_ITEMS",
          severity: "warning",
          description: `${orphanCount} item(ns) de combo com produto deletado (product_id = NULL)`,
          count: orphanCount,
        });
      }

      // 6. Categories with no products
      const categoriesWithoutProducts = await db
        .select({ id: categoriesTable.id, name: categoriesTable.name })
        .from(categoriesTable)
        .leftJoin(productsTable, eq(productsTable.categoryId, categoriesTable.id))
        .groupBy(categoriesTable.id, categoriesTable.name)
        .having(sql`COUNT(${productsTable.id}) = 0`);

      if (categoriesWithoutProducts.length > 0) {
        issues.push({
          type: "EMPTY_CATEGORIES",
          severity: "info",
          description: `${categoriesWithoutProducts.length} categoria(s) sem produtos vinculados`,
          count: categoriesWithoutProducts.length,
        });
      }

      // 7. Summary counts
      const [totalProducts] = await db.select({ count: count() }).from(productsTable);
      const [totalCombos] = await db.select({ count: count() }).from(combosTable);
      const [totalComboItems] = await db.select({ count: count() }).from(comboItemsTable);
      const [activeProducts] = await db
        .select({ count: count() })
        .from(productsTable)
        .where(eq(productsTable.active, true));

      const criticalCount = issues.filter((i) => i.severity === "critical").length;
      const highCount = issues.filter((i) => i.severity === "high").length;
      const warningCount = issues.filter((i) => i.severity === "warning").length;
      const infoCount = issues.filter((i) => i.severity === "info").length;

      res.json({
        issues,
        summary: {
          totalIssues: issues.length,
          critical: criticalCount,
          high: highCount,
          warnings: warningCount,
          info: infoCount,
          status:
            criticalCount > 0
              ? "critical"
              : highCount > 0
              ? "degraded"
              : warningCount > 0
              ? "warnings"
              : "healthy",
        },
        stats: {
          totalProducts: totalProducts?.count ?? 0,
          activeProducts: activeProducts?.count ?? 0,
          totalCombos: totalCombos?.count ?? 0,
          totalComboItems: totalComboItems?.count ?? 0,
        },
        checkedAt: new Date().toISOString(),
      });
    } catch (err) {
      logger.error({ err }, "Erro no health check do sistema");
      res.status(500).json({ error: "Erro ao executar health check" });
    }
  },
);

export default router;
