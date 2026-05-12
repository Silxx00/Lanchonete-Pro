import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db, productOptionsTable } from "../db";
import { requireAuth, requireAdminOrManager, type AuthRequest } from "../middleware/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const OPTION_TYPES = ["add", "remove", "choice"] as const;

const CreateOptionBody = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  price: z.coerce.number().min(0).default(0),
  type: z.enum(OPTION_TYPES).default("add"),
  active: z.boolean().optional().default(true),
});

const UpdateOptionBody = z.object({
  name: z.string().min(1).nullish(),
  price: z.coerce.number().min(0).nullish(),
  type: z.enum(OPTION_TYPES).nullish(),
  active: z.boolean().nullish(),
});

function fmtOption(o: typeof productOptionsTable.$inferSelect) {
  return {
    id: o.id,
    productId: o.productId,
    name: o.name,
    price: parseFloat(o.price),
    type: o.type,
    active: o.active,
    createdAt: o.createdAt.toISOString(),
  };
}

// GET /products/:id/options
router.get("/products/:id/options", requireAuth, async (req, res): Promise<void> => {
  try {
    const productId = parseInt(req.params.id);
    if (isNaN(productId)) { res.status(400).json({ error: "ID inválido" }); return; }
    const rows = await db
      .select()
      .from(productOptionsTable)
      .where(eq(productOptionsTable.productId, productId))
      .orderBy(productOptionsTable.type, productOptionsTable.name);
    res.json(rows.map(fmtOption));
  } catch (err) {
    logger.error({ err }, "Erro ao listar opcionais");
    res.status(500).json({ error: "Erro interno" });
  }
});

// POST /products/:id/options
router.post("/products/:id/options", requireAuth, requireAdminOrManager, async (req: AuthRequest, res): Promise<void> => {
  try {
    const productId = parseInt(req.params.id);
    if (isNaN(productId)) { res.status(400).json({ error: "ID inválido" }); return; }
    const parsed = CreateOptionBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
    const [option] = await db.insert(productOptionsTable).values({
      productId,
      name: parsed.data.name.trim(),
      price: String(parsed.data.price),
      type: parsed.data.type,
      active: parsed.data.active ?? true,
    }).returning();
    res.status(201).json(fmtOption(option));
  } catch (err) {
    logger.error({ err }, "Erro ao criar opcional");
    res.status(500).json({ error: "Erro interno" });
  }
});

// PATCH /products/:id/options/:optionId
router.patch("/products/:id/options/:optionId", requireAuth, requireAdminOrManager, async (req: AuthRequest, res): Promise<void> => {
  try {
    const productId = parseInt(req.params.id);
    const optionId = parseInt(req.params.optionId);
    if (isNaN(productId) || isNaN(optionId)) { res.status(400).json({ error: "ID inválido" }); return; }
    const parsed = UpdateOptionBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
    const updates: Record<string, unknown> = {};
    if (parsed.data.name != null) updates.name = parsed.data.name.trim();
    if (parsed.data.price != null) updates.price = String(parsed.data.price);
    if (parsed.data.type != null) updates.type = parsed.data.type;
    if (parsed.data.active != null) updates.active = parsed.data.active;
    const [option] = await db.update(productOptionsTable).set(updates)
      .where(and(eq(productOptionsTable.id, optionId), eq(productOptionsTable.productId, productId)))
      .returning();
    if (!option) { res.status(404).json({ error: "Opcional não encontrado" }); return; }
    res.json(fmtOption(option));
  } catch (err) {
    logger.error({ err }, "Erro ao atualizar opcional");
    res.status(500).json({ error: "Erro interno" });
  }
});

// DELETE /products/:id/options/:optionId
router.delete("/products/:id/options/:optionId", requireAuth, requireAdminOrManager, async (req: AuthRequest, res): Promise<void> => {
  try {
    const productId = parseInt(req.params.id);
    const optionId = parseInt(req.params.optionId);
    if (isNaN(productId) || isNaN(optionId)) { res.status(400).json({ error: "ID inválido" }); return; }
    const [option] = await db.delete(productOptionsTable)
      .where(and(eq(productOptionsTable.id, optionId), eq(productOptionsTable.productId, productId)))
      .returning();
    if (!option) { res.status(404).json({ error: "Opcional não encontrado" }); return; }
    res.sendStatus(204);
  } catch (err) {
    logger.error({ err }, "Erro ao excluir opcional");
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
