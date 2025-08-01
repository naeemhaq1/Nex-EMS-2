import fs from 'fs';
import path from 'path';
import { db } from './db.js';
import { employeeRecords } from '../shared/schema.js';
import { eq, sql } from 'drizzle-orm';

interface EmployeeData {
  name: string;
  designation: string;
  team: string;
  cnic: string;
  joiningDate: string;
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === '') return null;
  
  // Handle format: "01-JUNE-2024"
  const monthMap: { [key: string]: number } = {
    'JAN': 0, 'JANUARY': 0,
    'FEB': 1, 'FEBRUARY': 1,
    'MAR': 2, 'MARCH': 2,
    'APR': 3, 'APRIL': 3,
    'MAY': 4, 'MAY': 4,
    'JUN': 5, 'JUNE': 5,
    'JUL': 6, 'JULY': 6,
    'AUG': 7, 'AUGUST': 7,
    'SEP': 8, 'SEPTEMBER': 8,
    'OCT': 9, 'OCTOBER': 9,
    'NOV': 10, 'NOVEMBER': 10,
    'DEC': 11, 'DECEMBER': 11
  };
  
  // Parse DD-MONTH-YYYY format
  const match = dateStr.match(/^(\d{1,2})-([A-Z]+)-(\d{4})$/);
  if (match) {
    const day = parseInt(match[1], 10);
    const monthName = match[2];
    const year = parseInt(match[3], 10);
    
    if (monthMap.hasOwnProperty(monthName)) {
      return new Date(year, monthMap[monthName], day);
    }
  }
  
  return null;
}

function normalizeCnic(cnic: string): string {
  // Remove all dashes and spaces
  return cnic.replace(/[-\s]/g, '');
}

async function updateEmployeeTeamData() {
  try {
    // Read CSV file
    const csvPath = path.join(process.cwd(), '..', 'attached_assets', 'PSCA Employee-short_1752006069752.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    
    // Parse CSV
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    console.log('Headers:', headers);
    
    let totalEmployees = 0;
    let updatedCount = 0;
    let notFoundCount = 0;
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = line.split(',').map(v => v.trim());
      
      // Skip if this is the "Total" row
      if (values[0] === '' && values[1] === '' && values[2] === '' && values[3] === 'Total') {
        continue;
      }
      
      const employeeName = values[0];
      const designation = values[1];
      const team = values[2];
      const cnic = values[3];
      const joiningDateStr = values[4];
      
      if (!employeeName || !cnic) {
        console.log(`Skipping row ${i}: Missing name or CNIC`);
        continue;
      }
      
      totalEmployees++;
      
      const normalizedCnic = normalizeCnic(cnic);
      const joiningDate = parseDate(joiningDateStr);
      
      console.log(`Processing: ${employeeName} - CNIC: ${cnic} (normalized: ${normalizedCnic})`);
      
      // Try to find employee by normalized CNIC
      const existingEmployee = await db.select()
        .from(employeeRecords)
        .where(sql`REPLACE(REPLACE(${employeeRecords.nationalId}, '-', ''), ' ', '') = ${normalizedCnic}`)
        .limit(1);
      
      if (existingEmployee.length > 0) {
        // Update employee record
        await db.update(employeeRecords)
          .set({
            designation,
            workTeam: team,
            joiningDate: joiningDate,
            updatedAt: new Date()
          })
          .where(eq(employeeRecords.id, existingEmployee[0].id));
        
        console.log(`✓ Updated: ${employeeName} (ID: ${existingEmployee[0].id})`);
        updatedCount++;
      } else {
        console.log(`✗ Not found: ${employeeName} - CNIC: ${normalizedCnic}`);
        notFoundCount++;
      }
    }
    
    console.log('\n=== Update Summary ===');
    console.log(`Total employees in CSV: ${totalEmployees}`);
    console.log(`Successfully updated: ${updatedCount}`);
    console.log(`Not found: ${notFoundCount}`);
    
  } catch (error) {
    console.error('Error updating employee team data:', error);
  } finally {
    process.exit(0);
  }
}

// Run the update
updateEmployeeTeamData();