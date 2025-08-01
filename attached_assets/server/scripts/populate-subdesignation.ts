import { db } from '../db';
import { employeeRecords } from '@shared/schema';
import { eq, and, isNotNull, ne } from 'drizzle-orm';

interface DesignationMapping {
  originalDesignation: string;
  baseDesignation: string;
  subdesignation: string;
}

function parseDesignation(designation: string, currentPoslevel: string | null): string {
  const trimmed = designation.trim();
  
  // If this person has a role level (manager/supervisor), extract everything else as subdesignation
  if (currentPoslevel === 'manager' || currentPoslevel === 'supervisor') {
    // Manager patterns - extract specialization
    const managerPatterns = [
      /^Assistant Manager\s*\(([^)]+)\)$/,  // Assistant Manager (Accounts) -> Accounts
      /^Manager\s*\(([^)]+)\)$/,            // Manager (OFC Network) -> OFC Network
      /^Manager\s+(.+)$/,                   // Manager Accounts -> Accounts
      /^General Manager\s+(.+)$/,          // General Manager Technical -> Technical
      /^Branch Manager$/,                   // Branch Manager -> Branch
      /^Key Accounts?\s+Manager(?:\s+\(([^)]+)\))?$/,  // Key Account Manager (PSH) -> PSH
      /^Country Head\s+(.+)$/,             // Country Head Sales & Marketing -> Sales & Marketing
      /^Executive Director\s*\(([^)]+)\)$/  // Executive Director (Special Projects) -> Special Projects
    ];
    
    for (const pattern of managerPatterns) {
      const match = trimmed.match(pattern);
      if (match) {
        return match[1] || 'Branch';  // Default to 'Branch' for Branch Manager
      }
    }
    
    // Supervisor patterns - extract specialization
    const supervisorPatterns = [
      /^Senior Team Lead\s*\(([^)]+)\)$/,   // Senior Team Lead (PSCA LHR) -> PSCA LHR
      /^Team Lead\s*\(([^)]+)\)$/,         // Team Lead (OFC) -> OFC
      /^Team Lead$/,                        // Team Lead -> General
      /^OFC Supervisor$/,                   // OFC Supervisor -> OFC
      /^Supervisor\s+(.+)$/,               // Supervisor Field Team -> Field Team
      /^Supervisor$/,                       // Supervisor -> General
      /^Office Incharge\s*\(([^)]+)\)$/,   // Office Incharge (Abbottabad) -> Abbottabad
      /^Project Support Head$/             // Project Support Head -> Project Support
    ];
    
    for (const pattern of supervisorPatterns) {
      const match = trimmed.match(pattern);
      if (match) {
        return match[1] || (trimmed.includes('Team Lead') ? 'General' : 
                           trimmed.includes('Supervisor') ? 'General' : 
                           'Project Support');
      }
    }
    
    // If no pattern matches but has role level, return the full designation as subdesignation
    return trimmed;
  }
  
  // For non-manager/supervisor roles, extract meaningful subdesignation
  // Pattern 1: "Base (Specialization)" -> Specialization
  const parenthesesMatch = trimmed.match(/^(.+?)\s*\(([^)]+)\)$/);
  if (parenthesesMatch) {
    return parenthesesMatch[2].trim();
  }
  
  // Pattern 2: Extract specialization from common patterns
  const specializations: { [key: string]: string } = {
    'Senior Electrical Executive': 'Senior Electrical',
    'Senior Field Engineer': 'Senior Field',
    'Senior Network Engineer': 'Senior Network',
    'Senior Signal Technician': 'Senior Signal',
    'Senior Splicer': 'Senior Splicer',
    'Senior Technical Support Engineer': 'Senior Technical Support',
    'Senior Technician': 'Senior',
    'Junior Finance Executive': 'Junior Finance',
    'Junior Technician': 'Junior',
    'Assistant Network Engineer': 'Assistant Network',
    'General Duty Officer': 'General Duty',
    'Genset Maintenance Technician': 'Genset Maintenance',
    'IPTV Monitoring Executive': 'IPTV Monitoring',
    'LESCO Technician': 'LESCO',
    'B2G Field Officer': 'B2G Field',
    'Recovery & Sales Coordinator': 'Recovery & Sales',
    'Sales & Office Coordinator': 'Sales & Office',
    'Corporate Sales Executive': 'Corporate Sales',
    'Customer Care Executive': 'Customer Care',
    'Marketing Executive': 'Marketing',
    'Technical Support Executive': 'Technical Support',
    'Electrical Executive': 'Electrical',
    'Field Executive': 'Field',
    'Finance Executive': 'Finance',
    'Store Executive': 'Store',
    'Administrative Assistant': 'Administrative',
    'Marketing Coordinator': 'Marketing',
    'Sales Coordinator': 'Sales',
    'Collection Officer': 'Collection',
    'Recovery Officer': 'Recovery',
    'Technical Support Officer': 'Technical Support',
    'Store Officer': 'Store',
    'Accounts Officer': 'Accounts',
    'Field Technician': 'Field',
    'Cable Technician': 'Cable',
    'RF Technician': 'RF',
    'Signal Technician': 'Signal',
    'Tower Technician': 'Tower',
    'DSL Operator': 'DSL',
    'IT Support Engineer': 'IT Support',
    'Network Engineer': 'Network',
    'Project Monitoring/Support Engineer': 'Project Monitoring/Support',
    'Switching Engineer': 'Switching',
    'Systems & IPTV Support Engineer': 'Systems & IPTV Support',
    'Technical Support Engineer': 'Technical Support',
    'Resident Technical Engineer': 'Resident Technical',
    'Switching Helper': 'Switching',
    'Security Guard': 'Security',
    'Tower Guy': 'Tower',
    'Technical Support': 'Technical',
    'Sales Field Officer': 'Sales Field',
    'Trainee Engineer - OFC': 'Trainee OFC'
  };
  
  if (specializations[trimmed]) {
    return specializations[trimmed];
  }
  
  // Default: no subdesignation
  return '';
}

