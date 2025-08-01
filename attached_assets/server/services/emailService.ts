import nodemailer from 'nodemailer';
import { log } from '../vite';

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    try {
      // SMTP Configuration for Nexlinx email server
      this.transporter = nodemailer.createTransport({
        host: 'emailserver.nexlinx.net.pk',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: 'fstream@emailserver.nexlinx.net.pk',
          pass: 'I4eCyrg0UP3qROkD'
        },
        tls: {
          // Enable TLS encryption
          ciphers: 'SSLv3',
          rejectUnauthorized: false // Set to true in production with valid certificates
        }
      });

      // Verify connection configuration
      this.transporter.verify((error, success) => {
        if (error) {
          log(`Email service error: ${error.message}`, 'email');
        } else {
          log('Email service ready to send messages', 'email');
        }
      });
    } catch (error) {
      log(`Failed to initialize email service: ${error}`, 'email');
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.transporter) {
      log('Email transporter not initialized', 'email');
      return false;
    }

    try {
      const mailOptions = {
        from: '"Nexlinx Smart EMS" <fstream@emailserver.nexlinx.net.pk>',
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        text: options.text || options.html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
        html: options.html
      };

      const info = await this.transporter.sendMail(mailOptions);
      log(`Email sent successfully: ${info.messageId}`, 'email');
      return true;
    } catch (error) {
      log(`Failed to send email: ${error}`, 'email');
      return false;
    }
  }

  // Attendance alert email template
  async sendAttendanceAlert(employeeEmail: string, employeeName: string, alertType: 'late' | 'absent' | 'early-departure') {
    const subject = `Attendance Alert: ${alertType.charAt(0).toUpperCase() + alertType.slice(1).replace('-', ' ')}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #1e293b; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f5f5f5; }
          .alert-type { 
            display: inline-block; 
            padding: 5px 15px; 
            border-radius: 5px; 
            font-weight: bold;
            ${alertType === 'late' ? 'background-color: #fbbf24; color: #000;' : ''}
            ${alertType === 'absent' ? 'background-color: #ef4444; color: #fff;' : ''}
            ${alertType === 'early-departure' ? 'background-color: #f97316; color: #fff;' : ''}
          }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Nexlinx Smart EMS</h1>
            <p>Employee Management System</p>
          </div>
          <div class="content">
            <h2>Attendance Alert</h2>
            <p>Dear ${employeeName},</p>
            <p>This is an automated notification regarding your attendance:</p>
            <p><span class="alert-type">${alertType.charAt(0).toUpperCase() + alertType.slice(1).replace('-', ' ')}</span></p>
            <p>Date: ${new Date().toLocaleDateString()}</p>
            <p>Time: ${new Date().toLocaleTimeString()}</p>
            <p>Please ensure timely attendance to maintain your attendance record.</p>
            <p>If you have any concerns, please contact your supervisor or HR department.</p>
          </div>
          <div class="footer">
            <p>This is an automated email from Nexlinx Smart EMS. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: employeeEmail,
      subject,
      html
    });
  }

  // Welcome email for new employees
  async sendWelcomeEmail(employeeEmail: string, employeeName: string, employeeCode: string, tempPassword?: string) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #1e293b; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f5f5f5; }
          .credentials { background-color: #fff; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .credentials strong { color: #1e293b; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Nexlinx Smart EMS</h1>
          </div>
          <div class="content">
            <h2>Welcome ${employeeName}!</h2>
            <p>Your employee account has been created in the Nexlinx Smart Employee Management System.</p>
            <div class="credentials">
              <p><strong>Employee Code:</strong> ${employeeCode}</p>
              ${tempPassword ? `<p><strong>Temporary Password:</strong> ${tempPassword}</p>` : ''}
              <p><strong>Portal URL:</strong> https://ems.nexlinx.net.pk</p>
            </div>
            <p>You can use these credentials to:</p>
            <ul>
              <li>View your attendance records</li>
              <li>Check your shift schedule</li>
              <li>Submit leave requests</li>
              <li>Update your profile information</li>
            </ul>
            ${tempPassword ? '<p><strong>Important:</strong> Please change your password after your first login.</p>' : ''}
          </div>
          <div class="footer">
            <p>If you have any questions, please contact the HR department.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: employeeEmail,
      subject: 'Welcome to Nexlinx Smart EMS',
      html
    });
  }

  // Daily attendance report email
  async sendDailyAttendanceReport(recipientEmails: string[], reportDate: Date, metrics: any) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #1e293b; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f5f5f5; }
          .metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
          .metric { background-color: #fff; padding: 15px; border-radius: 5px; text-align: center; }
          .metric h3 { margin: 0; color: #1e293b; font-size: 24px; }
          .metric p { margin: 5px 0 0 0; color: #666; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Daily Attendance Report</h1>
            <p>${reportDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div class="content">
            <h2>Attendance Summary</h2>
            <div class="metrics">
              <div class="metric">
                <h3>${metrics.totalEmployees}</h3>
                <p>Total Employees</p>
              </div>
              <div class="metric">
                <h3>${metrics.presentToday}</h3>
                <p>Present Today</p>
              </div>
              <div class="metric">
                <h3>${metrics.lateArrivals}</h3>
                <p>Late Arrivals</p>
              </div>
              <div class="metric">
                <h3>${metrics.completedToday}</h3>
                <p>Completed Shifts</p>
              </div>
            </div>
            <p><strong>Attendance Rate:</strong> ${((metrics.presentToday / metrics.totalEmployees) * 100).toFixed(1)}%</p>
            <p>This is an automated daily attendance report generated by Nexlinx Smart EMS.</p>
          </div>
          <div class="footer">
            <p>For detailed reports, please log in to the EMS portal.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: recipientEmails,
      subject: `Daily Attendance Report - ${reportDate.toLocaleDateString()}`,
      html
    });
  }
}

export const emailService = new EmailService();