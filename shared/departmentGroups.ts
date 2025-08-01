
import { pgTable, text, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { z } from "zod";

export const departmentGroups = pgTable("department_groups", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  description: text("description"),
  departments: jsonb("departments").notNull().default([]),
  color: text("color").default("#3B82F6"),
  isSystem: boolean("is_system").default(false),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: integer("created_by"),
});

// Simple manual schema without problematic createInsertSchema
export const insertDepartmentGroupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  departments: z.array(z.string()).default([]),
  color: z.string().default("#3B82F6"),
  isSystem: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  createdBy: z.number().int().optional(),
});

export const updateDepartmentGroupSchema = z.object({
  id: z.number().int(),
  name: z.string().min(1, "Name is required").optional(),
  description: z.string().optional(),
  departments: z.array(z.string()).optional(),
  color: z.string().optional(),
  isSystem: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export type DepartmentGroup = typeof departmentGroups.$inferSelect;
export type InsertDepartmentGroup = z.infer<typeof insertDepartmentGroupSchema>;
export type UpdateDepartmentGroup = z.infer<typeof updateDepartmentGroupSchema>;
