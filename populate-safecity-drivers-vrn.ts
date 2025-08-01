import { db } from './db';
import { employeeRecords } from '../shared/schema';
import { eq, and } from 'drizzle-orm';

// LHE-Safecity-Drivers comprehensive data with VRN and contact info
const safecityDriversVrnData = [
  { name: 'Muhammad Naeem', cnic: '35201-7660452-9', contact: '0300-3785044', vrn: 'LEA-16A-3815' },
  { name: 'Sajid Ali', cnic: '35201-1579812-5', contact: '0300-4203390', vrn: 'AEQ-419' },
  { name: 'Muhammad Khan', cnic: '37203-1461882-5', contact: '0323-4552070', vrn: 'LEF-7126' },
  { name: 'Muhammad Waqas', cnic: '35202-5525425-7', contact: '0310-0047693', vrn: 'LEB-8056' },
  { name: 'Syed Hasnain Haider', cnic: '35501-0129160-3', contact: '0300-4244040', vrn: 'LEB-6491' },
  { name: 'Sarfraz Hussain', cnic: '31101-3198384-9', contact: '0308-5130701', vrn: 'CAB-2389' },
  { name: 'Wasif Bashir', cnic: '35201-9542278-5', contact: '0322-4513332', vrn: 'LEB-09-5918' },
  { name: 'Abdul Majeed', cnic: '35201-1476476-3', contact: '0300-8810638', vrn: 'LE-13-6175' },
  { name: 'Zaman Iqbal', cnic: '35201-4820276-1', contact: '0305-4624800', vrn: 'LEB-09-9731' },
  { name: 'Adnan Ashraf', cnic: '35202-8655517-7', contact: '0323-1417018', vrn: 'LEA-17-5122' },
  { name: 'Muhammad Imran', cnic: '35201-0719801-7', contact: '0321-7846074', vrn: 'LED-16-9479' },
  { name: 'Muhammad Umar', cnic: '35202-2976037-5', contact: '0311-4706211', vrn: 'LEH-17-9662' },
  { name: 'Shahid Butt', cnic: '35202-6490058-5', contact: '0320-0049069', vrn: 'LEF-13-6821' },
  { name: 'Muhammad Ishaq', cnic: '35201-6314298-5', contact: '0322-8818812', vrn: 'LE-14-1467' },
  { name: 'Ahsan Ali', cnic: '35201-7513518-5', contact: '0321-4126829', vrn: 'AJV-498' },
  { name: 'Muhammad Mubeen Afzal', cnic: '35201-8683538-9', contact: '0324-6268277', vrn: 'LED-15-7835' },
  { name: 'Muhammad Waseem Nawaz', cnic: '35202-5863109-1', contact: '0307-8891946', vrn: 'LED-16-8116' },
  { name: 'Asif Latif', cnic: '35202-6280798-3', contact: '0332-4455307', vrn: 'LEA-17-2851' }
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

function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  return phone.replace(/[-\s]/g, '');
}