async function populateSubdesignation() {
  console.log('🚀 Starting Subdesignation Population Process...\n');
  
  // Get all active employees with designations
  const employees = await db
    .select({
      id: employeeRecords.id,
      employeeCode: employeeRecords.employeeCode,
      firstName: employeeRecords.firstName,
      lastName: employeeRecords.lastName,
      designation: employeeRecords.designation,
      subdesignation: employeeRecords.subdesignation,
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
  
  let updated = 0;
  let skipped = 0;
  const mappings: DesignationMapping[] = [];
  
  // Process each employee
  for (const employee of employees) {
    const designation = employee.designation!;
    const subdesignation = parseDesignation(designation, employee.poslevel);
    
    // Only update if we have a subdesignation and it's different from current
    if (subdesignation && subdesignation !== employee.subdesignation) {
      try {
        await db
          .update(employeeRecords)
          .set({ 
            subdesignation: subdesignation,
            updatedAt: new Date()
          })
          .where(eq(employeeRecords.id, employee.id));
        
        console.log(`✓ ${employee.employeeCode} (${employee.firstName} ${employee.lastName})`);
        console.log(`  Original: ${designation}`);
        console.log(`  Role Level: ${employee.poslevel || 'none'}`);
        console.log(`  Subdesignation: ${subdesignation}`);
        console.log('');
        
        updated++;
        
        mappings.push({
          originalDesignation: designation,
          baseDesignation: designation,
          subdesignation: subdesignation
        });
        
      } catch (error) {
        console.error(`✗ Failed to update ${employee.employeeCode}: ${error}`);
      }
    } else {
      skipped++;
    }
  }
  
  console.log('\n=== SUBDESIGNATION POPULATION RESULTS ===');
  console.log(`Total employees processed: ${employees.length}`);
  console.log(`Successful updates: ${updated}`);
  console.log(`Skipped (no subdesignation): ${skipped}`);
  
  // Show unique subdesignations created
  const uniqueSubdesignations = [...new Set(mappings.map(m => m.subdesignation))].sort();
  console.log(`\nUnique subdesignations created: ${uniqueSubdesignations.length}`);
  uniqueSubdesignations.forEach(sub => {
    const count = mappings.filter(m => m.subdesignation === sub).length;
    console.log(`• ${sub} (${count} employees)`);
  });
  
  // Show current subdesignation distribution
  console.log('\n=== CURRENT SUBDESIGNATION DISTRIBUTION ===');
  const subdesignationStats = await db
    .select({
      subdesignation: employeeRecords.subdesignation,
      count: db.select().from(employeeRecords).where(
        and(
          eq(employeeRecords.isActive, true),
          eq(employeeRecords.subdesignation, employeeRecords.subdesignation)
        )
      )
    })
    .from(employeeRecords)
    .where(
      and(
        eq(employeeRecords.isActive, true),
        isNotNull(employeeRecords.subdesignation),
        ne(employeeRecords.subdesignation, '')
      )
    )
    .groupBy(employeeRecords.subdesignation)
    .orderBy(employeeRecords.subdesignation);
  
  console.log('\n✅ Subdesignation population completed successfully!');
}

// Run the script
populateSubdesignation().catch(console.error);