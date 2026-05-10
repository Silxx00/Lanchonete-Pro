import { Router } from "express";
import { db } from "../db";
import { productsTable } from "../db/products";

const router = Router();

// CRIAR PRODUTO
router.post("/products", async (req, res) => {
  const {
    name,
    description,
    price,
    imageUrl,
    categoryId,
    stock,
    active,
    featured,
  } = req.body;

  try {
    const result = await db
      .insert(productsTable)
      .values({
        name,
        description: description ?? null,
        price,
        imageUrl: imageUrl ?? null,
        categoryId,
        stock: stock ?? 0,
        active: active ?? true,
        featured: featured ?? false,
      })
      .returning();

    return res.json(result[0]);
  } catch (err: any) {
    console.error("ERRO CREATE PRODUCT:", err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
