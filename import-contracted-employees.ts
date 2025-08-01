import { parse } from 'csv-parse';
import { readFileSync } from 'fs';
import { join } from 'path';
import { db } from './db';
import { employeeRecords } from '../shared/schema';
import { eq, or } from 'drizzle-orm';

interface ContractedEmployee {
  'Driver Name': string;
  'Employement Type ': string;
  'D.O.B': string;
  'Contact #': string;
  'CNIC': string;
  'Home Address': string;
  'Contract Date': string;
  'Contract months': string;
  'Contract Expiry Date': string;
}

// Normalize CNIC by removing dashes and spaces, validate 13 digits
function normalizeCNIC(cnic: string): string {
  if (!cnic) return '';
  
  // Remove all non-digit characters
  const digitsOnly = cnic.replace(/\D/g, '');
  
  // CNIC must be exactly 13 digits
  if (digitsOnly.length !== 13) {
    console.warn(`⚠️  Invalid CNIC length: ${cnic} (${digitsOnly.length} digits, expected 13)`);
    return '';
  }
  
  return digitsOnly;
}

// Parse date from DD-MMM-YY format to YYYY-MM-DD
function parseDate(dateStr: string): string | null {
  if (!dateStr || dateStr.trim() === '') return null;
  
  try {
    const months: { [key: string]: string } = {
      'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
      'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    };
    
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = months[parts[1]];
      let year = parts[2];
      
      // Convert 2-digit year to 4-digit year
      if (year.length === 2) {
        const currentYear = new Date().getFullYear();
        const currentCentury = Math.floor(currentYear / 100) * 100;
        const yearNum = parseInt(year);
        
        // If year is greater than current year % 100, assume previous century
        if (yearNum > (currentYear % 100)) {
          year = (currentCentury - 100 + yearNum).toString();
        } else {
          year = (currentCentury + yearNum).toString();
        }
      }
      
      if (month) {
        return `${year}-${month}-${day}`;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing date:', dateStr, error);
    return null;
  }
}

// Parse name into first and last name
function parseName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(' ');
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  } else if (parts.length === 2) {
    return { firstName: parts[0], lastName: parts[1] };
  } else {
    // For names with more than 2 parts, take first as firstName and last as lastName
    return { firstName: parts[0], lastName: parts[parts.length - 1] };
  }
}

// Parse phone number to clean format and validate Pakistani format
function parsePhoneNumber(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Pakistani phone numbers must be exactly 11 digits and start with 03
  if (digitsOnly.length !== 11 || !digitsOnly.startsWith('03')) {
    console.warn(`⚠️  Invalid phone number format: ${phone} (${digitsOnly.length} digits, expected 11 digits starting with 03)`);
    return '';
  }
  
  return digitsOnly;
}

async function importContractedEmployees() {
  console.log('🚀 Starting import of contracted employees...');
  
  try {
    // Read the CSV file
    const csvFilePath = join(process.cwd(), 'attached_assets', 'PSCA DriverContracted_1752380208053.csv');
    const csvContent = readFileSync(csvFilePath, 'utf-8');
    
    // Parse CSV
    const records = await new Promise<ContractedEmployee[]>((resolve, reject) => {
      parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
    
    console.log(`📋 Found ${records.length} contracted employees in CSV`);
    
    // Get all existing employees to check for matches
    const existingEmployees = await db.select().from(employeeRecords);
    console.log(`📊 Found ${existingEmployees.length} existing employees in database`);
    
    let updatedCount = 0;
    let addedCount = 0;
    let skippedCount = 0;
    
    for (const record of records) {
      const normalizedCNIC = normalizeCNIC(record.CNIC);
      const { firstName, lastName } = parseName(record['Driver Name']);
      const phoneNumber = parsePhoneNumber(record['Contact #']);
      
      // Parse dates
      const birthday = parseDate(record['D.O.B']);
      const contractDate = parseDate(record['Contract Date']);
      const contractExpiry = parseDate(record['Contract Expiry Date']);
      
      // Create contract term string
      const contractTerm = `${record['Contract months']} months`;
      
      console.log(`\n👤 Processing: ${record['Driver Name']} (CNIC: ${normalizedCNIC})`);
      
      // Check if employee exists by matching CNIC with nationalId
      const existingEmployee = existingEmployees.find(emp => 
        emp.nationalId && normalizeCNIC(emp.nationalId) === normalizedCNIC
      );
      
      if (existingEmployee) {
        // Update existing employee with contract information
        console.log(`✅ Found existing employee: ${existingEmployee.firstName} ${existingEmployee.lastName} (ID: ${existingEmployee.employeeCode})`);
        
        try {
          await db
            .update(employeeRecords)
            .set({
              phone: phoneNumber,
              birthday: birthday,
              contractDate: contractDate,
              contractTerm: contractTerm,
              contractExpiryDate: contractExpiry,
              designation: 'Driver',
              department: 'PSCA-Contracted',
              workTeam: 'Driver',
              address: record['Home Address'] !== 'Missing' ? record['Home Address'] : null,
              updatedAt: new Date(),
            })
            .where(eq(employeeRecords.id, existingEmployee.id));
          
          console.log(`✅ Updated existing employee with contract information`);
          updatedCount++;
        } catch (error) {
          console.error(`❌ Error updating employee ${existingEmployee.employeeCode}:`, error);
          skippedCount++;
        }
      } else {
        // Add new employee
        console.log(`🆕 Adding new contracted employee`);
        
        try {
          // Generate employee code for new employee
          const employeeCode = `CNT${String(Date.now()).slice(-6)}`;
          
          await db.insert(employeeRecords).values({
            employeeCode: employeeCode,
            biotimeId: employeeCode, // Use same as employee code for contracted employees
            firstName: firstName,
            lastName: lastName,
            phone: phoneNumber,
            nationalId: normalizedCNIC,
            cnicMissing: 'no',
            department: 'PSCA-Contracted',
            designation: 'Driver',
            workTeam: 'Driver',
            birthday: birthday,
            contractDate: contractDate,
            contractTerm: contractTerm,
            contractExpiryDate: contractExpiry,
            address: record['Home Address'] !== 'Missing' ? record['Home Address'] : null,
            empType: 'Contract',
            isActive: true,
            nonBio: false,
            stopPay: false,
            pop: 'Lahore', // Most addresses are in Lahore
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          
          console.log(`✅ Added new contracted employee: ${employeeCode}`);
          addedCount++;
        } catch (error) {
          console.error(`❌ Error adding new employee ${record['Driver Name']}:`, error);
          skippedCount++;
        }
      }
    }
    
    console.log('\n📈 Import Summary:');
    console.log(`✅ Updated existing employees: ${updatedCount}`);
    console.log(`🆕 Added new employees: ${addedCount}`);
    console.log(`⚠️  Skipped (errors): ${skippedCount}`);
    console.log(`📋 Total processed: ${records.length}`);
    
  } catch (error) {
    console.error('❌ Error importing contracted employees:', error);
    throw error;
  }
}

// Run the import
if (import.meta.url === `file://${process.argv[1]}`) {
  importContractedEmployees()
    .then(() => {
      console.log('✅ Import completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Import failed:', error);
      process.exit(1);
    });
}

export { importContractedEmployees };