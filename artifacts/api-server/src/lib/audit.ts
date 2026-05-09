import { db, auditLogsTable } from "../db";
import { logger } from "./logger";
import type { Request } from "express";

export interface AuditOptions {
  userId?: number | null;
  userEmail?: string | null;
  action: string;
  entity: string;
  entityId?: string | number | null;
  details?: Record<string, unknown> | null;
  req?: Request;
}

export async function auditLog(opts: AuditOptions): Promise<void> {
  try {
    const ip = opts.req
      ? ((opts.req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? opts.req.socket.remoteAddress ?? null)
      : null;
    const ua = opts.req?.headers["user-agent"] ?? null;

    await db.insert(auditLogsTable).values({
      userId: opts.userId ?? null,
      userEmail: opts.userEmail ?? null,
      action: opts.action,
      entity: opts.entity,
      entityId: opts.entityId != null ? String(opts.entityId) : null,
      details: opts.details ?? null,
      ipAddress: ip,
      userAgent: ua,
    });
  } catch (err) {
    logger.error({ err }, "Failed to write audit log");
  }
}
