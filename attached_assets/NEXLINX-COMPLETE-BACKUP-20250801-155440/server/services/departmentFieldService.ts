/**
 * Department Field Service
 * Manages department-based field designation and employee type classification
 */

import { db } from '../db';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { employeeRecords } from '@shared/schema';
import { 
  employeeTypeConfigs, 
  isFieldDepartmentByName, 
  getRecommendedEmpType,
  type DepartmentFieldConfig 
} from '@shared/departmentFieldConfig';

export class DepartmentFieldService {
  private static instance: DepartmentFieldService;

  static getInstance(): DepartmentFieldService {
    if (!DepartmentFieldService.instance) {
      DepartmentFieldService.instance = new DepartmentFieldService();
    }
    return DepartmentFieldService.instance;
  }

  /**
   * Get all departments with field designation status
   */
  async getDepartmentFieldConfigs(): Promise<DepartmentFieldConfig[]> {
    try {
      const result = await db.execute(sql`
        SELECT 
          department,
          COUNT(*) as employee_count,
          BOOL_OR(is_field_department) as is_field_department,
          MODE() WITHIN GROUP (ORDER BY emp_type) as default_emp_type,
          MAX(updated_at) as last_updated
        FROM employee_records 
        WHERE active = true AND department IS NOT NULL
        GROUP BY department
        ORDER BY employee_count DESC
      `);

      const departments = (result as any).rows.map((row: any) => ({
        id: row.department.replace(/\s+/g, '_').toLowerCase(),
        departmentName: row.department,
        isFieldDepartment: row.is_field_department || false,
        defaultEmpType: row.default_emp_type || 'Desk Job',
        locationInterval: row.is_field_department ? 180 : 300,
        description: this.generateDepartmentDescription(row.department, row.is_field_department),
        employeeCount: parseInt(row.employee_count) || 0,
        lastUpdated: row.last_updated || new Date()
      }));

      return departments;

    } catch (error) {
      console.error('[DepartmentField] Error getting department configs:', error);
      return [];
    }
  }

  /**
   * Update department field designation
   */
  async updateDepartmentFieldDesignation(
    departmentName: string, 
    isFieldDepartment: boolean,
    defaultEmpType?: 'Drivers' | 'Field Staff' | 'Desk Job' | 'Hybrid'
  ): Promise<boolean> {
    try {
      const empType = defaultEmpType || (isFieldDepartment ? 'Field Staff' : 'Desk Job');
      
      // Update all employees in the department
      const result = await db.execute(sql`
        UPDATE employee_records 
        SET 
          is_field_department = ${isFieldDepartment},
          emp_type = ${empType},
          polling_interval_seconds = ${employeeTypeConfigs[empType].locationInterval},
          location_tracking_role = ${isFieldDepartment ? 'field_staff' : 'desk_job'},
          updated_at = NOW()
        WHERE department = ${departmentName} AND active = true
      `);

      console.log(`[DepartmentField] Updated ${(result as any).rowCount || 0} employees in ${departmentName} to ${isFieldDepartment ? 'field' : 'office'} department (${empType})`);
      return true;

    } catch (error) {
      console.error('[DepartmentField] Error updating department designation:', error);
      return false;
    }
  }

  /**
   * Auto-classify all departments based on patterns
   */
  async autoClassifyDepartments(): Promise<{
    classified: number;
    fieldDepartments: string[];
    officeDepartments: string[];
  }> {
    try {
      // Get all unique departments
      const departments = await db.execute(sql`
        SELECT DISTINCT department 
        FROM employee_records 
        WHERE active = true AND department IS NOT NULL
      `);

      let classified = 0;
      const fieldDepartments: string[] = [];
      const officeDepartments: string[] = [];

      for (const row of (departments as any).rows) {
        const deptName = row.department;
        const isField = isFieldDepartmentByName(deptName);
        
        await this.updateDepartmentFieldDesignation(
          deptName, 
          isField, 
          isField ? 'Field Staff' : 'Desk Job'
        );

        if (isField) {
          fieldDepartments.push(deptName);
        } else {
          officeDepartments.push(deptName);
        }
        classified++;
      }

      console.log(`[DepartmentField] Auto-classified ${classified} departments: ${fieldDepartments.length} field, ${officeDepartments.length} office`);
      
      return {
        classified,
        fieldDepartments,
        officeDepartments
      };

    } catch (error) {
      console.error('[DepartmentField] Error auto-classifying departments:', error);
      return { classified: 0, fieldDepartments: [], officeDepartments: [] };
    }
  }

