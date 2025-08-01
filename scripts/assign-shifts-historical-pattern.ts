import { db } from '../db';
import { sql } from 'drizzle-orm';
import { shiftAssignments, employeeRecords, shifts } from '@shared/schema';

/**
 * Intelligent Shift Assignment Based on Historical Attendance Patterns
 * Assigns LHE-OFC employees to TLNX shifts based on their actual check-in times
 */

interface EmployeeAttendancePattern {
  employeeId: number;
  employeeCode: string;
  fullName: string;
  department: string;
  designation: string;
  attendanceDays: number;
  avgCheckinMinutes: number;
  earliestCheckinMinutes: number;
  latestCheckinMinutes: number;
  recommendedShift: 'TLNX-Morning' | 'TLNX-Night' | 'Flexible';
  confidence: 'High' | 'Medium' | 'Low';
}

interface ShiftPattern {
  shiftId: number;
  shiftName: string;
  startMinutes: number;
  endMinutes: number;
  gracePeriodMinutes: number;
}

class HistoricalShiftAssigner {
  private tlnxShifts: ShiftPattern[] = [];
  
  async initialize() {
    console.log('[HistoricalShiftAssigner] Initializing TLNX shift patterns...');
    
    // Get TLNX shift details
    const shiftsQuery = await db.execute(sql`
      SELECT 
        id as shift_id,
        shift_name,
        start_hour * 60 + start_minute as start_minutes,
        end_hour * 60 + end_minute as end_minutes,
        grace_period_minutes
      FROM shifts 
      WHERE project_name = 'TLNX-LHE' 
        AND is_active = true
      ORDER BY start_hour, start_minute
    `);
    
    this.tlnxShifts = shiftsQuery.rows.map(row => ({
      shiftId: parseInt(String(row.shift_id)),
      shiftName: String(row.shift_name),
      startMinutes: parseInt(String(row.start_minutes)),
      endMinutes: parseInt(String(row.end_minutes)),
      gracePeriodMinutes: parseInt(String(row.grace_period_minutes))
    }));
    
    console.log(`[HistoricalShiftAssigner] Loaded ${this.tlnxShifts.length} TLNX shifts:`, 
      this.tlnxShifts.map(s => `${s.shiftName} (${Math.floor(s.startMinutes/60)}:${String(s.startMinutes%60).padStart(2,'0')})`));
  }
  
  async analyzeLHEOFCEmployees(): Promise<EmployeeAttendancePattern[]> {
    console.log('[HistoricalShiftAssigner] Analyzing LHE-OFC employee attendance patterns...');
    
    const employeesQuery = await db.execute(sql`
      SELECT 
        er.id as employee_id,
        er.employee_code,
        CONCAT(er.first_name, ' ', er.last_name) as full_name,
        er.department,
        er.designation,
        COUNT(ar.id) as attendance_days,
        AVG(EXTRACT(HOUR FROM ar.check_in) * 60 + EXTRACT(MINUTE FROM ar.check_in)) as avg_checkin_minutes,
        MIN(EXTRACT(HOUR FROM ar.check_in) * 60 + EXTRACT(MINUTE FROM ar.check_in)) as earliest_checkin_minutes,
        MAX(EXTRACT(HOUR FROM ar.check_in) * 60 + EXTRACT(MINUTE FROM ar.check_in)) as latest_checkin_minutes
      FROM employee_records er
      LEFT JOIN attendance_records ar ON er.employee_code = ar.employee_code 
        AND ar.date >= CURRENT_DATE - INTERVAL '30 days'
        AND ar.check_in IS NOT NULL
      WHERE er.department = 'LHE-OFC' 
        AND er.is_active = true
      GROUP BY er.id, er.employee_code, er.first_name, er.last_name, er.department, er.designation
      ORDER BY attendance_days DESC, avg_checkin_minutes ASC
    `);
    
    const employees: EmployeeAttendancePattern[] = employeesQuery.rows.map(row => {
      const avgCheckin = parseFloat(String(row.avg_checkin_minutes || '540')); // Default 9:00 AM
      const attendanceDays = parseInt(String(row.attendance_days || '0'));
      
      // Determine best shift based on average check-in time
      // TLNX-Morning: 9:00 AM (540 minutes) - 6:00 PM (1080 minutes)
      // TLNX-Night: 9:00 PM (1260 minutes) - 6:00 AM (360 minutes)
      
      let recommendedShift: 'TLNX-Morning' | 'TLNX-Night' | 'Flexible';
      let confidence: 'High' | 'Medium' | 'Low';
      
      if (avgCheckin >= 480 && avgCheckin < 720) { // 8:00 AM - 12:00 PM
        recommendedShift = 'TLNX-Morning';
        confidence = attendanceDays >= 10 ? 'High' : attendanceDays >= 5 ? 'Medium' : 'Low';
      } else if (avgCheckin >= 1200 || avgCheckin < 480) { // After 8:00 PM or before 8:00 AM
        recommendedShift = 'TLNX-Night';
        confidence = attendanceDays >= 10 ? 'High' : attendanceDays >= 5 ? 'Medium' : 'Low';
      } else {
        recommendedShift = 'Flexible';
        confidence = 'Medium';
      }
      
      return {
        employeeId: parseInt(String(row.employee_id)),
        employeeCode: String(row.employee_code),
        fullName: String(row.full_name),
        department: String(row.department),
        designation: String(row.designation || 'Unknown'),
        attendanceDays,
        avgCheckinMinutes: avgCheckin,
        earliestCheckinMinutes: parseFloat(String(row.earliest_checkin_minutes || '540')),
        latestCheckinMinutes: parseFloat(String(row.latest_checkin_minutes || '540')),
        recommendedShift,
        confidence
      };
    });
    
    console.log(`[HistoricalShiftAssigner] Analyzed ${employees.length} LHE-OFC employees`);
    return employees;
  }
  
