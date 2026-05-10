import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken, type JwtPayload } from "../lib/jwt";

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Não autorizado" });
    return;
  }
  const token = auth.slice(7);
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    res.status(401).json({ error: "Token inválido ou expirado" });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Não autorizado" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "Acesso negado: permissão insuficiente" });
      return;
    }
    next();
  };
}

export function requireAdminOrManager(req: AuthRequest, res: Response, next: NextFunction): void {
  requireRole("admin", "gerente")(req, res, next);
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  requireRole("admin")(req, res, next);
}
