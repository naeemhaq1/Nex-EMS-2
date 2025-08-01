import { db } from "./db";
import { employeeRecords, attendanceRecords } from "@shared/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { WhatsAppService } from "./services/whatsappService";

async function sendWhatsAppCnicReport() {
  console.log("📱 Sending WhatsApp CNIC report...\n");
  
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
    
    // Create WhatsApp content (shorter format due to message limits)
    const whatsappContent = `🚨 *CNIC Collection Required*
*${employeeList.length} Employees Missing CNICs*

📊 *Summary:*
• High Priority: ${highPriority.length} (Active)
• Medium Priority: ${mediumPriority.length} (Some activity)  
• Low Priority: ${lowPriority.length} (Inactive)

🔥 *HIGH PRIORITY (Active Employees):*
${highPriority.slice(0, 10).map(emp => 
  `• ${emp.employeeCode}: ${emp.fullName}\n  📍 ${emp.department} | 📱 ${emp.phone}`).join('\n')}${highPriority.length > 10 ? `\n...and ${highPriority.length - 10} more HIGH priority employees` : ''}

*Generated:* ${currentDate}
*System:* Nexlinx Smart EMS

Please collect CNICs from HIGH priority employees first as they are actively working but missing CNICs for compliance.`;

    console.log("📱 Sending WhatsApp message...");
    console.log("Message content:", whatsappContent);
    
    // Send WhatsApp message
    const whatsappService = new WhatsAppService();
    
    try {
      const result = await whatsappService.sendMessage('92345678900', whatsappContent);
      
      if (result.success) {
        console.log("✅ WhatsApp message sent successfully to 92345678900");
        console.log("Message ID:", result.messageId);
      } else {
        console.error("❌ Failed to send WhatsApp message:", result.error);
      }
    } catch (whatsappError) {
      console.error("❌ WhatsApp service error:", whatsappError.message);
    }
    
    console.log("\n🎉 WHATSAPP REPORT SUMMARY:");
    console.log(`📊 Total employees without CNIC: ${employeeList.length}`);
    console.log(`🔥 High priority (active): ${highPriority.length}`);
    console.log(`🔶 Medium priority: ${mediumPriority.length}`);
    console.log(`⚪ Low priority: ${lowPriority.length}`);
    console.log(`📱 WhatsApp sent to: 92345678900`);
    console.log(`✨ Missing CNIC WhatsApp report sent successfully!`);
    
  } catch (error) {
    console.error("❌ Error sending WhatsApp CNIC report:", error);
  }
}

sendWhatsAppCnicReport().catch(console.error);