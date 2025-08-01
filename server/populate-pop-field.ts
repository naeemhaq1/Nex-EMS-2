import { db } from "./db";
import { employeeRecords } from "@shared/schema";
import { eq, like, or } from "drizzle-orm";

// PoP mapping based on department prefixes
const popMapping = {
  'KHI': 'Karachi',
  'LHE': 'Lahore',
  'MUL': 'Multan',
  'FSD': 'Faisalabad',
  'PSH': 'Peshawar',
  'GUJ': 'Gujranwala'
};

async function populatePopField() {
  console.log("Populating PoP (Point of Presence) field based on department prefixes...\n");
  
  let totalUpdated = 0;
  
  // Process each PoP mapping
  for (const [prefix, city] of Object.entries(popMapping)) {
    console.log(`Processing ${prefix} departments → ${city}`);
    
    try {
      // Update all employees with departments starting with this prefix
      const result = await db
        .update(employeeRecords)
        .set({
          pop: city,
          updatedAt: new Date()
        })
        .where(
          or(
            like(employeeRecords.department, `${prefix}%`),
            eq(employeeRecords.department, prefix)
          )
        )
        .returning({
          employeeCode: employeeRecords.employeeCode,
          firstName: employeeRecords.firstName,
          middleName: employeeRecords.middleName,
          lastName: employeeRecords.lastName,
          department: employeeRecords.department,
          pop: employeeRecords.pop
        });
      
      console.log(`  Updated ${result.length} employees:`);
      
      // Group by department for cleaner output
      const deptCounts = {};
      result.forEach(emp => {
        const dept = emp.department || 'Unknown';
        if (!deptCounts[dept]) {
          deptCounts[dept] = 0;
        }
        deptCounts[dept]++;
      });
      
      Object.entries(deptCounts).forEach(([dept, count]) => {
        console.log(`    ${dept}: ${count} employees`);
      });
      
      totalUpdated += result.length;
      
    } catch (error) {
      console.error(`  ✗ Error updating ${prefix} departments:`, error);
    }
    
    console.log('');
  }
  
  // Handle special cases or departments without clear prefixes
  console.log("Handling special departments...\n");
  
  // Check for departments that might not have been caught
  const remainingDepts = await db
    .select({
      department: employeeRecords.department
    })
    .from(employeeRecords)
    .where(eq(employeeRecords.pop, null))
    .groupBy(employeeRecords.department)
    .orderBy(employeeRecords.department);
  
  if (remainingDepts.length > 0) {
    console.log("Departments without PoP assignment:");
    remainingDepts.forEach(dept => {
      console.log(`  ${dept.department || 'NULL'}`);
    });
    
    // Handle specific cases
    try {
      // Management and generic departments → Default to Lahore (head office)
      const specialDepts = ['Mgmt', 'Management', 'NOC', 'Tech', 'Duplicate'];
      
      for (const dept of specialDepts) {
        const specialResult = await db
          .update(employeeRecords)
          .set({
            pop: 'Lahore',
            updatedAt: new Date()
          })
          .where(eq(employeeRecords.department, dept))
          .returning({
            employeeCode: employeeRecords.employeeCode,
            department: employeeRecords.department,
            pop: employeeRecords.pop
          });
        
        if (specialResult.length > 0) {
          console.log(`  Updated ${dept} → Lahore: ${specialResult.length} employees`);
          totalUpdated += specialResult.length;
        }
      }
      
      // Resident-Engineer could be anywhere, but default to Lahore
      const resEngResult = await db
        .update(employeeRecords)
        .set({
          pop: 'Lahore',
          updatedAt: new Date()
        })
        .where(eq(employeeRecords.department, 'Resident-Engineer'))
        .returning({
          employeeCode: employeeRecords.employeeCode,
          department: employeeRecords.department,
          pop: employeeRecords.pop
        });
      
      if (resEngResult.length > 0) {
        console.log(`  Updated Resident-Engineer → Lahore: ${resEngResult.length} employees`);
        totalUpdated += resEngResult.length;
      }
      
    } catch (error) {
      console.error("  ✗ Error updating special departments:", error);
    }
  }
  
  console.log('\n=== PoP Population Summary ===');
  console.log(`Total employees updated: ${totalUpdated}`);
  
  // Show final PoP distribution
  const popDistribution = await db
    .select({
      pop: employeeRecords.pop
    })
    .from(employeeRecords)
    .where(eq(employeeRecords.isActive, true))
    .groupBy(employeeRecords.pop)
    .orderBy(employeeRecords.pop);
  
  console.log('\nFinal PoP Distribution:');
  let totalWithPop = 0;
  let totalWithoutPop = 0;
  
  popDistribution.forEach(pop => {
    const count = Array.isArray(pop.count) ? pop.count.length : 1;
    if (pop.pop) {
      console.log(`  ${pop.pop}: ${count} employees`);
      totalWithPop += count;
    } else {
      console.log(`  (No PoP): ${count} employees`);
      totalWithoutPop += count;
    }
  });
  
  console.log(`\nTotal with PoP: ${totalWithPop}`);
  console.log(`Total without PoP: ${totalWithoutPop}`);
  
  // Show departments still without PoP
  if (totalWithoutPop > 0) {
    console.log('\nDepartments still without PoP:');
    const stillMissing = await db
      .select({
        department: employeeRecords.department,
        employeeCode: employeeRecords.employeeCode,
        firstName: employeeRecords.firstName,
        middleName: employeeRecords.middleName,
        lastName: employeeRecords.lastName
      })
      .from(employeeRecords)
      .where(
        and(
          eq(employeeRecords.isActive, true),
          eq(employeeRecords.pop, null)
        )
      )
      .orderBy(employeeRecords.department);
    
    stillMissing.forEach(emp => {
      const fullName = `${emp.firstName || ''} ${emp.middleName || ''} ${emp.lastName || ''}`.trim();
      console.log(`  ${emp.employeeCode}: ${fullName} (${emp.department || 'No Dept'})`);
    });
  }
}

// Import the 'and' function
import { and } from "drizzle-orm";

populatePopField().catch(console.error);