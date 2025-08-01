import { db } from './db';
import { employeeRecords } from '../shared/schema';
import { eq, and, isNull, or } from 'drizzle-orm';

async function analyzeMissingDesignations() {
  console.log('🔍 Analyzing departments with missing designations...\n');
  
  // Get all active employees
  const employees = await db.select().from(employeeRecords)
    .where(eq(employeeRecords.isActive, true));
  
  console.log(`📋 Total active employees: ${employees.length}`);
  
  // Group by department and analyze designation coverage
  const departmentStats = employees.reduce((acc, emp) => {
    const dept = emp.department || 'Unknown';
    if (!acc[dept]) {
      acc[dept] = {
        total: 0,
        withDesignations: 0,
        withoutDesignations: 0,
        employees: []
      };
    }
    
    acc[dept].total++;
    
    if (emp.designation && emp.designation.trim() !== '') {
      acc[dept].withDesignations++;
    } else {
      acc[dept].withoutDesignations++;
      acc[dept].employees.push({
        code: emp.employeeCode,
        name: `${emp.firstName} ${emp.lastName}`,
        cnic: emp.nationalId || 'No CNIC'
      });
    }
    
    return acc;
  }, {} as Record<string, any>);
  
  // Calculate coverage percentages and sort by most missing
  const departmentAnalysis = Object.entries(departmentStats).map(([dept, stats]) => ({
    department: dept,
    total: stats.total,
    withDesignations: stats.withDesignations,
    withoutDesignations: stats.withoutDesignations,
    coverage: Math.round((stats.withDesignations / stats.total) * 100),
    employees: stats.employees
  })).sort((a, b) => b.withoutDesignations - a.withoutDesignations);
  
  console.log('📊 Department Designation Coverage Analysis:\n');
  
  departmentAnalysis.forEach((dept, index) => {
    const status = dept.coverage === 100 ? '✅' : dept.coverage >= 50 ? '⚠️' : '❌';
    console.log(`${index + 1}. ${status} ${dept.department}`);
    console.log(`   Total: ${dept.total} | With: ${dept.withDesignations} | Missing: ${dept.withoutDesignations} | Coverage: ${dept.coverage}%`);
    
    if (dept.withoutDesignations > 0) {
      console.log(`   Missing employees:`);
      dept.employees.slice(0, 5).forEach((emp: any) => {
        console.log(`     - ${emp.code}: ${emp.name} (${emp.cnic})`);
      });
      if (dept.employees.length > 5) {
        console.log(`     ... and ${dept.employees.length - 5} more`);
      }
    }
    console.log('');
  });
  
  // Find departments with most missing designations (excluding completed ones)
  const incompleteDepartments = departmentAnalysis.filter(dept => dept.withoutDesignations > 0);
  
  console.log('\n🎯 Priority Departments for Designation Matching:');
  incompleteDepartments.slice(0, 10).forEach((dept, index) => {
    console.log(`${index + 1}. ${dept.department}: ${dept.withoutDesignations} missing (${dept.coverage}% coverage)`);
  });
  
  // Show summary statistics
  const totalEmployees = departmentAnalysis.reduce((sum, dept) => sum + dept.total, 0);
  const totalWithDesignations = departmentAnalysis.reduce((sum, dept) => sum + dept.withDesignations, 0);
  const totalMissing = departmentAnalysis.reduce((sum, dept) => sum + dept.withoutDesignations, 0);
  const overallCoverage = Math.round((totalWithDesignations / totalEmployees) * 100);
  
  console.log('\n📈 Overall Statistics:');
  console.log(`   Total employees: ${totalEmployees}`);
  console.log(`   With designations: ${totalWithDesignations} (${overallCoverage}%)`);
  console.log(`   Missing designations: ${totalMissing}`);
  console.log(`   Departments with 100% coverage: ${departmentAnalysis.filter(d => d.coverage === 100).length}`);
  console.log(`   Departments needing work: ${incompleteDepartments.length}`);
  
  if (incompleteDepartments.length > 0) {
    const nextDepartment = incompleteDepartments[0];
    console.log(`\n🔥 NEXT PRIORITY: ${nextDepartment.department}`);
    console.log(`   Missing: ${nextDepartment.withoutDesignations} employees`);
    console.log(`   Current coverage: ${nextDepartment.coverage}%`);
    console.log(`   Improvement potential: ${nextDepartment.withoutDesignations} employees`);
  }
  
  console.log('\n🎯 Analysis completed successfully!');
}

analyzeMissingDesignations().catch(console.error);