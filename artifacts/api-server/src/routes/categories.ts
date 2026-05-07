import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, categoriesTable } from "@workspace/db";
import { auditLog } from "../lib/audit";
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
} from "@workspace/api-zod";

const router: IRouter = Router();

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
  const cats = await db.select().from(categoriesTable).orderBy(categoriesTable.name);
  res.json(ListCategoriesResponse.parse(cats.map(toCategoryDto)));
});

router.post("/categories", requireAuth, requireAdminOrManager, async (req: AuthRequest, res): Promise<void> => {
  const parsed = CreateCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [cat] = await db
    .insert(categoriesTable)
    .values({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      imageUrl: parsed.data.imageUrl ?? null,
      active: parsed.data.active ?? true,
    })
    .returning();
  await auditLog({ userId: req.user!.sub, userEmail: req.user!.email, action: "create", entity: "category", entityId: cat.id, details: { name: cat.name }, req });
  res.status(201).json(GetCategoryResponse.parse(toCategoryDto(cat)));
});

router.get("/categories/:id", requireAuth, async (req, res): Promise<void> => {
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
});

router.patch("/categories/:id", requireAuth, requireAdminOrManager, async (req: AuthRequest, res): Promise<void> => {
  const params = UpdateCategoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updateData: Record<string, unknown> = {};
  if (parsed.data.name != null) updateData.name = parsed.data.name;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description ?? null;
  if (parsed.data.imageUrl !== undefined) updateData.imageUrl = parsed.data.imageUrl ?? null;
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
  await auditLog({ userId: req.user!.sub, userEmail: req.user!.email, action: "update", entity: "category", entityId: cat.id, details: updateData, req });
  res.json(UpdateCategoryResponse.parse(toCategoryDto(cat)));
});

router.delete("/categories/:id", requireAuth, requireAdminOrManager, async (req: AuthRequest, res): Promise<void> => {
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
  await auditLog({ userId: req.user!.sub, userEmail: req.user!.email, action: "delete", entity: "category", entityId: params.data.id, req });
  res.sendStatus(204);
});

export default router;
