import { pgTable, text, serial, timestamp, boolean, index } from "drizzle-orm/pg-core";

export const loginAttemptsTable = pgTable(
  "login_attempts",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    ipAddress: text("ip_address"),
    success: boolean("success").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("login_attempts_email_created_at_idx").on(table.email, table.createdAt),
    index("login_attempts_ip_created_at_idx").on(table.ipAddress, table.createdAt),
  ]
);

export type LoginAttempt = typeof loginAttemptsTable.$inferSelect;
