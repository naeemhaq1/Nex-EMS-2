import axios, { AxiosInstance } from 'axios';
import { storage } from '../storage';
import { Employee, AttendanceRecord } from '@shared/schema';

interface OdooConfig {
  url: string;
  database: string;
  username: string;
  password: string;
  uid?: number;
}

interface OdooEmployee {
  id: number;
  name: string;
  work_email: string;
  employee_id: string;
  department_id: [number, string];
  job_id: [number, string];
  active: boolean;
  company_id: number;
}

interface OdooAttendance {
  id: number;
  employee_id: [number, string];
  check_in: string;
  check_out?: string;
  worked_hours: number;
}

interface OdooTimesheet {
  employee_id: number;
  project_id: number;
  task_id?: number;
  date: string;
  unit_amount: number; // hours worked
  name: string; // description
}

/**
 * Odoo Integration Service
 * Provides two-way synchronization between BioTime EMS and Odoo
 * 
 * Features:
 * - Employee data synchronization
 * - Attendance record export to Odoo HR
 * - Timesheet integration for project hours
 * - Payroll data preparation
 * - Department and position mapping
 */
class OdooIntegrationService {
  private config: OdooConfig | null = null;
  private client: AxiosInstance | null = null;
  private sessionId: string | null = null;

  /**
   * Initialize Odoo connection with lazy loading
   */
  private async getConfig(): Promise<OdooConfig> {
    if (!this.config) {
      // Load from environment variables
      this.config = {
        url: process.env.ODOO_URL || 'http://localhost:8069',
        database: process.env.ODOO_DATABASE || 'odoo',
        username: process.env.ODOO_USERNAME || 'admin',
        password: process.env.ODOO_PASSWORD || '',
      };

      console.log('[Odoo] Configuration loaded:', {
        url: this.config.url,
        database: this.config.database,
        username: this.config.username,
        hasPassword: !!this.config.password,
      });
    }
    return this.config;
  }

