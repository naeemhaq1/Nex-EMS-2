import { db } from '../db';
import { configService } from './configService';

interface EmployeeLocationConfig {
  employeeId: string;
  trackingEnabled: boolean;
  pollingIntervalSeconds: number;
  locationTrackingRole: string;
  priority: 'high' | 'standard' | 'low';
}

export class RoleBasedLocationService {
  private static instance: RoleBasedLocationService;
  private employeeConfigs: Map<string, EmployeeLocationConfig> = new Map();

  static getInstance(): RoleBasedLocationService {
    if (!RoleBasedLocationService.instance) {
      RoleBasedLocationService.instance = new RoleBasedLocationService();
    }
    return RoleBasedLocationService.instance;
  }

  /**
   * Get polling configuration for specific employee
   */
  async getEmployeePollingConfig(employeeId: string): Promise<EmployeeLocationConfig | null> {
    try {
      // Check cache first
      if (this.employeeConfigs.has(employeeId)) {
        return this.employeeConfigs.get(employeeId) || null;
      }

      // Query database for employee configuration
      const result = await db.execute(`
        SELECT 
          emp_code as employee_id,
          COALESCE(tracking_enabled, true) as tracking_enabled,
          COALESCE(polling_interval_seconds, 180) as polling_interval_seconds,
          COALESCE(location_tracking_role, 'standard') as location_tracking_role,
          department,
          designation
        FROM employee_records 
        WHERE emp_code = $1 AND active = true
      `, [employeeId]);

      const rows = (result as any).rows;
      if (!rows || rows.length === 0) {
        return null;
      }

      const employee = rows[0];
      
      // Determine priority based on role
      let priority: 'high' | 'standard' | 'low' = 'standard';
      if (employee.location_tracking_role === 'field_staff') {
        priority = 'high';
      } else if (employee.location_tracking_role === 'desk_job') {
        priority = 'low';
      }

      const config: EmployeeLocationConfig = {
        employeeId: employee.employee_id,
        trackingEnabled: employee.tracking_enabled,
        pollingIntervalSeconds: employee.polling_interval_seconds,
        locationTrackingRole: employee.location_tracking_role,
        priority
      };

      // Cache the configuration
      this.employeeConfigs.set(employeeId, config);
      
      return config;

    } catch (error) {
      console.error('[RoleBasedLocation] Error getting employee config:', error);
      return null;
    }
  }

