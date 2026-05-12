import {
  pgTable,
  text,
  serial,
  timestamp,
  boolean,
  numeric,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { productsTable } from "./products";

export const productOptionsTable = pgTable(
  "product_options",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => productsTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    price: numeric("price", { precision: 10, scale: 2 }).notNull().default("0"),
    type: text("type").notNull().default("add"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("product_options_product_id_idx").on(table.productId),
    index("product_options_type_idx").on(table.type),
  ],
);

export type ProductOption = typeof productOptionsTable.$inferSelect;
