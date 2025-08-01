import { db } from "./db";
import { employeeRecords, attendanceRecords } from "@shared/schema";
import { eq, and, sql, desc } from "drizzle-orm";

async function analyzeMissingCnicAttendance() {
  console.log("🔍 Analyzing attendance data for employees without CNICs...\n");
  
  try {
    // Get all employees without CNICs
    const employeesWithoutCnic = await db
      .select()
      .from(employeeRecords)
      .where(and(
        eq(employeeRecords.isActive, true),
        sql`${employeeRecords.nationalId} IS NULL`
      ));
    
    console.log(`Found ${employeesWithoutCnic.length} employees without CNICs`);
    
    // Check attendance data for each employee
    const attendanceAnalysis = [];
    
    for (const employee of employeesWithoutCnic) {
      // Get attendance records for this employee
      const attendanceData = await db
        .select({
          totalRecords: sql<number>`COUNT(*)`,
          firstPunch: sql<Date>`MIN(${attendanceRecords.checkIn})`,
          lastPunch: sql<Date>`MAX(COALESCE(${attendanceRecords.checkOut}, ${attendanceRecords.checkIn}))`,
          uniqueDays: sql<number>`COUNT(DISTINCT DATE(${attendanceRecords.checkIn}))`,
          last30Days: sql<number>`COUNT(*) FILTER (WHERE ${attendanceRecords.checkIn} >= NOW() - INTERVAL '30 days')`,
          last7Days: sql<number>`COUNT(*) FILTER (WHERE ${attendanceRecords.checkIn} >= NOW() - INTERVAL '7 days')`
        })
        .from(attendanceRecords)
        .where(eq(attendanceRecords.employeeCode, employee.employeeCode));
      
      const data = attendanceData[0];
      
      // Get some recent attendance records
      const recentAttendance = await db
        .select()
        .from(attendanceRecords)
        .where(eq(attendanceRecords.employeeCode, employee.employeeCode))
        .orderBy(desc(attendanceRecords.checkIn))
        .limit(5);
      
      attendanceAnalysis.push({
        employee,
        totalRecords: Number(data.totalRecords),
        firstPunch: data.firstPunch,
        lastPunch: data.lastPunch,
        uniqueDays: Number(data.uniqueDays),
        last30Days: Number(data.last30Days),
        last7Days: Number(data.last7Days),
        recentAttendance
      });
    }
    
    // Sort by total records (most active first)
    attendanceAnalysis.sort((a, b) => b.totalRecords - a.totalRecords);
    
    // Categorize employees
    const activeEmployees = attendanceAnalysis.filter(emp => emp.totalRecords > 0);
    const inactiveEmployees = attendanceAnalysis.filter(emp => emp.totalRecords === 0);
    const recentlyActive = attendanceAnalysis.filter(emp => emp.last7Days > 0);
    const moderatelyActive = attendanceAnalysis.filter(emp => emp.last30Days > 0 && emp.last7Days === 0);
    
    console.log(`\n📊 ATTENDANCE ANALYSIS SUMMARY:`);
    console.log(`👥 Total employees without CNIC: ${employeesWithoutCnic.length}`);
    console.log(`✅ Have attendance data: ${activeEmployees.length} (${((activeEmployees.length / employeesWithoutCnic.length) * 100).toFixed(1)}%)`);
    console.log(`❌ No attendance data: ${inactiveEmployees.length} (${((inactiveEmployees.length / employeesWithoutCnic.length) * 100).toFixed(1)}%)`);
    console.log(`🔥 Recently active (last 7 days): ${recentlyActive.length}`);
    console.log(`🔶 Moderately active (last 30 days): ${moderatelyActive.length}`);
    
    // Show detailed breakdown
    console.log(`\n📋 DETAILED ATTENDANCE BREAKDOWN:`);
    console.log(`${"="*80}`);
    
    attendanceAnalysis.forEach((emp, index) => {
      const fullName = `${emp.employee.firstName} ${emp.employee.middleName || ''} ${emp.employee.lastName}`.trim();
      const activityLevel = emp.last7Days > 0 ? "🔥 VERY ACTIVE" : 
                           emp.last30Days > 0 ? "🔶 MODERATELY ACTIVE" : 
                           emp.totalRecords > 0 ? "⚪ INACTIVE" : "❌ NO DATA";
      
      console.log(`\n${index + 1}. ${emp.employee.employeeCode}: ${fullName}`);
      console.log(`   Department: ${emp.employee.department}`);
      console.log(`   Designation: ${emp.employee.designation || 'Not set'}`);
      console.log(`   Activity Level: ${activityLevel}`);
      console.log(`   Total Records: ${emp.totalRecords}`);
      console.log(`   Unique Days: ${emp.uniqueDays}`);
      console.log(`   Last 30 days: ${emp.last30Days} records`);
      console.log(`   Last 7 days: ${emp.last7Days} records`);
      
      if (emp.firstPunch) {
        console.log(`   First Punch: ${emp.firstPunch.toDateString()}`);
        console.log(`   Last Punch: ${emp.lastPunch.toDateString()}`);
      }
      
      if (emp.recentAttendance.length > 0) {
        console.log(`   Recent Activity:`);
        emp.recentAttendance.forEach((record, i) => {
          const checkIn = record.checkIn ? record.checkIn.toISOString().split('T')[0] : 'N/A';
          const checkOut = record.checkOut ? record.checkOut.toISOString().split('T')[0] : 'No checkout';
          console.log(`     ${i + 1}. ${checkIn} - ${checkOut} (${record.hoursWorked || 0}h)`);
        });
      }
      
      console.log(`   ${"-".repeat(40)}`);
    });
    
    // Show high-priority employees (those with recent attendance but no CNIC)
    const highPriorityEmployees = attendanceAnalysis.filter(emp => emp.last30Days > 0);
    
    if (highPriorityEmployees.length > 0) {
      console.log(`\n🚨 HIGH PRIORITY: Active employees without CNICs (${highPriorityEmployees.length}):`);
      console.log(`These employees have recent attendance but missing CNICs:`);
      
      highPriorityEmployees.forEach((emp, index) => {
        const fullName = `${emp.employee.firstName} ${emp.employee.middleName || ''} ${emp.employee.lastName}`.trim();
        console.log(`${index + 1}. ${emp.employee.employeeCode}: ${fullName} (${emp.employee.department})`);
        console.log(`   Last 30 days: ${emp.last30Days} records | Last 7 days: ${emp.last7Days} records`);
      });
    }
    
    // Show employees with no attendance data
    if (inactiveEmployees.length > 0) {
      console.log(`\n💤 INACTIVE: Employees with no attendance data (${inactiveEmployees.length}):`);
      console.log(`These employees may be administrative, inactive, or not using biometric devices:`);
      
      inactiveEmployees.forEach((emp, index) => {
        const fullName = `${emp.employee.firstName} ${emp.employee.middleName || ''} ${emp.employee.lastName}`.trim();
        console.log(`${index + 1}. ${emp.employee.employeeCode}: ${fullName} (${emp.employee.department})`);
        console.log(`   Designation: ${emp.employee.designation || 'Not set'}`);
      });
    }
    
    // Department breakdown
    const departmentBreakdown = {};
    attendanceAnalysis.forEach(emp => {
      const dept = emp.employee.department;
      if (!departmentBreakdown[dept]) {
        departmentBreakdown[dept] = { total: 0, active: 0, inactive: 0 };
      }
      departmentBreakdown[dept].total++;
      if (emp.totalRecords > 0) {
        departmentBreakdown[dept].active++;
      } else {
        departmentBreakdown[dept].inactive++;
      }
    });
    
    console.log(`\n📈 DEPARTMENT BREAKDOWN:`);
    Object.entries(departmentBreakdown).forEach(([dept, stats]) => {
      console.log(`${dept}: ${stats.total} employees (${stats.active} active, ${stats.inactive} inactive)`);
    });
    
    console.log(`\n✨ Analysis complete!`);
    
  } catch (error) {
    console.error("❌ Error analyzing attendance data:", error);
  }
}

analyzeMissingCnicAttendance().catch(console.error);