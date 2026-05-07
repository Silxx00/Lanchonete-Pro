import rateLimit from "express-rate-limit";

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Muitas tentativas de login. Tente novamente em 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const forwarded = req.headers["x-forwarded-for"];
    const ip = typeof forwarded === "string"
      ? forwarded.split(",")[0].trim()
      : req.socket.remoteAddress ?? "unknown";
    return ip;
  },
});

export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: { error: "Muitas requisições. Tente novamente em breve." },
  standardHeaders: true,
  legacyHeaders: false,
});

export const strictRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: "Limite de requisições excedido." },
  standardHeaders: true,
  legacyHeaders: false,
});
