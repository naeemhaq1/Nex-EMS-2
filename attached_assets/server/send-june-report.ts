import { emailService } from "./services/emailService";
import { attendanceReportService } from "./services/attendanceReportService";
import { format } from "date-fns";

async function sendJuneReport() {
  try {
    console.log("Generating June 2025 attendance report...");
    
    // Generate the report for June 2025
    const juneMonth = new Date(2025, 5, 1); // June 2025 (month is 0-indexed)
    const reportData = await attendanceReportService.generateMonthlyAttendanceReport(juneMonth);
    
    console.log(`Generated report for ${reportData.length} departments`);
    
    // Format as HTML
    const htmlContent = attendanceReportService.formatReportAsHtml(reportData, juneMonth);
    const textContent = attendanceReportService.formatReportAsText(reportData, juneMonth);
    
    console.log("Sending email to naeemhaq1@gmail.com...");
    
    // Send the email with proper timeout handling
    const emailPromise = emailService.sendEmail({
      to: "naeemhaq1@gmail.com",
      subject: `Monthly Attendance Report - ${format(juneMonth, 'MMMM yyyy')}`,
      html: htmlContent,
      text: textContent
    });
    
    // Set a timeout of 30 seconds
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Email sending timeout')), 30000)
    );
    
    const success = await Promise.race([emailPromise, timeoutPromise]);
    
    if (success) {
      console.log("✓ June 2025 attendance report sent successfully to naeemhaq1@gmail.com!");
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
sendJuneReport();