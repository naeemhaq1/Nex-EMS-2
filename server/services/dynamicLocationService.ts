import { db } from '../db';

export interface DynamicLocationConfig {
  employeeId: string;
  basePollingInterval: number;
  reducedPollingInterval: number;
  currentInterval: number;
  lastPunchStatus: 'in' | 'out' | 'none';
  isFieldEmployee: boolean;
  reason: string;
}

/**
 * Dynamic Location Polling Service
 * Adjusts polling intervals based on punch status:
 * - High priority employees: 3min while working, 10min after punch-out
 * - Standard employees: 10min always
 */
export class DynamicLocationService {
  
  /**
   * Get dynamic location config for employee
   */
  async getEmployeeLocationConfig(employeeId: string): Promise<DynamicLocationConfig | null> {
    try {
      // Get employee's tracking settings and last punch status
      const result = await db.execute(`
        SELECT 
          er.emp_code,
          er.first_name,
          er.last_name,
          er.department,
          er.designation,
          COALESCE(er.location_tracking_enabled, false) as tracking_enabled,
          COALESCE(er.location_tracking_tier, 2) as tracking_tier,
          COALESCE(er.polling_interval_minutes, 10) as base_polling_interval,
          COALESCE(er.tracking_reason, 'Standard tracking') as tracking_reason,
          -- Get last punch status
          ar.punch_type as last_punch_type,
          ar.punch_time as last_punch_time
        FROM employee_records er
        LEFT JOIN (
          SELECT DISTINCT ON (emp_code) 
            emp_code, punch_type, punch_time
          FROM attendance_records 
          WHERE DATE(punch_time) = CURRENT_DATE
          ORDER BY emp_code, punch_time DESC
        ) ar ON er.emp_code = ar.emp_code
        WHERE er.emp_code = $1 AND er.is_active = true
      `, [employeeId]);

      const rows = (result as any).rows;
      if (!rows || rows.length === 0) {
        return null;
      }

      const employee = rows[0];
      
      // Determine if this is a field employee (high priority)
      const isFieldEmployee = employee.tracking_tier === 1 && employee.base_polling_interval <= 3;
      
      // Determine last punch status
      let lastPunchStatus: 'in' | 'out' | 'none' = 'none';
      if (employee.last_punch_type) {
        lastPunchStatus = employee.last_punch_type.includes('checkin') || 
                         employee.last_punch_type.includes('punch_in') ? 'in' : 'out';
      }

      // Calculate current polling interval
      let currentInterval = employee.base_polling_interval;
      
      if (isFieldEmployee && lastPunchStatus === 'out') {
        // Field employee has punched out - reduce to 10 minutes
        currentInterval = 10;
      }

      return {
        employeeId: employee.emp_code,
        basePollingInterval: employee.base_polling_interval,
        reducedPollingInterval: 10,
        currentInterval,
        lastPunchStatus,
        isFieldEmployee,
        reason: this.getDynamicReason(isFieldEmployee, lastPunchStatus, employee.tracking_reason)
      };

    } catch (error) {
      console.error('[DynamicLocation] Error getting employee config:', error);
      return null;
    }
  }

  /**
   * Update polling interval when punch status changes
   */
  async updatePollingOnPunchChange(employeeId: string, punchType: string): Promise<DynamicLocationConfig | null> {
    try {
      // Get current config
      const config = await this.getEmployeeLocationConfig(employeeId);
      if (!config || !config.isFieldEmployee) {
        return config; // No change needed for non-field employees
      }

      const isPunchIn = punchType.includes('checkin') || punchType.includes('punch_in');
      const newStatus: 'in' | 'out' = isPunchIn ? 'in' : 'out';

      // Update the config
      const newInterval = newStatus === 'out' ? 10 : config.basePollingInterval;
      
      const updatedConfig: DynamicLocationConfig = {
        ...config,
        currentInterval: newInterval,
        lastPunchStatus: newStatus,
        reason: this.getDynamicReason(config.isFieldEmployee, newStatus, config.reason)
      };

      // Log the change
      console.log(`[DynamicLocation] Employee ${employeeId} punch ${newStatus}: ${config.currentInterval}m → ${newInterval}m`);

      return updatedConfig;

    } catch (error) {
      console.error('[DynamicLocation] Error updating polling on punch:', error);
      return null;
    }
  }

