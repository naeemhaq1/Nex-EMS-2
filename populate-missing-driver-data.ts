import { db } from './db';
import { employeeRecords } from '../shared/schema';
import { eq, and } from 'drizzle-orm';

// Additional driver data that can be populated based on analysis
const additionalDriverData = [
  // VRN data for existing employees that may be missing VRNs
  { name: 'Atif Naeem', vrn: null, subDept: 'OFC', designation: 'Driver' },
  { name: 'Muhammad d Rizwan', vrn: null, subDept: 'Traffic', designation: 'Driver' },
  { name: 'Asif Lateef', vrn: null, subDept: 'Camera', designation: 'Driver' },
  
  // Missing employees that should be in the system based on CSV data
  { name: 'Wasif Bashir', vrn: 'LEB-09-5918', subDept: 'OFC', designation: 'Driver' },
  { name: 'Muhammad Umar', vrn: 'LEH-17-9662', subDept: 'OFC', designation: 'Driver' },
  { name: 'Muhammad Imran', vrn: 'LED-16-9479', subDept: 'OFC', designation: 'Driver' },
  { name: 'Zaman Iqbal', vrn: 'LEB-09-9731', subDept: 'OFC', designation: 'Driver' },
  { name: 'Adnan Ashraf', vrn: 'LEA-17-5122', subDept: 'OFC', designation: 'Driver' },
  { name: 'Shahid Butt', vrn: 'LEF-13-6821', subDept: 'OFC', designation: 'Driver' },
  { name: 'Ahsan Ali', vrn: 'AJV-498', subDept: 'OFC', designation: 'Driver' },
  { name: 'Muhammad Ishaq', vrn: 'LE-14-1467', subDept: 'OFC', designation: 'Driver' },
  { name: 'Mudassar Akram', vrn: 'LEF-19-8430', subDept: 'Traffic', designation: 'Driver' },
  { name: 'Muhammad Waqas', vrn: 'LEB-13A-8056', subDept: 'Traffic', designation: 'Driver' },
  { name: 'Muhammad Naeem', vrn: 'LEA-16A-3815', subDept: 'Traffic', designation: 'Driver' },
  { name: 'Sarfraz Hussain', vrn: 'CAP-2389', subDept: 'Camera', designation: 'Driver' },
  { name: 'Syed Hasnain Haider', vrn: 'LEB-18-6491', subDept: 'Camera', designation: 'Driver' },
  { name: 'Muhammad Khan', vrn: 'LEF-18-7126', subDept: 'Camera', designation: 'Driver' },
  { name: 'Sajid Ali', vrn: 'AEQ-419', subDept: 'Camera', designation: 'Driver' }
];

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

