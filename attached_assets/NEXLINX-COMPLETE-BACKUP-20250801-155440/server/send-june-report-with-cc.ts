import { db } from "./db";
import { employeeRecords, attendanceRecords } from "@shared/schema";
import { eq, and, gte, lte, sql, isNotNull } from "drizzle-orm";
import { format, startOfWeek, endOfWeek, eachWeekOfInterval } from "date-fns";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Simple email sending function with CC support
async function sendEmailWithCC(to: string, cc: string, subject: string, html: string, text: string) {
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

  try {
    const info = await transporter.sendMail({
      from: '"Nexlinx Smart EMS" <fstream@emailserver.nexlinx.net.pk>',
      to,
      cc,
      subject,
      html,
      text
    });
    
    console.log("Email sent:", info.messageId);
    console.log("To:", to);
    console.log("CC:", cc);
    return true;
  } catch (error) {
    console.error("Email error:", error);
    return false;
  }
}

async function generateAndSendJuneReport() {
  try {
    console.log("Generating June 2025 attendance report...");
    
    const monthStart = new Date(2025, 5, 1); // June 1, 2025
    const monthEnd = new Date(2025, 5, 30);  // June 30, 2025
    
    // Get all employees with departments
    const employees = await db
      .select({
        id: employeeRecords.id,
        employeeCode: employeeRecords.employeeCode,
        employeeName: sql<string>`COALESCE(${employeeRecords.firstName} || ' ' || ${employeeRecords.lastName}, ${employeeRecords.firstName}, 'Unknown')`,
        department: employeeRecords.department,
      })
      .from(employeeRecords)
      .where(isNotNull(employeeRecords.department));
    
    console.log(`Found ${employees.length} employees`);
    
    // Get attendance records for June
    const attendance = await db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          gte(attendanceRecords.checkIn, monthStart),
          lte(attendanceRecords.checkIn, monthEnd)
        )
      );
    
    console.log(`Found ${attendance.length} attendance records for June`);
    
    // Group by department
    const departmentData = new Map<string, any[]>();
    
    for (const emp of employees) {
      const dept = emp.department || 'Unknown';
      if (!departmentData.has(dept)) {
        departmentData.set(dept, []);
      }
      
      // Calculate weekly hours
      const empAttendance = attendance.filter(a => a.employeeId === emp.id);
      let totalHours = 0;
      
      for (const record of empAttendance) {
        if (record.checkOut) {
          const hours = (record.checkOut.getTime() - record.checkIn.getTime()) / (1000 * 60 * 60);
          totalHours += hours;
        } else {
          // Assume 8 hours if no checkout
          totalHours += 8;
        }
      }
      
      departmentData.get(dept)!.push({
        employeeCode: emp.employeeCode,
        employeeName: emp.employeeName,
        totalHours: Math.round(totalHours * 10) / 10,
        attendancePercentage: Math.round((totalHours / 200) * 100) // Assuming 200 hours in June
      });
    }
    
    // Create comprehensive HTML report
    let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1, h2, h3 { color: #333; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; font-weight: bold; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .summary { background-color: #e8f4f8; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
      </style>
    </head>
    <body>
      <h1>Nexlinx Smart EMS - Monthly Attendance Report</h1>
      <h2>June 2025</h2>
      <div class="summary">
        <p><strong>Report Generated:</strong> ${format(new Date(), 'MMMM dd, yyyy hh:mm a')}</p>
        <p><strong>Total Departments:</strong> ${departmentData.size}</p>
        <p><strong>Total Employees:</strong> ${employees.length}</p>
        <p><strong>Total Attendance Records:</strong> ${attendance.length}</p>
      </div>
    `;
    
    let text = `NEXLINX SMART EMS - MONTHLY ATTENDANCE REPORT\n`;
    text += `${'='.repeat(50)}\n`;
    text += `JUNE 2025\n\n`;
    text += `Report Generated: ${format(new Date(), 'MMMM dd, yyyy hh:mm a')}\n`;
    text += `Total Departments: ${departmentData.size}\n`;
    text += `Total Employees: ${employees.length}\n`;
    text += `Total Attendance Records: ${attendance.length}\n\n`;
    
    // Sort departments alphabetically
    const sortedDepartments = Array.from(departmentData.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    
    for (const [dept, employees] of sortedDepartments) {
      html += `<h3>Department: ${dept}</h3>`;
      html += `<table>`;
      html += `<tr><th>Employee Code</th><th>Employee Name</th><th>Total Hours (June)</th><th>Attendance %</th></tr>`;
      
      text += `\nDEPARTMENT: ${dept}\n`;
      text += `${'='.repeat(50)}\n`;
      
      // Sort employees by code
      employees.sort((a, b) => a.employeeCode.localeCompare(b.employeeCode));
      
      for (const emp of employees) {
        html += `<tr>`;
        html += `<td>${emp.employeeCode}</td>`;
        html += `<td>${emp.employeeName}</td>`;
        html += `<td>${emp.totalHours} hours</td>`;
        html += `<td>${emp.attendancePercentage}%</td>`;
        html += `</tr>`;
        
        text += `${emp.employeeCode.padEnd(12)} | ${emp.employeeName.padEnd(30)} | ${emp.totalHours.toString().padEnd(8)} hrs | ${emp.attendancePercentage}%\n`;
      }
      
      html += `</table>`;
      text += `\n`;
    }
    
    html += `
      <hr>
      <p style="color: #666; font-size: 12px;">
        This report was automatically generated by Nexlinx Smart EMS.<br>
        For any queries, please contact the HR department.
      </p>
    </body>
    </html>`;
    
    console.log("Sending email to naeemhaq1@gmail.com with CC to naeemuhaq@hotmail.com...");
    
    const success = await sendEmailWithCC(
      "naeemhaq1@gmail.com",
      "naeemuhaq@hotmail.com",
      "Monthly Attendance Report - June 2025 - Nexlinx Smart EMS",
      html,
      text
    );
    
    if (success) {
      console.log("✓ Report sent successfully!");
      console.log("✓ Primary recipient: naeemhaq1@gmail.com");
      console.log("✓ CC recipient: naeemuhaq@hotmail.com");
    } else {
      console.log("✗ Failed to send report");
    }
    
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

generateAndSendJuneReport();