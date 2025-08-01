import { db } from "./db";
import { employeeRecords } from "@shared/schema";
import { eq } from "drizzle-orm";
import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";

// Normalize CNIC by removing dashes and spaces
function normalizeCNIC(cnic: string): string {
  if (!cnic) return '';
  return cnic.toString().replace(/[-\s]/g, '');
}

// Normalize name for matching
function normalizeName(name: string): string {
  if (!name) return '';
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

// Parse date from various formats
function parseDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === '') return null;
  
  const cleanDateStr = dateStr.trim();
  
  // Handle formats like "1-Jul-12", "1-Feb-17", "15-Sep-24"
  if (cleanDateStr.includes('-')) {
    const parts = cleanDateStr.split('-');
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const monthStr = parts[1];
      let year = parseInt(parts[2]);
      
      // Handle 2-digit years
      if (year < 100) {
        year += year < 50 ? 2000 : 1900;
      }
      
      // Convert month names to numbers
      const months = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
      };
      
      const month = months[monthStr];
      if (month !== undefined) {
        return new Date(year, month, day);
      }
    }
  }
  
  return null;
}

async function populateCnicFromCSVs() {
  console.log("🚀 Populating CNIC/National IDs from CSV files...\n");
  
  try {
    // CSV files to process
    const csvFiles = [
      { path: 'attached_assets/Lahore Meezan TRF_1752301140871.csv', location: 'Lahore' },
      { path: 'attached_assets/ISLAMABAD_1752301140871.CSV', location: 'Islamabad' },
      { path: 'attached_assets/KARACHI_1752301140871.CSV', location: 'Karachi' },
      { path: 'attached_assets/OTHER-TRF_1752301140871.CSV', location: 'Lahore' },
      { path: 'attached_assets/PESHAWAR_1752301140871.CSV', location: 'Peshawar' },
      { path: 'attached_assets/SAFE CITY FSD_1752301446183.CSV', location: 'Faisalabad' },
      { path: 'attached_assets/SAFE CITY LHR FIBER_1752301140871.CSV', location: 'Lahore' },
      { path: 'attached_assets/TELENEX-LHR_1752301439094.CSV', location: 'Lahore' },
      { path: 'attached_assets/FAISALABAD_1752301140871.CSV', location: 'Faisalabad' },
      { path: 'attached_assets/GUJRANWALA_1752301140871.CSV', location: 'Gujranwala' }
    ];
    
    // Get all current employees
    const currentEmployees = await db
      .select()
      .from(employeeRecords)
      .where(eq(employeeRecords.isActive, true));
    
    console.log(`Current active employees: ${currentEmployees.length}`);
    
    const missingCnicEmployees = currentEmployees.filter(emp => !emp.nationalId);
    console.log(`Employees missing CNIC: ${missingCnicEmployees.length}`);
    
    // Process all CSV files and collect employee data
    const allCSVData = [];
    
    for (const csvFile of csvFiles) {
      try {
        console.log(`Processing ${csvFile.path}...`);
        
        const csvContent = readFileSync(csvFile.path, 'utf-8');
        const records = parse(csvContent, {
          columns: false,
          skip_empty_lines: true,
          trim: true
        });
        
        // Find header row
        let headerRow = -1;
        let nameCol = -1;
        let cnicCol = -1;
        let designationCol = -1;
        let joiningCol = -1;
        let entitlementCol = -1;
        
        for (let i = 0; i < Math.min(10, records.length); i++) {
          const row = records[i];
          if (row && row.length > 3) {
            const rowText = row.join(' ').toLowerCase();
            if (rowText.includes('name') && rowText.includes('cnic')) {
              headerRow = i;
              
              // Find column indices
              row.forEach((header, index) => {
                if (header) {
                  const h = header.toLowerCase();
                  if (h.includes('name') && !h.includes('designation') && nameCol === -1) {
                    nameCol = index;
                  } else if (h.includes('cnic')) {
                    cnicCol = index;
                  } else if (h.includes('designation')) {
                    designationCol = index;
                  } else if (h.includes('joining')) {
                    joiningCol = index;
                  } else if (h.includes('entitlement')) {
                    entitlementCol = index;
                  }
                }
              });
              break;
            }
          }
        }
        
        if (headerRow === -1 || nameCol === -1 || cnicCol === -1) {
          console.log(`  ❌ Could not find proper header structure`);
          continue;
        }
        
        console.log(`  ✅ Found header at row ${headerRow + 1}, Name: col ${nameCol + 1}, CNIC: col ${cnicCol + 1}`);
        
        // Process employee data
        let processedCount = 0;
        for (let i = headerRow + 1; i < records.length; i++) {
          const row = records[i];
          if (!row || row.length <= Math.max(nameCol, cnicCol)) continue;
          
          const name = row[nameCol] ? row[nameCol].toString().trim() : '';
          const cnic = row[cnicCol] ? row[cnicCol].toString().trim() : '';
          const designation = designationCol >= 0 && row[designationCol] ? row[designationCol].toString().trim() : '';
          const joiningDate = joiningCol >= 0 && row[joiningCol] ? row[joiningCol].toString().trim() : '';
          const entitlementDate = entitlementCol >= 0 && row[entitlementCol] ? row[entitlementCol].toString().trim() : '';
          
          if (name && cnic && cnic.length >= 13) {
            const normalizedCnic = normalizeCNIC(cnic);
            if (normalizedCnic && normalizedCnic.length === 13) {
              allCSVData.push({
                name: normalizeName(name),
                originalName: name,
                cnic: normalizedCnic,
                designation,
                joiningDate,
                entitlementDate,
                location: csvFile.location,
                source: csvFile.path
              });
              processedCount++;
            }
          }
        }
        
        console.log(`  📊 Processed ${processedCount} employee records`);
        
      } catch (error) {
        console.log(`  ❌ Error processing ${csvFile.path}: ${error.message}`);
      }
    }
    
    console.log(`\n📊 Total CSV records processed: ${allCSVData.length}`);
    
    // Match employees to CSV data
    const matches = [];
    
    for (const employee of missingCnicEmployees) {
      const empFullName = `${employee.firstName} ${employee.middleName || ''} ${employee.lastName}`.trim();
      const empNormalizedName = normalizeName(empFullName);
      
      // Try exact name match first
      let csvMatch = allCSVData.find(csv => csv.name === empNormalizedName);
      
      // Try partial matching
      if (!csvMatch) {
        const empWords = empNormalizedName.split(' ').filter(w => w.length > 2);
        
        for (const csvData of allCSVData) {
          const csvWords = csvData.name.split(' ').filter(w => w.length > 2);
          
          // Check if at least 2 significant words match
          const matchingWords = empWords.filter(empWord => 
            csvWords.some(csvWord => 
              csvWord.includes(empWord) || empWord.includes(csvWord)
            )
          );
          
          if (matchingWords.length >= 2) {
            csvMatch = csvData;
            break;
          }
        }
      }
      
      if (csvMatch) {
        matches.push({
          employee,
          csvData: csvMatch
        });
      }
    }
    
    console.log(`\n🎯 Found ${matches.length} potential matches`);
    
    // Show matches for review
    console.log(`\n📋 MATCHES FOR REVIEW:`);
    matches.forEach((match, index) => {
      console.log(`${index + 1}. ${match.employee.employeeCode}: ${match.employee.firstName} ${match.employee.middleName || ''} ${match.employee.lastName}`.trim());
      console.log(`   Department: ${match.employee.department}`);
      console.log(`   CSV Name: ${match.csvData.originalName}`);
      console.log(`   Adding CNIC: ${match.csvData.cnic}`);
      console.log(`   Location: ${match.csvData.location}`);
      if (match.csvData.designation && !match.employee.designation) {
        console.log(`   Also adding designation: ${match.csvData.designation}`);
      }
      if (match.csvData.joiningDate) {
        console.log(`   Joining date: ${match.csvData.joiningDate}`);
      }
      console.log('');
    });
    
    // Perform updates
    console.log(`\n🔄 PERFORMING UPDATES...`);
    let successCount = 0;
    let errorCount = 0;
    
    for (const match of matches) {
      try {
        const updateData: any = { nationalId: match.csvData.cnic };
        
        // Add designation if employee doesn't have one
        if (!match.employee.designation && match.csvData.designation) {
          updateData.designation = match.csvData.designation;
        }
        
        // Add joining date if available and employee doesn't have one
        if (!match.employee.joiningDate && match.csvData.joiningDate) {
          const parsedJoiningDate = parseDate(match.csvData.joiningDate);
          if (parsedJoiningDate) {
            updateData.joiningDate = parsedJoiningDate;
          }
        }
        
        // Add entitlement date if available and employee doesn't have one
        if (!match.employee.entitlementDate && match.csvData.entitlementDate) {
          const parsedEntitlementDate = parseDate(match.csvData.entitlementDate);
          if (parsedEntitlementDate) {
            updateData.entitlementDate = parsedEntitlementDate;
          }
        }
        
        await db
          .update(employeeRecords)
          .set(updateData)
          .where(eq(employeeRecords.id, match.employee.id));
        
        successCount++;
        console.log(`✅ Updated ${match.employee.employeeCode}: Added CNIC ${match.csvData.cnic}`);
        
        if (updateData.designation) {
          console.log(`   Added designation: ${updateData.designation}`);
        }
        if (updateData.joiningDate) {
          console.log(`   Added joining date: ${updateData.joiningDate.toDateString()}`);
        }
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Failed to update ${match.employee.employeeCode}: ${error.message}`);
      }
    }
    
    console.log(`\n🎉 FINAL RESULTS:`);
    console.log(`✅ Successfully updated: ${successCount} employees`);
    console.log(`❌ Failed updates: ${errorCount} employees`);
    
    // Final verification
    const updatedEmployees = await db
      .select()
      .from(employeeRecords)
      .where(eq(employeeRecords.isActive, true));
    
    const withCnic = updatedEmployees.filter(emp => emp.nationalId).length;
    const withDesignation = updatedEmployees.filter(emp => emp.designation).length;
    const withoutCnic = updatedEmployees.filter(emp => !emp.nationalId).length;
    
    console.log(`\n📊 UPDATED STATUS:`);
    console.log(`👥 Total active employees: ${updatedEmployees.length}`);
    console.log(`🆔 Employees with CNIC: ${withCnic} (${((withCnic / updatedEmployees.length) * 100).toFixed(1)}%)`);
    console.log(`❌ Employees without CNIC: ${withoutCnic} (${((withoutCnic / updatedEmployees.length) * 100).toFixed(1)}%)`);
    console.log(`🏷️ Employees with designation: ${withDesignation} (${((withDesignation / updatedEmployees.length) * 100).toFixed(1)}%)`);
    
    if (withoutCnic > 0) {
      console.log(`\n📋 Employees still missing CNIC:`);
      const stillMissing = updatedEmployees.filter(emp => !emp.nationalId);
      stillMissing.forEach(emp => {
        console.log(`  - ${emp.employeeCode}: ${emp.firstName} ${emp.middleName || ''} ${emp.lastName}`.trim());
      });
    }
    
    console.log(`\n✨ CNIC population completed successfully!`);
    
  } catch (error) {
    console.error("❌ Error populating CNIC from CSV files:", error);
  }
}

populateCnicFromCSVs().catch(console.error);