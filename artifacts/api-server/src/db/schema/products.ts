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
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { categoriesTable } from "./categories";

export const productsTable = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
    imageUrl: text("image_url"),
    categoryId: integer("category_id").references(() => categoriesTable.id),
    stock: integer("stock").notNull().default(0),
    active: boolean("active").notNull().default(true),
    featured: boolean("featured").notNull().default(false),
    prepTime: integer("prep_time"),
    internalNotes: text("internal_notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("products_active_idx").on(table.active),
    index("products_category_id_idx").on(table.categoryId),
    index("products_name_idx").on(table.name),
    index("products_featured_idx").on(table.featured),
  ],
);

export const insertProductSchema = createInsertSchema(productsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