  /**
   * Update individual employee type
   */
  async updateEmployeeType(
    employeeCode: string, 
    empType: 'Drivers' | 'Field Staff' | 'Desk Job' | 'Hybrid'
  ): Promise<boolean> {
    try {
      const config = employeeTypeConfigs[empType];
      const locationRole = empType === 'Drivers' || empType === 'Field Staff' ? 'field_staff' : 
                          empType === 'Hybrid' ? 'sales_mobile' : 'desk_job';

      await db.execute(sql`
        UPDATE employee_records 
        SET 
          emp_type = ${empType},
          polling_interval_seconds = ${config.locationInterval},
          location_tracking_role = ${locationRole},
          updated_at = NOW()
        WHERE employee_code = ${employeeCode} AND active = true
      `);

      console.log(`[DepartmentField] Updated ${employeeCode} to ${empType} (${config.locationInterval}s interval)`);
      return true;

    } catch (error) {
      console.error('[DepartmentField] Error updating employee type:', error);
      return false;
    }
  }

  /**
   * Get employee type statistics
   */
  async getEmployeeTypeStatistics(): Promise<{
    byType: Record<string, number>;
    byInterval: Record<number, number>;
    fieldVsOffice: { field: number; office: number };
    totalEmployees: number;
  }> {
    try {
      const result = await db.execute(sql`
        SELECT 
          emp_type,
          polling_interval_seconds,
          is_field_department,
          COUNT(*) as count
        FROM employee_records 
        WHERE active = true 
        GROUP BY emp_type, polling_interval_seconds, is_field_department
      `);

      const stats = {
        byType: {} as Record<string, number>,
        byInterval: {} as Record<number, number>,
        fieldVsOffice: { field: 0, office: 0 },
        totalEmployees: 0
      };

      for (const row of (result as any).rows) {
        const count = parseInt(row.count) || 0;
        const empType = row.emp_type || 'Desk Job';
        const interval = parseInt(row.polling_interval_seconds) || 300;
        const isField = row.is_field_department || false;

        stats.byType[empType] = (stats.byType[empType] || 0) + count;
        stats.byInterval[interval] = (stats.byInterval[interval] || 0) + count;
        
        if (isField) {
          stats.fieldVsOffice.field += count;
        } else {
          stats.fieldVsOffice.office += count;
        }
        
        stats.totalEmployees += count;
      }

      return stats;

    } catch (error) {
      console.error('[DepartmentField] Error getting statistics:', error);
      return {
        byType: {},
        byInterval: {},
        fieldVsOffice: { field: 0, office: 0 },
        totalEmployees: 0
      };
    }
  }

  /**
   * Bulk update employees by department pattern
   */
  async bulkUpdateByPattern(
    pattern: string,
    empType: 'Drivers' | 'Field Staff' | 'Desk Job' | 'Hybrid',
    isFieldDepartment: boolean
  ): Promise<number> {
    try {
      const config = employeeTypeConfigs[empType];
      const locationRole = empType === 'Drivers' || empType === 'Field Staff' ? 'field_staff' : 
                          empType === 'Hybrid' ? 'sales_mobile' : 'desk_job';

      const result = await db.execute(sql`
        UPDATE employee_records 
        SET 
          emp_type = ${empType},
          is_field_department = ${isFieldDepartment},
          polling_interval_seconds = ${config.locationInterval},
          location_tracking_role = ${locationRole},
          updated_at = NOW()
        WHERE department ILIKE ${`%${pattern}%`} AND active = true
      `);

      const updatedCount = (result as any).rowCount || 0;
      console.log(`[DepartmentField] Bulk updated ${updatedCount} employees matching pattern "${pattern}" to ${empType}`);
      
      return updatedCount;

    } catch (error) {
      console.error('[DepartmentField] Error bulk updating by pattern:', error);
      return 0;
    }
  }

  /**
   * Generate department description
   */
  private generateDepartmentDescription(departmentName: string, isField: boolean): string {
    if (isField) {
      if (departmentName.toLowerCase().includes('driver')) {
        return 'Mobile driver department - 3-minute location intervals for vehicle tracking';
      } else if (departmentName.toLowerCase().includes('ofc')) {
        return 'Field operations department - 3-minute intervals for on-site work coordination';
      } else if (departmentName.toLowerCase().includes('safecity')) {
        return 'Safe city field operations - 3-minute intervals for public safety monitoring';
      } else {
        return 'Field department - 3-minute location intervals for field operations';
      }
    } else {
      return 'Office department - 5-minute location intervals for standard attendance tracking';
    }
  }
}

export const departmentFieldService = DepartmentFieldService.getInstance();