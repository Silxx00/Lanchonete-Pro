import { eq } from "drizzle-orm";
import { db, usersTable } from "./db";
import { hashPassword } from "./lib/password";
import { logger } from "./lib/logger";

const SEED_USERS = [
  { name: "Admin", email: "admin@novaera.com", password: "admin123", role: "admin" },
  { name: "Gerente", email: "gerente@novaera.com", password: "gerente123", role: "manager" },
  { name: "Funcionário", email: "funcionario@novaera.com", password: "func123", role: "employee" },
];

export async function seedDefaultUsers(): Promise<void> {
  try {
    for (const user of SEED_USERS) {
      const existing = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.email, user.email));

      if (existing.length === 0) {
        const passwordHash = await hashPassword(user.password);
        await db.insert(usersTable).values({
          name: user.name,
          email: user.email,
          passwordHash,
          role: user.role,
          active: true,
        });
        logger.info({ email: user.email, role: user.role }, "Seed user created");
      }
    }
  } catch (err) {
    logger.error({ err }, "Failed to seed default users");
  }
}