async function populateMissingDriverData() {
  console.log('🔄 Analyzing missing driver data and potential additions...\n');
  
  // Get all LHE-Safecity-Drivers employees
  const safecityDrivers = await db.select().from(employeeRecords)
    .where(and(
      eq(employeeRecords.department, 'LHE-Safecity-Drivers'),
      eq(employeeRecords.isActive, true)
    ));
  
  console.log(`📋 Current LHE-Safecity-Drivers employees: ${safecityDrivers.length}`);
  
  // Show current data gaps
  const missingSubDept = safecityDrivers.filter(emp => !emp.subDepartment || emp.subDepartment === '');
  const missingDesignation = safecityDrivers.filter(emp => !emp.designation || emp.designation === '');
  const missingVrn = safecityDrivers.filter(emp => !emp.vrn || emp.vrn === '');
  const missingCnic = safecityDrivers.filter(emp => !emp.nationalId || emp.nationalId === '');
  const missingPhone = safecityDrivers.filter(emp => !emp.phone || emp.phone === '');
  
  console.log('\n📊 Current Data Gaps:');
  console.log(`   Missing Sub-Department: ${missingSubDept.length}/${safecityDrivers.length}`);
  console.log(`   Missing Designation: ${missingDesignation.length}/${safecityDrivers.length}`);
  console.log(`   Missing VRN: ${missingVrn.length}/${safecityDrivers.length}`);
  console.log(`   Missing CNIC: ${missingCnic.length}/${safecityDrivers.length}`);
  console.log(`   Missing Phone: ${missingPhone.length}/${safecityDrivers.length}`);
  
  // Show employees with missing data
  console.log('\n📋 Employees with missing data:');
  safecityDrivers.forEach(emp => {
    const missing = [];
    if (!emp.subDepartment) missing.push('Sub-Dept');
    if (!emp.designation) missing.push('Designation');
    if (!emp.vrn) missing.push('VRN');
    if (!emp.nationalId) missing.push('CNIC');
    if (!emp.phone) missing.push('Phone');
    
    if (missing.length > 0) {
      console.log(`  - ${emp.employeeCode}: ${emp.firstName} ${emp.lastName} (Missing: ${missing.join(', ')})`);
    }
  });
  
  // Populate missing designations and sub-departments for existing employees
  console.log('\n🔄 Populating missing designations and sub-departments...');
  
  let updatedCount = 0;
  
  // Update Atif Naeem - assign to OFC sub-department
  const atifNaeem = safecityDrivers.find(emp => emp.employeeCode === '10070622');
  if (atifNaeem && (!atifNaeem.subDepartment || !atifNaeem.designation)) {
    console.log('🔄 Updating Atif Naeem with OFC sub-department and Driver designation...');
    await db.update(employeeRecords)
      .set({ 
        subDepartment: 'OFC', 
        designation: 'Driver',
        updatedAt: new Date()
      })
      .where(eq(employeeRecords.id, atifNaeem.id));
    updatedCount++;
    console.log('   ✅ Updated: Atif Naeem -> OFC, Driver');
  }
  
  // Update Muhammad d Rizwan - assign to Traffic sub-department
  const muhammadRizwan = safecityDrivers.find(emp => emp.employeeCode === '10070620');
  if (muhammadRizwan && (!muhammadRizwan.subDepartment || !muhammadRizwan.designation)) {
    console.log('🔄 Updating Muhammad d Rizwan with Traffic sub-department and Driver designation...');
    await db.update(employeeRecords)
      .set({ 
        subDepartment: 'Traffic', 
        designation: 'Driver',
        updatedAt: new Date()
      })
      .where(eq(employeeRecords.id, muhammadRizwan.id));
    updatedCount++;
    console.log('   ✅ Updated: Muhammad d Rizwan -> Traffic, Driver');
  }
  
  // Update Asif Lateef - assign to Camera sub-department
  const asifLateef = safecityDrivers.find(emp => emp.employeeCode === '10070617');
  if (asifLateef && (!asifLateef.subDepartment || !asifLateef.designation)) {
    console.log('🔄 Updating Asif Lateef with Camera sub-department and Driver designation...');
    await db.update(employeeRecords)
      .set({ 
        subDepartment: 'Camera', 
        designation: 'Driver',
        updatedAt: new Date()
      })
      .where(eq(employeeRecords.id, asifLateef.id));
    updatedCount++;
    console.log('   ✅ Updated: Asif Lateef -> Camera, Driver');
  }
  
  console.log(`\n📊 Updated ${updatedCount} existing employees with missing data`);
  
  // Check if any of the missing employees already exist in other departments
  console.log('\n🔍 Checking for missing employees in other departments...');
  
  const missingEmployees = [
    'Wasif Bashir', 'Muhammad Umar', 'Muhammad Imran', 'Zaman Iqbal', 'Adnan Ashraf',
    'Shahid Butt', 'Ahsan Ali', 'Muhammad Ishaq', 'Mudassar Akram', 'Muhammad Waqas',
    'Muhammad Naeem', 'Sarfraz Hussain', 'Syed Hasnain Haider', 'Muhammad Khan', 'Sajid Ali'
  ];
  
  const foundInOtherDepts = [];
  
  for (const missingName of missingEmployees) {
    const normalizedMissingName = normalizeNameForMatching(missingName);
    
    // Check if this employee exists in any other department
    const existingEmployee = await db.select().from(employeeRecords)
      .where(eq(employeeRecords.isActive, true));
    
    for (const emp of existingEmployee) {
      const empFullName = `${emp.firstName} ${emp.lastName}`;
      const normalizedEmpName = normalizeNameForMatching(empFullName);
      
      if (normalizedEmpName === normalizedMissingName && emp.department !== 'LHE-Safecity-Drivers') {
        foundInOtherDepts.push({
          name: missingName,
          foundEmployee: emp,
          currentDept: emp.department
        });
        break;
      }
    }
  }
  
  if (foundInOtherDepts.length > 0) {
    console.log('\n✅ Found missing employees in other departments:');
    foundInOtherDepts.forEach(found => {
      console.log(`  - ${found.name} found as ${found.foundEmployee.firstName} ${found.foundEmployee.lastName} in ${found.currentDept}`);
      console.log(`    Employee Code: ${found.foundEmployee.employeeCode}`);
    });
    
    console.log('\n⚠️  These employees might need department transfer to LHE-Safecity-Drivers');
    console.log('    Consider reviewing their current assignments and VRN requirements');
  } else {
    console.log('\n❌ No missing employees found in other departments');
    console.log('    The 15 missing employees may need to be added to the system');
  }
  
  // Final status after updates
  const finalDrivers = await db.select().from(employeeRecords)
    .where(and(
      eq(employeeRecords.department, 'LHE-Safecity-Drivers'),
      eq(employeeRecords.isActive, true)
    ));
  
  const total = finalDrivers.length;
  const withSubDepts = finalDrivers.filter(emp => emp.subDepartment && emp.subDepartment !== '').length;
  const withDesignations = finalDrivers.filter(emp => emp.designation && emp.designation !== '').length;
  const withVrns = finalDrivers.filter(emp => emp.vrn && emp.vrn !== '').length;
  const withCnics = finalDrivers.filter(emp => emp.nationalId && emp.nationalId !== '').length;
  const withPhones = finalDrivers.filter(emp => emp.phone && emp.phone !== '').length;
  
  console.log('\n📊 Final LHE-Safecity-Drivers Coverage After Updates:');
  console.log(`   Total employees: ${total}`);
  console.log(`   With sub-departments: ${withSubDepts} (${Math.round((withSubDepts / total) * 100)}%)`);
  console.log(`   With designations: ${withDesignations} (${Math.round((withDesignations / total) * 100)}%)`);
  console.log(`   With VRNs: ${withVrns} (${Math.round((withVrns / total) * 100)}%)`);
  console.log(`   With CNICs: ${withCnics} (${Math.round((withCnics / total) * 100)}%)`);
  console.log(`   With phones: ${withPhones} (${Math.round((withPhones / total) * 100)}%)`);
  
  // Show sub-department distribution
  console.log('\n📊 Sub-Department Distribution:');
  const subDeptCounts: { [key: string]: number } = {};
  for (const driver of finalDrivers) {
    if (driver.subDepartment) {
      subDeptCounts[driver.subDepartment] = (subDeptCounts[driver.subDepartment] || 0) + 1;
    }
  }
  
  Object.entries(subDeptCounts).forEach(([subDept, count]) => {
    console.log(`   ${subDept}: ${count} drivers`);
  });
  
  // Show any employees still missing data
  const stillMissingData = finalDrivers.filter(emp => 
    !emp.subDepartment || !emp.designation || !emp.vrn || !emp.nationalId || !emp.phone
  );
  
  if (stillMissingData.length > 0) {
    console.log('\n⚠️  Employees still missing data:');
    stillMissingData.forEach(emp => {
      const missing = [];
      if (!emp.subDepartment) missing.push('Sub-Dept');
      if (!emp.designation) missing.push('Designation');
      if (!emp.vrn) missing.push('VRN');
      if (!emp.nationalId) missing.push('CNIC');
      if (!emp.phone) missing.push('Phone');
      
      console.log(`  - ${emp.employeeCode}: ${emp.firstName} ${emp.lastName} (Missing: ${missing.join(', ')})`);
    });
  }
  
  console.log('\n🎯 Driver data population analysis completed!');
  console.log('📈 LHE-Safecity-Drivers department data improved with sub-departments and designations!');
}

populateMissingDriverData().catch(console.error);