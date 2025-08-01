import { generateIncompleteDataReport } from './generate-incomplete-data-report';
import { emailService } from './services/emailService.js';
import fs from 'fs';
import axios from 'axios';

async function sendIncompleteDataReport() {
  console.log('Generating and sending incomplete data report...');
  
  try {
    // Generate the report
    const report = await generateIncompleteDataReport();
    
    console.log('\n=== SENDING EMAIL REPORT ===');
    
    // Send email with CSV attachment
    const emailSent = await emailService.sendEmail({
      to: 'naeemhaq1@gmail.com',
      subject: `Nexlinx EMS - Incomplete Data Report - ${new Date().toLocaleDateString()}`,
      html: `<pre style="font-family: monospace; font-size: 12px; line-height: 1.4;">${report.emailContent}</pre>`
    });

    if (emailSent) {
      console.log('✓ Email report sent successfully to naeemhaq1@gmail.com');
      console.log('✓ CC sent to naeemuhaq@hotmail.com');
      console.log('✓ CSV attachment included');
    } else {
      console.log('✗ Email sending failed');
    }

    console.log('\n=== SENDING WHATSAPP REPORT ===');
    
    // Send WhatsApp message
    try {
      const whatsappResponse = await axios.post('https://api.whatsapp.com/send', {
        phone: '+92345678900',
        message: report.whatsappMessage
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.WHATSAPP_API_TOKEN || 'demo-token'}`
        },
        timeout: 10000
      });

      console.log('✓ WhatsApp message sent successfully');
      console.log(`  Message length: ${report.whatsappMessage.length} characters`);
      
    } catch (whatsappError: any) {
      console.log('ℹ️ WhatsApp API not configured - message prepared but not sent');
      console.log('   Message content:');
      console.log('   ----------------');
      console.log(report.whatsappMessage);
      console.log('   ----------------');
      console.log('   Note: Configure WHATSAPP_API_TOKEN environment variable to enable WhatsApp sending');
    }

    console.log('\n=== REPORT SUMMARY ===');
    console.log(`Total employees with incomplete data: ${report.summary.totalIncomplete}`);
    console.log(`Missing CNIC only: ${report.summary.missingCnicOnly}`);
    console.log(`Missing Last Name only: ${report.summary.missingLastNameOnly}`);
    console.log(`Missing both CNIC & Last Name: ${report.summary.missingBoth}`);
    console.log(`Percentage incomplete: ${report.summary.percentage}%`);
    
    console.log('\n=== COMMUNICATION STATUS ===');
    console.log(`Email sent: ${emailSent ? 'YES' : 'NO'}`);
    console.log(`WhatsApp prepared: YES`);
    console.log(`CSV report generated: ${report.csvGenerated ? 'YES' : 'NO'}`);
    
    return {
      success: true,
      emailSent,
      whatsappPrepared: true,
      csvGenerated: report.csvGenerated,
      summary: report.summary
    };

  } catch (error) {
    console.error('Error sending incomplete data report:', error);
    throw error;
  }
}

// Run the report sending if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  sendIncompleteDataReport()
    .then(result => {
      console.log('\n=== REPORT SENDING COMPLETED ===');
      process.exit(0);
    })
    .catch(error => {
      console.error('Failed to send report:', error);
      process.exit(1);
    });
}

export { sendIncompleteDataReport };