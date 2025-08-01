import { db } from './db';
import { employeeRecords } from '@shared/schema';
import { eq, and, isNull, or, sql } from 'drizzle-orm';
import fs from 'fs';
import { sendEmail } from './services/emailService';

interface IncompleteEmployee {
  employeeCode: string;
  firstName: string;
  middleName: string | null;
  lastName: string | null;
  department: string;
  designation: string | null;
  nationalId: string | null;
  phone: string | null;
  missingCnic: boolean;
  missingLastName: boolean;
  issuesSummary: string;
}

async function generateIncompleteDataReport() {
  console.log('Generating comprehensive incomplete data report...');
  
  try {
    // Get all employees with incomplete data (missing CNIC or last name, excluding system accounts)
    const incompleteEmployees = await db
      .select({
        employeeCode: employeeRecords.employeeCode,
        firstName: employeeRecords.firstName,
        middleName: employeeRecords.middleName,
        lastName: employeeRecords.lastName,
        department: employeeRecords.department,
        designation: employeeRecords.designation,
        nationalId: employeeRecords.nationalId,
        phone: employeeRecords.phone,
        joiningDate: employeeRecords.joiningDate
      })
      .from(employeeRecords)
      .where(and(
        eq(employeeRecords.isActive, true),
        eq(employeeRecords.systemAccount, false),
        or(
          // Missing CNIC
          isNull(employeeRecords.nationalId),
          // Missing last name
          isNull(employeeRecords.lastName),
          eq(employeeRecords.lastName, ''),
          sql`TRIM(${employeeRecords.lastName}) = ''`
        )
      ))
      .orderBy(employeeRecords.department, employeeRecords.employeeCode);

    // Process and categorize issues
    const processedEmployees: IncompleteEmployee[] = incompleteEmployees.map(emp => {
      const missingCnic = !emp.nationalId;
      const missingLastName = !emp.lastName || emp.lastName.trim() === '';
      
      let issuesSummary = '';
      if (missingCnic && missingLastName) {
        issuesSummary = 'Missing CNIC & Last Name';
      } else if (missingCnic) {
        issuesSummary = 'Missing CNIC';
      } else if (missingLastName) {
        issuesSummary = 'Missing Last Name';
      }

      return {
        employeeCode: emp.employeeCode,
        firstName: emp.firstName,
        middleName: emp.middleName,
        lastName: emp.lastName,
        department: emp.department,
        designation: emp.designation,
        nationalId: emp.nationalId,
        phone: emp.phone,
        missingCnic,
        missingLastName,
        issuesSummary
      };
    });

    // Generate statistics
    const totalIncomplete = processedEmployees.length;
    const missingCnicOnly = processedEmployees.filter(e => e.missingCnic && !e.missingLastName).length;
    const missingLastNameOnly = processedEmployees.filter(e => !e.missingCnic && e.missingLastName).length;
    const missingBoth = processedEmployees.filter(e => e.missingCnic && e.missingLastName).length;

    // Department breakdown
    const departmentBreakdown = processedEmployees.reduce((acc, emp) => {
      if (!acc[emp.department]) {
        acc[emp.department] = {
          total: 0,
          missingCnic: 0,
          missingLastName: 0,
          missingBoth: 0
        };
      }
      acc[emp.department].total++;
      if (emp.missingCnic && emp.missingLastName) {
        acc[emp.department].missingBoth++;
      } else if (emp.missingCnic) {
        acc[emp.department].missingCnic++;
      } else if (emp.missingLastName) {
        acc[emp.department].missingLastName++;
      }
      return acc;
    }, {} as Record<string, any>);

    // Generate report content
    const reportDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    console.log(`\n=== INCOMPLETE DATA REPORT - ${reportDate} ===`);
    console.log(`Total employees with incomplete data: ${totalIncomplete} out of 322 active employees`);
    console.log(`Percentage with incomplete data: ${((totalIncomplete / 322) * 100).toFixed(1)}%`);
    console.log(`\n=== BREAKDOWN BY ISSUE TYPE ===`);
    console.log(`Missing CNIC only: ${missingCnicOnly} employees`);
    console.log(`Missing Last Name only: ${missingLastNameOnly} employees`);
    console.log(`Missing both CNIC & Last Name: ${missingBoth} employees`);

    console.log(`\n=== DEPARTMENT BREAKDOWN ===`);
    Object.entries(departmentBreakdown)
      .sort(([,a], [,b]) => (b as any).total - (a as any).total)
      .forEach(([dept, stats]) => {
        console.log(`${dept}: ${(stats as any).total} employees`);
        if ((stats as any).missingBoth > 0) {
          console.log(`  - Missing both: ${(stats as any).missingBoth}`);
        }
        if ((stats as any).missingCnic > 0) {
          console.log(`  - Missing CNIC: ${(stats as any).missingCnic}`);
        }
        if ((stats as any).missingLastName > 0) {
          console.log(`  - Missing Last Name: ${(stats as any).missingLastName}`);
        }
      });

    console.log(`\n=== DETAILED EMPLOYEE LIST ===`);
    processedEmployees.forEach(emp => {
      const fullName = `${emp.firstName} ${emp.middleName || ''}`.trim();
      console.log(`${emp.employeeCode} - ${fullName} (${emp.department})`);
      console.log(`  Issues: ${emp.issuesSummary}`);
      console.log(`  Designation: ${emp.designation || 'Not specified'}`);
      console.log(`  Phone: ${emp.phone || 'Not available'}`);
      console.log('');
    });

    // Generate CSV report
    const csvContent = [
      'Employee Code,First Name,Middle Name,Last Name,Department,Designation,National ID,Phone,Issues Summary,Missing CNIC,Missing Last Name',
      ...processedEmployees.map(emp => {
        return `${emp.employeeCode},"${emp.firstName}","${emp.middleName || ''}","${emp.lastName || ''}","${emp.department}","${emp.designation || ''}","${emp.nationalId || ''}","${emp.phone || ''}","${emp.issuesSummary}","${emp.missingCnic ? 'YES' : 'NO'}","${emp.missingLastName ? 'YES' : 'NO'}"`;
      })
    ].join('\n');

    fs.writeFileSync('Incomplete-Data-Report.csv', csvContent);
    console.log('✓ CSV report generated: Incomplete-Data-Report.csv');

    // Generate email content
    const emailContent = `
NEXLINX SMART EMS - INCOMPLETE DATA REPORT
Generated: ${reportDate}

SUMMARY:
• Total employees with incomplete data: ${totalIncomplete} out of 322 active employees (${((totalIncomplete / 322) * 100).toFixed(1)}%)
• Missing CNIC only: ${missingCnicOnly} employees
• Missing Last Name only: ${missingLastNameOnly} employees  
• Missing both CNIC & Last Name: ${missingBoth} employees

DEPARTMENT BREAKDOWN:
${Object.entries(departmentBreakdown)
  .sort(([,a], [,b]) => (b as any).total - (a as any).total)
  .map(([dept, stats]) => `${dept}: ${(stats as any).total} employees`)
  .join('\n')}

CRITICAL ISSUES:
• ${missingBoth} employees missing both CNIC and Last Name (highest priority)
• ${missingCnicOnly} employees missing CNIC (affects payroll compliance)
• ${missingLastNameOnly} employees missing Last Name (affects official records)

NEXT STEPS:
1. HR to collect missing CNICs from ${missingCnicOnly + missingBoth} employees
2. Update employee records with missing last names for ${missingLastNameOnly + missingBoth} employees
3. Priority focus on ${missingBoth} employees with multiple missing fields

Report generated by Nexlinx Smart EMS
Contact: naeemhaq1@gmail.com | WhatsApp: +92345678900
`;

    // Generate WhatsApp message
    const whatsappMessage = `🔍 *NEXLINX EMS - INCOMPLETE DATA REPORT*\n📅 ${reportDate}\n\n📊 *SUMMARY:*\n• Total incomplete: ${totalIncomplete}/${322} employees (${((totalIncomplete / 322) * 100).toFixed(1)}%)\n• Missing CNIC only: ${missingCnicOnly}\n• Missing Last Name only: ${missingLastNameOnly}\n• Missing both: ${missingBoth}\n\n⚠️ *CRITICAL:* ${missingBoth} employees missing both CNIC & Last Name\n\n📋 Detailed CSV report available\n📧 Full report sent via email\n\n*Next Steps:*\n1. HR collect missing CNICs\n2. Update missing last names\n3. Priority: ${missingBoth} employees with multiple issues`;

    return {
      summary: {
        totalIncomplete,
        missingCnicOnly,
        missingLastNameOnly,
        missingBoth,
        percentage: ((totalIncomplete / 322) * 100).toFixed(1)
      },
      emailContent,
      whatsappMessage,
      csvGenerated: true,
      employees: processedEmployees
    };

  } catch (error) {
    console.error('Error generating incomplete data report:', error);
    throw error;
  }
}

export { generateIncompleteDataReport };

// Run the report generation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateIncompleteDataReport()
    .then(result => {
      console.log('\n=== REPORT GENERATION COMPLETED ===');
      console.log(`Total incomplete employees: ${result.summary.totalIncomplete}`);
      console.log(`CSV report generated: ${result.csvGenerated}`);
    })
    .catch(error => {
      console.error('Failed to generate report:', error);
    });
}