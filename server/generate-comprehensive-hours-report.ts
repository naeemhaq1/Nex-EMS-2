import { db } from './db';
import { employeeRecords, dailyAttendanceSummary } from '../shared/schema';
import { sql } from 'drizzle-orm';
import { eq, and, gte, lte, isNull, not, inArray } from 'drizzle-orm';
import { startOfMonth, endOfMonth, format, parseISO, differenceInMinutes } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import nodemailer from 'nodemailer';

// Email configuration using existing SMTP server
const EMAIL_CONFIG = {
  fromEmail: 'fstream@emailserver.nexlinx.net.pk',
  toEmails: ['naeemhaq1@gmail.com'], // Direct email address
  smtpConfig: {
    host: 'emailserver.nexlinx.net.pk',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
      user: 'fstream@emailserver.nexlinx.net.pk',
      pass: 'I4eCyrg0UP3qROkD' // Direct password from .env
    },
    tls: {
      rejectUnauthorized: false
    }
  }
};

interface PunctualityStats {
  onTime: number;
  late: number;
  grace: number;
  totalDays: number;
  averageLateMinutes: number;
  punctualityPercentage: number;
}

interface EmployeeHoursData {
  employeeId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  department: string;
  designation: string;
  totalWorkedHours: number;
  totalDays: number;
  missedPunches: number;
  regularHours: number;
  deductedHours: number;
  comments: string[];
  isMinHourBreach: boolean;
  overtimeHours: number;
  hoursPerDay: number;
  punctuality: PunctualityStats;
}

interface ReportSummary {
  totalEmployees: number;
  minHourBreaches: EmployeeHoursData[];
  topPerformers: EmployeeHoursData[];
  regularEmployees: EmployeeHoursData[];
  reportDate: string;
  monthYear: string;
}

const TIMEZONE = 'Asia/Karachi';
// Minimum hours should be calculated based on actual working days, not fixed 160
// For employees who work partial months, 160 hrs is unrealistic
// Instead use: (working days * 7.5) - reasonable tolerance for missed punches
const MIN_DAILY_HOURS_THRESHOLD = 6.0; // Minimum 6 hrs per working day to avoid breach
const STANDARD_DAY_HOURS = 7.5;
const MISSED_PUNCH_DEDUCTION = 0.5;

