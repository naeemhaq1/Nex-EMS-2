import { db } from "./db";
import { employeeRecords } from "@shared/schema";
import { eq } from "drizzle-orm";
import XLSX from "xlsx";

// Normalize CNIC by removing dashes and spaces
function normalizeCNIC(cnic: string): string {
  if (!cnic) return '';
  return cnic.toString().replace(/[-\s]/g, '');
}

async function populateMissingCnicOnly() {
  console.log("🚀 Populating missing CNIC/National IDs from salary sheet...\n");
  
  try {
    // Read the Excel file
    const workbook = XLSX.readFile('attached_assets/Salary Sheet (APR 2025)-2_1752300472636.xls');
    
    // Get all employees missing CNIC
    const employeesWithoutCnic = await db
      .select()
      .from(employeeRecords)
      .where(eq(employeeRecords.isActive, true));
    
    const missingCnicEmployees = employeesWithoutCnic.filter(emp => !emp.nationalId);
    console.log(`Found ${missingCnicEmployees.length} employees without CNIC`);
    console.log(`Total active employees: ${employeesWithoutCnic.length}`);
    
    // Process the main sheets with employee data
    const sheetsToProcess = ['Meezan TRF', 'OTHER-TRF', 'Cash Lahore', 'FAISALABAD', 'PESHAWAR', 'ISLAMABAD', 'Karachi', 'GUJRANWALA', 'SAFE CITY LHR O&M', 'SAFE CITY LHR FIBER', 'TELENEX-LHR'];
    
    const cnicMapping = new Map(); // Map employee names to CNICs
    let totalRecordsProcessed = 0;
    
    for (const sheetName of sheetsToProcess) {
      if (!workbook.SheetNames.includes(sheetName)) continue;
      
      console.log(`Processing ${sheetName}...`);
      const worksheet = workbook.Sheets[sheetName];
      const sheetData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,
        defval: '',
        raw: false 
      });
      
      // Find the header row with NAME and CNIC columns
      let headerRow = -1;
      let nameCol = -1;
      let cnicCol = -1;
      let designationCol = -1;
      
      for (let i = 0; i < Math.min(10, sheetData.length); i++) {
        const row = sheetData[i] as any[];
        if (row && row.length > 3) {
          const rowText = row.join(' ').toLowerCase();
          if (rowText.includes('name') && rowText.includes('cnic')) {
            headerRow = i;
            const headers = row;
            
            headers.forEach((header, index) => {
              if (header) {
                const h = header.toString().toLowerCase();
                if (h.includes('name') && !h.includes('designation')) {
                  nameCol = index;
                } else if (h.includes('cnic')) {
                  cnicCol = index;
                } else if (h.includes('designation')) {
                  designationCol = index;
                }
              }
            });
            break;
          }
        }
      }
      
      if (headerRow === -1 || nameCol === -1 || cnicCol === -1) {
        console.log(`  ❌ Could not find header structure in ${sheetName}`);
        continue;
      }
      
      // Extract employee data
      let sheetRecords = 0;
      for (let i = headerRow + 1; i < sheetData.length; i++) {
        const row = sheetData[i] as any[];
        if (!row || row.length <= Math.max(nameCol, cnicCol)) continue;
        
        const name = row[nameCol] ? row[nameCol].toString().trim() : '';
        const cnic = row[cnicCol] ? row[cnicCol].toString().trim() : '';
        const designation = designationCol >= 0 && row[designationCol] ? row[designationCol].toString().trim() : '';
        
        if (name && cnic) {
          const normalizedCnic = normalizeCNIC(cnic);
          if (normalizedCnic && normalizedCnic.length === 13) {
            // Store multiple variations of the name for better matching
            const cleanName = name.toLowerCase().trim();
            cnicMapping.set(cleanName, { cnic: normalizedCnic, designation, sheet: sheetName });
            
            // Also store without middle names
            const nameWords = cleanName.split(' ').filter(w => w.length > 1);
            if (nameWords.length >= 2) {
              const shortName = `${nameWords[0]} ${nameWords[nameWords.length - 1]}`;
              if (!cnicMapping.has(shortName)) {
                cnicMapping.set(shortName, { cnic: normalizedCnic, designation, sheet: sheetName });
              }
            }
            
            sheetRecords++;
          }
        }
      }
      
      console.log(`  ✅ Found ${sheetRecords} records in ${sheetName}`);
      totalRecordsProcessed += sheetRecords;
    }
    
    console.log(`\n📊 Total records processed: ${totalRecordsProcessed}`);
    console.log(`📋 Unique name-CNIC mappings: ${cnicMapping.size}`);
    
    // Now match employees without CNIC to salary sheet data
    const matches = [];
    
    for (const employee of missingCnicEmployees) {
      const fullName = `${employee.firstName} ${employee.middleName || ''} ${employee.lastName}`.trim().toLowerCase();
      const firstName = employee.firstName.toLowerCase();
      const lastName = employee.lastName.toLowerCase();
      
      // Try exact match first
      let match = cnicMapping.get(fullName);
      
      // Try first + last name
      if (!match) {
        match = cnicMapping.get(`${firstName} ${lastName}`);
      }
      
      // Try variations with middle name
      if (!match && employee.middleName) {
        const middleName = employee.middleName.toLowerCase();
        match = cnicMapping.get(`${firstName} ${middleName} ${lastName}`);
      }
      
      // Try partial matching
      if (!match) {
        for (const [sheetName, data] of cnicMapping) {
          const sheetWords = sheetName.split(' ');
          const empWords = fullName.split(' ');
          
          // Check if first and last names match
          if (sheetWords.includes(firstName) && sheetWords.includes(lastName)) {
            match = data;
            break;
          }
        }
      }
      
      if (match) {
        matches.push({
          employee,
          cnic: match.cnic,
          designation: match.designation,
          sheet: match.sheet
        });
      }
    }
    
    console.log(`\n🎯 Found ${matches.length} potential CNIC matches`);
    
    // Show matches for review
    console.log(`\n📋 CNIC MATCHES FOR REVIEW:`);
    matches.forEach((match, index) => {
      console.log(`${index + 1}. ${match.employee.employeeCode}: ${match.employee.firstName} ${match.employee.middleName || ''} ${match.employee.lastName}`.trim());
      console.log(`   Department: ${match.employee.department}`);
      console.log(`   Adding CNIC: ${match.cnic}`);
      console.log(`   Source: ${match.sheet}`);
      if (match.designation && !match.employee.designation) {
        console.log(`   Also adding designation: ${match.designation}`);
      }
      console.log('');
    });
    
    // Perform the updates
    console.log(`\n🔄 PERFORMING UPDATES...`);
    let successCount = 0;
    let errorCount = 0;
    
    for (const match of matches) {
      try {
        const updateData: any = { nationalId: match.cnic };
        
        // Also update designation if employee doesn't have one
        if (!match.employee.designation && match.designation) {
          updateData.designation = match.designation;
        }
        
        await db
          .update(employeeRecords)
          .set(updateData)
          .where(eq(employeeRecords.id, match.employee.id));
        
        successCount++;
        console.log(`✅ Updated ${match.employee.employeeCode}: Added CNIC ${match.cnic}`);
        
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
    
    console.log(`\n📊 FINAL STATUS:`);
    console.log(`👥 Total active employees: ${updatedEmployees.length}`);
    console.log(`🆔 Employees with CNIC: ${withCnic} (${((withCnic / updatedEmployees.length) * 100).toFixed(1)}%)`);
    console.log(`❌ Employees without CNIC: ${withoutCnic} (${((withoutCnic / updatedEmployees.length) * 100).toFixed(1)}%)`);
    console.log(`🏷️ Employees with designation: ${withDesignation} (${((withDesignation / updatedEmployees.length) * 100).toFixed(1)}%)`);
    
    if (withoutCnic > 0) {
      console.log(`\n📋 Employees still missing CNIC:`);
      updatedEmployees.filter(emp => !emp.nationalId).forEach(emp => {
        console.log(`  - ${emp.employeeCode}: ${emp.firstName} ${emp.middleName || ''} ${emp.lastName}`.trim());
      });
    }
    
  } catch (error) {
    console.error("❌ Error populating CNIC from salary sheet:", error);
  }
}

populateMissingCnicOnly().catch(console.error);