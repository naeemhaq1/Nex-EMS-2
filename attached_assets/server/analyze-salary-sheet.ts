import { db } from "./db";
import { employeeRecords } from "@shared/schema";
import { eq } from "drizzle-orm";
import XLSX from "xlsx";

// Normalize CNIC by removing dashes and spaces
function normalizeCNIC(cnic: string): string {
  if (!cnic) return '';
  return cnic.toString().replace(/[-\s]/g, '');
}

async function analyzeSalarySheet() {
  console.log("Analyzing salary sheet for CNIC/National ID matching and designation population...\n");
  
  try {
    // Read the Excel file
    const workbook = XLSX.readFile('attached_assets/Salary Sheet (APR 2025)-2_1752300472636.xls');
    
    console.log(`Found ${workbook.SheetNames.length} sheets in workbook:`);
    workbook.SheetNames.forEach((name, index) => {
      console.log(`  Sheet ${index + 1}: ${name}`);
    });
    
    // Process all location-based sheets that likely contain employee data
    const locationSheets = ['FAISALABAD', 'PESHAWAR', 'ISLAMABAD', 'Karachi', 'GUJRANWALA', 'SAFE CITY LHR O&M', 'SAFE CITY LHR FIBER', 'TELENEX-LHR', 'Meezan TRF', 'OTHER-TRF', 'Cash Lahore'];
    
    const allEmployeeData = [];
    
    for (const sheetName of workbook.SheetNames) {
      if (locationSheets.includes(sheetName) || sheetName.includes('TRF') || sheetName.includes('Cash')) {
        console.log(`\nProcessing sheet: ${sheetName}`);
        const worksheet = workbook.Sheets[sheetName];
        const sheetData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          defval: '',
          raw: false 
        });
        
        console.log(`Found ${sheetData.length} rows in ${sheetName}`);
        
        // Show first few rows to understand structure
        console.log(`First 5 rows of ${sheetName}:`);
        for (let i = 0; i < Math.min(5, sheetData.length); i++) {
          const row = sheetData[i] as any[];
          if (row && row.length > 0) {
            console.log(`  Row ${i + 1}: [${row.map(cell => cell || 'empty').slice(0, 8).join(', ')}]`);
          }
        }
        
        // Try to find employee data in this sheet
        let foundEmployeeData = false;
        for (let i = 0; i < Math.min(20, sheetData.length); i++) {
          const row = sheetData[i] as any[];
          if (row && row.length > 5) {
            const rowText = row.join(' ').toLowerCase();
            if (rowText.includes('emp') || rowText.includes('name') || rowText.includes('cnic') || rowText.includes('designation')) {
              console.log(`  Found potential employee data at row ${i + 1} in ${sheetName}`);
              foundEmployeeData = true;
              
              // Extract employee records from this sheet
              for (let j = i + 1; j < sheetData.length; j++) {
                const empRow = sheetData[j] as any[];
                if (empRow && empRow.length > 3) {
                  // Check if this looks like an employee record
                  const hasEmployeeCode = empRow.some(cell => cell && cell.toString().match(/^\d{8}$/));
                  const hasCNIC = empRow.some(cell => cell && cell.toString().match(/^\d{5}-?\d{7}-?\d$/));
                  const hasName = empRow.some(cell => cell && cell.toString().length > 3 && /[a-zA-Z]/.test(cell.toString()));
                  
                  if (hasEmployeeCode || hasCNIC || hasName) {
                    allEmployeeData.push({
                      sheet: sheetName,
                      row: j + 1,
                      data: empRow
                    });
                  }
                }
              }
              break;
            }
          }
        }
        
        if (!foundEmployeeData) {
          console.log(`  No employee data found in ${sheetName}`);
        }
      }
    }
    
    console.log(`\nTotal employee records found across all sheets: ${allEmployeeData.length}`);
    
    if (allEmployeeData.length === 0) {
      console.log("No employee data found in any sheet");
      return;
    }
    
    // Show sample employee data
    console.log(`\nSample employee records:`);
    allEmployeeData.slice(0, 10).forEach((record, index) => {
      console.log(`${index + 1}. Sheet: ${record.sheet}, Row: ${record.row}`);
      console.log(`   Data: [${record.data.slice(0, 6).map(cell => cell || 'empty').join(', ')}]`);
    });
    
    // Now analyze the employee data for CNIC matching
    console.log(`\n=== ANALYZING EMPLOYEE DATA FOR CNIC MATCHING ===`);
    
    const currentEmployees = await db
      .select()
      .from(employeeRecords)
      .where(eq(employeeRecords.isActive, true));
    
    console.log(`Current employees in database: ${currentEmployees.length}`);
    
    let cnicMatches = 0;
    let cnicCorrections = 0;
    let missingCnicCanBeAdded = 0;
    let designationUpdates = 0;
    
    const matchResults = [];
    
    for (const record of allEmployeeData) {
      const row = record.data;
      
      // Try to identify CNIC, employee code, name, designation from the row
      let cnic = '';
      let employeeCode = '';
      let name = '';
      let designation = '';
      
      for (const cell of row) {
        if (cell) {
          const cellStr = cell.toString();
          
          // Check for CNIC pattern
          if (cellStr.match(/^\d{5}-?\d{7}-?\d$/)) {
            cnic = normalizeCNIC(cellStr);
          }
          
          // Check for employee code pattern
          if (cellStr.match(/^\d{8}$/)) {
            employeeCode = cellStr;
          }
          
          // Check for name (contains letters and reasonable length)
          if (cellStr.length > 3 && /[a-zA-Z]/.test(cellStr) && !cellStr.match(/^\d/) && !name) {
            name = cellStr;
          }
          
          // Check for designation (common job titles)
          if (cellStr.match(/\b(manager|officer|executive|assistant|helper|technician|engineer|coordinator|supervisor|admin|clerk|guard|driver)\b/i)) {
            designation = cellStr;
          }
        }
      }
      
      if (cnic && cnic.length >= 13) {
        // Try to find exact CNIC match
        const exactMatch = currentEmployees.find(emp => emp.nationalId === cnic);
        
        if (exactMatch) {
          cnicMatches++;
          
          const result = {
            type: 'exact_cnic_match',
            employeeCode: exactMatch.employeeCode,
            employeeName: `${exactMatch.firstName} ${exactMatch.middleName || ''} ${exactMatch.lastName}`.trim(),
            employeeDepartment: exactMatch.department,
            employeeDesignation: exactMatch.designation,
            sheetName: record.sheet,
            sheetRow: record.row,
            sheetCnic: cnic,
            sheetEmployeeCode: employeeCode,
            sheetName: name,
            sheetDesignation: designation,
            canUpdateDesignation: !exactMatch.designation && designation
          };
          
          if (result.canUpdateDesignation) {
            designationUpdates++;
          }
          
          matchResults.push(result);
        } else if (employeeCode) {
          // Try to find by employee code
          const codeMatch = currentEmployees.find(emp => emp.employeeCode === employeeCode);
          
          if (codeMatch) {
            const result = {
              type: codeMatch.nationalId ? 'cnic_correction' : 'cnic_addition',
              employeeCode: codeMatch.employeeCode,
              employeeName: `${codeMatch.firstName} ${codeMatch.middleName || ''} ${codeMatch.lastName}`.trim(),
              employeeDepartment: codeMatch.department,
              employeeDesignation: codeMatch.designation,
              employeeCurrentCnic: codeMatch.nationalId,
              sheetName: record.sheet,
              sheetRow: record.row,
              sheetCnic: cnic,
              sheetEmployeeCode: employeeCode,
              sheetName: name,
              sheetDesignation: designation,
              canUpdateDesignation: !codeMatch.designation && designation
            };
            
            if (result.type === 'cnic_correction') {
              cnicCorrections++;
            } else {
              missingCnicCanBeAdded++;
            }
            
            if (result.canUpdateDesignation) {
              designationUpdates++;
            }
            
            matchResults.push(result);
          }
        }
      }
    }
    
    console.log(`\n=== MATCHING RESULTS ===`);
    console.log(`Exact CNIC matches: ${cnicMatches}`);
    console.log(`CNIC corrections needed: ${cnicCorrections}`);
    console.log(`Missing CNICs that can be added: ${missingCnicCanBeAdded}`);
    console.log(`Designation updates possible: ${designationUpdates}`);
    
    // Show detailed results
    console.log(`\n=== DETAILED RESULTS ===`);
    
    matchResults.forEach(result => {
      console.log(`\n${result.type.toUpperCase()}: ${result.employeeCode} - ${result.employeeName}`);
      console.log(`  Department: ${result.employeeDepartment}`);
      console.log(`  Current designation: ${result.employeeDesignation || 'None'}`);
      console.log(`  Sheet: ${result.sheetName}, Row: ${result.sheetRow}`);
      console.log(`  Sheet CNIC: ${result.sheetCnic}`);
      if (result.employeeCurrentCnic) {
        console.log(`  Current CNIC: ${result.employeeCurrentCnic}`);
      }
      if (result.sheetDesignation) {
        console.log(`  Sheet designation: ${result.sheetDesignation}`);
      }
      if (result.canUpdateDesignation) {
        console.log(`  ✓ Can update designation`);
      }
    });
    
    return; // Skip the rest of the original analysis
    
  } catch (error) {
    console.error("Error analyzing salary sheet:", error);
  }
}

analyzeSalarySheet().catch(console.error);