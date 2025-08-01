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
  getWhatsAppMessages(userId: number, filters?: {
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
// Basic storage implementation to support the API routes
// This would normally be implemented with your actual database

interface Employee {
  id: number;
  employeeCode: string;
  firstName: string;
  lastName: string;
  department?: string;
  position?: string;
  salary?: number;
  isActive?: boolean;
}

interface AttendanceRecord {
  id: number;
  employeeCode: string;
  checkIn?: Date;
  checkOut?: Date;
  hoursWorked?: number;
  totalHours?: number;
  location?: string;
  createdAt: Date;
}

class Storage {
  // Mock implementation - replace with actual database queries

  async getEmployees(params: any = {}) {
    // This should be replaced with actual database query
    console.log('getEmployees called with params:', params);

    // Return mock data for now
    return {
      employees: [
        {
          id: 1,
          employeeCode: 'EMP001',
          firstName: 'John',
          lastName: 'Doe',
          department: 'IT',
          position: 'Developer',
          salary: 50000,
          isActive: true
        },
        {
          id: 2,
          employeeCode: 'EMP002',
          firstName: 'Jane',
          lastName: 'Smith',
          department: 'HR',
          position: 'Manager',
          salary: 60000,
          isActive: true
        }
      ],
      total: 2
    };
  }

  async getEmployeeById(id: number) {
    console.log('getEmployeeById called with id:', id);

    return {
      id: 1,
      employeeCode: 'EMP001',
      firstName: 'John',
      lastName: 'Doe',
      department: 'IT',
      position: 'Developer',
      salary: 50000,
      isActive: true
    };
  }

  async getAttendanceRecords(params: any = {}) {
    console.log('getAttendanceRecords called with params:', params);

    // Return mock attendance data
    const mockRecords = [
      {
        id: 1,
        employeeCode: 'EMP001',
        checkIn: new Date(),
        checkOut: null,
        hoursWorked: 8,
        totalHours: 8,
        location: 'Main Office',
        createdAt: new Date()
      },
      {
        id: 2,
        employeeCode: 'EMP002',
        checkIn: new Date(Date.now() - 3600000), // 1 hour ago
        checkOut: new Date(),
        hoursWorked: 8.5,
        totalHours: 8.5,
        location: 'Main Office',
        createdAt: new Date()
      }
    ];

    return {
      records: mockRecords,
      total: mockRecords.length
    };
  }

  async createEmployee(employeeData: any) {
    console.log('createEmployee called with data:', employeeData);

    return {
      id: Date.now(),
      ...employeeData
    };
  }

  async updateEmployee(id: number, updateData: any) {
    console.log('updateEmployee called with id:', id, 'data:', updateData);

    return {
      id,
      ...updateData
    };
  }

  async deleteEmployee(id: number) {
    console.log('deleteEmployee called with id:', id);
    return true;
  }
}