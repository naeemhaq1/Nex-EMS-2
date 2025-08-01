import { emailService } from "./services/emailService";
import { attendanceReportService } from "./services/attendanceReportService";
import { format } from "date-fns";

async function sendMonthlyReport() {
  try {
    console.log("Generating monthly attendance report for June 2025...");
    
    // Generate the report for June 2025
    const reportMonth = new Date(2025, 5, 1); // June 2025
    const reportData = await attendanceReportService.generateMonthlyAttendanceReport(reportMonth);
    
    console.log(`Generated report for ${reportData.length} departments`);
    
    // Format as HTML and text
    const htmlContent = attendanceReportService.formatReportAsHtml(reportData, reportMonth);
    const textContent = attendanceReportService.formatReportAsText(reportData, reportMonth);
    
    console.log("Sending email to naeemhaq1@gmail.com...");
    
    // Send the email
    const success = await emailService.sendEmail({
      to: "naeemhaq1@gmail.com",
      subject: `Monthly Attendance Report - ${format(reportMonth, 'MMMM yyyy')}`,
      html: htmlContent,
      text: textContent
    });
    
    if (success) {
      console.log("✓ Monthly attendance report sent successfully!");
      console.log(`Report month: ${format(reportMonth, 'MMMM yyyy')}`);
    } else {
      console.error("✗ Failed to send report");
    }
    
    process.exit(0);
  } catch (error) {
    console.error("Error sending report:", error);
    process.exit(1);
  }
}

// Run the function
sendMonthlyReport();