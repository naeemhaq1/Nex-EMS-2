import { generateIncompleteDataReport } from './generate-incomplete-data-report';
import { emailService } from './services/emailService.js';

async function sendSimpleReport() {
  console.log('Generating and sending incomplete data report...');
  
  try {
    // Generate the report
    const report = await generateIncompleteDataReport();
    
    console.log('\n=== SENDING EMAIL REPORT ===');
    
    // Send email
    const emailSent = await emailService.sendEmail({
      to: 'naeemhaq1@gmail.com',
      subject: `Nexlinx EMS - Incomplete Data Report - ${new Date().toLocaleDateString()}`,
      html: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #1e293b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0;">Nexlinx Smart EMS</h1>
          <p style="margin: 10px 0 0 0;">Incomplete Data Report</p>
        </div>
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
          <pre style="font-family: monospace; font-size: 12px; line-height: 1.4; white-space: pre-wrap; background-color: white; padding: 20px; border-radius: 4px; overflow-x: auto;">${report.emailContent}</pre>
        </div>
        <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
          <p>CSV report file generated separately. Contact admin for detailed data.</p>
          <p><strong>Next Steps:</strong> HR to collect missing CNICs and update employee records</p>
        </div>
      </div>`
    });

    if (emailSent) {
      console.log('✓ Email report sent successfully to naeemhaq1@gmail.com');
    } else {
      console.log('✗ Email sending failed');
    }

    console.log('\n=== WHATSAPP MESSAGE PREPARED ===');
    console.log('Message to send to +92345678900:');
    console.log('=====================================');
    console.log(report.whatsappMessage);
    console.log('=====================================');
    
    console.log('\n=== REPORT SUMMARY ===');
    console.log(`Total employees with incomplete data: ${report.summary.totalIncomplete}`);
    console.log(`Missing CNIC only: ${report.summary.missingCnicOnly}`);
    console.log(`Missing Last Name only: ${report.summary.missingLastNameOnly}`);
    console.log(`Missing both CNIC & Last Name: ${report.summary.missingBoth}`);
    console.log(`Percentage incomplete: ${report.summary.percentage}%`);
    
    console.log('\n=== COMMUNICATION STATUS ===');
    console.log(`Email sent: ${emailSent ? 'YES' : 'NO'}`);
    console.log(`WhatsApp message prepared: YES`);
    console.log(`CSV report generated: YES`);
    
    return {
      success: true,
      emailSent,
      whatsappPrepared: true,
      csvGenerated: true,
      summary: report.summary
    };

  } catch (error) {
    console.error('Error sending incomplete data report:', error);
    throw error;
  }
}

// Run the report sending
sendSimpleReport()
  .then(result => {
    console.log('\n=== REPORT SENDING COMPLETED ===');
    console.log('Ready to send WhatsApp message manually to +92345678900');
  })
  .catch(error => {
    console.error('Failed to send report:', error);
  });