import { db } from './db';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { attendanceRecords, employeeRecords } from '../shared/schema';

async function recalculateKPIs() {
  console.log('Starting KPI recalculation based on recovered 13-day data...');
  
  // Get date range for the last 13 days (June 30 - July 12, 2025)
  const startDate = new Date('2025-06-30');
  const endDate = new Date('2025-07-12');
  
  console.log(`Calculating KPIs for period: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
  
  try {
    // Get total attendance records in the period
    const totalAttendanceQuery = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(attendanceRecords)
      .where(
        and(
          gte(attendanceRecords.checkIn, startDate),
          lte(attendanceRecords.checkIn, endDate)
        )
      );
    
    const totalAttendanceRecords = totalAttendanceQuery[0]?.count || 0;
    console.log(`Total attendance records in period: ${totalAttendanceRecords}`);
    
    // Get unique employee attendance by date
    const dailyAttendanceQuery = await db
      .select({ 
        date: sql<string>`DATE(${attendanceRecords.checkIn})`,
        uniqueEmployees: sql<number>`COUNT(DISTINCT ${attendanceRecords.employeeCode})`,
        totalRecords: sql<number>`COUNT(*)`
      })
      .from(attendanceRecords)
      .where(
        and(
          gte(attendanceRecords.checkIn, startDate),
          lte(attendanceRecords.checkIn, endDate)
        )
      )
      .groupBy(sql`DATE(${attendanceRecords.checkIn})`)
      .orderBy(sql`DATE(${attendanceRecords.checkIn}) DESC`);
    
    console.log('Daily attendance summary:');
    dailyAttendanceQuery.forEach(row => {
      console.log(`${row.date}: ${row.uniqueEmployees} employees, ${row.totalRecords} records`);
    });
    
    // Get total active employees
    const activeEmployeesQuery = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(employeeRecords)
      .where(eq(employeeRecords.isActive, true));
    
    const totalActiveEmployees = activeEmployeesQuery[0]?.count || 0;
    console.log(`Total active employees: ${totalActiveEmployees}`);
    
    // Calculate average daily attendance rate
    const totalUniqueEmployees = dailyAttendanceQuery.reduce((sum, row) => sum + Number(row.uniqueEmployees), 0);
    const avgDailyAttendance = dailyAttendanceQuery.length > 0 
      ? totalUniqueEmployees / dailyAttendanceQuery.length
      : 0;
    
    const attendanceRate = totalActiveEmployees > 0 ? (avgDailyAttendance / totalActiveEmployees) * 100 : 0;
    
    console.log(`Total unique employees across all days: ${totalUniqueEmployees}`);
    console.log(`Average daily attendance: ${avgDailyAttendance.toFixed(1)} employees`);
    console.log(`Average attendance rate: ${attendanceRate.toFixed(1)}%`);
    
    // Get NonBio employees count
    const nonBioQuery = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(employeeRecords)
      .where(
        and(
          eq(employeeRecords.isActive, true),
          eq(employeeRecords.nonBio, true)
        )
      );
    
    const nonBioEmployees = nonBioQuery[0]?.count || 0;
    console.log(`NonBio employees: ${nonBioEmployees}`);
    
    // Calculate performance metrics
    const performanceMetrics = {
      totalActiveEmployees,
      nonBioEmployees,
      totalAttendanceRecords,
      daysWithData: dailyAttendanceQuery.length,
      avgDailyAttendance: Math.round(avgDailyAttendance),
      attendanceRate: Math.round(attendanceRate * 100) / 100,
      dataRecoveryPeriod: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
      recalculationDate: new Date().toISOString()
    };
    
    console.log('\n=== KPI RECALCULATION COMPLETE ===');
    console.log('Performance Metrics:', JSON.stringify(performanceMetrics, null, 2));
    
    return performanceMetrics;
    
  } catch (error) {
    console.error('Error during KPI recalculation:', error);
    throw error;
  }
}

// Run the recalculation
recalculateKPIs()
  .then(metrics => {
    console.log('KPI recalculation completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('KPI recalculation failed:', error);
    process.exit(1);
  });