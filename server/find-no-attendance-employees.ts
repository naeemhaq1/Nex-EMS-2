import { db } from "./db";
import { employeeRecords, attendanceRecords } from "@shared/schema";
import { eq, sql, and, notInArray } from "drizzle-orm";
import dotenv from "dotenv";

dotenv.config();

async function findEmployeesWithNoAttendance() {
  console.log("=== Finding Employees Who Never Marked Attendance ===");
  console.log(`Date: ${new Date().toISOString()}\n`);

  try {
    // First, get all employee codes that have attendance records
    const employeesWithAttendance = await db
      .selectDistinct({ employeeCode: attendanceRecords.employeeCode })
      .from(attendanceRecords);

    const attendanceEmployeeCodes = employeesWithAttendance.map(e => e.employeeCode);

    // Now get all active employees who are NOT in the attendance list
    let query;
    if (attendanceEmployeeCodes.length > 0) {
      query = db
        .select({
          employeeCode: employeeRecords.employeeCode,
          firstName: employeeRecords.firstName,
          lastName: employeeRecords.lastName,
          department: employeeRecords.department,
          position: employeeRecords.position,
          hireDate: employeeRecords.hireDate,
          empType: employeeRecords.empType,
          phone: employeeRecords.phone,
          email: employeeRecords.email
        })
        .from(employeeRecords)
        .where(
          and(
            eq(employeeRecords.isActive, true),
            notInArray(employeeRecords.employeeCode, attendanceEmployeeCodes)
          )
        )
        .orderBy(employeeRecords.department, employeeRecords.employeeCode);
    } else {
      // If no attendance records exist at all
      query = db
        .select({
          employeeCode: employeeRecords.employeeCode,
          firstName: employeeRecords.firstName,
          lastName: employeeRecords.lastName,
          department: employeeRecords.department,
          position: employeeRecords.position,
          hireDate: employeeRecords.hireDate,
          empType: employeeRecords.empType,
          phone: employeeRecords.phone,
          email: employeeRecords.email
        })
        .from(employeeRecords)
        .where(eq(employeeRecords.isActive, true))
        .orderBy(employeeRecords.department, employeeRecords.employeeCode);
    }

    const employeesWithNoAttendance = await query;

    console.log(`Found ${employeesWithNoAttendance.length} employees who have never marked attendance:\n`);

    // Group by department for better readability
    const byDepartment: { [key: string]: typeof employeesWithNoAttendance } = {};
    
    employeesWithNoAttendance.forEach(emp => {
      const dept = emp.department || 'No Department';
      if (!byDepartment[dept]) {
        byDepartment[dept] = [];
      }
      byDepartment[dept].push(emp);
    });

    // Display results by department
    Object.keys(byDepartment).sort().forEach(dept => {
      console.log(`\n${dept} (${byDepartment[dept].length} employees):`);
      console.log("─".repeat(80));
      
      byDepartment[dept].forEach(emp => {
        const name = `${emp.firstName} ${emp.lastName || ''}`.trim();
        const hireDate = emp.hireDate ? new Date(emp.hireDate).toLocaleDateString() : 'N/A';
        console.log(
          `  ${emp.employeeCode.padEnd(12)} | ${name.padEnd(25)} | ${(emp.position || 'N/A').padEnd(20)} | ${emp.empType.padEnd(12)} | Hired: ${hireDate}`
        );
      });
    });

    // Summary statistics
    console.log("\n" + "=".repeat(80));
    console.log("SUMMARY:");
    console.log("=".repeat(80));
    
    const totalActive = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(employeeRecords)
      .where(eq(employeeRecords.isActive, true));

    const totalWithAttendance = await db
      .selectDistinct({ count: sql<number>`count(distinct ${attendanceRecords.employeeCode})::int` })
      .from(attendanceRecords);

    console.log(`Total active employees: ${totalActive[0].count}`);
    console.log(`Employees with attendance records: ${totalWithAttendance[0].count}`);
    console.log(`Employees with NO attendance records: ${employeesWithNoAttendance.length}`);
    console.log(`Percentage without attendance: ${((employeesWithNoAttendance.length / totalActive[0].count) * 100).toFixed(1)}%`);

    // Type breakdown
    const contractedCount = employeesWithNoAttendance.filter(e => e.empType === 'Contracted').length;
    const fullTimeCount = employeesWithNoAttendance.filter(e => e.empType === 'Full-time').length;
    
    console.log(`\nBy Employee Type:`);
    console.log(`  Contracted: ${contractedCount} employees`);
    console.log(`  Full-time: ${fullTimeCount} employees`);

  } catch (error) {
    console.error("Error finding employees without attendance:", error);
    process.exit(1);
  }
}

// Run the query
findEmployeesWithNoAttendance().then(() => process.exit(0));