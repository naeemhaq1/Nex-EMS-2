import { pgTable, text, timestamp, decimal, boolean, integer, varchar, jsonb, index } from 'drizzle-orm/pg-core';
import { z } from 'zod';

// Employee location tracking table
export const employeeLocations = pgTable('employee_locations', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  employeeId: text('employee_id').notNull(),
  latitude: decimal('latitude', { precision: 10, scale: 8 }).notNull(),
  longitude: decimal('longitude', { precision: 11, scale: 8 }).notNull(),
  accuracy: decimal('accuracy', { precision: 8, scale: 2 }),
  altitude: decimal('altitude', { precision: 8, scale: 2 }),
  heading: decimal('heading', { precision: 6, scale: 2 }),
  speed: decimal('speed', { precision: 8, scale: 2 }),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  source: varchar('source', { length: 20 }).notNull().default('mobile'), // 'mobile', 'gps_device', 'manual'
  isActive: boolean('is_active').notNull().default(true),
  batteryLevel: integer('battery_level'), // Device battery percentage
  networkType: varchar('network_type', { length: 10 }), // 'wifi', '4g', '5g', etc.
  deviceInfo: jsonb('device_info'), // Device details and capabilities
  validationStatus: varchar('validation_status', { length: 20 }).default('pending'), // 'valid', 'invalid', 'pending'
  validationNotes: text('validation_notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
}, (table) => ({
  employeeIdIdx: index('employee_locations_employee_id_idx').on(table.employeeId),
  timestampIdx: index('employee_locations_timestamp_idx').on(table.timestamp),
  sourceIdx: index('employee_locations_source_idx').on(table.source),
  activeIdx: index('employee_locations_active_idx').on(table.isActive),
  validationIdx: index('employee_locations_validation_idx').on(table.validationStatus)
}));

// Location polling queue for managing batch operations
export const locationPollingQueue = pgTable('location_polling_queue', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  batchId: text('batch_id').notNull(),
  employeeIds: jsonb('employee_ids').notNull(), // Array of employee IDs to poll
  status: varchar('status', { length: 20 }).notNull().default('pending'), // 'pending', 'processing', 'completed', 'failed'
  priority: integer('priority').notNull().default(1), // 1=highest, 5=lowest
  scheduledFor: timestamp('scheduled_for').notNull(),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  totalEmployees: integer('total_employees').notNull(),
  successfulPolls: integer('successful_polls').default(0),
  failedPolls: integer('failed_polls').default(0),
  errorDetails: jsonb('error_details'),
  retryCount: integer('retry_count').default(0),
  maxRetries: integer('max_retries').default(3),
  createdAt: timestamp('created_at').notNull().defaultNow()
}, (table) => ({
  batchIdIdx: index('location_polling_queue_batch_id_idx').on(table.batchId),
  statusIdx: index('location_polling_queue_status_idx').on(table.status),
  scheduledIdx: index('location_polling_queue_scheduled_idx').on(table.scheduledFor),
  priorityIdx: index('location_polling_queue_priority_idx').on(table.priority)
}));

// Location backup archive for hourly snapshots
export const locationBackups = pgTable('location_backups', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  backupId: text('backup_id').notNull().unique(),
  backupType: varchar('backup_type', { length: 20 }).notNull(), // 'hourly', 'daily', 'manual'
  totalRecords: integer('total_records').notNull(),
  validRecords: integer('valid_records').notNull(),
  invalidRecords: integer('invalid_records').notNull(),
  backupSize: bigint('backup_size', { mode: 'number' }), // Size in bytes
  compressionRatio: decimal('compression_ratio', { precision: 4, scale: 2 }),
  backupPath: text('backup_path').notNull(), // File system path or cloud storage path
  checksumHash: text('checksum_hash').notNull(), // MD5 or SHA256 for integrity
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  duration: integer('duration').notNull(), // Duration in seconds
  status: varchar('status', { length: 20 }).notNull(), // 'completed', 'failed', 'partial'
  errorLog: text('error_log'),
  createdAt: timestamp('created_at').notNull().defaultNow()
}, (table) => ({
  backupIdIdx: index('location_backups_backup_id_idx').on(table.backupId),
  typeIdx: index('location_backups_type_idx').on(table.backupType),
  statusIdx: index('location_backups_status_idx').on(table.status),
  dateIdx: index('location_backups_date_idx').on(table.createdAt)
}));

