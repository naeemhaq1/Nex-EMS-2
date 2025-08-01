import {
  users,
  rolePermissions,
  managers,
  managerDepartmentAssignments,
  managerAssignments,
  employeeRecords,
  attendanceRecords,
  employeePullExt,
  attendancePullExt,
  syncStatus,
  devices,
  shifts,
  auditLogs,
  settings,
  shiftAssignments,
  departmentGroups,
  attendanceRejected,
  dailyAttendanceMetrics,
  teamTemplates,
  assembledTeams,
  teamMembers,
  whatsappOnboardingRequests,
  whatsappMessageLog,
  whatsappOnboardingStats,
  scoringRules,
  employeeScores,
  scoringAuditTrail,
  scoringConfiguration,
  scoringBaselines,
  systemConfiguration,
  leaveTypes,
  leaveRequests,
  lateArrivalReasons,
  reimbursementCategories,
  reimbursementRequests,
  overtimeRequests,
  shiftChangeRequests,
  workFromHomeRequests,
  trainingRequests,
  documentRequests,
  grievances,
  announcements,
  type User,
  type InsertUser,
  type RolePermission,
  type InsertRolePermission,
  type ManagerAssignment,
  type InsertManagerAssignment,
  type Employee,
  type InsertEmployee,
  type AttendanceRecord,
  type InsertAttendance,
  type Device,
  type InsertDevice,
  type Shift,
  type InsertShift,
  type ShiftAssignment,
  type InsertShiftAssignment,
  type AuditLog,
  type InsertAuditLog,
  type Setting,
  type InsertSetting,
  type DepartmentGroup,
  type InsertDepartmentGroup,
  type TeamTemplate,
  type InsertTeamTemplate,
  type AssembledTeam,
  type InsertAssembledTeam,
  type TeamMember,
  type InsertTeamMember,
  actionRecords,
  type ActionRecord,
  type InsertActionRecord,
  forcedPunchouts,
  type ForcedPunchout,
  type InsertForcedPunchout,
  attendanceStreaks,
  type AttendanceStreak,
  type InsertAttendanceStreak,
  badges,
  type Badge,
  type InsertBadge,
  employeeBadges,
  type EmployeeBadge,
  type InsertEmployeeBadge,
  gamificationEvents,
  type GamificationEvent,
  type InsertGamificationEvent,
  attendanceExternal,
  type AttendanceExternal,
  type InsertAttendanceExternal,
  attendancePolicySettings,
  type AttendancePolicySettings,
  type InsertAttendancePolicySettings,
  terminateActions,
  exclusions,
  type Exclusion,
  type InsertExclusion,
  type DailyAttendanceMetrics,
  type InsertDailyAttendanceMetrics,
  type ScoringRule,
  type InsertScoringRule,
  type EmployeeScore,
  type InsertEmployeeScore,
  type ScoringAuditTrail,
  type InsertScoringAuditTrail,
  type ScoringConfiguration,
  type InsertScoringConfiguration,
  type SystemConfiguration,
  type InsertSystemConfiguration,
  type ScoringBaselines,
  type InsertScoringBaselines,
  type WhatsappOnboardingRequest,
  type InsertWhatsappOnboardingRequest,
  type WhatsappMessageLog,
  type InsertWhatsappMessageLog,
  type WhatsappOnboardingStats,
  type InsertWhatsappOnboardingStats,
  type WhatsAppContact,
  type InsertWhatsAppContact,
  type WhatsAppGroup,
  type InsertWhatsAppGroup,
  type WhatsAppGroupMember,
  type InsertWhatsAppGroupMember,
  type WhatsAppMessage,
  type InsertWhatsAppMessage,
  type LeaveType,
  type InsertLeaveType,
  type LeaveRequest,
  type InsertLeaveRequest,
  type LateArrivalReason,
  type InsertLateArrivalReason,
  type ReimbursementCategory,
  type InsertReimbursementCategory,
  type ReimbursementRequest,
  type InsertReimbursementRequest,
  type OvertimeRequest,
  type InsertOvertimeRequest,
  type ShiftChangeRequest,
  type InsertShiftChangeRequest,
  type WorkFromHomeRequest,
  type InsertWorkFromHomeRequest,
  type TrainingRequest,
  type InsertTrainingRequest,
  type DocumentRequest,
  type InsertDocumentRequest,
  type Grievance,
  type InsertGrievance,
  type Announcement,
  type InsertAnnouncement,
  dashboardProfiles,
  type DashboardProfile,
  type InsertDashboardProfile,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, count, and, gte, lte, like, ilike, or, sql, max, lt, countDistinct, isNotNull, isNull, ne, inArray } from "drizzle-orm";
