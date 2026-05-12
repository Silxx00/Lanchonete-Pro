import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "../db";
import { hashPassword } from "../lib/password";
import { auditLog } from "../lib/audit";
import { logger } from "../lib/logger";
import {
  requireAuth,
  requireAdmin,
  type AuthRequest,
} from "../middleware/auth";
import {
  CreateUserBody,
  UpdateUserBody,
  GetUserParams,
  UpdateUserParams,
  DeleteUserParams,
  ListUsersResponse,
  GetUserResponse,
  UpdateUserResponse,
} from "../validation/api";

const router: IRouter = Router();

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

router.get(
  "/users",
  requireAuth,
  requireAdmin,
  async (_req, res): Promise<void> => {
    try {
      const users = await db
        .select()
        .from(usersTable)
        .orderBy(usersTable.createdAt);
      res.json(ListUsersResponse.parse(users.map(toUserDto)));
    } catch (err) {
      logger.error({ err }, "Erro ao listar usuários");
      res.status(500).json({ error: "Erro interno ao listar usuários" });
    }
  },
);

router.post(
  "/users",
  requireAuth,
  requireAdmin,
  async (req: AuthRequest, res): Promise<void> => {
    try {
      const parsed = CreateUserBody.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.message });
        return;
      }
      const { name, email, password, role } = parsed.data;
      const [user] = await db
        .insert(usersTable)
        .values({ name, email, passwordHash: await hashPassword(password), role })
        .returning();
      await auditLog({
        userId: req.user!.sub,
        userEmail: req.user!.email,
        action: "create",
        entity: "user",
        entityId: user.id,
        details: { name, email, role },
        req,
      });
      res.status(201).json(GetUserResponse.parse(toUserDto(user)));
    } catch (err) {
      logger.error({ err }, "Erro ao criar usuário");
      res.status(500).json({ error: "Erro interno ao criar usuário" });
    }
  },
);

router.get(
  "/users/:id",
  requireAuth,
  requireAdmin,
  async (req, res): Promise<void> => {
    try {
      const params = GetUserParams.safeParse(req.params);
      if (!params.success) {
        res.status(400).json({ error: params.error.message });
        return;
      }
      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, params.data.id));
      if (!user) {
        res.status(404).json({ error: "Usuário não encontrado" });
        return;
      }
      res.json(GetUserResponse.parse(toUserDto(user)));
    } catch (err) {
      logger.error({ err }, "Erro ao buscar usuário");
      res.status(500).json({ error: "Erro interno ao buscar usuário" });
    }
  },
);

router.patch(
  "/users/:id",
  requireAuth,
  requireAdmin,
  async (req: AuthRequest, res): Promise<void> => {
    try {
      const params = UpdateUserParams.safeParse(req.params);
      if (!params.success) {
        res.status(400).json({ error: params.error.message });
        return;
      }
      const parsed = UpdateUserBody.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.message });
        return;
      }
      const { name, email, role, active, password } = parsed.data;
      const updateData: Partial<typeof usersTable.$inferInsert> = {};
      if (name != null) updateData.name = name;
      if (email != null) updateData.email = email;
      if (role != null) updateData.role = role;
      if (active != null) updateData.active = active;
      if (password != null && password !== "") {
        updateData.passwordHash = await hashPassword(password);
      }

      const [user] = await db
        .update(usersTable)
        .set(updateData)
        .where(eq(usersTable.id, params.data.id))
        .returning();
      if (!user) {
        res.status(404).json({ error: "Usuário não encontrado" });
        return;
      }
      await auditLog({
        userId: req.user!.sub,
        userEmail: req.user!.email,
        action: "update",
        entity: "user",
        entityId: user.id,
        details: updateData,
        req,
      });
      res.json(UpdateUserResponse.parse(toUserDto(user)));
    } catch (err) {
      logger.error({ err }, "Erro ao atualizar usuário");
      res.status(500).json({ error: "Erro interno ao atualizar usuário" });
    }
  },
);

router.delete(
  "/users/:id",
  requireAuth,
  requireAdmin,
  async (req: AuthRequest, res): Promise<void> => {
    try {
      const params = DeleteUserParams.safeParse(req.params);
      if (!params.success) {
        res.status(400).json({ error: params.error.message });
        return;
      }
      if (params.data.id === req.user!.sub) {
        res
          .status(400)
          .json({ error: "Você não pode excluir sua própria conta" });
        return;
      }
      const [user] = await db
        .delete(usersTable)
        .where(eq(usersTable.id, params.data.id))
        .returning();
      if (!user) {
        res.status(404).json({ error: "Usuário não encontrado" });
        return;
      }
      await auditLog({
        userId: req.user!.sub,
        userEmail: req.user!.email,
        action: "delete",
        entity: "user",
        entityId: params.data.id,
        req,
      });
      res.sendStatus(204);
    } catch (err) {
      logger.error({ err }, "Erro ao excluir usuário");
      res.status(500).json({ error: "Erro interno ao excluir usuário" });
    }
  },
);

export default router;