export async function generateComprehensiveHoursReport(month?: string, year?: string): Promise<ReportSummary> {
  console.log('[Hours Report] Starting comprehensive employee hours report generation...');
  
  // Default to current month if not specified
  const targetDate = month && year ? 
    new Date(parseInt(year), parseInt(month) - 1, 1) : 
    new Date();
  
  const monthStart = startOfMonth(targetDate);
  const monthEnd = endOfMonth(targetDate);
  const monthYear = format(targetDate, 'MMMM yyyy');
  
  console.log(`[Hours Report] Generating report for ${monthYear}`);
  console.log(`[Hours Report] Period: ${format(monthStart, 'yyyy-MM-dd')} to ${format(monthEnd, 'yyyy-MM-dd')}`);

  // Get all biometric-exempt employees to exclude using raw SQL
  const biometricExemptionsResult = await db.execute(sql`
    SELECT DISTINCT employee_id as "employeeId"
    FROM biometric_exemptions 
    WHERE is_active = true
  `);
  
  const exemptEmployeeIds = biometricExemptionsResult.rows.map((e: any) => e.employeeId);
  console.log(`[Hours Report] Found ${exemptEmployeeIds.length} biometric-exempt employees to exclude`);

  // Get all active employees (excluding biometric exemptions)
  let employeeQuery = db
    .select()
    .from(employeeRecords)
    .where(eq(employeeRecords.isActive, true));

  // Filter out biometric exempt employees if any exist
  if (exemptEmployeeIds.length > 0) {
    // Use raw SQL for complex filtering
    const employeesResult = await db.execute(sql`
      SELECT * FROM employee_records 
      WHERE is_active = true 
      AND id NOT IN (${sql.join(exemptEmployeeIds.map(id => sql`${id}`), sql`, `)})
    `);
    var employees = employeesResult.rows as any[];
  } else {
    employees = await employeeQuery;
  }

  console.log(`[Hours Report] Processing ${employees.length} biometric employees`);

  const employeeHoursData: EmployeeHoursData[] = [];

  for (const employee of employees) {
    // Get RAW attendance records - THIS IS THE TRUE SOURCE OF PUNCH DATA
    const rawAttendanceRecords = await db.execute(sql`
      SELECT 
        date::date as attendance_date,
        check_in,
        check_out,
        total_hours,
        late_minutes,
        status,
        punch_source
      FROM attendance_records 
      WHERE employee_code = ${employee.employee_code || employee.employeeCode}
        AND date >= ${format(monthStart, 'yyyy-MM-dd')}::date
        AND date <= ${format(monthEnd, 'yyyy-MM-dd')}::date
      ORDER BY date
    `);

    const empCode = employee.employee_code || employee.employeeCode;
    console.log(`[Hours Report] Employee ${empCode}: ${rawAttendanceRecords.rows.length} raw attendance records`);

    let totalWorkedHours = 0;
    let missedPunches = 0;
    let workingDays = 0;
    const comments: string[] = [];

    // Punctuality tracking based on RAW attendance data
    let onTimeDays = 0;
    let lateDays = 0;
    let graceDays = 0;
    let totalLateMinutes = 0;
    let actualPunchDays = 0;

    for (const record of rawAttendanceRecords.rows as any[]) {
      // Skip invalid records: orphaned punchouts, no check-in, etc.
      if (!record.check_in || record.status === 'orphaned_punchout') {
        continue; // Skip invalid days
      }

      workingDays++;
      actualPunchDays++;

      // Calculate punctuality based on late_minutes from raw data
      const lateMinutes = record.late_minutes || 0;
      
      if (lateMinutes > 15) { // More than 15 minutes late
        lateDays++;
        totalLateMinutes += lateMinutes;
      } else if (lateMinutes > 0 && lateMinutes <= 15) { // Grace period (1-15 minutes)
        graceDays++;
      } else { // On time or early
        onTimeDays++;
      }

      // Calculate daily hours - FIXED to handle total_hours being 0.00
      if (record.check_in && record.check_out) {
        // Complete day with both punches - calculate hours manually since total_hours is unreliable
        const checkInTime = new Date(record.check_in);
        const checkOutTime = new Date(record.check_out);
        const timeDiffMs = checkOutTime.getTime() - checkInTime.getTime();
        const hoursWorked = timeDiffMs / (1000 * 60 * 60); // Convert to hours
        
        // Additional validation: check if check-in and check-out are the same (orphaned)
        if (hoursWorked > 0.1 && hoursWorked <= 24) { // At least 6 minutes and max 24 hours
          totalWorkedHours += hoursWorked;
        } else if (hoursWorked <= 0.1) {
          // Same check-in/check-out time - likely orphaned, treat as missed punch
          missedPunches++;
          const creditedHours = 7.5;
          totalWorkedHours += creditedHours;
          comments.push(`${record.attendance_date}: Same in/out time, credited ${creditedHours}hrs`);
        } else {
          // Invalid hours calculation - treat as missed punch
          missedPunches++;
          const creditedHours = 7.5;
          totalWorkedHours += creditedHours;
          comments.push(`${record.attendance_date}: Invalid hours (${hoursWorked.toFixed(1)}), credited ${creditedHours}hrs`);
        }
      } else if (record.check_in && !record.check_out) {
        // Missed punch-out: credit 7.5 hours
        missedPunches++;
        const creditedHours = 7.5;
        totalWorkedHours += creditedHours;
        comments.push(`${record.attendance_date}: Missed punch-out, credited ${creditedHours}hrs`);
      }
    }

    // Apply missed punch penalties AFTER crediting full hours
    const totalPenalty = missedPunches * MISSED_PUNCH_DEDUCTION;
    totalWorkedHours -= totalPenalty;

    const expectedHours = workingDays * STANDARD_DAY_HOURS;
    const deductedHours = totalPenalty;
    const overtimeHours = Math.max(0, totalWorkedHours - expectedHours);
    // Calculate minimum hours based on actual working days with tolerance
    const minimumExpectedHours = workingDays * MIN_DAILY_HOURS_THRESHOLD;
    const isMinHourBreach = workingDays > 0 && totalWorkedHours < minimumExpectedHours;

    // Debug logging for first few employees
    if (employeeHoursData.length < 5) {
      console.log(`[Hours Report] DEBUG Employee ${empCode}:`);
      console.log(`  - Working days: ${workingDays}`);
      console.log(`  - Total worked hours: ${totalWorkedHours.toFixed(2)}`);
      console.log(`  - Missed punches: ${missedPunches}`);
      console.log(`  - Penalty: ${deductedHours.toFixed(1)}hrs`);
      console.log(`  - Min hour breach: ${isMinHourBreach} (threshold: ${minimumExpectedHours.toFixed(1)} hrs for ${workingDays} days)`);
    }

    if (missedPunches > 0) {
      comments.unshift(`Working days: ${workingDays}, Missed punches: ${missedPunches}, Penalty: ${deductedHours.toFixed(1)}hrs`);
    }

    const hoursPerDay = workingDays > 0 ? totalWorkedHours / workingDays : 0;
    const averageLateMinutes = lateDays > 0 ? totalLateMinutes / lateDays : 0;
    const punctualityPercentage = actualPunchDays > 0 ? (onTimeDays / actualPunchDays) * 100 : 0;

    employeeHoursData.push({
      employeeId: employee.id.toString(),
      employeeCode: employee.employee_code || employee.employeeCode || 'N/A',
      firstName: employee.first_name || employee.firstName || '',
      lastName: employee.last_name || employee.lastName || '',
      department: employee.department || 'Unknown',
      designation: employee.position || employee.designation || 'Unknown',
      totalWorkedHours: Math.round(totalWorkedHours * 100) / 100,
      totalDays: workingDays,
      missedPunches,
      regularHours: Math.round(expectedHours * 100) / 100,
      deductedHours: Math.round(deductedHours * 100) / 100,
      comments,
      isMinHourBreach,
      overtimeHours: Math.round(overtimeHours * 100) / 100,
      hoursPerDay: Math.round(hoursPerDay * 100) / 100,
      punctuality: {
        onTime: onTimeDays,
        late: lateDays,
        grace: graceDays,
        totalDays: actualPunchDays,
        averageLateMinutes: Math.round(averageLateMinutes * 100) / 100,
        punctualityPercentage: Math.round(punctualityPercentage * 100) / 100
      }
    });
  }

  // Separate employees into categories
  const minHourBreaches = employeeHoursData.filter(emp => emp.isMinHourBreach);
  const regularEmployees = employeeHoursData.filter(emp => !emp.isMinHourBreach);
  
  // Get top 3 performers (most overtime hours)
  const topPerformers = [...regularEmployees]
    .sort((a, b) => b.overtimeHours - a.overtimeHours)
    .slice(0, 3);

  console.log(`[Hours Report] Report Summary:`);
  console.log(`  - Total Employees: ${employeeHoursData.length}`);
  console.log(`  - Min Hour Breaches: ${minHourBreaches.length}`);
  console.log(`  - Top Performers: ${topPerformers.length}`);
  console.log(`  - Regular Employees: ${regularEmployees.length}`);

  return {
    totalEmployees: employeeHoursData.length,
    minHourBreaches: minHourBreaches.sort((a, b) => a.totalWorkedHours - b.totalWorkedHours),
    topPerformers,
    regularEmployees: regularEmployees.sort((a, b) => a.employeeCode.localeCompare(b.employeeCode)),
    reportDate: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
    monthYear
  };
}

