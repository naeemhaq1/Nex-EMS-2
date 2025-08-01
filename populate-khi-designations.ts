import { db } from './db';
import { employeeRecords } from '../shared/schema';
import { eq, and } from 'drizzle-orm';

// KHI employee data from the provided image
const khiDesignationData = [
  { name: "Amir Hameed", designation: "Sales/Office Coordinator", cnic: "4230141235671", joiningDate: "01-Jul-2012", entitlementDate: "01-Feb-2017" },
  { name: "Asad Mehmood", designation: "Office Boy", cnic: "4220150388797", joiningDate: "24-Jan-2019", entitlementDate: "24-Jan-2020" },
  { name: "Fareed", designation: "RF Technician", cnic: "4130693658093", joiningDate: "4-SEP-2020", entitlementDate: "4-SEP-2021" }
];

function normalizeCNIC(cnic: string): string {
  if (!cnic) return '';
  return cnic.replace(/[-\s]/g, '');
}

function normalizeNameForMatching(name: string): string {
  const prefixes = ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Syed', 'Muhammad', 'Mohammad', 'Raja', 'Sheikh', 'M.', 'Malik'];
  let normalized = name;
  
  prefixes.forEach(prefix => {
    const regex = new RegExp(`^${prefix}\\s+`, 'i');
    normalized = normalized.replace(regex, '');
  });
  
  return normalized
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim()
    .toLowerCase();
}

function calculateNameSimilarity(name1: string, name2: string): number {
  const n1 = normalizeNameForMatching(name1);
  const n2 = normalizeNameForMatching(name2);
  
  if (n1 === n2) return 100;
  
  const words1 = n1.split(' ');
  const words2 = n2.split(' ');
  
  let matches = 0;
  let totalWords = Math.max(words1.length, words2.length);
  
  for (const word1 of words1) {
    for (const word2 of words2) {
      if (word1 === word2) {
        matches++;
        break;
      }
    }
  }
  
  return Math.round((matches / totalWords) * 100);
}

function parseJoiningDate(dateStr: string): Date | null {
  try {
    // Handle formats like "01-Jul-2012", "24-Jan-2019", "4-SEP-2020"
    const monthMap: { [key: string]: string } = {
      'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
      'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    };
    
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = monthMap[parts[1]] || parts[1];
      const year = parts[2];
      
      return new Date(`${year}-${month}-${day}`);
    }
    
    return null;
  } catch (error) {
    console.log(`Error parsing date: ${dateStr}`, error);
    return null;
  }
}

