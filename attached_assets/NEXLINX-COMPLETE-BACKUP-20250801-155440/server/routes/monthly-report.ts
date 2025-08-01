import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { pool } from '../db';

const router = Router();

// Get ALL July 2025 biometric employees (252 total) - COMPLETE DATASET
router.get('/july-2025-full', requireAuth, requireAdmin, async (req, res) => {
  try {
    console.log('📊 Monthly Report: Fetching ALL 252 biometric employees for July 2025');
    
    const query = `
      WITH july_attendance AS (
        SELECT 
          das.employee_code,
          -- Use pre-calculated total_hours (already handles field employees with first punch-in + last punch-out)
          SUM(
            CASE 
              WHEN das.status = 'present' AND das.total_hours > 0 
              THEN das.total_hours
              -- For missed punches, credit 7.5 hours of work
              WHEN das.first_punch IS NOT NULL OR das.last_punch IS NOT NULL 
              THEN 7.5
              ELSE 0
            END
          ) as total_worked_hours,
          COUNT(CASE WHEN das.status = 'present' THEN 1 END) as attendance_days,
          AVG(
            CASE 
              WHEN das.status = 'present' AND das.total_hours > 0 
              THEN das.total_hours
              WHEN das.first_punch IS NOT NULL OR das.last_punch IS NOT NULL 
              THEN 7.5
              ELSE NULL
            END
          ) as avg_hours_per_day,
          COUNT(CASE WHEN das.first_punch IS NULL OR das.last_punch IS NULL THEN 1 END) as missed_punches
        FROM daily_attendance_summary das
        WHERE das.date >= '2025-07-01' 
          AND das.date <= '2025-07-31'
        GROUP BY das.employee_code
      )
      SELECT 
        er.employee_code,
        er.first_name || ' ' || er.last_name as full_name,
        er.first_name,
        er.last_name,
        COALESCE(er.department, 'NO DEPARTMENT') as department,
        COALESCE(er.designation, 'Unassigned') as designation,
        COALESCE(ja.total_worked_hours, 0) as total_hours,
        COALESCE(ja.attendance_days, 0) as days_present,
        COALESCE(ROUND(ja.avg_hours_per_day, 2), 0) as avg_daily_hours,
        COALESCE(ja.missed_punches, 0) as missed_punches,
        er.non_bio as is_non_bio
      FROM employee_records er
      LEFT JOIN july_attendance ja ON er.employee_code = ja.employee_code
      WHERE er.is_active = true 
        -- CRITICAL: Exclude biometric exemptions (non-bio employees)
        AND (er.non_bio IS NULL OR er.non_bio = false)
      ORDER BY er.department, er.first_name, er.last_name
    `;
    
    const result = await pool.query(query);
    const employees = result.rows;
    
    console.log(`📊 Monthly Report: Found ${employees.length} biometric employees`);
    
    // Calculate performance metrics for each employee
    const processedEmployees = employees.map(emp => {
      const totalHours = parseFloat(emp.total_hours) || 0;
      const missedPunches = parseInt(emp.missed_punches) || 0;
      const daysPresent = parseInt(emp.days_present) || 0;
      const avgDailyHours = parseFloat(emp.avg_daily_hours) || 0;
      
      // Calculate penalty for missed punches (0.5 hours penalty per missed punch)
      // Note: Employee still gets full 7.5 hours credit for work, penalty is administrative only
      const missedPunchPenalty = missedPunches * 0.5;
      const adjustedHours = totalHours; // Total worked hours remain unchanged
      
      // Determine performance grade
      let punctualityGrade = 'A';
      let punctualityScore = 100;
      
      if (totalHours < 50) {
        punctualityGrade = 'F';
        punctualityScore = 25;
      } else if (totalHours < 100) {
        punctualityGrade = 'D';
        punctualityScore = 50;
      } else if (totalHours < 140) {
        punctualityGrade = 'C';
        punctualityScore = 70;
      } else if (totalHours < 160) {
        punctualityGrade = 'B';
        punctualityScore = 85;
      }
      
      // Check if below minimum threshold (160 hours)
      const isMinHourBreach = totalHours < 160;
      
      // Generate comments
      let comments = '';
      if (totalHours === 0) {
        comments = 'NO ATTENDANCE DATA - Zero hours recorded';
      } else if (totalHours < 50) {
        comments = `CRITICAL: Only ${totalHours} hours with ${missedPunches} missed punches`;
      } else if (totalHours < 100) {
        comments = `POOR: ${missedPunches} missed punches, below expectations`;
      } else if (totalHours < 160) {
        comments = `BELOW MINIMUM: ${missedPunches} missed punches, needs improvement`;
      } else {
        comments = `ADEQUATE: ${missedPunches} missed punches, meeting standards`;
      }
      
      if (missedPunches > 0) {
        comments += ` | Admin Penalty: ${missedPunchPenalty}hrs (${missedPunches} × 0.5hr penalty, work hours credited)`;
      }
      
      return {
        employeeId: emp.employee_code,
        employeeName: emp.full_name,
        employeeCode: emp.employee_code,
        firstName: emp.first_name,
        lastName: emp.last_name,
        department: emp.department,
        designation: emp.designation,
        totalWorkedHours: totalHours,
        attendanceDays: daysPresent,
        averageHoursPerDay: avgDailyHours,
        punctualityGrade,
        punctualityScore,
        missedPunches,
        deductedHours: missedPunchPenalty, // Penalty amount, not deduction from work hours
        adjustedHours,
        overtimeHours: Math.max(0, totalHours - 160),
        isMinHourBreach,
        comments
      };
    });
    
    // Separate into categories
    const minHourBreaches = processedEmployees.filter(emp => emp.isMinHourBreach);
    const topPerformers = processedEmployees
      .filter(emp => !emp.isMinHourBreach && emp.totalWorkedHours > 180)
      .sort((a, b) => b.totalWorkedHours - a.totalWorkedHours)
      .slice(0, 10);
    const regularEmployees = processedEmployees.filter(emp => 
      !emp.isMinHourBreach && emp.totalWorkedHours <= 180
    );
    
    // Get department statistics
    const departmentStats = employees.reduce((acc, emp) => {
      const dept = emp.department;
      if (!acc[dept]) {
        acc[dept] = { count: 0, totalHours: 0 };
      }
      acc[dept].count++;
      acc[dept].totalHours += parseFloat(emp.total_hours) || 0;
      return acc;
    }, {} as Record<string, { count: number; totalHours: number }>);
    
    const responseData = {
      totalEmployees: employees.length,
      monthYear: 'July 2025',
      reportDate: new Date().toISOString().split('T')[0],
      employees: processedEmployees,
      minHourBreaches,
      topPerformers,
      regularEmployees,
      departmentStats,
      summary: {
        totalBiometricEmployees: employees.length,
        employeesWithData: employees.filter(emp => parseFloat(emp.total_hours) > 0).length,
        zeroHoursEmployees: employees.filter(emp => parseFloat(emp.total_hours) === 0).length,
        minHourBreachCount: minHourBreaches.length,
        topPerformerCount: topPerformers.length
      }
    };
    
    console.log(`📊 Monthly Report: Processed ${processedEmployees.length} employees`);
    console.log(`📊 Categories: ${minHourBreaches.length} breaches, ${topPerformers.length} top performers, ${regularEmployees.length} regular`);
    
    res.json(responseData);
    
  } catch (error) {
    console.error('❌ Monthly Report Error:', error);
    res.status(500).json({ 
      error: 'Failed to generate monthly report',
      message: 'Database query failed'
    });
  }
});

export default router;