import { db } from './db';
import { employeeRecords } from '../shared/schema';
import { eq } from 'drizzle-orm';

// Data from the FSD image
const fsdData = [
  { name: "Mr. Nafees Ahmed", designation: "Tech. Support Engineer", cnic: "33102-1771657-5" },
  { name: "Syed Imran Haider Shah", designation: "Tech. Support Engineer", cnic: "33100-0812561-9" },
  { name: "Mr. Ali Raza Shah", designation: "Accounts Officer", cnic: "33100-3037778-5" },
  { name: "Mr. Muhammad Afzal", designation: "Tower Technician", cnic: "33201-7811440-5" },
  { name: "Mr. Adnan Wallyat", designation: "DSL Operator", cnic: "33100-0867818-9" },
  { name: "Mr. Khadim Hussain", designation: "Ragger", cnic: "33201-3700558-9" },
  { name: "Mr. Sohaib Razzaq", designation: "Tech Support Exe.", cnic: "33100-7054105-5" },
  { name: "Mr. Bilal Rafique", designation: "Recovery & Sales Cordinate", cnic: "61101-4251589-9" },
  { name: "Mr. Kashif Maqsood", designation: "Marketing Executive", cnic: "33100-3135963-3" },
  { name: "Mr. Muhammad Saeed", designation: "Office Boy", cnic: "33100-8368827-7" },
  { name: "Mr. Sheroz", designation: "Sweeper- Part Time", cnic: "" },
  { name: "Mr. Khalil Ahmad", designation: "Tech. Support Officer", cnic: "33303-6052331-3" },
  { name: "Mr. Safdar Ali Shah", designation: "Rigger", cnic: "33100-5477599-1" },
  { name: "Mr. Farooq Shahzad", designation: "Sr.Tech. Support Engineer", cnic: "33203-5812962-5" },
  { name: "Mr. Shehryar Shakir", designation: "Tech. Support Engineer", cnic: "33102-5103335-9" },
  { name: "Mr. Muhammad Irfan", designation: "Office Boy-Corporate Office", cnic: "33100-8611710-5" },
  { name: "Mr. Waqas Ahmad", designation: "Tech. Support Engineer", cnic: "33100-3410139-3" },
  { name: "Mr. Hafiz Muhammad Shoaib", designation: "Tech. Support Engineer", cnic: "33100-5018814-1" },
  { name: "Syed Mateen Abbas Zaidi", designation: "Proj Monitoring /Support Engineer", cnic: "33100-4723666-3" },
  { name: "Mr. Muhammad Haris Irfan", designation: "Tech. Support Engineer", cnic: "33100-5237975-9" },
  { name: "Mr. Iftikhar Hussain", designation: "Driver", cnic: "33100-9847973-3" },
  { name: "Usman Mehmood", designation: "Tech. Support Engineer", cnic: "33100-7777550-1" },
  { name: "Affaq Tahir", designation: "Tech. Support Engineer", cnic: "33102-8479185-5" },
  { name: "Mr. Abu Sufyan", designation: "Driver", cnic: "33103-3231824-5" },
  { name: "Syed Habib Ali Naqvi", designation: "Tech. Support Engineer", cnic: "33102-8850958-9" },
  { name: "Shayan Ali", designation: "Electrician FSD", cnic: "33100-7739827-9" }
];

function normalizeCNIC(cnic: string): string {
  if (!cnic) return '';
  return cnic.replace(/[-\s]/g, '');
}

