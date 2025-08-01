import { db } from './db';
import { employeeRecords } from '../shared/schema';
import { eq } from 'drizzle-orm';

// Comprehensive SafeCity-LHR data from the detailed spreadsheet
const comprehensiveSafecityData = [
  // First table data
  { name: "Muhammad Raza", designation: "Helper", subDepartment: "OFC", cnic: "35202-1581256-7", joiningDate: "01-JUNE-2024" },
  { name: "Muhammad Zeeshan", designation: "Helper", subDepartment: "OFC", cnic: "35201-6705787-5", joiningDate: "01-JUNE-2024" },
  { name: "Muhammad Awais Raza", designation: "Helper", subDepartment: "OFC", cnic: "35201-6957935-5", joiningDate: "01-JUNE-2024" },
  { name: "Muhammad Ahmad Nisar", designation: "Helper", subDepartment: "OFC", cnic: "35201-8347683-3", joiningDate: "01-JUNE-2024" },
  { name: "Muhammad Amir Bilal", designation: "Helper", subDepartment: "OFC", cnic: "38102-9423859-3", joiningDate: "01-JUNE-2024" },
  { name: "Muhammad Ali", designation: "Helper", subDepartment: "OFC", cnic: "35301-9412247-5", joiningDate: "01-JULY-2024" },
  { name: "Muhammad Ahmed", designation: "Helper", subDepartment: "OFC", cnic: "35201-1002137-5", joiningDate: "01-JULY-2024" },
  { name: "Shoaib Yousef", designation: "Helper", subDepartment: "OFC", cnic: "35202-8527075-1", joiningDate: "01-JULY-2024" },
  { name: "Muhammad Awais", designation: "Technician", subDepartment: "OFC", cnic: "35202-2233003-5", joiningDate: "01-JULY-2024" },
  { name: "Ahtisham Ul Haq Qadri", designation: "Technician", subDepartment: "OFC", cnic: "82102-6830252-3", joiningDate: "01-JULY-2024" },
  { name: "Adnan Ali", designation: "Helper", subDepartment: "PMU", cnic: "31102-4883633-5", joiningDate: "01-SEP-2024" },
  { name: "Muhammad Ahmad Ali", designation: "Helper", subDepartment: "PMU", cnic: "35201-5576240-7", joiningDate: "20-AUG-2024" },
  { name: "Raheel", designation: "Office Boy", subDepartment: "PMU", cnic: "35202-7464270-9", joiningDate: "01-AUG-2024" },
  { name: "Syed Hadi Abbas Naqvi", designation: "Supervisor", subDepartment: "LESCO", cnic: "35202-5310356-5", joiningDate: "01-AUG-2024" },
  { name: "Muhammad Noman Akram", designation: "Coordinator (Safe City O & M Infra)", subDepartment: "PMU", cnic: "33102-3999725-1", joiningDate: "01-SEP-2024" },
  { name: "Umer Farooq", designation: "Helper", subDepartment: "CAMERA", cnic: "35202-6550596-7", joiningDate: "19-AUG-2024" },
  { name: "Asrar Ahmad", designation: "Helper", subDepartment: "OFC", cnic: "35202-7778932-5", joiningDate: "01-JAN-2025" },
  { name: "Qaiser Bhatti", designation: "Helper", subDepartment: "OFC", cnic: "35201-6301020-1", joiningDate: "5-SEP-2024" },
  { name: "Muhammad Qasim", designation: "Helper", subDepartment: "OFC", cnic: "36102-0568717-3", joiningDate: "17-DEC-2024" },

  // Second table data
  { name: "Fahad Manan", designation: "Senior Team Lead - PSCA - LHR", subDepartment: "PMU", cnic: "37405-6461178-9", joiningDate: "17-MARCH-2025" },
  { name: "Muhammad Tauqeer", designation: "Helper", subDepartment: "OFC", cnic: "35201-9263240-9", joiningDate: "01-JUNE-2024" },
  { name: "M. Fayyaz", designation: "Team Lead", subDepartment: "CAMERA", cnic: "35202-3504400-3", joiningDate: "01-JULY-2024" },
  { name: "Adeel Ahmed", designation: "Helper", subDepartment: "CAMERA", cnic: "41204-9839414-1", joiningDate: "01-JULY-2024" },
  { name: "M. Luqman", designation: "Helper", subDepartment: "CAMERA", cnic: "36104-0058315-1", joiningDate: "01-JULY-2024" },
  { name: "Sobia Shahzad", designation: "Helper", subDepartment: "CAMERA", cnic: "35201-4006104-2", joiningDate: "01-JULY-2024" },
  { name: "Izhar Mahmood", designation: "Helper", subDepartment: "CAMERA", cnic: "35201-9734748-9", joiningDate: "01-JULY-2024" },
  { name: "Ali Raza", designation: "Helper", subDepartment: "CAMERA", cnic: "35602-3047776-9", joiningDate: "01-JULY-2024" },
  { name: "Zeeshan Ali", designation: "Electrician", subDepartment: "CAMERA", cnic: "34503-0357598-3", joiningDate: "01-JULY-2024" },
  { name: "Waqar Ahmad", designation: "Helper", subDepartment: "CAMERA", cnic: "35202-7643390-3", joiningDate: "01-JULY-2024" },
  { name: "Syed Qamar Abbas Naqvi", designation: "Helper", subDepartment: "CAMERA", cnic: "35201-5772601-5", joiningDate: "01-JULY-2024" },
  { name: "Shahryar Shabir", designation: "Helper", subDepartment: "CAMERA", cnic: "35201-4581461-9", joiningDate: "01-JULY-2024" },
  { name: "Faisal Jamal", designation: "Helper", subDepartment: "CAMERA", cnic: "35201-6507748-1", joiningDate: "01-JULY-2024" },
  { name: "Abdul Rehman", designation: "Helper", subDepartment: "CAMERA", cnic: "35102-4754955-5", joiningDate: "01-JULY-2024" },
  { name: "Mujahid Ali", designation: "Helper", subDepartment: "CAMERA", cnic: "35202-8768167-5", joiningDate: "01-JULY-2024" },
  { name: "M. Aqeel Arshad", designation: "Helper", subDepartment: "TRAFFIC", cnic: "35201-8495517-9", joiningDate: "01-JULY-2024" },
  { name: "Adnan Shahzad", designation: "Helper", subDepartment: "CAMERA", cnic: "32203-6204618-9", joiningDate: "01-JULY-2024" },
  { name: "Jalil Jahangir", designation: "Helper", subDepartment: "CAMERA", cnic: "35202-6477889-7", joiningDate: "01-JULY-2024" },
  { name: "Muhammad Shakeel", designation: "Team Lead", subDepartment: "TRAFFIC", cnic: "33105-5108333-5", joiningDate: "01-JULY-2024" },
  { name: "Sunil Sharif", designation: "Helper", subDepartment: "TRAFFIC", cnic: "35202-2616462-1", joiningDate: "01-JULY-2024" },
  { name: "Malik Muhammad Rizwan", designation: "Helper", subDepartment: "TRAFFIC", cnic: "35202-4306238-9", joiningDate: "01-JULY-2024" },
  { name: "Shahid Mehmood", designation: "Helper", subDepartment: "TRAFFIC", cnic: "35202-7359953-1", joiningDate: "01-JULY-2024" },
  { name: "Zubair Farooq", designation: "Electrician", subDepartment: "TRAFFIC", cnic: "35202-4201563-7", joiningDate: "01-JULY-2024" },
  { name: "Fayaz Farhat", designation: "Electrician", subDepartment: "TRAFFIC", cnic: "35201-9983529-5", joiningDate: "01-JULY-2024" },
  { name: "Maqsood ur Rehman", designation: "Electrician", subDepartment: "TRAFFIC", cnic: "35201-1127335-5", joiningDate: "01-JULY-2024" },
  { name: "Muhammad Zohaib", designation: "Electrician", subDepartment: "TRAFFIC", cnic: "31102-9890475-1", joiningDate: "01-JULY-2024" },
  { name: "Naveed Ahmad", designation: "Helper", subDepartment: "TRAFFIC", cnic: "35201-6707226-7", joiningDate: "01-JULY-2024" },
  { name: "Khurram Shahzad", designation: "Electrician", subDepartment: "TRAFFIC", cnic: "35201-0760726-9", joiningDate: "01-JULY-2024" },
  { name: "Zan Ul Abidin", designation: "Helper", subDepartment: "TRAFFIC", cnic: "35201-4086179-3", joiningDate: "01-JULY-2024" },
  { name: "Zahid Iqbal", designation: "Technician", subDepartment: "OFC", cnic: "34301-0856641-7", joiningDate: "01-JULY-2024" },
  { name: "Ali Raza", designation: "Helper", subDepartment: "OFC", cnic: "35201-1176740-1", joiningDate: "01-JULY-2024" },
  { name: "Muhammad Ashfaq", designation: "Technician", subDepartment: "TRAFFIC", cnic: "35201-1537863-3", joiningDate: "01-SEP-2024" },
  { name: "Mubashir", designation: "Helper", subDepartment: "CAMERA", cnic: "36103-6946022-5", joiningDate: "19-AUG-2024" },
  { name: "Aseem", designation: "Helper", subDepartment: "CAMERA", cnic: "35201-8613250-9", joiningDate: "18-AUG-2024" },
  { name: "Muhammad Shahbaz", designation: "Helper", subDepartment: "LESCO", cnic: "35202-0392701-1", joiningDate: "16-AUG-2024" },
  { name: "MALIK FARRUKH IQBAL", designation: "State Executive", subDepartment: "PMU", cnic: "35201-6266712-9", joiningDate: "01-JUL-2024" },
  { name: "Abdullah", designation: "Helper", subDepartment: "CAMERA", cnic: "35102-0542858-1", joiningDate: "01-NOV-2024" },
  { name: "Ali Raza", designation: "Helper", subDepartment: "CAMERA", cnic: "33202-1474976-9", joiningDate: "01-NOV-2024" },
  { name: "Muhammad Nisar", designation: "Helper", subDepartment: "OFC", cnic: "35201-8653422-9", joiningDate: "06-DEC-2024" },
  { name: "Muhammad Adeeb Masood", designation: "Helper", subDepartment: "CAMERA", cnic: "37402-7552988-5", joiningDate: "01-JAN-2025" },
  { name: "Amjad Ali", designation: "Helper", subDepartment: "CAMERA", cnic: "35201-5503361-3", joiningDate: "01-JAN-2025" },
  { name: "Zeeshan Ali", designation: "Helper", subDepartment: "OFC", cnic: "35201-6114004-5", joiningDate: "08-FEB-2025" },
  { name: "Umar Daraz", designation: "Supervisor", subDepartment: "OFC", cnic: "36102-6292379-3", joiningDate: "24-AUG-2024" },
  { name: "Muhammad Aymal", designation: "Helper", subDepartment: "OFC", cnic: "36401-1814000-9", joiningDate: "01-JULY-2024" },

  // Third table data
  { name: "Khurram Shahzad Aslam", designation: "Technician-LT", subDepartment: "LESCO", cnic: "34102-3270850-5", joiningDate: "16-AUG-2024" }
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

function parseJoiningDate(dateStr: string): string {
  try {
    // Handle different date formats
    const formats = [
      /(\d{1,2})-([A-Z]{3,9})-(\d{4})/i,  // DD-MONTH-YYYY
      /(\d{1,2})-([A-Z]{3,9})-(\d{2})/i,  // DD-MONTH-YY
      /(\d{1,2})-([A-Z]{3,9})-(\d{4})/i   // DD-MONTH-YYYY
    ];
    
    const monthMap: { [key: string]: string } = {
      'JANUARY': '01', 'JAN': '01',
      'FEBRUARY': '02', 'FEB': '02',
      'MARCH': '03', 'MAR': '03',
      'APRIL': '04', 'APR': '04',
      'MAY': '05',
      'JUNE': '06', 'JUN': '06',
      'JULY': '07', 'JUL': '07',
      'AUGUST': '08', 'AUG': '08',
      'SEPTEMBER': '09', 'SEP': '09',
      'OCTOBER': '10', 'OCT': '10',
      'NOVEMBER': '11', 'NOV': '11',
      'DECEMBER': '12', 'DEC': '12'
    };
    
    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        const day = match[1].padStart(2, '0');
        const month = monthMap[match[2].toUpperCase()];
        let year = match[3];
        
        if (year.length === 2) {
          year = year.startsWith('2') ? '20' + year : '19' + year;
        }
        
        if (month) {
          return `${year}-${month}-${day}`;
        }
      }
    }
    
    return dateStr; // Return original if parsing fails
  } catch (error) {
    return dateStr;
  }
}

