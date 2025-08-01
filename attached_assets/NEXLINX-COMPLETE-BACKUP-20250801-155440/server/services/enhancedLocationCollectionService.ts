/**
 * Enhanced Location Collection Service
 * Implements department-based field staff optimization with 3-minute vs 5-minute intervals
 */

import { db } from '../db';
import { eq, and, sql, inArray, gte, lte } from 'drizzle-orm';
import { employeeRecords } from '@shared/schema';
import { departmentFieldService } from './departmentFieldService';
import { EventEmitter } from 'events';

export interface LocationCollectionConfig {
  employeeCode: string;
  empType: 'Drivers' | 'Field Staff' | 'Desk Job' | 'Hybrid';
  isFieldDepartment: boolean;
  collectionInterval: number; // in seconds
  priority: 'high' | 'standard' | 'low';
  reason: string;
}

export interface LocationCollectionStats {
  fieldStaff3Min: number;
  officeStaff5Min: number;
  hybridStaff4Min: number;
  totalEmployees: number;
  costSavings: {
    requestsPerDay: number;
    monthlySavings: number;
    optimizationRate: number;
  };
}

export class EnhancedLocationCollectionService extends EventEmitter {
  private static instance: EnhancedLocationCollectionService;
  private isRunning = false;
  private collectionTimers = new Map<string, NodeJS.Timeout>();

  static getInstance(): EnhancedLocationCollectionService {
    if (!EnhancedLocationCollectionService.instance) {
      EnhancedLocationCollectionService.instance = new EnhancedLocationCollectionService();
    }
    return EnhancedLocationCollectionService.instance;
  }

  constructor() {
    super();
    console.log('[EnhancedLocationCollection] 🎯 Service initialized with field staff optimization');
  }

  /**
   * Start enhanced location collection with field staff optimization
   */
  async startEnhancedCollection(): Promise<void> {
    if (this.isRunning) {
      console.log('[EnhancedLocationCollection] Service already running');
      return;
    }

    console.log('[EnhancedLocationCollection] 🚀 Starting enhanced location collection...');
    this.isRunning = true;

    // Initialize field staff intervals (3 minutes = 180 seconds)
    await this.initializeFieldStaffCollection();
    
    // Initialize office staff intervals (5 minutes = 300 seconds)  
    await this.initializeOfficeStaffCollection();
    
    // Initialize hybrid staff intervals (4 minutes = 240 seconds)
    await this.initializeHybridStaffCollection();

    this.emit('collection-started');
    console.log('[EnhancedLocationCollection] ✅ Enhanced collection started with optimized intervals');
  }

  /**
   * Initialize field staff collection (LHE OFC, FSD OFC, Safe city departments)
   * 3-minute intervals for high-frequency tracking
   */
  private async initializeFieldStaffCollection(): Promise<void> {
    try {
      const fieldStaff = await db.execute(sql`
        SELECT employee_code, department, emp_type, is_field_department
        FROM employee_records 
        WHERE active = true 
        AND is_field_department = true 
        AND emp_type IN ('Drivers', 'Field Staff')
        ORDER BY emp_type, department
      `);

      const employees = (fieldStaff as any).rows;
      console.log(`[EnhancedLocationCollection] 📍 Initializing ${employees.length} field staff with 3-minute intervals`);

      for (const emp of employees) {
        this.scheduleEmployeeCollection(emp.employee_code, 180000, 'field_staff'); // 3 minutes
      }

      this.emit('field-staff-initialized', { count: employees.length });

    } catch (error) {
      console.error('[EnhancedLocationCollection] Error initializing field staff:', error);
    }
  }

  /**
   * Initialize office staff collection 
   * 5-minute intervals for standard tracking
   */
  private async initializeOfficeStaffCollection(): Promise<void> {
    try {
      const officeStaff = await db.execute(sql`
        SELECT employee_code, department, emp_type, is_field_department
        FROM employee_records 
        WHERE active = true 
        AND (is_field_department = false OR is_field_department IS NULL)
        AND emp_type = 'Desk Job'
        ORDER BY department
      `);

      const employees = (officeStaff as any).rows;
      console.log(`[EnhancedLocationCollection] 🏢 Initializing ${employees.length} office staff with 5-minute intervals`);

      for (const emp of employees) {
        this.scheduleEmployeeCollection(emp.employee_code, 300000, 'desk_job'); // 5 minutes
      }

      this.emit('office-staff-initialized', { count: employees.length });

    } catch (error) {
      console.error('[EnhancedLocationCollection] Error initializing office staff:', error);
    }
  }

  /**
   * Initialize hybrid staff collection
   * 4-minute intervals for mixed work patterns
   */
  private async initializeHybridStaffCollection(): Promise<void> {
    try {
      const hybridStaff = await db.execute(sql`
        SELECT employee_code, department, emp_type, is_field_department
        FROM employee_records 
        WHERE active = true 
        AND emp_type = 'Hybrid'
        ORDER BY department
      `);

      const employees = (hybridStaff as any).rows;
      console.log(`[EnhancedLocationCollection] 🔄 Initializing ${employees.length} hybrid staff with 4-minute intervals`);

      for (const emp of employees) {
        this.scheduleEmployeeCollection(emp.employee_code, 240000, 'hybrid'); // 4 minutes
      }

      this.emit('hybrid-staff-initialized', { count: employees.length });

    } catch (error) {
      console.error('[EnhancedLocationCollection] Error initializing hybrid staff:', error);
    }
  }

