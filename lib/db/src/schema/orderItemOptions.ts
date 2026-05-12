import {
  pgTable,
  text,
  serial,
  timestamp,
  numeric,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { orderItemsTable } from "./orders";

export const orderItemOptionsTable = pgTable(
  "order_item_options",
  {
    id: serial("id").primaryKey(),
    orderItemId: integer("order_item_id")
      .notNull()
      .references(() => orderItemsTable.id, { onDelete: "cascade" }),
    optionName: text("option_name").notNull(),
    optionPrice: numeric("option_price", { precision: 10, scale: 2 }).notNull().default("0"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("order_item_options_order_item_id_idx").on(table.orderItemId),
  ],
);

export type OrderItemOption = typeof orderItemOptionsTable.$inferSelect;
