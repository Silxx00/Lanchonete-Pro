import { Router, type IRouter } from "express";
import { eq, and, ilike } from "drizzle-orm";
import { db, productsTable, categoriesTable } from "../db";
import { auditLog } from "../lib/audit";
import { logger } from "../lib/logger";
import { requireAuth, requireAdminOrManager, type AuthRequest } from "../middleware/auth";
import {
  CreateProductBody,
  UpdateProductBody,
  GetProductParams,
  UpdateProductParams,
  DeleteProductParams,
  ListProductsQueryParams,
  ListProductsResponse,
  GetProductResponse,
  UpdateProductResponse,
} from "../validation/api";

const router: IRouter = Router();

function normalizeString(val: string | null | undefined): string | null {
  if (val == null) return null;
  const trimmed = val.trim();
  return trimmed === "" ? null : trimmed;
}

function normalizeCategoryId(val: number | null | undefined): number | null {
  if (val == null || val <= 0 || !Number.isFinite(val)) return null;
  return val;
}

function toProductDto(
  p: typeof productsTable.$inferSelect,
  categoryName?: string | null
) {
  return {
    id: p.id,
    name: p.name,
    description: p.description ?? null,
    price: Number(p.price),
    imageUrl: p.imageUrl ?? null,
    categoryId: p.categoryId ?? null,
    categoryName: categoryName ?? null,
    stock: p.stock,
    active: p.active,
    featured: p.featured,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

router.get("/products", requireAuth, async (req, res): Promise<void> => {
  try {
    const queryParams = ListProductsQueryParams.safeParse(req.query);
    if (!queryParams.success) {
      res.status(400).json({ error: queryParams.error.message });
      return;
    }
    const { categoryId, search, active } = queryParams.data;

    const conditions = [];
    if (categoryId != null) conditions.push(eq(productsTable.categoryId, categoryId));
    if (search) conditions.push(ilike(productsTable.name, `%${search}%`));
    if (active != null) conditions.push(eq(productsTable.active, active === "true"));

    const products = await db
      .select({ product: productsTable, categoryName: categoriesTable.name })
      .from(productsTable)
      .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(productsTable.name);

    res.json(ListProductsResponse.parse(products.map(({ product, categoryName }) => toProductDto(product, categoryName))));
  } catch (err) {
    logger.error({ err }, "Erro ao listar produtos");
    res.status(500).json({ error: "Erro interno ao listar produtos" });
  }
});

router.post("/products", requireAuth, requireAdminOrManager, async (req: AuthRequest, res): Promise<void> => {
  try {
    logger.info({
      body: {
        name: req.body?.name,
        price: req.body?.price,
        categoryId: req.body?.categoryId,
        hasDescription: !!req.body?.description,
        hasImageUrl: !!req.body?.imageUrl,
        stock: req.body?.stock,
      },
    }, "POST /products recebido");

    const parsed = CreateProductBody.safeParse(req.body);
    if (!parsed.success) {
      logger.warn({ errors: parsed.error.issues }, "Validação falhou ao criar produto");
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const categoryId = normalizeCategoryId(parsed.data.categoryId);

    if (categoryId != null) {
      const [cat] = await db
        .select({ id: categoriesTable.id })
        .from(categoriesTable)
        .where(eq(categoriesTable.id, categoryId));
      if (!cat) {
        logger.warn({ categoryId }, "category_id inválido ao criar produto");
        res.status(400).json({ error: `Categoria com id ${categoryId} não encontrada` });
        return;
      }
    }

    const [productResult, catRow] = await Promise.all([
      db.insert(productsTable)
        .values({
          name: parsed.data.name.trim(),
          description: normalizeString(parsed.data.description),
          price: String(parsed.data.price),
          imageUrl: normalizeString(parsed.data.imageUrl),
          categoryId,
          stock: parsed.data.stock ?? 0,
          active: parsed.data.active ?? true,
          featured: parsed.data.featured ?? false,
        })
        .returning(),
      categoryId != null
        ? db.select({ name: categoriesTable.name })
            .from(categoriesTable)
            .where(eq(categoriesTable.id, categoryId))
            .then((r) => r[0] ?? null)
        : Promise.resolve(null),
    ]);

    const [product] = productResult;

    if (!product) {
      logger.error({ name: parsed.data.name }, "INSERT de produto não retornou linha");
      res.status(500).json({ error: "Falha ao criar produto no banco de dados" });
      return;
    }

    const categoryName = catRow?.name ?? null;
    logger.info({ id: product.id, name: product.name, categoryId }, "Produto criado com sucesso");
    await auditLog({ userId: req.user!.sub, userEmail: req.user!.email, action: "create", entity: "product", entityId: product.id, details: { name: product.name }, req });
    res.status(201).json(GetProductResponse.parse(toProductDto(product, categoryName)));
  } catch (err) {
    logger.error({ err }, "Erro ao criar produto");
    res.status(500).json({ error: "Erro interno ao criar produto" });
  }
});

router.get("/products/:id", requireAuth, async (req, res): Promise<void> => {
  try {
    const params = GetProductParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [row] = await db
      .select({ product: productsTable, categoryName: categoriesTable.name })
      .from(productsTable)
      .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
      .where(eq(productsTable.id, params.data.id));

    if (!row) {
      res.status(404).json({ error: "Produto não encontrado" });
      return;
    }
    res.json(GetProductResponse.parse(toProductDto(row.product, row.categoryName)));
  } catch (err) {
    logger.error({ err }, "Erro ao buscar produto");
    res.status(500).json({ error: "Erro interno ao buscar produto" });
  }
});

router.patch("/products/:id", requireAuth, requireAdminOrManager, async (req: AuthRequest, res): Promise<void> => {
  try {
    const params = UpdateProductParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = UpdateProductBody.safeParse(req.body);
    if (!parsed.success) {
      logger.warn({ errors: parsed.error.issues }, "Validação falhou ao atualizar produto");
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const updateData: Record<string, unknown> = {};
    if (parsed.data.name != null) updateData.name = parsed.data.name.trim();
    if (parsed.data.description !== undefined) updateData.description = normalizeString(parsed.data.description);
    if (parsed.data.price != null) updateData.price = String(parsed.data.price);
    if (parsed.data.imageUrl !== undefined) updateData.imageUrl = normalizeString(parsed.data.imageUrl);
    if (parsed.data.categoryId !== undefined) updateData.categoryId = normalizeCategoryId(parsed.data.categoryId);
    if (parsed.data.stock != null) updateData.stock = parsed.data.stock;
    if (parsed.data.active != null) updateData.active = parsed.data.active;
    if (parsed.data.featured != null) updateData.featured = parsed.data.featured;

    const [product] = await db
      .update(productsTable)
      .set(updateData)
      .where(eq(productsTable.id, params.data.id))
      .returning();

    if (!product) {
      res.status(404).json({ error: "Produto não encontrado" });
      return;
    }

    const [row] = await db
      .select({ product: productsTable, categoryName: categoriesTable.name })
      .from(productsTable)
      .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
      .where(eq(productsTable.id, product.id));

    logger.info({ id: product.id }, "Produto atualizado com sucesso");
    await auditLog({ userId: req.user!.sub, userEmail: req.user!.email, action: "update", entity: "product", entityId: product.id, details: updateData, req });
    res.json(UpdateProductResponse.parse(toProductDto(row?.product ?? product, row?.categoryName ?? null)));
  } catch (err) {
    logger.error({ err }, "Erro ao atualizar produto");
    res.status(500).json({ error: "Erro interno ao atualizar produto" });
  }
});

router.delete("/products/:id", requireAuth, requireAdminOrManager, async (req: AuthRequest, res): Promise<void> => {
  try {
    const params = DeleteProductParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [product] = await db.delete(productsTable).where(eq(productsTable.id, params.data.id)).returning();
    if (!product) {
      res.status(404).json({ error: "Produto não encontrado" });
      return;
    }
    logger.info({ id: params.data.id, name: product.name }, "Produto excluído com sucesso");
    await auditLog({ userId: req.user!.sub, userEmail: req.user!.email, action: "delete", entity: "product", entityId: params.data.id, details: { name: product.name }, req });
    res.sendStatus(204);
  } catch (err) {
    logger.error({ err }, "Erro ao excluir produto");
    res.status(500).json({ error: "Erro interno ao excluir produto" });
  }
});

export default router;
