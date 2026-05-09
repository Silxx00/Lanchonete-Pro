import { Router, type IRouter } from "express";
import { eq, and, gte, lt } from "drizzle-orm";
import { db, usersTable, refreshTokensTable, loginAttemptsTable } from "../db";
import { hashPassword, verifyPassword } from "../lib/password";
import { signAccessToken, generateRefreshToken, hashRefreshToken, verifyAccessToken } from "../lib/jwt";
import { auditLog } from "../lib/audit";
import { loginRateLimiter } from "../middleware/rateLimiter";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { logger } from "../lib/logger";
import { LoginBody, GetMeResponse } from "../validation/api";

const router: IRouter = Router();

const LOCKOUT_MAX_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;

async function countRecentFailures(email: string, _ipAddress: string | null): Promise<number> {
  const since = new Date(Date.now() - LOCKOUT_WINDOW_MS);
  const rows = await db
    .select({ id: loginAttemptsTable.id })
    .from(loginAttemptsTable)
    .where(
      and(
        eq(loginAttemptsTable.email, email),
        eq(loginAttemptsTable.success, false),
        gte(loginAttemptsTable.createdAt, since),
      )
    );
  return rows.length;
}

async function recordAttempt(email: string, ipAddress: string | null, success: boolean) {
  try {
    await db.insert(loginAttemptsTable).values({ email, ipAddress, success });
  } catch (err) {
    logger.error({ err }, "Failed to record login attempt");
  }
}

function cleanupExpiredTokens() {
  db.delete(refreshTokensTable)
    .where(lt(refreshTokensTable.expiresAt, new Date()))
    .catch((err: unknown) => logger.warn({ err }, "Failed to cleanup expired refresh tokens"));
}

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

router.post("/auth/login", loginRateLimiter, async (req, res): Promise<void> => {
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

  const recentFailures = await countRecentFailures(normalizedEmail, ip);
  if (recentFailures >= LOCKOUT_MAX_ATTEMPTS) {
    await auditLog({ action: "login_blocked", entity: "auth", details: { email: normalizedEmail, reason: "brute_force" }, req });
    res.status(429).json({
      error: "Conta temporariamente bloqueada por excesso de tentativas. Tente novamente em 15 minutos.",
    });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, normalizedEmail));

  if (!user) {
    await recordAttempt(normalizedEmail, ip, false);
    await auditLog({ action: "login_failed", entity: "auth", details: { email: normalizedEmail, reason: "user_not_found" }, req });
    res.status(401).json({ error: "Email ou senha inválidos" });
    return;
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    await recordAttempt(normalizedEmail, ip, false);
    await auditLog({ userId: user.id, userEmail: user.email, action: "login_failed", entity: "auth", details: { reason: "wrong_password" }, req });
    res.status(401).json({ error: "Email ou senha inválidos" });
    return;
  }

  if (!user.active) {
    await auditLog({ userId: user.id, userEmail: user.email, action: "login_blocked", entity: "auth", details: { reason: "inactive_user" }, req });
    res.status(401).json({ error: "Usuário inativo" });
    return;
  }

  await recordAttempt(normalizedEmail, ip, true);

  const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role });
  const { raw: refreshTokenRaw, hash: refreshTokenHash, expiresAt } = generateRefreshToken();

  await db.insert(refreshTokensTable).values({
    userId: user.id,
    tokenHash: refreshTokenHash,
    expiresAt,
  });

  cleanupExpiredTokens();

  await auditLog({ userId: user.id, userEmail: user.email, action: "login_success", entity: "auth", req });

  res.json({ accessToken, refreshToken: refreshTokenRaw, user: toUserDto(user) });
});

router.post("/auth/refresh", async (req, res): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  const refreshTokenRaw = typeof body?.refreshToken === "string" ? body.refreshToken : null;
  if (!refreshTokenRaw) {
    res.status(400).json({ error: "Refresh token obrigatório" });
    return;
  }

  const tokenHash = hashRefreshToken(refreshTokenRaw);
  const [stored] = await db
    .select()
    .from(refreshTokensTable)
    .where(eq(refreshTokensTable.tokenHash, tokenHash));

  if (!stored || stored.expiresAt < new Date()) {
    if (stored) {
      await db.delete(refreshTokensTable).where(eq(refreshTokensTable.id, stored.id));
    }
    res.status(401).json({ error: "Refresh token inválido ou expirado" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, stored.userId));
  if (!user || !user.active) {
    res.status(401).json({ error: "Usuário não encontrado ou inativo" });
    return;
  }

  const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role });
  res.json({ accessToken });
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  const refreshTokenVal = typeof body?.refreshToken === "string" ? body.refreshToken : null;
  if (refreshTokenVal) {
    const tokenHash = hashRefreshToken(refreshTokenVal);
    await db.delete(refreshTokensTable).where(eq(refreshTokensTable.tokenHash, tokenHash));
  }

  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    try {
      const payload = verifyAccessToken(auth.slice(7));
      await auditLog({ userId: payload.sub, userEmail: payload.email, action: "logout", entity: "auth", req });
    } catch {
      // token already invalid, no-op
    }
  }

  res.json({ message: "Deslogado com sucesso" });
});

router.get("/auth/me", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user_payload = req.user!;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, user_payload.sub));
  if (!user) {
    res.status(401).json({ error: "Usuário não encontrado" });
    return;
  }
  res.json(GetMeResponse.parse(toUserDto(user)));
});

export { hashPassword };
export default router;