  /**
   * Authenticate with Odoo and get session
   */
  async authenticate(): Promise<boolean> {
    try {
      const config = await this.getConfig();
      
      if (!this.client) {
        this.client = axios.create({
          baseURL: config.url,
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }

      // Authenticate using Odoo's JSON-RPC API
      const authResponse = await this.client.post('/web/session/authenticate', {
        jsonrpc: '2.0',
        method: 'call',
        params: {
          db: config.database,
          login: config.username,
          password: config.password,
        },
      });

      if (authResponse.data.result && authResponse.data.result.uid) {
        this.config!.uid = authResponse.data.result.uid;
        this.sessionId = authResponse.data.result.session_id;
        console.log('[Odoo] Authentication successful, UID:', this.config!.uid);
        return true;
      } else {
        console.error('[Odoo] Authentication failed:', authResponse.data.error);
        return false;
      }
    } catch (error) {
      console.error('[Odoo] Authentication error:', error);
      return false;
    }
  }

  /**
   * Make authenticated API call to Odoo
   */
  private async callOdoo(model: string, method: string, args: any[] = [], kwargs: any = {}): Promise<any> {
    if (!this.client || !this.config?.uid) {
      const authenticated = await this.authenticate();
      if (!authenticated) {
        throw new Error('Failed to authenticate with Odoo');
      }
    }

    const response = await this.client!.post('/web/dataset/call_kw', {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        model,
        method,
        args,
        kwargs,
      },
    });

    if (response.data.error) {
      throw new Error(`Odoo API error: ${response.data.error.message}`);
    }

    return response.data.result;
  }

  /**
   * Sync employees from BioTime to Odoo
   */
  async syncEmployeesToOdoo(): Promise<{ success: boolean; synced: number; errors: string[] }> {
    try {
      console.log('[Odoo] Starting employee synchronization to Odoo...');
      
      // Get all active employees from our system
      const { employees } = await storage.getEmployees({ isActive: true });
      const errors: string[] = [];
      let synced = 0;

      for (const employee of employees) {
        try {
          // Check if employee exists in Odoo by employee_id
          const existingEmployees = await this.callOdoo('hr.employee', 'search_read', [
            [['employee_id', '=', employee.employeeCode]]
          ], { fields: ['id', 'employee_id'] });

          const employeeData = {
            name: `${employee.firstName} ${employee.lastName}`.trim(),
            employee_id: employee.employeeCode,
            work_email: employee.email || false,
            work_phone: employee.phone || false,
            active: employee.isActive,
            // Map department if available
            department_id: employee.department ? await this.findOrCreateDepartment(employee.department) : false,
            // Map job position if available
            job_id: employee.position ? await this.findOrCreateJobPosition(employee.position) : false,
          };

          if (existingEmployees.length > 0) {
            // Update existing employee
            await this.callOdoo('hr.employee', 'write', [existingEmployees[0].id, employeeData]);
            console.log(`[Odoo] Updated employee: ${employee.employeeCode}`);
          } else {
            // Create new employee
            await this.callOdoo('hr.employee', 'create', [employeeData]);
            console.log(`[Odoo] Created employee: ${employee.employeeCode}`);
          }
          synced++;
        } catch (error) {
          const errorMsg = `Failed to sync employee ${employee.employeeCode}: ${error}`;
          console.error(`[Odoo] ${errorMsg}`);
          errors.push(errorMsg);
        }
      }

      console.log(`[Odoo] Employee sync completed. Synced: ${synced}, Errors: ${errors.length}`);
      return { success: true, synced, errors };

    } catch (error) {
      console.error('[Odoo] Employee sync failed:', error);
      return { success: false, synced: 0, errors: [error.message] };
    }
  }

  /**
   * Export attendance records to Odoo HR Attendance
   */
  async exportAttendanceToOdoo(dateFrom: Date, dateTo: Date): Promise<{ success: boolean; exported: number; errors: string[] }> {
    try {
      console.log(`[Odoo] Exporting attendance records from ${dateFrom.toISOString()} to ${dateTo.toISOString()}`);
      
      // Get attendance records for the date range
      const { records } = await storage.getAttendanceRecords({
        dateFrom,
        dateTo,
        limit: 10000, // Large limit for bulk export
      });

      const errors: string[] = [];
      let exported = 0;

      for (const record of records) {
        try {
          if (!record.employeeId || !record.checkIn) continue;

          // Get employee data
          const employee = await storage.getEmployee(record.employeeId);
          if (!employee) {
            errors.push(`Employee not found for attendance record ${record.id}`);
            continue;
          }

          // Find corresponding Odoo employee
          const odooEmployees = await this.callOdoo('hr.employee', 'search', [
            [['employee_id', '=', employee.employeeCode]]
          ]);

          if (odooEmployees.length === 0) {
            errors.push(`Odoo employee not found for code: ${employee.employeeCode}`);
            continue;
          }

          const attendanceData = {
            employee_id: odooEmployees[0],
            check_in: record.checkIn.toISOString(),
            check_out: record.checkOut ? record.checkOut.toISOString() : false,
            worked_hours: record.hoursWorked || 0,
          };

          // Check if attendance already exists
          const existingAttendance = await this.callOdoo('hr.attendance', 'search', [
            [
              ['employee_id', '=', odooEmployees[0]],
              ['check_in', '=', record.checkIn.toISOString()]
            ]
          ]);

          if (existingAttendance.length === 0) {
            await this.callOdoo('hr.attendance', 'create', [attendanceData]);
            exported++;
          }
        } catch (error) {
          errors.push(`Failed to export attendance record ${record.id}: ${error}`);
        }
      }

      console.log(`[Odoo] Attendance export completed. Exported: ${exported}, Errors: ${errors.length}`);
      return { success: true, exported, errors };

    } catch (error) {
      console.error('[Odoo] Attendance export failed:', error);
      return { success: false, exported: 0, errors: [error.message] };
    }
  }

  /**
   * Create timesheets for project work
   */
  async createTimesheets(assignments: Array<{
    employeeCode: string;
    projectName: string;
    date: Date;
    hours: number;
    description: string;
  }>): Promise<{ success: boolean; created: number; errors: string[] }> {
    try {
      console.log(`[Odoo] Creating ${assignments.length} timesheet entries`);
      
      const errors: string[] = [];
      let created = 0;

      for (const assignment of assignments) {
        try {
          // Find Odoo employee
          const odooEmployees = await this.callOdoo('hr.employee', 'search', [
            [['employee_id', '=', assignment.employeeCode]]
          ]);

          if (odooEmployees.length === 0) {
            errors.push(`Odoo employee not found: ${assignment.employeeCode}`);
            continue;
          }

          // Find or create project
          const projectId = await this.findOrCreateProject(assignment.projectName);

          const timesheetData = {
            employee_id: odooEmployees[0],
            project_id: projectId,
            date: assignment.date.toISOString().split('T')[0],
            unit_amount: assignment.hours,
            name: assignment.description,
          };

          await this.callOdoo('account.analytic.line', 'create', [timesheetData]);
          created++;
        } catch (error) {
          errors.push(`Failed to create timesheet for ${assignment.employeeCode}: ${error}`);
        }
      }

      console.log(`[Odoo] Timesheet creation completed. Created: ${created}, Errors: ${errors.length}`);
      return { success: true, created, errors };

    } catch (error) {
      console.error('[Odoo] Timesheet creation failed:', error);
      return { success: false, created: 0, errors: [error.message] };
    }
  }

  /**
   * Helper: Find or create department
   */
  private async findOrCreateDepartment(departmentName: string): Promise<number> {
    const existing = await this.callOdoo('hr.department', 'search', [
      [['name', '=', departmentName]]
    ]);

    if (existing.length > 0) {
      return existing[0];
    }

    // Create new department
    return await this.callOdoo('hr.department', 'create', [{
      name: departmentName,
    }]);
  }

  /**
   * Helper: Find or create job position
   */
  private async findOrCreateJobPosition(positionName: string): Promise<number> {
    const existing = await this.callOdoo('hr.job', 'search', [
      [['name', '=', positionName]]
    ]);

    if (existing.length > 0) {
      return existing[0];
    }

    // Create new job position
    return await this.callOdoo('hr.job', 'create', [{
      name: positionName,
    }]);
  }

  /**
   * Helper: Find or create project
   */
  private async findOrCreateProject(projectName: string): Promise<number> {
    const existing = await this.callOdoo('project.project', 'search', [
      [['name', '=', projectName]]
    ]);

    if (existing.length > 0) {
      return existing[0];
    }

    // Create new project
    return await this.callOdoo('project.project', 'create', [{
      name: projectName,
    }]);
  }

  /**
   * Test connection to Odoo
   */
  async testConnection(): Promise<{ success: boolean; message: string; version?: string }> {
    try {
      const authenticated = await this.authenticate();
      
      if (!authenticated) {
        return { success: false, message: 'Authentication failed' };
      }

      // Get server version info
      const versionInfo = await this.callOdoo('ir.module.module', 'search_read', [
        [['name', '=', 'base']]
      ], { fields: ['installed_version'], limit: 1 });

      return {
        success: true,
        message: 'Connection successful',
        version: versionInfo[0]?.installed_version || 'Unknown'
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection failed: ${error.message}`
      };
    }
  }

  /**
   * Get sync status and statistics
   */
  async getSyncStatus(): Promise<{
    lastEmployeeSync: Date | null;
    lastAttendanceExport: Date | null;
    pendingAttendanceRecords: number;
    odooEmployeeCount: number;
  }> {
    try {
      // Get Odoo employee count
      const odooEmployeeCount = await this.callOdoo('hr.employee', 'search_count', [
        [['active', '=', true]]
      ]);

      // Get pending attendance records (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const { total: pendingAttendanceRecords } = await storage.getAttendanceRecords({
        dateFrom: weekAgo,
        limit: 1
      });

      return {
        lastEmployeeSync: null, // Would be stored in sync_status table
        lastAttendanceExport: null, // Would be stored in sync_status table
        pendingAttendanceRecords,
        odooEmployeeCount,
      };
    } catch (error) {
      console.error('[Odoo] Failed to get sync status:', error);
      return {
        lastEmployeeSync: null,
        lastAttendanceExport: null,
        pendingAttendanceRecords: 0,
        odooEmployeeCount: 0,
      };
    }
  }
}

export const odooIntegrationService = new OdooIntegrationService();