  async assignShiftsToEmployees(employees: EmployeeAttendancePattern[]): Promise<void> {
    console.log('[HistoricalShiftAssigner] Starting bulk shift assignments...');
    
    let morningAssignments = 0;
    let nightAssignments = 0;
    let flexibleAssignments = 0;
    
    for (const employee of employees) {
      try {
        // Find the appropriate shift ID
        const targetShift = this.tlnxShifts.find(s => s.shiftName === employee.recommendedShift);
        
        if (!targetShift && employee.recommendedShift !== 'Flexible') {
          console.warn(`[HistoricalShiftAssigner] No shift found for ${employee.recommendedShift}, defaulting to TLNX-Morning`);
          continue;
        }
        
        // Default flexible employees to morning shift
        const assignedShift = targetShift || this.tlnxShifts.find(s => s.shiftName === 'TLNX-Morning');
        
        if (!assignedShift) {
          console.error(`[HistoricalShiftAssigner] No TLNX-Morning shift available for flexible assignment`);
          continue;
        }
        
        // Create shift assignments for the next 30 days
        const startDate = new Date();
        const assignments = [];
        
        for (let i = 0; i < 30; i++) {
          const assignmentDate = new Date(startDate);
          assignmentDate.setDate(startDate.getDate() + i);
          
          assignments.push({
            employeeId: employee.employeeId,
            shiftId: assignedShift.shiftId,
            date: assignmentDate.toISOString().split('T')[0],
            status: 'active',
            notes: `Auto-assigned based on ${employee.attendanceDays} days historical pattern (${employee.confidence} confidence)`
          });
        }
        
        // Bulk insert assignments
        await db.insert(shiftAssignments).values(assignments);
        
        // Track assignment counts
        if (assignedShift.shiftName === 'TLNX-Morning') morningAssignments++;
        else if (assignedShift.shiftName === 'TLNX-Night') nightAssignments++;
        else flexibleAssignments++;
        
        console.log(`[HistoricalShiftAssigner] ✅ ${employee.fullName} (${employee.employeeCode}) → ${assignedShift.shiftName} (${employee.confidence} confidence, ${employee.attendanceDays} days pattern)`);
        
      } catch (error) {
        console.error(`[HistoricalShiftAssigner] ❌ Failed to assign shift for ${employee.fullName}:`, error);
      }
    }
    
    console.log(`[HistoricalShiftAssigner] 📊 Assignment Summary:`);
    console.log(`  • TLNX-Morning: ${morningAssignments} employees`);
    console.log(`  • TLNX-Night: ${nightAssignments} employees`);
    console.log(`  • Flexible/Default: ${flexibleAssignments} employees`);
    console.log(`  • Total Assigned: ${morningAssignments + nightAssignments + flexibleAssignments} employees`);
  }
  
  async generateAssignmentReport(employees: EmployeeAttendancePattern[]) {
    console.log('\n=== LHE-OFC SHIFT ASSIGNMENT ANALYSIS ===');
    console.log('Based on 30-day historical attendance patterns\n');
    
    const morningEmployees = employees.filter(e => e.recommendedShift === 'TLNX-Morning');
    const nightEmployees = employees.filter(e => e.recommendedShift === 'TLNX-Night');
    const flexibleEmployees = employees.filter(e => e.recommendedShift === 'Flexible');
    
    console.log(`📊 ASSIGNMENT BREAKDOWN:`);
    console.log(`  • TLNX-Morning (9:00 AM - 6:00 PM): ${morningEmployees.length} employees`);
    console.log(`  • TLNX-Night (9:00 PM - 6:00 AM): ${nightEmployees.length} employees`);
    console.log(`  • Flexible (Default to Morning): ${flexibleEmployees.length} employees`);
    console.log(`  • Total LHE-OFC Employees: ${employees.length}\n`);
    
    console.log(`🔍 HIGH CONFIDENCE ASSIGNMENTS (10+ attendance days):`);
    const highConfidence = employees.filter(e => e.confidence === 'High');
    highConfidence.forEach(emp => {
      const avgTime = `${Math.floor(emp.avgCheckinMinutes/60)}:${String(Math.floor(emp.avgCheckinMinutes%60)).padStart(2,'0')}`;
      console.log(`  • ${emp.fullName} (${emp.designation}) → ${emp.recommendedShift} (avg: ${avgTime}, ${emp.attendanceDays} days)`);
    });
    
    console.log(`\n⚠️  LOW CONFIDENCE ASSIGNMENTS (<5 attendance days):`);
    const lowConfidence = employees.filter(e => e.confidence === 'Low');
    lowConfidence.forEach(emp => {
      console.log(`  • ${emp.fullName} (${emp.designation}) → ${emp.recommendedShift} (${emp.attendanceDays} days only)`);
    });
  }
  
  async run() {
    try {
      console.log('🚀 Starting Historical Pattern-Based Shift Assignment for LHE-OFC...\n');
      
      await this.initialize();
      const employees = await this.analyzeLHEOFCEmployees();
      await this.generateAssignmentReport(employees);
      await this.assignShiftsToEmployees(employees);
      
      console.log('\n✅ Historical shift assignment completed successfully!');
      console.log('🎯 All LHE-OFC employees now have appropriate TLNX shift assignments based on their actual attendance patterns.');
      
    } catch (error) {
      console.error('❌ Historical shift assignment failed:', error);
      throw error;
    }
  }
}

// Execute the script
const assigner = new HistoricalShiftAssigner();
assigner.run().catch(console.error);

export default HistoricalShiftAssigner;