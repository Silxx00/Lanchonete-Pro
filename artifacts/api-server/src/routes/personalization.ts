/**
 * GET /api/products/:id/personalization
 * Returns a unified personalization payload for a product:
 * - baseIngredients (removable)
 * - extras (paid add-ons)
 * - options (add / remove / choice)
 *
 * Designed for the digital menu / ordering flow.
 */
import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import {
  db,
  productsTable,
  productIngredientsTable,
  productExtrasTable,
  productOptionsTable,
} from "../db";
import { requireAuth } from "../middleware/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/products/:id/personalization", requireAuth, async (req, res): Promise<void> => {
  try {
    const productId = parseInt(req.params.id);
    if (isNaN(productId)) { res.status(400).json({ error: "ID inválido" }); return; }

    const [product] = await db
      .select({ id: productsTable.id, name: productsTable.name, active: productsTable.active })
      .from(productsTable)
      .where(eq(productsTable.id, productId));

    if (!product) { res.status(404).json({ error: "Produto não encontrado" }); return; }

    const [ingredients, extras, options] = await Promise.all([
      db.select().from(productIngredientsTable)
        .where(and(eq(productIngredientsTable.productId, productId), eq(productIngredientsTable.active, true)))
        .orderBy(productIngredientsTable.name),
      db.select().from(productExtrasTable)
        .where(eq(productExtrasTable.productId, productId))
        .orderBy(productExtrasTable.name),
      db.select().from(productOptionsTable)
        .where(eq(productOptionsTable.productId, productId))
        .orderBy(productOptionsTable.type, productOptionsTable.name),
    ]);

    res.json({
      productId: product.id,
      productName: product.name,
      baseIngredients: ingredients.map((i) => ({
        id: i.id,
        name: i.name,
        removable: true,
      })),
      extras: extras
        .filter((e) => e.active)
        .map((e) => ({
          id: e.id,
          name: e.name,
          price: parseFloat(e.price),
        })),
      options: {
        add: options.filter((o) => o.type === "add" && o.active).map((o) => ({
          id: o.id,
          name: o.name,
          price: parseFloat(o.price),
        })),
        remove: options.filter((o) => o.type === "remove" && o.active).map((o) => ({
          id: o.id,
          name: o.name,
        })),
        choice: options.filter((o) => o.type === "choice" && o.active).map((o) => ({
          id: o.id,
          name: o.name,
          price: parseFloat(o.price),
        })),
      },
    });
  } catch (err) {
    logger.error({ err }, "Erro ao buscar personalização do produto");
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
