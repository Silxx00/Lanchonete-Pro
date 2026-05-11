import { Router, type IRouter } from "express";
import { eq, and, gte, lt } from "drizzle-orm";
import { db, usersTable, refreshTokensTable, loginAttemptsTable } from "../db";
import {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  verifyAccessToken,
} from "../lib/jwt";
import { auditLog } from "../lib/audit";
import { loginRateLimiter } from "../middleware/rateLimiter";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { logger } from "../lib/logger";
import { LoginBody, GetMeResponse, UpdateMeBody } from "../validation/api";

/* ✅ ADICIONADO AQUI (CORREÇÃO DO ERRO 500) */
import { verifyPassword } from "../lib/password";

const router: IRouter = Router();

/* =========================
   STATIC USERS (auth only)
========================= */

type StaticUserRole = "admin" | "gerente" | "funcionario";

const STATIC_USERS: {
  email: string;
  password: string;
  role: StaticUserRole;
  name: string;
}[] = [
  {
    email: "admin@novaera.com",
    password: "admin123",
    role: "admin",
    name: "admin",
  },
  {
    email: "gerente@novaera.com",
    password: "gerente123",
    role: "gerente",
    name: "gerente",
  },
  {
    email: "funcionario@novaera.com",
    password: "func123",
    role: "funcionario",
    name: "funcionario",
  },
];

const LOCKOUT_MAX_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;

/* =========================
   LOGIN ATTEMPTS
========================= */

async function countRecentFailures(email: string): Promise<number> {
  const since = new Date(Date.now() - LOCKOUT_WINDOW_MS);

  const rows = await db
    .select({ id: loginAttemptsTable.id })
    .from(loginAttemptsTable)
    .where(
      and(
        eq(loginAttemptsTable.email, email),
        eq(loginAttemptsTable.success, false),
        gte(loginAttemptsTable.createdAt, since),
      ),
    );

  return rows.length;
}

async function recordAttempt(
  email: string,
  ip: string | null,
  success: boolean,
) {
  try {
    await db.insert(loginAttemptsTable).values({
      email,
      ipAddress: ip,
      success,
    });
  } catch (err) {
    logger.error({ err }, "Failed to record login attempt");
  }
}

/* =========================
   CLEANUP TOKENS
========================= */

function cleanupExpiredTokens() {
  db.delete(refreshTokensTable)
    .where(lt(refreshTokensTable.expiresAt, new Date()))
    .catch((err) => logger.warn({ err }, "Token cleanup failed"));
}

/* =========================
   DTO USER
========================= */

function toUserDto(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

/* =========================
   LOGIN
========================= */

router.post(
  "/auth/login",
  loginRateLimiter,
  async (req, res): Promise<void> => {
    const parsed = LoginBody.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: "Dados inválidos" });
      return;
    }

    const { email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
      req.socket.remoteAddress ??
      null;

    const failures = await countRecentFailures(normalizedEmail);

    if (failures >= LOCKOUT_MAX_ATTEMPTS) {
      await auditLog({
        action: "login_blocked",
        entity: "auth",
        details: { email: normalizedEmail, reason: "brute_force" },
        req,
      });

      res.status(429).json({
        error:
          "Conta bloqueada temporariamente. Tente novamente em 15 minutos.",
      });
      return;
    }

    const staticUser = STATIC_USERS.find((u) => u.email === normalizedEmail);

    if (!staticUser || staticUser.password !== password) {
      logger.debug(
        { email: normalizedEmail },
        "Login inválido (usuário estático)",
      );
      await recordAttempt(normalizedEmail, ip, false);
      res.status(401).json({ error: "Email ou senha inválidos" });
      return;
    }

    let [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, normalizedEmail));

    if (!user) {
      const { hashPassword } = await import("../lib/password");
      [user] = await db
        .insert(usersTable)
        .values({
          name: staticUser.name,
          email: staticUser.email,
          passwordHash: await hashPassword(staticUser.password),
          role: staticUser.role,
          active: true,
        })
        .returning();
    }

    await recordAttempt(normalizedEmail, ip, true);

    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const { raw, hash, expiresAt } = generateRefreshToken();

    await db.insert(refreshTokensTable).values({
      userId: user.id,
      tokenHash: hash,
      expiresAt,
    });

    cleanupExpiredTokens();

    await auditLog({
      userId: user.id,
      userEmail: user.email,
      action: "login_success",
      entity: "auth",
      req,
    });

    res.json({
      accessToken,
      refreshToken: raw,
      user: toUserDto(user),
    });
  },
);

/* =========================
   REFRESH TOKEN
========================= */

router.post("/auth/refresh", async (req, res): Promise<void> => {
  const token = (req.body as any)?.refreshToken;

  if (!token) {
    res.status(400).json({ error: "Refresh token obrigatório" });
    return;
  }

  const tokenHash = hashRefreshToken(token);

  const [stored] = await db
    .select()
    .from(refreshTokensTable)
    .where(eq(refreshTokensTable.tokenHash, tokenHash));

  if (!stored || stored.expiresAt < new Date()) {
    if (stored) {
      await db
        .delete(refreshTokensTable)
        .where(eq(refreshTokensTable.id, stored.id));
    }

    res.status(401).json({ error: "Refresh token inválido" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, stored.userId));

  if (!user || !user.active) {
    res.status(401).json({ error: "Usuário inválido" });
    return;
  }

  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });

  res.json({ accessToken });
});

/* =========================
   LOGOUT
========================= */

router.post("/auth/logout", async (req, res): Promise<void> => {
  const token = (req.body as any)?.refreshToken;

  if (token) {
    const hash = hashRefreshToken(token);
    await db
      .delete(refreshTokensTable)
      .where(eq(refreshTokensTable.tokenHash, hash));
  }

  res.json({ message: "Deslogado com sucesso" });
});

/* =========================
   ME
========================= */

router.get(
  "/auth/me",
  requireAuth,
  async (req: AuthRequest, res): Promise<void> => {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.user!.sub));

    if (!user) {
      res.status(401).json({ error: "Usuário não encontrado" });
      return;
    }

    res.json(GetMeResponse.parse(toUserDto(user)));
  },
);

router.patch(
  "/auth/me",
  requireAuth,
  async (req: AuthRequest, res): Promise<void> => {
    const parsed = UpdateMeBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Dados inválidos" });
      return;
    }

    const { name, email, currentPassword, newPassword } = parsed.data;

    const [existing] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.user!.sub));

    if (!existing) {
      res.status(404).json({ error: "Usuário não encontrado" });
      return;
    }

    if (newPassword) {
      if (!currentPassword) {
        res
          .status(400)
          .json({ error: "Senha atual é obrigatória para alterar a senha" });
        return;
      }

      const valid = await verifyPassword(
        currentPassword,
        existing.passwordHash,
      );

      if (!valid) {
        res.status(400).json({ error: "Senha atual incorreta" });
        return;
      }
    }

    const updateData: Partial<typeof usersTable.$inferInsert> = {};
    if (name != null) updateData.name = name;
    if (email != null) updateData.email = email;

    if (newPassword) {
      const { hashPassword } = await import("../lib/password");
      updateData.passwordHash = await hashPassword(newPassword);
    }

    const [updated] = await db
      .update(usersTable)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(usersTable.id, req.user!.sub))
      .returning();

    res.json(GetMeResponse.parse(toUserDto(updated)));
  },
);

export default router;