  /**
   * Update employee location tracking configuration
   */
  async updateEmployeeConfig(employeeId: string, updates: Partial<EmployeeLocationConfig>): Promise<boolean> {
    try {
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.trackingEnabled !== undefined) {
        updateFields.push(`tracking_enabled = $${paramIndex++}`);
        values.push(updates.trackingEnabled);
      }

      if (updates.pollingIntervalSeconds !== undefined) {
        updateFields.push(`polling_interval_seconds = $${paramIndex++}`);
        values.push(updates.pollingIntervalSeconds);
      }

      if (updates.locationTrackingRole !== undefined) {
        updateFields.push(`location_tracking_role = $${paramIndex++}`);
        values.push(updates.locationTrackingRole);
      }

      if (updateFields.length === 0) {
        return false;
      }

      values.push(employeeId);

      await db.execute(`
        UPDATE employee_records 
        SET ${updateFields.join(', ')}
        WHERE emp_code = $${paramIndex}
      `, values);

      // Clear cache to force refresh
      this.employeeConfigs.delete(employeeId);

      console.log(`[RoleBasedLocation] Updated config for ${employeeId}`);
      return true;

    } catch (error) {
      console.error('[RoleBasedLocation] Error updating employee config:', error);
      return false;
    }
  }

  /**
   * Bulk update employees by role/department
   */
  async bulkUpdateByRole(criteria: {
    department?: string;
    designation?: string;
    locationTrackingRole?: string;
  }, updates: Partial<EmployeeLocationConfig>): Promise<number> {
    try {
      const whereConditions: string[] = ['active = true'];
      const values: any[] = [];
      let paramIndex = 1;

      // Build WHERE conditions
      if (criteria.department) {
        whereConditions.push(`department ILIKE $${paramIndex++}`);
        values.push(`%${criteria.department}%`);
      }

      if (criteria.designation) {
        whereConditions.push(`designation ILIKE $${paramIndex++}`);
        values.push(`%${criteria.designation}%`);
      }

      if (criteria.locationTrackingRole) {
        whereConditions.push(`location_tracking_role = $${paramIndex++}`);
        values.push(criteria.locationTrackingRole);
      }

      // Build SET clause
      const updateFields: string[] = [];

      if (updates.trackingEnabled !== undefined) {
        updateFields.push(`tracking_enabled = $${paramIndex++}`);
        values.push(updates.trackingEnabled);
      }

      if (updates.pollingIntervalSeconds !== undefined) {
        updateFields.push(`polling_interval_seconds = $${paramIndex++}`);
        values.push(updates.pollingIntervalSeconds);
      }

      if (updates.locationTrackingRole !== undefined) {
        updateFields.push(`location_tracking_role = $${paramIndex++}`);
        values.push(updates.locationTrackingRole);
      }

      if (updateFields.length === 0) {
        return 0;
      }

      const result = await db.execute(`
        UPDATE employee_records 
        SET ${updateFields.join(', ')}
        WHERE ${whereConditions.join(' AND ')}
      `, values);

      // Clear entire cache to force refresh
      this.employeeConfigs.clear();

      const rowCount = (result as any).rowCount || 0;
      console.log(`[RoleBasedLocation] Bulk updated ${rowCount} employees`);
      
      return rowCount;

    } catch (error) {
      console.error('[RoleBasedLocation] Error in bulk update:', error);
      return 0;
    }
  }

  /**
   * Get cost analysis for current configuration
   */
  async getCostAnalysis(): Promise<{
    totalEmployees: number;
    trackingEnabled: number;
    monthlyUpdates: number;
    estimatedMonthlyCost: number;
    roleBreakdown: Array<{
      role: string;
      employees: number;
      intervalMinutes: number;
      monthlyUpdates: number;
      cost: number;
    }>;
  }> {
    try {
      const result = await db.execute(`
        SELECT 
          COUNT(*) as total_employees,
          COUNT(CASE WHEN tracking_enabled = true THEN 1 END) as tracking_enabled,
          location_tracking_role,
          polling_interval_seconds,
          COUNT(*) as role_count
        FROM employee_records 
        WHERE active = true
        GROUP BY location_tracking_role, polling_interval_seconds, tracking_enabled
        ORDER BY location_tracking_role
      `);

      const rows = (result as any).rows || [];
      
      let totalEmployees = 0;
      let trackingEnabled = 0;
      let totalMonthlyUpdates = 0;
      const roleBreakdown: Array<{
        role: string;
        employees: number;
        intervalMinutes: number;
        monthlyUpdates: number;
        cost: number;
      }> = [];

      for (const row of rows) {
        totalEmployees += parseInt(row.role_count);
        
        if (row.tracking_enabled) {
          trackingEnabled += parseInt(row.role_count);
          
          const intervalSeconds = parseInt(row.polling_interval_seconds);
          const intervalMinutes = intervalSeconds / 60;
          const dailyUpdates = (8 * 60) / intervalMinutes; // 8 working hours
          const monthlyUpdates = dailyUpdates * 22 * parseInt(row.role_count); // 22 working days
          const cost = (monthlyUpdates / 1000) * 5; // $5 per 1000 API calls

          totalMonthlyUpdates += monthlyUpdates;

          roleBreakdown.push({
            role: row.location_tracking_role,
            employees: parseInt(row.role_count),
            intervalMinutes,
            monthlyUpdates: Math.round(monthlyUpdates),
            cost: Math.round(cost * 100) / 100
          });
        }
      }

      const estimatedMonthlyCost = Math.round((totalMonthlyUpdates / 1000) * 5 * 100) / 100;

      return {
        totalEmployees,
        trackingEnabled,
        monthlyUpdates: Math.round(totalMonthlyUpdates),
        estimatedMonthlyCost,
        roleBreakdown
      };

    } catch (error) {
      console.error('[RoleBasedLocation] Error getting cost analysis:', error);
      return {
        totalEmployees: 0,
        trackingEnabled: 0,
        monthlyUpdates: 0,
        estimatedMonthlyCost: 0,
        roleBreakdown: []
      };
    }
  }

  /**
   * Initialize role-based configuration for existing employees
   */
  async initializeRoleBasedConfig(): Promise<{
    fieldStaff: number;
    salesMobile: number;
    deskJobs: number;
    management: number;
  }> {
    try {
      // Add columns if they don't exist
      await db.execute(`
        ALTER TABLE employee_records 
        ADD COLUMN IF NOT EXISTS tracking_enabled BOOLEAN DEFAULT true,
        ADD COLUMN IF NOT EXISTS polling_interval_seconds INTEGER DEFAULT 180,
        ADD COLUMN IF NOT EXISTS location_tracking_role VARCHAR(20) DEFAULT 'standard'
      `);

      // Update field staff (3-minute intervals)
      const fieldStaff = await db.execute(`
        UPDATE employee_records SET 
          location_tracking_role = 'field_staff', 
          polling_interval_seconds = 180,
          tracking_enabled = true
        WHERE active = true AND (
          department ILIKE '%field%' OR 
          department ILIKE '%technician%' OR
          designation ILIKE '%technician%' OR
          designation ILIKE '%engineer%'
        )
      `);

      // Update sales/mobile staff (5-minute intervals)  
      const salesMobile = await db.execute(`
        UPDATE employee_records SET 
          location_tracking_role = 'sales_mobile', 
          polling_interval_seconds = 300,
          tracking_enabled = true
        WHERE active = true AND (
          department ILIKE '%sales%' OR 
          department ILIKE '%marketing%' OR
          designation ILIKE '%sales%' OR
          designation ILIKE '%marketing%'
        )
      `);

      // Update desk jobs (15-minute intervals)
      const deskJobs = await db.execute(`
        UPDATE employee_records SET 
          location_tracking_role = 'desk_job', 
          polling_interval_seconds = 900,
          tracking_enabled = true
        WHERE active = true AND (
          department ILIKE '%admin%' OR 
          department ILIKE '%hr%' OR
          department ILIKE '%finance%' OR
          department ILIKE '%accounts%' OR
          designation ILIKE '%clerk%' OR
          designation ILIKE '%officer%' OR
          designation ILIKE '%assistant%'
        )
      `);

      // Update management (10-minute intervals)
      const management = await db.execute(`
        UPDATE employee_records SET 
          location_tracking_role = 'management', 
          polling_interval_seconds = 600,
          tracking_enabled = true
        WHERE active = true AND (
          designation ILIKE '%manager%' OR
          designation ILIKE '%supervisor%' OR
          designation ILIKE '%director%' OR
          designation ILIKE '%head%'
        )
      `);

      return {
        fieldStaff: (fieldStaff as any).rowCount || 0,
        salesMobile: (salesMobile as any).rowCount || 0,
        deskJobs: (deskJobs as any).rowCount || 0,
        management: (management as any).rowCount || 0
      };

    } catch (error) {
      console.error('[RoleBasedLocation] Error initializing config:', error);
      return { fieldStaff: 0, salesMobile: 0, deskJobs: 0, management: 0 };
    }
  }
}

export const roleBasedLocationService = RoleBasedLocationService.getInstance();