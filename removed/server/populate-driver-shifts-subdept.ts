import { db } from './db';
import { employeeRecords, shifts } from '../shared/schema';
import { eq, and } from 'drizzle-orm';

// Driver shift and sub-department data from the provided image
const driverShiftData = [
  { name: 'Wasif Bashir', vrn: 'LEB-09-5918', subDept: 'OFC', shift: 'PSCA-Night' },
  { name: 'Abdul Majeed', vrn: 'LE-13-6175', subDept: 'OFC', shift: 'PSCA-Night' },
  { name: 'Muhammad Umar', vrn: 'LEH-17-9662', subDept: 'OFC', shift: 'PSCA-Morning' },
  { name: 'Muhammad Imran', vrn: 'LED-16-9479', subDept: 'OFC', shift: 'PSCA-Morning' },
  { name: 'Zaman Iqbal', vrn: 'LEB-09-9731', subDept: 'OFC', shift: 'PSCA-Night' },
  { name: 'Adnan Ashraf', vrn: 'LEA-17-5122', subDept: 'OFC', shift: 'PSCA-Night' },
  { name: 'Shahid Butt', vrn: 'LEF-13-6821', subDept: 'OFC', shift: 'PSCA-Morning' },
  { name: 'Ahsan Ali', vrn: 'AJV-498', subDept: 'OFC', shift: 'PSCA-Morning' },
  { name: 'Muhammad Ishaq', vrn: 'LE-14-1467', subDept: 'OFC', shift: 'PSCA-Evening' },
  { name: 'Mudassar Akram', vrn: 'LEF-19-8430', subDept: 'Traffic', shift: 'PSCA-Evening' },
  { name: 'Muhammad Waqas', vrn: 'LEB-13A-8056', subDept: 'Traffic', shift: 'PSCA-Morning' },
  { name: 'Muhammad Naeem', vrn: 'LEA-16A-3815', subDept: 'Traffic', shift: 'PSCA-Morning' },
  { name: 'Sarfraz Hussain', vrn: 'CAP-2389', subDept: 'Camera', shift: 'PSCA-Morning' },
  { name: 'Syed Hasnain Haider', vrn: 'LEB-18-6491', subDept: 'Camera', shift: 'PSCA-Night' },
  { name: 'Muhammad Khan', vrn: 'LEF-18-7126', subDept: 'Camera', shift: 'PSCA-Morning' },
  { name: 'Sajid Ali', vrn: 'AEQ-419', subDept: 'Camera', shift: 'PSCA-Morning' },
  { name: 'Muhammad Mubeen Afzal', vrn: 'LED-15-7835', subDept: 'Camera', shift: 'PSCA-Night' }
];

