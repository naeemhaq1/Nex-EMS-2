import { db } from "./db";
import { employeeRecords, shifts } from "@shared/schema";
import { eq, and, isNull } from "drizzle-orm";
import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";
import { join } from "path";

async function assignShiftsFromCSV() {
  console.log("Starting shift assignment from CSV...");
  
  try {
    // Read the CSV file
    const csvPath = join(process.cwd(), "attached_assets", "PSCA-Shifts-wodrv_1752033113555.csv");
    const csvContent = readFileSync(csvPath, "utf-8");
    
    // Parse CSV
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      relax_quotes: true,
      trim: true,
      bom: true
    });
    
    console.log(`Found ${records.length} records in CSV`);
    
    // Get all shifts from database
    const existingShifts = await db.select().from(shifts);
    const shiftMap = new Map(existingShifts.map(s => [s.shiftName, s.id]));
    
    let assignedCount = 0;
    let updatedDesignations = 0;
    let notFoundCount = 0;
    let skippedCount = 0;
    
    for (const record of records) {
      // Skip empty rows
      if (!record['Name of  Employees'] || !record['CNIC']) {
        continue;
      }
      
      const employeeName = record['Name of  Employees'].trim();
      const designation = record['Designation']?.trim();
      const department = record['Deaprtment']?.trim(); // Note: CSV has typo
      const cnic = record['CNIC']?.trim();
      const shiftName = record['SHIFT NAME']?.trim();
      
      // Normalize CNIC by removing dashes and spaces
      const normalizedCnic = cnic.replace(/[-\s]/g, '');
      
      console.log(`\nProcessing: ${employeeName} (CNIC: ${cnic})`);
      
      // Find employee by normalized CNIC
      // First get all employees, then filter in JavaScript
      const allEmployees = await db.select()
        .from(employeeRecords)
        .where(eq(employeeRecords.isActive, true));
      
      const employees = allEmployees.filter(emp => {
        if (!emp.nationalId) return false;
        const empCnicNormalized = emp.nationalId.replace(/[-\s]/g, '');
        return empCnicNormalized === normalizedCnic;
      });
      
      if (employees.length === 0) {
        console.log(`  ❌ Employee not found with CNIC: ${cnic}`);
        notFoundCount++;
        continue;
      }
      
      const employee = employees[0];
      console.log(`  ✓ Found employee: ${employee.firstName} ${employee.lastName} (ID: ${employee.id})`);
      
      // Check if shift exists and is valid
      if (shiftName && shiftName !== 'None') {
        const shiftId = shiftMap.get(shiftName);
        
        if (!shiftId) {
          console.log(`  ⚠️ Shift not found: ${shiftName}`);
          skippedCount++;
        } else {
          // Update employee with shift assignment and designation
          const updateData: any = { shiftId };
          
          // Add designation if it exists and employee doesn't have one
          if (designation && (!employee.designation || employee.designation === '')) {
            updateData.designation = designation;
            updatedDesignations++;
            console.log(`  ✓ Adding designation: ${designation}`);
          }
          
          await db.update(employeeRecords)
            .set(updateData)
            .where(eq(employeeRecords.id, employee.id));
          
          console.log(`  ✓ Assigned shift: ${shiftName}`);
          assignedCount++;
        }
      } else {
        console.log(`  ⚠️ No shift specified or shift is 'None'`);
        skippedCount++;
        
        // Still update designation if missing
        if (designation && (!employee.designation || employee.designation === '')) {
          await db.update(employeeRecords)
            .set({ designation })
            .where(eq(employeeRecords.id, employee.id));
          
          updatedDesignations++;
          console.log(`  ✓ Added designation: ${designation}`);
        }
      }
    }
    
    console.log("\n========================================");
    console.log("Shift Assignment Summary:");
    console.log(`✓ Shifts assigned: ${assignedCount}`);
    console.log(`✓ Designations updated: ${updatedDesignations}`);
    console.log(`⚠️ Employees not found: ${notFoundCount}`);
    console.log(`⚠️ Skipped (no shift/invalid): ${skippedCount}`);
    console.log("========================================");
    
    // Show employees still without shifts
    const employeesWithoutShifts = await db.select({
      id: employeeRecords.id,
      name: employeeRecords.name,
      employeeCode: employeeRecords.employeeCode,
      department: employeeRecords.department,
      designation: employeeRecords.designation
    })
    .from(employeeRecords)
    .where(
      and(
        isNull(employeeRecords.shiftId),
        eq(employeeRecords.isActive, true)
      )
    );
    
    console.log(`\nEmployees still without shifts: ${employeesWithoutShifts.length}`);
    if (employeesWithoutShifts.length > 0 && employeesWithoutShifts.length < 20) {
      console.log("\nList of employees without shifts:");
      for (const emp of employeesWithoutShifts) {
        console.log(`  - ${emp.name} (${emp.employeeCode}) - ${emp.department || 'No dept'}`);
      }
    }
    
  } catch (error) {
    console.error("Error assigning shifts:", error);
  }
  
  process.exit(0);
}

assignShiftsFromCSV();