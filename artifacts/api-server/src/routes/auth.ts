import { Router, type IRouter } from "express";
import { eq, and, gte, lt } from "drizzle-orm";
import { db, usersTable, refreshTokensTable, loginAttemptsTable } from "../db";
import { verifyPassword } from "../lib/password";
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
import { LoginBody, GetMeResponse } from "../validation/api";

const router: IRouter = Router();

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

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, normalizedEmail));

    if (!user) {
      await recordAttempt(normalizedEmail, ip, false);
      res.status(401).json({ error: "Email ou senha inválidos" });
      return;
    }

    /* =========================
     PASSWORD CHECK FIX
     (SUPORTA password_hash OU passwordHash)
  ========================= */

    const passwordField =
      (user as any).password_hash ?? (user as any).passwordHash;

    if (!passwordField) {
      logger.error({ user }, "Password field missing in DB");
      res.status(500).json({ error: "Erro interno de autenticação" });
      return;
    }

    let valid: boolean;

    try {
      valid = await verifyPassword(password, passwordField);
    } catch (err) {
      logger.error({ err }, "bcrypt error");
      res.status(500).json({ error: "Erro interno de autenticação" });
      return;
    }

    if (!valid) {
      await recordAttempt(normalizedEmail, ip, false);
      res.status(401).json({ error: "Email ou senha inválidos" });
      return;
    }

    if (!user.active) {
      await auditLog({
        userId: user.id,
        userEmail: user.email,
        action: "login_blocked",
        entity: "auth",
        details: { reason: "inactive_user" },
        req,
      });

      res.status(401).json({ error: "Usuário inativo" });
      return;
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

export default router;