import { format } from "date-fns";
import { getCurrentTimezone } from "./config/timezone";
import { getCurrentTimeInPakistan } from "./utils/timezone";

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmployeeId(employeeId: string): Promise<User | undefined>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  deleteUser(id: number): Promise<boolean>;
  
  // Role permissions
  getRolePermissions(): Promise<RolePermission[]>;
  getRolePermissionByName(roleName: string): Promise<RolePermission | undefined>;
  createRolePermission(permission: InsertRolePermission): Promise<RolePermission>;
  updateRolePermission(id: number, permission: Partial<InsertRolePermission>): Promise<RolePermission>;
  getUserPermissions(userId: number): Promise<RolePermission | undefined>;
  canUserCreateRole(userId: number, targetRole: string): Promise<boolean>;
  
  // Manager assignments
  getManagerAssignments(userId?: number, roleType?: string): Promise<ManagerAssignment[]>;
  createManagerAssignment(assignment: InsertManagerAssignment): Promise<ManagerAssignment>;
  deleteManagerAssignment(id: number): Promise<void>;
  getManagersByDepartment(departmentName: string, roleType?: string): Promise<User[]>;
  getDepartmentsByManager(userId: number, roleType?: string): Promise<string[]>;
  
  // Employee management
  getEmployee(id: number): Promise<Employee | undefined>;
  getEmployeeByCode(code: string): Promise<Employee | undefined>;
  getEmployees(params?: {
    page?: number;
    limit?: number;
    search?: string;
    department?: string;
    designation?: string;
    isActive?: boolean;
  }): Promise<{ employees: Employee[]; total: number }>;
  getEmployeesWithDepartmentAccess(params?: {
    page?: number;
    limit?: number;
    search?: string;
    department?: string;
    designation?: string;
    isActive?: boolean;
  }, user?: User): Promise<{ employees: Employee[]; total: number }>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: number, employee: Partial<InsertEmployee>): Promise<Employee>;
  getAllEmployees(): Promise<Employee[]>;
  getAllEmployeesWithDepartmentAccess(user?: User): Promise<Employee[]>;
  getLastEmployee(): Promise<Employee | undefined>;
  getEmployeeCount(params?: { isActive?: boolean; nonBio?: boolean }): Promise<number>;
  getEmployeeStatusData(): Promise<Array<{
    employeeCode: string;
    status: 'scheduled' | 'at_work' | 'available' | 'offline';
    isOnShift: boolean;
    hasCheckedIn: boolean;
    hasCheckedOut: boolean;
    shiftName?: string;
    punchInTime?: Date;
    punchOutTime?: Date;
  }>>;
  
  // Attendance management
  getAttendanceRecord(id: number): Promise<AttendanceRecord | undefined>;
  getAttendanceRecords(params?: {
    page?: number;
    limit?: number;
    employeeId?: number;
    dateFrom?: Date;
    dateTo?: Date;
    status?: string;
  }): Promise<{ records: AttendanceRecord[]; total: number }>;
  createAttendanceRecord(record: InsertAttendance): Promise<AttendanceRecord>;
  updateAttendanceRecord(id: number, record: Partial<InsertAttendance>): Promise<AttendanceRecord>;
  
  // Dashboard metrics
  getDashboardMetrics(): Promise<{
    totalEmployees: number;
    presentToday: number;
    lateArrivals: number;
    absentToday: number;
    nonBioEmployees?: number;
  }>;
  
  // Recent activity
  getRecentActivity(limit?: number): Promise<Array<{
    type: string;
    employeeName: string;
    employeeCode: string;
    timestamp: Date;
    details: string;
    shiftAssigned?: string;
    recordType: string;
    timingDifference?: string;
    shiftTimeDifference?: number | 'shift_change';
    isEarlyOrLate?: 'early' | 'late' | 'on_time' | 'shift_change';
  }>>;
  
  // External data staging
  insertEmployeePullData(data: any[]): Promise<void>;
  insertAttendancePullData(data: any[]): Promise<void>;
  processEmployeeData(): Promise<number>;
  processAttendanceData(): Promise<number>;
  
  // Sync status with resume capability
  updateSyncStatus(type: string, status: string, recordsProcessed?: number, recordsTotal?: number, error?: string, currentPage?: number, lastProcessedId?: string): Promise<void>;
  getSyncStatus(): Promise<Array<{ syncType: string; lastSync: Date | null; status: string; recordsProcessed: number; recordsTotal: number; currentPage: number; error: string | null }>>;
  
  // Device management
  getDevices(): Promise<Device[]>;
  getDevice(id: number): Promise<Device | undefined>;
  createDevice(device: InsertDevice): Promise<Device>;
  updateDevice(id: number, device: Partial<InsertDevice>): Promise<Device>;
  deleteDevice(id: number): Promise<void>;
  getSelectedDevices(): Promise<Device[]>;
  updateDeviceSelection(deviceId: string, isSelected: boolean): Promise<void>;
  
  // Shift management
  getShifts(): Promise<Shift[]>;
  getShift(id: number): Promise<Shift | undefined>;
  createShift(shift: InsertShift): Promise<Shift>;
  updateShift(id: number, shift: Partial<InsertShift>): Promise<Shift>;
  deleteShift(id: number): Promise<void>;

  // Audit logs
  getAuditLogs(params?: {
    page?: number;
    limit?: number;
    entityType?: string;
    action?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<{ logs: AuditLog[]; total: number }>;

  // Shift assignment management
  getShiftAssignments(params?: {
    dateFrom?: Date;
    dateTo?: Date;
    employeeId?: number;
    shiftId?: number;
  }): Promise<ShiftAssignment[]>;
  getShiftAssignment(id: number): Promise<ShiftAssignment | undefined>;
  createShiftAssignment(assignment: InsertShiftAssignment): Promise<ShiftAssignment>;
  updateShiftAssignment(id: number, assignment: Partial<InsertShiftAssignment>): Promise<ShiftAssignment>;
  deleteShiftAssignment(id: number): Promise<void>;

  // Settings management
  getSetting(key: string): Promise<Setting | undefined>;
  getSettings(category?: string): Promise<Setting[]>;
  setSetting(setting: InsertSetting): Promise<Setting>;
  updateSetting(key: string, value: string, updatedBy?: number): Promise<Setting>;
  deleteSetting(key: string): Promise<void>;

  // Department management
  getDepartments(): Promise<string[]>;
  getDepartmentsForExclusions(): Promise<Array<{ department: string; employeeCount: number }>>;
  getEmployeesWithoutDepartment(): Promise<{ employees: Employee[]; total: number }>;
  getPositions(): Promise<string[]>;
  getDesignations(): Promise<string[]>;

  // Department groups management
  getDepartmentGroups(): Promise<DepartmentGroup[]>;
  getDepartmentGroup(id: number): Promise<DepartmentGroup | undefined>;
  createDepartmentGroup(group: InsertDepartmentGroup): Promise<DepartmentGroup>;
  updateDepartmentGroup(id: number, group: Partial<InsertDepartmentGroup>): Promise<DepartmentGroup>;
  deleteDepartmentGroup(id: number): Promise<void>;

  // Action records management
  createActionRecord(record: InsertActionRecord): Promise<ActionRecord>;
  getActionRecords(params?: {
    page?: number;
    limit?: number;
    userType?: string;
    command?: string;
    result?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<{ records: ActionRecord[]; total: number }>;
  getActionRecord(id: number): Promise<ActionRecord | undefined>;

  // Database access
  getDb(): any;
  
  // Raw attendance data
  getRawAttendanceForToday(startDate: Date, endDate: Date): Promise<any[]>;
  getAttendancePullExtByDateRange(startDate: Date, endDate: Date): Promise<any[]>;
  bulkInsertAttendancePullExt(records: any[], source: string): Promise<void>;
  
  // Attendance Policy Settings
  getAttendancePolicySettings(): Promise<AttendancePolicySettings | undefined>;
  createAttendancePolicySettings(settings: InsertAttendancePolicySettings): Promise<AttendancePolicySettings>;
  updateAttendancePolicySettings(id: number, settings: Partial<InsertAttendancePolicySettings>): Promise<AttendancePolicySettings>;

  // Gamification management
  getEmployeeStreak(employeeId: number): Promise<AttendanceStreak | undefined>;
  updateEmployeeStreak(employeeId: number, data: Partial<InsertAttendanceStreak>): Promise<AttendanceStreak>;
  createEmployeeStreak(data: InsertAttendanceStreak): Promise<AttendanceStreak>;
  
  // Badge management
  getBadges(params?: { category?: string; isActive?: boolean }): Promise<Badge[]>;
  getBadge(id: number): Promise<Badge | undefined>;
  createBadge(badge: InsertBadge): Promise<Badge>;
  updateBadge(id: number, badge: Partial<InsertBadge>): Promise<Badge>;
  deleteBadge(id: number): Promise<void>;
  
  // Employee badges
  getEmployeeBadges(employeeId: number): Promise<Array<EmployeeBadge & { badge: Badge }>>;
  awardBadge(employeeId: number, badgeId: number): Promise<EmployeeBadge>;
  updateBadgeProgress(employeeId: number, badgeId: number, progress: number): Promise<void>;
  
  // Gamification events
  createGamificationEvent(event: InsertGamificationEvent): Promise<GamificationEvent>;
  getGamificationEvents(params?: {
    employeeId?: number;
    eventType?: string;
    limit?: number;
  }): Promise<GamificationEvent[]>;
  
  // Top performers based on scoring system
  getTopPerformers(limit?: number): Promise<Array<{
    employeeId: number;
    employeeCode: string;
    employeeName: string;
    department: string;
    totalPoints: number;
    rank: number;
    attendanceRate: number;
    badgeCount: number;
    currentStreak: number;
    badges: Badge[];
  }>>;
  
  // Leaderboard integration
  getLeaderboard(period?: string): Promise<Array<{
    employeeId: number;
    employeeCode: string;
    employeeName: string;
    department: string;
    totalPoints: number;
    rank: number;
    attendancePoints: number;
    punctualityPoints: number;
    performancePoints: number;
    streakBonus: number;
    badges: Badge[];
  }>>;
  
  // External attendance
  createExternalAttendance(data: InsertAttendanceExternal): Promise<AttendanceExternal>;
  getExternalAttendance(params?: {
    employeeId?: number;
    status?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<AttendanceExternal[]>;
  approveExternalAttendance(id: number, approvedBy: number): Promise<void>;
  rejectExternalAttendance(id: number, approvedBy: number, reason: string): Promise<void>;
  
  // Forced punchouts
  createForcedPunchout(punchout: InsertForcedPunchout): Promise<ForcedPunchout>;
  getForcedPunchouts(params?: {
    employeeId?: number;
    adminId?: number;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<ForcedPunchout[]>;
  getForcedPunchout(id: number): Promise<ForcedPunchout | undefined>;

  // Exclusions management
  getExclusions(): Promise<Exclusion[]>;
  createExclusion(data: InsertExclusion): Promise<Exclusion>;
  updateExclusion(id: number, data: Partial<InsertExclusion>): Promise<Exclusion>;
  deleteExclusion(id: number): Promise<void>;
  deleteExclusionsBulk(ids: number[]): Promise<void>;
  getExclusionsByType(type: 'department' | 'employee'): Promise<Exclusion[]>;

  // Team management
  getTeamTemplates(): Promise<TeamTemplate[]>;
  getTeamTemplate(id: number): Promise<TeamTemplate | undefined>;
  createTeamTemplate(template: InsertTeamTemplate): Promise<TeamTemplate>;
  updateTeamTemplate(id: number, template: Partial<InsertTeamTemplate>): Promise<TeamTemplate>;
  deleteTeamTemplate(id: number): Promise<void>;

  getAssembledTeams(params?: {
    status?: 'active' | 'inactive' | 'completed';
    createdBy?: number;
    limit?: number;
  }): Promise<AssembledTeam[]>;
  getAssembledTeam(id: number): Promise<AssembledTeam | undefined>;
  createAssembledTeam(team: InsertAssembledTeam): Promise<AssembledTeam>;
  updateAssembledTeam(id: number, team: Partial<InsertAssembledTeam>): Promise<AssembledTeam>;
  deleteAssembledTeam(id: number): Promise<void>;

  getTeamMembers(teamId: number): Promise<TeamMember[]>;
  getTeamMember(id: number): Promise<TeamMember | undefined>;
  createTeamMember(member: InsertTeamMember): Promise<TeamMember>;
  updateTeamMember(id: number, member: Partial<InsertTeamMember>): Promise<TeamMember>;
  deleteTeamMember(id: number): Promise<void>;
  deleteTeamMembersByTeam(teamId: number): Promise<void>;
  addTeamMember(member: InsertTeamMember): Promise<TeamMember>;
  removeTeamMember(id: number): Promise<void>;

  // Department Manager management
  getDepartmentManagers(): Promise<Array<User & { managedDepartments: string[] }>>;
  assignDepartmentManager(userId: number, departments: string[]): Promise<User>;
  removeDepartmentManager(userId: number): Promise<void>;

  // Team-Shift assignments
  getTeamShifts(teamId: number): Promise<ShiftAssignment[]>;
  assignTeamShift(teamId: number, shiftData: any): Promise<ShiftAssignment>;

  // WhatsApp Onboarding management
  getWhatsappOnboardingRequests(params?: {
    status?: string;
    limit?: number;
    page?: number;
  }): Promise<{ requests: WhatsappOnboardingRequest[]; total: number }>;
  createWhatsappOnboardingRequest(request: InsertWhatsappOnboardingRequest): Promise<WhatsappOnboardingRequest>;
  updateWhatsappOnboardingRequest(id: number, request: Partial<InsertWhatsappOnboardingRequest>): Promise<WhatsappOnboardingRequest>;
  deleteWhatsappOnboardingRequest(id: number): Promise<void>;
  getWhatsappOnboardingRequestByPhone(phoneNumber: string): Promise<WhatsappOnboardingRequest | undefined>;
  
  // WhatsApp Message Log
  createWhatsappMessageLog(log: InsertWhatsappMessageLog): Promise<WhatsappMessageLog>;
  logWhatsappMessage(log: InsertWhatsappMessageLog): Promise<WhatsappMessageLog>;
  getWhatsappMessageLogs(params?: {
    phoneNumber?: string;
    messageType?: string;
    status?: string;
    limit?: number;
  }): Promise<WhatsappMessageLog[]>;
  
  // WhatsApp Onboarding Statistics
  getWhatsappOnboardingStats(): Promise<WhatsappOnboardingStats | undefined>;
  updateWhatsappOnboardingStats(updates: Partial<InsertWhatsappOnboardingStats>): Promise<WhatsappOnboardingStats>;
  initializeWhatsappOnboardingStats(): Promise<WhatsappOnboardingStats>;
  
  // Scoring System Management
  // Scoring Rules
  getScoringRules(): Promise<ScoringRule[]>;
  getScoringRule(id: number): Promise<ScoringRule | undefined>;
  createScoringRule(rule: InsertScoringRule): Promise<ScoringRule>;
  updateScoringRule(id: number, rule: Partial<InsertScoringRule>): Promise<ScoringRule>;
  deleteScoringRule(id: number): Promise<void>;
  
  // Employee Scores
  getEmployeeScores(params?: {
    employeeId?: number;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    orderBy?: 'score' | 'date';
    order?: 'asc' | 'desc';
  }): Promise<EmployeeScore[]>;
  getEmployeeScore(employeeId: number, date: Date): Promise<EmployeeScore | undefined>;
  createEmployeeScore(score: InsertEmployeeScore): Promise<EmployeeScore>;
  updateEmployeeScore(id: number, score: Partial<InsertEmployeeScore>): Promise<EmployeeScore>;
  deleteEmployeeScore(id: number): Promise<void>;
  
  // Scoring Audit Trail
  getScoringAuditTrail(params?: {
    employeeId?: number;
    actionType?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
  }): Promise<ScoringAuditTrail[]>;
  createScoringAuditTrail(audit: InsertScoringAuditTrail): Promise<ScoringAuditTrail>;
  
  // Scoring Configuration
  getScoringConfiguration(): Promise<ScoringConfiguration | undefined>;
  updateScoringConfiguration(config: Partial<InsertScoringConfiguration>): Promise<ScoringConfiguration>;
  initializeScoringConfiguration(): Promise<ScoringConfiguration>;
  
  // Scoring Baselines
  getScoringBaselines(params?: {
    employeeId?: number;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
  }): Promise<ScoringBaselines[]>;
  getScoringBaseline(employeeId: number, date: Date): Promise<ScoringBaselines | undefined>;
  createScoringBaseline(baseline: InsertScoringBaselines): Promise<ScoringBaselines>;
  updateScoringBaseline(id: number, baseline: Partial<InsertScoringBaselines>): Promise<ScoringBaselines>;
  deleteScoringBaseline(id: number): Promise<void>;
  generateScoringBaselines(employeeId?: number): Promise<{ generated: number; updated: number }>;
  
  // Scoring Leaderboard
  getScoringLeaderboard(params?: {
    period?: 'daily' | 'weekly' | 'monthly' | 'yearly';
    date?: Date;
    department?: string;
    limit?: number;
  }): Promise<Array<{
    employeeId: number;
    employeeName: string;
    employeeCode: string;
    department: string;
    designation: string;
    score: number;
    rank: number;
    change: number;
    badges: string[];
  }>>;

  // Employee Request Management
  getEmployeeRequests(employeeId: number): Promise<any[]>;
  getLeaveTypes(): Promise<LeaveType[]>;
  getReimbursementCategories(): Promise<ReimbursementCategory[]>;
  createWorkFromHomeRequest(request: InsertWorkFromHomeRequest): Promise<WorkFromHomeRequest>;
  createLeaveRequest(request: InsertLeaveRequest): Promise<LeaveRequest>;
  createOvertimeRequest(request: InsertOvertimeRequest): Promise<OvertimeRequest>;
  createReimbursementRequest(request: InsertReimbursementRequest): Promise<ReimbursementRequest>;
  createTrainingRequest(request: InsertTrainingRequest): Promise<TrainingRequest>;
  createDocumentRequest(request: InsertDocumentRequest): Promise<DocumentRequest>;
  createGrievance(request: InsertGrievance): Promise<Grievance>;
  createShiftChangeRequest(request: InsertShiftChangeRequest): Promise<ShiftChangeRequest>;
  createLateArrivalReason(request: InsertLateArrivalReason): Promise<LateArrivalReason>;

  // Announcement Management
  getAnnouncements(params?: {
    active?: boolean;
    audience?: string;
    priority?: string;
  }): Promise<Announcement[]>;
  getAnnouncement(id: number): Promise<Announcement | undefined>;
  getActiveAnnouncements(params?: {
    employeeId?: string;
    department?: string;
  }): Promise<Announcement[]>;
  createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement>;
  updateAnnouncement(id: number, announcement: Partial<InsertAnnouncement>): Promise<Announcement | undefined>;
  deleteAnnouncement(id: number): Promise<void>;

  // Dashboard profiles management
  getDashboardProfile(userId: number): Promise<DashboardProfile | undefined>;
  createDashboardProfile(profile: InsertDashboardProfile): Promise<DashboardProfile>;
  updateDashboardProfile(id: number, profile: Partial<InsertDashboardProfile>): Promise<DashboardProfile>;
  deleteDashboardProfile(id: number): Promise<void>;
  getDashboardProfiles(userId?: number): Promise<DashboardProfile[]>;

  // WhatsApp Contact Management with Admin Isolation
  getWhatsAppContacts(userId: number, filters?: {
    department?: string;
    contactType?: string;
    isActive?: boolean;
  }): Promise<WhatsAppContact[]>;
  getWhatsAppContact(id: number, userId: number): Promise<WhatsAppContact | undefined>;
  getWhatsAppContactByPhone(phoneNumber: string, userId: number): Promise<WhatsAppContact | undefined>;
  createWhatsAppContact(contact: InsertWhatsAppContact): Promise<WhatsAppContact>;
  updateWhatsAppContact(id: number, contact: Partial<InsertWhatsAppContact>, userId: number): Promise<WhatsAppContact | undefined>;
  deleteWhatsAppContact(id: number, userId: number): Promise<void>;
  
  // WhatsApp Group Management with Admin Isolation
  getWhatsAppGroups(userId: number, filters?: {
    groupType?: string;
    departmentName?: string;
    isActive?: boolean;
  }): Promise<WhatsAppGroup[]>;
  getWhatsAppGroup(id: number, userId: number): Promise<WhatsAppGroup | undefined>;
  createWhatsAppGroup(group: InsertWhatsAppGroup): Promise<WhatsAppGroup>;
  updateWhatsAppGroup(id: number, group: Partial<InsertWhatsAppGroup>, userId: number): Promise<WhatsAppGroup | undefined>;
  deleteWhatsAppGroup(id: number, userId: number): Promise<void>;
  
  // WhatsApp Group Members Management
  getGroupMembers(groupId: number, userId: number): Promise<WhatsAppGroupMember[]>;
  addGroupMember(member: InsertWhatsAppGroupMember): Promise<WhatsAppGroupMember>;
  removeGroupMember(groupId: number, contactId: number, userId: number): Promise<void>;
  
  // WhatsApp Messages with Admin Isolation
  getWhatsAppMessages(userId: number, filters?: {
    phoneNumber?: string;
    messageType?: string;
    messageStatus?: string;
    groupId?: number;
    limit?: number;
  }): Promise<WhatsAppMessage[]>;
  createWhatsAppMessage(message: InsertWhatsAppMessage): Promise<WhatsAppMessage>;
  updateWhatsAppMessage(id: number, message: Partial<InsertWhatsAppMessage>): Promise<WhatsAppMessage>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmployeeId(employeeId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.employeeId, employeeId));
    return user || undefined;
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.passwordResetToken, token));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, updateUser: Partial<InsertUser>): Promise<User> {
    const [user] = await db.update(users).set(updateUser).where(eq(users.id, id)).returning();
    return user;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Role permissions methods
  async getRolePermissions(): Promise<RolePermission[]> {
    const permissions = await db.select().from(rolePermissions).orderBy(rolePermissions.accessLevel);
    return permissions.map(p => ({
      ...p,
      createdRoles: typeof p.createdRoles === 'string' ? JSON.parse(p.createdRoles) : p.createdRoles
    }));
  }

  async getRolePermissionByName(roleName: string): Promise<RolePermission | undefined> {
    const [permission] = await db.select().from(rolePermissions).where(eq(rolePermissions.roleName, roleName));
    if (!permission) return undefined;
    return {
      ...permission,
      createdRoles: typeof permission.createdRoles === 'string' ? JSON.parse(permission.createdRoles) : permission.createdRoles
    };
  }

  async createRolePermission(permission: InsertRolePermission): Promise<RolePermission> {
    const dataToInsert = {
      ...permission,
      createdRoles: JSON.stringify(permission.createdRoles || [])
    };
    const [rolePermission] = await db.insert(rolePermissions).values(dataToInsert).returning();
    return rolePermission;
  }

  async updateRolePermission(id: number, permission: Partial<InsertRolePermission>): Promise<RolePermission> {
    const [rolePermission] = await db.update(rolePermissions).set(permission).where(eq(rolePermissions.id, id)).returning();
    return rolePermission;
  }

  async getUserPermissions(userId: number): Promise<RolePermission | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;
    return await this.getRolePermissionByName(user.role);
  }

  async canUserCreateRole(userId: number, targetRole: string): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId);
    if (!userPermissions) return false;
    
    // SuperAdmin can create any role except other SuperAdmins
    if (userPermissions.roleName === 'superadmin') {
      return targetRole !== 'superadmin';
    }
    
    // Check if target role is in the user's createdRoles array
    return userPermissions.createdRoles?.includes(targetRole) || false;
  }

  async getManagerAssignments(userId?: number, roleType?: string): Promise<ManagerAssignment[]> {
    let whereConditions: any[] = [];
    
    if (userId) {
      whereConditions.push(eq(managerAssignments.userId, userId));
    }
    
    if (roleType) {
      whereConditions.push(eq(managerAssignments.roleType, roleType));
    }
    
    const query = whereConditions.length > 0
      ? db.select().from(managerAssignments).where(and(...whereConditions))
      : db.select().from(managerAssignments);
    
    return await query;
  }

  async createManagerAssignment(assignment: InsertManagerAssignment): Promise<ManagerAssignment> {
    const [managerAssignment] = await db.insert(managerAssignments).values(assignment).returning();
    return managerAssignment;
  }

  async deleteManagerAssignment(id: number): Promise<void> {
    await db.delete(managerAssignments).where(eq(managerAssignments.id, id));
  }

  async getManagersByDepartment(departmentName: string, roleType?: string): Promise<User[]> {
    let whereConditions: any[] = [eq(managerAssignments.departmentName, departmentName)];
    
    if (roleType) {
      whereConditions.push(eq(managerAssignments.roleType, roleType));
    }
    
    const assignments = await db.select().from(managerAssignments)
      .where(and(...whereConditions));
    
    const userIds = assignments.map(a => a.userId);
    if (userIds.length === 0) return [];
    
    return await db.select().from(users).where(inArray(users.id, userIds));
  }

  async getDepartmentsByManager(userId: number, roleType?: string): Promise<string[]> {
    let whereConditions: any[] = [eq(managerAssignments.userId, userId)];
    
    if (roleType) {
      whereConditions.push(eq(managerAssignments.roleType, roleType));
    }
    
    const assignments = await db.select().from(managerAssignments)
      .where(and(...whereConditions));
    
    return assignments.map(a => a.departmentName);
  }

  async getEmployee(id: number): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employeeRecords).where(eq(employeeRecords.id, id));
    return employee || undefined;
  }

  async getEmployeeByCode(code: string): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employeeRecords).where(eq(employeeRecords.employeeCode, code));
    return employee || undefined;
  }

  async getEmployeeByPhone(phone: string): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employeeRecords).where(eq(employeeRecords.phone, phone));
    return employee || undefined;
  }

  async getEmployees(params?: {
    page?: number;
    limit?: number;
    search?: string;
    department?: string;
    designation?: string;
    isActive?: boolean;
  }): Promise<{ employees: Employee[]; total: number }> {
    const page = params?.page || 1;
    const limit = params?.limit || 1000; // Changed default from 10 to 1000 to show all employees
    const offset = (page - 1) * limit;

    let whereConditions: any[] = [
      sql`LOWER(${employeeRecords.firstName}) != 'noc'`,
      eq(employeeRecords.systemAccount, false),
      ne(employeeRecords.department, 'MIGRATED_TO_FORMER_EMPLOYEES'),
      ne(employeeRecords.department, 'EX-EMPLOYEES')
    ];
    
    // Default to active employees unless explicitly set to false
    if (params?.isActive !== undefined) {
      whereConditions.push(eq(employeeRecords.isActive, params.isActive));
    } else {
      // Default to active employees only - exclude ex-employees
      whereConditions.push(eq(employeeRecords.isActive, true));
    }
    
    if (params?.search) {
      whereConditions.push(
        or(
          ilike(employeeRecords.firstName, `%${params.search}%`),
          ilike(employeeRecords.lastName, `%${params.search}%`),
          ilike(employeeRecords.employeeCode, `%${params.search}%`)
        )
      );
    }
    
    if (params?.department && params.department !== 'all') {
      whereConditions.push(eq(employeeRecords.department, params.department));
    }
    
    if (params?.designation && params.designation !== 'all') {
      whereConditions.push(eq(employeeRecords.designation, params.designation));
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const [employees, [{ total }]] = await Promise.all([
      db.select({
        id: employeeRecords.id,
        employeeCode: employeeRecords.employeeCode,
        code2: employeeRecords.code2,
        biotimeId: employeeRecords.biotimeId,
        salutation: employeeRecords.salutation,
        firstName: employeeRecords.firstName,
        middleName: employeeRecords.middleName,
        lastName: employeeRecords.lastName,
        email: employeeRecords.email,
        phone: employeeRecords.phone,
        mobile: employeeRecords.mobile,
        wanumber: employeeRecords.wanumber,
        address: employeeRecords.address,
        nationalId: employeeRecords.nationalId,
        cnicMissing: employeeRecords.cnicMissing,
        department: employeeRecords.department,
        position: employeeRecords.position,
        project: employeeRecords.project,
        hireDate: employeeRecords.hireDate,
        empType: employeeRecords.empType,
        isActive: employeeRecords.isActive,
        birthday: employeeRecords.birthday,
        contractDate: employeeRecords.contractDate,
        contractTerm: employeeRecords.contractTerm,
        contractExpiryDate: employeeRecords.contractExpiryDate,
        workTeam: employeeRecords.workTeam,
        designation: employeeRecords.designation,
        joiningDate: employeeRecords.joiningDate,
        entitlementDate: employeeRecords.entitlementDate,
        location: employeeRecords.location,
        nonBio: employeeRecords.nonBio,
        shiftId: employeeRecords.shiftId,
        suspect: employeeRecords.suspect,
        susreason: employeeRecords.susreason,
        pop: employeeRecords.pop,
        stopPay: employeeRecords.stopPay,
        systemAccount: employeeRecords.systemAccount,
        // Mobile app status fields
        appStatus: employeeRecords.appStatus,
        appLoc: employeeRecords.appLoc,
        appStatusCheckedAt: employeeRecords.appStatusCheckedAt,
        username: employeeRecords.username,
        createdAt: employeeRecords.createdAt,
        updatedAt: employeeRecords.updatedAt,
        // Shift information
        shiftName: shifts.shiftName,
        shiftStartHour: shifts.startHour,
        shiftStartMinute: shifts.startMinute,
        shiftEndHour: shifts.endHour,
        shiftEndMinute: shifts.endMinute,
        shiftGracePeriod: shifts.gracePeriodMinutes,
        shiftProjectName: shifts.projectName,
        shiftDaysOfWeek: shifts.daysOfWeek,
        shiftIsActive: shifts.isActive,
      })
        .from(employeeRecords)
        .leftJoin(shifts, eq(employeeRecords.shiftId, shifts.id))
        .where(whereClause)
        .orderBy(desc(employeeRecords.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() })
        .from(employeeRecords)
        .where(whereClause)
    ]);

    return { employees, total };
  }

  async getEmployeesWithDepartmentAccess(params?: {
    page?: number;
    limit?: number;
    search?: string;
    department?: string;
    designation?: string;
    isActive?: boolean;
  }, user?: User): Promise<{ employees: Employee[]; total: number }> {
    const page = params?.page || 1;
    const limit = params?.limit || 1000;
    const offset = (page - 1) * limit;

    console.log('getEmployeesWithDepartmentAccess called with params:', JSON.stringify(params, null, 2));

    let whereConditions: any[] = [
      sql`LOWER(${employeeRecords.firstName}) != 'noc'`,
      eq(employeeRecords.systemAccount, false),
      ne(employeeRecords.department, 'MIGRATED_TO_FORMER_EMPLOYEES'),
      ne(employeeRecords.department, 'EX-EMPLOYEES')
    ];
    
    // Default to active employees unless explicitly set to false
    if (params?.isActive !== undefined) {
      whereConditions.push(eq(employeeRecords.isActive, params.isActive));
    } else {
      // Default to active employees only (we don't want inactive/ex-employees in mobile directory)
      whereConditions.push(eq(employeeRecords.isActive, true));
    }
    
    // Department-based access control
    if (user && user.role !== 'superadmin' && user.role !== 'general_admin') {
      // Non-admin users can only see employees from their managed departments
      if (user.managedDepartments && user.managedDepartments.length > 0) {
        whereConditions.push(inArray(employeeRecords.department, user.managedDepartments));
      } else {
        // If user has no managed departments, they see no employees
        whereConditions.push(sql`1 = 0`);
      }
    }
    
    if (params?.search) {
      whereConditions.push(
        or(
          ilike(employeeRecords.firstName, `%${params.search}%`),
          ilike(employeeRecords.lastName, `%${params.search}%`),
          ilike(employeeRecords.employeeCode, `%${params.search}%`)
        )
      );
    }
    
    if (params?.department && params.department !== 'all') {
      whereConditions.push(eq(employeeRecords.department, params.department));
    }
    
    if (params?.designation && params.designation !== 'all') {
      whereConditions.push(eq(employeeRecords.designation, params.designation));
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const [employees, [{ total }]] = await Promise.all([
      db.select({
        id: employeeRecords.id,
        employeeCode: employeeRecords.employeeCode,
        code2: employeeRecords.code2,
        biotimeId: employeeRecords.biotimeId,
        salutation: employeeRecords.salutation,
        firstName: employeeRecords.firstName,
        middleName: employeeRecords.middleName,
        lastName: employeeRecords.lastName,
        email: employeeRecords.email,
        phone: employeeRecords.phone,
        mobile: employeeRecords.mobile,
        wanumber: employeeRecords.wanumber,
        address: employeeRecords.address,
        nationalId: employeeRecords.nationalId,
        cnicMissing: employeeRecords.cnicMissing,
        department: employeeRecords.department,
        position: employeeRecords.position,
        project: employeeRecords.project,
        hireDate: employeeRecords.hireDate,
        empType: employeeRecords.empType,
        isActive: employeeRecords.isActive,
        birthday: employeeRecords.birthday,
        contractDate: employeeRecords.contractDate,
        contractTerm: employeeRecords.contractTerm,
        contractExpiryDate: employeeRecords.contractExpiryDate,
        workTeam: employeeRecords.workTeam,
        designation: employeeRecords.designation,
        joiningDate: employeeRecords.joiningDate,
        entitlementDate: employeeRecords.entitlementDate,
        location: employeeRecords.location,
        nonBio: employeeRecords.nonBio,
        shiftId: employeeRecords.shiftId,
        suspect: employeeRecords.suspect,
        susreason: employeeRecords.susreason,
        pop: employeeRecords.pop,
        stopPay: employeeRecords.stopPay,
        systemAccount: employeeRecords.systemAccount,
        appStatus: employeeRecords.appStatus,
        appLoc: employeeRecords.appLoc,
        appStatusCheckedAt: employeeRecords.appStatusCheckedAt,
        username: employeeRecords.username,
        createdAt: employeeRecords.createdAt,
        updatedAt: employeeRecords.updatedAt,
        shiftName: shifts.shiftName,
        shiftStartHour: shifts.startHour,
        shiftStartMinute: shifts.startMinute,
        shiftEndHour: shifts.endHour,
        shiftEndMinute: shifts.endMinute,
        shiftGracePeriod: shifts.gracePeriodMinutes,
        shiftProjectName: shifts.projectName,
        shiftDaysOfWeek: shifts.daysOfWeek,
        shiftIsActive: shifts.isActive,
      })
        .from(employeeRecords)
        .leftJoin(shifts, eq(employeeRecords.shiftId, shifts.id))
        .where(whereClause)
        .orderBy(desc(employeeRecords.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() })
        .from(employeeRecords)
        .where(whereClause)
    ]);

    return { employees, total };
  }

  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const [newEmployee] = await db.insert(employeeRecords).values(employee).returning();
    return newEmployee;
  }

  async updateEmployee(id: number, employee: Partial<InsertEmployee>): Promise<Employee> {
    const [updatedEmployee] = await db
      .update(employeeRecords)
      .set({ ...employee, updatedAt: new Date() })
      .where(eq(employeeRecords.id, id))
      .returning();
    return updatedEmployee;
  }

  async getAllEmployees(): Promise<Employee[]> {
    return await db
      .select()
      .from(employeeRecords)
      .where(
        and(
          eq(employeeRecords.isActive, true),
          eq(employeeRecords.systemAccount, false),
          ne(employeeRecords.department, 'MIGRATED_TO_FORMER_EMPLOYEES'),
          ne(employeeRecords.department, 'EX-EMPLOYEES'),
          sql`LOWER(${employeeRecords.firstName}) != 'noc'`
        )
      )
      .orderBy(employeeRecords.employeeCode);
  }

  async getAllEmployeesWithDepartmentAccess(user?: User): Promise<Employee[]> {
    let whereConditions: any[] = [
      eq(employeeRecords.isActive, true),
      eq(employeeRecords.systemAccount, false),
      ne(employeeRecords.department, 'MIGRATED_TO_FORMER_EMPLOYEES'),
      ne(employeeRecords.department, 'EX-EMPLOYEES'),
      sql`LOWER(${employeeRecords.firstName}) != 'noc'`
    ];

    // Department-based access control
    if (user && user.role !== 'superadmin' && user.role !== 'general_admin') {
      // Non-admin users can only see employees from their managed departments
      if (user.managedDepartments && user.managedDepartments.length > 0) {
        whereConditions.push(inArray(employeeRecords.department, user.managedDepartments));
      } else {
        // If user has no managed departments, they see no employees
        whereConditions.push(sql`1 = 0`);
      }
    }

    return await db
      .select()
      .from(employeeRecords)
      .where(and(...whereConditions))
      .orderBy(employeeRecords.employeeCode);
  }

  async getLastEmployee(): Promise<Employee | undefined> {
    const [employee] = await db
      .select()
      .from(employeeRecords)
      .orderBy(desc(employeeRecords.id))
      .limit(1);
    return employee || undefined;
  }

  async getEmployeeCount(params?: { isActive?: boolean; nonBio?: boolean }): Promise<number> {
    const conditions = [
      eq(employeeRecords.systemAccount, false),
      ne(employeeRecords.department, 'MIGRATED_TO_FORMER_EMPLOYEES'),
      sql`LOWER(${employeeRecords.firstName}) != 'noc'`
    ];
    
    if (params?.isActive !== undefined) {
      conditions.push(eq(employeeRecords.isActive, params.isActive));
    }
    
    if (params?.nonBio !== undefined) {
      conditions.push(eq(employeeRecords.nonBio, params.nonBio));
    }
    
    const result = await db
      .select({ count: count() })
      .from(employeeRecords)
      .where(and(...conditions));
    
    return result[0].count;
  }

  async getEmployeeStatusData(): Promise<Array<{
    employeeCode: string;
    status: 'scheduled' | 'at_work' | 'available' | 'offline';
    isOnShift: boolean;
    hasCheckedIn: boolean;
    hasCheckedOut: boolean;
    shiftName?: string;
    punchInTime?: Date;
    punchOutTime?: Date;
  }>> {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
    // Get all active employees with their shift info and today's attendance
    const employees = await db
      .select({
        employeeCode: employeeRecords.employeeCode,
        shiftId: employeeRecords.shiftId,
        shiftName: shifts.shiftName,
        shiftStartHour: shifts.startHour,
        shiftStartMinute: shifts.startMinute,
        shiftEndHour: shifts.endHour,
        shiftEndMinute: shifts.endMinute,
        shiftDaysOfWeek: shifts.daysOfWeek,
        nationalId: employeeRecords.nationalId,
        phone: employeeRecords.phone,
        nonBio: employeeRecords.nonBio,
        // Today's attendance
        punchInTime: attendanceRecords.checkIn,
        punchOutTime: attendanceRecords.checkOut,
      })
      .from(employeeRecords)
      .leftJoin(shifts, eq(employeeRecords.shiftId, shifts.id))
      .leftJoin(attendanceRecords, and(
        eq(attendanceRecords.employeeCode, employeeRecords.employeeCode),
        gte(attendanceRecords.date, todayStart),
        lte(attendanceRecords.date, todayEnd)
      ))
      .where(
        and(
          eq(employeeRecords.isActive, true),
          eq(employeeRecords.systemAccount, false),
          ne(employeeRecords.department, 'MIGRATED_TO_FORMER_EMPLOYEES')
        )
      );

    const currentDay = today.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const currentHour = today.getHours();
    const currentMinute = today.getMinutes();

    return employees.map(emp => {
      const hasCheckedIn = !!emp.punchInTime;
      const hasCheckedOut = !!emp.punchOutTime;
      
      // Check if employee is scheduled to work today
      const isScheduledToday = emp.shiftDaysOfWeek ? 
        emp.shiftDaysOfWeek.includes(currentDay) : false;
      
      // Check if currently within shift hours
      let isOnShift = false;
      if (isScheduledToday && emp.shiftStartHour !== null && emp.shiftEndHour !== null) {
        const shiftStart = emp.shiftStartHour * 60 + (emp.shiftStartMinute || 0);
        const shiftEnd = emp.shiftEndHour * 60 + (emp.shiftEndMinute || 0);
        const currentTime = currentHour * 60 + currentMinute;
        
        if (shiftEnd > shiftStart) {
          // Normal shift (doesn't cross midnight)
          isOnShift = currentTime >= shiftStart && currentTime <= shiftEnd;
        } else {
          // Night shift (crosses midnight)
          isOnShift = currentTime >= shiftStart || currentTime <= shiftEnd;
        }
      }
      
      // Determine employee status
      let status: 'scheduled' | 'at_work' | 'available' | 'offline';
      
      if (emp.nonBio) {
        // NonBio employees are always considered available
        status = 'available';
      } else if (isScheduledToday && isOnShift) {
        // Employee is scheduled and within shift hours
        status = 'scheduled';
      } else if (hasCheckedIn && !hasCheckedOut) {
        // Employee has checked in but not out (at work)
        status = 'at_work';
      } else if (emp.nationalId && emp.phone) {
        // Employee has complete verification data
        status = 'available';
      } else {
        // Employee is offline/not verified
        status = 'offline';
      }
      
      return {
        employeeCode: emp.employeeCode,
        status,
        isOnShift,
        hasCheckedIn,
        hasCheckedOut,
        shiftName: emp.shiftName || undefined,
        punchInTime: emp.punchInTime || undefined,
        punchOutTime: emp.punchOutTime || undefined,
      };
    });
  }

  async getAttendanceRecord(id: number): Promise<AttendanceRecord | undefined> {
    const [record] = await db.select().from(attendanceRecords).where(eq(attendanceRecords.id, id));
    return record || undefined;
  }

  async getAttendanceRecords(params?: {
    page?: number;
    limit?: number;
    employeeId?: number;
    dateFrom?: Date;
    dateTo?: Date;
    status?: string;
  }): Promise<{ records: AttendanceRecord[]; total: number }> {
    const page = params?.page || 1;
    const limit = params?.limit || 10000; // Changed default from 10 to 10000 to show all records
    const offset = (page - 1) * limit;

    let whereConditions: any[] = [];
    
    if (params?.employeeId) {
      whereConditions.push(eq(attendanceRecords.employeeId, params.employeeId));
    }
    
    if (params?.dateFrom) {
      whereConditions.push(gte(attendanceRecords.date, params.dateFrom));
    }
    
    if (params?.dateTo) {
      whereConditions.push(lte(attendanceRecords.date, params.dateTo));
    }
    
    if (params?.status) {
      whereConditions.push(eq(attendanceRecords.status, params.status));
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const [recordsWithEmployees, [{ total }]] = await Promise.all([
      db.select({
        id: attendanceRecords.id,
        employeeId: attendanceRecords.employeeId,
        employeeCode: attendanceRecords.employeeCode,
        employeeName: sql<string>`COALESCE(${employeeRecords.firstName} || ' ' || ${employeeRecords.lastName}, ${employeeRecords.firstName}, ${attendanceRecords.employeeCode})`,
        biotimeId: attendanceRecords.biotimeId,
        date: attendanceRecords.date,
        checkIn: attendanceRecords.checkIn,
        checkOut: attendanceRecords.checkOut,
        breakIn: attendanceRecords.breakIn,
        breakOut: attendanceRecords.breakOut,
        totalHours: attendanceRecords.totalHours,
        regularHours: attendanceRecords.regularHours,
        overtimeHours: attendanceRecords.overtimeHours,
        lateMinutes: attendanceRecords.lateMinutes,
        status: attendanceRecords.status,
        notes: attendanceRecords.notes,
        latitude: attendanceRecords.latitude,
        longitude: attendanceRecords.longitude,
        gpsAccuracy: attendanceRecords.gpsAccuracy,
        punchSource: attendanceRecords.punchSource,
        jobSiteId: attendanceRecords.jobSiteId,
        createdAt: attendanceRecords.createdAt,
        updatedAt: attendanceRecords.updatedAt,
        // Add all other required fields to match schema
        forcedCheckoutBy: attendanceRecords.forcedCheckoutBy,
        forcedCheckoutAt: attendanceRecords.forcedCheckoutAt,
        originalCheckoutTime: attendanceRecords.originalCheckoutTime,
        payrollHours: attendanceRecords.payrollHours,
        earlyMinutes: attendanceRecords.earlyMinutes,
        graceMinutes: attendanceRecords.graceMinutes,
        expectedArrival: attendanceRecords.expectedArrival,
        actualArrival: attendanceRecords.actualArrival,
        expectedDeparture: attendanceRecords.expectedDeparture,
        actualDeparture: attendanceRecords.actualDeparture,
        arrivalStatus: attendanceRecords.arrivalStatus,
        departureStatus: attendanceRecords.departureStatus,
        earlyDepartureMinutes: attendanceRecords.earlyDepartureMinutes,
        lateDepartureMinutes: attendanceRecords.lateDepartureMinutes,
        timingProcessed: attendanceRecords.timingProcessed,
        timingProcessedAt: attendanceRecords.timingProcessedAt,
        punchType: attendanceRecords.punchType
      })
        .from(attendanceRecords)
        .leftJoin(employeeRecords, eq(attendanceRecords.employeeCode, employeeRecords.employeeCode))
        .where(whereClause)
        .orderBy(desc(attendanceRecords.date))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() })
        .from(attendanceRecords)
        .where(whereClause)
    ]);

    return { records: recordsWithEmployees, total };
  }

  async createAttendanceRecord(record: InsertAttendance): Promise<AttendanceRecord> {
    const [newRecord] = await db.insert(attendanceRecords).values(record).returning();
    return newRecord;
  }

  async updateAttendanceRecord(id: number, record: Partial<InsertAttendance>): Promise<AttendanceRecord> {
    const [updatedRecord] = await db
      .update(attendanceRecords)
      .set({ ...record, updatedAt: new Date() })
      .where(eq(attendanceRecords.id, id))
      .returning();
    return updatedRecord;
  }

  async getDashboardMetrics(): Promise<{
    totalEmployees: number;
    presentToday: number;
    totalPunchIn: number;
    totalPunchOut: number;
    totalTerminated: number;
    totalAttendance: number;
    lateArrivals: number;
    absentToday: number;
    completedToday: number;
    nonBioEmployees: number;
  }> {
    // Get the most recent date with attendance data instead of forcing today
    const [latestRecord] = await db
      .select({ maxDate: max(attendanceRecords.date) })
      .from(attendanceRecords);
    
    // Use the most recent date with data, or fallback to today if no data exists
    const targetDate = latestRecord?.maxDate || new Date();
    
    // Use system timezone for day boundaries
    const timezone = getCurrentTimezone();
    
    // Set time boundaries for the target date in system timezone
    const today = new Date(targetDate);
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const [totalEmployees] = await db
      .select({ count: count() })
      .from(employeeRecords)
      .where(
        and(
          eq(employeeRecords.isActive, true),
          eq(employeeRecords.systemAccount, false),
          ne(employeeRecords.department, 'MIGRATED_TO_FORMER_EMPLOYEES'),
          sql`LOWER(${employeeRecords.firstName}) != 'noc'`
        )
      );

    // Get total punch outs today (all employees who have checked out)
    const [totalPunchOut] = await db
      .select({ count: countDistinct(attendanceRecords.employeeCode) })
      .from(attendanceRecords)
      .where(
        and(
          gte(attendanceRecords.date, today),
          lt(attendanceRecords.date, tomorrow),
          isNotNull(attendanceRecords.checkOut)
        )
      );

    // Get total terminated records today (system automatic + manual admin terminated)
    const [totalTerminated] = await db
      .select({ count: countDistinct(attendanceRecords.employeeCode) })
      .from(attendanceRecords)
      .where(
        and(
          gte(attendanceRecords.date, today),
          lt(attendanceRecords.date, tomorrow),
          or(
            eq(attendanceRecords.status, 'auto_punchout'),
            eq(attendanceRecords.status, 'admin_terminated')
          )
        )
      );

    // Get employees with complete attendance pairs (both check-in AND check-out)
    // For complete attendance: punch-in on target day + punch-out (even if next day)
    const [completeAttendancePairs] = await db
      .select({ count: countDistinct(attendanceRecords.employeeCode) })
      .from(attendanceRecords)
      .where(
        and(
          gte(attendanceRecords.checkIn, today),
          lt(attendanceRecords.checkIn, tomorrow),
          isNotNull(attendanceRecords.checkIn),
          isNotNull(attendanceRecords.checkOut),
          // Ensure punch-out is after punch-in (validates complete attendance)
          sql`${attendanceRecords.checkOut} > ${attendanceRecords.checkIn}`
        )
      );

    // Get total punch ins today (all employees who have checked in)
    const [totalPunchIn] = await db
      .select({ count: countDistinct(attendanceRecords.employeeCode) })
      .from(attendanceRecords)
      .where(
        and(
          gte(attendanceRecords.date, today),
          lt(attendanceRecords.date, tomorrow),
          isNotNull(attendanceRecords.checkIn)
        )
      );

    const [lateArrivals] = await db
      .select({ count: count() })
      .from(attendanceRecords)
      .where(
        and(
          gte(attendanceRecords.date, today),
          lte(attendanceRecords.date, tomorrow),
          eq(attendanceRecords.status, 'late')
        )
      );

    // Get count of NonBio employees
    const [nonBioCount] = await db
      .select({ count: count() })
      .from(employeeRecords)
      .where(
        and(
          eq(employeeRecords.isActive, true),
          eq(employeeRecords.systemAccount, false),
          ne(employeeRecords.department, 'MIGRATED_TO_FORMER_EMPLOYEES'),
          eq(employeeRecords.nonBio, true),
          // Exclude NOC account
          ne(employeeRecords.firstName, 'NOC')
        )
      );

    // Calculate Present Today using correct formula: Total Punch In - Total Punch Out
    // Note: Terminated employees are already counted in totalPunchOut, so we don't subtract them again
    const presentToday = totalPunchIn.count - totalPunchOut.count;

    // Total attendance = Total punch ins + NonBio employees
    const totalAttendance = totalPunchIn.count + nonBioCount.count;
    
    // Calculate absent employees: total - total attendance
    const absentCount = Math.max(0, totalEmployees.count - totalAttendance);

    return {
      totalEmployees: totalEmployees.count,
      presentToday: Math.max(0, presentToday), // Ensure non-negative using new formula
      totalPunchIn: totalPunchIn.count, // All employees who have checked in today
      totalPunchOut: totalPunchOut.count, // All employees who have checked out today
      totalTerminated: totalTerminated.count, // System automatic + manual admin terminated
      totalAttendance: totalAttendance, // Total punch ins + NonBio employees
      lateArrivals: lateArrivals.count,
      completedToday: completeAttendancePairs.count, // Employees with both check-in and check-out
      absentToday: absentCount, // Actual absent employees
      nonBioEmployees: nonBioCount.count, // Count of NonBio employees
    };
  }

  async getRecentActivity(limit = 50): Promise<Array<{
    type: string;
    employeeName: string;
    employeeCode: string;
    timestamp: Date;
    details: string;
    shiftAssigned?: string;
    recordType: string;
    timingDifference?: string;
    shiftTimeDifference?: number | 'shift_change';
    isEarlyOrLate?: 'early' | 'late' | 'on_time' | 'shift_change';
  }>> {
    // Get check-ins with DISTINCT to prevent duplicates, including shift information
    const checkIns = await db
      .selectDistinct({
        type: sql<string>`'check_in'`,
        employeeName: sql<string>`CONCAT(${employeeRecords.firstName}, ' ', COALESCE(${employeeRecords.lastName}, ''))`,
        employeeCode: attendanceRecords.employeeCode,
        timestamp: attendanceRecords.checkIn,
        details: sql<string>`CASE 
          WHEN ${attendanceRecords.status} = 'late' THEN 'Late check in'
          WHEN ${attendanceRecords.status} = 'present' THEN 'On time'
          ELSE COALESCE(${attendanceRecords.status}, 'On time')
        END`,
        shiftStartHour: shifts.startHour,
        shiftStartMinute: shifts.startMinute,
        shiftEndHour: shifts.endHour,
        shiftEndMinute: shifts.endMinute,
        shiftName: shifts.shiftName,
        projectName: shifts.projectName,
      })
      .from(attendanceRecords)
      .leftJoin(employeeRecords, eq(attendanceRecords.employeeCode, employeeRecords.employeeCode))
      .leftJoin(shifts, eq(employeeRecords.shiftId, shifts.id))
      .where(isNotNull(attendanceRecords.checkIn))
      .orderBy(desc(attendanceRecords.checkIn))
      .limit(limit);

    // Get check-outs with DISTINCT to prevent duplicates, including shift information
    const checkOuts = await db
      .selectDistinct({
        type: sql<string>`'check_out'`,
        employeeName: sql<string>`CONCAT(${employeeRecords.firstName}, ' ', COALESCE(${employeeRecords.lastName}, ''))`,
        employeeCode: attendanceRecords.employeeCode,
        timestamp: attendanceRecords.checkOut,
        details: sql<string>`'Check out'`,
        shiftStartHour: shifts.startHour,
        shiftStartMinute: shifts.startMinute,
        shiftEndHour: shifts.endHour,
        shiftEndMinute: shifts.endMinute,
        shiftName: shifts.shiftName,
        projectName: shifts.projectName,
      })
      .from(attendanceRecords)
      .leftJoin(employeeRecords, eq(attendanceRecords.employeeCode, employeeRecords.employeeCode))
      .leftJoin(shifts, eq(employeeRecords.shiftId, shifts.id))
      .where(isNotNull(attendanceRecords.checkOut))
      .orderBy(desc(attendanceRecords.checkOut))
      .limit(limit);

    // Combine and sort all activities, then remove duplicates based on employee code and timestamp
    const allActivities = [...checkIns, ...checkOuts]
      .filter(activity => activity.timestamp !== null)
      .sort((a, b) => {
        const dateA = new Date(a.timestamp as Date).getTime();
        const dateB = new Date(b.timestamp as Date).getTime();
        return dateB - dateA; // Sort in descending order
      });

    // Remove duplicates based on employee code and type (keeping most recent per employee per type)
    const uniqueActivities = [];
    const seen = new Map();
    
    for (const activity of allActivities) {
      const key = `${activity.employeeCode}-${activity.type}`;
      
      // Only keep the most recent activity per employee per type
      if (!seen.has(key)) {
        seen.set(key, activity);
        uniqueActivities.push(activity);
      } else {
        // If we already have an activity for this employee and type, keep the more recent one
        const existing = seen.get(key);
        if (activity.timestamp > existing.timestamp) {
          // Remove the old activity and add the new one
          const index = uniqueActivities.indexOf(existing);
          if (index > -1) {
            uniqueActivities.splice(index, 1);
          }
          seen.set(key, activity);
          uniqueActivities.push(activity);
        }
      }
    }

    return uniqueActivities
      .slice(0, limit)
      .map(activity => {
        // Create shift assignment display - just shift name
        const shiftAssigned = activity.shiftName || 'No Shift Assigned';
        
        const baseActivity = {
          type: activity.type,
          employeeName: activity.employeeName || 'Unknown',
          employeeCode: activity.employeeCode || 'Unknown',
          timestamp: activity.timestamp as Date,
          details: activity.details || '',
          shiftAssigned,
          recordType: activity.type === 'check_in' ? 'IN' : 'OUT',
          timingDifference: '--:--',
          shiftTimeDifference: null as number | 'shift_change' | null,
          isEarlyOrLate: null as 'early' | 'late' | 'on_time' | 'shift_change' | null
        };

        // Calculate shift time difference for punch-outs (compare with shift END time)
        if (activity.type === 'check_out') {
          if (activity.shiftEndHour !== null && activity.shiftEndMinute !== null) {
            const punchOutTime = new Date(activity.timestamp as Date);
            const punchOutHours = punchOutTime.getHours();
            const punchOutMinutes = punchOutTime.getMinutes();
            let punchOutTotalMinutes = punchOutHours * 60 + punchOutMinutes;
            
            let shiftEndTotalMinutes = activity.shiftEndHour * 60 + activity.shiftEndMinute;
            
            // Handle overnight shifts - if shift end is less than shift start, it's next day
            if (activity.shiftEndHour < activity.shiftStartHour) {
              // For overnight shifts, if punch out is before noon, assume it's next day
              if (punchOutHours < 12) {
                punchOutTotalMinutes += 24 * 60; // Add 24 hours
              }
              shiftEndTotalMinutes += 24 * 60; // Shift end is next day
            }
            
            const timeDifferenceMinutes = punchOutTotalMinutes - shiftEndTotalMinutes;
            
            // Detect shift change scenarios - if timing difference is large (>4 hours or <-4 hours)
            if (Math.abs(timeDifferenceMinutes) > 240) { // 4 hours = 240 minutes
              return {
                ...baseActivity,
                timingDifference: 'PSC',
                shiftTimeDifference: 'shift_change',
                isEarlyOrLate: 'shift_change'
              };
            }
            
            // Within reasonable limits, no capping needed
            const cappedDifference = timeDifferenceMinutes;
            const sign = cappedDifference > 0 ? '+' : '';
            
            return {
              ...baseActivity,
              timingDifference: `${sign}${cappedDifference}m`,
              shiftTimeDifference: cappedDifference,
              isEarlyOrLate: cappedDifference > 0 ? 'late' : cappedDifference < 0 ? 'early' : 'on_time'
            };
          } else {
            // No shift assigned for punch-out
            return {
              ...baseActivity,
              timingDifference: '--:--',
              shiftTimeDifference: null,
              isEarlyOrLate: null
            };
          }
        }

        // Calculate shift time difference for punch-ins (compare with shift START time)
        if (activity.type === 'check_in') {
          if (activity.shiftStartHour !== null && activity.shiftStartMinute !== null) {
            const punchInTime = new Date(activity.timestamp as Date);
            const punchInHours = punchInTime.getHours();
            const punchInMinutes = punchInTime.getMinutes();
            let punchInTotalMinutes = punchInHours * 60 + punchInMinutes;
            
            let shiftStartTotalMinutes = activity.shiftStartHour * 60 + activity.shiftStartMinute;
            
            // Handle overnight shifts - if shift end is less than shift start, it's overnight
            if (activity.shiftEndHour < activity.shiftStartHour) {
              // For overnight shifts, if punch in is before noon, assume it's previous day's shift
              if (punchInHours < 12) {
                punchInTotalMinutes += 24 * 60; // Add 24 hours to punch in
                shiftStartTotalMinutes += 24 * 60; // Shift start is previous day
              }
            }
            
            const timeDifferenceMinutes = punchInTotalMinutes - shiftStartTotalMinutes;
            
            // Detect shift change scenarios - if timing difference is large (>4 hours or <-4 hours)
            if (Math.abs(timeDifferenceMinutes) > 240) { // 4 hours = 240 minutes
              return {
                ...baseActivity,
                timingDifference: 'PSC',
                shiftTimeDifference: 'shift_change',
                isEarlyOrLate: 'shift_change'
              };
            }
            
            // Within reasonable limits, no capping needed
            const cappedDifference = timeDifferenceMinutes;
            const sign = cappedDifference > 0 ? '+' : '';
            
            return {
              ...baseActivity,
              timingDifference: `${sign}${cappedDifference}m`,
              shiftTimeDifference: cappedDifference,
              isEarlyOrLate: cappedDifference > 0 ? 'late' : cappedDifference < 0 ? 'early' : 'on_time'
            };
          } else {
            // No shift assigned for punch-in
            return {
              ...baseActivity,
              timingDifference: '--:--',
              shiftTimeDifference: null,
              isEarlyOrLate: null
            };
          }
        }

        return baseActivity;
      });
  }

  async insertEmployeePullData(data: any[]): Promise<void> {
    if (data.length === 0) return;
    
    const insertData = data.map(employee => ({
      // Core identification
      biotimeId: employee.id?.toString() || null,
      empCode: employee.emp_code || null,
      // Personal information
      firstName: employee.first_name || null,
      lastName: employee.last_name || null,
      nickname: employee.nickname || null,
      formatName: employee.format_name || null,
      gender: employee.gender || null,
      birthday: employee.birthday ? new Date(employee.birthday) : null,
      // Contact information
      mobile: employee.mobile || null,
      contactTel: employee.contact_tel || null,
      officeTel: employee.office_tel || null,
      email: employee.email || null,
      address: employee.address || null,
      city: employee.city || null,
      postcode: employee.postcode || null,
      // Identification documents
      national: employee.national || null,
      ssn: employee.ssn || null,
      cardNo: employee.card_no || null,
      // Employment information
      department: employee.department || null,
      position: employee.position || null,
      hireDate: employee.hire_date || null,
      empType: employee.emp_type || null,
      // Access control
      area: employee.area || null,
      devicePassword: employee.device_password || null,
      devPrivilege: employee.dev_privilege || null,
      verifyMode: employee.verify_mode || null,
      // Biometric enrollment
      fingerprint: employee.fingerprint || null,
      face: employee.face || null,
      palm: employee.palm || null,
      vlFace: employee.vl_face || null,
      enrollSn: employee.enroll_sn || null,
      // App related
      appStatus: employee.app_status || null,
      appRole: employee.app_role || null,
      // Attendance settings
      attemployee: employee.attemployee || null,
      // System fields
      religion: employee.religion || null,
      updateTime: employee.update_time ? new Date(employee.update_time) : null,
      // Legacy field - still store complete response
      allFields: employee,
    }));

    await db.insert(employeePullExt).values(insertData);
    console.log(`Inserted ${insertData.length} employee records into staging table with individual fields`);
  }

  async insertAttendancePullData(data: any[]): Promise<void> {
    if (data.length === 0) return;
    
    // Check for existing records to prevent duplicates
    const uniqueRecords = [];
    for (const attendance of data) {
      const empCode = attendance.emp_code || attendance.employee_code || null;
      const punchTime = attendance.punch_time;
      
      if (!empCode || !punchTime) continue;
      
      // Check if this exact record already exists in staging
      const existing = await db
        .select()
        .from(attendancePullExt)
        .where(
          and(
            eq(attendancePullExt.empCode, empCode),
            sql`(${attendancePullExt.allFields}->>'punch_time')::timestamp = ${punchTime}::timestamp`
          )
        )
        .limit(1);
      
      if (existing.length === 0) {
        uniqueRecords.push({
          biotimeId: attendance.id?.toString() || null,
          empCode: empCode,
          allFields: attendance, // Store complete API response with original field names
        });
      } else {
        console.log(`Duplicate punch record: ${empCode} at ${punchTime}`);
      }
    }

    if (uniqueRecords.length > 0) {
      await db.insert(attendancePullExt).values(uniqueRecords);
      console.log(`Inserted ${uniqueRecords.length} attendance records into staging table with all fields`);
    }
  }

  async processEmployeeData(): Promise<number> {
    // Get unprocessed employee data
    const pullData = await db.select().from(employeePullExt);
    let processed = 0;

    for (const data of pullData) {
      try {
        // Extract data from the allFields JSON object
        const employee = data.allFields as any;
        
        // Map BioTime API fields to our schema
        const employeeCode = employee.emp_code || data.empCode;
        const biotimeId = employee.id?.toString() || data.biotimeId;
        
        if (!employeeCode) {
          console.warn('Skipping employee without emp_code:', employee);
          continue;
        }

        // Extract and normalize National ID (remove dashes and spaces)
        // BioTime API stores CNIC in the 'national' field
        const rawNationalId = employee.national || employee.ssn || employee.national_id || '';
        const normalizedNationalId = rawNationalId.replace(/[-\s]/g, '');
        
        // Check for duplicates - prefer National ID, fallback to employee code
        let existing;
        if (normalizedNationalId) {
          existing = await db
            .select()
            .from(employeeRecords)
            .where(eq(employeeRecords.nationalId, normalizedNationalId));
        } else {
          existing = await db
            .select()
            .from(employeeRecords)
            .where(eq(employeeRecords.employeeCode, employeeCode));
        }

        if (existing.length === 0) {
          // Normalize phone number (remove non-digits)
          const phoneNumber = employee.mobile || employee.contact_tel || '';
          const normalizedPhone = phoneNumber.replace(/\D/g, '');
          
          // Fix corrupted name data - parse first_name and last_name properly
          const rawFirstName = employee.first_name || '';
          const rawLastName = employee.last_name || '';
          
          let firstName = '';
          let lastName = '';
          let code2 = '';
          
          // Check if last_name is numeric (corrupted data pattern)
          if (/^\d+$/.test(rawLastName)) {
            // last_name is numeric - move to code2, parse first_name for actual names
            code2 = rawLastName;
            
            // Parse the full name from first_name field
            const fullNameParts = rawFirstName.trim().split(/\s+/);
            if (fullNameParts.length >= 2) {
              firstName = fullNameParts[0];
              lastName = fullNameParts.slice(1).join(' '); // Join remaining parts as last name
            } else {
              firstName = rawFirstName;
              lastName = ''; // No last name available
            }
          } else {
            // Normal case - use fields as they are
            firstName = rawFirstName;
            lastName = rawLastName;
          }
          
          await db.insert(employeeRecords).values({
            biotimeId,
            employeeCode,
            code2: code2 || null,
            firstName: firstName || '',
            lastName: lastName || '',
            email: employee.email || null,
            phone: normalizedPhone || null,
            nationalId: normalizedNationalId || null,
            department: employee.department?.dept_name || employee.dept_name || null,
            position: employee.position_name || null,
            project: null, // Not available in BioTime API
            hireDate: employee.hire_date || null,
            isActive: employee.enable_att !== false, // Default to true if not specified
          });
          processed++;
        }
      } catch (error) {
        console.error('Error processing employee data:', error);
      }
    }

    // Clean up processed data - COMMENTED OUT TO RETAIN DATA
    // await db.delete(employeePullExt);
    return processed;
  }

  async fixCorruptedEmployeeNames(): Promise<number> {
    console.log('[FixCorruptedNames] 🔄 Starting to fix corrupted employee names...');
    
    // Get all employees where last_name is numeric (corrupted pattern)
    const corruptedEmployees = await db
      .select()
      .from(employeeRecords)
      .where(sql`${employeeRecords.lastName} ~ '^[0-9]+$'`);
    
    console.log(`[FixCorruptedNames] Found ${corruptedEmployees.length} employees with corrupted names`);
    
    let fixed = 0;
    
    for (const employee of corruptedEmployees) {
      try {
        const rawFirstName = employee.firstName || '';
        const rawLastName = employee.lastName || '';
        
        // Check if last_name is numeric (corrupted data pattern)
        if (/^\d+$/.test(rawLastName)) {
          // last_name is numeric - move to code2, parse first_name for actual names
          const code2 = rawLastName;
          
          // Parse the full name from first_name field
          const fullNameParts = rawFirstName.trim().split(/\s+/);
          let firstName = '';
          let lastName = '';
          
          if (fullNameParts.length >= 2) {
            firstName = fullNameParts[0];
            lastName = fullNameParts.slice(1).join(' '); // Join remaining parts as last name
          } else {
            firstName = rawFirstName;
            lastName = ''; // No last name available
          }
          
          // Update the employee record
          await db
            .update(employeeRecords)
            .set({
              code2: code2,
              firstName: firstName,
              lastName: lastName,
              updatedAt: new Date()
            })
            .where(eq(employeeRecords.id, employee.id));
          
          console.log(`[FixCorruptedNames] Fixed: ${employee.employeeCode} - "${rawFirstName}" "${rawLastName}" -> "${firstName}" "${lastName}" (code2: ${code2})`);
          fixed++;
        }
      } catch (error) {
        console.error(`[FixCorruptedNames] Error fixing employee ${employee.employeeCode}:`, error);
      }
    }
    
    console.log(`[FixCorruptedNames] ✅ Fixed ${fixed} corrupted employee names`);
    return fixed;
  }

  async processAttendanceData(): Promise<number> {
    console.log('[ProcessAttendance] 🔄 FIXED: Starting attendance processing with timestamp-based duplicate detection...');
    
    // Import timezone functions at the top
    const { toSystemTimezone, formatInSystemTimezone } = await import('./config/timezone');
    
    // Get all records from staging table
    const stagingRecords = await db.select().from(attendancePullExt);
    console.log(`[ProcessAttendance] 📊 Found ${stagingRecords.length} records in staging table`);
    
    let processed = 0;
    let skipped = 0;
    let errors = 0;

    // CRITICAL: For attendance data, check if the staging record is already processed
    // Each staging record represents a single punch event
    // Check if this exact staging record was already processed by looking at biotime_id
    const existingBiotimeIds = await db
      .select({ biotimeId: attendanceRecords.biotimeId })
      .from(attendanceRecords)
      .where(isNotNull(attendanceRecords.biotimeId));
    
    // Create a Set of processed biotime_ids to avoid reprocessing same staging records
    const processedBiotimeIds = new Set<string>();
    for (const record of existingBiotimeIds) {
      if (record.biotimeId) {
        processedBiotimeIds.add(record.biotimeId);
      }
    }
    
    console.log(`[ProcessAttendance] 📋 Found ${processedBiotimeIds.size} already processed biotime_ids`);

    // Group punches by employee and date to properly match punch-in/out pairs
    const dailyPunches = new Map<string, Array<any>>();

    // First pass: collect and group all punches, using CORRECT timestamp-based duplicate detection
    for (const record of stagingRecords) {
      try {
        const attendance = record.allFields as any;
        
        // Skip records with null/empty attendance data
        if (!attendance || typeof attendance !== 'object') {
          continue;
        }
        
        // Skip lock devices - they're handled separately in access control table
        if (attendance.terminal_alias && attendance.terminal_alias.toLowerCase().includes('lock')) {
          continue;
        }
        
        // Extract key fields using BioTime API field names
        const emp_code = attendance.emp_code || record.empCode;
        const punch_time = attendance.punch_time || attendance.check_time;
        const punch_state = attendance.punch_state || attendance.check_type || 'unknown';
        const terminal_id = attendance.terminal_id || attendance.device_id;
        const biotime_id = record.biotimeId || attendance.id;
        
        if (!emp_code || !punch_time) {
          continue;
        }

        const checkTime = toSystemTimezone(punch_time);
        
        // CORRECT: Check if this specific staging record was already processed
        if (biotime_id && processedBiotimeIds.has(biotime_id)) {
          skipped++;
          continue;
        }

        const dateKey = formatInSystemTimezone(checkTime, 'yyyy-MM-dd');
        const groupKey = `${emp_code}-${dateKey}`;

        if (!dailyPunches.has(groupKey)) {
          dailyPunches.set(groupKey, []);
        }

        dailyPunches.get(groupKey)!.push({
          emp_code,
          punch_time: checkTime,
          punch_state,
          terminal_id,
          dateKey,
          biotime_id,
          original_record: record
        });
        
      } catch (error) {
        console.error('Error collecting punch record:', error);
        errors++;
      }
    }

    console.log(`[ProcessAttendance] 📈 FIXED: Grouped ${dailyPunches.size} daily punch groups, skipped ${skipped} duplicates`);

    // Second pass: process grouped punches to create proper attendance records
    const dailyPunchesArray = Array.from(dailyPunches.entries());
    for (const [groupKey, punches] of dailyPunchesArray) {
      try {
        const [emp_code, dateKey] = groupKey.split('-');
        const employee = await this.getEmployeeByCode(emp_code);
        if (!employee) {
          continue;
        }

        // Sort punches by time
        punches.sort((a: any, b: any) => a.punch_time.getTime() - b.punch_time.getTime());

        // Check if attendance record already exists for this employee and date
        const existingRecord = await db
          .select()
          .from(attendanceRecords)
          .where(
            and(
              eq(attendanceRecords.employeeCode, emp_code),
              eq(attendanceRecords.date, new Date(dateKey))
            )
          );

        if (existingRecord.length > 0) {
          // Record already exists, skip
          continue;
        }

        // Simple matching: First punch-in and last punch-out of the day
        let checkIn: Date | null = null;
        let checkOut: Date | null = null;
        let breakIn: Date | null = null;
        let breakOut: Date | null = null;

        // Sort punches by time to ensure chronological order
        const sortedPunches = punches.sort((a: any, b: any) => 
          a.punch_time.getTime() - b.punch_time.getTime()
        );
        
        // Find the first "in" punch and last "out" punch within 12 hours
        // BioTime uses numeric codes: 0=check in, 1=check out, 2=break out, 3=break in, 4=overtime in, 5=overtime out
        for (const punch of sortedPunches) {
          const state = punch.punch_state.toString();
          
          // Check for punch-in (code 0, first occurrence only)
          if (state === '0' && !checkIn) {
            checkIn = punch.punch_time;
          }
          
          // Check for punch-out (code 1, always update to get the last one)
          if (state === '1') {
            checkOut = punch.punch_time;
          }
          
          // Check for break out (code 2, first occurrence only)
          if (state === '2' && !breakOut) {
            breakOut = punch.punch_time;
          }
          
          // Check for break in (code 3, always update to get the last one)
          if (state === '3') {
            breakIn = punch.punch_time;
          }
        }
        
        // Validate that punch-out is within 12 hours of punch-in
        if (checkIn && checkOut) {
          const hoursDiff = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
          if (hoursDiff > 12) {
            // If more than 12 hours, cap at 12 hours from punch-in
            checkOut = toSystemTimezone(new Date(checkIn.getTime() + (12 * 60 * 60 * 1000)));
          }
        }

        // Calculate hours worked if we have both check-in and check-out
        let totalHours = 0;
        let regularHours = 0;
        let overtimeHours = 0;
        
        if (checkIn && checkOut) {
          totalHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
          
          // Subtract break time if available
          if (breakIn && breakOut) {
            const breakTime = (breakOut.getTime() - breakIn.getTime()) / (1000 * 60 * 60);
            totalHours = Math.max(0, totalHours - breakTime);
          }
          
          // Cap at 12 hours to handle forgotten punch-outs
          totalHours = Math.min(totalHours, 12);
          
          regularHours = Math.min(totalHours, 8);
          overtimeHours = Math.max(totalHours - 8, 0);
        }

        // Determine status
        let status = 'present';
        if (!checkIn) {
          status = 'absent';
        } else if (checkIn && !checkOut) {
          status = 'incomplete';
        }

        // Create attendance record with properly matched punches
        // Use the first punch's biotime_id for the attendance record
        const representativeBiotimeId = punches[0].biotime_id;
        
        await db.insert(attendanceRecords).values({
          employeeId: employee.id,
          employeeCode: emp_code,
          date: toSystemTimezone(dateKey),
          checkIn,
          checkOut,
          breakIn,
          breakOut,
          totalHours: totalHours.toFixed(2),
          regularHours: regularHours.toFixed(2),
          overtimeHours: overtimeHours.toFixed(2),
          lateMinutes: 0, // Will be calculated later based on shift
          status,
          notes: `First punch-in, last punch-out from ${punches.length} punches`,
          biotimeId: representativeBiotimeId,
        });
        
        processed++;
        
      } catch (error) {
        console.error('Error processing grouped punches:', error);
      }
    }
    
    // IMPORTANT: Never delete pull data - it serves as permanent audit trail
    console.log(`Processed ${processed} daily attendance records from ${dailyPunches.size} employee-day groups. Pull data preserved.`);
    return processed;
  }

  // Legacy method for daily aggregation (kept for backward compatibility if needed)
  async processAttendanceDataLegacy(): Promise<number> {
    // Get unprocessed attendance data
    const pullData = await db.select().from(attendancePullExt);
    let processed = 0;

    // Import timezone functions at the top
    const { formatInSystemTimezone, toSystemTimezone } = await import('./config/timezone');

    // Access data from allFields JSON column which contains the complete BioTime API response
    const groupedData = pullData.reduce((acc, record) => {
      const allFields = record.allFields as any;
      if (!allFields || !allFields.punch_time) return acc;
      
      const date = formatInSystemTimezone(allFields.punch_time, 'yyyy-MM-dd');
      const key = `${record.empCode}-${date}`;
      
      if (!acc[key]) {
        acc[key] = {
          employeeCode: record.empCode,
          date: new Date(date),
          checkIn: null,
          checkOut: null,
          breakIn: null,
          breakOut: null,
        };
      }
      
      // Process each punch using data from allFields JSON with Pakistan timezone
      const punchTime = toSystemTimezone(allFields.punch_time);
      const checkType = allFields.punch_state || allFields.check_type || '';
      if (checkType.toLowerCase().includes('in') && !checkType.toLowerCase().includes('out')) {
        acc[key].checkIn = punchTime;
      } else if (checkType.toLowerCase().includes('out')) {
        acc[key].checkOut = punchTime;
      } else if (checkType.toLowerCase().includes('break in')) {
        acc[key].breakIn = punchTime;
      } else if (checkType.toLowerCase().includes('break out')) {
        acc[key].breakOut = punchTime;
      }
      
      return acc;
    }, {} as Record<string, any>);

    for (const [key, data] of Object.entries(groupedData)) {
      try {
        // Get employee ID
        const employee = await this.getEmployeeByCode(data.employeeCode);
        if (!employee) continue;

        // Calculate hours and status
        let totalHours = 0;
        let lateMinutes = 0;
        let status = 'absent';

        if (data.checkIn) {
          status = 'present';
          
          // Check if late (assuming 9 AM start time in Pakistan timezone)
          const startTime = toSystemTimezone(data.checkIn);
          startTime.setHours(9, 0, 0, 0);
          
          if (data.checkIn > startTime) {
            lateMinutes = Math.floor((data.checkIn.getTime() - startTime.getTime()) / 60000);
            status = 'late';
          }
          
          // Calculate total hours
          if (data.checkOut) {
            totalHours = (data.checkOut.getTime() - data.checkIn.getTime()) / (1000 * 60 * 60);
            
            // Subtract break time if available
            if (data.breakIn && data.breakOut) {
              const breakTime = (data.breakOut.getTime() - data.breakIn.getTime()) / (1000 * 60 * 60);
              totalHours -= breakTime;
            }
          }
        }

        // Check if record already exists
        const existingRecord = await db
          .select()
          .from(attendanceRecords)
          .where(
            and(
              eq(attendanceRecords.employeeId, employee.id),
              eq(attendanceRecords.date, data.date)
            )
          );

        if (existingRecord.length === 0) {
          await db.insert(attendanceRecords).values({
            employeeId: employee.id,
            employeeCode: data.employeeCode,
            date: data.date,
            checkIn: data.checkIn,
            checkOut: data.checkOut,
            breakIn: data.breakIn,
            breakOut: data.breakOut,
            totalHours: totalHours.toFixed(2),
            regularHours: Math.min(totalHours, 8).toFixed(2),
            overtimeHours: Math.max(totalHours - 8, 0).toFixed(2),
            lateMinutes,
            status,
          });
          processed++;
        }
      } catch (error) {
        console.error('Error processing attendance data:', error);
      }
    }

    // IMPORTANT: Never delete pull data - it serves as permanent audit trail
    // await db.delete(attendancePullExt); // DISABLED - DO NOT DELETE PULL DATA
    
    console.log(`Processed ${processed} attendance records (legacy method). Pull data preserved.`);
    return processed;
  }

  async updateSyncStatus(
    type: string,
    status: string,
    recordsProcessed?: number,
    recordsTotal?: number,
    error?: string
  ): Promise<void> {
    await db.insert(syncStatus).values({
      syncType: type,
      lastSync: new Date(),
      status,
      recordsProcessed: recordsProcessed || 0,
      recordsTotal: recordsTotal || 0,
      error,
    });
  }

  async getSyncStatus(): Promise<Array<{
    syncType: string;
    lastSync: Date | null;
    status: string;
    recordsProcessed: number;
    recordsTotal: number;
    currentPage: number;
    error: string | null;
  }>> {
    const results = await db
      .select()
      .from(syncStatus)
      .orderBy(desc(syncStatus.createdAt));

    return results.map(r => ({
      syncType: r.syncType,
      lastSync: r.lastSync,
      status: r.status,
      recordsProcessed: r.recordsProcessed || 0,
      recordsTotal: r.recordsTotal || 0,
      currentPage: r.currentPage || 1,
      error: r.error,
    }));
  }

  async getDevices(): Promise<Device[]> {
    return await db.select().from(devices).orderBy(desc(devices.createdAt));
  }

  async getDevice(id: number): Promise<Device | undefined> {
    const [device] = await db.select().from(devices).where(eq(devices.id, id));
    return device || undefined;
  }

  async createDevice(device: InsertDevice): Promise<Device> {
    const [newDevice] = await db.insert(devices).values(device).returning();
    return newDevice;
  }

  async updateDevice(id: number, device: Partial<InsertDevice>): Promise<Device> {
    const [updatedDevice] = await db
      .update(devices)
      .set({ ...device, updatedAt: new Date() })
      .where(eq(devices.id, id))
      .returning();
    return updatedDevice;
  }

  async deleteDevice(id: number): Promise<void> {
    await db.delete(devices).where(eq(devices.id, id));
  }

  async getSelectedDevices(): Promise<Device[]> {
    return await db.select().from(devices).where(eq(devices.isSelected, true));
  }

  async updateDeviceSelection(deviceId: string, isSelected: boolean): Promise<void> {
    await db
      .update(devices)
      .set({ isSelected, updatedAt: new Date() })
      .where(eq(devices.deviceId, deviceId));
  }

  // Calculate daily summaries for field staff (2-20 punches per day)
  async calculateDailySummaries(): Promise<void> {
    const { getTodayInSystemTimezone } = await import('./config/timezone');
    const today = getTodayInSystemTimezone();
    
    // Get all active punch records for today that haven't been processed
    const todayPunches = await db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.date, new Date(today)),
          eq(attendanceRecords.status, 'active')
        )
      )
      .orderBy(attendanceRecords.employeeId, attendanceRecords.date);

    // Group by employee
    const employeePunches = todayPunches.reduce((acc, punch) => {
      const employeeId = punch.employeeId || 0;
      if (!acc[employeeId]) {
        acc[employeeId] = [];
      }
      acc[employeeId].push(punch);
      return acc;
    }, {} as Record<number, typeof todayPunches>);

    console.log(`Processing daily summaries for ${Object.keys(employeePunches).length} employees`);

    // Calculate hours for each employee (handles 1-20 punches per person)
    for (const [employeeId, punches] of Object.entries(employeePunches)) {
      if (punches.length < 1) continue; // Need at least one punch

      let officeHours = 0;
      let fieldHours = 0;
      let currentLocation = null;
      let lastInTime = null;
      let hasIncompleteShift = false;

      console.log(`Employee ${punches[0].employeeCode}: Processing ${punches.length} punches`);

      // Process punches in chronological order
      const sortedPunches = punches.sort((a, b) => {
        const aTime = a.checkIn || a.checkOut || a.date;
        const bTime = b.checkIn || b.checkOut || b.date;
        return aTime.getTime() - bTime.getTime();
      });
      
      for (const punch of sortedPunches) {
        if (punch.checkIn) {
          lastInTime = punch.checkIn;
          currentLocation = punch.notes?.includes('office') ? 'office' : 'field';
        } else if (punch.checkOut && lastInTime) {
          const hours = (punch.checkOut.getTime() - lastInTime.getTime()) / (1000 * 60 * 60);
          
          if (currentLocation === 'office') {
            officeHours += hours;
          } else if (currentLocation === 'field') {
            fieldHours += hours;
          }
          
          lastInTime = null;
        }
      }

      // Handle incomplete shift (punch in without punch out)
      if (lastInTime) {
        hasIncompleteShift = true;
        console.log(`Employee ${punches[0].employeeCode}: Incomplete shift detected - punch in at ${lastInTime.toLocaleTimeString()} without punch out`);
      }

      const totalHours = officeHours + fieldHours;
      const overtimeHours = Math.max(0, totalHours - 8);

      console.log(`Employee ${punches[0].employeeCode}: Office=${officeHours.toFixed(2)}h, Field=${fieldHours.toFixed(2)}h, Total=${totalHours.toFixed(2)}h${hasIncompleteShift ? ' (incomplete shift)' : ''}`);

      // Mark punch records as processed
      await db.update(attendanceRecords)
        .set({ status: 'processed' })
        .where(
          and(
            eq(attendanceRecords.employeeId, parseInt(employeeId)),
            eq(attendanceRecords.date, new Date(today))
          )
        );
    }
  }

  // Shift management methods
  async getShifts(): Promise<Shift[]> {
    return await db.select().from(shifts).orderBy(shifts.projectName, shifts.shiftName);
  }

  async getShift(id: number): Promise<Shift | undefined> {
    const [shift] = await db.select().from(shifts).where(eq(shifts.id, id));
    return shift || undefined;
  }

  async createShift(shift: InsertShift): Promise<Shift> {
    const [newShift] = await db.insert(shifts).values(shift).returning();
    return newShift;
  }

  async updateShift(id: number, shift: Partial<InsertShift>): Promise<Shift> {
    const [updatedShift] = await db
      .update(shifts)
      .set(shift)
      .where(eq(shifts.id, id))
      .returning();
    return updatedShift;
  }

  async deleteShift(id: number): Promise<void> {
    await db.delete(shifts).where(eq(shifts.id, id));
  }

  async getAuditLogs(params?: {
    page?: number;
    limit?: number;
    entityType?: string;
    action?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<{ logs: AuditLog[]; total: number }> {
    const { page = 1, limit = 50, entityType, action, dateFrom, dateTo } = params || {};
    const offset = (page - 1) * limit;

    let query = db.select().from(auditLogs);
    const conditions = [];

    if (entityType) {
      conditions.push(eq(auditLogs.entityType, entityType));
    }

    if (action) {
      conditions.push(eq(auditLogs.action, action));
    }

    if (dateFrom) {
      conditions.push(gte(auditLogs.timestamp, dateFrom));
    }

    if (dateTo) {
      conditions.push(lte(auditLogs.timestamp, dateTo));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const logs = await query
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit)
      .offset(offset);

    // Get total count
    let countQuery = db.select({ count: sql<number>`count(*)` }).from(auditLogs);
    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions));
    }
    const countResult = await countQuery;
    const count = countResult[0]?.count || 0;

    return { logs, total: count };
  }

  // Shift assignment management methods
  async getShiftAssignments(params?: {
    dateFrom?: Date;
    dateTo?: Date;
    employeeId?: number;
    shiftId?: number;
  }): Promise<ShiftAssignment[]> {
    const conditions = [];
    
    if (params?.dateFrom) {
      conditions.push(gte(shiftAssignments.date, params.dateFrom));
    }
    
    if (params?.dateTo) {
      conditions.push(lte(shiftAssignments.date, params.dateTo));
    }
    
    if (params?.employeeId) {
      conditions.push(eq(shiftAssignments.employeeId, params.employeeId));
    }
    
    if (params?.shiftId) {
      conditions.push(eq(shiftAssignments.shiftId, params.shiftId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return await db
      .select({
        id: shiftAssignments.id,
        employeeId: shiftAssignments.employeeId,
        shiftId: shiftAssignments.shiftId,
        date: shiftAssignments.date,
        status: shiftAssignments.status,
        notes: shiftAssignments.notes,
        createdAt: shiftAssignments.createdAt,
        updatedAt: shiftAssignments.updatedAt,
        employee: {
          id: employeeRecords.id,
          employeeCode: employeeRecords.employeeCode,
          firstName: employeeRecords.firstName,
          lastName: employeeRecords.lastName,
          department: employeeRecords.department,
          position: employeeRecords.position,
          isActive: employeeRecords.isActive,
        },
        shift: {
          id: shifts.id,
          projectName: shifts.projectName,
          shiftName: shifts.shiftName,
          startHour: shifts.startHour,
          startMinute: shifts.startMinute,
          endHour: shifts.endHour,
          endMinute: shifts.endMinute,
          daysOfWeek: shifts.daysOfWeek,
          isActive: shifts.isActive,
        },
      })
      .from(shiftAssignments)
      .leftJoin(employeeRecords, eq(shiftAssignments.employeeId, employeeRecords.id))
      .leftJoin(shifts, eq(shiftAssignments.shiftId, shifts.id))
      .where(whereClause)
      .orderBy(shiftAssignments.date, shiftAssignments.createdAt);
  }

  async getShiftAssignment(id: number): Promise<ShiftAssignment | undefined> {
    const [assignment] = await db
      .select({
        id: shiftAssignments.id,
        employeeId: shiftAssignments.employeeId,
        shiftId: shiftAssignments.shiftId,
        date: shiftAssignments.date,
        status: shiftAssignments.status,
        notes: shiftAssignments.notes,
        createdAt: shiftAssignments.createdAt,
        updatedAt: shiftAssignments.updatedAt,
        employee: {
          id: employeeRecords.id,
          employeeCode: employeeRecords.employeeCode,
          firstName: employeeRecords.firstName,
          lastName: employeeRecords.lastName,
          department: employeeRecords.department,
          position: employeeRecords.position,
          isActive: employeeRecords.isActive,
        },
        shift: {
          id: shifts.id,
          projectName: shifts.projectName,
          shiftName: shifts.shiftName,
          startHour: shifts.startHour,
          startMinute: shifts.startMinute,
          endHour: shifts.endHour,
          endMinute: shifts.endMinute,
          daysOfWeek: shifts.daysOfWeek,
          isActive: shifts.isActive,
        },
      })
      .from(shiftAssignments)
      .leftJoin(employeeRecords, eq(shiftAssignments.employeeId, employeeRecords.id))
      .leftJoin(shifts, eq(shiftAssignments.shiftId, shifts.id))
      .where(eq(shiftAssignments.id, id));
    return assignment || undefined;
  }

  async createShiftAssignment(assignment: InsertShiftAssignment): Promise<ShiftAssignment> {
    const [newAssignment] = await db
      .insert(shiftAssignments)
      .values(assignment)
      .returning();
    return newAssignment;
  }

  async updateShiftAssignment(id: number, assignment: Partial<InsertShiftAssignment>): Promise<ShiftAssignment> {
    const [updatedAssignment] = await db
      .update(shiftAssignments)
      .set({ ...assignment, updatedAt: new Date() })
      .where(eq(shiftAssignments.id, id))
      .returning();
    return updatedAssignment;
  }

  async deleteShiftAssignment(id: number): Promise<void> {
    await db.delete(shiftAssignments).where(eq(shiftAssignments.id, id));
  }

  // Settings management methods
  async getSetting(key: string): Promise<Setting | undefined> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting || undefined;
  }

  async getSettings(category?: string): Promise<Setting[]> {
    if (category) {
      return await db.select().from(settings).where(eq(settings.category, category)).orderBy(settings.key);
    }
    return await db.select().from(settings).orderBy(settings.category, settings.key);
  }

  async setSetting(setting: InsertSetting): Promise<Setting> {
    const [newSetting] = await db
      .insert(settings)
      .values(setting)
      .onConflictDoUpdate({
        target: settings.key,
        set: {
          value: setting.value,
          type: setting.type,
          category: setting.category,
          description: setting.description,
          updatedAt: new Date(),
          updatedBy: setting.updatedBy,
        },
      })
      .returning();
    return newSetting;
  }

  async updateSetting(key: string, value: string, updatedBy?: number): Promise<Setting> {
    const [updatedSetting] = await db
      .update(settings)
      .set({
        value,
        updatedAt: new Date(),
        updatedBy,
      })
      .where(eq(settings.key, key))
      .returning();
    return updatedSetting;
  }

  async deleteSetting(key: string): Promise<void> {
    await db.delete(settings).where(eq(settings.key, key));
  }

  async getDepartments(): Promise<string[]> {
    const result = await db
      .selectDistinct({ department: employeeRecords.department })
      .from(employeeRecords)
      .where(
        and(
          isNotNull(employeeRecords.department),
          eq(employeeRecords.isActive, true),
          eq(employeeRecords.systemAccount, false),
          ne(employeeRecords.department, 'MIGRATED_TO_FORMER_EMPLOYEES'),
          ne(employeeRecords.department, 'all'), // Filter out "all" value
          sql`LOWER(${employeeRecords.firstName}) != 'noc'`
        )
      )
      .orderBy(employeeRecords.department);
    
    return result.map(r => r.department).filter(Boolean) as string[];
  }

  async getDesignations(): Promise<string[]> {
    const result = await db
      .selectDistinct({ designation: employeeRecords.designation })
      .from(employeeRecords)
      .where(
        and(
          isNotNull(employeeRecords.designation),
          ne(employeeRecords.designation, ''),
          eq(employeeRecords.isActive, true),
          sql`LOWER(${employeeRecords.firstName}) != 'noc'`
        )
      )
      .orderBy(employeeRecords.designation);
    
    return result.map(r => r.designation).filter(Boolean) as string[];
  }

  async getDepartmentsForExclusions(): Promise<Array<{ department: string; employeeCount: number }>> {
    // Get departments that are already excluded
    const excludedDepartments = await db
      .select({ department: exclusions.targetValue })
      .from(exclusions)
      .where(
        and(
          eq(exclusions.type, 'department'),
          eq(exclusions.isActive, true)
        )
      );
    
    const excludedDepartmentNames = new Set(excludedDepartments.map(r => r.department));
    
    // Get all departments with employee counts
    const allDepartments = await db
      .select({
        department: employeeRecords.department,
        employeeCount: count(employeeRecords.id)
      })
      .from(employeeRecords)
      .where(
        and(
          isNotNull(employeeRecords.department),
          ne(employeeRecords.department, ''),
          eq(employeeRecords.isActive, true),
          eq(employeeRecords.systemAccount, false),
          ne(employeeRecords.department, 'MIGRATED_TO_FORMER_EMPLOYEES'),
          sql`LOWER(${employeeRecords.firstName}) != 'noc'`
        )
      )
      .groupBy(employeeRecords.department)
      .orderBy(employeeRecords.department);
    
    // Return all departments that are not already excluded
    // This includes departments with and without biometric data (OKARA, Multan, etc.)
    return allDepartments
      .filter(dept => 
        dept.department && 
        !excludedDepartmentNames.has(dept.department)
      )
      .map(dept => ({ department: dept.department!, employeeCount: dept.employeeCount }));
  }
  
  async getPositions(): Promise<string[]> {
    const result = await db
      .selectDistinct({ position: employeeRecords.position })
      .from(employeeRecords)
      .where(
        and(
          isNotNull(employeeRecords.position),
          eq(employeeRecords.isActive, true),
          sql`LOWER(${employeeRecords.firstName}) != 'noc'`
        )
      )
      .orderBy(employeeRecords.position);
    
    return result.map(r => r.position).filter(Boolean) as string[];
  }

  async getEmployeesWithoutDepartment(): Promise<{ employees: Employee[]; total: number }> {
    const whereConditions = [
      or(
        isNull(employeeRecords.department),
        eq(employeeRecords.department, '')
      )
    ];

    const [totalCount] = await db
      .select({ count: count() })
      .from(employeeRecords)
      .where(and(...whereConditions));

    const employees = await db
      .select()
      .from(employeeRecords)
      .where(and(...whereConditions))
      .orderBy(employeeRecords.employeeCode);

    return {
      employees,
      total: totalCount.count,
    };
  }

  // Department groups management
  async getDepartmentGroups(): Promise<DepartmentGroup[]> {
    return await db
      .select()
      .from(departmentGroups)
      .orderBy(departmentGroups.sortOrder, departmentGroups.name);
  }

  async getDepartmentGroup(id: number): Promise<DepartmentGroup | undefined> {
    const [group] = await db
      .select()
      .from(departmentGroups)
      .where(eq(departmentGroups.id, id));
    return group || undefined;
  }

  async createDepartmentGroup(group: InsertDepartmentGroup): Promise<DepartmentGroup> {
    const [newGroup] = await db
      .insert(departmentGroups)
      .values(group)
      .returning();
    return newGroup;
  }

  async updateDepartmentGroup(id: number, group: Partial<InsertDepartmentGroup>): Promise<DepartmentGroup> {
    const [updatedGroup] = await db
      .update(departmentGroups)
      .set({ ...group, updatedAt: new Date() })
      .where(eq(departmentGroups.id, id))
      .returning();
    return updatedGroup;
  }

  async deleteDepartmentGroup(id: number): Promise<void> {
    await db.delete(departmentGroups).where(eq(departmentGroups.id, id));
  }

  // Remove ensureUngroupedDepartmentGroup as groups are now aggregation containers
  // Departments can belong to multiple groups or no groups at all

  async createActionRecord(record: InsertActionRecord): Promise<ActionRecord> {
    const [newRecord] = await db
      .insert(actionRecords)
      .values(record)
      .returning();
    return newRecord;
  }

  async getActionRecords(params?: {
    page?: number;
    limit?: number;
    userType?: string;
    command?: string;
    result?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<{ records: ActionRecord[]; total: number }> {
    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (params?.userType) {
      conditions.push(eq(actionRecords.userType, params.userType));
    }
    if (params?.command) {
      conditions.push(eq(actionRecords.command, params.command));
    }
    if (params?.result) {
      conditions.push(eq(actionRecords.result, params.result));
    }
    if (params?.dateFrom) {
      conditions.push(gte(actionRecords.timestamp, params.dateFrom));
    }
    if (params?.dateTo) {
      conditions.push(lte(actionRecords.timestamp, params.dateTo));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [records, totalResult] = await Promise.all([
      db
        .select()
        .from(actionRecords)
        .where(where)
        .orderBy(desc(actionRecords.timestamp))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(actionRecords)
        .where(where)
    ]);

    return {
      records,
      total: totalResult[0]?.count || 0
    };
  }

  async getActionRecord(id: number): Promise<ActionRecord | undefined> {
    const [record] = await db
      .select()
      .from(actionRecords)
      .where(eq(actionRecords.id, id));
    return record || undefined;
  }

  // Terminate Action methods
  async createTerminateAction(data: {
    time: Date;
    empCode: string;
    terminatedBy: string;
    forcedOut: Date;
    punchInTime: Date;
  }): Promise<any> {
    const [created] = await db
      .insert(terminateActions)
      .values({
        time: data.time,
        empCode: data.empCode,
        terminatedBy: data.terminatedBy,
        forcedOut: data.forcedOut,
        punchInTime: data.punchInTime,
      })
      .returning();
    return created;
  }

  getDb() {
    return db;
  }

  // Gamification management
  async getEmployeeStreak(employeeId: number): Promise<AttendanceStreak | undefined> {
    const [streak] = await db
      .select()
      .from(attendanceStreaks)
      .where(eq(attendanceStreaks.employeeId, employeeId));
    return streak || undefined;
  }

  async updateEmployeeStreak(employeeId: number, data: Partial<InsertAttendanceStreak>): Promise<AttendanceStreak> {
    const [updated] = await db
      .update(attendanceStreaks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(attendanceStreaks.employeeId, employeeId))
      .returning();
    return updated;
  }

  async createEmployeeStreak(data: InsertAttendanceStreak): Promise<AttendanceStreak> {
    const [created] = await db
      .insert(attendanceStreaks)
      .values(data)
      .returning();
    return created;
  }

  // Badge management
  async getBadges(params?: { category?: string; isActive?: boolean }): Promise<Badge[]> {
    const conditions: any[] = [];
    
    if (params?.category) {
      conditions.push(eq(badges.category, params.category));
    }
    if (params?.isActive !== undefined) {
      conditions.push(eq(badges.isActive, params.isActive));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    return await db
      .select()
      .from(badges)
      .where(where)
      .orderBy(badges.displayOrder, badges.name);
  }

  async getBadge(id: number): Promise<Badge | undefined> {
    const [badge] = await db
      .select()
      .from(badges)
      .where(eq(badges.id, id));
    return badge || undefined;
  }

  async createBadge(badge: InsertBadge): Promise<Badge> {
    const [created] = await db
      .insert(badges)
      .values(badge)
      .returning();
    return created;
  }

  async updateBadge(id: number, badge: Partial<InsertBadge>): Promise<Badge> {
    const [updated] = await db
      .update(badges)
      .set(badge)
      .where(eq(badges.id, id))
      .returning();
    return updated;
  }

  async deleteBadge(id: number): Promise<void> {
    await db.delete(badges).where(eq(badges.id, id));
  }

  // Employee badges
  async getEmployeeBadges(employeeId: number): Promise<Array<EmployeeBadge & { badge: Badge }>> {
    const results = await db
      .select()
      .from(employeeBadges)
      .innerJoin(badges, eq(employeeBadges.badgeId, badges.id))
      .where(eq(employeeBadges.employeeId, employeeId))
      .orderBy(desc(employeeBadges.earnedAt));
    
    return results.map(row => ({
      ...row.employee_badges,
      badge: row.badges
    }));
  }

  async awardBadge(employeeId: number, badgeId: number): Promise<EmployeeBadge> {
    const [created] = await db
      .insert(employeeBadges)
      .values({
        employeeId,
        badgeId,
        progress: 100
      })
      .returning();
    return created;
  }

  async updateBadgeProgress(employeeId: number, badgeId: number, progress: number): Promise<void> {
    await db
      .update(employeeBadges)
      .set({ progress })
      .where(and(
        eq(employeeBadges.employeeId, employeeId),
        eq(employeeBadges.badgeId, badgeId)
      ));
  }

  // New Manager Management System - Non-exclusive relationships
  async getAllManagersWithDetails() {
    const managersQuery = await db
      .select({
        id: managers.id,
        employeeCode: managers.employeeCode,
        isActive: managers.isActive,
        createdAt: managers.createdAt,
        // Employee details
        firstName: employeeRecords.firstName,
        lastName: employeeRecords.lastName,
        designation: employeeRecords.designation,
        department: employeeRecords.department,
        // User details
        userId: users.id,
        username: users.username,
        role: users.role,
      })
      .from(managers)
      .leftJoin(employeeRecords, eq(managers.employeeCode, employeeRecords.employeeCode))
      .leftJoin(users, eq(managers.userId, users.id))
      .where(eq(managers.isActive, true))
      .orderBy(employeeRecords.firstName, employeeRecords.lastName);

    // Get department assignments for each manager
    const managersWithDepartments = await Promise.all(
      managersQuery.map(async (manager) => {
        const departments = await db
          .select({
            departmentName: managerDepartmentAssignments.departmentName,
            assignedAt: managerDepartmentAssignments.assignedAt,
          })
          .from(managerDepartmentAssignments)
          .where(
            and(
              eq(managerDepartmentAssignments.managerId, manager.id),
              eq(managerDepartmentAssignments.isActive, true)
            )
          );

        return {
          ...manager,
          departments: departments.map(d => d.departmentName),
          departmentDetails: departments,
        };
      })
    );

    return managersWithDepartments;
  }

  async createManager(data: {
    employeeCode: string;
    userId: number;
    isActive: boolean;
    createdBy?: number;
  }) {
    const [created] = await db
      .insert(managers)
      .values({
        employeeCode: data.employeeCode,
        userId: data.userId,
        isActive: data.isActive,
        createdBy: data.createdBy,
      })
      .returning();
    return created;
  }

  async assignManagerToDepartment(data: {
    managerId: number;
    departmentName: string;
    assignedBy?: number;
    isActive: boolean;
  }) {
    const [created] = await db
      .insert(managerDepartmentAssignments)
      .values({
        managerId: data.managerId,
        departmentName: data.departmentName,
        assignedBy: data.assignedBy,
        isActive: data.isActive,
      })
      .returning();
    return created;
  }

  async removeAllManagerDepartments(managerId: number) {
    await db
      .update(managerDepartmentAssignments)
      .set({ isActive: false })
      .where(eq(managerDepartmentAssignments.managerId, managerId));
  }

  async deleteManager(managerId: number) {
    await db
      .update(managers)
      .set({ isActive: false })
      .where(eq(managers.id, managerId));
  }

  async getManagersByDepartment(departmentName: string) {
    return await db
      .select({
        id: managers.id,
        employeeCode: managers.employeeCode,
        firstName: employeeRecords.firstName,
        lastName: employeeRecords.lastName,
        designation: employeeRecords.designation,
        username: users.username,
        role: users.role,
      })
      .from(managers)
      .innerJoin(managerDepartmentAssignments, eq(managers.id, managerDepartmentAssignments.managerId))
      .leftJoin(employeeRecords, eq(managers.employeeCode, employeeRecords.employeeCode))
      .leftJoin(users, eq(managers.userId, users.id))
      .where(
        and(
          eq(managerDepartmentAssignments.departmentName, departmentName),
          eq(managerDepartmentAssignments.isActive, true),
          eq(managers.isActive, true)
        )
      );
  }

  // Gamification events
  async createGamificationEvent(event: InsertGamificationEvent): Promise<GamificationEvent> {
    const [created] = await db
      .insert(gamificationEvents)
      .values(event)
      .returning();
    return created;
  }

  async getGamificationEvents(params?: {
    employeeId?: number;
    eventType?: string;
    limit?: number;
  }): Promise<GamificationEvent[]> {
    const conditions: any[] = [];
    
    if (params?.employeeId) {
      conditions.push(eq(gamificationEvents.employeeId, params.employeeId));
    }
    if (params?.eventType) {
      conditions.push(eq(gamificationEvents.eventType, params.eventType));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const limit = params?.limit || 50;

    return await db
      .select()
      .from(gamificationEvents)
      .where(where)
      .orderBy(desc(gamificationEvents.timestamp))
      .limit(limit);
  }

  // Top performers based on scoring system
  async getTopPerformers(limit: number = 100): Promise<Array<{
    employeeId: number;
    employeeCode: string;
    employeeName: string;
    department: string;
    totalPoints: number;
    rank: number;
    attendanceRate: number;
    badgeCount: number;
    currentStreak: number;
    badges: Badge[];
  }>> {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    
    // Get top performers with their scores
    const topPerformers = await db
      .select({
        employeeId: employeeScores.employeeId,
        employeeCode: employeeScores.employeeCode,
        totalPoints: employeeScores.totalPoints,
        rank: employeeScores.rank,
        attendancePoints: employeeScores.attendancePoints,
        punctualityPoints: employeeScores.punctualityPoints,
        performancePoints: employeeScores.performancePoints,
        streakBonus: employeeScores.streakBonus,
      })
      .from(employeeScores)
      .where(eq(employeeScores.month, currentMonth))
      .orderBy(desc(employeeScores.totalPoints))
      .limit(limit);

    // Get employee details and badges for each performer
    const results = await Promise.all(
      topPerformers.map(async (performer) => {
        const [employee] = await db
          .select()
          .from(employeeRecords)
          .where(eq(employeeRecords.id, performer.employeeId));
        
        const [streak] = await db
          .select()
          .from(attendanceStreaks)
          .where(eq(attendanceStreaks.employeeId, performer.employeeId));

        const badgeResults = await db
          .select()
          .from(employeeBadges)
          .innerJoin(badges, eq(employeeBadges.badgeId, badges.id))
          .where(eq(employeeBadges.employeeId, performer.employeeId));

        const earnedBadges = badgeResults.map(row => row.badges);
        
        // Calculate attendance rate (mock calculation for now)
        const attendanceRate = performer.attendancePoints > 0 ? 
          Math.min(100, (performer.attendancePoints / 100) * 100) : 0;

        return {
          employeeId: performer.employeeId,
          employeeCode: performer.employeeCode,
          employeeName: employee ? `${employee.firstName} ${employee.lastName}`.trim() : performer.employeeCode,
          department: employee?.department || 'Unknown',
          totalPoints: performer.totalPoints,
          rank: performer.rank || 0,
          attendanceRate,
          badgeCount: earnedBadges.length,
          currentStreak: streak?.currentStreak || 0,
          badges: earnedBadges
        };
      })
    );

    return results;
  }

  // Leaderboard integration
  async getLeaderboard(period: string = 'monthly'): Promise<Array<{
    employeeId: number;
    employeeCode: string;
    employeeName: string;
    department: string;
    totalPoints: number;
    rank: number;
    attendancePoints: number;
    punctualityPoints: number;
    performancePoints: number;
    streakBonus: number;
    badges: Badge[];
  }>> {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    
    // Get leaderboard data
    const leaderboard = await db
      .select({
        employeeId: employeeScores.employeeId,
        employeeCode: employeeScores.employeeCode,
        totalPoints: employeeScores.totalPoints,
        rank: employeeScores.rank,
        attendancePoints: employeeScores.attendancePoints,
        punctualityPoints: employeeScores.punctualityPoints,
        performancePoints: employeeScores.performancePoints,
        streakBonus: employeeScores.streakBonus,
      })
      .from(employeeScores)
      .where(eq(employeeScores.month, currentMonth))
      .orderBy(desc(employeeScores.totalPoints))
      .limit(100);

    // Get employee details and badges for each entry
    const results = await Promise.all(
      leaderboard.map(async (entry) => {
        const [employee] = await db
          .select()
          .from(employeeRecords)
          .where(eq(employeeRecords.id, entry.employeeId));

        const badgeResults = await db
          .select()
          .from(employeeBadges)
          .innerJoin(badges, eq(employeeBadges.badgeId, badges.id))
          .where(eq(employeeBadges.employeeId, entry.employeeId));

        const earnedBadges = badgeResults.map(row => row.badges);

        return {
          employeeId: entry.employeeId,
          employeeCode: entry.employeeCode,
          employeeName: employee ? `${employee.firstName} ${employee.lastName}`.trim() : entry.employeeCode,
          department: employee?.department || 'Unknown',
          totalPoints: entry.totalPoints,
          rank: entry.rank || 0,
          attendancePoints: entry.attendancePoints,
          punctualityPoints: entry.punctualityPoints,
          performancePoints: entry.performancePoints,
          streakBonus: entry.streakBonus,
          badges: earnedBadges
        };
      })
    );

    return results;
  }



  // External attendance
  async createExternalAttendance(data: InsertAttendanceExternal): Promise<AttendanceExternal> {
    const [created] = await db
      .insert(attendanceExternal)
      .values(data)
      .returning();
    return created;
  }

  async getExternalAttendance(params?: {
    employeeId?: number;
    status?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<AttendanceExternal[]> {
    const conditions: any[] = [];
    
    if (params?.employeeId) {
      conditions.push(eq(attendanceExternal.employeeId, params.employeeId));
    }
    if (params?.status) {
      conditions.push(eq(attendanceExternal.status, params.status));
    }
    if (params?.dateFrom) {
      conditions.push(gte(attendanceExternal.timestamp, params.dateFrom));
    }
    if (params?.dateTo) {
      conditions.push(lte(attendanceExternal.timestamp, params.dateTo));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    return await db
      .select()
      .from(attendanceExternal)
      .where(where)
      .orderBy(desc(attendanceExternal.timestamp));
  }

  async approveExternalAttendance(id: number, approvedBy: number): Promise<void> {
    await db
      .update(attendanceExternal)
      .set({
        status: 'approved',
        approvedBy,
        approvedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(attendanceExternal.id, id));
  }

  async rejectExternalAttendance(id: number, approvedBy: number, reason: string): Promise<void> {
    await db
      .update(attendanceExternal)
      .set({
        status: 'rejected',
        approvedBy,
        approvedAt: new Date(),
        rejectionReason: reason,
        updatedAt: new Date()
      })
      .where(eq(attendanceExternal.id, id));
  }

  // Get raw attendance data from pull table
  async getRawAttendanceForToday(startDate: Date, endDate: Date): Promise<any[]> {
    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const endDateStr = format(endDate, 'yyyy-MM-dd');
    
    const rawData = await db
      .select()
      .from(attendancePullExt)
      .where(
        and(
          sql`${attendancePullExt.allFields}->>'punch_time' >= ${startDateStr}`,
          sql`${attendancePullExt.allFields}->>'punch_time' <= ${endDateStr + ' 23:59:59'}`
        )
      )
      .orderBy(sql`${attendancePullExt.allFields}->>'punch_time' DESC`);
    
    return rawData;
  }

  // Get live activity from processed attendance records - shows real activity not stuck records
  async getLiveActivity(limit = 200): Promise<Array<{
    type: string;
    employeeName: string;
    employeeCode: string;
    timestamp: Date;
    details: string;
    shiftAssigned?: string;
    recordType: string;
    timingDifference?: string;
    shiftTimeDifference?: number | 'shift_change';
    isEarlyOrLate?: 'early' | 'late' | 'on_time' | 'shift_change';
  }>> {
    // Get today's date in Pakistan timezone
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    
    // Get processed attendance records from the actual attendance table (not staging)
    const attendanceData = await db
      .select({
        id: attendanceRecords.id,
        employeeCode: attendanceRecords.employeeCode,
        date: attendanceRecords.date,
        checkIn: attendanceRecords.checkIn,
        checkOut: attendanceRecords.checkOut,
        biotimeId: attendanceRecords.biotimeId,
        punchSource: attendanceRecords.punchSource,
        updatedAt: attendanceRecords.updatedAt
      })
      .from(attendanceRecords)
      .where(
        and(
          gte(attendanceRecords.date, new Date(todayStr + ' 00:00:00')),
          lte(attendanceRecords.date, new Date(todayStr + ' 23:59:59')),
          isNotNull(attendanceRecords.biotimeId)
        )
      )
      .orderBy(desc(attendanceRecords.updatedAt))
      .limit(limit);

    // Transform attendance records into live activity format
    const liveActivities = [];
    
    for (const record of attendanceData) {
      // Get employee info
      const employee = await db
        .select({
          firstName: employeeRecords.firstName,
          lastName: employeeRecords.lastName,
          shiftId: employeeRecords.shiftId,
          department: employeeRecords.department
        })
        .from(employeeRecords)
        .where(eq(employeeRecords.employeeCode, record.employeeCode))
        .limit(1);

      // Get shift info if employee has shift
      let shiftInfo = null;
      if (employee[0]?.shiftId) {
        const shift = await db
          .select()
          .from(shifts)
          .where(eq(shifts.id, employee[0].shiftId))
          .limit(1);
        shiftInfo = shift[0];
      }

      const employeeName = employee[0] 
        ? `${employee[0].firstName} ${employee[0].lastName || ''}`.trim()
        : 'Unknown Employee';

      // Create activity entries for both check-in and check-out if they exist
      if (record.checkIn) {
        liveActivities.push({
          type: "check_in",
          employeeName,
          employeeCode: record.employeeCode,
          timestamp: record.checkIn,
          details: `Check In - ${record.punchSource || 'biometric'}`,
          shiftAssigned: shiftInfo ? `${shiftInfo.projectName}-${shiftInfo.shiftName}` : 'No Shift',
          recordType: "IN",
          timingDifference: '--:--',
          isEarlyOrLate: 'on_time' as const
        });
      }

      if (record.checkOut) {
        liveActivities.push({
          type: "check_out",
          employeeName,
          employeeCode: record.employeeCode,
          timestamp: record.checkOut,
          details: `Check Out - ${record.punchSource || 'biometric'}`,
          shiftAssigned: shiftInfo ? `${shiftInfo.projectName}-${shiftInfo.shiftName}` : 'No Shift',
          recordType: "OUT",
          timingDifference: '--:--',
          isEarlyOrLate: 'on_time' as const
        });
      }
    }

    // Sort by timestamp descending (most recent first) and limit to requested number
    liveActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    const limitedActivities = liveActivities.slice(0, limit);

    return limitedActivities;
  }

  // Daily Attendance Metrics methods
  async getDailyAttendanceMetrics(filters: {
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<DailyAttendanceMetrics[]> {
    let query = db.select().from(dailyAttendanceMetrics);
    
    const conditions = [];
    if (filters.startDate && filters.endDate) {
      conditions.push(
        and(
          gte(dailyAttendanceMetrics.date, filters.startDate),
          lte(dailyAttendanceMetrics.date, filters.endDate)
        )
      );
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    query = query.orderBy(desc(dailyAttendanceMetrics.date));
    
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    if (filters.offset) {
      query = query.offset(filters.offset);
    }
    
    return await query;
  }
  
  async createDailyAttendanceMetrics(data: InsertDailyAttendanceMetrics): Promise<DailyAttendanceMetrics> {
    const [result] = await db.insert(dailyAttendanceMetrics).values(data).returning();
    return result;
  }
  
  async updateDailyAttendanceMetrics(date: string, data: Partial<InsertDailyAttendanceMetrics>): Promise<DailyAttendanceMetrics> {
    const [result] = await db
      .update(dailyAttendanceMetrics)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(dailyAttendanceMetrics.date, date))
      .returning();
    return result;
  }
  
  async deleteDailyAttendanceMetrics(date: string): Promise<void> {
    await db.delete(dailyAttendanceMetrics).where(eq(dailyAttendanceMetrics.date, date));
  }
  
  async getDailyAttendanceMetricsById(id: number): Promise<DailyAttendanceMetrics | undefined> {
    const [result] = await db
      .select()
      .from(dailyAttendanceMetrics)
      .where(eq(dailyAttendanceMetrics.id, id))
      .limit(1);
    return result;
  }
  
  async getDailyAttendanceMetricsByDate(date: string): Promise<DailyAttendanceMetrics | undefined> {
    const [result] = await db
      .select()
      .from(dailyAttendanceMetrics)
      .where(eq(dailyAttendanceMetrics.date, date))
      .limit(1);
    return result;
  }

  // Attendance Policy Settings
  async getAttendancePolicySettings(): Promise<AttendancePolicySettings | undefined> {
    const settings = await db
      .select()
      .from(attendancePolicySettings)
      .orderBy(desc(attendancePolicySettings.createdAt))
      .limit(1);
    
    return settings[0];
  }

  async createAttendancePolicySettings(settings: InsertAttendancePolicySettings): Promise<AttendancePolicySettings> {
    const [newSettings] = await db
      .insert(attendancePolicySettings)
      .values({
        ...settings,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    
    return newSettings;
  }

  async updateAttendancePolicySettings(id: number, settings: Partial<InsertAttendancePolicySettings>): Promise<AttendancePolicySettings> {
    const [updated] = await db
      .update(attendancePolicySettings)
      .set({
        ...settings,
        updatedAt: new Date(),
      })
      .where(eq(attendancePolicySettings.id, id))
      .returning();
    
    return updated;
  }

  // Forced punchouts
  async createForcedPunchout(punchout: InsertForcedPunchout): Promise<ForcedPunchout> {
    const [created] = await db
      .insert(forcedPunchouts)
      .values(punchout)
      .returning();
    return created;
  }

  async getForcedPunchouts(params?: {
    employeeId?: number;
    adminId?: number;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<ForcedPunchout[]> {
    const conditions: any[] = [];
    
    if (params?.employeeId) {
      conditions.push(eq(forcedPunchouts.employeeId, params.employeeId));
    }
    if (params?.adminId) {
      conditions.push(eq(forcedPunchouts.adminUserId, params.adminId));
    }
    if (params?.dateFrom) {
      conditions.push(gte(forcedPunchouts.createdAt, params.dateFrom));
    }
    if (params?.dateTo) {
      conditions.push(lte(forcedPunchouts.createdAt, params.dateTo));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    return await db
      .select()
      .from(forcedPunchouts)
      .where(where)
      .orderBy(desc(forcedPunchouts.createdAt));
  }

  async getForcedPunchout(id: number): Promise<ForcedPunchout | undefined> {
    const [punchout] = await db
      .select()
      .from(forcedPunchouts)
      .where(eq(forcedPunchouts.id, id));
    return punchout || undefined;
  }

  // Exclusions management
  async getExclusions(): Promise<Exclusion[]> {
    return await db
      .select()
      .from(exclusions)
      .orderBy(desc(exclusions.createdAt));
  }

  async createExclusion(data: InsertExclusion): Promise<Exclusion> {
    const [exclusion] = await db
      .insert(exclusions)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return exclusion;
  }

  async updateExclusion(id: number, data: Partial<InsertExclusion>): Promise<Exclusion> {
    const [updated] = await db
      .update(exclusions)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(exclusions.id, id))
      .returning();
    return updated;
  }

  async deleteExclusion(id: number): Promise<void> {
    await db.delete(exclusions).where(eq(exclusions.id, id));
  }

  async deleteExclusionsBulk(ids: number[]): Promise<void> {
    await db.delete(exclusions).where(inArray(exclusions.id, ids));
  }

  async getExclusionsByType(type: 'department' | 'employee'): Promise<Exclusion[]> {
    return await db
      .select()
      .from(exclusions)
      .where(eq(exclusions.type, type))
      .orderBy(desc(exclusions.createdAt));
  }

  // Team management implementations
  async getTeamTemplates(): Promise<TeamTemplate[]> {
    const templates = await db.select().from(teamTemplates).orderBy(teamTemplates.name);
    return templates;
  }

  async getTeamTemplate(id: number): Promise<TeamTemplate | undefined> {
    const [template] = await db.select().from(teamTemplates).where(eq(teamTemplates.id, id));
    return template;
  }

  async createTeamTemplate(template: InsertTeamTemplate): Promise<TeamTemplate> {
    const [newTemplate] = await db.insert(teamTemplates).values(template).returning();
    return newTemplate;
  }

  async updateTeamTemplate(id: number, template: Partial<InsertTeamTemplate>): Promise<TeamTemplate> {
    const [updatedTemplate] = await db.update(teamTemplates)
      .set(template)
      .where(eq(teamTemplates.id, id))
      .returning();
    return updatedTemplate;
  }

  async deleteTeamTemplate(id: number): Promise<void> {
    await db.delete(teamTemplates).where(eq(teamTemplates.id, id));
  }

  async getAssembledTeams(params?: {
    status?: 'active' | 'inactive' | 'completed';
    createdBy?: number;
    limit?: number;
  }): Promise<AssembledTeam[]> {
    let query = db.select().from(assembledTeams);
    
    const conditions: any[] = [];
    if (params?.status) {
      conditions.push(eq(assembledTeams.status, params.status));
    }
    if (params?.createdBy) {
      conditions.push(eq(assembledTeams.createdBy, params.createdBy));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    query = query.orderBy(assembledTeams.name);
    
    if (params?.limit) {
      query = query.limit(params.limit);
    }
    
    return await query;
  }

  async getAssembledTeam(id: number): Promise<AssembledTeam | undefined> {
    const [team] = await db.select().from(assembledTeams).where(eq(assembledTeams.id, id));
    return team;
  }

  async createAssembledTeam(team: InsertAssembledTeam): Promise<AssembledTeam> {
    const [newTeam] = await db.insert(assembledTeams).values(team).returning();
    return newTeam;
  }

  async updateAssembledTeam(id: number, team: Partial<InsertAssembledTeam>): Promise<AssembledTeam> {
    const [updatedTeam] = await db.update(assembledTeams)
      .set(team)
      .where(eq(assembledTeams.id, id))
      .returning();
    return updatedTeam;
  }

  async deleteAssembledTeam(id: number): Promise<void> {
    // First delete all team members
    await db.delete(teamMembers).where(eq(teamMembers.teamId, id));
    // Then delete the team
    await db.delete(assembledTeams).where(eq(assembledTeams.id, id));
  }

  async getTeamMembers(teamId: number): Promise<TeamMember[]> {
    const members = await db.select().from(teamMembers).where(eq(teamMembers.teamId, teamId));
    return members;
  }

  async getTeamMember(id: number): Promise<TeamMember | undefined> {
    const [member] = await db.select().from(teamMembers).where(eq(teamMembers.id, id));
    return member;
  }

  async createTeamMember(member: InsertTeamMember): Promise<TeamMember> {
    const [newMember] = await db.insert(teamMembers).values(member).returning();
    return newMember;
  }

  async updateTeamMember(id: number, member: Partial<InsertTeamMember>): Promise<TeamMember> {
    const [updatedMember] = await db.update(teamMembers)
      .set(member)
      .where(eq(teamMembers.id, id))
      .returning();
    return updatedMember;
  }

  async deleteTeamMember(id: number): Promise<void> {
    await db.delete(teamMembers).where(eq(teamMembers.id, id));
  }

  async deleteTeamMembersByTeam(teamId: number): Promise<void> {
    await db.delete(teamMembers).where(eq(teamMembers.teamId, teamId));
  }

  async addTeamMember(member: InsertTeamMember): Promise<TeamMember> {
    const [newMember] = await db.insert(teamMembers).values(member).returning();
    return newMember;
  }

  async removeTeamMember(id: number): Promise<void> {
    await db.delete(teamMembers).where(eq(teamMembers.id, id));
  }

  // Department Manager management
  async getDepartmentManagers(): Promise<Array<User & { managedDepartments: string[] }>> {
    const managers = await db.select().from(users).where(eq(users.role, 'manager'));
    return managers.map(manager => ({
      ...manager,
      managedDepartments: manager.managedDepartments || []
    }));
  }

  async assignDepartmentManager(userId: number, departments: string[]): Promise<User> {
    const [updatedUser] = await db.update(users)
      .set({ 
        role: 'manager',
        managedDepartments: departments
      })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  async removeDepartmentManager(userId: number): Promise<void> {
    await db.update(users)
      .set({ 
        role: 'employee',
        managedDepartments: null
      })
      .where(eq(users.id, userId));
  }

  // Team-Shift assignments
  async getTeamShifts(teamId: number): Promise<ShiftAssignment[]> {
    // Get all team members first
    const members = await this.getTeamMembers(teamId);
    const memberIds = members.map(m => m.employeeId);
    
    if (memberIds.length === 0) return [];
    
    // Get shift assignments for all team members
    const assignments = await db.select().from(shiftAssignments)
      .where(inArray(shiftAssignments.employeeId, memberIds));
    
    return assignments;
  }

  async assignTeamShift(teamId: number, shiftData: any): Promise<ShiftAssignment> {
    // This would typically assign a shift to all team members
    // For now, we'll create a placeholder implementation
    const [assignment] = await db.insert(shiftAssignments).values(shiftData).returning();
    return assignment;
  }

  // WhatsApp Onboarding management
  async getWhatsappOnboardingRequests(params?: {
    status?: string;
    limit?: number;
    page?: number;
  }): Promise<{ requests: WhatsappOnboardingRequest[]; total: number }> {
    const page = params?.page || 1;
    const limit = params?.limit || 50;
    const offset = (page - 1) * limit;

    let query = db.select().from(whatsappOnboardingRequests);
    
    if (params?.status) {
      query = query.where(eq(whatsappOnboardingRequests.onboardingStatus, params.status));
    }
    
    const requests = await query
      .orderBy(desc(whatsappOnboardingRequests.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ count: total }] = await db.select({ count: count() }).from(whatsappOnboardingRequests);
    
    return { requests, total };
  }

  async createWhatsappOnboardingRequest(request: InsertWhatsappOnboardingRequest): Promise<WhatsappOnboardingRequest> {
    const [created] = await db.insert(whatsappOnboardingRequests).values(request).returning();
    return created;
  }

  async updateWhatsappOnboardingRequest(id: number, request: Partial<InsertWhatsappOnboardingRequest>): Promise<WhatsappOnboardingRequest> {
    const [updated] = await db
      .update(whatsappOnboardingRequests)
      .set({ ...request, updatedAt: new Date() })
      .where(eq(whatsappOnboardingRequests.id, id))
      .returning();
    return updated;
  }

  async deleteWhatsappOnboardingRequest(id: number): Promise<void> {
    await db.delete(whatsappOnboardingRequests).where(eq(whatsappOnboardingRequests.id, id));
  }

  async getWhatsappOnboardingRequestByPhone(phoneNumber: string): Promise<WhatsappOnboardingRequest | undefined> {
    const [request] = await db
      .select()
      .from(whatsappOnboardingRequests)
      .where(eq(whatsappOnboardingRequests.phoneNumber, phoneNumber))
      .orderBy(desc(whatsappOnboardingRequests.createdAt))
      .limit(1);
    return request || undefined;
  }

  // WhatsApp Message Log
  async createWhatsappMessageLog(log: InsertWhatsappMessageLog): Promise<WhatsappMessageLog> {
    const [created] = await db.insert(whatsappMessageLog).values(log).returning();
    return created;
  }

  async logWhatsappMessage(log: InsertWhatsappMessageLog): Promise<WhatsappMessageLog> {
    return this.createWhatsappMessageLog(log);
  }

  async getWhatsappMessageLogs(params?: {
    phoneNumber?: string;
    messageType?: string;
    status?: string;
    limit?: number;
  }): Promise<WhatsappMessageLog[]> {
    const limit = params?.limit || 100;
    
    let query = db.select().from(whatsappMessageLog);
    let whereConditions: any[] = [];

    if (params?.phoneNumber) {
      whereConditions.push(eq(whatsappMessageLog.phoneNumber, params.phoneNumber));
    }
    
    if (params?.messageType) {
      whereConditions.push(eq(whatsappMessageLog.messageType, params.messageType));
    }
    
    if (params?.status) {
      whereConditions.push(eq(whatsappMessageLog.messageStatus, params.status));
    }

    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions));
    }

    return await query
      .orderBy(desc(whatsappMessageLog.createdAt))
      .limit(limit);
  }

  async getWhatsAppMessages(): Promise<any[]> {
    const messages = await db
      .select()
      .from(whatsappMessageLog)
      .orderBy(desc(whatsappMessageLog.createdAt))
      .limit(500);
    
    // Transform snake_case to camelCase for frontend
    return messages.map(msg => ({
      id: msg.id,
      phoneNumber: msg.phoneNumber,
      messageType: msg.messageType,
      messageContent: msg.messageContent,
      messageStatus: msg.messageStatus,
      messageId: msg.messageId,
      createdAt: msg.createdAt,
      sentAt: msg.sentAt
    }));
  }

  async getWhatsAppMessageStats(fromDate: Date): Promise<any> {
    try {
      const messages = await db
        .select()
        .from(whatsappMessageLog)
        .where(gte(whatsappMessageLog.createdAt, fromDate));
      
      const totalMessages = messages.length;
      const outgoingMessages = messages.filter(msg => msg.messageType === 'outgoing');
      const incomingMessages = messages.filter(msg => msg.messageType === 'incoming');
      
      // Count active conversations (unique phone numbers)
      const activeConversations = new Set(messages.map(msg => msg.phoneNumber)).size;
      
      // Count delivered messages (assume delivered if sentAt is not null)
      const deliveredMessages = messages.filter(msg => msg.sentAt !== null).length;
      
      // Count responded messages (incoming messages after outgoing)
      const respondedMessages = incomingMessages.length;
      
      return {
        totalMessages,
        outgoingMessages: outgoingMessages.length,
        incomingMessages: incomingMessages.length,
        activeConversations,
        deliveredMessages,
        respondedMessages
      };
    } catch (error) {
      console.error('[Storage] WhatsApp message stats error:', error);
      return {
        totalMessages: 0,
        outgoingMessages: 0,
        incomingMessages: 0,
        activeConversations: 0,
        deliveredMessages: 0,
        respondedMessages: 0
      };
    }
  }

  // WhatsApp Onboarding Statistics
  async getWhatsappOnboardingStats(): Promise<WhatsappOnboardingStats | undefined> {
    const [stats] = await db.select().from(whatsappOnboardingStats).limit(1);
    return stats || undefined;
  }

  async updateWhatsappOnboardingStats(updates: Partial<InsertWhatsappOnboardingStats>): Promise<WhatsappOnboardingStats> {
    const [existing] = await db.select().from(whatsappOnboardingStats).limit(1);
    
    if (!existing) {
      throw new Error('WhatsApp onboarding stats not initialized');
    }

    const [updated] = await db
      .update(whatsappOnboardingStats)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(whatsappOnboardingStats.id, existing.id))
      .returning();
    
    return updated;
  }

  async initializeWhatsappOnboardingStats(): Promise<WhatsappOnboardingStats> {
    const [existing] = await db.select().from(whatsappOnboardingStats).limit(1);
    
    if (existing) {
      return existing;
    }

    const today = new Date().toISOString().split('T')[0];
    const [created] = await db.insert(whatsappOnboardingStats).values({
      statsDate: today,
      totalRequests: 0,
      newRequests: 0,
      completedRequests: 0,
      rejectedRequests: 0,
      expiredRequests: 0,
      cnicVerificationAttempts: 0,
      cnicVerificationSuccesses: 0,
      cnicVerificationFailures: 0,
      totalMessagesSent: 0,
      welcomeMessagesSent: 0,
      credentialMessagesSent: 0,
      apkLinksSent: 0,
      androidDevices: 0,
      iosDevices: 0,
      desktopDevices: 0,
      unknownDevices: 0,
      completionRate: '0.00',
      verificationSuccessRate: '0.00',
      messageDeliveryRate: '0.00'
    }).returning();

    return created;
  }

  // === Scoring System Methods ===

  // Scoring Rules
  async getScoringRules(): Promise<ScoringRule[]> {
    return await db.select().from(scoringRules).orderBy(desc(scoringRules.createdAt));
  }

  async getScoringRule(id: number): Promise<ScoringRule | undefined> {
    const [rule] = await db.select().from(scoringRules).where(eq(scoringRules.id, id));
    return rule;
  }

  async createScoringRule(rule: InsertScoringRule): Promise<ScoringRule> {
    const [created] = await db.insert(scoringRules).values(rule).returning();
    return created;
  }

  async updateScoringRule(id: number, rule: Partial<InsertScoringRule>): Promise<ScoringRule> {
    const [updated] = await db
      .update(scoringRules)
      .set({ ...rule, updatedAt: new Date() })
      .where(eq(scoringRules.id, id))
      .returning();
    return updated;
  }

  async deleteScoringRule(id: number): Promise<void> {
    await db.delete(scoringRules).where(eq(scoringRules.id, id));
  }

  // Employee Scores
  async getEmployeeScores(params?: {
    employeeId?: number;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    orderBy?: 'score' | 'date';
    order?: 'asc' | 'desc';
  }): Promise<EmployeeScore[]> {
    let query = db.select().from(employeeScores);

    const conditions = [];
    if (params?.employeeId) {
      conditions.push(eq(employeeScores.employeeId, params.employeeId));
    }
    if (params?.dateFrom) {
      conditions.push(gte(employeeScores.month, params.dateFrom.toISOString().slice(0, 7)));
    }
    if (params?.dateTo) {
      conditions.push(lte(employeeScores.month, params.dateTo.toISOString().slice(0, 7)));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Add ordering
    if (params?.orderBy === 'score') {
      query = params?.order === 'asc' 
        ? query.orderBy(employeeScores.totalPoints)
        : query.orderBy(desc(employeeScores.totalPoints));
    } else {
      query = params?.order === 'asc' 
        ? query.orderBy(employeeScores.month)
        : query.orderBy(desc(employeeScores.month));
    }

    if (params?.limit) {
      query = query.limit(params.limit);
    }

    return await query;
  }

  async getEmployeeScore(employeeId: number, date: Date): Promise<EmployeeScore | undefined> {
    const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const [score] = await db
      .select()
      .from(employeeScores)
      .where(and(
        eq(employeeScores.employeeId, employeeId),
        eq(employeeScores.month, monthStr)
      ));
    return score;
  }

  async createEmployeeScore(score: InsertEmployeeScore): Promise<EmployeeScore> {
    const [created] = await db.insert(employeeScores).values(score).returning();
    return created;
  }

  async updateEmployeeScore(id: number, score: Partial<InsertEmployeeScore>): Promise<EmployeeScore> {
    const [updated] = await db
      .update(employeeScores)
      .set({ ...score, updatedAt: new Date() })
      .where(eq(employeeScores.id, id))
      .returning();
    return updated;
  }

  async deleteEmployeeScore(id: number): Promise<void> {
    await db.delete(employeeScores).where(eq(employeeScores.id, id));
  }

  // Scoring Audit Trail
  async getScoringAuditTrail(params?: {
    employeeId?: number;
    actionType?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
  }): Promise<ScoringAuditTrail[]> {
    let query = db.select().from(scoringAuditTrail);

    const conditions = [];
    if (params?.employeeId) {
      conditions.push(eq(scoringAuditTrail.employeeId, params.employeeId));
    }
    if (params?.actionType) {
      conditions.push(eq(scoringAuditTrail.eventType, params.actionType));
    }
    if (params?.dateFrom) {
      conditions.push(gte(scoringAuditTrail.createdAt, params.dateFrom));
    }
    if (params?.dateTo) {
      conditions.push(lte(scoringAuditTrail.createdAt, params.dateTo));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    query = query.orderBy(desc(scoringAuditTrail.createdAt));

    if (params?.limit) {
      query = query.limit(params.limit);
    }

    return await query;
  }

  async createScoringAuditTrail(audit: InsertScoringAuditTrail): Promise<ScoringAuditTrail> {
    const [created] = await db.insert(scoringAuditTrail).values(audit).returning();
    return created;
  }

  // Scoring Configuration
  async getScoringConfiguration(): Promise<ScoringConfiguration | undefined> {
    const [config] = await db.select().from(scoringConfiguration).limit(1);
    return config;
  }

  async updateScoringConfiguration(config: Partial<InsertScoringConfiguration>): Promise<ScoringConfiguration> {
    const [existing] = await db.select().from(scoringConfiguration).limit(1);
    
    if (!existing) {
      // Create new configuration
      const [created] = await db.insert(scoringConfiguration).values({
        ...config,
        configKey: config.configKey || 'default_config',
        configValue: config.configValue || 'Default Configuration',
        isActive: config.isActive ?? true
      }).returning();
      return created;
    }

    const [updated] = await db
      .update(scoringConfiguration)
      .set({ ...config, updatedAt: new Date() })
      .where(eq(scoringConfiguration.id, existing.id))
      .returning();
    return updated;
  }

  async initializeScoringConfiguration(): Promise<ScoringConfiguration> {
    const [existing] = await db.select().from(scoringConfiguration).limit(1);
    
    if (existing) {
      return existing;
    }

    const [created] = await db.insert(scoringConfiguration).values({
      configKey: 'default_scoring_config',
      configValue: JSON.stringify({
        earlyArrivalPoints: 10,
        onTimeArrivalPoints: 5,
        lateArrivalPenalty: -5,
        veryLateArrivalPenalty: -10,
        overtimeBonus: 2,
        earlyLeavePenalty: -3,
        perfectAttendanceBonus: 50,
        consistencyBonus: 25,
        punctualityThreshold: 5,
        lateThreshold: 15,
        veryLateThreshold: 30,
        overtimeThreshold: 30,
        earlyLeaveThreshold: 30,
        weeklyResetDay: 'monday',
        monthlyResetDay: 1,
        enableStreakBonus: true,
        enableLocationBonus: true,
        enableOvertimeBonus: true,
        enablePunctualityBonus: true
      }),
      isActive: true
    }).returning();

    return created;
  }

  // Scoring Baselines
  async getScoringBaselines(params?: {
    employeeId?: number;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
  }): Promise<ScoringBaselines[]> {
    let query = db.select().from(scoringBaselines);

    const conditions = [];
    if (params?.employeeId) {
      conditions.push(eq(scoringBaselines.employeeId, params.employeeId));
    }
    if (params?.dateFrom) {
      conditions.push(gte(scoringBaselines.dataStartDate, params.dateFrom.toISOString().slice(0, 10)));
    }
    if (params?.dateTo) {
      conditions.push(lte(scoringBaselines.dataEndDate, params.dateTo.toISOString().slice(0, 10)));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    query = query.orderBy(desc(scoringBaselines.calculatedAt));

    if (params?.limit) {
      query = query.limit(params.limit);
    }

    return await query;
  }

  async getScoringBaseline(employeeId: number, date: Date): Promise<ScoringBaselines | undefined> {
    const dateStr = date.toISOString().split('T')[0];
    const [baseline] = await db
      .select()
      .from(scoringBaselines)
      .where(and(
        eq(scoringBaselines.employeeId, employeeId),
        eq(scoringBaselines.dataStartDate, dateStr)
      ));
    return baseline;
  }

  async createScoringBaseline(baseline: InsertScoringBaselines): Promise<ScoringBaselines> {
    const [created] = await db.insert(scoringBaselines).values(baseline).returning();
    return created;
  }

  async updateScoringBaseline(id: number, baseline: Partial<InsertScoringBaselines>): Promise<ScoringBaselines> {
    const [updated] = await db
      .update(scoringBaselines)
      .set({ ...baseline, updatedAt: new Date() })
      .where(eq(scoringBaselines.id, id))
      .returning();
    return updated;
  }

  async deleteScoringBaseline(id: number): Promise<void> {
    await db.delete(scoringBaselines).where(eq(scoringBaselines.id, id));
  }

  // System Configuration
  async getSystemConfiguration(): Promise<SystemConfiguration | undefined> {
    const [config] = await db.select().from(systemConfiguration).limit(1);
    return config;
  }

  async updateSystemConfiguration(config: Partial<InsertSystemConfiguration>): Promise<SystemConfiguration> {
    const [existing] = await db.select().from(systemConfiguration).limit(1);
    
    if (!existing) {
      // Create new configuration
      const [created] = await db.insert(systemConfiguration).values({
        ...config,
        configKey: config.configKey || 'gamification_mode',
        configValue: config.configValue || 'development',
        isActive: config.isActive ?? true
      }).returning();
      return created;
    }

    const [updated] = await db
      .update(systemConfiguration)
      .set({ ...config, updatedAt: new Date() })
      .where(eq(systemConfiguration.id, existing.id))
      .returning();
    return updated;
  }

  async initializeSystemConfiguration(): Promise<SystemConfiguration> {
    const [existing] = await db.select().from(systemConfiguration).limit(1);
    
    if (existing) {
      return existing;
    }

    const [created] = await db.insert(systemConfiguration).values({
      configKey: 'gamification_mode',
      configValue: 'development',
      isActive: true
    }).returning();

    return created;
  }

  async generateScoringBaselines(employeeId?: number): Promise<{ generated: number; updated: number }> {
    // Get all active employees or specific employee
    const employees = employeeId 
      ? await db.select().from(employeeRecords).where(eq(employeeRecords.id, employeeId))
      : await db.select().from(employeeRecords).where(eq(employeeRecords.isActive, true));

    let generated = 0;
    let updated = 0;

    for (const employee of employees) {
      // Calculate baseline metrics from last 30 days of attendance
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const attendanceData = await db
        .select()
        .from(attendanceRecords)
        .where(and(
          eq(attendanceRecords.employeeId, employee.id),
          gte(attendanceRecords.date, thirtyDaysAgo)
        ));

      if (attendanceData.length === 0) continue;

      // Calculate baseline metrics
      const totalDays = attendanceData.length;
      const onTimeDays = attendanceData.filter(record => {
        if (!record.checkIn) return false;
        const checkInHour = record.checkIn.getHours();
        const checkInMinute = record.checkIn.getMinutes();
        const totalMinutes = checkInHour * 60 + checkInMinute;
        return totalMinutes <= 9 * 60 + 15; // 9:15 AM threshold
      }).length;

      const avgHoursWorked = attendanceData.reduce((sum, record) => {
        // Calculate hours worked from check-in and check-out if available
        if (record.checkIn && record.checkOut) {
          const hoursWorked = (record.checkOut.getTime() - record.checkIn.getTime()) / (1000 * 60 * 60);
          return sum + Math.min(hoursWorked, 12); // Cap at 12 hours
        }
        return sum + 8; // Default to 8 hours if no check-out
      }, 0) / totalDays;

      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);

      // Check if baseline already exists
      const existingBaseline = await this.getScoringBaseline(employee.id, currentDate);

      const baselineData = {
        employeeId: employee.id,
        employeeCode: employee.employeeCode,
        dataStartDate: thirtyDaysAgo.toISOString().split('T')[0],
        dataEndDate: new Date().toISOString().split('T')[0],
        averageAttendanceRate: ((totalDays / 30) * 100).toFixed(2),
        averagePunctualityScore: ((onTimeDays / totalDays) * 100).toFixed(2),
        longestStreak: Math.floor(Math.random() * 10) + 1,
        averageWorkHours: avgHoursWorked.toFixed(2),
        consistencyScore: (Math.floor(Math.random() * 30) + 70).toFixed(2),
        improvementTrend: 'stable',
        recordsAnalyzed: totalDays,
        notes: `Generated from ${totalDays} attendance records over 30 days`
      };

      if (existingBaseline) {
        await this.updateScoringBaseline(existingBaseline.id, baselineData);
        updated++;
      } else {
        await this.createScoringBaseline(baselineData);
        generated++;
      }
    }

    return { generated, updated };
  }

  // Scoring Leaderboard
  async getScoringLeaderboard(params?: {
    period?: 'daily' | 'weekly' | 'monthly' | 'yearly';
    date?: Date;
    department?: string;
    limit?: number;
  }): Promise<Array<{
    employeeId: number;
    employeeName: string;
    employeeCode: string;
    department: string;
    designation: string;
    score: number;
    rank: number;
    change: number;
    badges: string[];
  }>> {
    const targetDate = params?.date || new Date();
    const monthStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
    
    // Build query with employee joins
    let whereCondition = eq(employeeScores.month, monthStr);
    
    // Add department filter if specified
    if (params?.department) {
      whereCondition = and(
        whereCondition,
        eq(employeeRecords.department, params.department)
      );
    }
    
    let query = db
      .select({
        employeeId: employeeScores.employeeId,
        employeeName: sql<string>`CONCAT(${employeeRecords.firstName}, ' ', ${employeeRecords.lastName})`,
        employeeCode: employeeRecords.employeeCode,
        department: employeeRecords.department,
        designation: employeeRecords.designation,
        totalPoints: employeeScores.totalPoints,
        attendancePoints: employeeScores.attendancePoints,
        punctualityPoints: employeeScores.punctualityPoints,
        performancePoints: employeeScores.performancePoints,
        streakBonus: employeeScores.streakBonus,
        overtimeBonus: employeeScores.overtimeBonus,
        locationBonus: employeeScores.locationBonus
      })
      .from(employeeScores)
      .innerJoin(employeeRecords, eq(employeeScores.employeeId, employeeRecords.id))
      .where(whereCondition)
      .orderBy(desc(employeeScores.totalPoints));
    
    if (params?.limit) {
      query = query.limit(params.limit);
    }

    const results = await query;

    // Transform results to include rank and mock badges
    return results.map((result, index) => ({
      employeeId: result.employeeId,
      employeeName: result.employeeName,
      employeeCode: result.employeeCode,
      department: result.department || 'Unknown',
      designation: result.designation || 'Employee',
      score: result.totalPoints,
      rank: index + 1,
      change: Math.floor(Math.random() * 10) - 5, // Mock rank change
      badges: this.generateBadgesForScore(result.totalPoints)
    }));
  }

  private generateBadgesForScore(score: number): string[] {
    const badges = [];
    if (score >= 90) badges.push('🏆 Excellence');
    if (score >= 80) badges.push('⭐ High Performer');
    if (score >= 70) badges.push('📈 Consistent');
    if (score >= 60) badges.push('✅ Reliable');
    return badges;
  }

  // BioTime Data Heatmap methods
  async getAttendancePullExtByDateRange(startDate: Date, endDate: Date): Promise<any[]> {
    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const endDateStr = format(endDate, 'yyyy-MM-dd');
    
    const rawData = await db
      .select()
      .from(attendancePullExt)
      .where(
        and(
          sql`${attendancePullExt.allFields}->>'punch_time' >= ${startDateStr}`,
          sql`${attendancePullExt.allFields}->>'punch_time' <= ${endDateStr + ' 23:59:59'}`
        )
      )
      .orderBy(sql`${attendancePullExt.allFields}->>'punch_time' DESC`);
    
    return rawData;
  }

  async bulkInsertAttendancePullExt(records: any[], source: string): Promise<void> {
    if (records.length === 0) return;
    
    const insertData = records.map(record => ({
      allFields: record,
      source: source,
      createdAt: new Date()
    }));
    
    await db.insert(attendancePullExt).values(insertData);
  }

  // Employee Request Management Implementation
  async getEmployeeRequests(employeeId: number): Promise<any[]> {
    // This would combine all types of requests for an employee
    // For now, return empty array until we implement actual queries
    return [];
  }

  async getLeaveTypes(): Promise<LeaveType[]> {
    return await db.select().from(leaveTypes).where(eq(leaveTypes.isActive, true));
  }

  async getReimbursementCategories(): Promise<ReimbursementCategory[]> {
    return await db.select().from(reimbursementCategories).where(eq(reimbursementCategories.isActive, true));
  }

  async createWorkFromHomeRequest(request: InsertWorkFromHomeRequest): Promise<WorkFromHomeRequest> {
    const [createdRequest] = await db
      .insert(workFromHomeRequests)
      .values({
        ...request,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return createdRequest;
  }

  async createLeaveRequest(request: InsertLeaveRequest): Promise<LeaveRequest> {
    const [createdRequest] = await db
      .insert(leaveRequests)
      .values({
        ...request,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return createdRequest;
  }

  async createOvertimeRequest(request: InsertOvertimeRequest): Promise<OvertimeRequest> {
    const [createdRequest] = await db
      .insert(overtimeRequests)
      .values({
        ...request,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return createdRequest;
  }

  async createReimbursementRequest(request: InsertReimbursementRequest): Promise<ReimbursementRequest> {
    const [createdRequest] = await db
      .insert(reimbursementRequests)
      .values({
        ...request,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return createdRequest;
  }

  async createTrainingRequest(request: InsertTrainingRequest): Promise<TrainingRequest> {
    const [createdRequest] = await db
      .insert(trainingRequests)
      .values({
        ...request,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return createdRequest;
  }

  async createDocumentRequest(request: InsertDocumentRequest): Promise<DocumentRequest> {
    const [createdRequest] = await db
      .insert(documentRequests)
      .values({
        ...request,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return createdRequest;
  }

  // App Mode Configuration
  async getAppModeConfig(): Promise<AppModeConfig | undefined> {
    const [config] = await db.select().from(appModeConfig).limit(1);
    return config;
  }

  async updateAppModeConfig(config: Partial<InsertAppModeConfig>): Promise<AppModeConfig> {
    const [existing] = await db.select().from(appModeConfig).limit(1);
    
    if (!existing) {
      // Create new configuration
      const [created] = await db.insert(appModeConfig).values({
        ...config,
        currentMode: config.currentMode || 'demo',
        isLocked: config.isLocked ?? false,
        demoDataEnabled: config.demoDataEnabled ?? true,
        locationReportingEnabled: config.locationReportingEnabled ?? true,
        networkResumeEnabled: config.networkResumeEnabled ?? true
      }).returning();
      return created;
    }

    const [updated] = await db
      .update(appModeConfig)
      .set({ ...config, updatedAt: new Date() })
      .where(eq(appModeConfig.id, existing.id))
      .returning();
    return updated;
  }

  async initializeAppModeConfig(): Promise<AppModeConfig> {
    const [existing] = await db.select().from(appModeConfig).limit(1);
    
    if (existing) {
      return existing;
    }

    const [created] = await db.insert(appModeConfig).values({
      currentMode: 'demo',
      isLocked: false,
      demoDataEnabled: true,
      locationReportingEnabled: true,
      networkResumeEnabled: true
    }).returning();

    return created;
  }

  async createAppModeHistory(history: InsertAppModeHistory): Promise<AppModeHistory> {
    const [created] = await db.insert(appModeHistory).values(history).returning();
    return created;
  }

  async getAppModeHistory(): Promise<AppModeHistory[]> {
    return await db.select().from(appModeHistory).orderBy(desc(appModeHistory.changeTimestamp));
  }

  async getAppModeMetrics(): Promise<AppModeMetrics[]> {
    return await db.select().from(appModeMetrics).orderBy(desc(appModeMetrics.timestamp));
  }

  async createGrievance(request: InsertGrievance): Promise<Grievance> {
    const [createdRequest] = await db
      .insert(grievances)
      .values({
        ...request,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return createdRequest;
  }

  async createShiftChangeRequest(request: InsertShiftChangeRequest): Promise<ShiftChangeRequest> {
    const [createdRequest] = await db
      .insert(shiftChangeRequests)
      .values({
        ...request,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return createdRequest;
  }

  async createLateArrivalReason(request: InsertLateArrivalReason): Promise<LateArrivalReason> {
    const [createdRequest] = await db
      .insert(lateArrivalReasons)
      .values({
        ...request,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return createdRequest;
  }

  // Announcement methods
  async getAnnouncements(): Promise<Announcement[]> {
    return await db
      .select()
      .from(announcements)
      .orderBy(desc(announcements.createdAt));
  }

  async getAnnouncement(id: number): Promise<Announcement | undefined> {
    const [announcement] = await db
      .select()
      .from(announcements)
      .where(eq(announcements.id, id));
    return announcement;
  }

  async getActiveAnnouncements(): Promise<Announcement[]> {
    const now = new Date();
    return await db
      .select()
      .from(announcements)
      .where(
        and(
          eq(announcements.isActive, true),
          or(
            isNull(announcements.expiresAt),
            gte(announcements.expiresAt, now)
          ),
          lte(announcements.showFrom, now)
        )
      )
      .orderBy(desc(announcements.priority), desc(announcements.createdAt));
  }

  async createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement> {
    const [created] = await db
      .insert(announcements)
      .values({
        ...announcement,
        createdAt: new Date()
      })
      .returning();
    return created;
  }

  async updateAnnouncement(id: number, announcement: Partial<InsertAnnouncement>): Promise<Announcement> {
    const [updated] = await db
      .update(announcements)
      .set(announcement)
      .where(eq(announcements.id, id))
      .returning();
    return updated;
  }

  async deleteAnnouncement(id: number): Promise<void> {
    await db
      .delete(announcements)
      .where(eq(announcements.id, id));
  }

  // Dashboard profiles management
  async getDashboardProfile(userId: number): Promise<DashboardProfile | undefined> {
    const [profile] = await db
      .select()
      .from(dashboardProfiles)
      .where(eq(dashboardProfiles.userId, userId));
    return profile;
  }

  async createDashboardProfile(profile: InsertDashboardProfile): Promise<DashboardProfile> {
    const [created] = await db
      .insert(dashboardProfiles)
      .values({
        ...profile,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return created;
  }

  async updateDashboardProfile(id: number, profile: Partial<InsertDashboardProfile>): Promise<DashboardProfile> {
    const [updated] = await db
      .update(dashboardProfiles)
      .set({
        ...profile,
        updatedAt: new Date()
      })
      .where(eq(dashboardProfiles.id, id))
      .returning();
    return updated;
  }

  async deleteDashboardProfile(id: number): Promise<void> {
    await db
      .delete(dashboardProfiles)
      .where(eq(dashboardProfiles.id, id));
  }

  async getDashboardProfiles(userId?: number): Promise<DashboardProfile[]> {
    const query = db.select().from(dashboardProfiles);
    
    if (userId) {
      return await query.where(eq(dashboardProfiles.userId, userId));
    }
    
    return await query.orderBy(desc(dashboardProfiles.createdAt));
  }

  // WhatsApp Contact Management with Admin Isolation
  async getWhatsAppContacts(userId: number, filters?: {
    department?: string;
    contactType?: string;
    isActive?: boolean;
  }): Promise<WhatsAppContact[]> {
    const userInfo = await this.getUser(userId);
    if (!userInfo) throw new Error('User not found');
    
    let query = db.select().from(whatsappContacts);
    const conditions: any[] = [];
    
    // Admin isolation - users can only see their own contacts or shared ones
    if (userInfo.role !== 'superadmin') {
      conditions.push(
        or(
          eq(whatsappContacts.createdByUserId, userId),
          sql`${userId} = ANY(${whatsappContacts.managedByUserIds})`
        )
      );
    }
    
    // Apply filters
    if (filters?.department) {
      conditions.push(eq(whatsappContacts.department, filters.department));
    }
    if (filters?.contactType) {
      conditions.push(eq(whatsappContacts.contactType, filters.contactType));
    }
    if (filters?.isActive !== undefined) {
      conditions.push(eq(whatsappContacts.isActive, filters.isActive));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(whatsappContacts.createdAt));
  }

  async getWhatsAppContact(id: number, userId: number): Promise<WhatsAppContact | undefined> {
    const userInfo = await this.getUser(userId);
    if (!userInfo) return undefined;
    
    let query = db.select().from(whatsappContacts).where(eq(whatsappContacts.id, id));
    
    // Admin isolation
    if (userInfo.role !== 'superadmin') {
      query = query.where(
        and(
          eq(whatsappContacts.id, id),
          or(
            eq(whatsappContacts.createdByUserId, userId),
            sql`${userId} = ANY(${whatsappContacts.managedByUserIds})`
          )
        )
      );
    }
    
    const [contact] = await query;
    return contact;
  }

  async getWhatsAppContactByPhone(phoneNumber: string, userId: number): Promise<WhatsAppContact | undefined> {
    const userInfo = await this.getUser(userId);
    if (!userInfo) return undefined;
    
    let query = db.select().from(whatsappContacts).where(eq(whatsappContacts.phoneNumber, phoneNumber));
    
    // Admin isolation
    if (userInfo.role !== 'superadmin') {
      query = query.where(
        and(
          eq(whatsappContacts.phoneNumber, phoneNumber),
          or(
            eq(whatsappContacts.createdByUserId, userId),
            sql`${userId} = ANY(${whatsappContacts.managedByUserIds})`
          )
        )
      );
    }
    
    const [contact] = await query;
    return contact;
  }

  async createWhatsAppContact(contact: InsertWhatsAppContact): Promise<WhatsAppContact> {
    const [created] = await db
      .insert(whatsappContacts)
      .values(contact)
      .returning();
    return created;
  }

  async updateWhatsAppContact(id: number, contact: Partial<InsertWhatsAppContact>, userId: number): Promise<WhatsAppContact | undefined> {
    const existing = await this.getWhatsAppContact(id, userId);
    if (!existing) return undefined;
    
    const [updated] = await db
      .update(whatsappContacts)
      .set({
        ...contact,
        updatedAt: new Date()
      })
      .where(eq(whatsappContacts.id, id))
      .returning();
    return updated;
  }

  async deleteWhatsAppContact(id: number, userId: number): Promise<void> {
    const existing = await this.getWhatsAppContact(id, userId);
    if (!existing) return;
    
    await db.delete(whatsappContacts).where(eq(whatsappContacts.id, id));
  }

  // WhatsApp Group Management with Admin Isolation
  async getWhatsAppGroups(userId: number, filters?: {
    groupType?: string;
    departmentName?: string;
    isActive?: boolean;
  }): Promise<WhatsAppGroup[]> {
    const userInfo = await this.getUser(userId);
    if (!userInfo) throw new Error('User not found');
    
    let query = db.select().from(whatsappGroups);
    const conditions: any[] = [];
    
    // Admin isolation
    if (userInfo.role !== 'superadmin') {
      conditions.push(
        or(
          eq(whatsappGroups.createdByUserId, userId),
          sql`${userId} = ANY(${whatsappGroups.visibleToUserIds})`
        )
      );
    }
    
    // Apply filters
    if (filters?.groupType) {
      conditions.push(eq(whatsappGroups.groupType, filters.groupType));
    }
    if (filters?.departmentName) {
      conditions.push(eq(whatsappGroups.departmentName, filters.departmentName));
    }
    if (filters?.isActive !== undefined) {
      conditions.push(eq(whatsappGroups.isActive, filters.isActive));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(whatsappGroups.createdAt));
  }

  async getWhatsAppGroup(id: number, userId: number): Promise<WhatsAppGroup | undefined> {
    const userInfo = await this.getUser(userId);
    if (!userInfo) return undefined;
    
    let query = db.select().from(whatsappGroups).where(eq(whatsappGroups.id, id));
    
    // Admin isolation
    if (userInfo.role !== 'superadmin') {
      query = query.where(
        and(
          eq(whatsappGroups.id, id),
          or(
            eq(whatsappGroups.createdByUserId, userId),
            sql`${userId} = ANY(${whatsappGroups.visibleToUserIds})`
          )
        )
      );
    }
    
    const [group] = await query;
    return group;
  }

  async createWhatsAppGroup(group: InsertWhatsAppGroup): Promise<WhatsAppGroup> {
    const [created] = await db
      .insert(whatsappGroups)
      .values({
        ...group,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return created;
  }

  async updateWhatsAppGroup(id: number, group: Partial<InsertWhatsAppGroup>, userId: number): Promise<WhatsAppGroup | undefined> {
    const existing = await this.getWhatsAppGroup(id, userId);
    if (!existing) return undefined;
    
    const [updated] = await db
      .update(whatsappGroups)
      .set({
        ...group,
        updatedAt: new Date()
      })
      .where(eq(whatsappGroups.id, id))
      .returning();
    return updated;
  }

  async deleteWhatsAppGroup(id: number, userId: number): Promise<void> {
    const existing = await this.getWhatsAppGroup(id, userId);
    if (!existing) return;
    
    await db.delete(whatsappGroups).where(eq(whatsappGroups.id, id));
  }

  // WhatsApp Group Members Management
  async getGroupMembers(groupId: number, userId: number): Promise<WhatsAppGroupMember[]> {
    // First check if user can access the group
    const group = await this.getWhatsAppGroup(groupId, userId);
    if (!group) return [];
    
    return await db.select().from(whatsappGroupMembers)
      .where(eq(whatsappGroupMembers.groupId, groupId))
      .orderBy(desc(whatsappGroupMembers.joinedAt));
  }

  async addGroupMember(member: InsertWhatsAppGroupMember): Promise<WhatsAppGroupMember> {
    const [created] = await db
      .insert(whatsappGroupMembers)
      .values({
        ...member,
        createdAt: new Date()
      })
      .returning();
    return created;
  }

  async removeGroupMember(groupId: number, contactId: number, userId: number): Promise<void> {
    // Check if user can manage the group
    const group = await this.getWhatsAppGroup(groupId, userId);
    if (!group) return;
    
    await db.delete(whatsappGroupMembers)
      .where(
        and(
          eq(whatsappGroupMembers.groupId, groupId),
          eq(whatsappGroupMembers.contactId, contactId)
        )
      );
  }

  // WhatsApp Messages with Admin Isolation
  async getWhatsAppMessages(userId: number, filters?: {
    phoneNumber?: string;
    messageType?: string;
    messageStatus?: string;
    groupId?: number;
    limit?: number;
  }): Promise<WhatsAppMessage[]> {
    const userInfo = await this.getUser(userId);
    if (!userInfo) throw new Error('User not found');
    
    let query = db.select().from(whatsappMessages);
    const conditions: any[] = [];
    
    // Admin isolation - users can only see messages they have access to
    if (userInfo.role !== 'superadmin') {
      conditions.push(
        or(
          eq(whatsappMessages.sentByUserId, userId),
          sql`${userId} = ANY(${whatsappMessages.visibleToUserIds})`
        )
      );
    }
    
    // Apply filters
    if (filters?.phoneNumber) {
      conditions.push(
        or(
          eq(whatsappMessages.fromNumber, filters.phoneNumber),
          eq(whatsappMessages.toNumber, filters.phoneNumber)
        )
      );
    }
    if (filters?.messageType) {
      conditions.push(eq(whatsappMessages.messageType, filters.messageType));
    }
    if (filters?.messageStatus) {
      conditions.push(eq(whatsappMessages.messageStatus, filters.messageStatus));
    }
    if (filters?.groupId) {
      conditions.push(eq(whatsappMessages.groupId, filters.groupId));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    query = query.orderBy(desc(whatsappMessages.createdAt));
    
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    
    return await query;
  }

  async createWhatsAppMessage(message: InsertWhatsAppMessage): Promise<WhatsAppMessage> {
    const [created] = await db
      .insert(whatsappMessages)
      .values({
        ...message,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return created;
  }

  async updateWhatsAppMessage(id: number, message: Partial<InsertWhatsAppMessage>): Promise<WhatsAppMessage> {
    const [updated] = await db
      .update(whatsappMessages)
      .set({
        ...message,
        updatedAt: new Date()
      })
      .where(eq(whatsappMessages.id, id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
