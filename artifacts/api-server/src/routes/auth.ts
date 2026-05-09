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

    const recentFailures = await countRecentFailures(normalizedEmail, ip);

    if (recentFailures >= LOCKOUT_MAX_ATTEMPTS) {
      await auditLog({
        action: "login_blocked",
        entity: "auth",
        details: { email: normalizedEmail, reason: "brute_force" },
        req,
      });

      res.status(429).json({
        error:
          "Conta temporariamente bloqueada. Tente novamente em 15 minutos.",
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

    // 🔥 FIX PRINCIPAL (ANTI-500)
    if (!user.passwordHash) {
      logger.error({ user }, "passwordHash ausente no usuário");
      res.status(500).json({ error: "Erro interno de autenticação" });
      return;
    }

    let valid: boolean;

    try {
      valid = await verifyPassword(password, user.passwordHash);
    } catch (err) {
      logger.error({ err }, "Erro no verifyPassword (bcrypt)");
      res.status(500).json({ error: "Erro interno de autenticação" });
      return;
    }

    if (!valid) {
      await recordAttempt(normalizedEmail, ip, false);
      res.status(401).json({ error: "Email ou senha inválidos" });
      return;
    }

    if (!user.active) {
      res.status(401).json({ error: "Usuário inativo" });
      return;
    }

    await recordAttempt(normalizedEmail, ip, true);

    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const {
      raw: refreshTokenRaw,
      hash: refreshTokenHash,
      expiresAt,
    } = generateRefreshToken();

    await db.insert(refreshTokensTable).values({
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt,
    });

    cleanupExpiredTokens();

    res.json({
      accessToken,
      refreshToken: refreshTokenRaw,
      user: toUserDto(user),
    });
  },
);