  /**
   * Get analytics on dynamic polling efficiency
   */
  async getDynamicPollingStats(): Promise<{
    fieldEmployees: number;
    currentlyWorking: number;
    currentlyOffWork: number;
    estimatedSavings: {
      monthlyUpdates: number;
      costSavings: number;
      percentageReduction: number;
    };
  }> {
    try {
      // Get field employee counts and punch status
      const result = await db.execute(`
        SELECT 
          COUNT(*) as total_field_employees,
          COUNT(CASE WHEN ar.punch_type IS NULL OR ar.punch_type LIKE '%checkout%' OR ar.punch_type LIKE '%punch_out%' THEN 1 END) as off_work_count,
          COUNT(CASE WHEN ar.punch_type LIKE '%checkin%' OR ar.punch_type LIKE '%punch_in%' THEN 1 END) as working_count
        FROM employee_records er
        LEFT JOIN (
          SELECT DISTINCT ON (emp_code) 
            emp_code, punch_type
          FROM attendance_records 
          WHERE DATE(punch_time) = CURRENT_DATE
          ORDER BY emp_code, punch_time DESC
        ) ar ON er.emp_code = ar.emp_code
        WHERE er.is_active = true 
          AND er.location_tracking_enabled = true
          AND er.location_tracking_tier = 1
          AND er.polling_interval_minutes <= 3
      `);

      const stats = ((result as any).rows[0]) || {};
      const totalFieldEmployees = parseInt(stats.total_field_employees) || 0;
      const offWorkCount = parseInt(stats.off_work_count) || 0;
      const workingCount = parseInt(stats.working_count) || 0;

      // Calculate monthly update savings
      // Working employees: 3-minute intervals = 3,520 updates/month
      // Off-work employees: 10-minute intervals = 1,056 updates/month  
      // Savings per off-work employee: 3,520 - 1,056 = 2,464 updates/month
      
      const updatesPerWorkingEmployee = 3520; // (8h * 60m) / 3m * 22 days
      const updatesPerOffWorkEmployee = 1056; // (8h * 60m) / 10m * 22 days
      const savingsPerOffWorkEmployee = updatesPerWorkingEmployee - updatesPerOffWorkEmployee;
      
      const totalSavedUpdates = offWorkCount * savingsPerOffWorkEmployee;
      const costSavings = (totalSavedUpdates / 1000) * 5; // $5 per 1000 updates
      
      const originalUpdates = totalFieldEmployees * updatesPerWorkingEmployee;
      const currentUpdates = (workingCount * updatesPerWorkingEmployee) + (offWorkCount * updatesPerOffWorkEmployee);
      const percentageReduction = originalUpdates > 0 ? ((totalSavedUpdates / originalUpdates) * 100) : 0;

      return {
        fieldEmployees: totalFieldEmployees,
        currentlyWorking: workingCount,
        currentlyOffWork: offWorkCount,
        estimatedSavings: {
          monthlyUpdates: totalSavedUpdates,
          costSavings: Math.round(costSavings * 100) / 100,
          percentageReduction: Math.round(percentageReduction * 100) / 100
        }
      };

    } catch (error) {
      console.error('[DynamicLocation] Error getting polling stats:', error);
      return {
        fieldEmployees: 0,
        currentlyWorking: 0,
        currentlyOffWork: 0,
        estimatedSavings: { monthlyUpdates: 0, costSavings: 0, percentageReduction: 0 }
      };
    }
  }

  /**
   * Get dynamic reason text
   */
  private getDynamicReason(isFieldEmployee: boolean, punchStatus: 'in' | 'out' | 'none', baseReason: string): string {
    if (!isFieldEmployee) {
      return baseReason;
    }

    switch (punchStatus) {
      case 'in':
        return `${baseReason} - Active work period (high frequency)`;
      case 'out':
        return `${baseReason} - Off work (reduced frequency)`;
      default:
        return `${baseReason} - No punch data (default frequency)`;
    }
  }
}

export const dynamicLocationService = new DynamicLocationService();