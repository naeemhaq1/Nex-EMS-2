import { db } from './db';
import { employeeRecords } from '../shared/schema';
import { eq, and } from 'drizzle-orm';

// Comprehensive LHE-Safecity-Drivers data from the provided image
const safecityDriversData = [
  {
    name: "Waqas Elahi",
    designation: "Driver-C",
    subDept: "Fiber",
    birthday: "6-Feb-84",
    contactNo: "03219244133332",
    cnic: "35201-5422278-5",
    homeAddress: "House # 19 Batian Street Mohalla Mustafabad Lahore Cant Lahore",
    contractDate: "24-Jan-24",
    contractMonths: "11",
    contractExpiryDate: "24-May-25"
  },
  {
    name: "Abdul Majeed",
    designation: "Driver-C",
    subDept: "Fiber",
    birthday: "7-Jun-82",
    contactNo: "03001-9610638",
    cnic: "35201-1-7664476-3",
    homeAddress: "H # 81 Street 1-A Block D Gul Bahar Road Baghbanpura Lahore Cant Lahore",
    contractDate: "24-Jan-24",
    contractMonths: "11",
    contractExpiryDate: "24-May-25"
  },
  {
    name: "Ahman Qasim",
    designation: "Driver-C",
    subDept: "Fiber",
    birthday: "9-May-94",
    contactNo: "03112-4769037-5",
    cnic: "35202-3097037-5",
    homeAddress: "H # 4 Street 3-A Shian Peco Colony Sagal Pura Lahore Cant Lahore",
    contractDate: "24-Jan-24",
    contractMonths: "11",
    contractExpiryDate: "24-May-25"
  },
  {
    name: "Muhammad Imran",
    designation: "Driver-C",
    subDept: "Fiber",
    birthday: "9-Mar-85",
    contactNo: "03217-6546074",
    cnic: "35201-0719801-7",
    homeAddress: "H # 110-G New Shahid Park Rassed Pura Road, Baghbanpura Lahore Cant Lahore",
    contractDate: "24-Jan-24",
    contractMonths: "11",
    contractExpiryDate: "24-May-25"
  },
  {
    name: "Arshad Naseem",
    designation: "Driver-C",
    subDept: "Fiber",
    birthday: "23-May-88",
    contactNo: "03016-4620600",
    cnic: "35201-4202747-1",
    homeAddress: "H # 279 Mujallahabad Nujahawans, Lahore",
    contractDate: "1-Jul-24",
    contractMonths: "11",
    contractExpiryDate: "1-Jun-25"
  },
  {
    name: "Adnan Ashraf",
    designation: "Driver-C",
    subDept: "Fiber",
    birthday: "12-Mar-88",
    contactNo: "03221-4117018",
    cnic: "35202-9650517-7",
    homeAddress: "H# 48, St 924 Gillani Colony, Opposite Gulshan-e-Ravi Lahore",
    contractDate: "1-Jul-24",
    contractMonths: "11",
    contractExpiryDate: "1-Jun-25"
  },
  {
    name: "Shahid Gill",
    designation: "Driver-C",
    subDept: "Fiber",
    birthday: "1-Jul-72",
    contactNo: "03200-0040059",
    cnic: "35202-4503045-5",
    homeAddress: "H# 10, St 15, Burfi Street, Bagh Gul Biagram, Movima Lahore",
    contractDate: "1-Jul-24",
    contractMonths: "11",
    contractExpiryDate: "1-Jun-25"
  },
  {
    name: "Ahsan Ali",
    designation: "Driver-C",
    subDept: "Fiber",
    birthday: "1-Aug-95",
    contactNo: "03001-4244840",
    cnic: "35201-7913318-5",
    homeAddress: "Missing",
    contractDate: "1-Jul-24",
    contractMonths: "11",
    contractExpiryDate: "1-Jun-25"
  },
  {
    name: "Muhammad Ishaq",
    designation: "Driver-C",
    subDept: "Fiber",
    birthday: "1-Jan-67",
    contactNo: "03222-5631812",
    cnic: "35201-6319294-5",
    homeAddress: "Street 5, Baghbanpura, Peco Road, Kotakpind Lahore",
    contractDate: "1-Jul-24",
    contractMonths: "11",
    contractExpiryDate: "1-Jun-25"
  },
  {
    name: "Mudassar Javaid",
    designation: "Driver-C",
    subDept: "Traffic",
    birthday: "15-Aug-88",
    contactNo: "03334-4470853",
    cnic: "35202-6928647-7",
    homeAddress: "H # 4 Street 4 Mohalla Majid Road Union Park Samnabad Lahore",
    contractDate: "1-Jul-24",
    contractMonths: "11",
    contractExpiryDate: "1-Jun-25"
  },
  {
    name: "Muhammad Umran",
    designation: "Driver-C",
    subDept: "Traffic",
    birthday: "21-Dec-88",
    contactNo: "03010-0447693",
    cnic: "35202-5524459-7",
    homeAddress: "H # 4 Street 3 Mohalla Noor Colony Sagal Pura Lahore Cant Lahore",
    contractDate: "1-Jul-24",
    contractMonths: "11",
    contractExpiryDate: "1-Jun-25"
  },
  {
    name: "Abdul Samad",
    designation: "Driver-C",
    subDept: "Traffic",
    birthday: "29-Sep-86",
    contactNo: "03006-3754524",
    cnic: "35201-5064452-9",
    homeAddress: "H # 6 Street 6 Mohalla Noor Colony Sagal Pura Lahore Cant Lahore",
    contractDate: "1-Jul-24",
    contractMonths: "11",
    contractExpiryDate: "1-Jun-25"
  },
  {
    name: "Sarfraz Hussain",
    designation: "Driver-C",
    subDept: "Camera",
    birthday: "6-Feb-82",
    contactNo: "03081-5130701",
    cnic: "3110-1-3498384-9",
    homeAddress: "Chak Mega Naam Tehsil & District Bahawalingar",
    contractDate: "1-Aug-24",
    contractMonths: "11",
    contractExpiryDate: "1-Jul-25"
  },
  {
    name: "Syed Hussain Haider",
    designation: "Driver-C",
    subDept: "Camera",
    birthday: "7-Jul-87",
    contactNo: "03191-0047593",
    cnic: "3560-1-0129530-5",
    homeAddress: "Mouza Waliy, P/O Khichiwanm, Ramazan Sahib, Tehsil & District Nankana Sahib",
    contractDate: "1-Jul-24",
    contractMonths: "11",
    contractExpiryDate: "1-Jun-25"
  },
  {
    name: "Muhammad Khan",
    designation: "Driver-C",
    subDept: "Camera",
    birthday: "8-Apr-78",
    contactNo: "03234-5520270",
    cnic: "3720-3-4618652-5",
    homeAddress: "Dhok Jhumba Daak Khana Khaas, Tilla Gurig, Tehsil Chakwal",
    contractDate: "1-Jul-24",
    contractMonths: "11",
    contractExpiryDate: "1-Jun-25"
  },
  {
    name: "Sajid Ali",
    designation: "Driver-C",
    subDept: "Camera",
    birthday: "29-Aug-87",
    contactNo: "03094-2003390",
    cnic: "3520-3-1787803-5",
    homeAddress: "H # 29 near Gala Qasai Mohalla Qasim Pura Lahore",
    contractDate: "1-Jul-24",
    contractMonths: "11",
    contractExpiryDate: "1-Jun-25"
  }
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

function parseBirthday(birthdayStr: string): Date | null {
  try {
    // Handle formats like "6-Feb-84", "7-Jun-82", etc.
    const monthMap: { [key: string]: string } = {
      'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
      'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    };
    
    const parts = birthdayStr.split('-');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = monthMap[parts[1]] || parts[1];
      let year = parts[2];
      
      // Convert 2-digit year to 4-digit
      if (year.length === 2) {
        const yearNum = parseInt(year);
        year = yearNum > 50 ? `19${year}` : `20${year}`;
      }
      
      return new Date(`${year}-${month}-${day}`);
    }
    
    return null;
  } catch (error) {
    console.log(`Error parsing birthday: ${birthdayStr}`, error);
    return null;
  }
}

function parseContractDate(dateStr: string): Date | null {
  try {
    // Handle formats like "24-Jan-24", "1-Jul-24"
    const monthMap: { [key: string]: string } = {
      'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
      'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    };
    
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = monthMap[parts[1]] || parts[1];
      let year = parts[2];
      
      // Convert 2-digit year to 4-digit
      if (year.length === 2) {
        const yearNum = parseInt(year);
        year = yearNum > 50 ? `19${year}` : `20${year}`;
      }
      
      return new Date(`${year}-${month}-${day}`);
    }
    
    return null;
  } catch (error) {
    console.log(`Error parsing contract date: ${dateStr}`, error);
    return null;
  }
}

function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  // Remove any non-digit characters and ensure Pakistani format
  let normalized = phone.replace(/\D/g, '');
  
  // Handle Pakistani mobile numbers (should be 11 digits starting with 03)
  if (normalized.length === 11 && normalized.startsWith('03')) {
    return normalized;
  }
  
  return phone; // Return original if can't normalize
}

