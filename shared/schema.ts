import { pgTable, text, serial, integer, boolean, timestamp, date, decimal, varchar, jsonb, time, numeric, bigint } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { departmentGroups } from "./departmentGroups";

// User accounts for authentication with role-based access control
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("staff"), // 'superadmin', 'general_admin', 'finance', 'manager', 'assistant_manager', 'staff'
  accountType: text("account_type").notNull().default("employee"), // 'system', 'employee'
  employeeId: text("employee_id").unique(),
  managedDepartments: text("managed_departments").array(), // Array of department names for managers
  isActive: boolean("is_active").notNull().default(true),
  userState: varchar("user_state", { length: 20 }).notNull().default("Active"), // 'Active', 'Disabled'
  // Password management
  isTemporaryPassword: boolean("is_temporary_password").notNull().default(true), // Force password change on first login
  lastPasswordChange: timestamp("last_password_change"),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
  // Facebook integration
  facebookId: text("facebook_id"),
  facebookAccessToken: text("facebook_access_token"),
  facebookProfilePhoto: text("facebook_profile_photo"),
  facebookEmail: text("facebook_email"),
  facebookName: text("facebook_name"),
  facebookLinkedAt: timestamp("facebook_linked_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Device registration and binding table
export const userDevices = pgTable("user_devices", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  deviceFingerprint: text("device_fingerprint").notNull().unique(), // Unique device identifier
  deviceName: text("device_name"),
  deviceType: text("device_type").notNull(), // 'mobile', 'tablet', 'desktop', 'unknown'
  manufacturer: text("manufacturer"),
  model: text("model"),
  operatingSystem: text("operating_system").notNull(),
  osVersion: text("os_version"),
  browser: text("browser").notNull(),
  browserVersion: text("browser_version").notNull(),
  screenResolution: text("screen_resolution").notNull(),
  userAgent: text("user_agent").notNull(),
  platform: text("platform").notNull(),
  language: text("language").notNull(),
  timezone: text("timezone").notNull(),
  macAddress: text("mac_address"),
  networkInfo: jsonb("network_info"),
  batteryInfo: jsonb("battery_info"),
  hardwareInfo: jsonb("hardware_info"), // Memory, cores, touch points, etc.
  isActive: boolean("is_active").notNull().default(true),
  isTrusted: boolean("is_trusted").notNull().default(false), // Admin can mark as trusted
  firstSeen: timestamp("first_seen").defaultNow().notNull(),
  lastSeen: timestamp("last_seen").defaultNow().notNull(),
  lastLoginIp: text("last_login_ip"),
  loginCount: integer("login_count").default(0).notNull(),
  notes: text("notes"), // Admin notes about device
  unboundAt: timestamp("unbound_at"), // When device was unbound by admin
  unboundBy: integer("unbound_by").references(() => users.id), // Admin who unbound device
  unboundReason: text("unbound_reason"), // Reason for unbinding
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Personalized dashboard widget preferences
export const dashboardWidgetPreferences = pgTable("dashboard_widget_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  employeeCode: text("employee_code"),
  widgetLayout: jsonb("widget_layout"), // Layout configuration for widgets
  enabledWidgets: text("enabled_widgets").array(), // Array of enabled widget IDs
  widgetOrder: text("widget_order").array(), // Order of widgets
  customColors: jsonb("custom_colors"), // Custom color preferences
  chartPreferences: jsonb("chart_preferences"), // Chart type and display preferences
  refreshIntervals: jsonb("refresh_intervals"), // Custom refresh rates per widget
  widgetSizes: jsonb("widget_sizes"), // Size preferences for each widget
  themePreferences: jsonb("theme_preferences"), // Dark/light theme and color schemes
  notificationSettings: jsonb("notification_settings"), // Widget-specific notifications
  dashboardName: text("dashboard_name").default("My Dashboard"),
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  lastModified: timestamp("last_modified").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Role permissions and hierarchy management
export const rolePermissions = pgTable("role_permissions", {
  id: serial("id").primaryKey(),
  roleName: text("role_name").notNull().unique(), // 'superadmin', 'general_admin', 'finance', 'manager', 'assistant_manager', 'staff'
  displayName: text("display_name").notNull(),
  description: text("description"),
  canCreateUsers: boolean("can_create_users").notNull().default(false),
  canDeleteUsers: boolean("can_delete_users").notNull().default(false),
  canDeleteData: boolean("can_delete_data").notNull().default(false),
  canAccessFinancialData: boolean("can_access_financial_data").notNull().default(false),
  canManageSystem: boolean("can_manage_system").notNull().default(false),
  canManageTeams: boolean("can_manage_teams").notNull().default(false),
  canChangeDesignations: boolean("can_change_designations").notNull().default(false),
  accessLevel: integer("access_level").notNull().default(1), // 1=lowest, 6=highest
  createdRoles: text("created_roles").array(), // Array of role names this role can create
  createdAt: timestamp("created_at").defaultNow(),
});

// Department groups for organized management (imported from departmentGroups file)

// Managers table - stores employees who have manager role
export const managers = pgTable("managers", {
  id: serial("id").primaryKey(),
  employeeCode: text("employee_code").notNull().unique(),
  userId: integer("user_id").references(() => users.id).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
});

// Manager department assignments - many-to-many relationship
export const managerDepartmentAssignments = pgTable("manager_department_assignments", {
  id: serial("id").primaryKey(),
  managerId: integer("manager_id").references(() => managers.id).notNull(),
  departmentName: text("department_name").notNull(),
  assignedAt: timestamp("assigned_at").defaultNow(),
  assignedBy: integer("assigned_by").references(() => users.id),
  isActive: boolean("is_active").default(true),
});

// Legacy manager assignments table (keeping for backwards compatibility)
export const managerAssignments = pgTable("manager_assignments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  employeeCode: text("employee_code").notNull(),
  departmentGroupId: integer("department_group_id").references(() => departmentGroups.id),
  departmentName: text("department_name").notNull(),
  roleType: text("role_type").notNull().default("manager"), // 'manager', 'assistant_manager', 'supervisor'
  assignedAt: timestamp("assigned_at").defaultNow(),
  assignedBy: integer("assigned_by").references(() => users.id),
  isActive: boolean("is_active").default(true),
});

// External employee data pulled from BioTime API (store all fields as JSON)
// BioTime API employee data with all individual fields
export const employeePullExt = pgTable("employee_pull_ext", {
  id: serial("id").primaryKey(),
  // Core identification
  biotimeId: text("biotime_id"),
  empCode: text("emp_code"),
  code2: text("code2"), // Extracted numeric code from corrupted last_name field
  // Personal information
  firstName: text("first_name"),
  lastName: text("last_name"),
  nickname: text("nickname"),
  formatName: text("format_name"),
  gender: text("gender"),
  birthday: date("birthday"),
  // Contact information
  mobile: text("mobile"),
  contactTel: text("contact_tel"),
  officeTel: text("office_tel"),
  email: text("email"),
  address: text("address"),
  city: text("city"),
  postcode: text("postcode"),
  // Identification documents
  national: text("national"), // CNIC
  ssn: text("ssn"),
  cardNo: text("card_no"),
  // Employment information
  department: jsonb("department"), // {id, dept_code, dept_name}
  position: jsonb("position"), // {id, position_code, position_name}
  hireDate: date("hire_date"),
  empType: text("emp_type"),
  // Access control
  area: jsonb("area"), // Array of {id, area_code, area_name}
  devicePassword: text("device_password"),
  devPrivilege: integer("dev_privilege"),
  verifyMode: integer("verify_mode"),
  // Biometric enrollment
  fingerprint: text("fingerprint"),
  face: text("face"),
  palm: text("palm"),
  vlFace: text("vl_face"),
  enrollSn: text("enroll_sn"),
  // App related
  appStatus: integer("app_status"),
  appRole: integer("app_role"),
  // Attendance settings
  attemployee: jsonb("attemployee"), // {id, enable_holiday, enable_overtime, enable_schedule, enable_attendance}
  // System fields
  religion: text("religion"),
  updateTime: timestamp("update_time"),
  // Legacy field for backward compatibility
  allFields: jsonb("all_fields"), // Still store complete API response
  pulledAt: timestamp("pulled_at").defaultNow(),
});

// Normalized employee records
export const employeeRecords = pgTable("employee_records", {
  id: serial("id").primaryKey(),
  employeeCode: text("employee_code").notNull().unique(),
  code2: text("code2"), // Extracted employee code without prefix
  biotimeId: text("biotime_id").notNull(),
  salutation: varchar("salutation", { length: 20 }), // Mr., Mrs., Dr., etc.
  firstName: text("first_name").notNull(),
  middleName: text("middle_name"), // For names like "Syed Imran" -> first: Syed, middle: Imran
  lastName: text("last_name").notNull(),
  // Real names from CSV - protected from BioTime corruption
  realFirst: text("real_first"), // Authentic first name from CSV data
  realMiddle: text("real_middle"), // Authentic middle name from CSV data
  realLast: text("real_last"), // Authentic last name from CSV data
  email: text("email"),
  phone: varchar("phone", { length: 20 }),
  mobile: varchar("mobile", { length: 15 }),
  wanumber: varchar("wanumber", { length: 20 }), // WhatsApp formatted number (92XXXXXXXXX)
  profilePhoto: text("profile_photo"), // Avatar/profile photo URL
  address: text("address"),
  vrn: varchar("vrn", { length: 20 }), // Vehicle Registration Number
  username: varchar("username", { length: 50 }), // System username for login
  nationalId: varchar("national_id", { length: 17 }).unique(),
  cnicMissing: text("cnic_missing").notNull().default("yes"), // 'yes' or 'no'
  department: text("department"),
  subDepartment: text("sub_department"),
  position: text("position"),
  project: text("project"),
  // Employee type classification for location tracking optimization
  empType: varchar("emp_type", { length: 20 }).default("Desk Job"), // 'Drivers', 'Field Staff', 'Desk Job', 'Hybrid'
  isFieldDepartment: boolean("is_field_department").default(false), // Department-level field designation
  hireDate: timestamp("hire_date"),
  isActive: boolean("is_active").default(true),
  // New fields for contract information
  birthday: date("birthday"),
  contractDate: date("contract_date"),
  contractTerm: varchar("contract_term", { length: 50 }), // e.g., "11 months"
  contractExpiryDate: date("contract_expiry_date"),
  workTeam: varchar("work_team", { length: 50 }),
  designation: varchar("designation", { length: 100 }),
  subdesignation: varchar("subdesignation", { length: 100 }),
  poslevel: varchar("poslevel", { length: 50 }),
  joiningDate: date("joining_date"),
  entitlementDate: date("entitlement_date"),
  location: varchar("location", { length: 255 }),
  nonBio: boolean("non_bio").default(false), // Exempt from biometric attendance
  shiftId: integer("shift_id").references(() => shifts.id),
  suspect: boolean("suspect").default(false), // Flag for suspect employee records
  susreason: varchar("susreason", { length: 255 }), // Reason for suspect status
  pop: varchar("pop", { length: 50 }), // Point of Presence (city location)
  stopPay: boolean("stop_pay").default(false), // Flag to stop payroll processing
  systemAccount: boolean("system_account").default(false), // Flag for system accounts (not real employees)
  // Mobile app status tracking
  appStatus: text("app_status").default("not_installed"), // not_installed, installed, unknown
  appLoc: text("app_loc").default("no_data"), // no_data, communicating, unknown
  appStatusCheckedAt: timestamp("app_status_checked_at"), // Last time app status was checked
  appLocCheckedAt: timestamp("app_loc_checked_at"), // Last time location data was checked
  // Employee role for easy role assignment
  eRole: varchar("e_role", { length: 20 }).default("Normal"), // "Manager" or "Normal"
  // Biometric authentication fields
  hasFaceTemplate: boolean("has_face_template").default(false), // Whether employee has face template
  faceTemplateCount: integer("face_template_count").default(0), // Number of face templates
  faceTemplateVersion: text("face_template_version"), // Template version (e.g., "Ver 7:1")
  faceTemplateData: text("face_template_data"), // Encoded face template data
  biometricEnrollmentStatus: text("biometric_enrollment_status").default("not_enrolled"), // not_enrolled, enrolled, verification_required
  lastBiometricSync: timestamp("last_biometric_sync"), // Last time biometric data was synced
  // VNB (Verified Non-Bio) flag for employees verified as non-biometric by location/department
  vnb: boolean("vnb").default(false), // true for employees in remote locations (GUJ, MUL, Okara, PSH, ISB)
  // WhatsApp registration flag for automated chatbot system
  wareg: boolean("wareg").default(false), // true when employee has registered for WhatsApp system
  // Last attendance punch time tracking
  lasttime: timestamp("lasttime"), // Last time this employee made any attendance punch (in/out)
  lastbpunch: timestamp("lastbpunch"), // Last time this employee made a biometric punch specifically
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// External attendance data pulled from BioTime API - preserve API field names exactly
export const attendancePullExt = pgTable("attendance_pull_ext", {
  id: serial("id").primaryKey(),
  biotimeId: text("biotime_id"), // API id field if available
  empCode: text("emp_code"), // API emp_code field
  punchTime: timestamp("punch_time"), // API punch_time field for chronological processing
  allFields: jsonb("all_fields"), // Store complete API response with original field names
  pulledAt: timestamp("pulled_at").defaultNow(),
});

// BioTime sync data for the new 3-poller system
export const biotimeSyncData = pgTable("biotime_sync_data", {
  id: serial("id").primaryKey(),
  biotimeId: text("biotime_id").notNull().unique(),
  employeeCode: text("employee_code"),
  empCode: text("emp_code"), // BioTime API field
  punchTime: timestamp("punch_time"),
  punchState: text("punch_state"),
  verifyType: text("verify_type"),
  workCode: text("work_code"),
  terminalSn: text("terminal_sn"),
  areaAlias: text("area_alias"),
  longitude: numeric("longitude"),
  latitude: numeric("latitude"),
  mobile: boolean("mobile"),
  allFields: jsonb("all_fields"), // Store complete API response
  pulledAt: timestamp("pulled_at").defaultNow(),
  processed: boolean("processed").default(false),
  processedAt: timestamp("processed_at"),
});

// Access control data from BioTime API (lock devices, door access, etc.)
export const accessControlExt = pgTable("access_control_ext", {
  id: serial("id").primaryKey(),
  biotimeId: text("biotime_id"), // API id field for continuity
  empCode: text("emp_code"), // API emp_code field
  allFields: jsonb("all_fields"), // Store complete API response with original field names
  pulledAt: timestamp("pulled_at").defaultNow(),
});

// Daily attendance records with shifts tracked
export const attendanceRecords = pgTable("attendance_records", {
  id: serial("id").primaryKey(),
  biotimeId: text("biotime_id"), // BioTime API unique identifier for duplicate detection
  employeeId: integer("employee_id").references(() => employeeRecords.id),
  employeeCode: text("employee_code").notNull(),
  date: timestamp("date").notNull(),
  checkIn: timestamp("check_in"),
  checkOut: timestamp("check_out"),
  breakIn: timestamp("break_in"),
  breakOut: timestamp("break_out"),
  totalHours: decimal("total_hours", { precision: 4, scale: 2 }).default('0'),
  regularHours: decimal("regular_hours", { precision: 4, scale: 2 }).default('0'),
  overtimeHours: decimal("overtime_hours", { precision: 4, scale: 2 }).default('0'),
  lateMinutes: integer("late_minutes").default(0),
  status: text("status").notNull(), // 'present', 'late', 'absent', 'auto_punchout', 'admin_terminated'
  notes: text("notes"),
  // Forced checkout tracking fields
  forcedCheckoutBy: integer("forced_checkout_by").references(() => users.id), // Admin who initiated forced checkout
  forcedCheckoutAt: timestamp("forced_checkout_at"), // When forced checkout was initiated
  originalCheckoutTime: timestamp("original_checkout_time"), // Calculated payroll time (e.g., 8 hours after check-in)
  payrollHours: decimal("payroll_hours", { precision: 4, scale: 2 }), // Hours to use for payroll (fixed at 8 for auto-punchout)
  // Location and source tracking
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  gpsAccuracy: decimal("gps_accuracy", { precision: 6, scale: 2 }), // meters
  locationSource: text("location_source").default('N'), // 'N'=Normal GPS, 'P'=Proximity/Piggyback, 'D'=Delayed sync
  proximityEmployeeId: integer("proximity_employee_id").references(() => employeeRecords.id), // Employee whose location was piggybacked
  bluetoothDeviceId: text("bluetooth_device_id"), // BLE device identifier used for proximity detection
  deviceInfo: text("device_info"), // Device identifier and platform info
  jobSiteId: integer("job_site_id"),
  punchSource: text("punch_source").default("terminal"), // 'terminal', 'mobile_app'
  // Timing analysis fields
  arrivalStatus: text("arrival_status").default('on_time'), // 'early', 'on_time', 'grace', 'late'
  departureStatus: text("departure_status").default('on_time'), // 'early', 'on_time', 'late', 'incomplete'
  earlyMinutes: integer("early_minutes").default(0), // Minutes early (positive value)
  graceMinutes: integer("grace_minutes").default(0), // Minutes within grace period
  earlyDepartureMinutes: integer("early_departure_minutes").default(0), // Minutes early departure
  lateDepartureMinutes: integer("late_departure_minutes").default(0), // Minutes late departure
  expectedArrival: timestamp("expected_arrival"), // Expected shift start time
  actualArrival: timestamp("actual_arrival"), // Actual check-in time
  expectedDeparture: timestamp("expected_departure"), // Expected shift end time
  actualDeparture: timestamp("actual_departure"), // Actual check-out time
  timingProcessed: boolean("timing_processed").default(false), // Flag for background processing
  timingProcessedAt: timestamp("timing_processed_at"), // When timing was calculated
  punchType: text("punch_type"), // 'standard_checkin', 'interim_checkin', 'early_checkin', 'standard_checkout', 'interim_checkout', 'early_checkout', 'late_checkout'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Daily summary for office vs field hours
export const dailyAttendanceSummary = pgTable("daily_attendance_summary", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employeeRecords.id),
  employeeCode: text("employee_code").notNull(),
  date: date("date").notNull(),
  officeHours: decimal("office_hours", { precision: 4, scale: 2 }).default('0'),
  fieldHours: decimal("field_hours", { precision: 4, scale: 2 }).default('0'),
  totalHours: decimal("total_hours", { precision: 4, scale: 2 }).default('0'),
  overtimeHours: decimal("overtime_hours", { precision: 4, scale: 2 }).default('0'),
  firstPunch: timestamp("first_punch"),
  lastPunch: timestamp("last_punch"),
  totalPunches: integer("total_punches").default(0),
  status: text("status").notNull(), // 'present', 'absent', 'late', 'partial'
  checkAttend: text("check_attend"), // 'yes', 'half', 'no'
  // Late/Early analysis fields for arrival
  lateMinutes: integer("late_minutes").default(0), // Minutes late (positive value)
  graceMinutes: integer("grace_minutes").default(0), // Minutes within grace period
  earlyMinutes: integer("early_minutes").default(0), // Minutes early (positive value)
  arrivalStatus: text("arrival_status").default('on_time'), // 'early', 'on_time', 'grace', 'late'
  expectedArrival: timestamp("expected_arrival"), // Expected shift start time
  actualArrival: timestamp("actual_arrival"), // Actual check-in time
  // Late/Early analysis fields for departure
  earlyDepartureMinutes: integer("early_departure_minutes").default(0), // Minutes early departure
  lateDepartureMinutes: integer("late_departure_minutes").default(0), // Minutes late departure
  departureStatus: text("departure_status").default('on_time'), // 'early', 'on_time', 'late', 'incomplete'
  expectedDeparture: timestamp("expected_departure"), // Expected shift end time
  actualDeparture: timestamp("actual_departure"), // Actual check-out time
  // Processing flags
  timingProcessed: boolean("timing_processed").default(false), // Flag for background processing
  timingProcessedAt: timestamp("timing_processed_at"), // When timing was calculated
  punchType: text("punch_type"), // 'standard_checkin', 'interim_checkin', 'early_checkin', 'standard_checkout', 'interim_checkout', 'early_checkout', 'late_checkout'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Device discovery and management
export const devices = pgTable("devices", {
  id: serial("id").primaryKey(),
  deviceId: text("device_id").notNull().unique(),
  alias: text("alias").notNull(),
  ipAddress: text("ip_address").notNull(),
  port: integer("port").notNull().default(80),
  terminalName: text("terminal_name"),
  area: integer("area").default(0),
  model: text("model"),
  sn: text("sn"),
  firmware: text("firmware"),
  isActive: boolean("is_active").default(true),
  isSelected: boolean("is_selected").default(false),
  deviceType: text("device_type").notNull().default('time_attendance'), // 'access_control', 'time_attendance', 'both'
  apiEndpoint: text("api_endpoint"),
  lastActivity: timestamp("last_activity").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User contacts table - for storing user's personal contact list
export const userContacts = pgTable('user_contacts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  contactType: varchar('contact_type', { length: 20 }).notNull().default('employee'), // 'employee' or 'custom'
  
  // For employee contacts - reference to employee_records
  employeeId: integer('employee_id').references(() => employeeRecords.id, { onDelete: 'cascade' }),
  
  // For custom contacts - direct data storage
  customName: varchar('custom_name', { length: 200 }),
  customPhone: varchar('custom_phone', { length: 20 }),
  customEmail: varchar('custom_email', { length: 255 }),
  
  // Metadata
  notes: text('notes'),
  isFavorite: boolean('is_favorite').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Sync status tracking with resume capability
export const syncStatus = pgTable("sync_status", {
  id: serial("id").primaryKey(),
  syncType: text("sync_type").notNull(), // 'employees', 'attendance', 'device_discovery'
  lastSync: timestamp("last_sync"),
  status: text("status").notNull(), // 'running', 'completed', 'failed', 'paused'
  recordsProcessed: integer("records_processed").default(0),
  recordsTotal: integer("records_total").default(0),
  currentPage: integer("current_page").default(1),
  pageSize: integer("page_size").default(100),
  lastProcessedId: text("last_processed_id"), // For resume functionality
  dateFrom: timestamp("date_from"),
  dateTo: timestamp("date_to"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Shifts table for project management
export const shifts = pgTable("shifts", {
  id: serial("id").primaryKey(),
  projectName: text("project_name").notNull(),
  shiftName: text("shift_name").notNull(),
  startHour: integer("start_hour").notNull(), // 0-23
  startMinute: integer("start_minute").notNull().default(0), // 0-59
  endHour: integer("end_hour").notNull(), // 0-23
  endMinute: integer("end_minute").notNull().default(0), // 0-59
  daysOfWeek: text("days_of_week").array().notNull(), // ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
  gracePeriodMinutes: integer("grace_period_minutes").notNull().default(30), // Grace period in minutes, default 30 minutes
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Audit trail for all user actions
// Shift assignments table for scheduling employees to shifts
export const shiftAssignments = pgTable("shift_assignments", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employeeRecords.id),
  shiftId: integer("shift_id").notNull().references(() => shifts.id),
  date: date("date").notNull(),
  status: text("status").notNull().default("scheduled"), // scheduled, confirmed, completed, cancelled
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Rejected attendance records for tracking duplicates and bad data
export const attendanceRejected = pgTable("attendance_rejected", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employeeRecords.id),
  employeeCode: varchar("employee_code", { length: 50 }),
  date: date("date"),
  checkIn: timestamp("check_in"),
  checkOut: timestamp("check_out"),
  breakIn: timestamp("break_in"),
  breakOut: timestamp("break_out"),
  totalHours: varchar("total_hours", { length: 10 }),
  regularHours: varchar("regular_hours", { length: 10 }),
  overtimeHours: varchar("overtime_hours", { length: 10 }),
  lateMinutes: integer("late_minutes").default(0),
  status: varchar("status", { length: 20 }),
  location: varchar("location", { length: 50 }).default('office'),
  punchSource: varchar("punch_source", { length: 50 }).default('terminal'),
  latitude: varchar("latitude", { length: 20 }),
  longitude: varchar("longitude", { length: 20 }),
  accuracy: varchar("accuracy", { length: 10 }),
  rejectionReason: varchar("rejection_reason", { length: 255 }).notNull(),
  originalRecordId: integer("original_record_id"),
  rejectedAt: timestamp("rejected_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  username: text("username").notNull(),
  userRole: text("user_role").notNull(),
  action: text("action").notNull(), // CREATE, UPDATE, DELETE, LOGIN, LOGOUT, etc.
  entityType: text("entity_type"), // attendance_record, employee, shift, etc.
  entityId: text("entity_id"), // ID of the affected entity
  oldValues: jsonb("old_values"), // Previous state before change
  newValues: jsonb("new_values"), // New state after change
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  sessionId: text("session_id"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  details: text("details"), // Additional context or notes
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  type: varchar("type", { length: 50 }).notNull().default("string"), // string, number, boolean, json
  category: varchar("category", { length: 100 }).notNull().default("general"),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: integer("updated_by").references(() => users.id),
});

export const actionRecords = pgTable("action_records", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  userId: integer("user_id").references(() => users.id),
  userType: varchar("user_type", { length: 20 }).notNull(), // 'admin', 'system', 'employee'
  userName: varchar("user_name", { length: 100 }),
  command: varchar("command", { length: 100 }).notNull(),
  targetType: varchar("target_type", { length: 50 }), // 'employee', 'attendance', 'shift', etc.
  targetId: varchar("target_id", { length: 100 }), // employee code or record id
  targetName: varchar("target_name", { length: 200 }), // employee name or description
  parameters: jsonb("parameters"), // Additional command parameters
  result: varchar("result", { length: 50 }).notNull(), // 'success', 'failed', 'pending'
  resultMessage: text("result_message"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Forced punchouts table for comprehensive tracking
export const forcedPunchouts = pgTable("forced_punchouts", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employeeRecords.id),
  employeeCode: text("employee_code").notNull(),
  employeeName: text("employee_name").notNull(),
  department: text("department"),
  originalCheckIn: timestamp("original_check_in").notNull(),
  forcedCheckOut: timestamp("forced_check_out").notNull(),
  calculatedHours: decimal("calculated_hours", { precision: 4, scale: 2 }).notNull().default('7.00'),
  actualHoursPresent: decimal("actual_hours_present", { precision: 4, scale: 2 }),
  reason: text("reason").default("Administrative override"),
  triggeredBy: text("triggered_by").notNull(), // 'admin', 'system', 'auto', 'mobile'
  adminUserId: integer("admin_user_id").references(() => users.id),
  adminUserName: text("admin_user_name"),
  attendanceRecordId: integer("attendance_record_id").references(() => attendanceRecords.id),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  notes: text("notes"),
  status: text("status").notNull().default("completed"), // 'completed', 'failed', 'reversed'
  // Mobile checkout tracking fields
  punchSource: text("punch_source").default("terminal"), // 'terminal', 'mobile_app', 'admin_dashboard'
  mobileLatitude: decimal("mobile_latitude", { precision: 10, scale: 8 }),
  mobileLongitude: decimal("mobile_longitude", { precision: 11, scale: 8 }),
  mobileGpsAccuracy: decimal("mobile_gps_accuracy", { precision: 6, scale: 2 }),
  jobSiteId: text("job_site_id"),
  requestReason: text("request_reason"), // For mobile punch-out requests
  approvalStatus: text("approval_status").default("approved"), // 'pending', 'approved', 'rejected'
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Terminate Action table for attendance termination records
export const terminateActions = pgTable("terminate_action", {
  id: serial("id").primaryKey(),
  time: timestamp("time").defaultNow().notNull(),
  empCode: varchar("emp_code").notNull(),
  terminatedBy: varchar("terminated_by").notNull(),
  forcedOut: timestamp("forced_out").notNull(),
  punchInTime: timestamp("punch_in_time").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Exclusions for NonBio management
export const exclusions = pgTable("exclusions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(), // 'department' or 'employee'
  targetValue: text("target_value").notNull(), // department name or employee code
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// External attendance for mobile punch in/out
export const attendanceExternal = pgTable("attendance_external", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employeeRecords.id),
  employeeCode: varchar("employee_code", { length: 50 }).notNull(),
  checkType: varchar("check_type", { length: 10 }).notNull(), // 'in' or 'out'
  timestamp: timestamp("timestamp").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  accuracy: integer("accuracy"), // GPS accuracy in meters
  locationName: text("location_name"), // Reverse geocoded location
  deviceInfo: jsonb("device_info"), // Device type, OS, app version, etc.
  jobSiteId: integer("job_site_id"), // Reference to job site if applicable
  jobSiteName: varchar("job_site_name", { length: 200 }),
  photoUrl: text("photo_url"), // Selfie/photo verification URL
  status: varchar("status", { length: 20 }).default("pending").notNull(), // 'pending', 'approved', 'rejected'
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  syncedToAttendance: boolean("synced_to_attendance").default(false).notNull(),
  syncedAt: timestamp("synced_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Former employees table (for employees who left the company)
export const formerEmployees = pgTable("former_employees", {
  id: serial("id").primaryKey(),
  employeeCode: varchar("employee_code", { length: 50 }).notNull().unique(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  email: varchar("email", { length: 100 }),
  mobile: varchar("mobile", { length: 50 }),
  department: varchar("department", { length: 100 }),
  designation: varchar("designation", { length: 100 }),
  dateOfJoining: timestamp("date_of_joining"),
  isActive: boolean("is_active").default(false),
  national: varchar("national", { length: 50 }),
  // Add fields for tracking when they left
  dateOfLeaving: timestamp("date_of_leaving"),
  reasonForLeaving: text("reason_for_leaving"),
  movedFromEmployeeId: integer("moved_from_employee_id"), // Original employee ID for reference
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Employee location tracking table for persistent 5-minute interval tracking
export const empLoc = pgTable("emp_loc", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employeeRecords.id),
  employeeCode: varchar("employee_code", { length: 50 }).notNull(),
  timestamp: timestamp("timestamp").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  accuracy: decimal("accuracy", { precision: 6, scale: 2 }), // GPS accuracy in meters
  altitude: decimal("altitude", { precision: 8, scale: 2 }), // Altitude in meters
  speed: decimal("speed", { precision: 6, scale: 2 }), // Speed in m/s
  heading: decimal("heading", { precision: 5, scale: 2 }), // Heading in degrees
  batteryLevel: integer("battery_level"), // Battery percentage
  networkType: varchar("network_type", { length: 20 }), // 'wifi', '4g', '5g', etc.
  locationName: text("location_name"), // Reverse geocoded location
  isWorkLocation: boolean("is_work_location").default(false), // Flag for work/non-work locations
  jobSiteId: varchar("job_site_id", { length: 50 }), // Associated job site if applicable
  deviceInfo: jsonb("device_info"), // Device model, OS, app version
  source: varchar("source", { length: 30 }).default("mobile_app"), // 'mobile_app', 'gps_tracker', 'manual'
  status: varchar("status", { length: 20 }).default("active"), // 'active', 'inactive', 'offline'
  syncStatus: varchar("sync_status", { length: 20 }).default("synced"), // 'pending', 'synced', 'failed'
  notes: text("notes"), // Additional notes or flags
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Gamification tables
export const attendanceStreaks = pgTable("attendance_streaks", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employeeRecords.id),
  currentStreak: integer("current_streak").default(0).notNull(),
  longestStreak: integer("longest_streak").default(0).notNull(),
  lastAttendanceDate: date("last_attendance_date"),
  streakStartDate: date("streak_start_date"),
  totalPoints: integer("total_points").default(0).notNull(),
  level: integer("level").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const badges = pgTable("badges", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description").notNull(),
  icon: varchar("icon", { length: 50 }).notNull(), // Lucide icon name
  color: varchar("color", { length: 7 }).notNull(), // Hex color code
  category: varchar("category", { length: 50 }).notNull(), // "streak", "attendance", "punctuality", "special"
  requirement: integer("requirement").notNull(), // Days, points, or other metric
  requirementType: varchar("requirement_type", { length: 50 }).notNull(), // "streak", "total_days", "punctual_days", "points"
  points: integer("points").default(0).notNull(), // Points awarded for earning this badge
  sortOrder: integer("sort_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const employeeBadges = pgTable("employee_badges", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employeeRecords.id),
  badgeId: integer("badge_id").notNull().references(() => badges.id),
  earnedAt: timestamp("earned_at").defaultNow().notNull(),
  progress: integer("progress").default(0).notNull(), // Current progress towards badge
});

export const gamificationEvents = pgTable("gamification_events", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employeeRecords.id),
  eventType: varchar("event_type", { length: 50 }).notNull(), // "streak_continued", "streak_broken", "badge_earned", "level_up"
  points: integer("points").default(0).notNull(),
  description: text("description").notNull(),
  metadata: jsonb("metadata"), // Additional event data
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Attendance Policy Settings
export const attendancePolicySettings = pgTable("attendance_policy_settings", {
  id: serial("id").primaryKey(),
  // Grace Period Settings
  gracePeriodMinutes: integer("grace_period_minutes").notNull().default(30),
  
  // Late Arrival Deductions (31-60 minutes)
  lateArrival1stOccurrenceHours: decimal("late_arrival_1st_occurrence_hours", { precision: 3, scale: 1 }).notNull().default('0'),
  lateArrival2ndOccurrenceHours: decimal("late_arrival_2nd_occurrence_hours", { precision: 3, scale: 1 }).notNull().default('0.5'),
  lateArrival3rdOccurrenceHours: decimal("late_arrival_3rd_occurrence_hours", { precision: 3, scale: 1 }).notNull().default('1'),
  
  // Significant Delay Deductions (61-120 minutes)
  significantDelay1stOccurrenceHours: decimal("significant_delay_1st_occurrence_hours", { precision: 3, scale: 1 }).notNull().default('1'),
  significantDelay2ndOccurrenceHours: decimal("significant_delay_2nd_occurrence_hours", { precision: 3, scale: 1 }).notNull().default('2'),
  significantDelay3rdOccurrenceHours: decimal("significant_delay_3rd_occurrence_hours", { precision: 3, scale: 1 }).notNull().default('3'),
  
  // Extended Delay (>120 minutes) - treated as half day
  extendedDelayTreatedAsHalfDay: boolean("extended_delay_treated_as_half_day").notNull().default(true),
  
  // Per-minute/day/half-day deduction rates
  lateDeductionPerMinute: decimal("late_deduction_per_minute", { precision: 10, scale: 2 }).notNull().default('10'), // PKR per minute
  absentDeductionPerDay: decimal("absent_deduction_per_day", { precision: 10, scale: 2 }).notNull().default('1000'), // PKR per day
  halfDayDeduction: decimal("half_day_deduction", { precision: 10, scale: 2 }).notNull().default('500'), // PKR for half day
  
  // Working hours configuration
  standardShiftHours: integer("standard_shift_hours").notNull().default(8),
  minimumWeeklyHours: integer("minimum_weekly_hours").notNull().default(50),
  shiftStartTime: time("shift_start_time").notNull().default('09:00:00'),
  shiftEndTime: time("shift_end_time").notNull().default('18:00:00'),
  
  // Half day threshold
  halfDayMinimumHours: integer("half_day_minimum_hours").notNull().default(4),
  
  // Overtime settings
  overtimeThresholdHours: integer("overtime_threshold_hours").notNull().default(8),
  overtimeMultiplier: decimal("overtime_multiplier", { precision: 3, scale: 2 }).notNull().default('1.5'),
  
  // Weekend settings
  weekendDays: text("weekend_days").array().notNull().default(sql`ARRAY['Saturday', 'Sunday']`),
  
  // Policy metadata
  effectiveDate: date("effective_date").notNull().defaultNow(),
  lastUpdatedBy: integer("last_updated_by").references(() => users.id),
  lastUpdatedAt: timestamp("last_updated_at").notNull().defaultNow(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// BioTime CSV Import Staging Table
export const biotimeImportStaging = pgTable("biotime_import_staging", {
  id: serial("id").primaryKey(),
  biotime_id: integer("biotime_id").notNull().unique(), // Original BioTime ID (unique identifier)
  employee_code: text("employee_code").notNull(),
  employee_first_name: text("employee_first_name"),
  employee_last_name: text("employee_last_name"),
  department_name: text("department_name"),
  position_title: text("position_title"),
  punch_timestamp: timestamp("punch_timestamp").notNull(),
  punch_state_code: integer("punch_state_code").notNull(), // 0=In, 1=Out, 5=Overtime
  punch_state_label: text("punch_state_label"),
  verification_type: integer("verification_type"), // 1=Fingerprint, 4=Card, 15=Face
  verification_label: text("verification_label"),
  work_code: text("work_code"),
  gps_coordinates: text("gps_coordinates"),
  location_area: text("location_area"),
  device_serial: text("device_serial"),
  device_alias: text("device_alias"),
  temperature_reading: decimal("temperature_reading", { precision: 5, scale: 2 }),
  upload_timestamp: timestamp("upload_timestamp"),
  
  // Processing status
  processed: boolean("processed").default(false),
  processing_errors: text("processing_errors"),
  attendance_record_created: boolean("attendance_record_created").default(false),
  created_at: timestamp("created_at").defaultNow(),
  processed_at: timestamp("processed_at"),
  
  // Batch tracking
  import_batch_id: text("import_batch_id"),
  source_file: text("source_file"),
});

// Relations
export const userRelations = relations(users, ({ one }) => ({
  employee: one(employeeRecords, {
    fields: [users.employeeId],
    references: [employeeRecords.employeeCode],
  }),
}));

export const employeeRelations = relations(employeeRecords, ({ many, one }) => ({
  attendanceRecords: many(attendanceRecords),
  shiftAssignments: many(shiftAssignments),
  user: one(users, {
    fields: [employeeRecords.employeeCode],
    references: [users.employeeId],
  }),
  attendanceExternal: many(attendanceExternal),
  attendanceStreak: one(attendanceStreaks),
  badges: many(employeeBadges),
  gamificationEvents: many(gamificationEvents),
}));

export const attendanceRelations = relations(attendanceRecords, ({ one }) => ({
  employee: one(employeeRecords, {
    fields: [attendanceRecords.employeeId],
    references: [employeeRecords.id],
  }),
}));

export const shiftRelations = relations(shifts, ({ many }) => ({
  assignments: many(shiftAssignments),
}));

export const shiftAssignmentRelations = relations(shiftAssignments, ({ one }) => ({
  employee: one(employeeRecords, {
    fields: [shiftAssignments.employeeId],
    references: [employeeRecords.id],
  }),
  shift: one(shifts, {
    fields: [shiftAssignments.shiftId],
    references: [shifts.id],
  }),
}));

export const deviceRelations = relations(devices, ({ many }) => ({
  // Can add relations to sync logs or other device-related data
}));

export const attendanceExternalRelations = relations(attendanceExternal, ({ one }) => ({
  employee: one(employeeRecords, {
    fields: [attendanceExternal.employeeId],
    references: [employeeRecords.id],
  }),
  approver: one(users, {
    fields: [attendanceExternal.approvedBy],
    references: [users.id],
  }),
}));

// Employee alert tracking table
export const employeeAlerts = pgTable("employee_alerts", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employeeRecords.id),
  employeeCode: varchar("employee_code", { length: 50 }).notNull(),
  alertType: varchar("alert_type", { length: 50 }).notNull(), // 'missed_punchout', 'late_arrival', 'early_departure'
  alertStatus: varchar("alert_status", { length: 20 }).notNull().default('active'), // 'active', 'resolved', 'dismissed'
  punchInTime: timestamp("punch_in_time"),
  expectedPunchOutTime: timestamp("expected_punch_out_time"),
  actualPunchOutTime: timestamp("actual_punch_out_time"),
  alertTriggeredAt: timestamp("alert_triggered_at").defaultNow().notNull(),
  alertResolvedAt: timestamp("alert_resolved_at"),
  hoursWorked: decimal("hours_worked", { precision: 4, scale: 2 }),
  overtimeHours: decimal("overtime_hours", { precision: 4, scale: 2 }),
  alertMessage: text("alert_message"),
  resolvedBy: integer("resolved_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// WhatsApp Onboarding System Tables
export const whatsappOnboardingRequests = pgTable("whatsapp_onboarding_requests", {
  id: serial("id").primaryKey(),
  phoneNumber: varchar("phone_number", { length: 20 }).notNull().unique(),
  countryCode: varchar("country_code", { length: 5 }).notNull().default('+92'),
  formattedPhone: varchar("formatted_phone", { length: 25 }).notNull(), // Without + prefix for WhatsApp
  
  // Onboarding Status
  onboardingStatus: varchar("onboarding_status", { length: 30 }).notNull().default('initiated'), 
  // 'initiated', 'welcome_sent', 'join_requested', 'cnic_requested', 'cnic_verified', 'credentials_sent', 'completed', 'rejected', 'expired'
  
  // Employee Verification
  employeeCode: varchar("employee_code", { length: 50 }),
  employeeId: integer("employee_id").references(() => employeeRecords.id),
  cnicProvided: varchar("cnic_provided", { length: 20 }),
  cnicVerified: boolean("cnic_verified").default(false),
  cnicVerificationAttempts: integer("cnic_verification_attempts").default(0),
  
  // Generated Credentials
  generatedUsername: varchar("generated_username", { length: 50 }),
  generatedPassword: varchar("generated_password", { length: 50 }),
  passwordSent: boolean("password_sent").default(false),
  
  // Device Information
  deviceInfo: jsonb("device_info"), // Browser, OS, Device details
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address", { length: 45 }),
  
  // Timestamps
  welcomeMessageSentAt: timestamp("welcome_message_sent_at"),
  joinRequestedAt: timestamp("join_requested_at"),
  cnicRequestedAt: timestamp("cnic_requested_at"),
  cnicVerifiedAt: timestamp("cnic_verified_at"),
  credentialsSentAt: timestamp("credentials_sent_at"),
  completedAt: timestamp("completed_at"),
  expiredAt: timestamp("expired_at"),
  
  // Admin Actions
  rejectedBy: integer("rejected_by").references(() => users.id),
  rejectedAt: timestamp("rejected_at"),
  rejectionReason: text("rejection_reason"),
  
  // Metadata
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// WhatsApp Message Log
export const whatsappMessageLog = pgTable("whatsapp_message_log", {
  id: serial("id").primaryKey(),
  onboardingRequestId: integer("onboarding_request_id").references(() => whatsappOnboardingRequests.id),
  phoneNumber: varchar("phone_number", { length: 20 }).notNull(),
  messageType: varchar("message_type", { length: 30 }).notNull(), 
  // 'welcome', 'join_confirmation', 'cnic_request', 'cnic_verification', 'credentials', 'apk_link', 'notification'
  
  messageContent: text("message_content").notNull(),
  messageStatus: varchar("message_status", { length: 20 }).notNull().default('pending'), // 'pending', 'sent', 'delivered', 'failed'
  
  // WhatsApp Gateway Response
  gatewayResponse: jsonb("gateway_response"),
  messageId: varchar("message_id", { length: 100 }),
  errorDetails: text("error_details"),
  
  // Delivery Status
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  failedAt: timestamp("failed_at"),
  
  // Retries
  retryCount: integer("retry_count").default(0),
  maxRetries: integer("max_retries").default(3),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// WhatsApp Onboarding Configuration
export const whatsappOnboardingConfig = pgTable("whatsapp_onboarding_config", {
  id: serial("id").primaryKey(),
  
  // Message Templates
  welcomeMessageTemplate: text("welcome_message_template").notNull().default('[NEMS] Welcome to Nexlinx Employee Management System! 🎉\n\nTo join our system, please reply with "/join" to continue the registration process.\n\nThis is an automated system for employee onboarding only.'),
  joinConfirmationTemplate: text("join_confirmation_template").notNull().default('[NEMS] Thank you for joining! 📝\n\nTo verify your identity, please provide any 6 digits from your CNIC (National ID Card).\n\nExample: If your CNIC is 12345-1234567-1, you can reply with "123451" or "456712" etc.\n\nThis helps us verify you are an authorized employee.'),
  cnicVerificationSuccessTemplate: text("cnic_verification_success_template").notNull().default('[NEMS] Identity Verified! ✅\n\nYour employee account has been created:\n\n👤 Username: {username}\n🔐 Password: {password}\n\nPlease save these credentials securely. You can now log in to the Employee Management System.\n\nWelcome to the team! 🚀'),
  cnicVerificationFailTemplate: text("cnic_verification_fail_template").notNull().default('[NEMS] Verification Failed ❌\n\nThe CNIC digits provided do not match our employee records. Please try again with different 6 digits from your CNIC.\n\nAttempts remaining: {remaining_attempts}'),
  
  // APK Distribution
  apkDistributionEnabled: boolean("apk_distribution_enabled").default(false),
  apkDownloadUrl: varchar("apk_download_url", { length: 500 }),
  apkVersion: varchar("apk_version", { length: 20 }),
  apkMessageTemplate: text("apk_message_template").notNull().default('[NEMS] Mobile App Available! 📱\n\nDownload the official NEMS mobile app:\n{apk_url}\n\nVersion: {version}\n\nFor Android devices only. Install from trusted sources.'),
  
  // Security Settings
  maxCnicAttempts: integer("max_cnic_attempts").default(3),
  onboardingTimeoutHours: integer("onboarding_timeout_hours").default(24),
  requireAdminApproval: boolean("require_admin_approval").default(false),
  
  // Rate Limiting
  maxRequestsPerPhone: integer("max_requests_per_phone").default(5),
  cooldownPeriodHours: integer("cooldown_period_hours").default(24),
  
  // Notifications
  notifyAdminOnNewRequest: boolean("notify_admin_on_new_request").default(true),
  notifyAdminOnVerificationFailure: boolean("notify_admin_on_verification_failure").default(true),
  adminNotificationNumber: varchar("admin_notification_number", { length: 20 }),
  
  // Metadata
  isActive: boolean("is_active").default(true),
  lastUpdatedBy: integer("last_updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// WhatsApp Onboarding Statistics
export const whatsappOnboardingStats = pgTable("whatsapp_onboarding_stats", {
  id: serial("id").primaryKey(),
  
  // Date tracking
  statsDate: date("stats_date").notNull().unique(),
  
  // Request Statistics
  totalRequests: integer("total_requests").default(0),
  newRequests: integer("new_requests").default(0),
  completedRequests: integer("completed_requests").default(0),
  rejectedRequests: integer("rejected_requests").default(0),
  expiredRequests: integer("expired_requests").default(0),
  
  // Verification Statistics
  cnicVerificationAttempts: integer("cnic_verification_attempts").default(0),
  cnicVerificationSuccesses: integer("cnic_verification_successes").default(0),
  cnicVerificationFailures: integer("cnic_verification_failures").default(0),
  
  // Message Statistics
  totalMessagesSent: integer("total_messages_sent").default(0),
  welcomeMessagesSent: integer("welcome_messages_sent").default(0),
  credentialMessagesSent: integer("credential_messages_sent").default(0),
  apkLinksSent: integer("apk_links_sent").default(0),
  
  // Device Statistics
  androidDevices: integer("android_devices").default(0),
  iosDevices: integer("ios_devices").default(0),
  desktopDevices: integer("desktop_devices").default(0),
  unknownDevices: integer("unknown_devices").default(0),
  
  // Success Rates
  completionRate: decimal("completion_rate", { precision: 5, scale: 2 }).default('0.00'),
  verificationSuccessRate: decimal("verification_success_rate", { precision: 5, scale: 2 }).default('0.00'),
  messageDeliveryRate: decimal("message_delivery_rate", { precision: 5, scale: 2 }).default('0.00'),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Mobile location tracking table
export const mobileLocationData = pgTable("mobile_location_data", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employeeRecords.id),
  employeeCode: varchar("employee_code", { length: 50 }).notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  accuracy: integer("accuracy"), // GPS accuracy in meters
  altitude: decimal("altitude", { precision: 8, scale: 2 }), // GPS altitude in meters
  speed: decimal("speed", { precision: 6, scale: 2 }), // Speed in m/s
  heading: decimal("heading", { precision: 6, scale: 2 }), // Compass heading in degrees
  locationName: text("location_name"), // Reverse geocoded location name
  address: text("address"), // Full address if available
  activityType: varchar("activity_type", { length: 50 }), // 'punch_in', 'punch_out', 'break', 'travel', 'stationary'
  batteryLevel: integer("battery_level"), // Device battery percentage
  networkType: varchar("network_type", { length: 20 }), // 'wifi', '4g', '5g', 'offline'
  deviceInfo: jsonb("device_info"), // Device model, OS version, app version
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  syncedAt: timestamp("synced_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Daily attendance metrics table for consistent reporting
export const dailyAttendanceMetrics = pgTable("daily_attendance_metrics", {
  id: serial("id").primaryKey(),
  date: date("date").notNull().unique(),
  totalEmployees: integer("total_employees").notNull(), // 322 total employees
  presentCount: integer("present_count").notNull(), // Unique check-ins
  completeCount: integer("complete_count").notNull(), // Employees with both check-in and check-out
  incompleteCount: integer("incomplete_count").notNull(), // Employees with only check-in
  lateCount: integer("late_count").notNull(), // Late arrivals based on shifts
  absentCount: integer("absent_count").notNull(), // Total - Present - NonBio
  nonBioCount: integer("nonbio_count").notNull(), // NonBio employees
  attendanceRate: numeric("attendance_rate").notNull(), // Attendance percentage
  uniqueCheckIns: integer("unique_check_ins").notNull(), // Unique employees who checked in
  shiftAssignments: integer("shift_assignments").default(0), // Number of employees with shifts
  lateThreshold: integer("late_threshold_minutes").default(5), // Late threshold in minutes
  calculatedAt: timestamp("calculated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Employee requests system for mobile interface
export const employeeRequests = pgTable("employee_requests", {
  id: serial("id").primaryKey(),
  employeeCode: text("employee_code").notNull(),
  requestType: text("request_type").notNull(), // 'overtime', 'leave', 'reimbursement', 'work_from_home', 'early_punchout'
  title: text("title").notNull(),
  description: text("description").notNull(),
  requestDate: date("request_date").notNull(), // Date the request is for
  startDate: date("start_date"), // For leave/work from home
  endDate: date("end_date"), // For leave/work from home
  hours: decimal("hours", { precision: 5, scale: 2 }), // For overtime/early punchout
  amount: decimal("amount", { precision: 10, scale: 2 }), // For reimbursement
  currency: text("currency").default("PKR"), // For reimbursement
  reason: text("reason").notNull(),
  attachments: text("attachments").array(), // File paths for receipts/documents
  status: text("status").notNull().default("pending"), // 'pending', 'approved', 'rejected', 'cancelled'
  priority: text("priority").notNull().default("normal"), // 'low', 'normal', 'high', 'urgent'
  managerNotes: text("manager_notes"), // Manager's review notes
  approvedBy: text("approved_by"), // Manager employee code
  approvedAt: timestamp("approved_at"),
  rejectedBy: text("rejected_by"), // Manager employee code
  rejectedAt: timestamp("rejected_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Disputed attendance records requiring manager review
export const disputedAttendanceRecords = pgTable("disputed_attendance_records", {
  id: serial("id").primaryKey(),
  originalAttendanceId: integer("original_attendance_id").references(() => attendanceRecords.id),
  employeeCode: varchar("employee_code", { length: 50 }).notNull(),
  employeeName: text("employee_name"),
  department: text("department"),
  shiftName: text("shift_name"),
  
  // Original attendance data
  originalCheckIn: timestamp("original_check_in"),
  originalCheckOut: timestamp("original_check_out"),
  originalTotalHours: numeric("original_total_hours", { precision: 4, scale: 2 }),
  originalStatus: text("original_status"),
  
  // Disputed calculation
  disputeReason: text("dispute_reason").notNull(), // 'missing_punchout', 'home_punch', 'late_arrival', 'early_departure'
  calculatedHours: numeric("calculated_hours", { precision: 4, scale: 2 }).notNull(),
  penaltyHours: numeric("penalty_hours", { precision: 4, scale: 2 }).default('0.00'),
  
  // Mobile location correlation
  hasLocationData: boolean("has_location_data").default(false),
  lastKnownLocation: text("last_known_location"),
  locationBasedExitTime: timestamp("location_based_exit_time"),
  locationConfidence: integer("location_confidence").default(0), // 0-100%
  
  // Manager review
  managerReview: text("manager_review").default('pending'), // 'pending', 'approved', 'rejected', 'modified'
  managerId: integer("manager_id").references(() => users.id),
  managerNotes: text("manager_notes"),
  managerDecision: text("manager_decision"),
  finalApprovedHours: numeric("final_approved_hours", { precision: 4, scale: 2 }),
  reviewedAt: timestamp("reviewed_at"),
  
  // Appeal system
  appealStatus: text("appeal_status").default('none'), // 'none', 'requested', 'under_review', 'approved', 'rejected'
  appealReason: text("appeal_reason"),
  employeeComments: text("employee_comments"),
  appealSubmittedAt: timestamp("appeal_submitted_at"),
  
  // Metadata
  disputeDate: date("dispute_date").notNull(),
  autoCalculated: boolean("auto_calculated").default(true),
  requiresReview: boolean("requires_review").default(true),
  priority: text("priority").default('normal'), // 'low', 'normal', 'high', 'urgent'
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Shift-based work hour calculations
export const shiftBasedCalculations = pgTable("shift_based_calculations", {
  id: serial("id").primaryKey(),
  employeeCode: varchar("employee_code", { length: 50 }).notNull(),
  attendanceId: integer("attendance_id").references(() => attendanceRecords.id),
  shiftId: integer("shift_id").references(() => shifts.id),
  
  // Shift information
  shiftName: text("shift_name").notNull(),
  shiftStartTime: time("shift_start_time").notNull(),
  shiftEndTime: time("shift_end_time").notNull(),
  shiftDurationHours: numeric("shift_duration_hours", { precision: 4, scale: 2 }).notNull(),
  
  // Actual timing
  actualCheckIn: timestamp("actual_check_in"),
  actualCheckOut: timestamp("actual_check_out"),
  lateArrivalMinutes: integer("late_arrival_minutes").default(0),
  earlyDepartureMinutes: integer("early_departure_minutes").default(0),
  
  // Calculated work hours
  availableWorkHours: numeric("available_work_hours", { precision: 4, scale: 2 }).notNull(), // Shift duration - late arrival
  actualWorkHours: numeric("actual_work_hours", { precision: 4, scale: 2 }).default('0.00'),
  maximumPossibleHours: numeric("maximum_possible_hours", { precision: 4, scale: 2 }).notNull(),
  
  // Penalties and adjustments
  missedPunchPenalty: numeric("missed_punch_penalty", { precision: 4, scale: 2 }).default('0.00'),
  homePunchPenalty: numeric("home_punch_penalty", { precision: 4, scale: 2 }).default('0.00'),
  locationPenalty: numeric("location_penalty", { precision: 4, scale: 2 }).default('0.00'),
  
  // Final calculation
  finalPayrollHours: numeric("final_payroll_hours", { precision: 4, scale: 2 }).notNull(),
  calculationNotes: text("calculation_notes"),
  
  calculationDate: date("calculation_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Team templates for structured team building
export const teamTemplates = pgTable("team_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  designations: jsonb("designations").notNull(), // Array of designation objects
  isActive: boolean("is_active").notNull().default(true),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Assembled teams
export const assembledTeams = pgTable("assembled_teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  templateId: integer("template_id").references(() => teamTemplates.id),
  status: text("status").notNull().default("draft"), // 'draft', 'active', 'completed', 'archived'
  shiftId: integer("shift_id").references(() => shifts.id), // Assigned shift
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Team members
export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull().references(() => assembledTeams.id),
  employeeId: integer("employee_id").notNull().references(() => employeeRecords.id),
  designationName: text("designation_name").notNull(),
  designationLevel: text("designation_level").notNull(), // 'junior', 'mid', 'senior', 'lead', 'manager'
  assignedDate: timestamp("assigned_date").defaultNow(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Scoring System Tables
export const scoringRules = pgTable("scoring_rules", {
  id: serial("id").primaryKey(),
  ruleName: varchar("rule_name", { length: 100 }).notNull(),
  ruleType: varchar("rule_type", { length: 50 }).notNull(), // 'attendance', 'punctuality', 'performance', 'streak'
  points: integer("points").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  conditions: jsonb("conditions"), // Rule conditions and thresholds
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const employeeScores = pgTable("employee_scores", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employeeRecords.id),
  employeeCode: varchar("employee_code", { length: 50 }).notNull(),
  month: varchar("month", { length: 7 }).notNull(), // 'YYYY-MM' format
  
  // Score Components
  attendancePoints: integer("attendance_points").default(0),
  punctualityPoints: integer("punctuality_points").default(0),
  performancePoints: integer("performance_points").default(0),
  streakBonus: integer("streak_bonus").default(0),
  overtimeBonus: integer("overtime_bonus").default(0),
  locationBonus: integer("location_bonus").default(0),
  
  // Totals
  totalPoints: integer("total_points").notNull().default(0),
  rank: integer("rank"),
  percentile: decimal("percentile", { precision: 5, scale: 2 }),
  
  // Metadata
  calculatedAt: timestamp("calculated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const scoringAuditTrail = pgTable("scoring_audit_trail", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employeeRecords.id),
  employeeCode: varchar("employee_code", { length: 50 }).notNull(),
  
  // Event Details
  eventType: varchar("event_type", { length: 50 }).notNull(), // 'score_calculation', 'rule_change', 'manual_adjustment'
  eventDescription: text("event_description").notNull(),
  
  // Score Changes
  previousScore: integer("previous_score"),
  newScore: integer("new_score"),
  pointsAwarded: integer("points_awarded"),
  ruleApplied: varchar("rule_applied", { length: 100 }),
  
  // Context
  calculationPeriod: varchar("calculation_period", { length: 20 }), // 'daily', 'weekly', 'monthly'
  attendanceDate: date("attendance_date"),
  
  // System Info
  performedBy: integer("performed_by").references(() => users.id),
  systemGenerated: boolean("system_generated").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const scoringConfiguration = pgTable("scoring_configuration", {
  id: serial("id").primaryKey(),
  configKey: varchar("config_key", { length: 100 }).notNull().unique(),
  configValue: text("config_value").notNull(),
  description: text("description"),
  dataType: varchar("data_type", { length: 20 }).default('string'), // 'string', 'number', 'boolean', 'json'
  category: varchar("category", { length: 50 }).default('general'), // 'general', 'scoring', 'thresholds', 'bonuses'
  isActive: boolean("is_active").default(true),
  lastUpdatedBy: integer("last_updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// System mode configuration table
export const systemConfiguration = pgTable("system_configuration", {
  id: serial("id").primaryKey(),
  systemMode: varchar("system_mode", { length: 20 }).default("development"), // "development" or "live"
  gamificationEnabled: boolean("gamification_enabled").default(true),
  scoringEnabled: boolean("scoring_enabled").default(true),
  leaderboardEnabled: boolean("leaderboard_enabled").default(true),
  lastUpdatedBy: integer("last_updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Device sessions table for tracking logged-in devices
export const deviceSessions = pgTable("device_sessions", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  userId: integer("user_id").references(() => users.id).notNull(),
  deviceName: text("device_name").notNull(),
  deviceNumber: text("device_number"), // Device identifier/serial number
  ipAddress: text("ip_address").notNull(),
  operatingSystem: text("operating_system"),
  osVersion: text("os_version"),
  browserName: text("browser_name"),
  browserVersion: text("browser_version"),
  deviceType: text("device_type").notNull(), // 'mobile', 'desktop', 'tablet'
  userAgent: text("user_agent"),
  location: text("location"), // Geographic location if available
  loginTime: timestamp("login_time").defaultNow(),
  lastActivity: timestamp("last_activity").defaultNow(),
  status: text("status").notNull().default("active"), // 'active', 'inactive', 'idle'
  isActive: boolean("is_active").notNull().default(true),
  loggedOutAt: timestamp("logged_out_at"),
  loggedOutBy: integer("logged_out_by").references(() => users.id), // Admin who forced logout
  createdAt: timestamp("created_at").defaultNow(),
});

export const scoringBaselines = pgTable("scoring_baselines", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employeeRecords.id),
  employeeCode: varchar("employee_code", { length: 50 }).notNull(),
  
  // Baseline Metrics (calculated from historical data)
  averageAttendanceRate: decimal("avg_attendance_rate", { precision: 5, scale: 2 }),
  averagePunctualityScore: decimal("avg_punctuality_score", { precision: 5, scale: 2 }),
  longestStreak: integer("longest_streak").default(0),
  averageWorkHours: decimal("avg_work_hours", { precision: 4, scale: 2 }),
  
  // Performance Indicators
  consistencyScore: decimal("consistency_score", { precision: 5, scale: 2 }),
  improvementTrend: varchar("improvement_trend", { length: 20 }), // 'improving', 'stable', 'declining'
  
  // Calculation Metadata
  dataStartDate: date("data_start_date").notNull(),
  dataEndDate: date("data_end_date").notNull(),
  recordsAnalyzed: integer("records_analyzed").default(0),
  
  calculatedAt: timestamp("calculated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const attendanceStreakRelations = relations(attendanceStreaks, ({ one }) => ({
  employee: one(employeeRecords, {
    fields: [attendanceStreaks.employeeId],
    references: [employeeRecords.id],
  }),
}));

export const badgeRelations = relations(badges, ({ many }) => ({
  employeeBadges: many(employeeBadges),
}));

export const employeeBadgeRelations = relations(employeeBadges, ({ one }) => ({
  employee: one(employeeRecords, {
    fields: [employeeBadges.employeeId],
    references: [employeeRecords.id],
  }),
  badge: one(badges, {
    fields: [employeeBadges.badgeId],
    references: [badges.id],
  }),
}));

// Announcement management system
export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("general"), // 'general', 'emergency', 'personal', 'work', 'system'
  priority: text("priority").notNull().default("normal"), // 'low', 'normal', 'high', 'emergency'
  targetType: text("target_type").notNull().default("all"), // 'all', 'department', 'group', 'employee'
  targetIds: text("target_ids").array(), // Array of employee IDs, department names, or group names
  targetDepartments: text("target_departments").array(), // Array of department names for department targeting
  isActive: boolean("is_active").notNull().default(true),
  isAutoGenerated: boolean("is_auto_generated").notNull().default(false),
  autoMessageCategory: text("auto_message_category"), // 'streak', 'achievement', 'birthday', 'late_shift', etc.
  displayDuration: integer("display_duration").default(5), // Duration in seconds
  color: text("color").default("text-blue-400"), // Color class for message
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  showFrom: timestamp("show_from").defaultNow(),
  metadata: jsonb("metadata"), // Additional data for auto-generated messages
});

// Recent announcements templates for quick reuse
export const recentAnnouncementTemplates = pgTable("recent_announcement_templates", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("general"),
  priority: text("priority").notNull().default("normal"),
  targetType: text("target_type").notNull().default("all"),
  targetDepartments: text("target_departments").array(),
  displayDuration: integer("display_duration").default(5),
  usageCount: integer("usage_count").default(1), // Track how often this template is used
  createdBy: integer("created_by").references(() => users.id),
  lastUsedAt: timestamp("last_used_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Announcement settings for auto-generated messages
export const announcementSettings = pgTable("announcement_settings", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(), // 'personal', 'work', 'general'
  subcategory: text("subcategory").notNull(), // 'attendance_streak', 'late_shift', 'holiday', etc.
  isEnabled: boolean("is_enabled").notNull().default(true),
  displayDuration: integer("display_duration").default(5),
  color: text("color").default("text-blue-400"),
  template: text("template").notNull(), // Message template with placeholders
  priority: text("priority").notNull().default("normal"),
  updatedBy: integer("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Dashboard profile system for drag-drop layout customization
export const dashboardProfiles = pgTable("dashboard_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(), // Profile name like "My Custom Layout"
  layout: jsonb("layout").notNull(), // Grid layout configuration
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type DashboardProfile = typeof dashboardProfiles.$inferSelect;
export type InsertDashboardProfile = typeof dashboardProfiles.$inferInsert;

// Zod schemas for announcements
export const insertAnnouncementSchema = createInsertSchema(announcements).omit({ id: true, createdAt: true });
export const insertAnnouncementSettingsSchema = createInsertSchema(announcementSettings).omit({ id: true, updatedAt: true });
export const insertRecentAnnouncementTemplateSchema = createInsertSchema(recentAnnouncementTemplates).omit({ 
  id: true, 
  createdAt: true, 
  lastUsedAt: true, 
  usageCount: true 
});

export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
export type InsertAnnouncementSettings = z.infer<typeof insertAnnouncementSettingsSchema>;
export type InsertRecentAnnouncementTemplate = z.infer<typeof insertRecentAnnouncementTemplateSchema>;
export type Announcement = typeof announcements.$inferSelect;
export type AnnouncementSettings = typeof announcementSettings.$inferSelect;
export type RecentAnnouncementTemplate = typeof recentAnnouncementTemplates.$inferSelect;

export const gamificationEventRelations = relations(gamificationEvents, ({ one }) => ({
  employee: one(employeeRecords, {
    fields: [gamificationEvents.employeeId],
    references: [employeeRecords.id],
  }),
}));

// Team management relations
export const teamTemplateRelations = relations(teamTemplates, ({ many, one }) => ({
  teams: many(assembledTeams),
  createdBy: one(users, {
    fields: [teamTemplates.createdBy],
    references: [users.id],
  }),
}));

export const assembledTeamRelations = relations(assembledTeams, ({ many, one }) => ({
  members: many(teamMembers),
  template: one(teamTemplates, {
    fields: [assembledTeams.templateId],
    references: [teamTemplates.id],
  }),
  shift: one(shifts, {
    fields: [assembledTeams.shiftId],
    references: [shifts.id],
  }),
  createdBy: one(users, {
    fields: [assembledTeams.createdBy],
    references: [users.id],
  }),
}));

export const teamMemberRelations = relations(teamMembers, ({ one }) => ({
  team: one(assembledTeams, {
    fields: [teamMembers.teamId],
    references: [assembledTeams.id],
  }),
  employee: one(employeeRecords, {
    fields: [teamMembers.employeeId],
    references: [employeeRecords.id],
  }),
}));

// Scoring system relations
export const scoringRulesRelations = relations(scoringRules, ({ one }) => ({
  creator: one(users, {
    fields: [scoringRules.createdBy],
    references: [users.id],
  }),
}));

export const employeeScoresRelations = relations(employeeScores, ({ one }) => ({
  employee: one(employeeRecords, {
    fields: [employeeScores.employeeId],
    references: [employeeRecords.id],
  }),
}));

export const scoringAuditTrailRelations = relations(scoringAuditTrail, ({ one }) => ({
  employee: one(employeeRecords, {
    fields: [scoringAuditTrail.employeeId],
    references: [employeeRecords.id],
  }),
  performer: one(users, {
    fields: [scoringAuditTrail.performedBy],
    references: [users.id],
  }),
}));

export const scoringConfigurationRelations = relations(scoringConfiguration, ({ one }) => ({
  updater: one(users, {
    fields: [scoringConfiguration.lastUpdatedBy],
    references: [users.id],
  }),
}));

export const scoringBaselinesRelations = relations(scoringBaselines, ({ one }) => ({
  employee: one(employeeRecords, {
    fields: [scoringBaselines.employeeId],
    references: [employeeRecords.id],
  }),
}));

export const systemConfigurationRelations = relations(systemConfiguration, ({ one }) => ({
  updater: one(users, {
    fields: [systemConfiguration.lastUpdatedBy],
    references: [users.id],
  }),
}));



// Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertRolePermissionSchema = createInsertSchema(rolePermissions).omit({
  id: true,
  createdAt: true,
});

export const insertManagerAssignmentSchema = createInsertSchema(managerAssignments).omit({
  id: true,
  assignedAt: true,
});

export const insertEmployeeSchema = createInsertSchema(employeeRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAttendanceSchema = createInsertSchema(attendanceRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDeviceSchema = createInsertSchema(devices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertShiftSchema = createInsertSchema(shifts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertShiftAssignmentSchema = createInsertSchema(shiftAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  timestamp: true,
});

export const insertSettingSchema = createInsertSchema(settings).omit({
  id: true,
  updatedAt: true,
});

export const insertActionRecordSchema = createInsertSchema(actionRecords).omit({
  id: true,
  timestamp: true,
  createdAt: true,
});

export const insertForcedPunchoutSchema = createInsertSchema(forcedPunchouts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTerminateActionSchema = createInsertSchema(terminateActions).omit({
  id: true,
  time: true,
  createdAt: true,
});

export const insertExclusionSchema = createInsertSchema(exclusions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFormerEmployeeSchema = createInsertSchema(formerEmployees).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAttendanceExternalSchema = createInsertSchema(attendanceExternal).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  approvedAt: true,
  syncedAt: true,
});

export const insertAttendanceStreakSchema = createInsertSchema(attendanceStreaks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBadgeSchema = createInsertSchema(badges).omit({
  id: true,
  createdAt: true,
});

export const insertEmployeeBadgeSchema = createInsertSchema(employeeBadges).omit({
  id: true,
  earnedAt: true,
});

export const insertGamificationEventSchema = createInsertSchema(gamificationEvents).omit({
  id: true,
  timestamp: true,
});

export const insertAttendancePolicySettingsSchema = createInsertSchema(attendancePolicySettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastUpdatedAt: true,
});

export const insertEmployeeAlertSchema = createInsertSchema(employeeAlerts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  alertTriggeredAt: true,
  alertResolvedAt: true,
});

export const insertMobileLocationDataSchema = createInsertSchema(mobileLocationData).omit({
  id: true,
  createdAt: true,
  timestamp: true,
  syncedAt: true,
});

export const insertTeamTemplateSchema = createInsertSchema(teamTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAssembledTeamSchema = createInsertSchema(assembledTeams).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;

// Re-export WhatsApp schema
export * from './whatsappSchema';
export type InsertUser = z.infer<typeof insertUserSchema>;

export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;

export type ManagerAssignment = typeof managerAssignments.$inferSelect;
export type InsertManagerAssignment = z.infer<typeof insertManagerAssignmentSchema>;

export type EmployeeRecord = typeof employeeRecords.$inferSelect;
export type InsertEmployeeRecord = z.infer<typeof insertEmployeeSchema>;

export type AttendanceRecord = typeof attendanceRecords.$inferSelect;
export type InsertAttendanceRecord = z.infer<typeof insertAttendanceSchema>;

export type EmployeeAlert = typeof employeeAlerts.$inferSelect;
export type InsertEmployeeAlert = z.infer<typeof insertEmployeeAlertSchema>;

export type MobileLocationData = typeof mobileLocationData.$inferSelect;
export type InsertMobileLocationData = z.infer<typeof insertMobileLocationDataSchema>;

export type Device = typeof devices.$inferSelect;
export type InsertDevice = z.infer<typeof insertDeviceSchema>;

export type Shift = typeof shifts.$inferSelect;
export type InsertShift = z.infer<typeof insertShiftSchema>;

export type ShiftAssignment = typeof shiftAssignments.$inferSelect;
export type InsertShiftAssignment = z.infer<typeof insertShiftAssignmentSchema>;

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

// Team management types
export type TeamTemplate = typeof teamTemplates.$inferSelect;
export type InsertTeamTemplate = z.infer<typeof insertTeamTemplateSchema>;
export type AssembledTeam = typeof assembledTeams.$inferSelect;
export type InsertAssembledTeam = z.infer<typeof insertAssembledTeamSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;

// Gamification types
export type Badge = typeof badges.$inferSelect;
export type InsertBadge = z.infer<typeof insertBadgeSchema>;

export type EmployeeBadge = typeof employeeBadges.$inferSelect;
export type InsertEmployeeBadge = z.infer<typeof insertEmployeeBadgeSchema>;

export type AttendanceStreak = typeof attendanceStreaks.$inferSelect;
export type InsertAttendanceStreak = z.infer<typeof insertAttendanceStreakSchema>;

export type GamificationEvent = typeof gamificationEvents.$inferSelect;
export type InsertGamificationEvent = z.infer<typeof insertGamificationEventSchema>;

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingSchema>;

export type ActionRecord = typeof actionRecords.$inferSelect;
export type InsertActionRecord = z.infer<typeof insertActionRecordSchema>;



export type AttendancePolicySettings = typeof attendancePolicySettings.$inferSelect;
export type InsertAttendancePolicySettings = z.infer<typeof insertAttendancePolicySettingsSchema>;

export const insertDailyAttendanceMetricsSchema = createInsertSchema(dailyAttendanceMetrics).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  calculatedAt: true,
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// Password management schemas
export const passwordResetSchema = z.object({
  username: z.string().min(1, "Username is required"),
  mobileNumber: z.string().min(10, "Valid mobile number is required"),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const firstTimePasswordSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type PasswordResetRequest = z.infer<typeof passwordResetSchema>;
export type PasswordChangeRequest = z.infer<typeof passwordChangeSchema>;
export type FirstTimePasswordRequest = z.infer<typeof firstTimePasswordSchema>;

// Employee Self-Service Features

// Leave Management System
export const leaveTypes = pgTable("leave_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // Annual, Sick, Casual, Maternity, Paternity, etc.
  description: text("description"),
  maxDaysPerYear: integer("max_days_per_year").default(0), // 0 = unlimited
  requiresApproval: boolean("requires_approval").default(true),
  canBeHalfDay: boolean("can_be_half_day").default(true),
  advanceNoticeRequired: integer("advance_notice_required").default(0), // Days
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Leave Requests
export const leaveRequests = pgTable("leave_requests", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employeeRecords.id),
  leaveTypeId: integer("leave_type_id").notNull().references(() => leaveTypes.id),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  isHalfDay: boolean("is_half_day").default(false),
  halfDayPeriod: varchar("half_day_period", { length: 10 }), // 'morning', 'afternoon'
  reason: text("reason").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, approved, rejected, cancelled
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  totalDays: decimal("total_days", { precision: 4, scale: 2 }).notNull(),
  attachments: jsonb("attachments"), // Array of file URLs for medical certificates etc.
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Late Arrival Reasons
export const lateArrivalReasons = pgTable("late_arrival_reasons", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employeeRecords.id),
  attendanceId: integer("attendance_id").references(() => attendanceRecords.id),
  date: date("date").notNull(),
  arrivalTime: time("arrival_time").notNull(),
  expectedTime: time("expected_time").notNull(),
  lateMinutes: integer("late_minutes").notNull(),
  reason: text("reason").notNull(),
  reasonCategory: varchar("reason_category", { length: 50 }), // traffic, transport, personal, medical, family
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, approved, rejected
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Reimbursement Categories
export const reimbursementCategories = pgTable("reimbursement_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // Travel, Medical, Food, Accommodation, Training, etc.
  description: text("description"),
  maxAmount: decimal("max_amount", { precision: 10, scale: 2 }),
  requiresReceipt: boolean("requires_receipt").default(true),
  approvalWorkflow: jsonb("approval_workflow"), // Array of approval levels
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Reimbursement Requests
export const reimbursementRequests = pgTable("reimbursement_requests", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employeeRecords.id),
  categoryId: integer("category_id").notNull().references(() => reimbursementCategories.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  expenseDate: date("expense_date").notNull(),
  receipts: jsonb("receipts"), // Array of receipt file URLs
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, approved, rejected, paid
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  paidAt: timestamp("paid_at"),
  paidBy: integer("paid_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Overtime Requests
export const overtimeRequests = pgTable("overtime_requests", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employeeRecords.id),
  requestDate: date("request_date").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  totalHours: decimal("total_hours", { precision: 4, scale: 2 }).notNull(),
  reason: text("reason").notNull(),
  projectName: text("project_name"),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, approved, rejected
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Shift Change Requests
export const shiftChangeRequests = pgTable("shift_change_requests", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employeeRecords.id),
  currentShiftId: integer("current_shift_id").references(() => shifts.id),
  requestedShiftId: integer("requested_shift_id").references(() => shifts.id),
  swapWithEmployeeId: integer("swap_with_employee_id").references(() => employeeRecords.id),
  requestDate: date("request_date").notNull(),
  effectiveDate: date("effective_date").notNull(),
  reason: text("reason").notNull(),
  isTemporary: boolean("is_temporary").default(false),
  endDate: date("end_date"), // For temporary changes
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, approved, rejected
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Work From Home Requests
export const workFromHomeRequests = pgTable("work_from_home_requests", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employeeRecords.id),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  reason: text("reason").notNull(),
  workPlan: text("work_plan").notNull(), // What they plan to work on
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, approved, rejected
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Training Requests
export const trainingRequests = pgTable("training_requests", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employeeRecords.id),
  trainingTitle: text("training_title").notNull(),
  provider: text("provider"),
  cost: decimal("cost", { precision: 10, scale: 2 }),
  duration: text("duration"), // e.g., "2 days", "1 week"
  justification: text("justification").notNull(),
  expectedOutcome: text("expected_outcome"),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, approved, rejected, completed
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Document Requests
export const documentRequests = pgTable("document_requests", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employeeRecords.id),
  documentType: varchar("document_type", { length: 50 }).notNull(), // salary_certificate, employment_letter, experience_certificate, etc.
  purpose: text("purpose").notNull(),
  additionalInfo: text("additional_info"),
  urgency: varchar("urgency", { length: 20 }).notNull().default("normal"), // low, normal, high, urgent
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, processing, ready, delivered
  processedBy: integer("processed_by").references(() => users.id),
  processedAt: timestamp("processed_at"),
  documentUrl: text("document_url"), // URL to generated document
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Grievance System
export const grievances = pgTable("grievances", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employeeRecords.id), // Nullable for anonymous complaints
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 50 }).notNull(), // harassment, discrimination, workplace_safety, management, etc.
  priority: varchar("priority", { length: 20 }).notNull().default("medium"), // low, medium, high, critical
  isAnonymous: boolean("is_anonymous").default(false),
  status: varchar("status", { length: 20 }).notNull().default("submitted"), // submitted, under_review, resolved, closed
  assignedTo: integer("assigned_to").references(() => users.id),
  assignedAt: timestamp("assigned_at"),
  resolution: text("resolution"),
  resolvedBy: integer("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});



// Custom Polling Queue System
export const pollingQueue = pgTable("polling_queue", {
  id: serial("id").primaryKey(),
  requestType: varchar("request_type", { length: 50 }).notNull(), // 'date_range', 'missing_data', 'manual_repoll'
  targetDate: date("target_date").notNull(),
  endDate: date("end_date"), // For date range requests
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, processing, completed, failed
  priority: integer("priority").default(1), // 1=highest, 5=lowest
  requestedBy: integer("requested_by").references(() => users.id),
  requestedAt: timestamp("requested_at").defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  errorMessage: text("error_message"),
  recordsProcessed: integer("records_processed").default(0),
  totalRecords: integer("total_records").default(0),
  progressPercentage: decimal("progress_percentage", { precision: 5, scale: 2 }).default('0.00'),
  metadata: jsonb("metadata"), // Additional request details
});

// Polling Queue Results
export const pollingQueueResults = pgTable("polling_queue_results", {
  id: serial("id").primaryKey(),
  queueId: integer("queue_id").notNull().references(() => pollingQueue.id),
  resultType: varchar("result_type", { length: 50 }).notNull(), // 'success', 'partial', 'error'
  dataCount: integer("data_count").default(0),
  errorDetails: text("error_details"),
  processingTime: integer("processing_time"), // milliseconds
  createdAt: timestamp("created_at").defaultNow(),
});

// In-Memory Employee Cache
export const employeeCache = pgTable("employee_cache", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employeeRecords.id),
  employeeCode: varchar("employee_code", { length: 20 }).notNull(),
  fullName: text("full_name").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  department: text("department"),
  designation: text("designation"),
  shiftId: integer("shift_id").references(() => shifts.id),
  isActive: boolean("is_active").default(true),
  lastUpdated: timestamp("last_updated").defaultNow(),
  searchVector: text("search_vector"), // For fast text search
});

// Employee Self-Service Settings
export const employeeServiceSettings = pgTable("employee_service_settings", {
  id: serial("id").primaryKey(),
  // Leave Management Settings
  maxLeaveDaysPerRequest: integer("max_leave_days_per_request").default(30),
  minAdvanceNotice: integer("min_advance_notice").default(1), // Days
  enableHalfDayLeave: boolean("enable_half_day_leave").default(true),
  autoApprovalThreshold: integer("auto_approval_threshold").default(0), // Days - 0 means no auto-approval
  
  // Reimbursement Settings
  maxReimbursementAmount: decimal("max_reimbursement_amount", { precision: 10, scale: 2 }).default('50000.00'),
  enableReceiptUpload: boolean("enable_receipt_upload").default(true),
  
  // Overtime Settings
  maxOvertimeHoursPerDay: decimal("max_overtime_hours_per_day", { precision: 4, scale: 2 }).default('4.00'),
  overtimeApprovalRequired: boolean("overtime_approval_required").default(true),
  
  // Work From Home Settings
  enableWorkFromHome: boolean("enable_work_from_home").default(true),
  maxWfhDaysPerMonth: integer("max_wfh_days_per_month").default(10),
  
  // General Settings
  enableEmployeePortal: boolean("enable_employee_portal").default(true),
  enableNotifications: boolean("enable_notifications").default(true),
  
  updatedBy: integer("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Internal Messaging System for Request Communication
export const messageThreads = pgTable("message_threads", {
  id: serial("id").primaryKey(),
  subject: text("subject").notNull(),
  threadType: varchar("thread_type", { length: 30 }).notNull().default("general"), // general, leave_request, overtime_request, etc.
  relatedRequestId: integer("related_request_id"), // Generic ID for any request type
  relatedRequestType: varchar("related_request_type", { length: 50 }), // leave_request, overtime_request, reimbursement_request, etc.
  participants: jsonb("participants").notNull(), // Array of user IDs
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  threadId: integer("thread_id").references(() => messageThreads.id).notNull(),
  senderId: integer("sender_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  messageType: varchar("message_type", { length: 20 }).notNull().default("text"), // text, system, status_update, attachment
  attachmentUrl: text("attachment_url"),
  attachmentType: varchar("attachment_type", { length: 20 }), // document, image, file
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Request Activity Log for tracking all actions on requests
export const requestActivityLog = pgTable("request_activity_log", {
  id: serial("id").primaryKey(),
  requestType: varchar("request_type", { length: 50 }).notNull(), // leave_request, overtime_request, etc.
  requestId: integer("request_id").notNull(),
  employeeId: integer("employee_id").references(() => employeeRecords.id).notNull(),
  actorId: integer("actor_id").references(() => users.id).notNull(), // Who performed the action
  action: varchar("action", { length: 50 }).notNull(), // submitted, approved, rejected, modified, commented, etc.
  oldStatus: varchar("old_status", { length: 20 }),
  newStatus: varchar("new_status", { length: 20 }),
  comment: text("comment"),
  metadata: jsonb("metadata"), // Additional context data
  createdAt: timestamp("created_at").defaultNow(),
});

// Notification System for Request Updates
export const requestNotifications = pgTable("request_notifications", {
  id: serial("id").primaryKey(),
  recipientId: integer("recipient_id").references(() => users.id).notNull(),
  senderId: integer("sender_id").references(() => users.id),
  notificationType: varchar("notification_type", { length: 50 }).notNull(), // request_submitted, request_approved, request_rejected, etc.
  title: text("title").notNull(),
  message: text("message").notNull(),
  relatedRequestType: varchar("related_request_type", { length: 50 }),
  relatedRequestId: integer("related_request_id"),
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Employee Self-Service Insert Schemas
export const insertLeaveTypeSchema = createInsertSchema(leaveTypes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLeaveRequestSchema = createInsertSchema(leaveRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  approvedAt: true,
});

export const insertLateArrivalReasonSchema = createInsertSchema(lateArrivalReasons).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  approvedAt: true,
});

export const insertReimbursementCategorySchema = createInsertSchema(reimbursementCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReimbursementRequestSchema = createInsertSchema(reimbursementRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  approvedAt: true,
  paidAt: true,
});

export const insertOvertimeRequestSchema = createInsertSchema(overtimeRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  approvedAt: true,
});

export const insertShiftChangeRequestSchema = createInsertSchema(shiftChangeRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  approvedAt: true,
});

export const insertWorkFromHomeRequestSchema = createInsertSchema(workFromHomeRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  approvedAt: true,
});

export const insertTrainingRequestSchema = createInsertSchema(trainingRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  approvedAt: true,
  completedAt: true,
});

export const insertDocumentRequestSchema = createInsertSchema(documentRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  processedAt: true,
});

export const insertGrievanceSchema = createInsertSchema(grievances).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  assignedAt: true,
  resolvedAt: true,
});



export const insertEmployeeServiceSettingsSchema = createInsertSchema(employeeServiceSettings).omit({
  id: true,
  updatedAt: true,
});

export const insertMessageThreadSchema = createInsertSchema(messageThreads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
  readAt: true,
});

export const insertRequestActivityLogSchema = createInsertSchema(requestActivityLog).omit({
  id: true,
  createdAt: true,
});

export const insertRequestNotificationSchema = createInsertSchema(requestNotifications).omit({
  id: true,
  createdAt: true,
  readAt: true,
});

// Employee Self-Service Types
export type LeaveType = typeof leaveTypes.$inferSelect;
export type InsertLeaveType = z.infer<typeof insertLeaveTypeSchema>;

export type LeaveRequest = typeof leaveRequests.$inferSelect;
export type InsertLeaveRequest = z.infer<typeof insertLeaveRequestSchema>;

export type LateArrivalReason = typeof lateArrivalReasons.$inferSelect;
export type InsertLateArrivalReason = z.infer<typeof insertLateArrivalReasonSchema>;

export type ReimbursementCategory = typeof reimbursementCategories.$inferSelect;
export type InsertReimbursementCategory = z.infer<typeof insertReimbursementCategorySchema>;

export type ReimbursementRequest = typeof reimbursementRequests.$inferSelect;
export type InsertReimbursementRequest = z.infer<typeof insertReimbursementRequestSchema>;

export type OvertimeRequest = typeof overtimeRequests.$inferSelect;
export type InsertOvertimeRequest = z.infer<typeof insertOvertimeRequestSchema>;

export type ShiftChangeRequest = typeof shiftChangeRequests.$inferSelect;
export type InsertShiftChangeRequest = z.infer<typeof insertShiftChangeRequestSchema>;

export type WorkFromHomeRequest = typeof workFromHomeRequests.$inferSelect;
export type InsertWorkFromHomeRequest = z.infer<typeof insertWorkFromHomeRequestSchema>;

export type TrainingRequest = typeof trainingRequests.$inferSelect;
export type InsertTrainingRequest = z.infer<typeof insertTrainingRequestSchema>;

export type DocumentRequest = typeof documentRequests.$inferSelect;
export type InsertDocumentRequest = z.infer<typeof insertDocumentRequestSchema>;

export type Grievance = typeof grievances.$inferSelect;
export type InsertGrievance = z.infer<typeof insertGrievanceSchema>;

export type EmployeeServiceSettings = typeof employeeServiceSettings.$inferSelect;
export type InsertEmployeeServiceSettings = z.infer<typeof insertEmployeeServiceSettingsSchema>;
export type ForcedPunchout = typeof forcedPunchouts.$inferSelect;
export type InsertForcedPunchout = z.infer<typeof insertForcedPunchoutSchema>;
export type TerminateAction = typeof terminateActions.$inferSelect;
export type InsertTerminateAction = z.infer<typeof insertTerminateActionSchema>;
export type Exclusion = typeof exclusions.$inferSelect;
export type InsertExclusion = z.infer<typeof insertExclusionSchema>;
export type FormerEmployee = typeof formerEmployees.$inferSelect;
export type InsertFormerEmployee = z.infer<typeof insertFormerEmployeeSchema>;
export type AttendanceExternal = typeof attendanceExternal.$inferSelect;
export type InsertAttendanceExternal = z.infer<typeof insertAttendanceExternalSchema>;

export type DailyAttendanceMetrics = typeof dailyAttendanceMetrics.$inferSelect;
export type InsertDailyAttendanceMetrics = z.infer<typeof insertDailyAttendanceMetricsSchema>;
export type LoginCredentials = z.infer<typeof loginSchema>;

// Dummy data tracking table
export const dummyDataTracking = pgTable("dummy_data_tracking", {
  id: serial("id").primaryKey(),
  tableName: varchar("table_name").notNull(),
  recordId: integer("record_id").notNull(),
  fieldName: varchar("field_name"),
  description: text("description"),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
});

export const insertDummyDataTrackingSchema = createInsertSchema(dummyDataTracking).omit({
  id: true,
  createdAt: true,
});

export type DummyDataTracking = typeof dummyDataTracking.$inferSelect;
export type InsertDummyDataTracking = z.infer<typeof insertDummyDataTrackingSchema>;

// Penalty and Grace Period Settings
export const penaltySettings = pgTable("penalty_settings", {
  id: serial("id").primaryKey(),
  settingName: varchar("setting_name", { length: 100 }).notNull().unique(),
  
  // Grace Period Settings
  gracePeriodMinutes: integer("grace_period_minutes").default(30),
  gracePeriodAppliesTo: varchar("grace_period_applies_to", { length: 20 }).default("arrival"), // 'arrival', 'departure', 'both'
  
  // Late Arrival Penalty Structure
  lateArrivalCategory1Name: varchar("late_arrival_category1_name", { length: 50 }).default("Late Arrival"),
  lateArrivalCategory1MinStart: integer("late_arrival_category1_min_start").default(31),
  lateArrivalCategory1MinEnd: integer("late_arrival_category1_min_end").default(60),
  lateArrivalCategory1FirstOccurrence: varchar("late_arrival_category1_first_occurrence", { length: 50 }).default("verbal_warning"),
  lateArrivalCategory1SecondOccurrence: numeric("late_arrival_category1_second_occurrence", { precision: 4, scale: 1 }).default("0.5"),
  lateArrivalCategory1ThirdOccurrence: numeric("late_arrival_category1_third_occurrence", { precision: 4, scale: 1 }).default("1.0"),
  
  lateArrivalCategory2Name: varchar("late_arrival_category2_name", { length: 50 }).default("Significant Delay"),
  lateArrivalCategory2MinStart: integer("late_arrival_category2_min_start").default(61),
  lateArrivalCategory2MinEnd: integer("late_arrival_category2_min_end").default(120),
  lateArrivalCategory2FirstOccurrence: numeric("late_arrival_category2_first_occurrence", { precision: 4, scale: 1 }).default("1.0"),
  lateArrivalCategory2SecondOccurrence: numeric("late_arrival_category2_second_occurrence", { precision: 4, scale: 1 }).default("2.0"),
  lateArrivalCategory2ThirdOccurrence: numeric("late_arrival_category2_third_occurrence", { precision: 4, scale: 1 }).default("3.0"),
  
  lateArrivalCategory3Name: varchar("late_arrival_category3_name", { length: 50 }).default("Extended Delay"),
  lateArrivalCategory3MinStart: integer("late_arrival_category3_min_start").default(121),
  lateArrivalCategory3MinEnd: integer("late_arrival_category3_min_end"), // null means no upper limit
  lateArrivalCategory3Treatment: varchar("late_arrival_category3_treatment", { length: 50 }).default("half_day_absence"),
  
  // Early Checkout Penalty
  earlyCheckoutPenaltyPercentage: numeric("early_checkout_penalty_percentage", { precision: 5, scale: 2 }).default("30.00"), // 30% more than standard hourly rate
  earlyCheckoutMinimumMinutes: integer("early_checkout_minimum_minutes").default(15), // Minimum minutes early to trigger penalty
  
  // Missed Punchout Penalty
  missedPunchoutPenaltyHours: numeric("missed_punchout_penalty_hours", { precision: 4, scale: 1 }).default("1.0"),
  missedPunchoutGracePeriodHours: integer("missed_punchout_grace_period_hours").default(1), // Allow 1 hour grace for forgotten punchouts
  
  // Monthly Reset Settings
  monthlyResetEnabled: boolean("monthly_reset_enabled").default(true),
  monthlyResetDay: integer("monthly_reset_day").default(1), // 1st day of month
  
  // First-time Courtesy Settings
  firstTimeCourtesyEnabled: boolean("first_time_courtesy_enabled").default(true),
  firstTimeCourtesyType: varchar("first_time_courtesy_type", { length: 30 }).default("verbal_reminder"),
  
  // Mitigation Factors
  mitigationFactorsEnabled: boolean("mitigation_factors_enabled").default(true),
  
  // System Fields
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
  updatedBy: integer("updated_by").references(() => users.id),
});

// Employee Penalty Tracking (Monthly)
export const employeePenaltyTracking = pgTable("employee_penalty_tracking", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employeeRecords.id).notNull(),
  employeeCode: varchar("employee_code", { length: 20 }).notNull(),
  
  // Time Period
  year: integer("year").notNull(),
  month: integer("month").notNull(), // 1-12
  
  // Late Arrival Counts
  lateArrivalCategory1Count: integer("late_arrival_category1_count").default(0),
  lateArrivalCategory2Count: integer("late_arrival_category2_count").default(0),
  lateArrivalCategory3Count: integer("late_arrival_category3_count").default(0),
  
  // Early Checkout Counts
  earlyCheckoutCount: integer("early_checkout_count").default(0),
  
  // Missed Punchout Counts
  missedPunchoutCount: integer("missed_punchout_count").default(0),
  
  // Total Penalty Hours
  totalPenaltyHours: numeric("total_penalty_hours", { precision: 8, scale: 2 }).default("0.00"),
  
  // First-time Courtesy Used
  firstTimeCourtesyUsed: boolean("first_time_courtesy_used").default(false),
  
  // System Fields
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  lastCalculatedAt: timestamp("last_calculated_at"),
});

// Penalty Incident Log
export const penaltyIncidents = pgTable("penalty_incidents", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employeeRecords.id).notNull(),
  employeeCode: varchar("employee_code", { length: 20 }).notNull(),
  attendanceRecordId: integer("attendance_record_id").references(() => attendanceRecords.id),
  
  // Incident Details
  incidentDate: date("incident_date").notNull(),
  incidentType: varchar("incident_type", { length: 30 }).notNull(), // 'late_arrival', 'early_checkout', 'missed_punchout'
  incidentCategory: varchar("incident_category", { length: 50 }), // 'Late Arrival', 'Significant Delay', 'Extended Delay'
  
  // Timing Details
  scheduledTime: time("scheduled_time"),
  actualTime: time("actual_time"),
  minutesLate: integer("minutes_late"), // For late arrivals
  minutesEarly: integer("minutes_early"), // For early checkouts
  
  // Penalty Applied
  penaltyApplied: boolean("penalty_applied").default(false),
  penaltyType: varchar("penalty_type", { length: 30 }), // 'verbal_warning', 'wage_deduction', 'half_day_absence'
  penaltyHours: numeric("penalty_hours", { precision: 4, scale: 1 }).default("0.0"),
  penaltyAmount: numeric("penalty_amount", { precision: 10, scale: 2 }),
  
  // Monthly Count Context
  monthlyOccurrenceNumber: integer("monthly_occurrence_number").default(1),
  
  // Mitigation
  mitigationApplied: boolean("mitigation_applied").default(false),
  mitigationReason: text("mitigation_reason"),
  mitigationApprovedBy: integer("mitigation_approved_by").references(() => users.id),
  
  // System Fields
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  processedAt: timestamp("processed_at"),
  processedBy: integer("processed_by").references(() => users.id),
});

// Insert schemas
export const insertPenaltySettingsSchema = createInsertSchema(penaltySettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmployeePenaltyTrackingSchema = createInsertSchema(employeePenaltyTracking).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastCalculatedAt: true,
});

export const insertPenaltyIncidentsSchema = createInsertSchema(penaltyIncidents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  processedAt: true,
});

// Types
export type PenaltySettings = typeof penaltySettings.$inferSelect;
export type InsertPenaltySettings = z.infer<typeof insertPenaltySettingsSchema>;
export type EmployeePenaltyTracking = typeof employeePenaltyTracking.$inferSelect;
export type InsertEmployeePenaltyTracking = z.infer<typeof insertEmployeePenaltyTrackingSchema>;
export type PenaltyIncident = typeof penaltyIncidents.$inferSelect;
export type InsertPenaltyIncident = z.infer<typeof insertPenaltyIncidentsSchema>;

// WhatsApp Contact Management System
export const whatsappContacts = pgTable("whatsapp_contacts", {
  id: serial("id").primaryKey(),
  phoneNumber: varchar("phone_number", { length: 20 }).notNull().unique(),
  formattedPhone: varchar("formatted_phone", { length: 25 }).notNull(), // Without + for API
  contactName: varchar("contact_name", { length: 100 }).notNull(),
  
  // Employee Association
  employeeId: integer("employee_id").references(() => employeeRecords.id),
  employeeCode: varchar("employee_code", { length: 50 }),
  
  // Contact Details
  department: varchar("department", { length: 100 }),
  designation: varchar("designation", { length: 100 }),
  contactType: varchar("contact_type", { length: 20 }).notNull().default('employee'), // 'employee', 'external', 'vendor', 'client'
  
  // Admin Isolation - Critical for data separation
  createdByUserId: integer("created_by_user_id").references(() => users.id).notNull(),
  managedByUserIds: integer("managed_by_user_ids").array(), // Array of user IDs who can see this contact
  departmentAccess: text("department_access").array(), // Array of departments this contact is visible to
  accessLevel: varchar("access_level", { length: 20 }).notNull().default('department'), // 'personal', 'department', 'company'
  
  // Status
  isActive: boolean("is_active").notNull().default(true),
  isBlocked: boolean("is_blocked").notNull().default(false),
  
  // Last Activity
  lastMessageAt: timestamp("last_message_at"),
  lastSeenAt: timestamp("last_seen_at"),
  
  // Metadata
  notes: text("notes"),
  tags: text("tags").array(), // Array of tags for organization
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// WhatsApp Groups Management
export const whatsappGroups = pgTable("whatsapp_groups", {
  id: serial("id").primaryKey(),
  groupName: varchar("group_name", { length: 100 }).notNull(),
  groupDescription: text("group_description"),
  groupType: varchar("group_type", { length: 30 }).notNull(), // 'department', 'project', 'custom', 'system'
  
  // Group Configuration
  departmentId: integer("department_id"), // Link to department if department type
  departmentName: varchar("department_name", { length: 100 }),
  projectCode: varchar("project_code", { length: 50 }),
  
  // Admin Isolation - Critical for data separation
  createdByUserId: integer("created_by_user_id").references(() => users.id).notNull(),
  managedByUserIds: integer("managed_by_user_ids").array(), // Array of user IDs who can manage this group
  visibleToUserIds: integer("visible_to_user_ids").array(), // Array of user IDs who can see this group
  accessLevel: varchar("access_level", { length: 20 }).notNull().default('department'), // 'personal', 'department', 'company'
  
  // Group Settings
  isActive: boolean("is_active").notNull().default(true),
  autoAddEmployees: boolean("auto_add_employees").notNull().default(false), // Auto-add employees from department
  maxMembers: integer("max_members").default(250),
  
  // Activity Tracking
  lastMessageAt: timestamp("last_message_at"),
  memberCount: integer("member_count").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// WhatsApp Group Members
export const whatsappGroupMembers = pgTable("whatsapp_group_members", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").references(() => whatsappGroups.id, { onDelete: "cascade" }).notNull(),
  contactId: integer("contact_id").references(() => whatsappContacts.id, { onDelete: "cascade" }).notNull(),
  phoneNumber: varchar("phone_number", { length: 20 }).notNull(),
  
  // Member Role in Group
  memberRole: varchar("member_role", { length: 20 }).notNull().default('member'), // 'admin', 'member', 'readonly'
  
  // Member Status
  isActive: boolean("is_active").notNull().default(true),
  joinedAt: timestamp("joined_at").defaultNow(),
  leftAt: timestamp("left_at"),
  
  // Admin who added/removed
  addedByUserId: integer("added_by_user_id").references(() => users.id),
  removedByUserId: integer("removed_by_user_id").references(() => users.id),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Enhanced WhatsApp Messages with Admin Isolation and Delivery Tracking
export const whatsappMessages = pgTable("whatsapp_messages", {
  id: serial("id").primaryKey(),
  wamNum: serial("wam_num").unique(), // WAMNum - Sequential WhatsApp Message Number starting from 1
  messageId: varchar("message_id", { length: 100 }).unique(), // WhatsApp API message ID
  
  // Message Details
  fromNumber: varchar("from_number", { length: 20 }).notNull(),
  toNumber: varchar("to_number", { length: 20 }).notNull(),
  messageType: varchar("message_type", { length: 20 }).notNull(), // 'incoming', 'outgoing'
  messageContent: text("message_content").notNull(),
  
  // Group Context
  groupId: integer("group_id").references(() => whatsappGroups.id),
  contactId: integer("contact_id").references(() => whatsappContacts.id),
  
  // Admin Isolation - Critical for data separation
  sentByUserId: integer("sent_by_user_id").references(() => users.id),
  visibleToUserIds: integer("visible_to_user_ids").array(), // Array of user IDs who can see this message
  departmentAccess: text("department_access").array(), // Array of departments that can see this message
  
  // Enhanced Message Status with WhatsApp-like tracking
  messageStatus: varchar("message_status", { length: 20 }).notNull().default('pending'), // 'pending', 'sent', 'delivered', 'read', 'failed'
  
  // Detailed Delivery Timestamps - WhatsApp-like precision
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  readAt: timestamp("read_at"),
  failedAt: timestamp("failed_at"),
  
  // Delivery Status Details
  deliveryAttempts: integer("delivery_attempts").default(0),
  lastDeliveryAttempt: timestamp("last_delivery_attempt"),
  deliveryStatusDetails: jsonb("delivery_status_details"), // Store webhook payload details
  
  // Gateway/API Response
  gatewayResponse: jsonb("gateway_response"),
  errorDetails: text("error_details"),
  retryCount: integer("retry_count").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// WhatsApp Onboarding Schema exports
export const insertWhatsappOnboardingRequestSchema = createInsertSchema(whatsappOnboardingRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWhatsappMessageLogSchema = createInsertSchema(whatsappMessageLog).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWhatsappOnboardingConfigSchema = createInsertSchema(whatsappOnboardingConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// New WhatsApp Management System Schemas
export const insertWhatsappContactsSchema = createInsertSchema(whatsappContacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWhatsappGroupsSchema = createInsertSchema(whatsappGroups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWhatsappGroupMembersSchema = createInsertSchema(whatsappGroupMembers).omit({
  id: true,
  createdAt: true,
});

export const insertWhatsappMessagesSchema = createInsertSchema(whatsappMessages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// New WhatsApp Management System Types
export type WhatsAppContact = typeof whatsappContacts.$inferSelect;
export type InsertWhatsAppContact = z.infer<typeof insertWhatsappContactsSchema>;
export type WhatsAppGroup = typeof whatsappGroups.$inferSelect;
export type InsertWhatsAppGroup = z.infer<typeof insertWhatsappGroupsSchema>;
export type WhatsAppGroupMember = typeof whatsappGroupMembers.$inferSelect;
export type InsertWhatsAppGroupMember = z.infer<typeof insertWhatsappGroupMembersSchema>;
export type WhatsAppMessage = typeof whatsappMessages.$inferSelect;
export type InsertWhatsAppMessage = z.infer<typeof insertWhatsappMessagesSchema>;

export const insertWhatsappOnboardingStatsSchema = createInsertSchema(whatsappOnboardingStats).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// WhatsApp Onboarding Types
export type WhatsappOnboardingRequest = typeof whatsappOnboardingRequests.$inferSelect;
export type WhatsappMessageLog = typeof whatsappMessageLog.$inferSelect;
export type WhatsappOnboardingConfig = typeof whatsappOnboardingConfig.$inferSelect;
export type WhatsappOnboardingStats = typeof whatsappOnboardingStats.$inferSelect;

export type InsertWhatsappOnboardingRequest = z.infer<typeof insertWhatsappOnboardingRequestSchema>;
export type InsertWhatsappMessageLog = z.infer<typeof insertWhatsappMessageLogSchema>;
export type InsertWhatsappOnboardingConfig = z.infer<typeof insertWhatsappOnboardingConfigSchema>;
export type InsertWhatsappOnboardingStats = z.infer<typeof insertWhatsappOnboardingStatsSchema>;

// Scoring system insert schemas
export const insertScoringRuleSchema = createInsertSchema(scoringRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmployeeScoreSchema = createInsertSchema(employeeScores).omit({
  id: true,
  calculatedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertScoringAuditTrailSchema = createInsertSchema(scoringAuditTrail).omit({
  id: true,
  createdAt: true,
});

export const insertScoringConfigurationSchema = createInsertSchema(scoringConfiguration).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertScoringBaselinesSchema = createInsertSchema(scoringBaselines).omit({
  id: true,
  calculatedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSystemConfigurationSchema = createInsertSchema(systemConfiguration).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDeviceSessionSchema = createInsertSchema(deviceSessions).omit({
  id: true,
  createdAt: true,
  loginTime: true,
  lastActivity: true,
});

// Scoring system types
export type ScoringRule = typeof scoringRules.$inferSelect;
export type InsertScoringRule = z.infer<typeof insertScoringRuleSchema>;
export type EmployeeScore = typeof employeeScores.$inferSelect;
export type InsertEmployeeScore = z.infer<typeof insertEmployeeScoreSchema>;
export type ScoringAuditTrail = typeof scoringAuditTrail.$inferSelect;
export type InsertScoringAuditTrail = z.infer<typeof insertScoringAuditTrailSchema>;
export type ScoringConfiguration = typeof scoringConfiguration.$inferSelect;
export type InsertScoringConfiguration = z.infer<typeof insertScoringConfigurationSchema>;
export type ScoringBaselines = typeof scoringBaselines.$inferSelect;
export type InsertScoringBaselines = z.infer<typeof insertScoringBaselinesSchema>;
export type SystemConfiguration = typeof systemConfiguration.$inferSelect;
export type InsertSystemConfiguration = z.infer<typeof insertSystemConfigurationSchema>;

export type DeviceSession = typeof deviceSessions.$inferSelect;
export type InsertDeviceSession = z.infer<typeof insertDeviceSessionSchema>;

// Employee Status Tracking System (8-Status)
export const employeeStatusTracking = pgTable("employee_status_tracking", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employeeRecords.id).notNull(),
  employeeCode: varchar("employee_code", { length: 20 }).notNull(),
  
  // Current Status
  currentStatus: text("current_status").notNull(), // 'available', 'on_field', 'in_transit', 'remote_work', 'break_lunch', 'off_duty', 'overtime', 'unauthorized_location'
  previousStatus: text("previous_status"),
  
  // Status Change Details
  statusSetBy: text("status_set_by").notNull(), // 'automatic', 'manual', 'biometric', 'geofence'
  statusSetReason: text("status_set_reason"), // Reason for status change
  statusConfidence: numeric("status_confidence", { precision: 5, scale: 2 }).default("0.0"), // 0-100% confidence score
  
  // Location Information
  currentLatitude: numeric("current_latitude", { precision: 10, scale: 7 }),
  currentLongitude: numeric("current_longitude", { precision: 10, scale: 7 }),
  locationAccuracy: numeric("location_accuracy", { precision: 8, scale: 2 }), // GPS accuracy in meters
  locationAddress: text("location_address"),
  
  // Biometric Verification
  biometricVerified: boolean("biometric_verified").default(false),
  biometricTimestamp: timestamp("biometric_timestamp"),
  biometricType: text("biometric_type"), // 'face', 'fingerprint', 'iris'
  biometricConfidence: numeric("biometric_confidence", { precision: 5, scale: 2 }),
  
  // Geofence Information
  geofenceZone: text("geofence_zone"), // 'office', 'home', 'field_site', 'unknown'
  geofenceDistance: numeric("geofence_distance", { precision: 8, scale: 2 }), // Distance from geofence center in meters
  insideGeofence: boolean("inside_geofence").default(false),
  
  // Timestamps
  statusStartTime: timestamp("status_start_time").defaultNow(),
  statusEndTime: timestamp("status_end_time"),
  lastLocationUpdate: timestamp("last_location_update"),
  
  // Audit Trail
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
  updatedBy: integer("updated_by").references(() => users.id),
});

// Employee Status History
export const employeeStatusHistory = pgTable("employee_status_history", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employeeRecords.id).notNull(),
  employeeCode: varchar("employee_code", { length: 20 }).notNull(),
  
  // Status Change Details
  fromStatus: text("from_status"),
  toStatus: text("to_status").notNull(),
  statusDuration: integer("status_duration"), // Duration in minutes
  
  // Change Context
  changeReason: text("change_reason").notNull(),
  changeMethod: text("change_method").notNull(), // 'automatic', 'manual', 'biometric', 'geofence', 'time_based'
  confidenceScore: numeric("confidence_score", { precision: 5, scale: 2 }),
  
  // Location at Change
  changeLatitude: numeric("change_latitude", { precision: 10, scale: 7 }),
  changeLongitude: numeric("change_longitude", { precision: 10, scale: 7 }),
  changeAddress: text("change_address"),
  
  // Biometric Data
  biometricVerified: boolean("biometric_verified").default(false),
  biometricType: text("biometric_type"),
  biometricConfidence: numeric("biometric_confidence", { precision: 5, scale: 2 }),
  
  // Timestamps
  changeTimestamp: timestamp("change_timestamp").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  changedBy: integer("changed_by").references(() => users.id),
});

// Employee Status Geofences
export const employeeStatusGeofences = pgTable("employee_status_geofences", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employeeRecords.id).notNull(),
  employeeCode: varchar("employee_code", { length: 20 }).notNull(),
  
  // Geofence Definition
  geofenceName: text("geofence_name").notNull(),
  geofenceType: text("geofence_type").notNull(), // 'home', 'office', 'field_site', 'custom'
  centerLatitude: numeric("center_latitude", { precision: 10, scale: 7 }).notNull(),
  centerLongitude: numeric("center_longitude", { precision: 10, scale: 7 }).notNull(),
  radiusMeters: integer("radius_meters").notNull().default(200),
  
  // Geofence Configuration
  isActive: boolean("is_active").notNull().default(true),
  allowedStatuses: text("allowed_statuses").array(), // Array of statuses allowed in this geofence
  autoStatusChange: boolean("auto_status_change").default(false),
  targetStatus: text("target_status"), // Status to change to when entering geofence
  
  // Validation Settings
  requireBiometric: boolean("require_biometric").default(false),
  minimumDwellTime: integer("minimum_dwell_time").default(30), // Seconds
  confidenceThreshold: numeric("confidence_threshold", { precision: 5, scale: 2 }).default("80.0"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
  updatedBy: integer("updated_by").references(() => users.id),
});

// Employee Status Alerts
export const employeeStatusAlerts = pgTable("employee_status_alerts", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employeeRecords.id).notNull(),
  employeeCode: varchar("employee_code", { length: 20 }).notNull(),
  
  // Alert Details
  alertType: text("alert_type").notNull(), // 'unauthorized_location', 'status_timeout', 'biometric_failed', 'geofence_violation', 'suspicious_activity'
  alertSeverity: text("alert_severity").notNull(), // 'critical', 'high', 'medium', 'low'
  alertStatus: text("alert_status").notNull().default('active'), // 'active', 'acknowledged', 'resolved', 'dismissed'
  
  // Alert Context
  currentStatus: text("current_status").notNull(),
  alertMessage: text("alert_message").notNull(),
  alertDetails: jsonb("alert_details"), // Additional alert context
  
  // Location Information
  alertLatitude: numeric("alert_latitude", { precision: 10, scale: 7 }),
  alertLongitude: numeric("alert_longitude", { precision: 10, scale: 7 }),
  alertAddress: text("alert_address"),
  
  // Resolution
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: integer("resolved_by").references(() => users.id),
  resolutionNotes: text("resolution_notes"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  acknowledgedAt: timestamp("acknowledged_at"),
  acknowledgedBy: integer("acknowledged_by").references(() => users.id),
});

// Employee Status Violations
export const employeeStatusViolations = pgTable("employee_status_violations", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employeeRecords.id).notNull(),
  employeeCode: varchar("employee_code", { length: 20 }).notNull(),
  
  // Violation Details
  violationType: text("violation_type").notNull(), // 'unauthorized_location', 'geofence_breach', 'status_timeout', 'biometric_failed', 'invalid_punch', 'location_mismatch'
  violationSeverity: text("violation_severity").notNull(), // 'critical', 'high', 'medium', 'low'
  violationStatus: text("violation_status").notNull().default('pending'), // 'pending', 'approved', 'rejected', 'resolved'
  
  // Violation Context
  currentStatus: text("current_status").notNull(),
  expectedStatus: text("expected_status"),
  violationMessage: text("violation_message").notNull(),
  violationDetails: jsonb("violation_details"), // Additional violation context
  
  // Location Information
  violationLatitude: numeric("violation_latitude", { precision: 10, scale: 7 }),
  violationLongitude: numeric("violation_longitude", { precision: 10, scale: 7 }),
  violationAddress: text("violation_address"),
  expectedLatitude: numeric("expected_latitude", { precision: 10, scale: 7 }),
  expectedLongitude: numeric("expected_longitude", { precision: 10, scale: 7 }),
  distanceFromExpected: numeric("distance_from_expected", { precision: 10, scale: 2 }), // Distance in meters
  
  // Biometric Information
  biometricData: jsonb("biometric_data"), // Biometric attempt details
  biometricScore: numeric("biometric_score", { precision: 5, scale: 2 }),
  biometricThreshold: numeric("biometric_threshold", { precision: 5, scale: 2 }),
  
  // Manager Review
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  managerDecision: text("manager_decision"), // 'approve', 'reject', 'require_additional_info'
  
  // Resolution
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: integer("resolved_by").references(() => users.id),
  resolutionNotes: text("resolution_notes"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Employee Status Rules
export const employeeStatusRules = pgTable("employee_status_rules", {
  id: serial("id").primaryKey(),
  ruleName: text("rule_name").notNull(),
  ruleType: text("rule_type").notNull(), // 'auto_status_change', 'geofence_timeout', 'biometric_requirement', 'location_verification', 'status_duration_limit'
  targetStatus: text("target_status").notNull(), // Status this rule applies to
  conditions: jsonb("conditions").notNull(), // Rule conditions as JSON
  actions: jsonb("actions").notNull(), // Actions to take when rule is triggered
  priority: integer("priority").default(1),
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Employee Status Audit Log
export const employeeStatusAuditLog = pgTable("employee_status_audit_log", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employeeRecords.id).notNull(),
  employeeCode: varchar("employee_code", { length: 20 }).notNull(),
  
  // Status Change Details
  previousStatus: text("previous_status"),
  newStatus: text("new_status").notNull(),
  changeType: text("change_type").notNull(), // 'manual', 'automatic', 'rule_based', 'system_triggered'
  changeReason: text("change_reason").notNull(),
  changeDetails: jsonb("change_details"),
  
  // Location Information
  changeLatitude: numeric("change_latitude", { precision: 10, scale: 7 }),
  changeLongitude: numeric("change_longitude", { precision: 10, scale: 7 }),
  changeAddress: text("change_address"),
  
  // User Information
  changedBy: integer("changed_by").references(() => users.id),
  changedByName: text("changed_by_name"),
  deviceInfo: jsonb("device_info"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
});

// Employee Status Notifications
export const employeeStatusNotifications = pgTable("employee_status_notifications", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employeeRecords.id).notNull(),
  employeeCode: varchar("employee_code", { length: 20 }).notNull(),
  
  // Notification Details
  notificationType: text("notification_type").notNull(), // 'status_change', 'location_alert', 'geofence_violation', 'biometric_failure', 'rule_violation'
  notificationTitle: text("notification_title").notNull(),
  notificationMessage: text("notification_message").notNull(),
  notificationData: jsonb("notification_data"),
  
  // Delivery Information
  deliveryMethod: text("delivery_method").notNull(), // 'push', 'whatsapp', 'email', 'sms'
  deliveryStatus: text("delivery_status").notNull().default('pending'), // 'pending', 'sent', 'delivered', 'failed'
  deliveryAttempts: integer("delivery_attempts").default(0),
  lastDeliveryAttempt: timestamp("last_delivery_attempt"),
  deliveredAt: timestamp("delivered_at"),
  
  // Recipient Information
  recipientUserId: integer("recipient_user_id").references(() => users.id),
  recipientContact: text("recipient_contact"), // Phone number or email
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Employee Status Settings
export const employeeStatusSettings = pgTable("employee_status_settings", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employeeRecords.id).notNull(),
  employeeCode: varchar("employee_code", { length: 20 }).notNull(),
  
  // Auto Status Settings
  autoStatusEnabled: boolean("auto_status_enabled").default(true),
  autoStatusRules: jsonb("auto_status_rules"), // Custom rules for this employee
  
  // Location Settings
  locationRequiredForStatus: boolean("location_required_for_status").default(true),
  biometricRequiredForStatus: boolean("biometric_required_for_status").default(true),
  allowedLocationRadius: integer("allowed_location_radius").default(200), // meters
  
  // Notification Settings
  statusChangeNotifications: boolean("status_change_notifications").default(true),
  locationAlerts: boolean("location_alerts").default(true),
  biometricFailureAlerts: boolean("biometric_failure_alerts").default(true),
  
  // Geofence Settings
  customGeofences: jsonb("custom_geofences"), // Employee-specific geofences
  geofenceViolationAction: text("geofence_violation_action").default('alert'), // 'alert', 'block', 'log'
  
  // Status Duration Limits
  maxStatusDurations: jsonb("max_status_durations"), // Max time for each status
  statusTimeoutAction: text("status_timeout_action").default('alert'), // 'alert', 'auto_change', 'log'
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// System Alerts Management
export const systemAlerts = pgTable("system_alerts", {
  id: serial("id").primaryKey(),
  alertType: text("alert_type").notNull(), // 'service_failure', 'high_resource_usage', 'data_sync_error', 'security_warning', 'system_maintenance', 'performance_degradation'
  severity: text("severity").notNull(), // 'critical', 'high', 'medium', 'low', 'info'
  title: text("title").notNull(),
  message: text("message").notNull(),
  source: text("source").notNull(), // Service or component that generated the alert
  status: text("status").notNull().default("active"), // 'active', 'acknowledged', 'resolved', 'dismissed'
  acknowledgedBy: integer("acknowledged_by").references(() => users.id),
  acknowledgedAt: timestamp("acknowledged_at"),
  resolvedBy: integer("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  resolvedNotes: text("resolved_notes"),
  metadata: jsonb("metadata"), // Additional alert-specific data
  affectedServices: text("affected_services").array(), // Array of service names
  estimatedImpact: text("estimated_impact"), // 'none', 'low', 'medium', 'high', 'critical'
  troubleshootingSteps: text("troubleshooting_steps").array(),
  relatedAlerts: integer("related_alerts").array(), // Array of related alert IDs
  autoResolved: boolean("auto_resolved").default(false),
  escalationLevel: integer("escalation_level").default(1), // 1=basic, 2=escalated, 3=critical
  notificationsSent: boolean("notifications_sent").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// System Alert Actions Log
export const systemAlertActions = pgTable("system_alert_actions", {
  id: serial("id").primaryKey(),
  alertId: integer("alert_id").references(() => systemAlerts.id).notNull(),
  actionType: text("action_type").notNull(), // 'created', 'acknowledged', 'escalated', 'resolved', 'dismissed', 'commented'
  performedBy: integer("performed_by").references(() => users.id),
  actionData: jsonb("action_data"), // Additional action-specific data
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// System Alert Subscriptions
export const systemAlertSubscriptions = pgTable("system_alert_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  alertTypes: text("alert_types").array().notNull(), // Array of alert types to subscribe to
  severityLevels: text("severity_levels").array().notNull(), // Array of severity levels
  sources: text("sources").array(), // Array of sources to monitor
  notificationMethods: text("notification_methods").array().notNull(), // ['email', 'whatsapp', 'dashboard']
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// System Alert Templates
export const systemAlertTemplates = pgTable("system_alert_templates", {
  id: serial("id").primaryKey(),
  templateName: text("template_name").notNull().unique(),
  alertType: text("alert_type").notNull(),
  severity: text("severity").notNull(),
  titleTemplate: text("title_template").notNull(),
  messageTemplate: text("message_template").notNull(),
  troubleshootingSteps: text("troubleshooting_steps").array(),
  autoResolveAfterMinutes: integer("auto_resolve_after_minutes"),
  escalationRules: jsonb("escalation_rules"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Notification Recipients Management
export const notificationRecipients = pgTable("notification_recipients", {
  id: serial("id").primaryKey(),
  recipientType: text("recipient_type").notNull(), // 'email', 'mobile', 'whatsapp'
  recipientValue: text("recipient_value").notNull(), // Email address or mobile number
  recipientName: text("recipient_name"), // Display name for the recipient
  department: text("department"), // Associated department
  role: text("role"), // Role or position
  isActive: boolean("is_active").default(true),
  isVerified: boolean("is_verified").default(false),
  verifiedAt: timestamp("verified_at"),
  alertTypes: text("alert_types").array(), // Array of alert types they should receive
  severityLevels: text("severity_levels").array(), // Array of severity levels
  notificationMethods: text("notification_methods").array(), // ['email', 'sms', 'whatsapp']
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Notification Delivery Log
export const notificationDeliveryLog = pgTable("notification_delivery_log", {
  id: serial("id").primaryKey(),
  alertId: integer("alert_id").references(() => systemAlerts.id),
  recipientId: integer("recipient_id").references(() => notificationRecipients.id).notNull(),
  deliveryMethod: text("delivery_method").notNull(), // 'email', 'sms', 'whatsapp'
  deliveryStatus: text("delivery_status").notNull(), // 'pending', 'sent', 'delivered', 'failed', 'bounced'
  deliveryAttempts: integer("delivery_attempts").default(0),
  lastAttemptAt: timestamp("last_attempt_at"),
  deliveredAt: timestamp("delivered_at"),
  failureReason: text("failure_reason"),
  responseData: jsonb("response_data"), // API response data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Notification Templates
export const notificationTemplates = pgTable("notification_templates", {
  id: serial("id").primaryKey(),
  templateName: text("template_name").notNull().unique(),
  templateType: text("template_type").notNull(), // 'email', 'sms', 'whatsapp'
  alertType: text("alert_type").notNull(),
  severity: text("severity").notNull(),
  subject: text("subject"), // For email templates
  bodyTemplate: text("body_template").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// System Alert insert schemas
export const insertSystemAlertSchema = createInsertSchema(systemAlerts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSystemAlertActionSchema = createInsertSchema(systemAlertActions).omit({
  id: true,
  createdAt: true,
});

export const insertSystemAlertSubscriptionSchema = createInsertSchema(systemAlertSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSystemAlertTemplateSchema = createInsertSchema(systemAlertTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationRecipientSchema = createInsertSchema(notificationRecipients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  verifiedAt: true,
});

export const insertNotificationDeliveryLogSchema = createInsertSchema(notificationDeliveryLog).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationTemplateSchema = createInsertSchema(notificationTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// System Alert types
export type SystemAlert = typeof systemAlerts.$inferSelect;
export type InsertSystemAlert = z.infer<typeof insertSystemAlertSchema>;
export type SystemAlertAction = typeof systemAlertActions.$inferSelect;
export type InsertSystemAlertAction = z.infer<typeof insertSystemAlertActionSchema>;
export type SystemAlertSubscription = typeof systemAlertSubscriptions.$inferSelect;
export type InsertSystemAlertSubscription = z.infer<typeof insertSystemAlertSubscriptionSchema>;
export type SystemAlertTemplate = typeof systemAlertTemplates.$inferSelect;
export type InsertSystemAlertTemplate = z.infer<typeof insertSystemAlertTemplateSchema>;
export type NotificationRecipient = typeof notificationRecipients.$inferSelect;
export type InsertNotificationRecipient = z.infer<typeof insertNotificationRecipientSchema>;
export type NotificationDeliveryLog = typeof notificationDeliveryLog.$inferSelect;
export type InsertNotificationDeliveryLog = z.infer<typeof insertNotificationDeliveryLogSchema>;
export type NotificationTemplate = typeof notificationTemplates.$inferSelect;
export type InsertNotificationTemplate = z.infer<typeof insertNotificationTemplateSchema>;

// Employee Status Tracking insert schemas
export const insertEmployeeStatusSchema = createInsertSchema(employeeStatusTracking).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmployeeStatusHistorySchema = createInsertSchema(employeeStatusHistory).omit({
  id: true,
  createdAt: true,
});

export const insertEmployeeStatusGeofencesSchema = createInsertSchema(employeeStatusGeofences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmployeeStatusViolationsSchema = createInsertSchema(employeeStatusViolations).omit({
  id: true,
  createdAt: true,
});

export const insertEmployeeStatusRulesSchema = createInsertSchema(employeeStatusRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmployeeStatusAuditLogSchema = createInsertSchema(employeeStatusAuditLog).omit({
  id: true,
  createdAt: true,
});

export const insertEmployeeStatusNotificationsSchema = createInsertSchema(employeeStatusNotifications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmployeeStatusSettingsSchema = createInsertSchema(employeeStatusSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Employee Status Tracking types
export type EmployeeStatus = typeof employeeStatusTracking.$inferSelect;
export type InsertEmployeeStatus = z.infer<typeof insertEmployeeStatusSchema>;
export type EmployeeStatusHistory = typeof employeeStatusHistory.$inferSelect;
export type InsertEmployeeStatusHistory = z.infer<typeof insertEmployeeStatusHistorySchema>;
export type EmployeeStatusGeofences = typeof employeeStatusGeofences.$inferSelect;
export type InsertEmployeeStatusGeofences = z.infer<typeof insertEmployeeStatusGeofencesSchema>;
export type EmployeeStatusViolations = typeof employeeStatusViolations.$inferSelect;
export type InsertEmployeeStatusViolations = z.infer<typeof insertEmployeeStatusViolationsSchema>;
export type EmployeeStatusRules = typeof employeeStatusRules.$inferSelect;
export type InsertEmployeeStatusRules = z.infer<typeof insertEmployeeStatusRulesSchema>;
export type EmployeeStatusAuditLog = typeof employeeStatusAuditLog.$inferSelect;
export type InsertEmployeeStatusAuditLog = z.infer<typeof insertEmployeeStatusAuditLogSchema>;
export type EmployeeStatusNotifications = typeof employeeStatusNotifications.$inferSelect;
export type InsertEmployeeStatusNotifications = z.infer<typeof insertEmployeeStatusNotificationsSchema>;
export type EmployeeStatusSettings = typeof employeeStatusSettings.$inferSelect;
export type InsertEmployeeStatusSettings = z.infer<typeof insertEmployeeStatusSettingsSchema>;

// App Mode System Tables
export const appModeConfig = pgTable("app_mode_config", {
  id: serial("id").primaryKey(),
  currentMode: text("current_mode").notNull().default("demo"), // 'demo', 'live'
  lastModeChange: timestamp("last_mode_change").defaultNow(),
  changedBy: integer("changed_by").references(() => users.id),
  isLocked: boolean("is_locked").default(false), // Admin can lock mode switches
  demoDataEnabled: boolean("demo_data_enabled").default(true),
  locationReportingEnabled: boolean("location_reporting_enabled").default(true),
  networkResumeEnabled: boolean("network_resume_enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const appModeHistory = pgTable("app_mode_history", {
  id: serial("id").primaryKey(),
  previousMode: text("previous_mode").notNull(),
  newMode: text("new_mode").notNull(),
  changedBy: integer("changed_by").references(() => users.id),
  changeReason: text("change_reason"),
  changeTimestamp: timestamp("change_timestamp").defaultNow(),
  systemState: jsonb("system_state"), // Store system state at time of change
  dataSnapshot: jsonb("data_snapshot"), // Store data metrics at time of change
});

export const appModeDataPopulation = pgTable("app_mode_data_population", {
  id: serial("id").primaryKey(),
  populationType: text("population_type").notNull(), // '48_hour', 'historical', 'real_time'
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  status: text("status").notNull().default("pending"), // 'pending', 'in_progress', 'completed', 'failed'
  recordsProcessed: integer("records_processed").default(0),
  recordsTotal: integer("records_total").default(0),
  progressPercentage: decimal("progress_percentage", { precision: 5, scale: 2 }).default("0.00"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  failureReason: text("failure_reason"),
  triggeredBy: integer("triggered_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const appModeNetworkResume = pgTable("app_mode_network_resume", {
  id: serial("id").primaryKey(),
  resumeType: text("resume_type").notNull(), // 'auto', 'manual'
  lastSync: timestamp("last_sync"),
  syncGap: integer("sync_gap"), // Minutes of gap detected
  resumeAction: text("resume_action").notNull(), // 'fetch_missing', 'full_sync', 'partial_sync'
  status: text("status").notNull().default("pending"), // 'pending', 'in_progress', 'completed', 'failed'
  recordsRecovered: integer("records_recovered").default(0),
  gapsFilled: integer("gaps_filled").default(0),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  failureReason: text("failure_reason"),
  triggeredBy: integer("triggered_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const appModeMetrics = pgTable("app_mode_metrics", {
  id: serial("id").primaryKey(),
  mode: text("mode").notNull(), // 'demo', 'live'
  metricType: text("metric_type").notNull(), // 'data_quality', 'user_engagement', 'system_performance'
  metricValue: decimal("metric_value", { precision: 10, scale: 2 }).notNull(),
  metricUnit: text("metric_unit"), // 'percentage', 'count', 'milliseconds'
  timestamp: timestamp("timestamp").defaultNow(),
  additionalData: jsonb("additional_data"),
});

// App Mode System insert schemas
export const insertAppModeConfigSchema = createInsertSchema(appModeConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAppModeHistorySchema = createInsertSchema(appModeHistory).omit({
  id: true,
  changeTimestamp: true,
});

export const insertAppModeDataPopulationSchema = createInsertSchema(appModeDataPopulation).omit({
  id: true,
  createdAt: true,
});

export const insertAppModeNetworkResumeSchema = createInsertSchema(appModeNetworkResume).omit({
  id: true,
  createdAt: true,
});

export const insertAppModeMetricsSchema = createInsertSchema(appModeMetrics).omit({
  id: true,
  timestamp: true,
});

// App Mode System types
export type AppModeConfig = typeof appModeConfig.$inferSelect;
export type InsertAppModeConfig = z.infer<typeof insertAppModeConfigSchema>;
export type AppModeHistory = typeof appModeHistory.$inferSelect;
export type InsertAppModeHistory = z.infer<typeof insertAppModeHistorySchema>;
export type AppModeDataPopulation = typeof appModeDataPopulation.$inferSelect;
export type InsertAppModeDataPopulation = z.infer<typeof insertAppModeDataPopulationSchema>;
export type AppModeNetworkResume = typeof appModeNetworkResume.$inferSelect;
export type InsertAppModeNetworkResume = z.infer<typeof insertAppModeNetworkResumeSchema>;
export type AppModeMetrics = typeof appModeMetrics.$inferSelect;
export type InsertAppModeMetrics = z.infer<typeof insertAppModeMetricsSchema>;

// WhatsApp Analytics and Circuit Breaker Tables
export const whatsappMessageLogs = pgTable("whatsapp_message_logs", {
  id: serial("id").primaryKey(),
  phoneNumber: varchar("phone_number", { length: 20 }).notNull(),
  messageText: text("message_text").notNull(), // Updated to match database
  direction: varchar("direction", { length: 10 }).notNull(), // 'inbound' | 'outbound'
  messageType: varchar("message_type", { length: 20 }).notNull().default('text'), // 'text', 'image', 'document', 'audio'
  employeeCode: varchar("employee_code", { length: 50 }),
  riskScore: integer("risk_score").default(0),
  isBlocked: boolean("is_blocked").default(false),
  blockReason: text("block_reason"),
  webhookId: varchar("webhook_id", { length: 255 }), // Added new field
  senderName: varchar("sender_name", { length: 255 }), // Added new field
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  processed: boolean("processed").default(true),
  aiUsed: boolean("ai_used").default(false),
});

export const whatsappBlacklist = pgTable("whatsapp_blacklist", {
  id: serial("id").primaryKey(),
  phoneNumber: varchar("phone_number", { length: 20 }).notNull().unique(),
  reason: text("reason").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  isPermanent: boolean("is_permanent").notNull().default(false),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const whatsappSpamConfig = pgTable("whatsapp_spam_config", {
  id: serial("id").primaryKey(),
  maxMessagesPerMinute: integer("max_messages_per_minute").notNull().default(30), // Very generous for normal use
  maxMessagesPerHour: integer("max_messages_per_hour").notNull().default(200), // Allows heavy business usage  
  maxMessagesPerDay: integer("max_messages_per_day").notNull().default(1000), // Enterprise-level daily limit
  blacklistThreshold: integer("blacklist_threshold").notNull().default(90), // High threshold for auto-blacklist
  blockDurationMinutes: integer("block_duration_minutes").notNull().default(60), // 1 hour temporary blocks
  suspiciousPatternDetection: boolean("suspicious_pattern_detection").notNull().default(true),
  aiUsageLimit: integer("ai_usage_limit").notNull().default(100), // AI usage per day
  aiCooldownMinutes: integer("ai_cooldown_minutes").notNull().default(2), // Brief AI cooldown
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const whatsappAnalytics = pgTable("whatsapp_analytics", {
  id: serial("id").primaryKey(),
  date: date("date").notNull().unique(),
  totalInbound: integer("total_inbound").notNull().default(0),
  totalOutbound: integer("total_outbound").notNull().default(0),
  uniqueContacts: integer("unique_contacts").notNull().default(0),
  newRegistrations: integer("new_registrations").notNull().default(0),
  aiRequests: integer("ai_requests").notNull().default(0),
  blockedMessages: integer("blocked_messages").notNull().default(0),
  spamDetected: integer("spam_detected").notNull().default(0),
  averageResponseTime: integer("average_response_time").default(0), // seconds
  peakHour: integer("peak_hour").default(0), // 0-23
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// WhatsApp Analytics Schema Types
export const insertWhatsappMessageLogsSchema = createInsertSchema(whatsappMessageLogs).omit({
  id: true,
  timestamp: true,
});

export const insertWhatsappBlacklistSchema = createInsertSchema(whatsappBlacklist).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWhatsappSpamConfigSchema = createInsertSchema(whatsappSpamConfig).omit({
  id: true,
  updatedAt: true,
});

export const insertWhatsappAnalyticsSchema = createInsertSchema(whatsappAnalytics).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// WhatsApp Analytics Types
export type WhatsappMessageLogs = typeof whatsappMessageLogs.$inferSelect;
export type InsertWhatsappMessageLogs = z.infer<typeof insertWhatsappMessageLogsSchema>;
export type WhatsappBlacklist = typeof whatsappBlacklist.$inferSelect;
export type InsertWhatsappBlacklist = z.infer<typeof insertWhatsappBlacklistSchema>;
export type WhatsappSpamConfig = typeof whatsappSpamConfig.$inferSelect;
export type InsertWhatsappSpamConfig = z.infer<typeof insertWhatsappSpamConfigSchema>;
export type WhatsappAnalytics = typeof whatsappAnalytics.$inferSelect;
export type InsertWhatsappAnalytics = z.infer<typeof insertWhatsappAnalyticsSchema>;

// Re-export department groups
export { departmentGroups, type DepartmentGroup, type InsertDepartmentGroup } from "./departmentGroups";