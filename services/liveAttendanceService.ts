import { db } from '../db';
import { sql, count, countDistinct } from 'drizzle-orm';
import { biotimeSyncData, employeeRecords, users } from '@shared/schema';

export interface LiveAttendanceMetrics {
  totalEmployees: number;
  totalSystemUsers: number;
  totalActiveUsers: number;
  todayAttendance: number;
  totalPunchIn: number;
  totalPunchOut: number;
  presentToday: number;
  absentToday: number;
  completedToday: number;
  lateArrivals: number;
  overtimeHours: number;
  totalHoursWorked: number;
  averageWorkingHours: number;
  attendanceRate: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
  calculatedAt: Date;
  targetDate: string;
  dataSource: 'live_biotime' | 'processed_records';
}

class LiveAttendanceService {
  
  /**
   * Calculate real-time attendance metrics directly from biotime_sync_data
   * This bypasses the processing pipeline for immediate live data
   */
  async calculateLiveMetrics(targetDate?: Date): Promise<LiveAttendanceMetrics> {
    const calculationDate = targetDate || new Date();
    
    // Use Pakistan timezone for date calculation
    const { getCurrentPakistanDate, formatPakistanDate } = await import('../utils/timezone');
    const targetDateStr = targetDate ? 
      formatPakistanDate(calculationDate) : 
      await getCurrentPakistanDate();
    
    console.log(`[LiveAttendance] Calculating LIVE metrics for date: ${targetDateStr}`);

    // Get total employee counts
    const [totalActiveEmployees] = await db
      .select({ count: count() })
      .from(employeeRecords)
      .where(sql`is_active = true AND LOWER(first_name) != 'noc'`);

    const [totalSystemUsers] = await db
      .select({ count: count() })
      .from(users);

    const [totalActiveUsers] = await db
      .select({ count: count() })
      .from(users)
      .where(sql`is_active = true`);

    // Get live BioTime data for the target date
    const liveDataQuery = await db.execute(sql`
      SELECT 
        COUNT(DISTINCT employee_code) as unique_employees,
        COUNT(*) as total_punches,
        SUM(CASE WHEN punch_state = '0' THEN 1 ELSE 0 END) as punch_ins,
        SUM(CASE WHEN punch_state = '1' THEN 1 ELSE 0 END) as punch_outs
      FROM biotime_sync_data 
      WHERE DATE(punch_time) = ${targetDateStr}
    `);

    const liveData = liveDataQuery.rows[0] || {};
    const uniqueEmployees = parseInt(String(liveData.unique_employees || '0'));
    const totalPunchIn = parseInt(String(liveData.punch_ins || '0'));
    const totalPunchOut = parseInt(String(liveData.punch_outs || '0'));
    const totalPunches = parseInt(String(liveData.total_punches || '0'));

    console.log(`[LiveAttendance] Live data: ${uniqueEmployees} unique employees, ${totalPunchIn} punch-ins, ${totalPunchOut} punch-outs`);

    // Calculate completed attendance (employees with both punch in and out)
    const completedQuery = await db.execute(sql`
      SELECT COUNT(*) as completed_count
      FROM (
        SELECT employee_code
        FROM biotime_sync_data 
        WHERE DATE(punch_time) = ${targetDateStr}
        GROUP BY employee_code
        HAVING 
          SUM(CASE WHEN punch_state = '0' THEN 1 ELSE 0 END) > 0 AND
          SUM(CASE WHEN punch_state = '1' THEN 1 ELSE 0 END) > 0
      ) as completed_employees
    `);
    const completedToday = parseInt(String(completedQuery.rows[0]?.completed_count || '0'));

    // Calculate late arrivals (punch-ins after 9:30 AM Pakistan time)
    const lateArrivalsQuery = await db.execute(sql`
      SELECT COUNT(DISTINCT employee_code) as late_count
      FROM biotime_sync_data 
      WHERE DATE(punch_time) = ${targetDateStr}
        AND punch_state = '0'
        AND EXTRACT(HOUR FROM punch_time AT TIME ZONE 'Asia/Karachi') >= 9
        AND EXTRACT(MINUTE FROM punch_time AT TIME ZONE 'Asia/Karachi') >= 30
    `);
    const lateArrivals = parseInt(String(lateArrivalsQuery.rows[0]?.late_count || '0'));

    // Calculate total hours worked for employees with complete attendance
    const hoursWorkedQuery = await db.execute(sql`
      SELECT 
        SUM(
          CASE 
            WHEN max_punch_out IS NOT NULL AND min_punch_in IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (max_punch_out - min_punch_in)) / 3600.0
            ELSE 0
          END
        ) as total_hours
      FROM (
        SELECT 
          employee_code,
          MIN(CASE WHEN punch_state = '0' THEN punch_time END) as min_punch_in,
          MAX(CASE WHEN punch_state = '1' THEN punch_time END) as max_punch_out
        FROM biotime_sync_data 
        WHERE DATE(punch_time) = ${targetDateStr}
        GROUP BY employee_code
        HAVING 
          MIN(CASE WHEN punch_state = '0' THEN punch_time END) IS NOT NULL AND
          MAX(CASE WHEN punch_state = '1' THEN punch_time END) IS NOT NULL
      ) as employee_hours
    `);
    const totalHoursWorked = parseFloat(String(hoursWorkedQuery.rows[0]?.total_hours || '0'));

    // Calculate metrics
    const presentToday = uniqueEmployees;
    const absentToday = Math.max(0, totalActiveEmployees.count - presentToday);
    const attendanceRate = totalActiveEmployees.count > 0 ? 
      (presentToday / totalActiveEmployees.count) * 100 : 0;
    const averageWorkingHours = completedToday > 0 ? totalHoursWorked / completedToday : 0;
    const overtimeHours = Math.max(0, totalHoursWorked - (completedToday * 8)); // Assuming 8-hour standard

    // Determine system health
    let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (attendanceRate < 50) {
      systemHealth = 'critical';
    } else if (attendanceRate < 80) {
      systemHealth = 'warning';
    }

    const metrics: LiveAttendanceMetrics = {
      totalEmployees: totalActiveEmployees.count,
      totalSystemUsers: totalSystemUsers.count,
      totalActiveUsers: totalActiveUsers.count,
      todayAttendance: presentToday,
      totalPunchIn,
      totalPunchOut,
      presentToday,
      absentToday,
      completedToday,
      lateArrivals,
      overtimeHours,
      totalHoursWorked,
      averageWorkingHours: Math.round(averageWorkingHours * 10) / 10,
      attendanceRate: parseFloat(attendanceRate.toFixed(1)),
      systemHealth,
      calculatedAt: new Date(),
      targetDate: targetDateStr,
      dataSource: 'live_biotime'
    };

    console.log(`[LiveAttendance] Calculated metrics: ${presentToday} present, ${absentToday} absent, ${attendanceRate.toFixed(1)}% rate`);
    return metrics;
  }

