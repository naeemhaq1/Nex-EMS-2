import { db } from "./db";
import { employeeRecords, attendanceRecords } from "@shared/schema";
import { eq, and, gte, lte, sql, isNotNull } from "drizzle-orm";
import { format, startOfWeek, endOfWeek, eachWeekOfInterval } from "date-fns";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Simple email sending function
async function sendEmail(to: string, subject: string, html: string, text: string) {
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
      subject,
      html,
      text
    });
    
    console.log("Email sent:", info.messageId);
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
    
    // Create simple HTML report
    let html = `
    <h2>Monthly Attendance Report - June 2025</h2>
    <p>Report generated on: ${format(new Date(), 'MMMM dd, yyyy')}</p>
    <p>Total Departments: ${departmentData.size}</p>
    <hr>
    `;
    
    let text = `Monthly Attendance Report - June 2025\n`;
    text += `Report generated on: ${format(new Date(), 'MMMM dd, yyyy')}\n`;
    text += `Total Departments: ${departmentData.size}\n\n`;
    
    for (const [dept, employees] of departmentData) {
      html += `<h3>${dept}</h3>`;
      html += `<table border="1" cellpadding="5" style="border-collapse: collapse;">`;
      html += `<tr><th>Employee Code</th><th>Employee Name</th><th>Total Hours</th><th>Attendance %</th></tr>`;
      
      text += `\nDepartment: ${dept}\n`;
      text += `${'='.repeat(50)}\n`;
      
      for (const emp of employees) {
        html += `<tr>`;
        html += `<td>${emp.employeeCode}</td>`;
        html += `<td>${emp.employeeName}</td>`;
        html += `<td>${emp.totalHours}h</td>`;
        html += `<td>${emp.attendancePercentage}%</td>`;
        html += `</tr>`;
        
        text += `${emp.employeeCode} - ${emp.employeeName}: ${emp.totalHours}h (${emp.attendancePercentage}%)\n`;
      }
      
      html += `</table><br>`;
    }
    
    console.log("Sending email to naeemhaq1@gmail.com...");
    
    const success = await sendEmail(
      "naeemhaq1@gmail.com",
      "Monthly Attendance Report - June 2025",
      html,
      text
    );
    
    if (success) {
      console.log("✓ Report sent successfully!");
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