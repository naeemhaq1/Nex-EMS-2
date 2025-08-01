import { db } from '../db';
import { employeeRecords } from '@shared/schema';
import { eq, and, ne, isNotNull, sql } from 'drizzle-orm';

interface RoleMapping {
  keywords: string[];
  role: string;
  priority: number; // Higher priority takes precedence
}

// Define role mappings based on designation keywords
const roleMappings: RoleMapping[] = [
  // CEO/Executive Director (highest priority)
  {
    keywords: ['ceo', 'executive director'],
    role: 'Executive Director',
    priority: 5
  },
  // General Manager
  {
    keywords: ['general manager', 'country head'],
    role: 'General Manager',
    priority: 4
  },
  // Manager
  {
    keywords: ['manager', 'branch manager', 'key account manager', 'key accounts manager'],
    role: 'Manager',
    priority: 3
  },
  // Assistant Manager
  {
    keywords: ['assistant manager', 'deputy manager'],
    role: 'Assistant Manager', 
    priority: 2
  },
  // Supervisor/Team Lead
  {
    keywords: ['supervisor', 'team lead', 'senior team lead', 'project support head', 'office incharge'],
    role: 'Supervisor',
    priority: 1
  }
];

async function populatePoslevelRoles() {
  console.log('🚀 Starting Poslevel Role Assignment Process...\n');
  
  // Get all active employees with designations
  const employees = await db
    .select({
      id: employeeRecords.id,
      employeeCode: employeeRecords.employeeCode,
      firstName: employeeRecords.firstName,
      lastName: employeeRecords.lastName,
      designation: employeeRecords.designation,
      poslevel: employeeRecords.poslevel
    })
    .from(employeeRecords)
    .where(
      and(
        eq(employeeRecords.isActive, true),
        isNotNull(employeeRecords.designation),
        ne(employeeRecords.designation, '')
      )
    );
  
  console.log(`📋 Found ${employees.length} active employees with designations`);
  
  let executiveDirectorsFound = 0;
  let generalManagersFound = 0;
  let managersFound = 0;
  let assistantManagersFound = 0;
  let supervisorsFound = 0;
  let updated = 0;
  
  // Process each employee
  for (const employee of employees) {
    const designation = employee.designation!.toLowerCase();
    let assignedRole = '';
    let highestPriority = 0;
    
    // Check each role mapping
    for (const mapping of roleMappings) {
      for (const keyword of mapping.keywords) {
        if (designation.includes(keyword.toLowerCase())) {
          if (mapping.priority > highestPriority) {
            assignedRole = mapping.role;
            highestPriority = mapping.priority;
          }
        }
      }
    }
    
    // Update employee if role found and different from current
    if (assignedRole && assignedRole !== employee.poslevel) {
      try {
        await db
          .update(employeeRecords)
          .set({ 
            poslevel: assignedRole,
            updatedAt: new Date()
          })
          .where(eq(employeeRecords.id, employee.id));
        
        console.log(`✓ ${employee.employeeCode} (${employee.firstName} ${employee.lastName})`);
        console.log(`  Designation: ${employee.designation}`);
        console.log(`  Assigned Role: ${assignedRole}`);
        console.log('');
        
        updated++;
        
        // Count by role type
        switch (assignedRole) {
          case 'Executive Director':
            executiveDirectorsFound++;
            break;
          case 'General Manager':
            generalManagersFound++;
            break;
          case 'Manager':
            managersFound++;
            break;
          case 'Assistant Manager':
            assistantManagersFound++;
            break;
          case 'Supervisor':
            supervisorsFound++;
            break;
        }
        
      } catch (error) {
        console.error(`✗ Failed to update ${employee.employeeCode}: ${error}`);
      }
    }
  }
  
  console.log('\n=== POSLEVEL ROLE ASSIGNMENT RESULTS ===');
  console.log(`Total employees processed: ${employees.length}`);
  console.log(`Successful updates: ${updated}`);
  console.log(`\nRole Distribution:`);
  console.log(`• Executive Directors: ${executiveDirectorsFound}`);
  console.log(`• General Managers: ${generalManagersFound}`);
  console.log(`• Managers: ${managersFound}`);
  console.log(`• Assistant Managers: ${assistantManagersFound}`);
  console.log(`• Supervisors: ${supervisorsFound}`);
  console.log(`• Total Leadership Roles: ${executiveDirectorsFound + generalManagersFound + managersFound + assistantManagersFound + supervisorsFound}`);
  
  // Show current poslevel distribution
  console.log('\n=== CURRENT POSLEVEL DISTRIBUTION ===');
  const poslevelStats = await db
    .select({
      poslevel: employeeRecords.poslevel,
      count: sql<number>`count(*)`
    })
    .from(employeeRecords)
    .where(
      and(
        eq(employeeRecords.isActive, true),
        isNotNull(employeeRecords.poslevel),
        ne(employeeRecords.poslevel, '')
      )
    )
    .groupBy(employeeRecords.poslevel)
    .orderBy(employeeRecords.poslevel);
  
  for (const stat of poslevelStats) {
    console.log(`${stat.poslevel}: ${stat.count} employees`);
  }
  
  console.log('\n✅ Poslevel role assignment completed successfully!');
}

// Run the script
populatePoslevelRoles().catch(console.error);