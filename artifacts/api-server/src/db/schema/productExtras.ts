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

export const productExtrasTable = pgTable(
  "product_extras",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => productsTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    price: numeric("price", { precision: 10, scale: 2 }).notNull().default("0"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("product_extras_product_id_idx").on(table.productId),
  ],
);

export type ProductExtra = typeof productExtrasTable.$inferSelect;
