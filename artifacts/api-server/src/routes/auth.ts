import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { createHash, randomBytes } from "crypto";
import { db, usersTable } from "@workspace/db";
import {
  LoginBody,
  GetMeResponse,
  LoginResponse,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function hashPassword(password: string): string {
  return createHash("sha256").update(password + "nova-era-salt").digest("hex");
}

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

const tokenStore = new Map<string, number>();

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, password } = parsed.data;
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email));

  if (!user || user.passwordHash !== hashPassword(password)) {
    res.status(401).json({ error: "Email ou senha inválidos" });
    return;
  }

  if (!user.active) {
    res.status(401).json({ error: "Usuário inativo" });
    return;
  }

  const token = generateToken();
  tokenStore.set(token, user.id);

  const response = LoginResponse.parse({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    },
  });
  res.json(response);
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice(7);
    tokenStore.delete(token);
  }
  res.json({ message: "Deslogado com sucesso" });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Não autorizado" });
    return;
  }
  const token = auth.slice(7);
  const userId = tokenStore.get(token);
  if (!userId) {
    res.status(401).json({ error: "Token inválido ou expirado" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!user) {
    res.status(401).json({ error: "Usuário não encontrado" });
    return;
  }

  const response = GetMeResponse.parse({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  });
  res.json(response);
});

export { tokenStore, hashPassword };
export default router;
