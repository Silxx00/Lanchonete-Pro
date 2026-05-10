import { eq } from "drizzle-orm";
import { db, usersTable } from "./db";
import { hashPassword } from "./lib/password";
import { logger } from "./lib/logger";

type Role = "admin" | "gerente" | "funcionario";

const SEED_USERS: {
  name: string;
  email: string;
  password: string;
  role: Role;
}[] = [
  {
    name: "Admin",
    email: "admin@novaera.com",
    password: "admin123",
    role: "admin",
  },
  {
    name: "Gerente",
    email: "gerente@novaera.com",
    password: "gerente123",
    role: "gerente",
  },
  {
    name: "Funcionário",
    email: "funcionario@novaera.com",
    password: "func123",
    role: "funcionario",
  },
];

export async function seedDefaultUsers(): Promise<void> {
  try {
    for (const user of SEED_USERS) {
      const existing = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.email, user.email));

      if (existing.length > 0) continue;

      const passwordHash = await hashPassword(user.password);

      if (!passwordHash) {
        throw new Error(`Falha ao gerar hash para ${user.email}`);
      }

      await db.insert(usersTable).values({
        name: user.name,
        email: user.email,
        passwordHash,
        role: user.role,
        active: true,
      });

      logger.info({ email: user.email, role: user.role }, "Seed user created");
    }
  } catch (err) {
    logger.error({ err }, "Failed to seed default users");
  }
}
