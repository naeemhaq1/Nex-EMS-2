import { db } from './db';
import { employeeRecords } from '../shared/schema';
import { eq } from 'drizzle-orm';

// Approved high confidence matches
const approvedMatches = [
  { employeeCode: '10090385', designation: 'Manager - OFC Network', csvName: 'Muhammad Moazzam Rana' },
  { employeeCode: '10090472', designation: 'Network Engineer - OFC', csvName: 'Muhammad Umar Majeed' },
  { employeeCode: '10090526', designation: 'Helper - OFC', csvName: 'Muhammad Basit Ali' },
  { employeeCode: '10090617', designation: 'Technician - OFC', csvName: 'Muhammad Salman Haris' },
  { employeeCode: '10090564', designation: 'Driver - OFC', csvName: 'Fareed Ahmed' },
  { employeeCode: '10090696', designation: 'Driver - OFC', csvName: 'Yasir Mehmood' },
  { employeeCode: '10090618', designation: 'Helper - OFC', csvName: 'Muhammad Sultan Bin Qasim' },
  { employeeCode: '10090697', designation: 'Technician - OFC', csvName: 'Ijaz Ahmed' },
  { employeeCode: '10090666', designation: 'Helper - OFC', csvName: 'Shahzad Ali' },
  { employeeCode: '10090665', designation: 'Technician - OFC', csvName: 'Sheikh Muhammad Raheel Qaiser' },
  { employeeCode: '10090675', designation: 'Helper - OFC', csvName: 'Muhammad Gul Zaib' }
];

async function updateApprovedMatches() {
  console.log('🔄 Updating approved LHE-OFC designation matches...\n');
  
  let updateCount = 0;
  
  for (const match of approvedMatches) {
    try {
      // Get current employee data
      const employee = await db.select().from(employeeRecords)
        .where(eq(employeeRecords.employeeCode, match.employeeCode))
        .limit(1);
      
      if (employee.length === 0) {
        console.log(`❌ Employee ${match.employeeCode} not found`);
        continue;
      }
      
      const currentEmployee = employee[0];
      
      // Update designation
      await db.update(employeeRecords)
        .set({ designation: match.designation })
        .where(eq(employeeRecords.employeeCode, match.employeeCode));
      
      console.log(`✅ Updated ${match.employeeCode} (${currentEmployee.firstName} ${currentEmployee.lastName}) -> ${match.designation}`);
      updateCount++;
      
    } catch (error) {
      console.error(`❌ Error updating ${match.employeeCode}:`, error);
    }
  }
  
  console.log(`\n📊 Summary: Updated ${updateCount}/${approvedMatches.length} employees`);
  console.log('🎯 LHE-OFC designation update completed!');
}

updateApprovedMatches().catch(console.error);