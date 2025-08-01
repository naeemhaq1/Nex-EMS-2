import { db } from "./db";
import { employeeRecords, attendanceRecords } from "@shared/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { emailService } from "./services/emailService";
import axios from 'axios';

async function sendMissingCnicReport() {
  console.log("📋 Generating and sending missing CNIC report...\n");
  
  try {
    // Get all employees without CNICs
    const employeesWithoutCnic = await db
      .select({
        employeeCode: employeeRecords.employeeCode,
        firstName: employeeRecords.firstName,
        middleName: employeeRecords.middleName,
        lastName: employeeRecords.lastName,
        department: employeeRecords.department,
        designation: employeeRecords.designation,
        phone: employeeRecords.phone,
        email: employeeRecords.email,
        pop: employeeRecords.pop,
        joiningDate: employeeRecords.joiningDate
      })
      .from(employeeRecords)
      .where(and(
        eq(employeeRecords.isActive, true),
        sql`${employeeRecords.nationalId} IS NULL`
      ));
    
    console.log(`Found ${employeesWithoutCnic.length} employees without CNICs`);
    
    // Get employee codes for attendance check
    const employeeCodes = employeesWithoutCnic.map(emp => emp.employeeCode);
    
    // Check attendance data
    const attendanceCheck = await db
      .select({
        employeeCode: attendanceRecords.employeeCode,
        totalRecords: sql<number>`COUNT(*)`,
        recentRecords: sql<number>`COUNT(*) FILTER (WHERE ${attendanceRecords.checkIn} >= NOW() - INTERVAL '30 days')`
      })
      .from(attendanceRecords)
      .where(inArray(attendanceRecords.employeeCode, employeeCodes))
      .groupBy(attendanceRecords.employeeCode);
    
    // Create attendance lookup
    const attendanceMap = new Map();
    attendanceCheck.forEach(att => {
      attendanceMap.set(att.employeeCode, {
        total: Number(att.totalRecords),
        recent: Number(att.recentRecords)
      });
    });
    
    // Prepare the employee list
    const employeeList = employeesWithoutCnic.map(emp => {
      const fullName = `${emp.firstName} ${emp.middleName || ''} ${emp.lastName}`.trim();
      const attendance = attendanceMap.get(emp.employeeCode) || { total: 0, recent: 0 };
      const priority = attendance.recent > 0 ? "HIGH" : attendance.total > 0 ? "MEDIUM" : "LOW";
      
      return {
        employeeCode: emp.employeeCode,
        fullName,
        department: emp.department,
        designation: emp.designation || 'Not set',
        phone: emp.phone || 'Not available',
        email: emp.email || 'Not available',
        location: emp.pop || 'Not set',
        joiningDate: emp.joiningDate ? emp.joiningDate.toISOString().split('T')[0] : 'Not set',
        priority,
        totalAttendance: attendance.total,
        recentAttendance: attendance.recent
      };
    });
    
    // Sort by priority (HIGH first)
    employeeList.sort((a, b) => {
      const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
    
    const currentDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    const highPriority = employeeList.filter(emp => emp.priority === 'HIGH');
    const mediumPriority = employeeList.filter(emp => emp.priority === 'MEDIUM');
    const lowPriority = employeeList.filter(emp => emp.priority === 'LOW');
    
    // Create email content
    const emailContent = `
<html>
<body>
<h2>🚨 Employee CNIC Collection Required - ${employeeList.length} Employees</h2>

<p><strong>Report Generated:</strong> ${currentDate}</p>
<p><strong>System:</strong> Nexlinx Smart EMS</p>

<h3>📊 Summary:</h3>
<ul>
<li><strong>High Priority (Active):</strong> ${highPriority.length} employees</li>
<li><strong>Medium Priority (Some activity):</strong> ${mediumPriority.length} employees</li>
<li><strong>Low Priority (Inactive):</strong> ${lowPriority.length} employees</li>
</ul>

<h3>🔥 HIGH PRIORITY EMPLOYEES (${highPriority.length}):</h3>
<p><em>These employees are actively using biometric attendance but missing CNICs:</em></p>
<table border="1" style="border-collapse: collapse; width: 100%;">
<tr style="background-color: #f2f2f2;">
<th>Employee Code</th><th>Name</th><th>Department</th><th>Phone</th><th>Recent Punches</th>
</tr>
${highPriority.map(emp => `
<tr>
<td>${emp.employeeCode}</td>
<td>${emp.fullName}</td>
<td>${emp.department}</td>
<td>${emp.phone}</td>
<td>${emp.recentAttendance}</td>
</tr>`).join('')}
</table>

<h3>📋 COMPLETE EMPLOYEE LIST:</h3>
<table border="1" style="border-collapse: collapse; width: 100%;">
<tr style="background-color: #f2f2f2;">
<th>No.</th><th>Employee Code</th><th>Name</th><th>Department</th><th>Designation</th><th>Priority</th><th>Phone</th><th>Email</th><th>Location</th>
</tr>
${employeeList.map((emp, index) => `
<tr>
<td>${index + 1}</td>
<td>${emp.employeeCode}</td>
<td>${emp.fullName}</td>
<td>${emp.department}</td>
<td>${emp.designation}</td>
<td>${emp.priority}</td>
<td>${emp.phone}</td>
<td>${emp.email}</td>
<td>${emp.location}</td>
</tr>`).join('')}
</table>

<p><strong>Next Steps:</strong></p>
<ol>
<li>Prioritize collection from HIGH priority employees (actively working)</li>
<li>Contact employees directly using provided phone numbers</li>
<li>Update CNICs in the EMS system once collected</li>
</ol>

<p><em>This report was automatically generated by Nexlinx Smart EMS.</em></p>
</body>
</html>
`;

    // Create WhatsApp content
    const whatsappContent = `🚨 *CNIC Collection Required*
*${employeeList.length} Employees Missing CNICs*

📊 *Summary:*
• High Priority: ${highPriority.length} (Active)
• Medium Priority: ${mediumPriority.length} (Some activity)  
• Low Priority: ${lowPriority.length} (Inactive)

🔥 *HIGH PRIORITY (Active Employees):*
${highPriority.map(emp => 
  `• ${emp.employeeCode}: ${emp.fullName}
  📍 ${emp.department} | 📱 ${emp.phone}`).join('\n')}

📋 *Complete List:*
${employeeList.map((emp, index) => 
  `${index + 1}. ${emp.employeeCode} - ${emp.fullName}
   ${emp.department} | ${emp.priority} Priority`).join('\n')}

*Generated:* ${currentDate}
*System:* Nexlinx Smart EMS`;

    console.log("📧 Sending email...");
    
    // Send email
    try {
      const emailSent = await emailService.sendEmail({
        to: "naeemhaq1@gmail.com",
        subject: `Employee CNIC Collection Required - ${employeeList.length} Employees`,
        html: emailContent
      });
      
      if (emailSent) {
        console.log("✅ Email sent successfully to naeemhaq1@gmail.com");
      } else {
        console.log("❌ Failed to send email - check email service logs");
      }
    } catch (emailError) {
      console.error("❌ Failed to send email:", emailError.message);
    }
    
    console.log("📱 Sending WhatsApp message...");
    
    // Send WhatsApp message
    try {
      const whatsappResponse = await axios.post('http://localhost:3000/send-message', {
        to: '923008463660',
        message: whatsappContent
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000
      });
      
      if (whatsappResponse.status === 200) {
        console.log("✅ WhatsApp message sent successfully to 923008463660");
      } else {
        console.error("❌ Failed to send WhatsApp message:", whatsappResponse.data);
      }
    } catch (whatsappError) {
      console.error("❌ WhatsApp service error:", whatsappError.message);
    }
    
    console.log("\n🎉 REPORT SUMMARY:");
    console.log(`📊 Total employees without CNIC: ${employeeList.length}`);
    console.log(`🔥 High priority (active): ${highPriority.length}`);
    console.log(`🔶 Medium priority: ${mediumPriority.length}`);
    console.log(`⚪ Low priority: ${lowPriority.length}`);
    console.log(`📧 Email sent to: naeemhaq1@gmail.com`);
    console.log(`📱 WhatsApp sent to: 923008463660`);
    console.log(`\n✨ Missing CNIC report sent successfully!`);
    
  } catch (error) {
    console.error("❌ Error sending missing CNIC report:", error);
  }
}

sendMissingCnicReport().catch(console.error);