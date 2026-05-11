import { pgTable, text, serial, timestamp, numeric, integer, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const cashClosingsTable = pgTable(
  "cash_closings",
  {
    id: serial("id").primaryKey(),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
    grossRevenue: numeric("gross_revenue", { precision: 10, scale: 2 }).notNull().default("0"),
    totalExpenses: numeric("total_expenses", { precision: 10, scale: 2 }).notNull().default("0"),
    netProfit: numeric("net_profit", { precision: 10, scale: 2 }).notNull().default("0"),
    orderCount: integer("order_count").notNull().default(0),
    cashAmount: numeric("cash_amount", { precision: 10, scale: 2 }),
    pixAmount: numeric("pix_amount", { precision: 10, scale: 2 }),
    cardAmount: numeric("card_amount", { precision: 10, scale: 2 }),
    countedTotal: numeric("counted_total", { precision: 10, scale: 2 }),
    notes: text("notes"),
    closedBy: integer("closed_by").references(() => usersTable.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("cash_closings_period_start_idx").on(table.periodStart),
  ]
);

export type CashClosing = typeof cashClosingsTable.$inferSelect;
