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

  async getUserByUsername(username: string) {
    try {
      const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
      return result[0] || null;
    } catch (error) {
      console.error('Error getting user by username:', error);
      throw error;
    }
  },

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
The code has been updated to use proper Drizzle select syntax in getUserByUsername function.