async function generateHtmlReport(reportData: ReportSummary): Promise<string> {
  const { totalEmployees, minHourBreaches, topPerformers, regularEmployees, reportDate, monthYear } = reportData;

  const formatEmployee = (emp: EmployeeHoursData, index?: number) => `
    <tr style="${emp.isMinHourBreach ? 'background-color: #ffebee;' : (index !== undefined && index < 3 ? 'background-color: #e8f5e8;' : '')}">
      <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${emp.employeeCode}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${emp.firstName} ${emp.lastName}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${emp.department}</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${emp.totalDays}</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: center; color: ${emp.missedPunches > 0 ? 'red' : 'green'};">${emp.missedPunches}</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-weight: bold; ${emp.isMinHourBreach ? 'color: red;' : 'color: #2e7d32;'}">${emp.totalWorkedHours}</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-weight: bold; color: ${emp.hoursPerDay < 6 ? 'red' : emp.hoursPerDay > 8 ? 'blue' : 'green'};">${emp.hoursPerDay}</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">
        <div style="font-size: 11px; line-height: 1.2;">
          <div style="color: green; font-weight: bold;">✓ On-Time: ${emp.punctuality.onTime}</div>
          <div style="color: orange; font-weight: bold;">⚠ Grace: ${emp.punctuality.grace}</div>
          <div style="color: red; font-weight: bold;">✗ Late: ${emp.punctuality.late}</div>
          <div style="color: #666; font-size: 10px;">Total: ${emp.punctuality.totalDays} days</div>
        </div>
      </td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-weight: bold; color: ${emp.punctuality.punctualityPercentage >= 90 ? 'green' : emp.punctuality.punctualityPercentage >= 70 ? 'orange' : 'red'};">${emp.punctuality.punctualityPercentage}%</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: center; color: ${emp.punctuality.averageLateMinutes > 15 ? 'red' : emp.punctuality.averageLateMinutes > 5 ? 'orange' : 'green'};">${emp.punctuality.averageLateMinutes > 0 ? emp.punctuality.averageLateMinutes + ' min' : '-'}</td>
    </tr>
  `;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Employee Work Hours Report - ${monthYear}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .section { margin: 30px 0; }
        .section h2 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 5px; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th { background: #007bff; color: white; padding: 10px; text-align: left; border: 1px solid #ddd; }
        .breach-section h2 { color: #d32f2f; border-bottom-color: #d32f2f; }
        .top-performers h2 { color: #2e7d32; border-bottom-color: #2e7d32; }
        .highlight { background-color: #fff3cd; }
        .breach { background-color: #f8d7da; }
        .performer { background-color: #d4edda; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Nexlinx EMS - Employee Work Hours Report</h1>
        <h2>${monthYear}</h2>
        <p>Generated on: ${reportDate}</p>
        <p><strong>Minimum Hour Threshold:</strong> ${MIN_DAILY_HOURS_THRESHOLD} hours per working day</p>
      </div>

      <div class="summary">
        <h3>Report Summary</h3>
        <ul>
          <li><strong>Total Biometric Employees:</strong> ${totalEmployees}</li>
          <li><strong>Minimum Hour Breaches:</strong> <span style="color: red;">${minHourBreaches.length}</span></li>
          <li><strong>Top Performers:</strong> <span style="color: green;">${topPerformers.length}</span></li>
          <li><strong>Regular Employees:</strong> ${regularEmployees.length}</li>
        </ul>
        <p><em>Note: Biometric-exempt employees are excluded from this report. For missed punches, 7.5 hours are assumed with 0.5 hours deducted as penalty.</em></p>
      </div>

      ${minHourBreaches.length > 0 ? `
      <div class="section breach-section">
        <h2>⚠️ MINIMUM HOUR BREACHES (${minHourBreaches.length} employees)</h2>
        <p style="color: red; font-weight: bold;">Employees below minimum daily hour requirements:</p>
        <table>
          <thead>
            <tr>
              <th>Employee Code</th>
              <th>Name</th>
              <th>Department</th>
              <th>Days Present</th>
              <th>Punchout Missed</th>
              <th>Total Hours</th>
              <th>Hrs/Day</th>
              <th>Punctuality</th>
              <th>On-Time %</th>
              <th>Avg Late</th>
            </tr>
          </thead>
          <tbody>
            ${minHourBreaches.map(emp => formatEmployee(emp)).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}

      ${topPerformers.length > 0 ? `
      <div class="section top-performers">
        <h2>🏆 TOP PERFORMERS (${topPerformers.length} employees)</h2>
        <p style="color: green; font-weight: bold;">Highest overtime hours achieved:</p>
        <table>
          <thead>
            <tr>
              <th>Employee Code</th>
              <th>Name</th>
              <th>Department</th>
              <th>Days Present</th>
              <th>Punchout Missed</th>
              <th>Total Hours</th>
              <th>Hrs/Day</th>
              <th>Punctuality</th>
              <th>On-Time %</th>
              <th>Avg Late</th>
            </tr>
          </thead>
          <tbody>
            ${topPerformers.map((emp, index) => formatEmployee(emp, index)).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}

      <div class="section">
        <h2>📊 ALL EMPLOYEES REPORT (${regularEmployees.length + minHourBreaches.length} total)</h2>
        <table>
          <thead>
            <tr>
              <th>Employee Code</th>
              <th>Name</th>
              <th>Department</th>
              <th>Days Present</th>
              <th>Punchout Missed</th>
              <th>Total Hours</th>
              <th>Hrs/Day</th>
              <th>Punctuality</th>
              <th>On-Time %</th>
              <th>Avg Late</th>
            </tr>
          </thead>
          <tbody>
            ${[...minHourBreaches, ...regularEmployees].map(emp => formatEmployee(emp)).join('')}
          </tbody>
        </table>
      </div>

      <div style="margin-top: 40px; padding: 20px; background: #f8f9fa; border-radius: 5px;">
        <h3>Report Notes:</h3>
        <ul>
          <li>Only biometric employees are included in this report</li>
          <li>For missed punch-in or punch-out: 7.5 hours assumed, 0.5 hours deducted</li>
          <li>Lunch break (1 hour) automatically deducted for shifts longer than 6 hours</li>
          <li>Minimum requirement: ${MIN_DAILY_HOURS_THRESHOLD} hours per working day</li>
          <li>Top performers ranked by overtime hours achieved</li>
        </ul>
      </div>
    </body>
    </html>
  `;
}

async function sendHoursReportEmail(htmlReport: string, monthYear: string): Promise<boolean> {
  try {
    console.log('[Email] Preparing to send comprehensive hours report using Nexlinx SMTP...');

    // Use existing Nexlinx SMTP server configuration
    const transporter = nodemailer.createTransport(EMAIL_CONFIG.smtpConfig);

    const mailOptions = {
      from: EMAIL_CONFIG.fromEmail,
      to: EMAIL_CONFIG.toEmails,
      subject: `Nexlinx EMS - Employee Work Hours Report (${monthYear})`,
      html: htmlReport,
      attachments: [
        {
          filename: `Employee_Hours_Report_${monthYear.replace(' ', '_')}.html`,
          content: htmlReport,
          contentType: 'text/html'
        }
      ]
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('[Email] Hours report sent successfully via Nexlinx SMTP:', info.messageId);
    return true;
  } catch (error) {
    console.error('[Email] Failed to send hours report via Nexlinx SMTP:', error);
    
    // Fallback: Save report to file if email fails
    try {
      const { default: fs } = await import('fs');
      const { default: path } = await import('path');
      const reportsDir = './reports';
      
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }
      
      const filename = `Employee_Hours_Report_${monthYear.replace(' ', '_')}_${new Date().toISOString().split('T')[0]}.html`;
      const filepath = path.join(reportsDir, filename);
      
      fs.writeFileSync(filepath, htmlReport);
      console.log(`[Email] Report saved to file: ${filepath}`);
      return true;
    } catch (fileError) {
      console.error('[Email] Failed to save report to file:', fileError);
      return false;
    }
  }
}

// Main execution function
export async function executeHoursReport(month?: string, year?: string): Promise<void> {
  try {
    console.log('[Hours Report] Starting comprehensive employee hours report generation...');
    
    const reportData = await generateComprehensiveHoursReport(month, year);
    const htmlReport = await generateHtmlReport(reportData);
    
    console.log('[Hours Report] Report generated successfully');
    console.log(`[Hours Report] Summary - Total: ${reportData.totalEmployees}, Breaches: ${reportData.minHourBreaches.length}, Top Performers: ${reportData.topPerformers.length}`);
    
    const emailSent = await sendHoursReportEmail(htmlReport, reportData.monthYear);
    
    if (emailSent) {
      console.log('[Hours Report] ✅ Report generated and emailed successfully!');
    } else {
      console.log('[Hours Report] ⚠️ Report generated but email failed. Please check email configuration.');
    }
  } catch (error) {
    console.error('[Hours Report] ❌ Failed to generate hours report:', error);
    throw error;
  }
}

// Functions are already exported above, no need for duplicate exports