function normalizeVrn(vrn: string): string {
  if (!vrn) return '';
  // Remove spaces and normalize format
  return vrn.replace(/\s+/g, '').toUpperCase();
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

async function populateDriverShiftsSubDept() {
  console.log('🔄 Populating driver shifts and sub-departments...\n');
  
  // Get all available shifts
  const allShifts = await db.select().from(shifts);
  console.log(`📋 Found ${allShifts.length} shifts in database:`);
  allShifts.forEach(shift => {
    console.log(`  - ${shift.shiftName}: ${shift.startHour}:${shift.startMinute.toString().padStart(2, '0')} - ${shift.endHour}:${shift.endMinute.toString().padStart(2, '0')}`);
  });
  
  // Get all LHE-Safecity-Drivers employees
  const safecityDrivers = await db.select().from(employeeRecords)
    .where(and(
      eq(employeeRecords.department, 'LHE-Safecity-Drivers'),
      eq(employeeRecords.isActive, true)
    ));
  
  console.log(`\n📋 Found ${safecityDrivers.length} LHE-Safecity-Drivers employees in database`);
  console.log(`📋 Found ${driverShiftData.length} drivers with shift and sub-department data`);
  
  // Show current employees with missing data
  console.log('\n📋 Current LHE-Safecity-Drivers employees:');
  safecityDrivers.forEach(emp => {
    const missingFields = [];
    if (!emp.shiftId) missingFields.push('Shift');
    if (!emp.subDepartment) missingFields.push('Sub-Department');
    if (!emp.vrn) missingFields.push('VRN');
    if (!emp.designation) missingFields.push('Designation');
    
    console.log(`  - ${emp.employeeCode}: ${emp.firstName} ${emp.lastName}`);
    console.log(`    VRN: ${emp.vrn || 'MISSING'} | Sub-Dept: ${emp.subDepartment || 'MISSING'} | Shift: ${emp.shiftId || 'MISSING'}`);
    console.log(`    Missing fields: ${missingFields.length > 0 ? missingFields.join(', ') : 'None'}`);
  });
  
  const exactVrnMatches: any[] = [];
  const exactNameMatches: any[] = [];
  const nearMatches: any[] = [];
  const noMatches: any[] = [];
  
  for (const csvEmployee of driverShiftData) {
    const csvVrnNormalized = normalizeVrn(csvEmployee.vrn);
    const csvNameNormalized = normalizeNameForMatching(csvEmployee.name);
    
    // Check for exact VRN match first (most reliable for drivers)
    if (csvVrnNormalized) {
      const vrnMatch = safecityDrivers.find(emp => {
        const dbVrnNormalized = normalizeVrn(emp.vrn || '');
        return dbVrnNormalized === csvVrnNormalized && dbVrnNormalized !== '';
      });
      
      if (vrnMatch) {
        exactVrnMatches.push({
          csvData: csvEmployee,
          employee: vrnMatch,
          matchType: 'EXACT_VRN'
        });
        continue;
      }
    }
    
    // Check for exact name match
    const nameMatch = safecityDrivers.find(emp => {
      const dbNameNormalized = normalizeNameForMatching(`${emp.firstName} ${emp.lastName}`);
      return dbNameNormalized === csvNameNormalized;
    });
    
    if (nameMatch) {
      exactNameMatches.push({
        csvData: csvEmployee,
        employee: nameMatch,
        matchType: 'EXACT_NAME'
      });
      continue;
    }
    
    // Check for near matches (similarity > 85%)
    const potentialMatches = safecityDrivers.map(emp => {
      const similarity = calculateNameSimilarity(csvEmployee.name, `${emp.firstName} ${emp.lastName}`);
      
      return {
        csvData: csvEmployee,
        employee: emp,
        similarity,
        matchType: 'NEAR_MATCH'
      };
    }).filter(match => match.similarity > 85)
      .sort((a, b) => b.similarity - a.similarity);
    
    if (potentialMatches.length > 0) {
      nearMatches.push(...potentialMatches.slice(0, 2)); // Top 2 matches
    } else {
      noMatches.push({
        csvData: csvEmployee,
        matchType: 'NO_MATCH'
      });
    }
  }
  
  console.log('\n📊 Driver Shift Assignment Match Analysis Results:');
  console.log(`✅ Exact VRN matches: ${exactVrnMatches.length}`);
  console.log(`✅ Exact name matches: ${exactNameMatches.length}`);
  console.log(`⚠️  Near matches requiring approval: ${nearMatches.length}`);
  console.log(`❌ No matches found: ${noMatches.length}`);
  
  // Auto-approve exact matches
  const approvedMatches = [...exactVrnMatches, ...exactNameMatches];
  
  if (exactVrnMatches.length > 0) {
    console.log('\n✅ EXACT VRN MATCHES (Auto-approve):');
    exactVrnMatches.forEach(match => {
      console.log(`  - ${match.employee.employeeCode}: "${match.employee.firstName} ${match.employee.lastName}" <- "${match.csvData.name}"`);
      console.log(`    VRN: ${match.csvData.vrn} | Sub-Dept: ${match.csvData.subDept} | Shift: ${match.csvData.shift}`);
    });
  }
  
  if (exactNameMatches.length > 0) {
    console.log('\n✅ EXACT NAME MATCHES (Auto-approve):');
    exactNameMatches.forEach(match => {
      console.log(`  - ${match.employee.employeeCode}: "${match.employee.firstName} ${match.employee.lastName}" <- "${match.csvData.name}"`);
      console.log(`    VRN: ${match.csvData.vrn} | Sub-Dept: ${match.csvData.subDept} | Shift: ${match.csvData.shift}`);
    });
  }
  
  if (nearMatches.length > 0) {
    console.log('\n⚠️  NEAR MATCHES (Require Authorization):');
    nearMatches.forEach(match => {
      console.log(`  - ${match.employee.employeeCode}: "${match.employee.firstName} ${match.employee.lastName}" <- "${match.csvData.name}" (${match.similarity}%)`);
      console.log(`    CSV VRN: ${match.csvData.vrn} | DB VRN: ${match.employee.vrn || 'MISSING'}`);
      console.log(`    Sub-Dept: ${match.csvData.subDept} | Shift: ${match.csvData.shift}`);
    });
  }
  
  if (noMatches.length > 0) {
    console.log('\n❌ NO MATCHES FOUND:');
    noMatches.forEach(match => {
      console.log(`  - "${match.csvData.name}" | VRN: ${match.csvData.vrn} | Sub-Dept: ${match.csvData.subDept} | Shift: ${match.csvData.shift}`);
    });
  }
  
  // Create shift name to ID mapping
  const shiftMapping: { [key: string]: number } = {};
  allShifts.forEach(shift => {
    shiftMapping[shift.shiftName] = shift.id;
  });
  
  // Update approved matches with shift assignments and sub-department data
  if (approvedMatches.length > 0) {
    console.log('\n🔄 Updating approved matches with shift assignments and sub-department data...');
    
    let updateCount = 0;
    let errorCount = 0;
    const results: any[] = [];
    
    for (const match of approvedMatches) {
      try {
        console.log(`🔄 Updating ${match.employee.employeeCode}...`);
        
        // Find shift ID for the shift name
        const shiftId = shiftMapping[match.csvData.shift];
        if (!shiftId) {
          console.log(`   ⚠️  Shift "${match.csvData.shift}" not found in database`);
          continue;
        }
        
        // Prepare update data
        const updateData: any = {
          updatedAt: new Date()
        };
        
        // Update sub-department if missing or different
        if (!match.employee.subDepartment || match.employee.subDepartment !== match.csvData.subDept) {
          updateData.subDepartment = match.csvData.subDept;
        }
        
        // Update shift assignment if missing or different
        if (!match.employee.shiftId || match.employee.shiftId !== shiftId) {
          updateData.shiftId = shiftId;
        }
        
        // Set designation to Driver if missing
        if (!match.employee.designation) {
          updateData.designation = 'Driver';
        }
        
        // Only update if there are changes
        if (Object.keys(updateData).length > 1) { // More than just updatedAt
          // Update employee record
          await db.update(employeeRecords)
            .set(updateData)
            .where(eq(employeeRecords.id, match.employee.id));
          
          updateCount++;
          
          const shiftInfo = allShifts.find(s => s.id === shiftId);
          
          results.push({
            employeeCode: match.employee.employeeCode,
            name: `${match.employee.firstName} ${match.employee.lastName}`,
            vrn: match.employee.vrn || match.csvData.vrn,
            subDepartment: match.csvData.subDept,
            shift: match.csvData.shift,
            shiftTime: shiftInfo ? `${shiftInfo.startHour}:${shiftInfo.startMinute.toString().padStart(2, '0')} - ${shiftInfo.endHour}:${shiftInfo.endMinute.toString().padStart(2, '0')}` : 'N/A',
            fieldsUpdated: Object.keys(updateData).filter(key => key !== 'updatedAt')
          });
          
          console.log(`   ✅ Updated: ${match.employee.firstName} ${match.employee.lastName}`);
          console.log(`      Sub-Dept: ${match.csvData.subDept} | Shift: ${match.csvData.shift} | VRN: ${match.employee.vrn || match.csvData.vrn}`);
        } else {
          console.log(`   ⚠️  No updates needed for ${match.employee.firstName} ${match.employee.lastName} - all fields already populated`);
        }
        
      } catch (error) {
        console.log(`   ❌ Error updating ${match.employee.employeeCode}: ${error}`);
        errorCount++;
      }
      console.log('');
    }
    
    console.log('\n📊 Driver Shift Assignment Update Summary:');
    console.log(`✅ Successfully updated: ${updateCount}/${approvedMatches.length} employees`);
    console.log(`❌ Errors: ${errorCount}`);
    
    if (results.length > 0) {
      console.log('\n✅ Updated drivers with shift assignments and sub-department data:');
      results.forEach(result => {
        console.log(`  - ${result.employeeCode}: ${result.name}`);
        console.log(`    VRN: ${result.vrn} | Sub-Dept: ${result.subDepartment} | Shift: ${result.shift} (${result.shiftTime})`);
        console.log(`    Fields updated: ${result.fieldsUpdated.join(', ')}`);
      });
    }
  }
  
  // Check final coverage
  const finalDrivers = await db.select().from(employeeRecords)
    .where(and(
      eq(employeeRecords.department, 'LHE-Safecity-Drivers'),
      eq(employeeRecords.isActive, true)
    ));
  
  const total = finalDrivers.length;
  const withShifts = finalDrivers.filter(emp => emp.shiftId).length;
  const withSubDepts = finalDrivers.filter(emp => emp.subDepartment && emp.subDepartment !== '').length;
  const withVrns = finalDrivers.filter(emp => emp.vrn && emp.vrn !== '').length;
  const withDesignations = finalDrivers.filter(emp => emp.designation && emp.designation !== '').length;
  
  console.log('\n📊 Final LHE-Safecity-Drivers Coverage:');
  console.log(`   Total employees: ${total}`);
  console.log(`   With shift assignments: ${withShifts} (${Math.round((withShifts / total) * 100)}%)`);
  console.log(`   With sub-departments: ${withSubDepts} (${Math.round((withSubDepts / total) * 100)}%)`);
  console.log(`   With VRNs: ${withVrns} (${Math.round((withVrns / total) * 100)}%)`);
  console.log(`   With designations: ${withDesignations} (${Math.round((withDesignations / total) * 100)}%)`);
  
  // Show employees still missing data
  const missingData = finalDrivers.filter(emp => 
    !emp.shiftId || !emp.subDepartment || !emp.vrn || !emp.designation
  );
  
  if (missingData.length > 0) {
    console.log('\n⚠️  Employees still missing data:');
    missingData.forEach(emp => {
      const missing = [];
      if (!emp.shiftId) missing.push('Shift');
      if (!emp.subDepartment) missing.push('Sub-Department');
      if (!emp.vrn) missing.push('VRN');
      if (!emp.designation) missing.push('Designation');
      
      console.log(`  - ${emp.employeeCode}: ${emp.firstName} ${emp.lastName} (Missing: ${missing.join(', ')})`);
    });
  }
  
  // Show shift distribution
  console.log('\n📊 Shift Distribution:');
  const shiftCounts: { [key: string]: number } = {};
  for (const driver of finalDrivers) {
    if (driver.shiftId) {
      const shift = allShifts.find(s => s.id === driver.shiftId);
      if (shift) {
        shiftCounts[shift.shiftName] = (shiftCounts[shift.shiftName] || 0) + 1;
      }
    }
  }
  
  Object.entries(shiftCounts).forEach(([shiftName, count]) => {
    console.log(`  - ${shiftName}: ${count} drivers`);
  });
  
  // Show sub-department distribution
  console.log('\n📊 Sub-Department Distribution:');
  const subDeptCounts: { [key: string]: number } = {};
  for (const driver of finalDrivers) {
    if (driver.subDepartment) {
      subDeptCounts[driver.subDepartment] = (subDeptCounts[driver.subDepartment] || 0) + 1;
    }
  }
  
  Object.entries(subDeptCounts).forEach(([subDept, count]) => {
    console.log(`  - ${subDept}: ${count} drivers`);
  });
  
  console.log('\n🎯 Driver shift assignment and sub-department population completed!');
  console.log('📈 Drivers now have proper shift scheduling and organizational structure!');
}

populateDriverShiftsSubDept().catch(console.error);