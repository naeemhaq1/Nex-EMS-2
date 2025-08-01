import { db } from "./db";
import { employeeRecords, attendanceRecords } from "@shared/schema";
import { eq, and, sql, inArray } from "drizzle-orm";

async function exportMissingCnicEmployees() {
  console.log("📋 Exporting employees without CNICs...\n");
  
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
    
    // Create formatted lists
    const currentDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    // Email content
    const emailContent = `
Subject: Employee CNIC Collection Required - ${employeeList.length} Employees

Dear Team,

The following ${employeeList.length} employees require CNIC collection for compliance purposes. 
Report generated on: ${currentDate}

SUMMARY:
- High Priority (Active): ${employeeList.filter(emp => emp.priority === 'HIGH').length} employees
- Medium Priority (Some activity): ${employeeList.filter(emp => emp.priority === 'MEDIUM').length} employees  
- Low Priority (Inactive): ${employeeList.filter(emp => emp.priority === 'LOW').length} employees

EMPLOYEE LIST:
${employeeList.map((emp, index) => `
${index + 1}. ${emp.employeeCode} - ${emp.fullName}
   Department: ${emp.department} | Location: ${emp.location}
   Designation: ${emp.designation}
   Priority: ${emp.priority} (${emp.recentAttendance} recent punches)
   Contact: ${emp.phone} | Email: ${emp.email}
   Joining Date: ${emp.joiningDate}
   ---`).join('\n')}

HIGH PRIORITY EMPLOYEES (${employeeList.filter(emp => emp.priority === 'HIGH').length}):
These employees are actively using biometric attendance but missing CNICs:
${employeeList.filter(emp => emp.priority === 'HIGH').map(emp => 
  `- ${emp.employeeCode}: ${emp.fullName} (${emp.department})`).join('\n')}

Please collect CNICs from these employees at your earliest convenience.

Best regards,
Nexlinx Smart EMS
`;

    // WhatsApp content (shorter format)
    const whatsappContent = `
*🚨 CNIC Collection Required*
*${employeeList.length} Employees Missing CNICs*

*📊 Summary:*
• High Priority: ${employeeList.filter(emp => emp.priority === 'HIGH').length} (Active)
• Medium Priority: ${employeeList.filter(emp => emp.priority === 'MEDIUM').length} (Some activity)  
• Low Priority: ${employeeList.filter(emp => emp.priority === 'LOW').length} (Inactive)

*🔥 HIGH PRIORITY (Active Employees):*
${employeeList.filter(emp => emp.priority === 'HIGH').map(emp => 
  `• ${emp.employeeCode}: ${emp.fullName}\n  📍 ${emp.department} | 📱 ${emp.phone}`).join('\n')}

*📋 Complete List:*
${employeeList.map((emp, index) => 
  `${index + 1}. ${emp.employeeCode} - ${emp.fullName}\n   ${emp.department} | ${emp.priority} Priority`).join('\n')}

*Generated:* ${currentDate}
*System:* Nexlinx Smart EMS
`;

    console.log("📧 EMAIL CONTENT:");
    console.log(emailContent);
    console.log("\n" + "=".repeat(80));
    console.log("📱 WHATSAPP CONTENT:");
    console.log(whatsappContent);
    
    // Return the content for sending
    return {
      email: emailContent,
      whatsapp: whatsappContent,
      employeeList,
      summary: {
        total: employeeList.length,
        high: employeeList.filter(emp => emp.priority === 'HIGH').length,
        medium: employeeList.filter(emp => emp.priority === 'MEDIUM').length,
        low: employeeList.filter(emp => emp.priority === 'LOW').length
      }
    };
    
  } catch (error) {
    console.error("❌ Error exporting missing CNIC employees:", error);
    throw error;
  }
}

// Export the function for use in other scripts
export { exportMissingCnicEmployees };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  exportMissingCnicEmployees().catch(console.error);
}