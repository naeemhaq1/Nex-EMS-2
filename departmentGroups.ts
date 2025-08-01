import { pgTable, text, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

export const departmentGroups = pgTable("department_groups", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  description: text("description"),
  departments: jsonb("departments").notNull().default([]), // Array of department names
  color: text("color").default("#3B82F6"), // For visual distinction in UI
  isSystem: boolean("is_system").default(false), // For system groups like "Ungrouped"
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: integer("created_by"),
});

export const departmentGroupRelations = relations(departmentGroups, ({ one }) => ({
  creator: one(departmentGroups, {
    fields: [departmentGroups.createdBy],
    references: [departmentGroups.id],
  }),
}));

export const insertDepartmentGroupSchema = createInsertSchema(departmentGroups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  departments: z.array(z.string()),
});

export type DepartmentGroup = typeof departmentGroups.$inferSelect;
export type InsertDepartmentGroup = z.infer<typeof insertDepartmentGroupSchema>;