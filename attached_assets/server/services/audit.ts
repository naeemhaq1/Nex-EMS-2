import { db } from "../db";
import { auditLogs, type InsertAuditLog } from "@shared/schema";
import type { Request } from "express";

export interface AuditContext {
  userId?: number;
  username: string;
  userRole: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

export class AuditService {
  /**
   * Extract audit context from Express request
   */
  static getContextFromRequest(req: Request): AuditContext {
    const session = req.session as any;
    const user = session?.user;
    
    return {
      userId: user?.id,
      username: user?.username || 'anonymous',
      userRole: user?.role || 'unknown',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      sessionId: req.sessionID
    };
  }

  /**
   * Log a user action with full audit trail
   */
  static async logAction(
    context: AuditContext,
    action: string,
    entityType?: string,
    entityId?: string,
    oldValues?: any,
    newValues?: any,
    details?: string
  ): Promise<void> {
    try {
      const auditLog: InsertAuditLog = {
        userId: context.userId,
        username: context.username,
        userRole: context.userRole,
        action,
        entityType,
        entityId,
        oldValues: oldValues ? JSON.stringify(oldValues) : null,
        newValues: newValues ? JSON.stringify(newValues) : null,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        sessionId: context.sessionId,
        details
      };

      await db.insert(auditLogs).values(auditLog);
      
      console.log(`[AUDIT] ${context.username} (${context.userRole}) performed ${action}${entityType ? ` on ${entityType}` : ''}${entityId ? ` ID:${entityId}` : ''}`);
    } catch (error) {
      console.error('[AUDIT] Failed to log action:', error);
      // Don't throw error to avoid breaking the main operation
    }
  }

  /**
   * Log login action
   */
  static async logLogin(context: AuditContext, success: boolean): Promise<void> {
    await this.logAction(
      context,
      success ? 'LOGIN' : 'LOGIN_FAILED',
      undefined,
      undefined,
      undefined,
      undefined,
      success ? 'User logged in successfully' : 'Failed login attempt'
    );
  }

  /**
   * Log logout action
   */
  static async logLogout(context: AuditContext): Promise<void> {
    await this.logAction(
      context,
      'LOGOUT',
      undefined,
      undefined,
      undefined,
      undefined,
      'User logged out'
    );
  }

  /**
   * Log attendance record creation
   */
  static async logAttendanceCreate(
    context: AuditContext,
    record: any
  ): Promise<void> {
    await this.logAction(
      context,
      'CREATE',
      'attendance_record',
      record.id?.toString(),
      undefined,
      record,
      `Created attendance record for employee ${record.employeeCode}`
    );
  }

  /**
   * Log attendance record update
   */
  static async logAttendanceUpdate(
    context: AuditContext,
    recordId: string,
    oldValues: any,
    newValues: any
  ): Promise<void> {
    await this.logAction(
      context,
      'UPDATE',
      'attendance_record',
      recordId,
      oldValues,
      newValues,
      `Updated attendance record fields: ${Object.keys(newValues).join(', ')}`
    );
  }

  /**
   * Log attendance record deletion
   */
  static async logAttendanceDelete(
    context: AuditContext,
    recordId: string,
    record: any
  ): Promise<void> {
    await this.logAction(
      context,
      'DELETE',
      'attendance_record',
      recordId,
      record,
      { status: 'deleted' },
      `Deleted attendance record for employee ${record.employeeCode}`
    );
  }

  /**
   * Log drag and drop status change
   */
  static async logAttendanceStatusChange(
    context: AuditContext,
    recordId: string,
    fromStatus: string,
    toStatus: string,
    employeeCode: string
  ): Promise<void> {
    await this.logAction(
      context,
      'MOVE',
      'attendance_record',
      recordId,
      { status: fromStatus },
      { status: toStatus },
      `Moved attendance record from "${fromStatus}" to "${toStatus}" for employee ${employeeCode}`
    );
  }

  /**
   * Log bulk operations
   */
  static async logBulkOperation(
    context: AuditContext,
    action: string,
    entityType: string,
    count: number,
    details?: string
  ): Promise<void> {
    await this.logAction(
      context,
      `BULK_${action}`,
      entityType,
      undefined,
      undefined,
      { count },
      details || `Performed bulk ${action.toLowerCase()} on ${count} ${entityType} records`
    );
  }

  /**
   * Get audit logs with filtering and pagination
   */
  static async getAuditLogs(params: {
    userId?: number;
    action?: string;
    entityType?: string;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    limit?: number;
  } = {}) {
    const { page = 1, limit = 50 } = params;
    const offset = (page - 1) * limit;

    let query = db.select().from(auditLogs);

    // Apply filters (simplified for now)
    const logs = await query
      .orderBy(auditLogs.timestamp)
      .limit(limit)
      .offset(offset);

    const totalQuery = db.select({ count: auditLogs.id }).from(auditLogs);
    const [{ count }] = await totalQuery;

    return {
      logs,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    };
  }
}

export const auditService = AuditService;