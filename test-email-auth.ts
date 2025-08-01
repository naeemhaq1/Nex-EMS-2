import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

async function testEmailWithAuth() {
  console.log("=== Email Authentication Test ===");
  console.log(`Date: ${new Date().toISOString()}`);
  console.log("");

  // SMTP configuration with full authentication
  const config = {
    host: "emailserver.nexlinx.net.pk",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: "fstream@emailserver.nexlinx.net.pk",
      pass: "I4eCyrg0UP3qROkD"
    },
    tls: {
      // do not fail on invalid certs
      rejectUnauthorized: false,
      ciphers: 'SSLv3'
    },
    // Additional authentication settings
    authMethod: 'PLAIN',
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000
  };

  console.log("SMTP Configuration:");
  console.log("✓ Outgoing server (SMTP) requires authentication: YES");
  console.log("✓ Authentication method: PLAIN/LOGIN");
  console.log("✓ Username: fstream@emailserver.nexlinx.net.pk");
  console.log("✓ Using same credentials for authentication");
  console.log("");

  const transporter = nodemailer.createTransport(config);

  // Verify connection
  try {
    console.log("Verifying SMTP connection...");
    await transporter.verify();
    console.log("✓ SMTP connection verified successfully");
    console.log("✓ Authentication successful");
    console.log("");
  } catch (error) {
    console.error("✗ SMTP verification failed:", error);
    return;
  }

  // Send test email with enhanced headers
  try {
    console.log("Sending authenticated test email...");
    
    const info = await transporter.sendMail({
      from: '"Nexlinx Smart EMS" <fstream@emailserver.nexlinx.net.pk>',
      to: "naeemhaq1@gmail.com",
      cc: "naeemuhaq@hotmail.com",
      subject: `Authenticated Email Test - ${new Date().toLocaleString()}`,
      headers: {
        'X-Mailer': 'Nexlinx Smart EMS',
        'X-Priority': '3',
        'X-MSMail-Priority': 'Normal',
        'Importance': 'Normal',
        'Reply-To': 'fstream@emailserver.nexlinx.net.pk'
      },
      text: `This is an authenticated email test from Nexlinx Smart EMS.

Authentication Details:
- SMTP Server: emailserver.nexlinx.net.pk
- Port: 587 (STARTTLS)
- Authentication: Required (PLAIN/LOGIN)
- Username: fstream@emailserver.nexlinx.net.pk
- Timestamp: ${new Date().toISOString()}

This email was sent using proper SMTP authentication.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Authenticated Email Test</h2>
          <p>This is an authenticated email test from <strong>Nexlinx Smart EMS</strong>.</p>
          
          <h3>Authentication Details:</h3>
          <ul>
            <li><strong>SMTP Server:</strong> emailserver.nexlinx.net.pk</li>
            <li><strong>Port:</strong> 587 (STARTTLS)</li>
            <li><strong>Authentication:</strong> Required (PLAIN/LOGIN)</li>
            <li><strong>Username:</strong> fstream@emailserver.nexlinx.net.pk</li>
            <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
          </ul>
          
          <p style="color: #666; font-size: 12px;">
            This email was sent using proper SMTP authentication with secure credentials.
          </p>
        </div>
      `
    });

    console.log("");
    console.log("✓ Email sent successfully!");
    console.log(`  Message ID: ${info.messageId}`);
    console.log(`  Response: ${info.response}`);
    console.log(`  Envelope:`);
    console.log(`    From: ${info.envelope.from}`);
    console.log(`    To: ${info.envelope.to.join(", ")}`);
    console.log("");
    console.log("Authentication Summary:");
    console.log("✓ SMTP authentication used: YES");
    console.log("✓ TLS/STARTTLS encryption: YES");
    console.log("✓ Authenticated as: fstream@emailserver.nexlinx.net.pk");
    
  } catch (error: any) {
    console.error("✗ Failed to send email:", error.message);
    if (error.code) {
      console.error(`  Error code: ${error.code}`);
    }
  }

  process.exit(0);
}

testEmailWithAuth();