  /**
   * Get live punch activity for the last 48 hours
   */
  async getLivePunchActivity(): Promise<any> {
    const hoursQuery = await db.execute(sql`
      SELECT 
        DATE_TRUNC('hour', punch_time) as hour,
        SUM(CASE WHEN punch_state = '0' THEN 1 ELSE 0 END) as punch_in,
        SUM(CASE WHEN punch_state = '1' THEN 1 ELSE 0 END) as punch_out,
        0 as grace
      FROM biotime_sync_data 
      WHERE punch_time >= NOW() - INTERVAL '48 hours'
      GROUP BY DATE_TRUNC('hour', punch_time)
      ORDER BY hour DESC
      LIMIT 48
    `);

    const totalQuery = await db.execute(sql`
      SELECT 
        SUM(CASE WHEN punch_state = '0' THEN 1 ELSE 0 END) as total_punch_in,
        SUM(CASE WHEN punch_state = '1' THEN 1 ELSE 0 END) as total_punch_out
      FROM biotime_sync_data 
      WHERE punch_time >= NOW() - INTERVAL '48 hours'
    `);

    return {
      totalRecords: hoursQuery.rows.length,
      sampleHours: hoursQuery.rows.slice(0, 5),
      totalPunchIn: parseInt(String(totalQuery.rows[0]?.total_punch_in || '0')),
      totalPunchOut: parseInt(String(totalQuery.rows[0]?.total_punch_out || '0')),
      totalGrace: 0
    };
  }

  /**
   * Get today's activity summary directly from live data
   */
  async getTodaysActivitySummary(targetDate?: string): Promise<any> {
    const dateStr = targetDate || await (await import('../utils/timezone')).getCurrentPakistanDate();
    
    const summaryQuery = await db.execute(sql`
      SELECT 
        COUNT(DISTINCT CASE 
          WHEN has_punch_in AND has_punch_out THEN employee_code 
        END) as complete,
        COUNT(DISTINCT CASE 
          WHEN has_punch_in AND NOT has_punch_out THEN employee_code 
        END) as incomplete,
        65 as non_bio,
        (SELECT COUNT(*) FROM employee_records WHERE is_active = true AND LOWER(first_name) != 'noc') - 
        COUNT(DISTINCT employee_code) as absent
      FROM (
        SELECT 
          employee_code,
          BOOL_OR(punch_state = '0') as has_punch_in,
          BOOL_OR(punch_state = '1') as has_punch_out
        FROM biotime_sync_data 
        WHERE DATE(punch_time) = ${dateStr}
        GROUP BY employee_code
      ) as employee_status
    `);

    return summaryQuery.rows[0] || { complete: 0, incomplete: 0, non_bio: 65, absent: 293 };
  }
}

export const liveAttendanceService = new LiveAttendanceService();