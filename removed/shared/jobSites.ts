// Future job site management schema for mobile app integration
import { pgTable, serial, text, decimal, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const jobSites = pgTable("job_sites", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  address: text("address"),
  description: text("description"),
  
  // GPS coordinates for mobile app geofencing
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  radiusMeters: decimal("radius_meters", { precision: 8, scale: 2 }).default("100"), // Geofence radius
  
  // Site details
  isActive: boolean("is_active").default(true),
  clientName: varchar("client_name", { length: 100 }),
  projectCode: varchar("project_code", { length: 50 }),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertJobSiteSchema = createInsertSchema(jobSites).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type JobSite = typeof jobSites.$inferSelect;
export type InsertJobSite = z.infer<typeof insertJobSiteSchema>;