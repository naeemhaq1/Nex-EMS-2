import { db } from "./db";
import { employeeRecords, attendanceRecords } from "@shared/schema";
import { eq, and, sql, inArray } from "drizzle-orm";

async function quickCnicAttendanceCheck() {
  console.log("🔍 Quick check: Attendance data for employees without CNICs...\n");
  
  try {
    // Get all employees without CNICs
    const employeesWithoutCnic = await db
      .select({
        employeeCode: employeeRecords.employeeCode,
        firstName: employeeRecords.firstName,
        middleName: employeeRecords.middleName,
        lastName: employeeRecords.lastName,
        department: employeeRecords.department,
        designation: employeeRecords.designation
      })
      .from(employeeRecords)
      .where(and(
        eq(employeeRecords.isActive, true),
        sql`${employeeRecords.nationalId} IS NULL`
      ));
    
    console.log(`Found ${employeesWithoutCnic.length} employees without CNICs`);
    
    // Get employee codes for attendance check
    const employeeCodes = employeesWithoutCnic.map(emp => emp.employeeCode);
    
    // Check which employees have attendance records
    const attendanceCheck = await db
      .select({
        employeeCode: attendanceRecords.employeeCode,
        totalRecords: sql<number>`COUNT(*)`,
        recentRecords: sql<number>`COUNT(*) FILTER (WHERE ${attendanceRecords.checkIn} >= NOW() - INTERVAL '30 days')`
      })
      .from(attendanceRecords)
      .where(inArray(attendanceRecords.employeeCode, employeeCodes))
      .groupBy(attendanceRecords.employeeCode);
    
    console.log(`\n📊 ATTENDANCE ANALYSIS SUMMARY:`);
    console.log(`👥 Total employees without CNIC: ${employeesWithoutCnic.length}`);
    console.log(`✅ Have attendance data: ${attendanceCheck.length} (${((attendanceCheck.length / employeesWithoutCnic.length) * 100).toFixed(1)}%)`);
    console.log(`❌ No attendance data: ${employeesWithoutCnic.length - attendanceCheck.length} (${(((employeesWithoutCnic.length - attendanceCheck.length) / employeesWithoutCnic.length) * 100).toFixed(1)}%)`);
    
    // Show employees with attendance data
    const activeEmployees = attendanceCheck.filter(emp => Number(emp.totalRecords) > 0);
    const recentlyActive = attendanceCheck.filter(emp => Number(emp.recentRecords) > 0);
    
    console.log(`🔥 Recently active (last 30 days): ${recentlyActive.length}`);
    
    if (activeEmployees.length > 0) {
      console.log(`\n📋 EMPLOYEES WITH ATTENDANCE DATA BUT NO CNIC:`);
      
      for (const attData of activeEmployees) {
        const employee = employeesWithoutCnic.find(emp => emp.employeeCode === attData.employeeCode);
        if (employee) {
          const fullName = `${employee.firstName} ${employee.middleName || ''} ${employee.lastName}`.trim();
          const isRecent = Number(attData.recentRecords) > 0;
          const priority = isRecent ? "🚨 HIGH PRIORITY" : "⚪ INACTIVE";
          
          console.log(`${attData.employeeCode}: ${fullName} (${employee.department})`);
          console.log(`  Status: ${priority}`);
          console.log(`  Total Records: ${attData.totalRecords} | Recent (30d): ${attData.recentRecords}`);
          console.log(`  Designation: ${employee.designation || 'Not set'}`);
          console.log('');
        }
      }
    }
    
    // Show employees with no attendance data
    const employeesWithAttendance = new Set(attendanceCheck.map(emp => emp.employeeCode));
    const employeesWithoutAttendance = employeesWithoutCnic.filter(emp => !employeesWithAttendance.has(emp.employeeCode));
    
    if (employeesWithoutAttendance.length > 0) {
      console.log(`\n💤 EMPLOYEES WITH NO ATTENDANCE DATA:`);
      employeesWithoutAttendance.forEach(emp => {
        const fullName = `${emp.firstName} ${emp.middleName || ''} ${emp.lastName}`.trim();
        console.log(`${emp.employeeCode}: ${fullName} (${emp.department})`);
        console.log(`  Designation: ${emp.designation || 'Not set'}`);
      });
    }
    
    // Department breakdown
    const deptBreakdown = {};
    employeesWithoutCnic.forEach(emp => {
      if (!deptBreakdown[emp.department]) {
        deptBreakdown[emp.department] = { total: 0, withAttendance: 0 };
      }
      deptBreakdown[emp.department].total++;
      if (employeesWithAttendance.has(emp.employeeCode)) {
        deptBreakdown[emp.department].withAttendance++;
      }
    });
    
    console.log(`\n📈 DEPARTMENT BREAKDOWN (missing CNICs):`);
    Object.entries(deptBreakdown).forEach(([dept, stats]) => {
      console.log(`${dept}: ${stats.total} employees (${stats.withAttendance} with attendance, ${stats.total - stats.withAttendance} without)`);
    });
    
    console.log(`\n✨ Quick analysis complete!`);
    
  } catch (error) {
    console.error("❌ Error in quick attendance check:", error);
  }
}

quickCnicAttendanceCheck().catch(console.error);