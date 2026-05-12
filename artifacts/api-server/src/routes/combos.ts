import { Router, type IRouter } from "express";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db, combosTable, comboItemsTable, productsTable } from "../db";
import { requireAuth, requireAdminOrManager, type AuthRequest } from "../middleware/auth";
import { logger } from "../lib/logger";
import { auditLog } from "../lib/audit";

const router: IRouter = Router();

const CreateComboBody = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  description: z.string().nullish(),
  imageUrl: z.string().nullish(),
  price: z.coerce.number().min(0).default(0),
  active: z.boolean().optional().default(true),
  featured: z.boolean().optional().default(false),
});

const UpdateComboBody = z.object({
  name: z.string().min(1).nullish(),
  description: z.string().nullish(),
  imageUrl: z.string().nullish(),
  price: z.coerce.number().min(0).nullish(),
  active: z.boolean().nullish(),
  featured: z.boolean().nullish(),
});

const AddComboItemBody = z.object({
  productId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().min(1).default(1),
});

function fmtComboItem(item: typeof comboItemsTable.$inferSelect) {
  return {
    id: item.id,
    comboId: item.comboId,
    productId: item.productId ?? null,
    productName: item.productName,
    quantity: item.quantity,
  };
}

function fmtCombo(combo: typeof combosTable.$inferSelect, items: typeof comboItemsTable.$inferSelect[] = []) {
  return {
    id: combo.id,
    name: combo.name,
    description: combo.description ?? null,
    imageUrl: combo.imageUrl ?? null,
    price: parseFloat(combo.price),
    active: combo.active,
    featured: combo.featured,
    items: items.map(fmtComboItem),
    createdAt: combo.createdAt.toISOString(),
    updatedAt: combo.updatedAt.toISOString(),
  };
}

async function getComboWithItems(comboId: number) {
  const [combo] = await db.select().from(combosTable).where(eq(combosTable.id, comboId));
  if (!combo) return null;
  const items = await db.select().from(comboItemsTable).where(eq(comboItemsTable.comboId, comboId));
  return fmtCombo(combo, items);
}

// GET /combos
router.get("/combos", requireAuth, async (_req, res): Promise<void> => {
  try {
    const combos = await db.select().from(combosTable).orderBy(combosTable.name);
    const comboIds = combos.map((c) => c.id);
    const allItems = comboIds.length > 0
      ? await db.select().from(comboItemsTable).where(inArray(comboItemsTable.comboId, comboIds))
      : [];
    const itemsByCombo = new Map<number, typeof allItems>();
    for (const item of allItems) {
      const list = itemsByCombo.get(item.comboId) ?? [];
      list.push(item);
      itemsByCombo.set(item.comboId, list);
    }
    res.json(combos.map((c) => fmtCombo(c, itemsByCombo.get(c.id) ?? [])));
  } catch (err) {
    logger.error({ err }, "Erro ao listar combos");
    res.status(500).json({ error: "Erro interno ao listar combos" });
  }
});

// GET /combos/:id
router.get("/combos/:id", requireAuth, async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
    const combo = await getComboWithItems(id);
    if (!combo) { res.status(404).json({ error: "Combo não encontrado" }); return; }
    res.json(combo);
  } catch (err) {
    logger.error({ err }, "Erro ao buscar combo");
    res.status(500).json({ error: "Erro interno" });
  }
});

// POST /combos
router.post("/combos", requireAuth, requireAdminOrManager, async (req: AuthRequest, res): Promise<void> => {
  try {
    const parsed = CreateComboBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
    const [combo] = await db.insert(combosTable).values({
      name: parsed.data.name.trim(),
      description: parsed.data.description?.trim() ?? null,
      imageUrl: parsed.data.imageUrl?.trim() ?? null,
      price: String(parsed.data.price),
      active: parsed.data.active ?? true,
      featured: parsed.data.featured ?? false,
    }).returning();
    await auditLog({ userId: req.user!.sub, userEmail: req.user!.email, action: "create", entity: "combo", entityId: combo.id, details: { name: combo.name }, req });
    res.status(201).json(fmtCombo(combo, []));
  } catch (err) {
    logger.error({ err }, "Erro ao criar combo");
    res.status(500).json({ error: "Erro interno ao criar combo" });
  }
});