// Geofence clusters for employee location analysis
export const geofenceClusters = pgTable('geofence_clusters', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  employeeId: text('employee_id').notNull(),
  clusterName: varchar('cluster_name', { length: 100 }).notNull(),
  centerLatitude: decimal('center_latitude', { precision: 10, scale: 8 }).notNull(),
  centerLongitude: decimal('center_longitude', { precision: 11, scale: 8 }).notNull(),
  radiusMeters: integer('radius_meters').notNull().default(100),
  locationType: varchar('location_type', { length: 20 }).notNull(), // 'home', 'office', 'field_site', 'unknown'
  confidenceScore: decimal('confidence_score', { precision: 5, scale: 2 }).notNull(), // 0-100%
  punchCount: integer('punch_count').notNull().default(0),
  firstSeen: timestamp('first_seen').notNull(),
  lastSeen: timestamp('last_seen').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  validatedBy: text('validated_by'), // Admin who validated the cluster
  validatedAt: timestamp('validated_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
}, (table) => ({
  employeeIdIdx: index('geofence_clusters_employee_id_idx').on(table.employeeId),
  typeIdx: index('geofence_clusters_type_idx').on(table.locationType),
  confidenceIdx: index('geofence_clusters_confidence_idx').on(table.confidenceScore),
  activeIdx: index('geofence_clusters_active_idx').on(table.isActive)
}));

// Location validation log
export const locationValidationLog = pgTable('location_validation_log', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  locationId: integer('location_id').notNull(),
  validationType: varchar('validation_type', { length: 30 }).notNull(), // 'geofence', 'accuracy', 'duplicate', 'manual'
  validationResult: varchar('validation_result', { length: 20 }).notNull(), // 'pass', 'fail', 'warning'
  validationDetails: jsonb('validation_details').notNull(),
  validatedBy: text('validated_by'), // System or admin user
  validatedAt: timestamp('validated_at').notNull().defaultNow(),
  actionTaken: varchar('action_taken', { length: 50 }), // 'approved', 'rejected', 'flagged', 'auto_corrected'
  notes: text('notes')
}, (table) => ({
  locationIdIdx: index('location_validation_log_location_id_idx').on(table.locationId),
  resultIdx: index('location_validation_log_result_idx').on(table.validationResult),
  typeIdx: index('location_validation_log_type_idx').on(table.validationType),
  dateIdx: index('location_validation_log_date_idx').on(table.validatedAt)
}));

// Schema exports for forms and validation
export const insertEmployeeLocationSchema = createInsertSchema(employeeLocations).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertLocationPollingQueueSchema = createInsertSchema(locationPollingQueue).omit({
  id: true,
  createdAt: true
});

export const insertLocationBackupSchema = createInsertSchema(locationBackups).omit({
  id: true,
  createdAt: true
});

export const insertGeofenceClusterSchema = createInsertSchema(geofenceClusters).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertLocationValidationLogSchema = createInsertSchema(locationValidationLog).omit({
  id: true
});

// Type exports
export type EmployeeLocation = typeof employeeLocations.$inferSelect;
export type InsertEmployeeLocation = z.infer<typeof insertEmployeeLocationSchema>;

export type LocationPollingQueue = typeof locationPollingQueue.$inferSelect;
export type InsertLocationPollingQueue = z.infer<typeof insertLocationPollingQueueSchema>;

export type LocationBackup = typeof locationBackups.$inferSelect;
export type InsertLocationBackup = z.infer<typeof insertLocationBackupSchema>;

export type GeofenceCluster = typeof geofenceClusters.$inferSelect;
export type InsertGeofenceCluster = z.infer<typeof insertGeofenceClusterSchema>;

export type LocationValidationLog = typeof locationValidationLog.$inferSelect;
export type InsertLocationValidationLog = z.infer<typeof insertLocationValidationLogSchema>;