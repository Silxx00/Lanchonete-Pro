import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/healthz", async (_req, res): Promise<void> => {
  try {
    await db.execute(sql`SELECT 1`);
    res.json(HealthCheckResponse.parse({ status: "ok" }));
  } catch {
    res.status(503).json({ status: "error", message: "Database unavailable" });
  }
});

export default router;