// PATCH /combos/:id
router.patch("/combos/:id", requireAuth, requireAdminOrManager, async (req: AuthRequest, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
    const parsed = UpdateComboBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
    const updates: Record<string, unknown> = {};
    if (parsed.data.name != null) updates.name = parsed.data.name.trim();
    if (parsed.data.description !== undefined) updates.description = parsed.data.description?.trim() ?? null;
    if (parsed.data.imageUrl !== undefined) updates.imageUrl = parsed.data.imageUrl?.trim() ?? null;
    if (parsed.data.price != null) updates.price = String(parsed.data.price);
    if (parsed.data.active != null) updates.active = parsed.data.active;
    if (parsed.data.featured != null) updates.featured = parsed.data.featured;
    const [combo] = await db.update(combosTable).set(updates).where(eq(combosTable.id, id)).returning();
    if (!combo) { res.status(404).json({ error: "Combo não encontrado" }); return; }
    await auditLog({ userId: req.user!.sub, userEmail: req.user!.email, action: "update", entity: "combo", entityId: id, details: updates, req });
    const result = await getComboWithItems(id);
    res.json(result);
  } catch (err) {
    logger.error({ err }, "Erro ao atualizar combo");
    res.status(500).json({ error: "Erro interno ao atualizar combo" });
  }
});

// DELETE /combos/:id
router.delete("/combos/:id", requireAuth, requireAdminOrManager, async (req: AuthRequest, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
    await db.delete(comboItemsTable).where(eq(comboItemsTable.comboId, id));
    const [combo] = await db.delete(combosTable).where(eq(combosTable.id, id)).returning();
    if (!combo) { res.status(404).json({ error: "Combo não encontrado" }); return; }
    await auditLog({ userId: req.user!.sub, userEmail: req.user!.email, action: "delete", entity: "combo", entityId: id, req });
    res.sendStatus(204);
  } catch (err) {
    logger.error({ err }, "Erro ao excluir combo");
    res.status(500).json({ error: "Erro interno ao excluir combo" });
  }
});

// ── Combo Items ──────────────────────────────────────────────────────────────

// POST /combos/:id/items
router.post("/combos/:id/items", requireAuth, requireAdminOrManager, async (req: AuthRequest, res): Promise<void> => {
  try {
    const comboId = parseInt(req.params.id);
    if (isNaN(comboId)) { res.status(400).json({ error: "ID inválido" }); return; }
    const parsed = AddComboItemBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

    const [product] = await db.select({ id: productsTable.id, name: productsTable.name })
      .from(productsTable)
      .where(eq(productsTable.id, parsed.data.productId));

    const [item] = await db.insert(comboItemsTable).values({
      comboId,
      productId: parsed.data.productId,
      productName: product?.name ?? "Produto removido",
      quantity: parsed.data.quantity,
    }).returning();
    res.status(201).json(fmtComboItem(item));
  } catch (err) {
    logger.error({ err }, "Erro ao adicionar item ao combo");
    res.status(500).json({ error: "Erro interno" });
  }
});

// DELETE /combos/:id/items/:itemId
router.delete("/combos/:id/items/:itemId", requireAuth, requireAdminOrManager, async (req: AuthRequest, res): Promise<void> => {
  try {
    const comboId = parseInt(req.params.id);
    const itemId = parseInt(req.params.itemId);
    if (isNaN(comboId) || isNaN(itemId)) { res.status(400).json({ error: "ID inválido" }); return; }
    const [item] = await db.delete(comboItemsTable)
      .where(eq(comboItemsTable.id, itemId))
      .returning();
    if (!item) { res.status(404).json({ error: "Item não encontrado" }); return; }
    res.sendStatus(204);
  } catch (err) {
    logger.error({ err }, "Erro ao remover item do combo");
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
