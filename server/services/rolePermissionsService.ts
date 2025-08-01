import { db } from "../db";
import { users, employeeRecords, rolePermissions } from "../../shared/schema";
import { eq } from "drizzle-orm";

export interface EmployeePermissions {
  canAccessAllEmployees: boolean;
  canAccessAttendanceData: boolean;
  canAccessScheduleData: boolean;
  canAccessPayrollData: boolean;
  canModifyData: boolean;
  managedDepartments: string[];
  role: string;
  employeeCode?: string;
}

export class RolePermissionsService {
  
  /**
   * Get permissions for employee based on their role and position
   */
  async getEmployeePermissions(phoneNumber: string): Promise<EmployeePermissions | null> {
    try {
      console.log(`[Role Permissions] Checking permissions for: ${phoneNumber}`);
      
      // Find employee by WhatsApp number
      const employee = await db
        .select()
        .from(employeeRecords)
        .where(eq(employeeRecords.wanumber, phoneNumber))
        .limit(1);
      
      if (!employee[0]) {
        console.log(`[Role Permissions] Employee not found for phone: ${phoneNumber}`);
        return null;
      }
      
      // Check if employee has a user account (for admin permissions)
      let userAccount = null;
      if (employee[0].employeeCode) {
        const userAccounts = await db
          .select()
          .from(users)
          .where(eq(users.employeeId, employee[0].employeeCode))
          .limit(1);
        userAccount = userAccounts[0] || null;
      }
      
      // Determine role and permissions
      const role = userAccount?.role || 'staff';
      const isAdmin = ['superadmin', 'general_admin', 'admin'].includes(role);
      const isManager = ['manager', 'assistant_manager'].includes(role);
      
      const permissions: EmployeePermissions = {
        canAccessAllEmployees: isAdmin,
        canAccessAttendanceData: true, // Everyone can access their own attendance
        canAccessScheduleData: true,   // Everyone can access their own schedule
        canAccessPayrollData: isAdmin || isManager, // Only admin/managers can access payroll
        canModifyData: isAdmin,
        managedDepartments: userAccount?.managedDepartments || [],
        role: role,
        employeeCode: employee[0].employeeCode
      };
      
      console.log(`[Role Permissions] Permissions for ${employee[0].firstName}: ${JSON.stringify(permissions)}`);
      return permissions;
      
    } catch (error) {
      console.error('[Role Permissions] Error getting permissions:', error);
      return null;
    }
  }
  
  /**
   * Check if employee can access data for another employee
   */
  canAccessEmployeeData(permissions: EmployeePermissions, requestedEmployeeCode?: string): boolean {
    // If no specific employee requested, allow (asking about own data)
    if (!requestedEmployeeCode) {
      return true;
    }
    
    // Admins can access all employee data
    if (permissions.canAccessAllEmployees) {
      return true;
    }
    
    // Staff can only access their own data
    if (permissions.role === 'staff') {
      return requestedEmployeeCode === permissions.employeeCode;
    }
    
    // Managers can access data for employees in their managed departments
    if (['manager', 'assistant_manager'].includes(permissions.role)) {
      // TODO: Add department-based access check when employee department mapping is available
      return requestedEmployeeCode === permissions.employeeCode;
    }
    
    return false;
  }
  
  /**
   * Extract employee code from message if mentioned
   */
  extractEmployeeCodeFromMessage(messageText: string): string | null {
    const lowerMessage = messageText.toLowerCase();
    
    // Look for employee code patterns
    const patterns = [
      /employee\s+(?:code\s+)?(\d+)/i,
      /emp\s+(?:code\s+)?(\d+)/i,
      /id\s+(\d+)/i,
      /(\d{8})/g // 8-digit employee codes
    ];
    
    for (const pattern of patterns) {
      const match = lowerMessage.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    return null;
  }
  
  /**
   * Check if message is requesting data about other employees
   */
  isRequestingOtherEmployeeData(messageText: string): boolean {
    const lowerMessage = messageText.toLowerCase();
    
    const otherEmployeeIndicators = [
      'employee code',
      'emp code',
      'other employee',
      'someone else',
      'colleague',
      'team member',
      'staff member',
      'worker'
    ];
    
    return otherEmployeeIndicators.some(indicator => lowerMessage.includes(indicator));
  }
  
  /**
   * Generate permission denied message
   */
  getPermissionDeniedMessage(employeeName: string, requestType: string): string {
    return `Hi ${employeeName}! You can only access your own ${requestType} data. For information about other employees, please contact your manager or HR department.`;
  }
  
  /**
   * Generate admin privilege message  
   */
  getAdminPrivilegeMessage(employeeName: string, requestType: string): string {
    return `Hi ${employeeName}! As an admin, you have access to all employee ${requestType} data. Please specify which employee's information you need.`;
  }
}

export const rolePermissionsService = new RolePermissionsService();