async function analyzeComprehensiveSafecityLhrMatches() {
  console.log('🔍 Analyzing comprehensive SafeCity-LHR employee matches...\n');
  
  const lheSafecityEmployees = await db.select().from(employeeRecords)
    .where(eq(employeeRecords.department, 'LHE-Safecity'));
  
  console.log(`📋 Found ${lheSafecityEmployees.length} LHE-Safecity employees in database`);
  console.log(`📋 Found ${comprehensiveSafecityData.length} employees in comprehensive SafeCity-LHR data`);
  
  const exactCnicMatches: any[] = [];
  const exactNameMatches: any[] = [];
  const nearMatches: any[] = [];
  const noMatches: any[] = [];
  
  for (const csvEmployee of comprehensiveSafecityData) {
    const csvCnicNormalized = normalizeCNIC(csvEmployee.cnic);
    const csvNameNormalized = normalizeNameForMatching(csvEmployee.name);
    
    // Check for exact CNIC match
    if (csvCnicNormalized) {
      const cnicMatch = lheSafecityEmployees.find(emp => {
        const dbCnicNormalized = normalizeCNIC(emp.nationalId || '');
        return dbCnicNormalized === csvCnicNormalized && dbCnicNormalized !== '';
      });
      
      if (cnicMatch) {
        exactCnicMatches.push({
          csvName: csvEmployee.name,
          dbName: `${cnicMatch.firstName} ${cnicMatch.lastName}`,
          employeeCode: cnicMatch.employeeCode,
          designation: csvEmployee.designation,
          subDepartment: csvEmployee.subDepartment,
          cnic: csvEmployee.cnic,
          joiningDate: parseJoiningDate(csvEmployee.joiningDate),
          matchType: 'EXACT_CNIC'
        });
        continue;
      }
    }
    
    // Check for exact name match
    const nameMatch = lheSafecityEmployees.find(emp => {
      const dbNameNormalized = normalizeNameForMatching(`${emp.firstName} ${emp.lastName}`);
      return dbNameNormalized === csvNameNormalized;
    });
    
    if (nameMatch) {
      exactNameMatches.push({
        csvName: csvEmployee.name,
        dbName: `${nameMatch.firstName} ${nameMatch.lastName}`,
        employeeCode: nameMatch.employeeCode,
        designation: csvEmployee.designation,
        subDepartment: csvEmployee.subDepartment,
        cnic: csvEmployee.cnic,
        joiningDate: parseJoiningDate(csvEmployee.joiningDate),
        matchType: 'EXACT_NAME'
      });
      continue;
    }
    
    // Check for near matches (similarity > 75%)
    const potentialMatches = lheSafecityEmployees.map(emp => {
      const dbNameNormalized = normalizeNameForMatching(`${emp.firstName} ${emp.lastName}`);
      const similarity = calculateNameSimilarity(csvEmployee.name, `${emp.firstName} ${emp.lastName}`);
      
      return {
        csvName: csvEmployee.name,
        dbName: `${emp.firstName} ${emp.lastName}`,
        employeeCode: emp.employeeCode,
        designation: csvEmployee.designation,
        subDepartment: csvEmployee.subDepartment,
        cnic: csvEmployee.cnic,
        joiningDate: parseJoiningDate(csvEmployee.joiningDate),
        dbCnic: emp.nationalId || 'N/A',
        similarity,
        matchType: 'NEAR_MATCH'
      };
    }).filter(match => match.similarity > 75)
      .sort((a, b) => b.similarity - a.similarity);
    
    if (potentialMatches.length > 0) {
      nearMatches.push(...potentialMatches.slice(0, 3)); // Top 3 matches
    } else {
      noMatches.push({
        csvName: csvEmployee.name,
        designation: csvEmployee.designation,
        subDepartment: csvEmployee.subDepartment,
        cnic: csvEmployee.cnic,
        joiningDate: parseJoiningDate(csvEmployee.joiningDate),
        matchType: 'NO_MATCH'
      });
    }
  }
  
  console.log('\n📊 Comprehensive SafeCity-LHR Match Analysis Results:');
  console.log(`✅ Exact CNIC matches: ${exactCnicMatches.length}`);
  console.log(`✅ Exact name matches: ${exactNameMatches.length}`);
  console.log(`⚠️  Near matches requiring approval: ${nearMatches.length}`);
  console.log(`❌ No matches found: ${noMatches.length}`);
  
  if (exactCnicMatches.length > 0) {
    console.log('\n✅ EXACT CNIC MATCHES (Auto-approve):');
    exactCnicMatches.forEach(match => {
      console.log(`  - ${match.employeeCode}: "${match.dbName}" <- "${match.csvName}"`);
      console.log(`    ${match.designation} | ${match.subDepartment} | ${match.joiningDate}`);
    });
  }
  
  if (exactNameMatches.length > 0) {
    console.log('\n✅ EXACT NAME MATCHES (Auto-approve):');
    exactNameMatches.forEach(match => {
      console.log(`  - ${match.employeeCode}: "${match.dbName}" <- "${match.csvName}"`);
      console.log(`    ${match.designation} | ${match.subDepartment} | ${match.joiningDate}`);
    });
  }
  
  if (nearMatches.length > 0) {
    console.log('\n⚠️  NEAR MATCHES (Require Authorization):');
    nearMatches.forEach(match => {
      console.log(`  - ${match.employeeCode}: "${match.dbName}" <- "${match.csvName}" (${match.similarity}%)`);
      console.log(`    ${match.designation} | ${match.subDepartment} | ${match.joiningDate}`);
      console.log(`    CSV CNIC: ${match.cnic} | DB CNIC: ${match.dbCnic}`);
      console.log('');
    });
  }
  
  if (noMatches.length > 0) {
    console.log('\n❌ NO MATCHES FOUND:');
    noMatches.forEach(match => {
      console.log(`  - "${match.csvName}" | ${match.designation} | ${match.subDepartment} | ${match.joiningDate}`);
    });
  }
  
  console.log('\n🎯 Comprehensive SafeCity-LHR analysis completed!');
  console.log('📝 Please review near matches and authorize updates before proceeding.');
}

analyzeComprehensiveSafecityLhrMatches().catch(console.error);