import { db } from '../db.js';
import { shifts, shiftAssignments, employeeRecords } from '../../shared/schema.js';
import { eq, and } from 'drizzle-orm';

/**
 * Assigns LHE-Sales department to Nexlinx-10to6 shift
 * Based on their 9:42 AM average check-in pattern
 */
class LHESalesShiftAssigner {
  private targetDepartment = 'LHE-Sales';
  private targetShiftName = 'Nexlinx-10to6';

  async run(): Promise<void> {
    console.log('🚀 Starting LHE-Sales Department Shift Assignment...');
    console.log(`📋 Target Department: ${this.targetDepartment}`);
    console.log(`⏰ Target Shift: ${this.targetShiftName} (10:00 AM - 6:00 PM)`);

    try {
      // Get the Nexlinx-10to6 shift
      const [targetShift] = await db
        .select()
        .from(shifts)
        .where(eq(shifts.shift_name, this.targetShiftName));

      if (!targetShift) {
        throw new Error(`Shift ${this.targetShiftName} not found in database`);
      }

      console.log(`[LHESalesShiftAssigner] Found target shift: ${targetShift.shift_name} (${targetShift.start_hour}:${String(targetShift.start_minute).padStart(2, '0')} - ${targetShift.end_hour}:${String(targetShift.end_minute).padStart(2, '0')})`);

      // Get employees from LHE-Sales department
      const employees = await db
        .select()
        .from(employeeRecords)
        .where(
          and(
            eq(employeeRecords.department, this.targetDepartment),
            eq(employeeRecords.is_active, true)
          )
        );

      console.log(`[LHESalesShiftAssigner] Found ${employees.length} employees in ${this.targetDepartment}`);

      if (employees.length === 0) {
        console.log('⚠️ No employees found in LHE-Sales department');
        return;
      }

      // Show sample employees
      console.log('\n=== LHE-SALES EMPLOYEES ===');
      employees.slice(0, 5).forEach((emp, idx) => {
        console.log(`  ${idx + 1}. ${emp.first_name} ${emp.last_name} (${emp.employee_code})`);
      });
      if (employees.length > 5) {
        console.log(`  ... and ${employees.length - 5} more employees`);
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
            notes: `Auto-assigned to ${this.targetShiftName} based on sales department work pattern (9:42 AM average check-in, suitable for 10:00 AM shift)`
          });
        }
      }

      console.log(`[LHESalesShiftAssigner] Creating ${assignments.length} shift assignments (${employees.length} employees × 30 days)`);

      // Insert assignments in batches
      const batchSize = 100;
      for (let i = 0; i < assignments.length; i += batchSize) {
        const batch = assignments.slice(i, i + batchSize);
        await db.insert(shiftAssignments).values(batch);
        console.log(`[LHESalesShiftAssigner] Inserted batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(assignments.length/batchSize)}`);
      }

      // Summary
      console.log('\n✅ ASSIGNMENT SUMMARY:');
      console.log(`\n📊 ${this.targetDepartment}:`);
      console.log(`  • Employees: ${employees.length}`);
      console.log(`  • Shift: ${this.targetShiftName} (10:00 AM - 6:00 PM)`);
      console.log(`  • Grace Period: 30 minutes`);
      console.log(`  • 30-day assignments: ${assignments.length}`);
      console.log(`  • Pattern Match: 9:42 AM avg check-in fits 10:00 AM shift start`);

      console.log(`\n🎯 Total Results:`);
      console.log(`  • Department processed: ${this.targetDepartment}`);
      console.log(`  • Employees assigned: ${employees.length}`);
      console.log(`  • Total shift assignments created: ${assignments.length}`);
      console.log(`  • Shift template: ${this.targetShiftName} with 30-minute grace period`);

      console.log('\n✅ LHE-Sales department shift assignment completed successfully!');
      console.log('🎯 Sales team now has proper shift-based late arrival calculations instead of fallback 9:30 AM threshold.');

    } catch (error) {
      console.error('❌ Error during LHE-Sales shift assignment:', error);
      throw error;
    }
  }
}

// Execute the script
const assigner = new LHESalesShiftAssigner();
assigner.run().catch(console.error);

export default LHESalesShiftAssigner;