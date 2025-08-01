import { pgTable, text, serial, integer, boolean, timestamp, decimal, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Geofence clusters learned from employee location patterns
export const geofenceClusters = pgTable("geofence_clusters", {
  id: serial("id").primaryKey(),
  clusterId: varchar("cluster_id", { length: 100 }).notNull().unique(),
  employeeCode: text("employee_code").notNull(),
  locationType: varchar("location_type", { length: 20 }).notNull(), // 'home', 'office', 'field_site', 'unknown'
  centerLatitude: decimal("center_latitude", { precision: 10, scale: 8 }).notNull(),
  centerLongitude: decimal("center_longitude", { precision: 11, scale: 8 }).notNull(),
  radiusMeters: integer("radius_meters").notNull().default(100),
  punchCount: integer("punch_count").notNull().default(0),
  firstSeenAt: timestamp("first_seen_at").notNull(),
  lastSeenAt: timestamp("last_seen_at").notNull(),
  confidence: integer("confidence").notNull().default(0), // 0-100 percentage
  isActive: boolean("is_active").notNull().default(true),
  autoLearned: boolean("auto_learned").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Mobile punch validation log
export const mobilePunchValidation = pgTable("mobile_punch_validation", {
  id: serial("id").primaryKey(),
  employeeCode: text("employee_code").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  punchType: varchar("punch_type", { length: 10 }).notNull(), // 'checkin', 'checkout'
  isValid: boolean("is_valid").notNull(),
  locationType: varchar("location_type", { length: 20 }), // 'home', 'office', 'field_site', 'unknown'
  distance: decimal("distance", { precision: 10, scale: 2 }), // meters from cluster center
  clusterId: varchar("cluster_id", { length: 100 }),
  confidence: integer("confidence").default(0),
  validationReason: text("validation_reason"),
  timestamp: timestamp("timestamp").defaultNow(),
  attendanceRecordId: integer("attendance_record_id")
});

// Geofence violation alerts
export const geofenceViolations = pgTable("geofence_violations", {
  id: serial("id").primaryKey(),
  employeeCode: text("employee_code").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  punchType: varchar("punch_type", { length: 10 }).notNull(),
  violationType: varchar("violation_type", { length: 50 }).notNull(), // 'unknown_location', 'suspicious_distance', 'time_anomaly'
  distance: decimal("distance", { precision: 10, scale: 2 }), // meters from nearest cluster
  severity: varchar("severity", { length: 20 }).notNull().default('medium'), // 'low', 'medium', 'high'
  resolved: boolean("resolved").notNull().default(false),
  resolvedBy: text("resolved_by"),
  resolvedAt: timestamp("resolved_at"),
  notes: text("notes"),
  timestamp: timestamp("timestamp").defaultNow(),
  attendanceRecordId: integer("attendance_record_id")
});

// Schema exports
export const insertGeofenceClusterSchema = createInsertSchema(geofenceClusters);
export const insertMobilePunchValidationSchema = createInsertSchema(mobilePunchValidation);
export const insertGeofenceViolationSchema = createInsertSchema(geofenceViolations);

export type GeofenceCluster = typeof geofenceClusters.$inferSelect;
export type InsertGeofenceCluster = z.infer<typeof insertGeofenceClusterSchema>;
export type MobilePunchValidation = typeof mobilePunchValidation.$inferSelect;
export type InsertMobilePunchValidation = z.infer<typeof insertMobilePunchValidationSchema>;
export type GeofenceViolation = typeof geofenceViolations.$inferSelect;
export type InsertGeofenceViolation = z.infer<typeof insertGeofenceViolationSchema>;