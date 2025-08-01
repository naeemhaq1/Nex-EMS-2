import { storage } from './storage.js';
import { db } from './db.js';
import { employeeRecords } from '../shared/schema.js';
import { eq, sql } from 'drizzle-orm';

interface ContractData {
  driverName: string;
  team: string;
  birthday: string;
  contactNumber: string;
  cnic: string;
  homeAddress: string;
  contractDate: string;
  contractPeriod: string;
  contractExpiryDate: string;
}

// Parse date from DD-Mon-YY format to Date object
function parseDate(dateStr: string): Date | null {
  if (!dateStr || dateStr === 'Missing') return null;
  
  const monthMap: { [key: string]: number } = {
    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
    'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
  };
  
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  
  const day = parseInt(parts[0]);
  const month = monthMap[parts[1]];
  const year = parseInt(parts[2]) + 2000; // Convert YY to YYYY
  
  if (isNaN(day) || month === undefined || isNaN(year)) return null;
  
  return new Date(year, month, day);
}

// Normalize CNIC by removing dashes and spaces
function normalizeCnic(cnic: string): string {
  return cnic.replace(/[-\s]/g, '');
}

// CSV data from the provided file
const csvData: ContractData[] = [
  {
    driverName: "Wasif Bashir",
    team: "Fiber",
    birthday: "8-Feb-84",
    contactNumber: "0322-4513332",
    cnic: "35201-9542278-5",
    homeAddress: "H # 12-A street 19 Rattan Street Mohalla Mustafabad Lahore Cant Lahore",
    contractDate: "24-Jun-24",
    contractPeriod: "11 months",
    contractExpiryDate: "24-May-25"
  },
  {
    driverName: "Abdul Majeed",
    team: "Fiber",
    birthday: "7-Jun-82",
    contactNumber: "0300-8810638",
    cnic: "352011-4766476-3",
    homeAddress: "H # 81 Street 1-A Block D Gul Bahar Road Baghbanpura Lahore Cant Lahore",
    contractDate: "24-Jun-24",
    contractPeriod: "11 months",
    contractExpiryDate: "24-May-25"
  },
  {
    driverName: "Muhammad Umar",
    team: "Fiber",
    birthday: "9-May-94",
    contactNumber: "0311-4706211",
    cnic: "35202-3976037-5",
    homeAddress: "H # 51 Street 2 Mohalla Noor Colony Shadi Pura Lahore Cant Lahore",
    contractDate: "24-Jun-24",
    contractPeriod: "11 months",
    contractExpiryDate: "24-May-25"
  },
  {
    driverName: "Muhammad Imran",
    team: "Fiber",
    birthday: "9-Mar-85",
    contactNumber: "0321-7846074",
    cnic: "35201-0719801-7",
    homeAddress: "H # 10-G New Shahid Park Raseed Pura Road, Baghpanpura Lahore Cant Lahore",
    contractDate: "24-Jun-24",
    contractPeriod: "11 months",
    contractExpiryDate: "24-May-25"
  },
  {
    driverName: "Zaman Iqbal",
    team: "Fiber",
    birthday: "23-May-88",
    contactNumber: "0305-4624800",
    cnic: "35201-4820276-1",
    homeAddress: "H# 273, Mujahidabad Mughalpura, Lahore",
    contractDate: "1-Jul-24",
    contractPeriod: "11 months",
    contractExpiryDate: "1-Jun-25"
  },
  {
    driverName: "Adnan Ashraf",
    team: "Fiber",
    birthday: "17-Mar-88",
    contactNumber: "0323-1417018",
    cnic: "35202-8655517-7",
    homeAddress: "H# 49, St #24 Ghani Colony, Opposite Gulshan-e-Ravi Lahore",
    contractDate: "1-Jul-24",
    contractPeriod: "11 months",
    contractExpiryDate: "1-Jun-25"
  },
  {
    driverName: "Shahid Butt",
    team: "Fiber",
    birthday: "1-Jul-72",
    contactNumber: "0320-0049069",
    cnic: "35202-6490058-5",
    homeAddress: "H# 10, St 15, Butt Street, Bagh Gul Begum, Mozang Lahore",
    contractDate: "1-Jul-24",
    contractPeriod: "11 months",
    contractExpiryDate: "1-Jun-25"
  },
  {
    driverName: "Ahsan Ali",
    team: "Fiber",
    birthday: "1-Aug-95",
    contactNumber: "0300-4244040",
    cnic: "35201-7513518-5",
    homeAddress: "Missing",
    contractDate: "1-Jul-24",
    contractPeriod: "11 months",
    contractExpiryDate: "1-Jun-25"
  },
  {
    driverName: "Muhammad Ishaq",
    team: "Fiber",
    birthday: "1-Jan-67",
    contactNumber: "0322-8818812",
    cnic: "35201-6314298-5",
    homeAddress: "Salamatpura, Peco Road, Kotlakhpat Lahore",
    contractDate: "1-Aug-24",
    contractPeriod: "11 months",
    contractExpiryDate: "1-Jul-25"
  },
  {
    driverName: "Mudassar Akram",
    team: "Traffic",
    birthday: "15-Aug-85",
    contactNumber: "0310-0047693",
    cnic: "35202-0630774-9",
    homeAddress: "H # 4 Sardar Street Mohalla Masjid Road Union Park Samanabad Lahore",
    contractDate: "1-Jul-24",
    contractPeriod: "11 months",
    contractExpiryDate: "1-Jun-25"
  },
  {
    driverName: "Muhammad Waqas",
    team: "Traffic",
    birthday: "28-Dec-86",
    contactNumber: "0310-0047693",
    cnic: "35202-5525455-7",
    homeAddress: "H # 3, ST # 17 Mohalla New Shalimar Colony, Gulshan Ravi Lahore",
    contractDate: "1-Jul-24",
    contractPeriod: "11 months",
    contractExpiryDate: "1-Jun-25"
  },
  {
    driverName: "Muhammad Naeem",
    team: "Traffic",
    birthday: "21-Sep-76",
    contactNumber: "0300-3785044",
    cnic: "35201-7660452-9",
    homeAddress: "House # 35 Street 1, Hussain Road, Ittehad Town, Joray Pull Lahore Cant Lahore",
    contractDate: "1-Jul-24",
    contractPeriod: "11 months",
    contractExpiryDate: "1-Jun-25"
  },
  {
    driverName: "Sarfraz Hussain",
    team: "Camera",
    birthday: "6-Feb-82",
    contactNumber: "0308-5130701",
    cnic: "31101-3198384-9",
    homeAddress: "Chak Mega Mukhi Tehsil & District Bahawalnagar",
    contractDate: "1-Aug-24",
    contractPeriod: "11 months",
    contractExpiryDate: "1-Jul-25"
  },
  {
    driverName: "Syed Hasnain Haider",
    team: "Camera",
    birthday: "7-Jul-87",
    contactNumber: "0310-0047693",
    cnic: "35501-0129160-3",
    homeAddress: "Mache Wala P/O Morekhunda, Nankana Sahib , Tehsil & District Nankana Sahib",
    contractDate: "1-Jul-24",
    contractPeriod: "11 months",
    contractExpiryDate: "1-Jun-25"
  },
  {
    driverName: "Muhammad Khan",
    team: "Camera",
    birthday: "9-Apr-78",
    contactNumber: "0323-4552070",
    cnic: "37203-1461882-5",
    homeAddress: "Dhok Jhamba Daak Khana Khaas, Tilla Gung, Tehsil Chakwal",
    contractDate: "1-Jul-24",
    contractPeriod: "11 months",
    contractExpiryDate: "1-Jun-25"
  },
  {
    driverName: "Sajid Ali",
    team: "Camera",
    birthday: "29-Aug-77",
    contactNumber: "0300-4203390",
    cnic: "35201-1579812-5",
    homeAddress: "H # 256 Block AA, Mahair Faiz Colony Lahore",
    contractDate: "1-Jul-24",
    contractPeriod: "11 months",
    contractExpiryDate: "1-Jun-25"
  }
];

