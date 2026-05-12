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

export const combosTable = pgTable(
  "combos",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    imageUrl: text("image_url"),
    price: numeric("price", { precision: 10, scale: 2 }).notNull().default("0"),
    active: boolean("active").notNull().default(true),
    featured: boolean("featured").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("combos_active_idx").on(table.active),
    index("combos_featured_idx").on(table.featured),
  ],
);

// product_id is nullable so deleting a product does NOT break combos
export const comboItemsTable = pgTable(
  "combo_items",
  {
    id: serial("id").primaryKey(),
    comboId: integer("combo_id")
      .notNull()
      .references(() => combosTable.id, { onDelete: "cascade" }),
    productId: integer("product_id")
      .references(() => productsTable.id, { onDelete: "set null" }),
    productName: text("product_name").notNull(),
    quantity: integer("quantity").notNull().default(1),
  },
  (table) => [
    index("combo_items_combo_id_idx").on(table.comboId),
    index("combo_items_product_id_idx").on(table.productId),
  ],
);

export type Combo = typeof combosTable.$inferSelect;
export type ComboItem = typeof comboItemsTable.$inferSelect;
