import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, categoriesTable } from "../db";
import { auditLog } from "../lib/audit";
import { logger } from "../lib/logger";
import { requireAuth, requireAdminOrManager, type AuthRequest } from "../middleware/auth";
import {
  CreateCategoryBody,
  UpdateCategoryBody,
  GetCategoryParams,
  UpdateCategoryParams,
  DeleteCategoryParams,
  ListCategoriesResponse,
  GetCategoryResponse,
  UpdateCategoryResponse,
} from "../validation/api";

const router: IRouter = Router();

function normalizeString(val: string | null | undefined): string | null {
  if (val == null) return null;
  const trimmed = val.trim();
  return trimmed === "" ? null : trimmed;
}

function toCategoryDto(c: typeof categoriesTable.$inferSelect) {
  return {
    id: c.id,
    name: c.name,
    description: c.description ?? null,
    imageUrl: c.imageUrl ?? null,
    active: c.active,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

router.get("/categories", requireAuth, async (_req, res): Promise<void> => {
  try {
    const cats = await db.select().from(categoriesTable).orderBy(categoriesTable.name);
    res.json(ListCategoriesResponse.parse(cats.map(toCategoryDto)));
  } catch (err) {
    logger.error({ err }, "Falha ao listar categorias");
    res.status(500).json({ error: "Erro interno ao listar categorias" });
  }
});

router.post("/categories", requireAuth, requireAdminOrManager, async (req: AuthRequest, res): Promise<void> => {
  try {
    logger.info({ body: { name: req.body?.name, hasDescription: !!req.body?.description, hasImageUrl: !!req.body?.imageUrl } }, "POST /categories recebido");

    const parsed = CreateCategoryBody.safeParse(req.body);
    if (!parsed.success) {
      logger.warn({ errors: parsed.error.issues }, "Validação falhou ao criar categoria");
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [cat] = await db
      .insert(categoriesTable)
      .values({
        name: parsed.data.name.trim(),
        description: normalizeString(parsed.data.description),
        imageUrl: normalizeString(parsed.data.imageUrl),
        active: parsed.data.active ?? true,
      })
      .returning();

    if (!cat) {
      logger.error({ name: parsed.data.name }, "INSERT de categoria não retornou linha");
      res.status(500).json({ error: "Falha ao criar categoria no banco de dados" });
      return;
    }

    logger.info({ id: cat.id, name: cat.name }, "Categoria criada com sucesso");
    await auditLog({ userId: req.user!.sub, userEmail: req.user!.email, action: "create", entity: "category", entityId: cat.id, details: { name: cat.name }, req });
    res.status(201).json(GetCategoryResponse.parse(toCategoryDto(cat)));
  } catch (err) {
    logger.error({ err }, "Erro ao criar categoria");
    res.status(500).json({ error: "Erro interno ao criar categoria" });
  }
});

router.get("/categories/:id", requireAuth, async (req, res): Promise<void> => {
  try {
    const params = GetCategoryParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, params.data.id));
    if (!cat) {
      res.status(404).json({ error: "Categoria não encontrada" });
      return;
    }
    res.json(GetCategoryResponse.parse(toCategoryDto(cat)));
  } catch (err) {
    logger.error({ err }, "Erro ao buscar categoria");
    res.status(500).json({ error: "Erro interno ao buscar categoria" });
  }
});

router.patch("/categories/:id", requireAuth, requireAdminOrManager, async (req: AuthRequest, res): Promise<void> => {
  try {
    const params = UpdateCategoryParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = UpdateCategoryBody.safeParse(req.body);
    if (!parsed.success) {
      logger.warn({ errors: parsed.error.issues }, "Validação falhou ao atualizar categoria");
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const updateData: Record<string, unknown> = {};
    if (parsed.data.name != null) updateData.name = parsed.data.name.trim();
    if (parsed.data.description !== undefined) updateData.description = normalizeString(parsed.data.description);
    if (parsed.data.imageUrl !== undefined) updateData.imageUrl = normalizeString(parsed.data.imageUrl);
    if (parsed.data.active != null) updateData.active = parsed.data.active;

    const [cat] = await db
      .update(categoriesTable)
      .set(updateData)
      .where(eq(categoriesTable.id, params.data.id))
      .returning();
    if (!cat) {
      res.status(404).json({ error: "Categoria não encontrada" });
      return;
    }
    logger.info({ id: cat.id }, "Categoria atualizada com sucesso");
    await auditLog({ userId: req.user!.sub, userEmail: req.user!.email, action: "update", entity: "category", entityId: cat.id, details: updateData, req });
    res.json(UpdateCategoryResponse.parse(toCategoryDto(cat)));
  } catch (err) {
    logger.error({ err }, "Erro ao atualizar categoria");
    res.status(500).json({ error: "Erro interno ao atualizar categoria" });
  }
});

router.delete("/categories/:id", requireAuth, requireAdminOrManager, async (req: AuthRequest, res): Promise<void> => {
  try {
    const params = DeleteCategoryParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [cat] = await db.delete(categoriesTable).where(eq(categoriesTable.id, params.data.id)).returning();
    if (!cat) {
      res.status(404).json({ error: "Categoria não encontrada" });
      return;
    }
    logger.info({ id: params.data.id }, "Categoria excluída com sucesso");
    await auditLog({ userId: req.user!.sub, userEmail: req.user!.email, action: "delete", entity: "category", entityId: params.data.id, req });
    res.sendStatus(204);
  } catch (err) {
    logger.error({ err }, "Erro ao excluir categoria");
    res.status(500).json({ error: "Erro interno ao excluir categoria" });
  }
});

export default router;
