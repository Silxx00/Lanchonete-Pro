import { pgTable, text, serial, timestamp, numeric, integer, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const expensesTable = pgTable(
  "expenses",
  {
    id: serial("id").primaryKey(),
    description: text("description").notNull(),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    category: text("category").notNull().default("Outros"),
    date: timestamp("date", { withTimezone: true }).notNull(),
    notes: text("notes"),
    createdBy: integer("created_by").references(() => usersTable.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("expenses_date_idx").on(table.date),
    index("expenses_category_idx").on(table.category),
  ]
);

export type Expense = typeof expensesTable.$inferSelect;