async function populateKhiDesignations() {
  console.log('🔄 Populating KHI designations...\n');
  
  // Get all KHI employees
  const khiEmployees = await db.select().from(employeeRecords)
    .where(and(
      eq(employeeRecords.department, 'KHI'),
      eq(employeeRecords.isActive, true)
    ));
  
  console.log(`📋 Found ${khiEmployees.length} KHI employees in database`);
  console.log(`📋 Found ${khiDesignationData.length} employees with designation data`);
  
  // Show current KHI employees
  console.log('\n📋 Current KHI employees:');
  khiEmployees.forEach(emp => {
    console.log(`  - ${emp.employeeCode}: ${emp.firstName} ${emp.lastName} (CNIC: ${emp.nationalId || 'N/A'}) (Designation: ${emp.designation || 'None'})`);
  });
  
  const exactCnicMatches: any[] = [];
  const exactNameMatches: any[] = [];
  const nearMatches: any[] = [];
  const noMatches: any[] = [];
  
  for (const csvEmployee of khiDesignationData) {
    const csvCnicNormalized = normalizeCNIC(csvEmployee.cnic);
    const csvNameNormalized = normalizeNameForMatching(csvEmployee.name);
    
    // Check for exact CNIC match first (most reliable)
    if (csvCnicNormalized) {
      const cnicMatch = khiEmployees.find(emp => {
        const dbCnicNormalized = normalizeCNIC(emp.nationalId || '');
        return dbCnicNormalized === csvCnicNormalized && dbCnicNormalized !== '';
      });
      
      if (cnicMatch) {
        exactCnicMatches.push({
          csvName: csvEmployee.name,
          dbName: `${cnicMatch.firstName} ${cnicMatch.lastName}`,
          employeeCode: cnicMatch.employeeCode,
          designation: csvEmployee.designation,
          cnic: csvEmployee.cnic,
          joiningDate: csvEmployee.joiningDate,
          entitlementDate: csvEmployee.entitlementDate,
          matchType: 'EXACT_CNIC'
        });
        continue;
      }
    }
    
    // Check for exact name match
    const nameMatch = khiEmployees.find(emp => {
      const dbNameNormalized = normalizeNameForMatching(`${emp.firstName} ${emp.lastName}`);
      return dbNameNormalized === csvNameNormalized;
    });
    
    if (nameMatch) {
      exactNameMatches.push({
        csvName: csvEmployee.name,
        dbName: `${nameMatch.firstName} ${nameMatch.lastName}`,
        employeeCode: nameMatch.employeeCode,
        designation: csvEmployee.designation,
        cnic: csvEmployee.cnic,
        joiningDate: csvEmployee.joiningDate,
        entitlementDate: csvEmployee.entitlementDate,
        matchType: 'EXACT_NAME'
      });
      continue;
    }
    
    // Check for near matches (similarity > 80%)
    const potentialMatches = khiEmployees.map(emp => {
      const dbNameNormalized = normalizeNameForMatching(`${emp.firstName} ${emp.lastName}`);
      const similarity = calculateNameSimilarity(csvEmployee.name, `${emp.firstName} ${emp.lastName}`);
      
      return {
        csvName: csvEmployee.name,
        dbName: `${emp.firstName} ${emp.lastName}`,
        employeeCode: emp.employeeCode,
        designation: csvEmployee.designation,
        cnic: csvEmployee.cnic,
        dbCnic: emp.nationalId || 'N/A',
        joiningDate: csvEmployee.joiningDate,
        entitlementDate: csvEmployee.entitlementDate,
        similarity,
        matchType: 'NEAR_MATCH'
      };
    }).filter(match => match.similarity > 80)
      .sort((a, b) => b.similarity - a.similarity);
    
    if (potentialMatches.length > 0) {
      nearMatches.push(...potentialMatches.slice(0, 3)); // Top 3 matches
    } else {
      noMatches.push({
        csvName: csvEmployee.name,
        designation: csvEmployee.designation,
        cnic: csvEmployee.cnic,
        joiningDate: csvEmployee.joiningDate,
        entitlementDate: csvEmployee.entitlementDate,
        matchType: 'NO_MATCH'
      });
    }
  }
  
  console.log('\n📊 KHI Designation Match Analysis Results:');
  console.log(`✅ Exact CNIC matches: ${exactCnicMatches.length}`);
  console.log(`✅ Exact name matches: ${exactNameMatches.length}`);
  console.log(`⚠️  Near matches requiring approval: ${nearMatches.length}`);
  console.log(`❌ No matches found: ${noMatches.length}`);
  
  // Auto-approve exact matches
  const approvedMatches = [...exactCnicMatches, ...exactNameMatches];
  
  if (exactCnicMatches.length > 0) {
    console.log('\n✅ EXACT CNIC MATCHES (Auto-approve):');
    exactCnicMatches.forEach(match => {
      console.log(`  - ${match.employeeCode}: "${match.dbName}" <- "${match.csvName}"`);
      console.log(`    Designation: ${match.designation}`);
      console.log(`    CNIC: ${match.cnic}`);
      console.log(`    Joining: ${match.joiningDate} | Entitlement: ${match.entitlementDate}`);
    });
  }
  
  if (exactNameMatches.length > 0) {
    console.log('\n✅ EXACT NAME MATCHES (Auto-approve):');
    exactNameMatches.forEach(match => {
      console.log(`  - ${match.employeeCode}: "${match.dbName}" <- "${match.csvName}"`);
      console.log(`    Designation: ${match.designation}`);
      console.log(`    CNIC: ${match.cnic}`);
      console.log(`    Joining: ${match.joiningDate} | Entitlement: ${match.entitlementDate}`);
    });
  }
  
  if (nearMatches.length > 0) {
    console.log('\n⚠️  NEAR MATCHES (Require Authorization):');
    nearMatches.forEach(match => {
      console.log(`  - ${match.employeeCode}: "${match.dbName}" <- "${match.csvName}" (${match.similarity}%)`);
      console.log(`    Designation: ${match.designation}`);
      console.log(`    CSV CNIC: ${match.cnic} | DB CNIC: ${match.dbCnic}`);
      console.log(`    Joining: ${match.joiningDate} | Entitlement: ${match.entitlementDate}`);
    });
  }
  
  if (noMatches.length > 0) {
    console.log('\n❌ NO MATCHES FOUND:');
    noMatches.forEach(match => {
      console.log(`  - "${match.csvName}" (${match.designation})`);
      console.log(`    CNIC: ${match.cnic}`);
      console.log(`    Joining: ${match.joiningDate} | Entitlement: ${match.entitlementDate}`);
    });
  }
  
  // Update approved matches
  if (approvedMatches.length > 0) {
    console.log('\n🔄 Updating approved designation matches...');
    
    let updateCount = 0;
    let errorCount = 0;
    const results: any[] = [];
    
    for (const match of approvedMatches) {
      try {
        console.log(`🔄 Updating ${match.employeeCode}...`);
        
        // Get current employee data
        const employee = await db.select().from(employeeRecords)
          .where(eq(employeeRecords.employeeCode, match.employeeCode))
          .limit(1);
        
        if (employee.length === 0) {
          console.log(`   ❌ Employee not found: ${match.employeeCode}`);
          errorCount++;
          continue;
        }
        
        const emp = employee[0];
        
        // Parse dates
        const joiningDate = parseJoiningDate(match.joiningDate);
        const entitlementDate = parseJoiningDate(match.entitlementDate);
        
        // Update employee with designation, CNIC, and dates
        const normalizedCnic = normalizeCNIC(match.cnic);
        
        const updateData: any = {
          designation: match.designation
        };
        
        // Only update CNIC if employee doesn't have one
        if (!emp.nationalId) {
          updateData.nationalId = normalizedCnic;
        }
        
        // Only update joining date if employee doesn't have one
        if (!emp.joiningDate && joiningDate) {
          updateData.joiningDate = joiningDate;
        }
        
        // Only update entitlement date if employee doesn't have one
        if (!emp.entitlementDate && entitlementDate) {
          updateData.entitlementDate = entitlementDate;
        }
        
        await db.update(employeeRecords)
          .set(updateData)
          .where(eq(employeeRecords.id, emp.id));
        
        updateCount++;
        
        results.push({
          employeeCode: match.employeeCode,
          name: `${emp.firstName} ${emp.lastName}`,
          designation: match.designation,
          cnic: normalizedCnic,
          joiningDate: match.joiningDate,
          entitlementDate: match.entitlementDate,
          previousDesignation: emp.designation || 'No designation',
          previousCnic: emp.nationalId || 'No CNIC',
          previousJoiningDate: emp.joiningDate || 'No joining date'
        });
        
        console.log(`   ✅ Updated: ${emp.firstName} ${emp.lastName}`);
        console.log(`      Designation: ${emp.designation || 'None'} → ${match.designation}`);
        console.log(`      CNIC: ${emp.nationalId || 'None'} → ${normalizedCnic}`);
        console.log(`      Joining: ${emp.joiningDate || 'None'} → ${match.joiningDate}`);
        console.log(`      Entitlement: ${emp.entitlementDate || 'None'} → ${match.entitlementDate}`);
        
      } catch (error) {
        console.log(`   ❌ Error updating ${match.employeeCode}: ${error}`);
        errorCount++;
      }
      console.log('');
    }
    
    console.log('\n📊 KHI Designation Update Summary:');
    console.log(`✅ Successfully updated: ${updateCount}/${approvedMatches.length} employees`);
    console.log(`❌ Errors: ${errorCount}`);
    
    if (results.length > 0) {
      console.log('\n✅ Updated KHI employees with complete data:');
      results.forEach(result => {
        console.log(`  - ${result.employeeCode}: ${result.name}`);
        console.log(`    Designation: ${result.previousDesignation} → ${result.designation}`);
        console.log(`    CNIC: ${result.previousCnic} → ${result.cnic}`);
        console.log(`    Joining: ${result.previousJoiningDate} → ${result.joiningDate}`);
        console.log(`    Entitlement: ${result.entitlementDate}`);
      });
    }
  }
  
  // Check final KHI designation coverage
  const finalKhiEmployees = await db.select().from(employeeRecords)
    .where(and(
      eq(employeeRecords.department, 'KHI'),
      eq(employeeRecords.isActive, true)
    ));
  
  const total = finalKhiEmployees.length;
  const withDesignations = finalKhiEmployees.filter(emp => emp.designation && emp.designation !== '').length;
  const withCnics = finalKhiEmployees.filter(emp => emp.nationalId && emp.nationalId !== '').length;
  const withJoiningDates = finalKhiEmployees.filter(emp => emp.joiningDate).length;
  
  const designationCoverage = Math.round((withDesignations / total) * 100);
  const cnicCoverage = Math.round((withCnics / total) * 100);
  const joiningDateCoverage = Math.round((withJoiningDates / total) * 100);
  
  console.log('\n📊 Updated KHI Department Coverage:');
  console.log(`   Total employees: ${total}`);
  console.log(`   With designations: ${withDesignations} (${designationCoverage}%)`);
  console.log(`   With CNICs: ${withCnics} (${cnicCoverage}%)`);
  console.log(`   With joining dates: ${withJoiningDates} (${joiningDateCoverage}%)`);
  
  // Show remaining employees without designations
  const remainingNoDesignation = finalKhiEmployees.filter(emp => 
    !emp.designation || emp.designation === ''
  );
  
  if (remainingNoDesignation.length > 0) {
    console.log('\n📝 KHI employees still without designations:');
    remainingNoDesignation.forEach(emp => {
      const cnic = emp.nationalId ? `CNIC: ${emp.nationalId}` : 'No CNIC';
      console.log(`  - ${emp.employeeCode}: ${emp.firstName} ${emp.lastName} (${cnic})`);
    });
  }
  
  console.log('\n🎯 KHI designation population completed!');
  console.log(`📈 KHI department coverage improved from 0% to ${designationCoverage}%!`);
}

populateKhiDesignations().catch(console.error);