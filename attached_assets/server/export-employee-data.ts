import { db } from "./db";
import { employeeRecords } from "../shared/schema";
import { eq } from "drizzle-orm";
import { writeFileSync } from "fs";
import { resolve } from "path";

async function exportEmployeeData() {
  console.log("Starting employee data export...");
  
  try {
    // Get all active employees
    const employees = await db
      .select()
      .from(employeeRecords)
      .where(eq(employeeRecords.isActive, true))
      .orderBy(employeeRecords.employeeCode);
    
    console.log(`Found ${employees.length} active employees`);
    
    // Create CSV headers
    const headers = [
      'Employee Code',
      'Salutation',
      'First Name',
      'Middle Name',
      'Last Name',
      'Department',
      'National ID',
      'Phone',
      'Email',
      'Joining Date',
      'Designation',
      'Work Team',
      'Shift ID',
      'Non Bio',
      'Suspect',
      'Suspect Reason',
      'Birthday',
      'Contract Date',
      'Contract Term',
      'Contract Expiry Date',
      'Location',
      'Code2',
      'Created At',
      'Updated At'
    ];
    
    // Create CSV rows
    const csvRows = [headers.join(',')];
    
    for (const emp of employees) {
      const row = [
        emp.employeeCode || '',
        emp.salutation || '',
        emp.firstName || '',
        emp.middleName || '',
        emp.lastName || '',
        emp.department || '',
        emp.nationalId || '',
        emp.phone || '',
        emp.email || '',
        emp.joiningDate || '',
        emp.designation || '',
        emp.workTeam || '',
        emp.shiftId || '',
        emp.nonBio ? 'TRUE' : 'FALSE',
        emp.suspect ? 'TRUE' : 'FALSE',
        emp.susreason || '',
        emp.birthday || '',
        emp.contractDate || '',
        emp.contractTerm || '',
        emp.contractExpiryDate || '',
        emp.location || '',
        emp.code2 || '',
        emp.createdAt ? emp.createdAt.toISOString() : '',
        emp.updatedAt ? emp.updatedAt.toISOString() : ''
      ];
      
      // Escape commas and quotes in CSV data
      const escapedRow = row.map(field => {
        const stringField = String(field);
        if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
          return `"${stringField.replace(/"/g, '""')}"`;
        }
        return stringField;
      });
      
      csvRows.push(escapedRow.join(','));
    }
    
    const csvContent = csvRows.join('\n');
    
    // Write to file
    const filePath = resolve(process.cwd(), 'employee1.csv');
    writeFileSync(filePath, csvContent, 'utf-8');
    
    console.log(`\nEmployee data exported successfully to: employee1.csv`);
    console.log(`Total records exported: ${employees.length}`);
    console.log(`File size: ${(csvContent.length / 1024).toFixed(2)} KB`);
    
  } catch (error) {
    console.error("Error during employee data export:", error);
  }
}

// Run the export
exportEmployeeData().catch(console.error);