async function populateSafecityDriversVrn() {
  console.log('🔄 Populating LHE-Safecity-Drivers with VRN and missing data...\n');
  
  // Get all LHE-Safecity-Drivers employees
  const safecityDrivers = await db.select().from(employeeRecords)
    .where(and(
      eq(employeeRecords.department, 'LHE-Safecity-Drivers'),
      eq(employeeRecords.isActive, true)
    ));
  
  console.log(`📋 Found ${safecityDrivers.length} LHE-Safecity-Drivers employees in database`);
  console.log(`📋 Found ${safecityDriversVrnData.length} employees with VRN and comprehensive data`);
  
  // Show current employees with missing data
  console.log('\n📋 Current LHE-Safecity-Drivers employees:');
  safecityDrivers.forEach(emp => {
    const missingFields = [];
    if (!emp.nationalId) missingFields.push('CNIC');
    if (!emp.phone) missingFields.push('Phone');
    if (!emp.vrn) missingFields.push('VRN');
    if (!emp.designation) missingFields.push('Designation');
    
    console.log(`  - ${emp.employeeCode}: ${emp.firstName} ${emp.lastName}`);
    console.log(`    Current CNIC: ${emp.nationalId || 'MISSING'} | Phone: ${emp.phone || 'MISSING'} | VRN: ${emp.vrn || 'MISSING'}`);
    console.log(`    Missing fields: ${missingFields.length > 0 ? missingFields.join(', ') : 'None'}`);
  });
  
  const exactCnicMatches: any[] = [];
  const exactNameMatches: any[] = [];
  const nearMatches: any[] = [];
  const noMatches: any[] = [];
  
  for (const csvEmployee of safecityDriversVrnData) {
    const csvCnicNormalized = normalizeCNIC(csvEmployee.cnic);
    const csvNameNormalized = normalizeNameForMatching(csvEmployee.name);
    
    // Check for exact CNIC match first (most reliable)
    if (csvCnicNormalized) {
      const cnicMatch = safecityDrivers.find(emp => {
        const dbCnicNormalized = normalizeCNIC(emp.nationalId || '');
        return dbCnicNormalized === csvCnicNormalized && dbCnicNormalized !== '';
      });
      
      if (cnicMatch) {
        exactCnicMatches.push({
          csvData: csvEmployee,
          employee: cnicMatch,
          matchType: 'EXACT_CNIC'
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
  
  console.log('\n📊 LHE-Safecity-Drivers VRN Match Analysis Results:');
  console.log(`✅ Exact CNIC matches: ${exactCnicMatches.length}`);
  console.log(`✅ Exact name matches: ${exactNameMatches.length}`);
  console.log(`⚠️  Near matches requiring approval: ${nearMatches.length}`);
  console.log(`❌ No matches found: ${noMatches.length}`);
  
  // Auto-approve exact matches
  const approvedMatches = [...exactCnicMatches, ...exactNameMatches];
  
  if (exactCnicMatches.length > 0) {
    console.log('\n✅ EXACT CNIC MATCHES (Auto-approve):');
    exactCnicMatches.forEach(match => {
      console.log(`  - ${match.employee.employeeCode}: "${match.employee.firstName} ${match.employee.lastName}" <- "${match.csvData.name}"`);
      console.log(`    CNIC: ${match.csvData.cnic} | Contact: ${match.csvData.contact} | VRN: ${match.csvData.vrn}`);
    });
  }
  
  if (exactNameMatches.length > 0) {
    console.log('\n✅ EXACT NAME MATCHES (Auto-approve):');
    exactNameMatches.forEach(match => {
      console.log(`  - ${match.employee.employeeCode}: "${match.employee.firstName} ${match.employee.lastName}" <- "${match.csvData.name}"`);
      console.log(`    CNIC: ${match.csvData.cnic} | Contact: ${match.csvData.contact} | VRN: ${match.csvData.vrn}`);
    });
  }
  
  if (nearMatches.length > 0) {
    console.log('\n⚠️  NEAR MATCHES (Require Authorization):');
    nearMatches.forEach(match => {
      console.log(`  - ${match.employee.employeeCode}: "${match.employee.firstName} ${match.employee.lastName}" <- "${match.csvData.name}" (${match.similarity}%)`);
      console.log(`    CSV CNIC: ${match.csvData.cnic} | DB CNIC: ${match.employee.nationalId || 'MISSING'}`);
      console.log(`    VRN: ${match.csvData.vrn} | Contact: ${match.csvData.contact}`);
    });
  }
  
  if (noMatches.length > 0) {
    console.log('\n❌ NO MATCHES FOUND:');
    noMatches.forEach(match => {
      console.log(`  - "${match.csvData.name}" | CNIC: ${match.csvData.cnic} | VRN: ${match.csvData.vrn}`);
    });
  }
  
  // Update approved matches with VRN and comprehensive data
  if (approvedMatches.length > 0) {
    console.log('\n🔄 Updating approved matches with VRN and comprehensive data...');
    
    let updateCount = 0;
    let errorCount = 0;
    const results: any[] = [];
    
    for (const match of approvedMatches) {
      try {
        console.log(`🔄 Updating ${match.employee.employeeCode}...`);
        
        // Normalize data
        const normalizedCnic = normalizeCNIC(match.csvData.cnic);
        const normalizedPhone = normalizePhoneNumber(match.csvData.contact);
        const vrn = match.csvData.vrn;
        
        // Prepare update data
        const updateData: any = {
          updatedAt: new Date()
        };
        
        // Update CNIC if missing or different
        if (!match.employee.nationalId && normalizedCnic) {
          updateData.nationalId = normalizedCnic;
        }
        
        // Update phone if missing or different
        if (!match.employee.phone && normalizedPhone) {
          updateData.phone = normalizedPhone;
        }
        
        // Update VRN if missing or different
        if (!match.employee.vrn && vrn) {
          updateData.vrn = vrn;
        }
        
        // Only update if there are changes
        if (Object.keys(updateData).length > 1) { // More than just updatedAt
          // Update employee record
          await db.update(employeeRecords)
            .set(updateData)
            .where(eq(employeeRecords.id, match.employee.id));
          
          updateCount++;
          
          results.push({
            employeeCode: match.employee.employeeCode,
            name: `${match.employee.firstName} ${match.employee.lastName}`,
            cnic: normalizedCnic,
            phone: normalizedPhone,
            vrn: vrn,
            fieldsUpdated: Object.keys(updateData).filter(key => key !== 'updatedAt')
          });
          
          console.log(`   ✅ Updated: ${match.employee.firstName} ${match.employee.lastName}`);
          console.log(`      CNIC: ${normalizedCnic} | Phone: ${normalizedPhone} | VRN: ${vrn}`);
        } else {
          console.log(`   ⚠️  No updates needed for ${match.employee.firstName} ${match.employee.lastName} - all fields already populated`);
        }
        
      } catch (error) {
        console.log(`   ❌ Error updating ${match.employee.employeeCode}: ${error}`);
        errorCount++;
      }
      console.log('');
    }
    
    console.log('\n📊 LHE-Safecity-Drivers VRN Update Summary:');
    console.log(`✅ Successfully updated: ${updateCount}/${approvedMatches.length} employees`);
    console.log(`❌ Errors: ${errorCount}`);
    
    if (results.length > 0) {
      console.log('\n✅ Updated LHE-Safecity-Drivers employees with VRN and comprehensive data:');
      results.forEach(result => {
        console.log(`  - ${result.employeeCode}: ${result.name}`);
        console.log(`    CNIC: ${result.cnic} | Phone: ${result.phone} | VRN: ${result.vrn}`);
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
  const withCnics = finalDrivers.filter(emp => emp.nationalId && emp.nationalId !== '').length;
  const withPhones = finalDrivers.filter(emp => emp.phone && emp.phone !== '').length;
  const withVrns = finalDrivers.filter(emp => emp.vrn && emp.vrn !== '').length;
  const withDesignations = finalDrivers.filter(emp => emp.designation && emp.designation !== '').length;
  
  console.log('\n📊 Final LHE-Safecity-Drivers Coverage:');
  console.log(`   Total employees: ${total}`);
  console.log(`   With CNICs: ${withCnics} (${Math.round((withCnics / total) * 100)}%)`);
  console.log(`   With phone numbers: ${withPhones} (${Math.round((withPhones / total) * 100)}%)`);
  console.log(`   With VRNs: ${withVrns} (${Math.round((withVrns / total) * 100)}%)`);
  console.log(`   With designations: ${withDesignations} (${Math.round((withDesignations / total) * 100)}%)`);
  
  // Show employees still missing data
  const missingData = finalDrivers.filter(emp => 
    !emp.nationalId || !emp.phone || !emp.vrn || !emp.designation
  );
  
  if (missingData.length > 0) {
    console.log('\n⚠️  Employees still missing data:');
    missingData.forEach(emp => {
      const missing = [];
      if (!emp.nationalId) missing.push('CNIC');
      if (!emp.phone) missing.push('Phone');
      if (!emp.vrn) missing.push('VRN');
      if (!emp.designation) missing.push('Designation');
      
      console.log(`  - ${emp.employeeCode}: ${emp.firstName} ${emp.lastName} (Missing: ${missing.join(', ')})`);
    });
  }
  
  console.log('\n🎯 LHE-Safecity-Drivers VRN and comprehensive data population completed!');
  console.log('📈 Vehicle Registration Numbers now available for fleet management!');
}

populateSafecityDriversVrn().catch(console.error);