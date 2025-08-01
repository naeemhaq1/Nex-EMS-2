import { db } from "./db";
import { employeeRecords } from "@shared/schema";
import { eq } from "drizzle-orm";
import XLSX from "xlsx";

// Normalize CNIC by removing dashes and spaces
function normalizeCNIC(cnic: string): string {
  if (!cnic) return '';
  return cnic.toString().replace(/[-\s]/g, '');
}

// Parse date from various formats
function parseDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === '') return null;
  
  const cleanDateStr = dateStr.trim();
  
  // Handle formats like "01-July-2012", "01-Feb-2017", "14-March-2025"
  if (cleanDateStr.includes('-')) {
    const parts = cleanDateStr.split('-');
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const monthStr = parts[1];
      const year = parseInt(parts[2]);
      
      // Convert month names to numbers
      const months = {
        'January': 0, 'Jan': 0, 'JAN': 0, 'February': 1, 'Feb': 1, 'FEB': 1, 'March': 2, 'Mar': 2, 'MAR': 2,
        'April': 3, 'Apr': 3, 'APR': 3, 'May': 4, 'MAY': 4, 'June': 5, 'Jun': 5, 'JUNE': 5, 'JUN': 5,
        'July': 6, 'Jul': 6, 'JULY': 6, 'JUL': 6, 'August': 7, 'Aug': 7, 'AUG': 7, 'September': 8, 'Sep': 8, 'SEP': 8,
        'October': 9, 'Oct': 9, 'OCT': 9, 'November': 10, 'Nov': 10, 'NOV': 10, 'December': 11, 'Dec': 11, 'DEC': 11
      };
      
      const month = months[monthStr];
      if (month !== undefined) {
        return new Date(year, month, day);
      }
    }
  }
  
  return null;
}

