import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import * as z from "zod";
import { db, productExtrasTable, productIngredientsTable } from "../db";
import { requireAuth, requireAdminOrManager, type AuthRequest } from "../middleware/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const CreateExtraBody = z.object({
  name: z.string().min(1),
  price: z.number().min(0).default(0),
  active: z.boolean().optional().default(true),
});

const UpdateExtraBody = z.object({
  name: z.string().min(1).nullish(),
  price: z.number().min(0).nullish(),
  active: z.boolean().nullish(),
});

const CreateIngredientBody = z.object({
  name: z.string().min(1),
  active: z.boolean().optional().default(true),
});

const UpdateIngredientBody = z.object({
  name: z.string().min(1).nullish(),
  active: z.boolean().nullish(),
});

function fmtExtra(e: typeof productExtrasTable.$inferSelect) {
  return {
    id: e.id,
    productId: e.productId,
    name: e.name,
    price: parseFloat(e.price),
    active: e.active,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

function fmtIngredient(i: typeof productIngredientsTable.$inferSelect) {
  return {
    id: i.id,
    productId: i.productId,
    name: i.name,
    active: i.active,
    createdAt: i.createdAt.toISOString(),
  };
}

// ── EXTRAS ──────────────────────────────────────────────────────────────────

router.get("/products/:id/extras", requireAuth, async (req, res): Promise<void> => {
  try {
    const productId = parseInt(req.params.id);
    if (isNaN(productId)) { res.status(400).json({ error: "ID inválido" }); return; }
    const rows = await db.select().from(productExtrasTable).where(eq(productExtrasTable.productId, productId));
    res.json(rows.map(fmtExtra));
  } catch (err) {
    logger.error({ err }, "Erro ao listar adicionais");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/products/:id/extras", requireAuth, requireAdminOrManager, async (req: AuthRequest, res): Promise<void> => {
  try {
    const productId = parseInt(req.params.id);
    if (isNaN(productId)) { res.status(400).json({ error: "ID inválido" }); return; }
    const parsed = CreateExtraBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
    const [extra] = await db.insert(productExtrasTable).values({
      productId,
      name: parsed.data.name.trim(),
      price: String(parsed.data.price),
      active: parsed.data.active ?? true,
    }).returning();
    res.status(201).json(fmtExtra(extra));
  } catch (err) {
    logger.error({ err }, "Erro ao criar adicional");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.patch("/products/:id/extras/:extraId", requireAuth, requireAdminOrManager, async (req: AuthRequest, res): Promise<void> => {
  try {
    const productId = parseInt(req.params.id);
    const extraId = parseInt(req.params.extraId);
    if (isNaN(productId) || isNaN(extraId)) { res.status(400).json({ error: "ID inválido" }); return; }
    const parsed = UpdateExtraBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
    const updates: Record<string, unknown> = {};
    if (parsed.data.name != null) updates.name = parsed.data.name.trim();
    if (parsed.data.price != null) updates.price = String(parsed.data.price);
    if (parsed.data.active != null) updates.active = parsed.data.active;
    const [extra] = await db.update(productExtrasTable).set(updates)
      .where(and(eq(productExtrasTable.id, extraId), eq(productExtrasTable.productId, productId)))
      .returning();
    if (!extra) { res.status(404).json({ error: "Adicional não encontrado" }); return; }
    res.json(fmtExtra(extra));
  } catch (err) {
    logger.error({ err }, "Erro ao atualizar adicional");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.delete("/products/:id/extras/:extraId", requireAuth, requireAdminOrManager, async (req: AuthRequest, res): Promise<void> => {
  try {
    const productId = parseInt(req.params.id);
    const extraId = parseInt(req.params.extraId);
    if (isNaN(productId) || isNaN(extraId)) { res.status(400).json({ error: "ID inválido" }); return; }
    const [extra] = await db.delete(productExtrasTable)
      .where(and(eq(productExtrasTable.id, extraId), eq(productExtrasTable.productId, productId)))
      .returning();
    if (!extra) { res.status(404).json({ error: "Adicional não encontrado" }); return; }
    res.sendStatus(204);
  } catch (err) {
    logger.error({ err }, "Erro ao excluir adicional");
    res.status(500).json({ error: "Erro interno" });
  }
});

// ── INGREDIENTS ──────────────────────────────────────────────────────────────

router.get("/products/:id/ingredients", requireAuth, async (req, res): Promise<void> => {
  try {
    const productId = parseInt(req.params.id);
    if (isNaN(productId)) { res.status(400).json({ error: "ID inválido" }); return; }
    const rows = await db.select().from(productIngredientsTable).where(eq(productIngredientsTable.productId, productId));
    res.json(rows.map(fmtIngredient));
  } catch (err) {
    logger.error({ err }, "Erro ao listar ingredientes");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/products/:id/ingredients", requireAuth, requireAdminOrManager, async (req: AuthRequest, res): Promise<void> => {
  try {
    const productId = parseInt(req.params.id);
    if (isNaN(productId)) { res.status(400).json({ error: "ID inválido" }); return; }
    const parsed = CreateIngredientBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
    const [ingredient] = await db.insert(productIngredientsTable).values({
      productId,
      name: parsed.data.name.trim(),
      active: parsed.data.active ?? true,
    }).returning();
    res.status(201).json(fmtIngredient(ingredient));
  } catch (err) {
    logger.error({ err }, "Erro ao criar ingrediente");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.patch("/products/:id/ingredients/:ingredientId", requireAuth, requireAdminOrManager, async (req: AuthRequest, res): Promise<void> => {
  try {
    const productId = parseInt(req.params.id);
    const ingredientId = parseInt(req.params.ingredientId);
    if (isNaN(productId) || isNaN(ingredientId)) { res.status(400).json({ error: "ID inválido" }); return; }
    const parsed = UpdateIngredientBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
    const updates: Record<string, unknown> = {};
    if (parsed.data.name != null) updates.name = parsed.data.name.trim();
    if (parsed.data.active != null) updates.active = parsed.data.active;
    const [ingredient] = await db.update(productIngredientsTable).set(updates)
      .where(and(eq(productIngredientsTable.id, ingredientId), eq(productIngredientsTable.productId, productId)))
      .returning();
    if (!ingredient) { res.status(404).json({ error: "Ingrediente não encontrado" }); return; }
    res.json(fmtIngredient(ingredient));
  } catch (err) {
    logger.error({ err }, "Erro ao atualizar ingrediente");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.delete("/products/:id/ingredients/:ingredientId", requireAuth, requireAdminOrManager, async (req: AuthRequest, res): Promise<void> => {
  try {
    const productId = parseInt(req.params.id);
    const ingredientId = parseInt(req.params.ingredientId);
    if (isNaN(productId) || isNaN(ingredientId)) { res.status(400).json({ error: "ID inválido" }); return; }
    const [ingredient] = await db.delete(productIngredientsTable)
      .where(and(eq(productIngredientsTable.id, ingredientId), eq(productIngredientsTable.productId, productId)))
      .returning();
    if (!ingredient) { res.status(404).json({ error: "Ingrediente não encontrado" }); return; }
    res.sendStatus(204);
  } catch (err) {
    logger.error({ err }, "Erro ao excluir ingrediente");
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
