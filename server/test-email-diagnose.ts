import nodemailer from "nodemailer";
import dotenv from "dotenv";
import dns from "dns/promises";
import net from "net";

dotenv.config();

async function diagnoseSMTPSettings() {
  console.log("=== SMTP Email Diagnostics ===");
  console.log(`Date: ${new Date().toISOString()}`);
  console.log("");

  // Configuration details
  const config = {
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
  };

  console.log("1. SMTP Configuration:");
  console.log(`   Host: ${config.host}`);
  console.log(`   Port: ${config.port}`);
  console.log(`   Secure: ${config.secure}`);
  console.log(`   Auth User: ${config.auth.user}`);
  console.log(`   Password: ${config.auth.pass.substring(0, 4)}****`);
  console.log("");

  // DNS Resolution
  console.log("2. DNS Resolution Test:");
  try {
    const addresses = await dns.resolve4(config.host);
    console.log(`   ✓ DNS resolved ${config.host} to: ${addresses.join(", ")}`);
  } catch (error) {
    console.log(`   ✗ DNS resolution failed: ${error.message}`);
  }
  console.log("");

  // Port connectivity test
  console.log("3. Port Connectivity Test:");
  await new Promise<void>((resolve) => {
    const socket = new net.Socket();
    const timeout = setTimeout(() => {
      socket.destroy();
      console.log(`   ✗ Connection timeout to ${config.host}:${config.port}`);
      resolve();
    }, 5000);

    socket.connect(config.port, config.host, () => {
      clearTimeout(timeout);
      console.log(`   ✓ Successfully connected to ${config.host}:${config.port}`);
      socket.end();
      resolve();
    });

    socket.on("error", (err) => {
      clearTimeout(timeout);
      console.log(`   ✗ Connection error: ${err.message}`);
      resolve();
    });
  });
  console.log("");

  // SMTP Authentication Test
  console.log("4. SMTP Authentication Test:");
  const transporter = nodemailer.createTransport(config);
  
  try {
    const verified = await transporter.verify();
    if (verified) {
      console.log("   ✓ SMTP authentication successful");
      console.log("   ✓ Server ready to send emails");
    }
  } catch (error: any) {
    console.log(`   ✗ SMTP authentication failed: ${error.message}`);
    if (error.responseCode) {
      console.log(`   Response code: ${error.responseCode}`);
    }
  }
  console.log("");

  // Send test email
  console.log("5. Sending Test Email:");
  console.log(`   From: "Nexlinx Smart EMS" <${config.auth.user}>`);
  console.log(`   To: naeemhaq1@gmail.com`);
  console.log(`   CC: naeemuhaq@hotmail.com`);
  
  try {
    const info = await transporter.sendMail({
      from: `"Nexlinx Smart EMS" <${config.auth.user}>`,
      to: "naeemhaq1@gmail.com",
      cc: "naeemuhaq@hotmail.com",
      subject: `SMTP Test - ${new Date().toLocaleString()}`,
      text: `This is a test email to verify SMTP settings.\n\nTimestamp: ${new Date().toISOString()}\nServer: ${config.host}\nPort: ${config.port}`,
      html: `
        <h3>SMTP Test Email</h3>
        <p>This is a test email to verify SMTP settings.</p>
        <ul>
          <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
          <li><strong>Server:</strong> ${config.host}</li>
          <li><strong>Port:</strong> ${config.port}</li>
          <li><strong>From:</strong> ${config.auth.user}</li>
        </ul>
      `
    });

    console.log(`   ✓ Email sent successfully`);
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Response: ${info.response}`);
    console.log(`   Accepted recipients: ${info.accepted.join(", ")}`);
    if (info.rejected.length > 0) {
      console.log(`   Rejected recipients: ${info.rejected.join(", ")}`);
    }
  } catch (error: any) {
    console.log(`   ✗ Failed to send email: ${error.message}`);
    if (error.code) {
      console.log(`   Error code: ${error.code}`);
    }
    if (error.command) {
      console.log(`   Failed command: ${error.command}`);
    }
  }
  console.log("");

  // Additional server information
  console.log("6. SMTP Server Capabilities:");
  try {
    await new Promise<void>((resolve, reject) => {
      const socket = net.createConnection(config.port, config.host);
      
      socket.setTimeout(5000);
      socket.setEncoding('utf8');
      
      let data = '';
      
      socket.on('data', (chunk) => {
        data += chunk;
        if (data.includes('\r\n')) {
          console.log(`   Server greeting: ${data.trim()}`);
          socket.write('EHLO localhost\r\n');
        }
        if (data.includes('250 ') && data.includes('\r\n250 ')) {
          const capabilities = data.split('\r\n').filter(line => line.startsWith('250'));
          capabilities.forEach(cap => {
            console.log(`   ${cap}`);
          });
          socket.end();
          resolve();
        }
      });
      
      socket.on('error', (err) => {
        console.log(`   ✗ Could not retrieve server capabilities: ${err.message}`);
        reject(err);
      });
      
      socket.on('timeout', () => {
        console.log(`   ✗ Connection timeout`);
        socket.destroy();
        reject(new Error('Timeout'));
      });
    }).catch(() => {});
  } catch (error) {
    // Error already logged
  }

  console.log("\n=== Diagnostics Complete ===");
  process.exit(0);
}

diagnoseSMTPSettings();