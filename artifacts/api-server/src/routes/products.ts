import { Router, type IRouter } from "express";
import { eq, and, ilike, sql } from "drizzle-orm";
import { db, productsTable, categoriesTable } from "@workspace/db";
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
} from "@workspace/api-zod";

const router: IRouter = Router();

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

router.get("/products", async (req, res): Promise<void> => {
  const queryParams = ListProductsQueryParams.safeParse(req.query);
  if (!queryParams.success) {
    res.status(400).json({ error: queryParams.error.message });
    return;
  }
  const { categoryId, search, active } = queryParams.data;

  const conditions = [];
  if (categoryId != null) {
    conditions.push(eq(productsTable.categoryId, categoryId));
  }
  if (search) {
    conditions.push(ilike(productsTable.name, `%${search}%`));
  }
  if (active != null) {
    const isActive = active === "true";
    conditions.push(eq(productsTable.active, isActive));
  }

  const products = await db
    .select({
      product: productsTable,
      categoryName: categoriesTable.name,
    })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(productsTable.name);

  const result = products.map(({ product, categoryName }) =>
    toProductDto(product, categoryName)
  );
  res.json(ListProductsResponse.parse(result));
});

router.post("/products", async (req, res): Promise<void> => {
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [product] = await db
    .insert(productsTable)
    .values({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      price: String(parsed.data.price),
      imageUrl: parsed.data.imageUrl ?? null,
      categoryId: parsed.data.categoryId ?? null,
      stock: parsed.data.stock ?? 0,
      active: parsed.data.active ?? true,
      featured: parsed.data.featured ?? false,
    })
    .returning();

  let categoryName: string | null = null;
  if (product.categoryId) {
    const [cat] = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, product.categoryId));
    categoryName = cat?.name ?? null;
  }
  res.status(201).json(GetProductResponse.parse(toProductDto(product, categoryName)));
});

router.get("/products/:id", async (req, res): Promise<void> => {
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
});

router.patch("/products/:id", async (req, res): Promise<void> => {
  const params = UpdateProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updateData: Record<string, unknown> = {};
  if (parsed.data.name != null) updateData.name = parsed.data.name;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description ?? null;
  if (parsed.data.price != null) updateData.price = String(parsed.data.price);
  if (parsed.data.imageUrl !== undefined) updateData.imageUrl = parsed.data.imageUrl ?? null;
  if (parsed.data.categoryId !== undefined) updateData.categoryId = parsed.data.categoryId ?? null;
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

  let categoryName: string | null = null;
  if (product.categoryId) {
    const [cat] = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, product.categoryId));
    categoryName = cat?.name ?? null;
  }
  res.json(UpdateProductResponse.parse(toProductDto(product, categoryName)));
});

router.delete("/products/:id", async (req, res): Promise<void> => {
  const params = DeleteProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [product] = await db
    .delete(productsTable)
    .where(eq(productsTable.id, params.data.id))
    .returning();
  if (!product) {
    res.status(404).json({ error: "Produto não encontrado" });
    return;
  }
  res.sendStatus(204);
});

export default router;
