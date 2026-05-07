import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, promotionsTable } from "@workspace/db";
import { auditLog } from "../lib/audit";
import { requireAuth, requireAdminOrManager, type AuthRequest } from "../middleware/auth";
import {
  CreatePromotionBody,
  UpdatePromotionBody,
  GetPromotionParams,
  UpdatePromotionParams,
  DeletePromotionParams,
  ListPromotionsResponse,
  GetPromotionResponse,
  UpdatePromotionResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function toPromotionDto(p: typeof promotionsTable.$inferSelect) {
  return {
    id: p.id,
    name: p.name,
    description: p.description ?? null,
    type: p.type,
    discountValue: Number(p.discountValue),
    code: p.code ?? null,
    minOrderValue: p.minOrderValue ? Number(p.minOrderValue) : null,
    active: p.active,
    startDate: p.startDate ? p.startDate.toISOString() : null,
    endDate: p.endDate ? p.endDate.toISOString() : null,
    usageCount: p.usageCount,
    maxUsage: p.maxUsage ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

router.get("/promotions", requireAuth, async (_req, res): Promise<void> => {
  const promotions = await db.select().from(promotionsTable).orderBy(promotionsTable.createdAt);
  res.json(ListPromotionsResponse.parse(promotions.map(toPromotionDto)));
});

router.post("/promotions", requireAuth, requireAdminOrManager, async (req: AuthRequest, res): Promise<void> => {
  const parsed = CreatePromotionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [promotion] = await db
    .insert(promotionsTable)
    .values({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      type: parsed.data.type,
      discountValue: String(parsed.data.discountValue),
      code: parsed.data.code ?? null,
      minOrderValue: parsed.data.minOrderValue != null ? String(parsed.data.minOrderValue) : null,
      active: parsed.data.active ?? true,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
      maxUsage: parsed.data.maxUsage ?? null,
    })
    .returning();
  await auditLog({ userId: req.user!.sub, userEmail: req.user!.email, action: "create", entity: "promotion", entityId: promotion.id, details: { name: promotion.name }, req });
  res.status(201).json(GetPromotionResponse.parse(toPromotionDto(promotion)));
});

router.get("/promotions/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetPromotionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [promotion] = await db.select().from(promotionsTable).where(eq(promotionsTable.id, params.data.id));
  if (!promotion) {
    res.status(404).json({ error: "Promoção não encontrada" });
    return;
  }
  res.json(GetPromotionResponse.parse(toPromotionDto(promotion)));
});

router.patch("/promotions/:id", requireAuth, requireAdminOrManager, async (req: AuthRequest, res): Promise<void> => {
  const params = UpdatePromotionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdatePromotionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updateData: Record<string, unknown> = {};
  if (parsed.data.name != null) updateData.name = parsed.data.name;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description ?? null;
  if (parsed.data.type != null) updateData.type = parsed.data.type;
  if (parsed.data.discountValue != null) updateData.discountValue = String(parsed.data.discountValue);
  if (parsed.data.code !== undefined) updateData.code = parsed.data.code ?? null;
  if (parsed.data.minOrderValue !== undefined)
    updateData.minOrderValue = parsed.data.minOrderValue != null ? String(parsed.data.minOrderValue) : null;
  if (parsed.data.active != null) updateData.active = parsed.data.active;
  if (parsed.data.startDate !== undefined)
    updateData.startDate = parsed.data.startDate ? new Date(parsed.data.startDate) : null;
  if (parsed.data.endDate !== undefined)
    updateData.endDate = parsed.data.endDate ? new Date(parsed.data.endDate) : null;
  if (parsed.data.maxUsage !== undefined) updateData.maxUsage = parsed.data.maxUsage ?? null;

  const [promotion] = await db
    .update(promotionsTable)
    .set(updateData)
    .where(eq(promotionsTable.id, params.data.id))
    .returning();
  if (!promotion) {
    res.status(404).json({ error: "Promoção não encontrada" });
    return;
  }
  await auditLog({ userId: req.user!.sub, userEmail: req.user!.email, action: "update", entity: "promotion", entityId: promotion.id, details: updateData, req });
  res.json(UpdatePromotionResponse.parse(toPromotionDto(promotion)));
});

router.delete("/promotions/:id", requireAuth, requireAdminOrManager, async (req: AuthRequest, res): Promise<void> => {
  const params = DeletePromotionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [promotion] = await db.delete(promotionsTable).where(eq(promotionsTable.id, params.data.id)).returning();
  if (!promotion) {
    res.status(404).json({ error: "Promoção não encontrada" });
    return;
  }
  await auditLog({ userId: req.user!.sub, userEmail: req.user!.email, action: "delete", entity: "promotion", entityId: params.data.id, req });
  res.sendStatus(204);
});

export default router;