async function matchFsdByCnic() {
  console.log('🔍 Matching FSD employees by CNIC...\n');
  
  // Get all FSD employees
  const fsdEmployees = await db.select().from(employeeRecords)
    .where(eq(employeeRecords.department, 'FSD'));
  
  console.log(`📋 Found ${fsdEmployees.length} FSD employees in database`);
  console.log(`📋 Found ${fsdData.length} employees in CSV data`);
  
  let matchCount = 0;
  let updateCount = 0;
  const matchedEmployees: any[] = [];
  const unmatchedCsvEmployees: string[] = [];
  const unmatchedDbEmployees: any[] = [];
  
  for (const csvEmployee of fsdData) {
    if (!csvEmployee.cnic) {
      unmatchedCsvEmployees.push(`${csvEmployee.name} (No CNIC)`);
      continue;
    }
    
    const csvCnicNormalized = normalizeCNIC(csvEmployee.cnic);
    
    // Find matching employee in database by CNIC
    const matchedEmployee = fsdEmployees.find(emp => {
      const dbCnicNormalized = normalizeCNIC(emp.nationalId || '');
      return dbCnicNormalized === csvCnicNormalized && dbCnicNormalized !== '';
    });
    
    if (matchedEmployee) {
      matchCount++;
      matchedEmployees.push({
        csvName: csvEmployee.name,
        dbName: `${matchedEmployee.firstName} ${matchedEmployee.lastName}`,
        employeeCode: matchedEmployee.employeeCode,
        designation: csvEmployee.designation,
        currentDesignation: matchedEmployee.designation,
        cnic: csvEmployee.cnic
      });
      
      // Update designation if different or empty
      if (!matchedEmployee.designation || matchedEmployee.designation !== csvEmployee.designation) {
        await db.update(employeeRecords)
          .set({ designation: csvEmployee.designation })
          .where(eq(employeeRecords.id, matchedEmployee.id));
        updateCount++;
        console.log(`✅ Updated ${matchedEmployee.employeeCode} (${matchedEmployee.firstName} ${matchedEmployee.lastName})`);
        console.log(`   CSV: "${csvEmployee.name}" -> ${csvEmployee.designation}`);
        console.log(`   CNIC: ${csvEmployee.cnic}`);
      } else {
        console.log(`ℹ️  ${matchedEmployee.employeeCode} (${matchedEmployee.firstName} ${matchedEmployee.lastName}) already has correct designation`);
      }
    } else {
      unmatchedCsvEmployees.push(`${csvEmployee.name} (CNIC: ${csvEmployee.cnic})`);
    }
  }
  
  // Find unmatched database employees
  const matchedDbIds = matchedEmployees.map(emp => {
    const dbEmp = fsdEmployees.find(e => `${e.firstName} ${e.lastName}` === emp.dbName);
    return dbEmp?.id;
  });
  
  unmatchedDbEmployees.push(...fsdEmployees.filter(emp => !matchedDbIds.includes(emp.id)));
  
  console.log('\n📊 FSD CNIC Matching Summary:');
  console.log(`✅ Matched employees: ${matchCount}/${fsdData.filter(e => e.cnic).length}`);
  console.log(`🔄 Updated designations: ${updateCount}`);
  console.log(`❌ Unmatched CSV employees: ${unmatchedCsvEmployees.length}`);
  console.log(`❌ Unmatched DB employees: ${unmatchedDbEmployees.length}`);
  
  if (unmatchedCsvEmployees.length > 0) {
    console.log('\n🔍 Unmatched CSV employees:');
    unmatchedCsvEmployees.forEach(name => console.log(`  - ${name}`));
  }
  
  if (unmatchedDbEmployees.length > 0) {
    console.log('\n🔍 Unmatched DB employees:');
    unmatchedDbEmployees.forEach(emp => {
      const cnic = emp.nationalId ? `CNIC: ${emp.nationalId}` : 'No CNIC';
      console.log(`  - ${emp.employeeCode}: ${emp.firstName} ${emp.lastName} (${cnic})`);
    });
  }
  
  // Check final FSD coverage
  const finalFsdEmployees = await db.select().from(employeeRecords)
    .where(eq(employeeRecords.department, 'FSD'));
  
  const totalFsd = finalFsdEmployees.length;
  const withDesignations = finalFsdEmployees.filter(emp => emp.designation && emp.designation !== '').length;
  const coverage = Math.round((withDesignations / totalFsd) * 100);
  
  console.log('\n📊 Final FSD Coverage:');
  console.log(`   Total: ${totalFsd} employees`);
  console.log(`   With designations: ${withDesignations}`);
  console.log(`   Coverage: ${coverage}%`);
  
  console.log('\n🎯 FSD CNIC matching completed!');
}

matchFsdByCnic().catch(console.error);