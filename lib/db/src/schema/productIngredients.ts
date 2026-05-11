import {
  pgTable,
  text,
  serial,
  timestamp,
  boolean,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { productsTable } from "./products";

export const productIngredientsTable = pgTable(
  "product_ingredients",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => productsTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("product_ingredients_product_id_idx").on(table.productId),
  ],
);

export type ProductIngredient = typeof productIngredientsTable.$inferSelect;