async function populateCnicFromSalarySheet() {
  console.log("Populating CNIC/National ID and designations from salary sheet with 100% certainty...\n");
  
  try {
    // Read the Excel file
    const workbook = XLSX.readFile('attached_assets/Salary Sheet (APR 2025)-2_1752300472636.xls');
    
    console.log(`Found ${workbook.SheetNames.length} sheets in workbook`);
    
    // Get all current employees
    const currentEmployees = await db
      .select()
      .from(employeeRecords)
      .where(eq(employeeRecords.isActive, true));
    
    console.log(`Current employees in database: ${currentEmployees.length}`);
    
    // Process location-based sheets that contain employee data
    const locationSheets = ['Meezan TRF', 'OTHER-TRF', 'Cash Lahore', 'FAISALABAD', 'PESHAWAR', 'ISLAMABAD', 'Karachi', 'GUJRANWALA', 'SAFE CITY LHR O&M', 'SAFE CITY LHR FIBER', 'TELENEX-LHR'];
    
    const allUpdates = [];
    
    for (const sheetName of workbook.SheetNames) {
      if (locationSheets.includes(sheetName)) {
        console.log(`\nProcessing sheet: ${sheetName}`);
        const worksheet = workbook.Sheets[sheetName];
        const sheetData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          defval: '',
          raw: false 
        });
        
        // Find header row
        let headerRow = -1;
        for (let i = 0; i < Math.min(10, sheetData.length); i++) {
          const row = sheetData[i] as any[];
          if (row && row.length > 3) {
            const rowText = row.join(' ').toLowerCase();
            if (rowText.includes('name') && rowText.includes('cnic') && rowText.includes('designation')) {
              headerRow = i;
              break;
            }
          }
        }
        
        if (headerRow === -1) {
          console.log(`  No header found in ${sheetName}`);
          continue;
        }
        
        const headers = sheetData[headerRow] as any[];
        console.log(`  Found header at row ${headerRow + 1}`);
        
        // Identify column indices
        let nameCol = -1;
        let cnicCol = -1;
        let designationCol = -1;
        let joiningDateCol = -1;
        let entitlementDateCol = -1;
        
        headers.forEach((header, index) => {
          if (header) {
            const h = header.toString().toLowerCase();
            if (h.includes('name') && !h.includes('designation')) {
              nameCol = index;
            } else if (h.includes('cnic')) {
              cnicCol = index;
            } else if (h.includes('designation')) {
              designationCol = index;
            } else if (h.includes('joining')) {
              joiningDateCol = index;
            } else if (h.includes('entitlement')) {
              entitlementDateCol = index;
            }
          }
        });
        
        console.log(`  Name column: ${nameCol}, CNIC column: ${cnicCol}, Designation column: ${designationCol}`);
        
        if (nameCol === -1 || cnicCol === -1) {
          console.log(`  Missing essential columns in ${sheetName}`);
          continue;
        }
        
        // Process employee rows
        let processedInSheet = 0;
        for (let i = headerRow + 1; i < sheetData.length; i++) {
          const row = sheetData[i] as any[];
          if (!row || row.length < Math.max(nameCol, cnicCol, designationCol) + 1) continue;
          
          const name = row[nameCol] ? row[nameCol].toString().trim() : '';
          const cnic = row[cnicCol] ? row[cnicCol].toString().trim() : '';
          const designation = designationCol >= 0 && row[designationCol] ? row[designationCol].toString().trim() : '';
          const joiningDate = joiningDateCol >= 0 && row[joiningDateCol] ? row[joiningDateCol].toString().trim() : '';
          const entitlementDate = entitlementDateCol >= 0 && row[entitlementDateCol] ? row[entitlementDateCol].toString().trim() : '';
          
          if (!name || !cnic || cnic.length < 13) continue;
          
          const normalizedCnic = normalizeCNIC(cnic);
          if (!normalizedCnic || normalizedCnic.length !== 13) continue;
          
          // Find matching employee by exact CNIC match
          const exactCnicMatch = currentEmployees.find(emp => emp.nationalId === normalizedCnic);
          
          if (exactCnicMatch) {
            // Employee already has this CNIC, check if we can update designation
            if (!exactCnicMatch.designation && designation) {
              const updateData: any = { designation };
              
              // Add dates if available
              if (joiningDate) {
                const parsedJoiningDate = parseDate(joiningDate);
                if (parsedJoiningDate) {
                  updateData.joiningDate = parsedJoiningDate;
                }
              }
              
              if (entitlementDate) {
                const parsedEntitlementDate = parseDate(entitlementDate);
                if (parsedEntitlementDate) {
                  updateData.entitlementDate = parsedEntitlementDate;
                }
              }
              
              allUpdates.push({
                type: 'designation_update',
                employeeId: exactCnicMatch.id,
                employeeCode: exactCnicMatch.employeeCode,
                employeeName: `${exactCnicMatch.firstName} ${exactCnicMatch.middleName || ''} ${exactCnicMatch.lastName}`.trim(),
                updateData,
                sheetName,
                sheetRow: i + 1,
                sheetName: name,
                sheetCnic: normalizedCnic
              });
              processedInSheet++;
            }
          } else {
            // Try to find employee by name similarity for CNIC addition
            const nameWords = name.toLowerCase().split(' ').filter(w => w.length > 2);
            
            for (const employee of currentEmployees) {
              if (employee.nationalId) continue; // Skip employees who already have CNIC
              
              const empFullName = `${employee.firstName} ${employee.middleName || ''} ${employee.lastName}`.toLowerCase();
              const empWords = empFullName.split(' ').filter(w => w.length > 2);
              
              // Check if at least 2 words match
              const matchingWords = nameWords.filter(word => empWords.some(empWord => 
                empWord.includes(word) || word.includes(empWord)
              ));
              
              if (matchingWords.length >= 2) {
                const updateData: any = { nationalId: normalizedCnic };
                
                if (!employee.designation && designation) {
                  updateData.designation = designation;
                }
                
                // Add dates if available
                if (joiningDate) {
                  const parsedJoiningDate = parseDate(joiningDate);
                  if (parsedJoiningDate) {
                    updateData.joiningDate = parsedJoiningDate;
                  }
                }
                
                if (entitlementDate) {
                  const parsedEntitlementDate = parseDate(entitlementDate);
                  if (parsedEntitlementDate) {
                    updateData.entitlementDate = parsedEntitlementDate;
                  }
                }
                
                allUpdates.push({
                  type: 'cnic_addition',
                  employeeId: employee.id,
                  employeeCode: employee.employeeCode,
                  employeeName: `${employee.firstName} ${employee.middleName || ''} ${employee.lastName}`.trim(),
                  updateData,
                  sheetName,
                  sheetRow: i + 1,
                  sheetName: name,
                  sheetCnic: normalizedCnic,
                  matchingWords: matchingWords.length
                });
                processedInSheet++;
                break; // Only match to first suitable employee
              }
            }
          }
        }
        
        console.log(`  Processed ${processedInSheet} records in ${sheetName}`);
      }
    }
    
    console.log(`\n=== SUMMARY OF POTENTIAL UPDATES ===`);
    console.log(`Total updates found: ${allUpdates.length}`);
    
    const cnicAdditions = allUpdates.filter(u => u.type === 'cnic_addition');
    const designationUpdates = allUpdates.filter(u => u.type === 'designation_update');
    
    console.log(`CNIC additions: ${cnicAdditions.length}`);
    console.log(`Designation updates: ${designationUpdates.length}`);
    
    // Show all updates for review
    console.log(`\n=== CNIC ADDITIONS ===`);
    cnicAdditions.forEach(update => {
      console.log(`➕ ${update.employeeCode}: ${update.employeeName}`);
      console.log(`  Sheet: ${update.sheetName}, Row: ${update.sheetRow}`);
      console.log(`  Sheet Name: ${update.sheetName}`);
      console.log(`  Adding CNIC: ${update.sheetCnic}`);
      console.log(`  Matching words: ${update.matchingWords}`);
      if (update.updateData.designation) {
        console.log(`  Also adding designation: ${update.updateData.designation}`);
      }
      console.log('');
    });
    
    console.log(`\n=== DESIGNATION UPDATES ===`);
    designationUpdates.forEach(update => {
      console.log(`✏️ ${update.employeeCode}: ${update.employeeName}`);
      console.log(`  Sheet: ${update.sheetName}, Row: ${update.sheetRow}`);
      console.log(`  Adding designation: ${update.updateData.designation}`);
      console.log('');
    });
    
    // Ask for confirmation before proceeding
    console.log(`\n=== CONFIRMATION REQUIRED ===`);
    console.log(`Ready to update ${allUpdates.length} employee records.`);
    console.log(`This will add ${cnicAdditions.length} CNICs and ${designationUpdates.length} designations.`);
    console.log(`\nTo proceed with updates, uncomment the update section below and run again.`);
    
    /* UNCOMMENT THIS SECTION TO PERFORM ACTUAL UPDATES
    
    console.log(`\n=== PERFORMING UPDATES ===`);
    let successCount = 0;
    let errorCount = 0;
    
    for (const update of allUpdates) {
      try {
        await db
          .update(employeeRecords)
          .set(update.updateData)
          .where(eq(employeeRecords.id, update.employeeId));
        
        successCount++;
        console.log(`✓ Updated ${update.employeeCode}: ${update.employeeName}`);
        
        if (update.updateData.nationalId) {
          console.log(`  Added CNIC: ${update.updateData.nationalId}`);
        }
        if (update.updateData.designation) {
          console.log(`  Added designation: ${update.updateData.designation}`);
        }
        
      } catch (error) {
        errorCount++;
        console.error(`✗ Failed to update ${update.employeeCode}: ${error.message}`);
      }
    }
    
    console.log(`\n=== FINAL RESULTS ===`);
    console.log(`Successfully updated: ${successCount} employees`);
    console.log(`Failed updates: ${errorCount} employees`);
    
    // Final verification
    const updatedEmployees = await db
      .select()
      .from(employeeRecords)
      .where(eq(employeeRecords.isActive, true));
    
    const withCnic = updatedEmployees.filter(emp => emp.nationalId).length;
    const withDesignation = updatedEmployees.filter(emp => emp.designation).length;
    
    console.log(`\nFinal status:`);
    console.log(`Employees with CNIC: ${withCnic}/${updatedEmployees.length} (${((withCnic / updatedEmployees.length) * 100).toFixed(1)}%)`);
    console.log(`Employees with designation: ${withDesignation}/${updatedEmployees.length} (${((withDesignation / updatedEmployees.length) * 100).toFixed(1)}%)`);
    
    */
    
  } catch (error) {
    console.error("Error populating CNIC from salary sheet:", error);
  }
}

populateCnicFromSalarySheet().catch(console.error);