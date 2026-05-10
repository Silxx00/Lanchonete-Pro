import { Router } from "express";
import { db } from "../db";
import { categoriesTable } from "../db/categories";

const router = Router();

// CRIAR CATEGORIA
router.post("/categories", async (req, res) => {
  const { name, description, imageUrl, active } = req.body;

  try {
    const result = await db
      .insert(categoriesTable)
      .values({
        name,
        description: description ?? null,
        imageUrl: imageUrl ?? null,
        active: active ?? true,
      })
      .returning();

    return res.json(result[0]);
  } catch (err: any) {
    console.error("ERRO CREATE CATEGORY:", err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