  /**
   * Schedule individual employee location collection
   */
  private scheduleEmployeeCollection(
    employeeCode: string, 
    interval: number, 
    category: 'field_staff' | 'desk_job' | 'hybrid'
  ): void {
    // Clear existing timer if any
    if (this.collectionTimers.has(employeeCode)) {
      clearInterval(this.collectionTimers.get(employeeCode)!);
    }

    // Schedule new collection timer
    const timer = setInterval(async () => {
      await this.collectEmployeeLocation(employeeCode, category);
    }, interval);

    this.collectionTimers.set(employeeCode, timer);
    
    // Also collect immediately
    this.collectEmployeeLocation(employeeCode, category);
  }

  /**
   * Collect location for individual employee
   */
  private async collectEmployeeLocation(employeeCode: string, category: string): Promise<void> {
    try {
      // This would integrate with actual location collection APIs
      const timestamp = new Date();
      
      // For demonstration - in real implementation this would:
      // 1. Request location from mobile app
      // 2. Store in emp_loc table with source tracking
      // 3. Apply geofence validation
      // 4. Update employee status
      
      console.log(`[EnhancedLocationCollection] 📱 Collecting location for ${employeeCode} (${category}) at ${timestamp.toISOString()}`);
      
      this.emit('location-collected', {
        employeeCode,
        category,
        timestamp,
        interval: category === 'field_staff' ? '3min' : category === 'hybrid' ? '4min' : '5min'
      });

    } catch (error) {
      console.error(`[EnhancedLocationCollection] Error collecting location for ${employeeCode}:`, error);
    }
  }

  /**
   * Get location collection statistics
   */
  async getCollectionStatistics(): Promise<LocationCollectionStats> {
    try {
      const stats = await db.execute(sql`
        SELECT 
          emp_type,
          is_field_department,
          polling_interval_seconds,
          COUNT(*) as count
        FROM employee_records 
        WHERE active = true 
        GROUP BY emp_type, is_field_department, polling_interval_seconds
      `);

      const rows = (stats as any).rows;
      let fieldStaff3Min = 0;
      let officeStaff5Min = 0;
      let hybridStaff4Min = 0;
      let totalEmployees = 0;

      for (const row of rows) {
        const count = parseInt(row.count) || 0;
        totalEmployees += count;

        if (row.emp_type === 'Drivers' || row.emp_type === 'Field Staff') {
          fieldStaff3Min += count;
        } else if (row.emp_type === 'Hybrid') {
          hybridStaff4Min += count;
        } else {
          officeStaff5Min += count;
        }
      }

      // Calculate cost savings from optimization
      const requestsPerDay = (fieldStaff3Min * 480) + (hybridStaff4Min * 360) + (officeStaff5Min * 288); // 8 hours
      const standardRequestsPerDay = totalEmployees * 288; // If all were 5-minute intervals
      const optimizationRate = ((standardRequestsPerDay - requestsPerDay) / standardRequestsPerDay) * 100;

      return {
        fieldStaff3Min,
        officeStaff5Min,
        hybridStaff4Min,
        totalEmployees,
        costSavings: {
          requestsPerDay,
          monthlySavings: (standardRequestsPerDay - requestsPerDay) * 30,
          optimizationRate: Math.max(0, optimizationRate)
        }
      };

    } catch (error) {
      console.error('[EnhancedLocationCollection] Error getting statistics:', error);
      return {
        fieldStaff3Min: 0,
        officeStaff5Min: 0,
        hybridStaff4Min: 0,
        totalEmployees: 0,
        costSavings: { requestsPerDay: 0, monthlySavings: 0, optimizationRate: 0 }
      };
    }
  }

  /**
   * Update employee collection interval based on department/type change
   */
  async updateEmployeeCollectionInterval(employeeCode: string): Promise<void> {
    try {
      const employee = await db.execute(sql`
        SELECT employee_code, emp_type, is_field_department, polling_interval_seconds
        FROM employee_records 
        WHERE employee_code = ${employeeCode} AND active = true
      `);

      const emp = (employee as any).rows[0];
      if (!emp) {
        console.log(`[EnhancedLocationCollection] Employee ${employeeCode} not found or inactive`);
        return;
      }

      const interval = emp.polling_interval_seconds * 1000; // Convert to milliseconds
      const category = emp.emp_type === 'Drivers' || emp.emp_type === 'Field Staff' ? 'field_staff' :
                      emp.emp_type === 'Hybrid' ? 'hybrid' : 'desk_job';

      this.scheduleEmployeeCollection(employeeCode, interval, category);
      
      console.log(`[EnhancedLocationCollection] ✅ Updated ${employeeCode} to ${interval/1000}s intervals (${category})`);

    } catch (error) {
      console.error(`[EnhancedLocationCollection] Error updating interval for ${employeeCode}:`, error);
    }
  }

  /**
   * Stop enhanced collection service
   */
  async stopEnhancedCollection(): Promise<void> {
    if (!this.isRunning) {
      console.log('[EnhancedLocationCollection] Service not running');
      return;
    }

    console.log('[EnhancedLocationCollection] 🛑 Stopping enhanced location collection...');
    
    // Clear all timers
    for (const [employeeCode, timer] of this.collectionTimers) {
      clearInterval(timer);
    }
    this.collectionTimers.clear();

    this.isRunning = false;
    this.emit('collection-stopped');
    
    console.log('[EnhancedLocationCollection] ✅ Enhanced collection stopped');
  }

  /**
   * Get service status
   */
  getStatus(): {
    isRunning: boolean;
    activeCollections: number;
    categories: Record<string, number>;
  } {
    const categories = { field_staff: 0, hybrid: 0, desk_job: 0 };
    
    // Count active collections by category (would need to track this)
    
    return {
      isRunning: this.isRunning,
      activeCollections: this.collectionTimers.size,
      categories
    };
  }
}

export const enhancedLocationCollectionService = EnhancedLocationCollectionService.getInstance();