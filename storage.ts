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
  type AppModeConfig,
  type InsertAppModeConfig,
  type AppModeHistory,
  type InsertAppModeHistory,
  type AppModeMetrics
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
  async getWhatsAppMessages(userId: number, filters?: {
    phoneNumber?: string;
    messageType?: string;
    messageStatus?: string;
    groupId?: number;
    limit?: number;
  }): Promise<WhatsAppMessage[]> {
    const userInfo = await this.getUser(userId);
    if (!userInfo) throw new Error('User not found');

    const whatsappMessages = (await import('@shared/schema')).whatsappMessages;
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
    const whatsappMessages = (await import('@shared/schema')).whatsappMessages;
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
    const whatsappMessages = (await import('@shared/schema')).whatsappMessages;
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

class DatabaseStorage implements IStorage {
  // Implementation methods will be added here
  async getUser(id: number): Promise<User | undefined> {
    return await db.select().from(users).where(eq(users.id, id)).then(rows => rows[0]);
  }

  async getUserById(id: number): Promise<User | undefined> {
    return this.getUser(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return await db.select().from(users).where(eq(users.username, username)).then(rows => rows[0]);
  }

  async getUserByEmployeeId(employeeId: string): Promise<User | undefined> {
    return await db.select().from(users).where(eq(users.employeeId, employeeId)).then(rows => rows[0]);
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    return await db.select().from(users).where(eq(users.resetToken, token)).then(rows => rows[0]);
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User> {
    const [updated] = await db.update(users).set(user).where(eq(users.id, id)).returning();
    return updated;
  }

  async deleteUser(id: number): Promise<boolean> {
    await db.delete(users).where(eq(users.id, id));
    return true;
  }

  // Add other required interface methods with basic implementations
  async getRolePermissions(): Promise<RolePermission[]> { return []; }
  async getRolePermissionByName(roleName: string): Promise<RolePermission | undefined> { return undefined; }
  async createRolePermission(permission: InsertRolePermission): Promise<RolePermission> { throw new Error('Not implemented'); }
  async updateRolePermission(id: number, permission: Partial<InsertRolePermission>): Promise<RolePermission> { throw new Error('Not implemented'); }
  async getUserPermissions(userId: number): Promise<RolePermission | undefined> { return undefined; }
  async canUserCreateRole(userId: number, targetRole: string): Promise<boolean> { return false; }
  async getManagerAssignments(userId?: number, roleType?: string): Promise<ManagerAssignment[]> { return []; }
  async createManagerAssignment(assignment: InsertManagerAssignment): Promise<ManagerAssignment> { throw new Error('Not implemented'); }
  async deleteManagerAssignment(id: number): Promise<void> {}
  async getManagersByDepartment(departmentName: string, roleType?: string): Promise<User[]> { return []; }
  async getDepartmentsByManager(userId: number, roleType?: string): Promise<string[]> { return []; }
  async getEmployee(id: number): Promise<Employee | undefined> { return undefined; }
  async getEmployeeByCode(code: string): Promise<Employee | undefined> { return undefined; }
  async getEmployees(params?: any): Promise<{ employees: Employee[]; total: number }> { return { employees: [], total: 0 }; }
  async getEmployeesWithDepartmentAccess(params?: any, user?: User): Promise<{ employees: Employee[]; total: number }> { return { employees: [], total: 0 }; }
  async createEmployee(employee: InsertEmployee): Promise<Employee> { throw new Error('Not implemented'); }
  async updateEmployee(id: number, employee: Partial<InsertEmployee>): Promise<Employee> { throw new Error('Not implemented'); }
  async getAllEmployees(): Promise<Employee[]> { return []; }
  async getAllEmployeesWithDepartmentAccess(user?: User): Promise<Employee[]> { return []; }
  async getLastEmployee(): Promise<Employee | undefined> { return undefined; }
  async getEmployeeCount(params?: any): Promise<number> { return 0; }
  async getEmployeeStatusData(): Promise<any[]> { return []; }
  async getAttendanceRecord(id: number): Promise<AttendanceRecord | undefined> { return undefined; }
  async getAttendanceRecords(params?: any): Promise<{ records: AttendanceRecord[]; total: number }> { return { records: [], total: 0 }; }
  async createAttendanceRecord(record: InsertAttendance): Promise<AttendanceRecord> { throw new Error('Not implemented'); }
  async updateAttendanceRecord(id: number, record: Partial<InsertAttendance>): Promise<AttendanceRecord> { throw new Error('Not implemented'); }
  async getDashboardMetrics(): Promise<any> { return {}; }
  async getRecentActivity(limit?: number): Promise<any[]> { return []; }
  async insertEmployeePullData(data: any[]): Promise<void> {}
  async insertAttendancePullData(data: any[]): Promise<void> {}
  async processEmployeeData(): Promise<number> { return 0; }
  async processAttendanceData(): Promise<number> { return 0; }
  async updateSyncStatus(type: string, status: string, recordsProcessed?: number, recordsTotal?: number, error?: string, currentPage?: number, lastProcessedId?: string): Promise<void> {}
  async getSyncStatus(): Promise<any[]> { return []; }
  async getDevices(): Promise<Device[]> { return []; }
  async getDevice(id: number): Promise<Device | undefined> { return undefined; }
  async createDevice(device: InsertDevice): Promise<Device> { throw new Error('Not implemented'); }
  async updateDevice(id: number, device: Partial<InsertDevice>): Promise<Device> { throw new Error('Not implemented'); }
  async deleteDevice(id: number): Promise<void> {}
  async getSelectedDevices(): Promise<Device[]> { return []; }
  async updateDeviceSelection(deviceId: string, isSelected: boolean): Promise<void> {}
  async getShifts(): Promise<Shift[]> { return []; }
  async getShift(id: number): Promise<Shift | undefined> { return undefined; }
  async createShift(shift: InsertShift): Promise<Shift> { throw new Error('Not implemented'); }
  async updateShift(id: number, shift: Partial<InsertShift>): Promise<Shift> { throw new Error('Not implemented'); }
  async deleteShift(id: number): Promise<void> {}
  async getAuditLogs(params?: any): Promise<{ logs: AuditLog[]; total: number }> { return { logs: [], total: 0 }; }
  async getShiftAssignments(params?: any): Promise<ShiftAssignment[]> { return []; }
  async getShiftAssignment(id: number): Promise<ShiftAssignment | undefined> { return undefined; }
  async createShiftAssignment(assignment: InsertShiftAssignment): Promise<ShiftAssignment> { throw new Error('Not implemented'); }
  async updateShiftAssignment(id: number, assignment: Partial<InsertShiftAssignment>): Promise<ShiftAssignment> { throw new Error('Not implemented'); }
  async deleteShiftAssignment(id: number): Promise<void> {}
  async getSetting(key: string): Promise<Setting | undefined> { return undefined; }
  async getSettings(category?: string): Promise<Setting[]> { return []; }
  async setSetting(setting: InsertSetting): Promise<Setting> { throw new Error('Not implemented'); }
  async updateSetting(key: string, value: string, updatedBy?: number): Promise<Setting> { throw new Error('Not implemented'); }
  async deleteSetting(key: string): Promise<void> {}
  async getDepartments(): Promise<string[]> { return []; }
  async getDepartmentsForExclusions(): Promise<any[]> { return []; }
  async getEmployeesWithoutDepartment(): Promise<{ employees: Employee[]; total: number }> { return { employees: [], total: 0 }; }
  async getPositions(): Promise<string[]> { return []; }
  async getDesignations(): Promise<string[]> { return []; }
  async getDepartmentGroups(): Promise<DepartmentGroup[]> { return []; }
  async getDepartmentGroup(id: number): Promise<DepartmentGroup | undefined> { return undefined; }
  async createDepartmentGroup(group: InsertDepartmentGroup): Promise<DepartmentGroup> { throw new Error('Not implemented'); }
  async updateDepartmentGroup(id: number, group: Partial<InsertDepartmentGroup>): Promise<DepartmentGroup> { throw new Error('Not implemented'); }
  async deleteDepartmentGroup(id: number): Promise<void> {}
  async createActionRecord(record: InsertActionRecord): Promise<ActionRecord> { throw new Error('Not implemented'); }
  async getActionRecords(params?: any): Promise<{ records: ActionRecord[]; total: number }> { return { records: [], total: 0 }; }
  async getActionRecord(id: number): Promise<ActionRecord | undefined> { return undefined; }
  getDb(): any { return db; }
  async getRawAttendanceForToday(startDate: Date, endDate: Date): Promise<any[]> { return []; }
  async getAttendancePullExtByDateRange(startDate: Date, endDate: Date): Promise<any[]> { return []; }
  async bulkInsertAttendancePullExt(records: any[], source: string): Promise<void> {}
  async getAttendancePolicySettings(): Promise<AttendancePolicySettings | undefined> { return undefined; }
  async createAttendancePolicySettings(settings: InsertAttendancePolicySettings): Promise<AttendancePolicySettings> { throw new Error('Not implemented'); }
  async updateAttendancePolicySettings(id: number, settings: Partial<InsertAttendancePolicySettings>): Promise<AttendancePolicySettings> { throw new Error('Not implemented'); }
  async getEmployeeStreak(employeeId: number): Promise<AttendanceStreak | undefined> { return undefined; }
  async updateEmployeeStreak(employeeId: number, data: Partial<InsertAttendanceStreak>): Promise<AttendanceStreak> { throw new Error('Not implemented'); }
  async createEmployeeStreak(data: InsertAttendanceStreak): Promise<AttendanceStreak> { throw new Error('Not implemented'); }
  async getBadges(params?: any): Promise<Badge[]> { return []; }
  async getBadge(id: number): Promise<Badge | undefined> { return undefined; }
  async createBadge(badge: InsertBadge): Promise<Badge> { throw new Error('Not implemented'); }
  async updateBadge(id: number, badge: Partial<InsertBadge>): Promise<Badge> { throw new Error('Not implemented'); }
  async deleteBadge(id: number): Promise<void> {}
  async getEmployeeBadges(employeeId: number): Promise<any[]> { return []; }
  async awardBadge(employeeId: number, badgeId: number): Promise<EmployeeBadge> { throw new Error('Not implemented'); }
  async updateBadgeProgress(employeeId: number, badgeId: number, progress: number): Promise<void> {}
  async createGamificationEvent(event: InsertGamificationEvent): Promise<GamificationEvent> { throw new Error('Not implemented'); }
  async getGamificationEvents(params?: any): Promise<GamificationEvent[]> { return []; }
  async getTopPerformers(limit?: number): Promise<any[]> { return []; }
  async getLeaderboard(period?: string): Promise<any[]> { return []; }
  async createExternalAttendance(data: InsertAttendanceExternal): Promise<AttendanceExternal> { throw new Error('Not implemented'); }
  async getExternalAttendance(params?: any): Promise<AttendanceExternal[]> { return []; }
  async approveExternalAttendance(id: number, approvedBy: number): Promise<void> {}
  async rejectExternalAttendance(id: number, approvedBy: number, reason: string): Promise<void> {}
  async createForcedPunchout(punchout: InsertForcedPunchout): Promise<ForcedPunchout> { throw new Error('Not implemented'); }
  async getForcedPunchouts(params?: any): Promise<ForcedPunchout[]> { return []; }
  async getForcedPunchout(id: number): Promise<ForcedPunchout | undefined> { return undefined; }
  async getExclusions(): Promise<Exclusion[]> { return []; }
  async createExclusion(data: InsertExclusion): Promise<Exclusion> { throw new Error('Not implemented'); }
  async updateExclusion(id: number, data: Partial<InsertExclusion>): Promise<Exclusion> { throw new Error('Not implemented'); }
  async deleteExclusion(id: number): Promise<void> {}
  async deleteExclusionsBulk(ids: number[]): Promise<void> {}
  async getExclusionsByType(type: 'department' | 'employee'): Promise<Exclusion[]> { return []; }
  async getTeamTemplates(): Promise<TeamTemplate[]> { return []; }
  async getTeamTemplate(id: number): Promise<TeamTemplate | undefined> { return undefined; }
  async createTeamTemplate(template: InsertTeamTemplate): Promise<TeamTemplate> { throw new Error('Not implemented'); }
  async updateTeamTemplate(id: number, template: Partial<InsertTeamTemplate>): Promise<TeamTemplate> { throw new Error('Not implemented'); }
  async deleteTeamTemplate(id: number): Promise<void> {}
  async getAssembledTeams(params?: any): Promise<AssembledTeam[]> { return []; }
  async getAssembledTeam(id: number): Promise<AssembledTeam | undefined> { return undefined; }
  async createAssembledTeam(team: InsertAssembledTeam): Promise<AssembledTeam> { throw new Error('Not implemented'); }
  async updateAssembledTeam(id: number, team: Partial<InsertAssembledTeam>): Promise<AssembledTeam> { throw new Error('Not implemented'); }
  async deleteAssembledTeam(id: number): Promise<void> {}
  async getTeamMembers(teamId: number): Promise<TeamMember[]> { return []; }
  async getTeamMember(id: number): Promise<TeamMember | undefined> { return undefined; }
  async createTeamMember(member: InsertTeamMember): Promise<TeamMember> { throw new Error('Not implemented'); }
  async updateTeamMember(id: number, member: Partial<InsertTeamMember>): Promise<TeamMember> { throw new Error('Not implemented'); }
  async deleteTeamMember(id: number): Promise<void> {}
  async deleteTeamMembersByTeam(teamId: number): Promise<void> {}
  async addTeamMember(member: InsertTeamMember): Promise<TeamMember> { throw new Error('Not implemented'); }
  async removeTeamMember(id: number): Promise<void> {}
  async getDepartmentManagers(): Promise<any[]> { return []; }
  async assignDepartmentManager(userId: number, departments: string[]): Promise<User> { throw new Error('Not implemented'); }
  async removeDepartmentManager(userId: number): Promise<void> {}
  async getTeamShifts(teamId: number): Promise<ShiftAssignment[]> { return []; }
  async assignTeamShift(teamId: number, shiftData: any): Promise<ShiftAssignment> { throw new Error('Not implemented'); }
  async getWhatsappOnboardingRequests(params?: any): Promise<{ requests: WhatsappOnboardingRequest[]; total: number }> { return { requests: [], total: 0 }; }
  async createWhatsappOnboardingRequest(request: InsertWhatsappOnboardingRequest): Promise<WhatsappOnboardingRequest> { throw new Error('Not implemented'); }
  async updateWhatsappOnboardingRequest(id: number, request: Partial<InsertWhatsappOnboardingRequest>): Promise<WhatsappOnboardingRequest> { throw new Error('Not implemented'); }
  async deleteWhatsappOnboardingRequest(id: number): Promise<void> {}
  async getWhatsappOnboardingRequestByPhone(phoneNumber: string): Promise<WhatsappOnboardingRequest | undefined> { return undefined; }
  async createWhatsappMessageLog(log: InsertWhatsappMessageLog): Promise<WhatsappMessageLog> { throw new Error('Not implemented'); }
  async logWhatsappMessage(log: InsertWhatsappMessageLog): Promise<WhatsappMessageLog> { throw new Error('Not implemented'); }
  async getWhatsappMessageLogs(params?: any): Promise<WhatsappMessageLog[]> { return []; }
  async getWhatsappOnboardingStats(): Promise<WhatsappOnboardingStats | undefined> { return undefined; }
  async updateWhatsappOnboardingStats(updates: Partial<InsertWhatsappOnboardingStats>): Promise<WhatsappOnboardingStats> { throw new Error('Not implemented'); }
  async initializeWhatsappOnboardingStats(): Promise<WhatsappOnboardingStats> { throw new Error('Not implemented'); }
  async getScoringRules(): Promise<ScoringRule[]> { return []; }
  async getScoringRule(id: number): Promise<ScoringRule | undefined> { return undefined; }
  async createScoringRule(rule: InsertScoringRule): Promise<ScoringRule> { throw new Error('Not implemented'); }
  async updateScoringRule(id: number, rule: Partial<InsertScoringRule>): Promise<ScoringRule> { throw new Error('Not implemented'); }
  async deleteScoringRule(id: number): Promise<void> {}
  async getEmployeeScores(params?: any): Promise<EmployeeScore[]> { return []; }
  async getEmployeeScore(employeeId: number, date: Date): Promise<EmployeeScore | undefined> { return undefined; }
  async createEmployeeScore(score: InsertEmployeeScore): Promise<EmployeeScore> { throw new Error('Not implemented'); }
  async updateEmployeeScore(id: number, score: Partial<InsertEmployeeScore>): Promise<EmployeeScore> { throw new Error('Not implemented'); }
  async deleteEmployeeScore(id: number): Promise<void> {}
  async getScoringAuditTrail(params?: any): Promise<ScoringAuditTrail[]> { return []; }
  async createScoringAuditTrail(audit: InsertScoringAuditTrail): Promise<ScoringAuditTrail> { throw new Error('Not implemented'); }
  async getScoringConfiguration(): Promise<ScoringConfiguration | undefined> { return undefined; }
  async updateScoringConfiguration(config: Partial<InsertScoringConfiguration>): Promise<ScoringConfiguration> { throw new Error('Not implemented'); }
  async initializeScoringConfiguration(): Promise<ScoringConfiguration> { throw new Error('Not implemented'); }
  async getScoringBaselines(params?: any): Promise<ScoringBaselines[]> { return []; }
  async getScoringBaseline(employeeId: number, date: Date): Promise<ScoringBaselines | undefined> { return undefined; }
  async createScoringBaseline(baseline: InsertScoringBaselines): Promise<ScoringBaselines> { throw new Error('Not implemented'); }
  async updateScoringBaseline(id: number, baseline: Partial<InsertScoringBaselines>): Promise<ScoringBaselines> { throw new Error('Not implemented'); }
  async deleteScoringBaseline(id: number): Promise<void> {}
  async generateScoringBaselines(employeeId?: number): Promise<{ generated: number; updated: number }> { return { generated: 0, updated: 0 }; }
  async getScoringLeaderboard(params?: any): Promise<any[]> { return []; }
  async getEmployeeRequests(employeeId: number): Promise<any[]> { return []; }
  async getLeaveTypes(): Promise<LeaveType[]> { return []; }
  async getReimbursementCategories(): Promise<ReimbursementCategory[]> { return []; }
  async createWorkFromHomeRequest(request: InsertWorkFromHomeRequest): Promise<WorkFromHomeRequest> { throw new Error('Not implemented'); }
  async createLeaveRequest(request: InsertLeaveRequest): Promise<LeaveRequest> { throw new Error('Not implemented'); }
  async createOvertimeRequest(request: InsertOvertimeRequest): Promise<OvertimeRequest> { throw new Error('Not implemented'); }
  async createReimbursementRequest(request: InsertReimbursementRequest): Promise<ReimbursementRequest> { throw new Error('Not implemented'); }
  async createTrainingRequest(request: InsertTrainingRequest): Promise<TrainingRequest> { throw new Error('Not implemented'); }
  async createDocumentRequest(request: InsertDocumentRequest): Promise<DocumentRequest> { throw new Error('Not implemented'); }
  async createGrievance(request: InsertGrievance): Promise<Grievance> { throw new Error('Not implemented'); }
  async createShiftChangeRequest(request: InsertShiftChangeRequest): Promise<ShiftChangeRequest> { throw new Error('Not implemented'); }
  async createLateArrivalReason(request: InsertLateArrivalReason): Promise<LateArrivalReason> { throw new Error('Not implemented'); }
  async getAnnouncements(params?: any): Promise<Announcement[]> { return []; }
  async getAnnouncement(id: number): Promise<Announcement | undefined> { return undefined; }
  async getActiveAnnouncements(params?: any): Promise<Announcement[]> { return []; }
  async createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement> { throw new Error('Not implemented'); }
  async updateAnnouncement(id: number, announcement: Partial<InsertAnnouncement>): Promise<Announcement | undefined> { return undefined; }
  async deleteAnnouncement(id: number): Promise<void> {}
  async getDashboardProfile(userId: number): Promise<DashboardProfile | undefined> { return undefined; }
  async createDashboardProfile(profile: InsertDashboardProfile): Promise<DashboardProfile> { throw new Error('Not implemented'); }
  async updateDashboardProfile(id: number, profile: Partial<InsertDashboardProfile>): Promise<DashboardProfile> { throw new Error('Not implemented'); }
  async deleteDashboardProfile(id: number): Promise<void> {}
  async getDashboardProfiles(userId?: number): Promise<DashboardProfile[]> { return []; }
  async getWhatsAppContacts(userId: number, filters?: any): Promise<WhatsAppContact[]> { return []; }
  async getWhatsAppContact(id: number, userId: number): Promise<WhatsAppContact | undefined> { return undefined; }
  async getWhatsAppContactByPhone(phoneNumber: string, userId: number): Promise<WhatsAppContact | undefined> { return undefined; }
  async createWhatsAppContact(contact: InsertWhatsAppContact): Promise<WhatsAppContact> { throw new Error('Not implemented'); }
  async updateWhatsAppContact(id: number, contact: Partial<InsertWhatsAppContact>, userId: number): Promise<WhatsAppContact | undefined> { return undefined; }
  async deleteWhatsAppContact(id: number, userId: number): Promise<void> {}
  async getWhatsAppGroups(userId: number, filters?: any): Promise<WhatsAppGroup[]> { return []; }
  async getWhatsAppGroup(id: number, userId: number): Promise<WhatsAppGroup | undefined> { return undefined; }
  async createWhatsAppGroup(group: InsertWhatsAppGroup): Promise<WhatsAppGroup> { throw new Error('Not implemented'); }
  async updateWhatsAppGroup(id: number, group: Partial<InsertWhatsAppGroup>, userId: number): Promise<WhatsAppGroup | undefined> { return undefined; }
  async deleteWhatsAppGroup(id: number, userId: number): Promise<void> {}
  async getGroupMembers(groupId: number, userId: number): Promise<WhatsAppGroupMember[]> { return []; }
  async addGroupMember(member: InsertWhatsAppGroupMember): Promise<WhatsAppGroupMember> { throw new Error('Not implemented'); }
  async removeGroupMember(groupId: number, contactId: number, userId: number): Promise<void> {}
}

export const storage = new DatabaseStorage();