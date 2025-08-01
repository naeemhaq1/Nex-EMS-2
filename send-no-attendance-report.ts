import { db } from "./db";
import { employeeRecords, attendanceRecords } from "@shared/schema";
import { eq, sql, and, notInArray } from "drizzle-orm";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

async function generateNoAttendanceReport() {
  console.log("=== Generating No Attendance Report ===");
  console.log(`Date: ${new Date().toISOString()}\n`);

  try {
    // Get all employee codes that have attendance records
    const employeesWithAttendance = await db
      .selectDistinct({ employeeCode: attendanceRecords.employeeCode })
      .from(attendanceRecords);

    const attendanceEmployeeCodes = employeesWithAttendance.map(e => e.employeeCode);

    // Get all active employees who are NOT in the attendance list
    let query;
    if (attendanceEmployeeCodes.length > 0) {
      query = db
        .select({
          employeeCode: employeeRecords.employeeCode,
          firstName: employeeRecords.firstName,
          lastName: employeeRecords.lastName,
          department: employeeRecords.department,
          position: employeeRecords.position,
          hireDate: employeeRecords.hireDate,
          empType: employeeRecords.empType,
          phone: employeeRecords.phone,
          email: employeeRecords.email
        })
        .from(employeeRecords)
        .where(
          and(
            eq(employeeRecords.isActive, true),
            sql`LOWER(${employeeRecords.firstName}) != 'noc'`,
            notInArray(employeeRecords.employeeCode, attendanceEmployeeCodes)
          )
        )
        .orderBy(employeeRecords.department, employeeRecords.employeeCode);
    } else {
      query = db
        .select({
          employeeCode: employeeRecords.employeeCode,
          firstName: employeeRecords.firstName,
          lastName: employeeRecords.lastName,
          department: employeeRecords.department,
          position: employeeRecords.position,
          hireDate: employeeRecords.hireDate,
          empType: employeeRecords.empType,
          phone: employeeRecords.phone,
          email: employeeRecords.email
        })
        .from(employeeRecords)
        .where(
          and(
            eq(employeeRecords.isActive, true),
            sql`LOWER(${employeeRecords.firstName}) != 'noc'`
          )
        )
        .orderBy(employeeRecords.department, employeeRecords.employeeCode);
    }

    const employeesWithNoAttendance = await query;

    // Get summary statistics
    const totalActiveResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(employeeRecords)
      .where(
        and(
          eq(employeeRecords.isActive, true),
          sql`LOWER(${employeeRecords.firstName}) != 'noc'`
        )
      );
    
    const totalActiveCount = totalActiveResult[0]?.count || 0;

    const totalWithAttendance = await db
      .selectDistinct({ employeeCode: attendanceRecords.employeeCode })
      .from(attendanceRecords);
    
    const uniqueAttendanceCount = totalWithAttendance.length;

    // Group by department
    const byDepartment: { [key: string]: typeof employeesWithNoAttendance } = {};
    
    employeesWithNoAttendance.forEach(emp => {
      const dept = emp.department || 'No Department';
      if (!byDepartment[dept]) {
        byDepartment[dept] = [];
      }
      byDepartment[dept].push(emp);
    });

    // Generate HTML report
    const reportDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    let htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background-color: #2c3e50; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; max-width: 1200px; margin: 0 auto; }
    .summary { background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
    .summary-stat { display: inline-block; margin: 0 20px; }
    .department { margin-bottom: 30px; }
    .department-header { background-color: #3498db; color: white; padding: 10px; border-radius: 5px; }
    table { border-collapse: collapse; width: 100%; margin-top: 10px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #34495e; color: white; }
    tr:nth-child(even) { background-color: #f2f2f2; }
    .footer { text-align: center; margin-top: 30px; color: #7f8c8d; font-size: 12px; }
    .alert { background-color: #e74c3c; color: white; padding: 10px; border-radius: 5px; margin-bottom: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Nexlinx Smart EMS</h1>
    <h2>Employees Without Attendance Records</h2>
    <p>Report Generated: ${reportDate}</p>
  </div>
  
  <div class="content">
    <div class="alert">
      <strong>Alert:</strong> The following employees have never registered any attendance in the BioTime system.
    </div>
    
    <div class="summary">
      <h3>Summary Statistics</h3>
      <div class="summary-stat">
        <strong>Total Active Employees:</strong> ${totalActiveCount}
      </div>
      <div class="summary-stat">
        <strong>Employees with Attendance:</strong> ${uniqueAttendanceCount}
      </div>
      <div class="summary-stat">
        <strong>Employees WITHOUT Attendance:</strong> ${employeesWithNoAttendance.length}
      </div>
      <div class="summary-stat">
        <strong>Percentage Missing:</strong> ${totalActiveCount > 0 ? ((employeesWithNoAttendance.length / totalActiveCount) * 100).toFixed(1) : 0}%
      </div>
    </div>
`;

    // Add department sections
    Object.keys(byDepartment).sort().forEach(dept => {
      const employees = byDepartment[dept];
      htmlContent += `
    <div class="department">
      <div class="department-header">
        <h3>${dept} (${employees.length} employees)</h3>
      </div>
      <table>
        <thead>
          <tr>
            <th>Employee Code</th>
            <th>Full Name</th>
            <th>Position</th>
            <th>Employee Type</th>
            <th>Phone</th>
            <th>Email</th>
            <th>Hire Date</th>
          </tr>
        </thead>
        <tbody>`;

      employees.forEach(emp => {
        const fullName = `${emp.firstName} ${emp.lastName || ''}`.trim();
        const hireDate = emp.hireDate ? new Date(emp.hireDate).toLocaleDateString() : 'N/A';
        htmlContent += `
          <tr>
            <td>${emp.employeeCode}</td>
            <td>${fullName}</td>
            <td>${emp.position || 'N/A'}</td>
            <td>${emp.empType}</td>
            <td>${emp.phone || 'N/A'}</td>
            <td>${emp.email || 'N/A'}</td>
            <td>${hireDate}</td>
          </tr>`;
      });

      htmlContent += `
        </tbody>
      </table>
    </div>`;
    });

    htmlContent += `
    <div class="footer">
      <p>This is an automated report from Nexlinx Smart EMS. Please review and take necessary action.</p>
      <p>For questions, contact HR department.</p>
    </div>
  </div>
</body>
</html>`;

    // Generate plain text version
    let textContent = `NEXLINX SMART EMS - EMPLOYEES WITHOUT ATTENDANCE RECORDS\n`;
    textContent += `Report Generated: ${reportDate}\n`;
    textContent += `${'='.repeat(80)}\n\n`;
    textContent += `SUMMARY:\n`;
    textContent += `Total Active Employees: ${totalActiveCount}\n`;
    textContent += `Employees with Attendance: ${uniqueAttendanceCount}\n`;
    textContent += `Employees WITHOUT Attendance: ${employeesWithNoAttendance.length}\n`;
    textContent += `Percentage Missing: ${totalActiveCount > 0 ? ((employeesWithNoAttendance.length / totalActiveCount) * 100).toFixed(1) : 0}%\n\n`;
    textContent += `DETAILED LIST BY DEPARTMENT:\n`;
    textContent += `${'='.repeat(80)}\n\n`;

    Object.keys(byDepartment).sort().forEach(dept => {
      textContent += `${dept} (${byDepartment[dept].length} employees)\n`;
      textContent += `${'-'.repeat(dept.length + 15)}\n`;
      byDepartment[dept].forEach(emp => {
        const fullName = `${emp.firstName} ${emp.lastName || ''}`.trim();
        const hireDate = emp.hireDate ? new Date(emp.hireDate).toLocaleDateString() : 'N/A';
        textContent += `  ${emp.employeeCode} - ${fullName} - ${emp.empType} - Hired: ${hireDate}\n`;
      });
      textContent += '\n';
    });

    // Send email using SMTP
    console.log("Sending email report...");
    
    try {
      // Create transporter with SMTP settings
      const transporter = nodemailer.createTransport({
        host: "emailserver.nexlinx.net.pk",
        port: 587,
        secure: false,
        auth: {
          user: "fstream@emailserver.nexlinx.net.pk",
          pass: "I4eCyrg0UP3qROkD"
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      // Send the email
      const info = await transporter.sendMail({
        from: '"Nexlinx Smart EMS" <fstream@emailserver.nexlinx.net.pk>',
        to: "naeemhaq1@gmail.com",
        subject: `No Attendance Report - ${employeesWithNoAttendance.length} Employees Missing - ${reportDate}`,
        html: htmlContent,
        text: textContent
      });

      console.log("✓ Email report sent successfully to naeemhaq1@gmail.com");
      console.log("Message ID:", info.messageId);
      return true;
    } catch (error) {
      console.error("✗ Failed to send email report:", error);
      return false;
    }

  } catch (error) {
    console.error("Error generating report:", error);
    return false;
  }
}

// Run the report
generateNoAttendanceReport().then(success => {
  process.exit(success ? 0 : 1);
});