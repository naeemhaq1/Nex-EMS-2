import { db } from './db';
import { employeeRecords } from '@shared/schema';
import { eq, and, isNull, or, sql } from 'drizzle-orm';
import fs from 'fs';

async function generateMissingLastnameReport() {
  console.log('Generating missing last name report...');
  
  try {
    // Get count of employees missing last names
    const countResult = await db
      .select({
        total: sql<number>`COUNT(*)`
      })
      .from(employeeRecords)
      .where(and(
        eq(employeeRecords.isActive, true),
        or(
          isNull(employeeRecords.lastName),
          eq(employeeRecords.lastName, ''),
          sql`TRIM(${employeeRecords.lastName}) = ''`
        )
      ));
    
    const totalMissingLastName = countResult[0].total;
    
    // Get detailed list of employees missing last names
    const missingLastNameEmployees = await db
      .select({
        employeeCode: employeeRecords.employeeCode,
        firstName: employeeRecords.firstName,
        middleName: employeeRecords.middleName,
        lastName: employeeRecords.lastName,
        department: employeeRecords.department,
        nationalId: employeeRecords.nationalId,
        designation: employeeRecords.designation,
        joiningDate: employeeRecords.joiningDate
      })
      .from(employeeRecords)
      .where(and(
        eq(employeeRecords.isActive, true),
        or(
          isNull(employeeRecords.lastName),
          eq(employeeRecords.lastName, ''),
          sql`TRIM(${employeeRecords.lastName}) = ''`
        )
      ))
      .orderBy(employeeRecords.employeeCode);
    
    console.log(`\n=== MISSING LAST NAME REPORT ===`);
    console.log(`Total employees missing last names: ${totalMissingLastName}`);
    console.log(`Total active employees: 323`);
    console.log(`Percentage missing last names: ${((Number(totalMissingLastName) / 323) * 100).toFixed(1)}%`);
    
    console.log(`\n=== EMPLOYEES MISSING LAST NAMES ===`);
    missingLastNameEmployees.forEach(emp => {
      const fullName = `${emp.firstName} ${emp.middleName || ''}`.trim();
      const cnicStatus = emp.nationalId ? '✓ Has CNIC' : '✗ No CNIC';
      const designationStatus = emp.designation ? `${emp.designation}` : 'No designation';
      
      console.log(`${emp.employeeCode} - ${fullName} (${emp.department})`);
      console.log(`  ${cnicStatus} | ${designationStatus}`);
      console.log('');
    });
    
    // Generate CSV report
    const csvContent = [
      'Employee Code,First Name,Middle Name,Last Name,Department,National ID,Designation,Joining Date,CNIC Status,Designation Status',
      ...missingLastNameEmployees.map(emp => {
        const cnicStatus = emp.nationalId ? 'Has CNIC' : 'Missing CNIC';
        const designationStatus = emp.designation ? 'Has Designation' : 'Missing Designation';
        return `${emp.employeeCode},"${emp.firstName}","${emp.middleName || ''}","${emp.lastName || ''}","${emp.department}","${emp.nationalId || ''}","${emp.designation || ''}","${emp.joiningDate || ''}","${cnicStatus}","${designationStatus}"`;
      })
    ].join('\n');
    
    fs.writeFileSync('Missing-LastName-Report.csv', csvContent);
    console.log('✓ CSV report generated: Missing-LastName-Report.csv');
    
    // Department breakdown
    const departmentBreakdown = missingLastNameEmployees.reduce((acc, emp) => {
      acc[emp.department] = (acc[emp.department] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log(`\n=== DEPARTMENT BREAKDOWN ===`);
    Object.entries(departmentBreakdown)
      .sort(([,a], [,b]) => b - a)
      .forEach(([dept, count]) => {
        console.log(`${dept}: ${count} employees`);
      });
    
  } catch (error) {
    console.error('Error generating missing last name report:', error);
  }
}

// Run the report generation
generateMissingLastnameReport();