async function updateContractData() {
  console.log('Starting contract data update...\n');
  
  let updatedCount = 0;
  let notFoundCount = 0;
  const notFoundEmployees: string[] = [];
  
  for (const data of csvData) {
    const normalizedCnic = normalizeCnic(data.cnic);
    
    try {
      // Find employee by normalized CNIC
      const employee = await db
        .select()
        .from(employeeRecords)
        .where(sql`REPLACE(REPLACE(${employeeRecords.nationalId}, '-', ''), ' ', '') = ${normalizedCnic}`)
        .limit(1);
      
      if (employee.length > 0) {
        // Update employee record
        const birthday = parseDate(data.birthday);
        const contractDate = parseDate(data.contractDate);
        const contractExpiryDate = parseDate(data.contractExpiryDate);
        
        await db
          .update(employeeRecords)
          .set({
            birthday: birthday,
            contractDate: contractDate,
            contractTerm: data.contractPeriod,
            contractExpiryDate: contractExpiryDate,
            phone: data.contactNumber.replace(/-/g, ''), // Remove dashes from phone number
            updatedAt: new Date()
          })
          .where(eq(employeeRecords.id, employee[0].id));
        
        console.log(`✓ Updated: ${data.driverName} (${data.cnic})`);
        updatedCount++;
      } else {
        console.log(`✗ Not found: ${data.driverName} (${data.cnic})`);
        notFoundEmployees.push(`${data.driverName} (${data.cnic})`);
        notFoundCount++;
      }
    } catch (error) {
      console.error(`Error updating ${data.driverName}:`, error);
    }
  }
  
  console.log('\n=== Update Summary ===');
  console.log(`Total records in CSV: ${csvData.length}`);
  console.log(`Successfully updated: ${updatedCount}`);
  console.log(`Not found: ${notFoundCount}`);
  
  if (notFoundEmployees.length > 0) {
    console.log('\nEmployees not found in database:');
    notFoundEmployees.forEach(emp => console.log(`  - ${emp}`));
  }
  
  process.exit(0);
}

// Run the update
updateContractData().catch(console.error);