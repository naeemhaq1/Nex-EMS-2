import { db } from "../db";
import { employeeRecords } from "../../shared/schema";
import { eq } from "drizzle-orm";

async function analyzeNameDuplicates() {
  try {
    console.log("Analyzing employee name duplicates...\n");
    
    // Get all active employees
    const allEmployees = await db
      .select({
        id: employeeRecords.id,
        employeeCode: employeeRecords.employeeCode,
        firstName: employeeRecords.firstName,
        lastName: employeeRecords.lastName,
        department: employeeRecords.department,
        designation: employeeRecords.designation
      })
      .from(employeeRecords)
      .where(eq(employeeRecords.isActive, true));
    
    console.log(`Total active employees: ${allEmployees.length}`);
    
    // Group employees by first name and last name combination
    const nameGroups = new Map<string, typeof allEmployees>();
    
    for (const employee of allEmployees) {
      if (!employee.firstName || !employee.lastName) {
        continue;
      }
      
      const nameKey = `${employee.firstName.trim().toLowerCase()}_${employee.lastName.trim().toLowerCase()}`;
      
      if (!nameGroups.has(nameKey)) {
        nameGroups.set(nameKey, []);
      }
      
      nameGroups.get(nameKey)!.push(employee);
    }
    
    // Find duplicates
    const duplicates = Array.from(nameGroups.entries())
      .filter(([_, employees]) => employees.length > 1)
      .sort(([_, a], [__, b]) => b.length - a.length);
    
    console.log(`\n📊 DUPLICATE NAME ANALYSIS:`);
    console.log(`Total unique name combinations: ${nameGroups.size}`);
    console.log(`Names with duplicates: ${duplicates.length}`);
    console.log(`Total employees with duplicate names: ${duplicates.reduce((sum, [_, employees]) => sum + employees.length, 0)}`);
    
    if (duplicates.length === 0) {
      console.log("✅ No duplicate names found!");
      return;
    }
    
    console.log(`\n⚠️  EMPLOYEES WITH DUPLICATE NAMES:`);
    console.log("=" .repeat(80));
    
    duplicates.forEach(([nameKey, employees], index) => {
      const [firstName, lastName] = nameKey.split('_');
      console.log(`\n${index + 1}. ${firstName.toUpperCase()} ${lastName.toUpperCase()} (${employees.length} employees):`);
      
      employees.forEach(emp => {
        console.log(`   • ${emp.employeeCode} - ${emp.firstName} ${emp.lastName}`);
        console.log(`     Dept: ${emp.department || 'N/A'}, Designation: ${emp.designation || 'N/A'}`);
      });
    });
    
    // Show username generation preview for duplicates
    console.log(`\n🔍 USERNAME GENERATION PREVIEW FOR DUPLICATES:`);
    console.log("=" .repeat(80));
    
    for (const [nameKey, employees] of duplicates) {
      const [firstName, lastName] = nameKey.split('_');
      console.log(`\n${firstName.toUpperCase()} ${lastName.toUpperCase()}:`);
      
      for (const emp of employees) {
        const cleanFirst = emp.firstName.trim().replace(/[^a-zA-Z]/g, '');
        const cleanLast = emp.lastName.trim().replace(/[^a-zA-Z]/g, '');
        const lastInitial = cleanLast.charAt(0).toUpperCase();
        
        console.log(`   ${emp.employeeCode}: Will generate ${cleanFirst}_${lastInitial}X (where X = random 1-9)`);
      }
    }
    
    // Show employees with missing names
    const missingNames = allEmployees.filter(emp => !emp.firstName || !emp.lastName);
    
    if (missingNames.length > 0) {
      console.log(`\n❌ EMPLOYEES WITH MISSING NAME DATA:`);
      console.log("=" .repeat(80));
      
      missingNames.forEach(emp => {
        console.log(`   • ${emp.employeeCode} - First: "${emp.firstName || 'MISSING'}", Last: "${emp.lastName || 'MISSING'}"`);
        console.log(`     Dept: ${emp.department || 'N/A'}, Designation: ${emp.designation || 'N/A'}`);
      });
    }
    
  } catch (error) {
    console.error("❌ Error analyzing name duplicates:", error);
    process.exit(1);
  }
}

analyzeNameDuplicates().then(() => {
  console.log("\n✅ Name duplicate analysis completed");
  process.exit(0);
});