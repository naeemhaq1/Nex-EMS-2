import { db } from '../db.js';
import { shifts, shiftAssignments, employeeRecords } from '../../shared/schema.js';
import { eq, and, inArray } from 'drizzle-orm';

/**
 * Assigns LHE office departments (Accounts, HR, Finance) to Nexlinx-9to5 shifts
 * Based on their consistent 9:00 AM average check-in times
 */
class LHEOfficeShiftAssigner {
  private targetDepartments = ['LHE-Accounts', 'LHE-HR', 'LHE-Finance'];
  private targetShiftName = 'Nexlinx-9to5';

  async run(): Promise<void> {
    console.log('🚀 Starting LHE Office Department Shift Assignment...');
    console.log(`📋 Target Departments: ${this.targetDepartments.join(', ')}`);
    console.log(`⏰ Target Shift: ${this.targetShiftName} (9:00 AM - 5:00 PM)`);

    try {
      // Get the Nexlinx-9to5 shift
      const [targetShift] = await db
        .select()
        .from(shifts)
        .where(eq(shifts.shift_name, this.targetShiftName));

      if (!targetShift) {
        throw new Error(`Shift ${this.targetShiftName} not found in database`);
      }

      console.log(`[LHEOfficeShiftAssigner] Found target shift: ${targetShift.shift_name} (${targetShift.start_hour}:${String(targetShift.start_minute).padStart(2, '0')} - ${targetShift.end_hour}:${String(targetShift.end_minute).padStart(2, '0')})`);

      // Get employees from target departments
      const employees = await db
        .select()
        .from(employeeRecords)
        .where(
          and(
            inArray(employeeRecords.department, this.targetDepartments),
            eq(employeeRecords.is_active, true)
          )
        );

      console.log(`[LHEOfficeShiftAssigner] Found ${employees.length} employees across target departments`);

      // Group by department for analysis
      const departmentBreakdown = employees.reduce((acc, emp) => {
        acc[emp.department] = (acc[emp.department] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log('\n=== LHE OFFICE DEPARTMENTS BREAKDOWN ===');
      Object.entries(departmentBreakdown).forEach(([dept, count]) => {
        console.log(`  • ${dept}: ${count} employees`);
      });

      if (employees.length === 0) {
        console.log('⚠️ No employees found in target departments');
        return;
      }

      // Create shift assignments for 30 days (today + 29 future days)
      console.log('\n🔄 Creating 30-day shift assignments...');
      
      const assignments = [];
      const today = new Date();
      
      for (const employee of employees) {
        for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
          const assignmentDate = new Date(today);
          assignmentDate.setDate(today.getDate() + dayOffset);
          
          assignments.push({
            employee_id: employee.id,
            shift_id: targetShift.id,
            date: assignmentDate,
            notes: `Auto-assigned to ${this.targetShiftName} based on office department work pattern (9:00 AM average check-in)`
          });
        }
      }

      console.log(`[LHEOfficeShiftAssigner] Creating ${assignments.length} shift assignments (${employees.length} employees × 30 days)`);

      // Insert assignments in batches
      const batchSize = 100;
      for (let i = 0; i < assignments.length; i += batchSize) {
        const batch = assignments.slice(i, i + batchSize);
        await db.insert(shiftAssignments).values(batch);
        console.log(`[LHEOfficeShiftAssigner] Inserted batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(assignments.length/batchSize)}`);
      }

      // Summary by department
      console.log('\n✅ ASSIGNMENT SUMMARY:');
      for (const [department, count] of Object.entries(departmentBreakdown)) {
        const deptEmployees = employees.filter(e => e.department === department);
        console.log(`\n📊 ${department}:`);
        console.log(`  • Employees: ${count}`);
        console.log(`  • Shift: ${this.targetShiftName} (9:00 AM - 5:00 PM)`);
        console.log(`  • 30-day assignments: ${count * 30}`);
        console.log(`  • Sample employees: ${deptEmployees.slice(0, 3).map(e => `${e.first_name} ${e.last_name}`).join(', ')}`);
      }

      console.log(`\n🎯 Total Results:`);
      console.log(`  • Departments processed: ${Object.keys(departmentBreakdown).length}`);
      console.log(`  • Employees assigned: ${employees.length}`);
      console.log(`  • Total shift assignments created: ${assignments.length}`);
      console.log(`  • Shift template: ${this.targetShiftName} with 30-minute grace period`);

      console.log('\n✅ LHE Office department shift assignment completed successfully!');
      console.log('🎯 These employees now have proper shift-based late arrival calculations instead of fallback 9:30 AM threshold.');

    } catch (error) {
      console.error('❌ Error during LHE office shift assignment:', error);
      throw error;
    }
  }
}

// Execute the script
const assigner = new LHEOfficeShiftAssigner();
assigner.run().catch(console.error);

export default LHEOfficeShiftAssigner;