async function populateSafecityDriversComprehensive() {
  console.log('🔄 Populating LHE-Safecity-Drivers comprehensive data...\n');
  
  // Get all LHE-Safecity-Drivers employees
  const safecityDrivers = await db.select().from(employeeRecords)
    .where(and(
      eq(employeeRecords.department, 'LHE-Safecity-Drivers'),
      eq(employeeRecords.isActive, true)
    ));
  
  console.log(`📋 Found ${safecityDrivers.length} LHE-Safecity-Drivers employees in database`);
  console.log(`📋 Found ${safecityDriversData.length} employees with comprehensive data`);
  
  // Show current employees
  console.log('\n📋 Current LHE-Safecity-Drivers employees:');
  safecityDrivers.forEach(emp => {
    console.log(`  - ${emp.employeeCode}: ${emp.firstName} ${emp.lastName} (CNIC: ${emp.nationalId || 'N/A'})`);
  });
  
  const exactCnicMatches: any[] = [];
  const exactNameMatches: any[] = [];
  const nearMatches: any[] = [];
  const noMatches: any[] = [];
  
  for (const csvEmployee of safecityDriversData) {
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
  
  console.log('\n📊 LHE-Safecity-Drivers Match Analysis Results:');
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
      console.log(`    Designation: ${match.csvData.designation} | Sub-Dept: ${match.csvData.subDept}`);
      console.log(`    CNIC: ${match.csvData.cnic} | Birthday: ${match.csvData.birthday}`);
      console.log(`    Contact: ${match.csvData.contactNo}`);
      console.log(`    Address: ${match.csvData.homeAddress}`);
      console.log(`    Contract: ${match.csvData.contractDate} to ${match.csvData.contractExpiryDate} (${match.csvData.contractMonths} months)`);
    });
  }
  
  if (exactNameMatches.length > 0) {
    console.log('\n✅ EXACT NAME MATCHES (Auto-approve):');
    exactNameMatches.forEach(match => {
      console.log(`  - ${match.employee.employeeCode}: "${match.employee.firstName} ${match.employee.lastName}" <- "${match.csvData.name}"`);
      console.log(`    Designation: ${match.csvData.designation} | Sub-Dept: ${match.csvData.subDept}`);
      console.log(`    CNIC: ${match.csvData.cnic} | Birthday: ${match.csvData.birthday}`);
      console.log(`    Contact: ${match.csvData.contactNo}`);
      console.log(`    Address: ${match.csvData.homeAddress}`);
      console.log(`    Contract: ${match.csvData.contractDate} to ${match.csvData.contractExpiryDate} (${match.csvData.contractMonths} months)`);
    });
  }
  
  if (nearMatches.length > 0) {
    console.log('\n⚠️  NEAR MATCHES (Require Authorization):');
    nearMatches.forEach(match => {
      console.log(`  - ${match.employee.employeeCode}: "${match.employee.firstName} ${match.employee.lastName}" <- "${match.csvData.name}" (${match.similarity}%)`);
      console.log(`    Designation: ${match.csvData.designation} | Sub-Dept: ${match.csvData.subDept}`);
      console.log(`    CSV CNIC: ${match.csvData.cnic} | DB CNIC: ${match.employee.nationalId || 'N/A'}`);
      console.log(`    Contact: ${match.csvData.contactNo} | Birthday: ${match.csvData.birthday}`);
    });
  }
  
  if (noMatches.length > 0) {
    console.log('\n❌ NO MATCHES FOUND:');
    noMatches.forEach(match => {
      console.log(`  - "${match.csvData.name}" (${match.csvData.designation})`);
      console.log(`    CNIC: ${match.csvData.cnic} | Contact: ${match.csvData.contactNo}`);
      console.log(`    Address: ${match.csvData.homeAddress}`);
    });
  }
  
  // Update approved matches with comprehensive data
  if (approvedMatches.length > 0) {
    console.log('\n🔄 Updating approved matches with comprehensive data...');
    
    let updateCount = 0;
    let errorCount = 0;
    const results: any[] = [];
    
    for (const match of approvedMatches) {
      try {
        console.log(`🔄 Updating ${match.employee.employeeCode}...`);
        
        // Parse dates
        const birthday = parseBirthday(match.csvData.birthday);
        const contractDate = parseContractDate(match.csvData.contractDate);
        const contractExpiryDate = parseContractDate(match.csvData.contractExpiryDate);
        
        // Normalize data
        const normalizedCnic = normalizeCNIC(match.csvData.cnic);
        const normalizedPhone = normalizePhoneNumber(match.csvData.contactNo);
        
        console.log(`   Debug: CNIC length: ${normalizedCnic.length}, Phone length: ${normalizedPhone.length}`);
        
        // Prepare update data
        const updateData: any = {
          designation: match.csvData.designation,
          subDepartment: match.csvData.subDept,
          updatedAt: new Date()
        };
        
        // Only update fields if they're empty or different
        if (!match.employee.nationalId && normalizedCnic) {
          updateData.nationalId = normalizedCnic;
        }
        
        if (!match.employee.phone && normalizedPhone) {
          updateData.phone = normalizedPhone;
        }
        
        if (!match.employee.birthday && birthday) {
          updateData.birthday = birthday;
        }
        
        if (!match.employee.address && match.csvData.homeAddress !== 'Missing') {
          updateData.address = match.csvData.homeAddress;
        }
        
        if (!match.employee.contractDate && contractDate) {
          updateData.contractDate = contractDate;
        }
        
        if (!match.employee.contractExpiryDate && contractExpiryDate) {
          updateData.contractExpiryDate = contractExpiryDate;
        }
        
        if (!match.employee.contractTerm && match.csvData.contractMonths) {
          updateData.contractTerm = `${match.csvData.contractMonths} months`;
        }
        
        // Update employee record
        await db.update(employeeRecords)
          .set(updateData)
          .where(eq(employeeRecords.id, match.employee.id));
        
        updateCount++;
        
        results.push({
          employeeCode: match.employee.employeeCode,
          name: `${match.employee.firstName} ${match.employee.lastName}`,
          designation: match.csvData.designation,
          subDepartment: match.csvData.subDept,
          cnic: normalizedCnic,
          phone: normalizedPhone,
          birthday: match.csvData.birthday,
          address: match.csvData.homeAddress,
          contractDate: match.csvData.contractDate,
          contractExpiryDate: match.csvData.contractExpiryDate,
          contractTerm: `${match.csvData.contractMonths} months`
        });
        
        console.log(`   ✅ Updated: ${match.employee.firstName} ${match.employee.lastName}`);
        console.log(`      Designation: ${match.csvData.designation} | Sub-Dept: ${match.csvData.subDept}`);
        console.log(`      CNIC: ${normalizedCnic} | Phone: ${normalizedPhone}`);
        console.log(`      Birthday: ${match.csvData.birthday} | Address: ${match.csvData.homeAddress}`);
        console.log(`      Contract: ${match.csvData.contractDate} to ${match.csvData.contractExpiryDate}`);
        
      } catch (error) {
        console.log(`   ❌ Error updating ${match.employee.employeeCode}: ${error}`);
        errorCount++;
      }
      console.log('');
    }
    
    console.log('\n📊 LHE-Safecity-Drivers Comprehensive Update Summary:');
    console.log(`✅ Successfully updated: ${updateCount}/${approvedMatches.length} employees`);
    console.log(`❌ Errors: ${errorCount}`);
    
    if (results.length > 0) {
      console.log('\n✅ Updated LHE-Safecity-Drivers employees with comprehensive data:');
      results.forEach(result => {
        console.log(`  - ${result.employeeCode}: ${result.name}`);
        console.log(`    Designation: ${result.designation} | Sub-Dept: ${result.subDepartment}`);
        console.log(`    CNIC: ${result.cnic} | Phone: ${result.phone}`);
        console.log(`    Birthday: ${result.birthday} | Contract: ${result.contractTerm}`);
        console.log(`    Address: ${result.address}`);
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
  const withDesignations = finalDrivers.filter(emp => emp.designation && emp.designation !== '').length;
  const withCnics = finalDrivers.filter(emp => emp.nationalId && emp.nationalId !== '').length;
  const withPhones = finalDrivers.filter(emp => emp.phone && emp.phone !== '').length;
  const withBirthdays = finalDrivers.filter(emp => emp.birthday).length;
  const withAddresses = finalDrivers.filter(emp => emp.address && emp.address !== '').length;
  const withContracts = finalDrivers.filter(emp => emp.contractDate).length;
  
  console.log('\n📊 Final LHE-Safecity-Drivers Coverage:');
  console.log(`   Total employees: ${total}`);
  console.log(`   With designations: ${withDesignations} (${Math.round((withDesignations / total) * 100)}%)`);
  console.log(`   With CNICs: ${withCnics} (${Math.round((withCnics / total) * 100)}%)`);
  console.log(`   With phone numbers: ${withPhones} (${Math.round((withPhones / total) * 100)}%)`);
  console.log(`   With birthdays: ${withBirthdays} (${Math.round((withBirthdays / total) * 100)}%)`);
  console.log(`   With addresses: ${withAddresses} (${Math.round((withAddresses / total) * 100)}%)`);
  console.log(`   With contract data: ${withContracts} (${Math.round((withContracts / total) * 100)}%)`);
  
  console.log('\n🎯 LHE-Safecity-Drivers comprehensive data population completed!');
  console.log('📈 Department transformed from 0% to comprehensive coverage with all employee details!');
}

populateSafecityDriversComprehensive().catch(console.error);