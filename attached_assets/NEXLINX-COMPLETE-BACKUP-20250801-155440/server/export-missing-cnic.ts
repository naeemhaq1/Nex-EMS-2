import { db } from "./db";
import { employeeRecords } from "@shared/schema";
import { and, eq, isNull, or } from "drizzle-orm";
import { writeFileSync } from "fs";

async function exportMissingCNIC() {
  console.log("Exporting employees with missing National IDs to CSV...\n");
  
  try {
    // Get all active employees missing national IDs (excluding suspects)
    const missingCNICEmployees = await db
      .select({
        employeeCode: employeeRecords.employeeCode,
        firstName: employeeRecords.firstName,
        middleName: employeeRecords.middleName,
        lastName: employeeRecords.lastName,
        pop: employeeRecords.pop,
        department: employeeRecords.department,
        designation: employeeRecords.designation,
        suspect: employeeRecords.suspect,
        susreason: employeeRecords.susreason
      })
      .from(employeeRecords)
      .where(
        and(
          eq(employeeRecords.isActive, true),
          or(
            isNull(employeeRecords.nationalId),
            eq(employeeRecords.nationalId, '')
          )
        )
      )
      .orderBy(employeeRecords.pop, employeeRecords.department, employeeRecords.employeeCode);
    
    console.log(`Found ${missingCNICEmployees.length} employees with missing National IDs`);
    
    // Separate suspects from non-suspects
    const nonSuspects = missingCNICEmployees.filter(emp => !emp.suspect);
    const suspects = missingCNICEmployees.filter(emp => emp.suspect);
    
    console.log(`- Non-suspects: ${nonSuspects.length}`);
    console.log(`- Suspects: ${suspects.length}`);
    
    // Create CSV header
    const csvHeader = "Employee Code,Name,PoP,Department,Designation,Status";
    
    // Process non-suspect employees
    const csvRows = nonSuspects.map(emp => {
      const fullName = `${emp.firstName || ''} ${emp.middleName || ''} ${emp.lastName || ''}`.trim();
      const pop = emp.pop || 'Not Assigned';
      const department = emp.department || 'Not Assigned';
      const designation = emp.designation || 'Not Assigned';
      const status = 'Missing CNIC';
      
      // Escape commas in fields by wrapping in quotes
      const escapedName = fullName.includes(',') ? `"${fullName}"` : fullName;
      const escapedDepartment = department.includes(',') ? `"${department}"` : department;
      const escapedDesignation = designation.includes(',') ? `"${designation}"` : designation;
      
      return `${emp.employeeCode},${escapedName},${pop},${escapedDepartment},${escapedDesignation},${status}`;
    });
    
    // Add suspect employees with their reason
    const suspectRows = suspects.map(emp => {
      const fullName = `${emp.firstName || ''} ${emp.middleName || ''} ${emp.lastName || ''}`.trim();
      const pop = emp.pop || 'Not Assigned';
      const department = emp.department || 'Not Assigned';
      const designation = emp.designation || 'Not Assigned';
      const status = `Suspect: ${emp.susreason || 'No reason'}`;
      
      // Escape commas in fields by wrapping in quotes
      const escapedName = fullName.includes(',') ? `"${fullName}"` : fullName;
      const escapedDepartment = department.includes(',') ? `"${department}"` : department;
      const escapedDesignation = designation.includes(',') ? `"${designation}"` : designation;
      const escapedStatus = status.includes(',') ? `"${status}"` : status;
      
      return `${emp.employeeCode},${escapedName},${pop},${escapedDepartment},${escapedDesignation},${escapedStatus}`;
    });
    
    // Combine all rows
    const allRows = [...csvRows, ...suspectRows];
    
    // Create full CSV content
    const csvContent = [csvHeader, ...allRows].join('\n');
    
    // Write to file
    const filename = 'Missing-cnic.csv';
    writeFileSync(filename, csvContent, 'utf8');
    
    console.log(`\n✓ Successfully exported to ${filename}`);
    console.log(`Total records: ${allRows.length}`);
    
    // Show summary by PoP
    console.log('\n=== Summary by PoP ===');
    const popCounts = {};
    nonSuspects.forEach(emp => {
      const pop = emp.pop || 'Not Assigned';
      if (!popCounts[pop]) {
        popCounts[pop] = 0;
      }
      popCounts[pop]++;
    });
    
    Object.entries(popCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([pop, count]) => {
        console.log(`${pop}: ${count} employees`);
      });
    
    // Show summary by Department
    console.log('\n=== Summary by Department ===');
    const deptCounts = {};
    nonSuspects.forEach(emp => {
      const dept = emp.department || 'Not Assigned';
      if (!deptCounts[dept]) {
        deptCounts[dept] = 0;
      }
      deptCounts[dept]++;
    });
    
    Object.entries(deptCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([dept, count]) => {
        console.log(`${dept}: ${count} employees`);
      });
    
    if (suspects.length > 0) {
      console.log('\n=== Suspect Employees ===');
      suspects.forEach(emp => {
        const fullName = `${emp.firstName || ''} ${emp.middleName || ''} ${emp.lastName || ''}`.trim();
        console.log(`${emp.employeeCode}: ${fullName} (${emp.department}) - ${emp.susreason || 'No reason'}`);
      });
    }
    
    console.log(`\n=== Export Complete ===`);
    console.log(`File: ${filename}`);
    console.log(`Total records: ${allRows.length}`);
    console.log(`Non-suspects: ${nonSuspects.length}`);
    console.log(`Suspects: ${suspects.length}`);
    
  } catch (error) {
    console.error("Error exporting missing CNIC data:", error);
  }
}

exportMissingCNIC().catch(console.error);