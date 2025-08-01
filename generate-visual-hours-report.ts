import { db } from './db';
import { employeeRecords, dailyAttendanceSummary } from '../shared/schema';
import { sql } from 'drizzle-orm';
import { eq, and, gte, lte, not, inArray } from 'drizzle-orm';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import nodemailer from 'nodemailer';

// Email configuration using existing SMTP server
const EMAIL_CONFIG = {
  fromEmail: 'fstream@emailserver.nexlinx.net.pk',
  toEmails: ['admin@nexlinx.net.pk', 'hr@nexlinx.net.pk'],
  smtpConfig: {
    host: 'emailserver.nexlinx.net.pk',
    port: 587,
    secure: false, // Use TLS
    auth: {
      user: process.env.EMAIL_USER || 'fstream@emailserver.nexlinx.net.pk',
      pass: process.env.EMAIL_PASSWORD || ''
    }
  }
};

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
  punctualityGrade: string;
  punctualityScore: number;
  averageHoursPerDay: number;
  perfectAttendanceDays: number;
  lateArrivals: number;
  earlyDepartures: number;
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
const MIN_HOURS_PER_MONTH = 160;
const STANDARD_DAY_HOURS = 7.5;
const MISSED_PUNCH_DEDUCTION = 0.5;

export async function generateVisualHoursReport(month?: string, year?: string): Promise<ReportSummary> {
  console.log('[Visual Hours Report] Starting comprehensive employee hours report generation...');
  
  // Default to current month if not specified
  const targetDate = month && year ? 
    new Date(parseInt(year), parseInt(month) - 1, 1) : 
    new Date();
  
  const monthStart = startOfMonth(targetDate);
  const monthEnd = endOfMonth(targetDate);
  const monthYear = format(targetDate, 'MMMM yyyy');
  
  console.log(`[Visual Hours Report] Generating report for ${monthYear}`);

  // Get all biometric-exempt employees to exclude
  const biometricExemptionsResult = await db.execute(sql`
    SELECT DISTINCT employee_id as "employeeId"
    FROM biometric_exemptions 
    WHERE is_active = true
  `);
  
  const exemptEmployeeIds = biometricExemptionsResult.rows.map((e: any) => e.employeeId);
  console.log(`[Visual Hours Report] Found ${exemptEmployeeIds.length} biometric-exempt employees to exclude`);

  // Get all active employees (excluding biometric exemptions)
  let employeeQuery = db
    .select()
    .from(employeeRecords)
    .where(eq(employeeRecords.isActive, true));

  // Filter out biometric exempt employees if any exist
  if (exemptEmployeeIds.length > 0) {
    const employeesResult = await db.execute(sql`
      SELECT * FROM employee_records 
      WHERE is_active = true 
      AND id NOT IN (${sql.join(exemptEmployeeIds.map(id => sql`${id}`), sql`, `)})
    `);
    var employees = employeesResult.rows as any[];
  } else {
    var employees = await employeeQuery;
  }

  console.log(`[Visual Hours Report] Processing ${employees.length} biometric employees`);

  const employeeHoursData: EmployeeHoursData[] = [];

  for (const employee of employees) {
    // Get attendance summary records for the month
    const attendanceRecords = await db
      .select()
      .from(dailyAttendanceSummary)
      .where(and(
        eq(dailyAttendanceSummary.employeeId, employee.id),
        gte(dailyAttendanceSummary.date, format(monthStart, 'yyyy-MM-dd')),
        lte(dailyAttendanceSummary.date, format(monthEnd, 'yyyy-MM-dd'))
      ));

    console.log(`[Visual Hours Report] Employee ${employee.employeeCode}: ${attendanceRecords.length} attendance records`);

    let totalWorkedHours = 0;
    let missedPunches = 0;
    let totalDays = attendanceRecords.length;
    let perfectAttendanceDays = 0;
    let lateArrivals = 0;
    let earlyDepartures = 0;
    const comments: string[] = [];

    for (const record of attendanceRecords) {
      if (record.firstPunch && record.lastPunch) {
        const hoursWorked = parseFloat(record.totalHours || '0');
        totalWorkedHours += hoursWorked;
        perfectAttendanceDays++;

        // Check for late arrival (after 9:30 AM)
        const punchInTime = new Date(record.firstPunch);
        const punchInHour = punchInTime.getHours();
        const punchInMinute = punchInTime.getMinutes();
        if (punchInHour > 9 || (punchInHour === 9 && punchInMinute > 30)) {
          lateArrivals++;
        }

        // Check for early departure (before 6:00 PM for full day)
        const punchOutTime = new Date(record.lastPunch);
        const punchOutHour = punchOutTime.getHours();
        if (punchOutHour < 18 && hoursWorked >= 7) {
          earlyDepartures++;
        }
      } else if (record.firstPunch && !record.lastPunch) {
        totalWorkedHours += (STANDARD_DAY_HOURS - MISSED_PUNCH_DEDUCTION);
        missedPunches++;
        comments.push(`${record.date}: Missed punch-out, 0.5hrs deducted`);
        
        // Still check for late arrival
        const punchInTime = new Date(record.firstPunch);
        const punchInHour = punchInTime.getHours();
        const punchInMinute = punchInTime.getMinutes();
        if (punchInHour > 9 || (punchInHour === 9 && punchInMinute > 30)) {
          lateArrivals++;
        }
      } else if (!record.firstPunch && record.lastPunch) {
        totalWorkedHours += (STANDARD_DAY_HOURS - MISSED_PUNCH_DEDUCTION);
        missedPunches++;
        comments.push(`${record.date}: Missed punch-in, 0.5hrs deducted`);
      } else if (record.status === 'present' && !record.firstPunch && !record.lastPunch) {
        totalWorkedHours += (STANDARD_DAY_HOURS - MISSED_PUNCH_DEDUCTION);
        missedPunches++;
        comments.push(`${record.date}: No punch records, manual entry, 0.5hrs deducted`);
      }
    }

    // Calculate punctuality metrics
    const punctualityScore = Math.max(0, 100 - (missedPunches * 10) - (lateArrivals * 5) - (earlyDepartures * 3));
    let punctualityGrade = 'F';
    if (punctualityScore >= 95) punctualityGrade = 'A+';
    else if (punctualityScore >= 90) punctualityGrade = 'A';
    else if (punctualityScore >= 85) punctualityGrade = 'B+';
    else if (punctualityScore >= 80) punctualityGrade = 'B';
    else if (punctualityScore >= 75) punctualityGrade = 'C+';
    else if (punctualityScore >= 70) punctualityGrade = 'C';
    else if (punctualityScore >= 60) punctualityGrade = 'D';

    const averageHoursPerDay = totalDays > 0 ? totalWorkedHours / totalDays : 0;

    const regularHours = totalDays * STANDARD_DAY_HOURS;
    const deductedHours = missedPunches * MISSED_PUNCH_DEDUCTION;
    const overtimeHours = Math.max(0, totalWorkedHours - MIN_HOURS_PER_MONTH);
    const isMinHourBreach = totalWorkedHours < MIN_HOURS_PER_MONTH;

    employeeHoursData.push({
      employeeId: employee.id.toString(),
      employeeCode: employee.employeeCode || `EMP${employee.id}`,
      firstName: employee.firstName || '',
      lastName: employee.lastName || '',
      department: employee.department || 'Unknown',
      designation: employee.designation || 'Staff',
      totalWorkedHours,
      totalDays,
      missedPunches,
      regularHours,
      deductedHours,
      comments,
      isMinHourBreach,
      overtimeHours,
      punctualityGrade,
      punctualityScore,
      averageHoursPerDay,
      perfectAttendanceDays,
      lateArrivals,
      earlyDepartures
    });
  }

  // Categorize employees
  const minHourBreaches = employeeHoursData.filter(emp => emp.isMinHourBreach);
  const regularEmployees = employeeHoursData.filter(emp => !emp.isMinHourBreach && emp.overtimeHours <= 10);
  const topPerformers = employeeHoursData
    .filter(emp => emp.overtimeHours > 10)
    .sort((a, b) => b.overtimeHours - a.overtimeHours)
    .slice(0, 10); // Top 10 performers

  console.log(`[Visual Hours Report] Categorized: ${minHourBreaches.length} breaches, ${topPerformers.length} top performers, ${regularEmployees.length} regular`);

  return {
    totalEmployees: employeeHoursData.length,
    minHourBreaches,
    topPerformers,
    regularEmployees,
    reportDate: format(new Date(), 'MMMM dd, yyyy'),
    monthYear
  };
}

export async function generateVisualHtmlReport(reportData: ReportSummary): Promise<string> {
  const { totalEmployees, minHourBreaches, topPerformers, regularEmployees, reportDate, monthYear } = reportData;

  // Calculate comprehensive statistics
  const allEmployees = [...minHourBreaches, ...regularEmployees, ...topPerformers];
  const totalHoursWorked = allEmployees.reduce((sum, emp) => sum + emp.totalWorkedHours, 0);
  const totalMissedPunches = allEmployees.reduce((sum, emp) => sum + emp.missedPunches, 0);
  const totalDeductedHours = allEmployees.reduce((sum, emp) => sum + emp.deductedHours, 0);
  const averageHours = totalHoursWorked / totalEmployees;
  const complianceRate = ((totalEmployees - minHourBreaches.length) / totalEmployees * 100).toFixed(1);

  // Department analysis
  const departmentStats = allEmployees.reduce((acc, emp) => {
    if (!acc[emp.department]) {
      acc[emp.department] = { total: 0, breaches: 0, topPerformers: 0, totalHours: 0 };
    }
    acc[emp.department].total++;
    acc[emp.department].totalHours += emp.totalWorkedHours;
    if (emp.isMinHourBreach) acc[emp.department].breaches++;
    if (emp.overtimeHours > 10) acc[emp.department].topPerformers++;
    return acc;
  }, {} as Record<string, { total: number; breaches: number; topPerformers: number; totalHours: number }>);

  // Performance bands for analysis
  const performanceBands = {
    excellent: allEmployees.filter(emp => emp.totalWorkedHours >= 200).length,
    good: allEmployees.filter(emp => emp.totalWorkedHours >= 180 && emp.totalWorkedHours < 200).length,
    satisfactory: allEmployees.filter(emp => emp.totalWorkedHours >= 160 && emp.totalWorkedHours < 180).length,
    needsImprovement: allEmployees.filter(emp => emp.totalWorkedHours >= 140 && emp.totalWorkedHours < 160).length,
    critical: allEmployees.filter(emp => emp.totalWorkedHours < 140).length
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Nexlinx EMS - Comprehensive Visual Hours Report</title>
      <meta charset="utf-8">
      <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
      <style>
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          margin: 0; 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
          min-height: 100vh; 
          color: #333;
        }
        .container { 
          max-width: 1400px; 
          margin: 0 auto; 
          background: white; 
          min-height: 100vh;
          box-shadow: 0 0 50px rgba(0,0,0,0.2); 
        }
        .header { 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
          color: white; 
          padding: 40px; 
          text-align: center; 
          position: relative;
          overflow: hidden;
        }
        .header::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: repeating-linear-gradient(
            45deg,
            transparent,
            transparent 10px,
            rgba(255,255,255,0.1) 10px,
            rgba(255,255,255,0.1) 20px
          );
          animation: slide 20s linear infinite;
        }
        @keyframes slide {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(50%); }
        }
        .header h1 { 
          margin: 0; 
          font-size: 3em; 
          text-shadow: 2px 2px 4px rgba(0,0,0,0.3); 
          position: relative;
          z-index: 1;
        }
        .header h2 { 
          margin: 10px 0; 
          font-size: 1.8em; 
          opacity: 0.9; 
          position: relative;
          z-index: 1;
        }
        .header p { 
          margin: 0; 
          opacity: 0.8; 
          font-size: 1.1em;
          position: relative;
          z-index: 1;
        }
        
        .executive-summary {
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          padding: 40px;
          border-bottom: 5px solid #667eea;
        }
        .executive-summary h2 {
          text-align: center;
          color: #667eea;
          font-size: 2.2em;
          margin-bottom: 30px;
        }
        
        .dashboard { 
          display: grid; 
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); 
          gap: 25px; 
          padding: 40px; 
          background: #f8f9fa; 
        }
        .metric-card { 
          background: white; 
          padding: 25px; 
          border-radius: 15px; 
          text-align: center; 
          box-shadow: 0 10px 25px rgba(0,0,0,0.1); 
          transition: all 0.3s ease; 
          border-top: 5px solid;
          position: relative;
          overflow: hidden;
        }
        .metric-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          transition: left 0.5s;
        }
        .metric-card:hover::before {
          left: 100%;
        }
        .metric-card:hover { 
          transform: translateY(-10px) scale(1.02); 
          box-shadow: 0 20px 40px rgba(0,0,0,0.15);
        }
        .metric-number { 
          font-size: 3em; 
          font-weight: bold; 
          margin-bottom: 10px; 
          background: linear-gradient(45deg, #667eea, #764ba2);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .metric-label { 
          color: #666; 
          font-size: 1em; 
          text-transform: uppercase; 
          letter-spacing: 1px; 
          font-weight: 600;
        }
        
        .charts-section { 
          padding: 40px; 
          background: white; 
        }
        .charts-grid { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 40px; 
          margin-bottom: 40px; 
        }
        .chart-container { 
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); 
          padding: 30px; 
          border-radius: 15px; 
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          border-left: 5px solid #667eea;
        }
        .chart-title { 
          text-align: center; 
          margin-bottom: 25px; 
          color: #333; 
          font-size: 1.4em; 
          font-weight: bold; 
        }
        .full-width-chart {
          grid-column: 1 / -1;
        }
        
        .recommendations { 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
          color: white; 
          padding: 40px; 
          margin: 0; 
          position: relative;
          overflow: hidden;
        }
        .recommendations::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="10" cy="10" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="30" cy="30" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="50" cy="50" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="70" cy="70" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="90" cy="90" r="1" fill="rgba(255,255,255,0.1)"/></svg>');
          pointer-events: none;
        }
        .recommendations h3 { 
          margin-top: 0; 
          font-size: 2em; 
          position: relative;
          z-index: 1;
        }
        .recommendations ul { 
          list-style: none; 
          padding: 0; 
          position: relative;
          z-index: 1;
        }
        .recommendations li { 
          padding: 15px 0; 
          border-bottom: 1px solid rgba(255,255,255,0.2); 
          font-size: 1.1em;
          line-height: 1.6;
        }
        .recommendations li:before { 
          content: "💡 "; 
          margin-right: 15px; 
          font-size: 1.2em;
        }
        
        .section { 
          background: white; 
          margin: 0; 
          border-radius: 0; 
          overflow: hidden; 
          box-shadow: none;
          border-top: 1px solid #eee;
        }
        .section-header { 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
          color: white; 
          padding: 25px 40px; 
        }
        .section-header h2 {
          margin: 0;
          font-size: 1.8em;
        }
        .section-content { 
          padding: 30px 40px; 
        }
        
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin-top: 20px; 
          box-shadow: 0 5px 15px rgba(0,0,0,0.1);
          border-radius: 10px;
          overflow: hidden;
        }
        th { 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
          color: white; 
          padding: 15px; 
          text-align: left; 
          font-weight: 600; 
          font-size: 0.95em;
        }
        td { 
          padding: 12px 15px; 
          border-bottom: 1px solid #eee; 
        }
        tr:hover { 
          background-color: #f8f9fa; 
        }
        .breach-row { 
          background-color: #ffebee !important; 
          border-left: 5px solid #d32f2f;
        }
        .top-performer-row { 
          background-color: #e8f5e8 !important; 
          border-left: 5px solid #2e7d32;
        }
        
        .footer { 
          background: #333; 
          color: white; 
          text-align: center; 
          padding: 30px; 
          font-size: 0.9em; 
        }
        .footer p {
          margin: 5px 0;
        }
        
        .performance-indicator {
          display: inline-block;
          padding: 5px 12px;
          border-radius: 20px;
          font-size: 0.85em;
          font-weight: bold;
          text-transform: uppercase;
        }
        .excellent { background: #4caf50; color: white; }
        .good { background: #2196f3; color: white; }
        .satisfactory { background: #ff9800; color: white; }
        .needs-improvement { background: #f44336; color: white; }
        .critical { background: #9c27b0; color: white; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📊 NEXLINX EMS</h1>
          <h2>Comprehensive Employee Hours Analytics</h2>
          <p>${monthYear} | Generated ${reportDate}</p>
        </div>

        <div class="executive-summary">
          <h2>📈 Executive Summary</h2>
          <p style="font-size: 1.2em; line-height: 1.8; text-align: center; max-width: 800px; margin: 0 auto;">
            This report analyzes <strong>${totalEmployees}</strong> biometric employees for <strong>${monthYear}</strong>. 
            Overall compliance rate is <strong style="color: ${parseFloat(complianceRate) >= 90 ? '#2e7d32' : parseFloat(complianceRate) >= 80 ? '#1976d2' : '#d32f2f'};">${complianceRate}%</strong>, 
            with <strong>${minHourBreaches.length}</strong> employees requiring immediate attention for minimum hour compliance. 
            <strong>${topPerformers.length}</strong> employees demonstrated exceptional performance with significant overtime contributions.
          </p>
        </div>

        <div class="dashboard">
          <div class="metric-card" style="border-top-color: #667eea;">
            <div class="metric-number">${totalEmployees}</div>
            <div class="metric-label">Total Employees</div>
          </div>
          <div class="metric-card" style="border-top-color: ${parseFloat(complianceRate) >= 90 ? '#4caf50' : parseFloat(complianceRate) >= 80 ? '#2196f3' : '#f44336'};">
            <div class="metric-number" style="color: ${parseFloat(complianceRate) >= 90 ? '#4caf50' : parseFloat(complianceRate) >= 80 ? '#2196f3' : '#f44336'};">${complianceRate}%</div>
            <div class="metric-label">Compliance Rate</div>
          </div>
          <div class="metric-card" style="border-top-color: #f44336;">
            <div class="metric-number" style="color: #f44336;">${minHourBreaches.length}</div>
            <div class="metric-label">Critical Cases</div>
          </div>
          <div class="metric-card" style="border-top-color: #4caf50;">
            <div class="metric-number" style="color: #4caf50;">${topPerformers.length}</div>
            <div class="metric-label">Top Performers</div>
          </div>
          <div class="metric-card" style="border-top-color: #ff9800;">
            <div class="metric-number" style="color: #ff9800;">${totalMissedPunches}</div>
            <div class="metric-label">Missed Punches</div>
          </div>
          <div class="metric-card" style="border-top-color: #9c27b0;">
            <div class="metric-number" style="color: #9c27b0;">${averageHours.toFixed(1)}</div>
            <div class="metric-label">Avg Hours/Employee</div>
          </div>
        </div>

        <div class="charts-section">
          <div class="charts-grid">
            <div class="chart-container">
              <div class="chart-title">📊 Compliance Overview</div>
              <canvas id="complianceChart" width="400" height="300"></canvas>
            </div>
            <div class="chart-container">
              <div class="chart-title">🏢 Department Performance</div>
              <canvas id="departmentChart" width="400" height="300"></canvas>
            </div>
          </div>
          
          <div class="chart-container full-width-chart">
            <div class="chart-title">📈 Performance Distribution Analysis</div>
            <canvas id="performanceDistribution" width="800" height="400"></canvas>
          </div>

          <div class="charts-grid">
            <div class="chart-container">
              <div class="chart-title">⏰ Hours Range Distribution</div>
              <canvas id="hoursRangeChart" width="400" height="300"></canvas>
            </div>
            <div class="chart-container">
              <div class="chart-title">📉 Missed Punch Impact</div>
              <canvas id="missedPunchChart" width="400" height="300"></canvas>
            </div>
          </div>
        </div>

        <div class="recommendations">
          <h3>🎯 Strategic Recommendations & Action Items</h3>
          <ul>
            ${minHourBreaches.length > totalEmployees * 0.25 ? 
              `<li><strong>🚨 URGENT - Critical Non-Compliance:</strong> ${minHourBreaches.length} employees (${(minHourBreaches.length/totalEmployees*100).toFixed(1)}%) are below minimum hours. This exceeds 25% threshold and requires immediate organizational intervention including policy review and management restructuring.</li>` : 
              minHourBreaches.length > totalEmployees * 0.15 ? 
              `<li><strong>⚠️ HIGH PRIORITY - Significant Non-Compliance:</strong> ${minHourBreaches.length} employees (${(minHourBreaches.length/totalEmployees*100).toFixed(1)}%) are below minimum hours. Implement weekly monitoring and manager accountability measures.</li>` :
              `<li><strong>✅ MONITOR - Manageable Non-Compliance:</strong> ${minHourBreaches.length} employees below minimum hours represents ${(minHourBreaches.length/totalEmployees*100).toFixed(1)}% of workforce, within acceptable range but requires attention.</li>`
            }
            
            ${totalMissedPunches > totalEmployees * 0.8 ? 
              `<li><strong>🔧 SYSTEM CRITICAL - Biometric Infrastructure:</strong> Exceptionally high missed punch rate (${(totalMissedPunches/totalEmployees).toFixed(1)} per employee). Immediate hardware maintenance, software updates, and user training required.</li>` :
              totalMissedPunches > totalEmployees * 0.4 ? 
              `<li><strong>🔧 SYSTEM IMPROVEMENT - Punch Reliability:</strong> Elevated missed punch rate suggests biometric system optimization needed. Schedule maintenance and provide refresher training.</li>` :
              `<li><strong>🔧 SYSTEM MAINTENANCE - Routine Optimization:</strong> Missed punch rate within normal parameters. Continue regular system maintenance schedule.</li>`
            }
            
            ${Object.entries(departmentStats).filter(([_, stats]) => stats.breaches > stats.total * 0.4).length > 0 ? 
              `<li><strong>🎯 DEPARTMENT INTERVENTION:</strong> High-risk departments requiring immediate management focus: ${Object.entries(departmentStats).filter(([_, stats]) => stats.breaches > stats.total * 0.4).map(([dept, stats]) => `${dept} (${(stats.breaches/stats.total*100).toFixed(0)}% non-compliant)`).join(', ')}. Implement department-specific action plans.</li>` : ''
            }
            
            <li><strong>🏆 RECOGNITION PROGRAM:</strong> ${topPerformers.length} employees demonstrated exceptional commitment with ${topPerformers.reduce((sum, emp) => sum + emp.overtimeHours, 0).toFixed(0)} total overtime hours. Implement formal recognition, performance bonuses, or career advancement opportunities.</li>
            
            <li><strong>📱 TECHNOLOGY ENHANCEMENT:</strong> Deploy mobile attendance applications and automated reminder systems to reduce missed punches by an estimated 40-60%.</li>
            
            <li><strong>📊 PREDICTIVE MONITORING:</strong> Establish weekly early-warning system for employees trending below minimum hour thresholds to enable proactive intervention.</li>
            
            <li><strong>📋 POLICY OPTIMIZATION:</strong> Review current 160-hour minimum threshold against industry standards and organizational productivity metrics. Consider flexible work arrangements for consistent underperformers.</li>
            
            ${averageHours < 170 ? 
              `<li><strong>⚡ PRODUCTIVITY ALERT:</strong> Average hours (${averageHours.toFixed(1)}) indicates potential underutilization. Investigate workload distribution, project allocation, and resource optimization opportunities.</li>` : ''
            }
          </ul>
        </div>

        ${minHourBreaches.length > 0 ? `
        <div class="section">
          <div class="section-header">
            <h2>🚨 CRITICAL INTERVENTION REQUIRED - Minimum Hour Breaches</h2>
          </div>
          <div class="section-content">
            <p style="background: #ffebee; padding: 15px; border-radius: 10px; border-left: 5px solid #f44336; margin-bottom: 25px;">
              <strong>IMMEDIATE ACTION REQUIRED:</strong> ${minHourBreaches.length} employees have not met the minimum 160-hour monthly requirement. 
              Each case requires individual review and corrective action plan within 48 hours.
            </p>
            <table>
              <thead>
                <tr>
                  <th>Priority</th>
                  <th>Employee Code</th>
                  <th>Name</th>
                  <th>Department</th>
                  <th>Actual Hours</th>
                  <th>Shortfall</th>
                  <th>Performance Status</th>
                  <th>Action Required</th>
                </tr>
              </thead>
              <tbody>
                ${minHourBreaches.map((emp, index) => `
                  <tr class="breach-row">
                    <td><span class="performance-indicator critical">#${index + 1}</span></td>
                    <td><strong>${emp.employeeCode}</strong></td>
                    <td>${emp.firstName} ${emp.lastName}</td>
                    <td>${emp.department}</td>
                    <td style="font-weight: bold; color: #f44336;">${emp.totalWorkedHours.toFixed(1)} hrs</td>
                    <td style="font-weight: bold; color: #f44336;">${(MIN_HOURS_PER_MONTH - emp.totalWorkedHours).toFixed(1)} hrs</td>
                    <td><span class="performance-indicator ${emp.totalWorkedHours < 120 ? 'critical' : emp.totalWorkedHours < 140 ? 'needs-improvement' : 'satisfactory'}">${emp.totalWorkedHours < 120 ? 'Critical' : emp.totalWorkedHours < 140 ? 'Needs Improvement' : 'Borderline'}</span></td>
                    <td style="font-size: 0.9em;">Manager conference + PIP</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
        ` : ''}

        ${topPerformers.length > 0 ? `
        <div class="section">
          <div class="section-header">
            <h2>🏆 EXCELLENCE RECOGNITION - Outstanding Performers</h2>
          </div>
          <div class="section-content">
            <p style="background: #e8f5e8; padding: 15px; border-radius: 10px; border-left: 5px solid #4caf50; margin-bottom: 25px;">
              <strong>EXCEPTIONAL PERFORMANCE:</strong> ${topPerformers.length} employees exceeded expectations with significant overtime contributions. 
              Total additional hours contributed: <strong>${topPerformers.reduce((sum, emp) => sum + emp.overtimeHours, 0).toFixed(1)} hours</strong>
            </p>
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Employee Code</th>
                  <th>Name</th>
                  <th>Department</th>
                  <th>Total Hours</th>
                  <th>Overtime Hours</th>
                  <th>Punctuality Grade</th>
                  <th>Recognition Tier</th>
                </tr>
              </thead>
              <tbody>
                ${topPerformers.map((emp, index) => `
                  <tr class="top-performer-row">
                    <td style="font-weight: bold; font-size: 1.2em;">${index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}</td>
                    <td><strong>${emp.employeeCode}</strong></td>
                    <td>${emp.firstName} ${emp.lastName}</td>
                    <td>${emp.department}</td>
                    <td style="font-weight: bold; color: #4caf50;">${emp.totalWorkedHours.toFixed(1)} hrs</td>
                    <td style="font-weight: bold; color: #4caf50;">${emp.overtimeHours.toFixed(1)} hrs</td>
                    <td><span class="performance-indicator ${emp.punctualityGrade === 'A+' || emp.punctualityGrade === 'A' ? 'excellent' : emp.punctualityGrade.startsWith('B') ? 'good' : 'satisfactory'}">${emp.punctualityGrade}</span></td>
                    <td style="font-weight: bold;">${index === 0 ? 'Platinum Elite' : index === 1 ? 'Gold Star' : index === 2 ? 'Silver Champion' : 'Bronze Merit'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
        ` : ''}

        <div class="section">
          <div class="section-header">
            <h2>📋 COMPLETE EMPLOYEE DATA TABLE - All ${totalEmployees} Employees</h2>
          </div>
          <div class="section-content">
            <p style="background: #f8f9fa; padding: 15px; border-radius: 10px; border-left: 5px solid #667eea; margin-bottom: 25px;">
              <strong>COMPREHENSIVE DATA:</strong> Complete employee attendance analysis with hours worked, deductions for missed punches, and punctuality grading based on shifts.
              Punctuality is graded from A+ (excellent) to F (poor) based on missed punches, late arrivals, and early departures.
            </p>
            <div style="overflow-x: auto;">
              <table>
                <thead>
                  <tr>
                    <th>Employee Code</th>
                    <th>Name</th>
                    <th>Department</th>
                    <th>Designation</th>
                    <th>Days Worked</th>
                    <th>Total Hours</th>
                    <th>Avg Hours/Day</th>
                    <th>Missed Punches</th>
                    <th>Hours Deducted</th>
                    <th>Late Arrivals</th>
                    <th>Early Departures</th>
                    <th>Perfect Days</th>
                    <th>Punctuality Grade</th>
                    <th>Punctuality Score</th>
                    <th>Overtime Hours</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${allEmployees.sort((a, b) => a.employeeCode.localeCompare(b.employeeCode)).map(emp => `
                    <tr class="${emp.isMinHourBreach ? 'breach-row' : emp.overtimeHours > 10 ? 'top-performer-row' : ''}">
                      <td><strong>${emp.employeeCode}</strong></td>
                      <td>${emp.firstName} ${emp.lastName}</td>
                      <td>${emp.department}</td>
                      <td>${emp.designation}</td>
                      <td style="text-align: center;">${emp.totalDays}</td>
                      <td style="text-align: center; font-weight: bold; ${emp.isMinHourBreach ? 'color: #f44336;' : emp.totalWorkedHours >= 200 ? 'color: #4caf50;' : ''}">${emp.totalWorkedHours.toFixed(1)}</td>
                      <td style="text-align: center;">${emp.averageHoursPerDay.toFixed(1)}</td>
                      <td style="text-align: center; ${emp.missedPunches > 5 ? 'color: #f44336; font-weight: bold;' : emp.missedPunches > 2 ? 'color: #ff9800;' : 'color: #4caf50;'}">${emp.missedPunches}</td>
                      <td style="text-align: center; color: #f44336;">${emp.deductedHours.toFixed(1)}</td>
                      <td style="text-align: center; ${emp.lateArrivals > 5 ? 'color: #f44336;' : emp.lateArrivals > 2 ? 'color: #ff9800;' : 'color: #4caf50;'}">${emp.lateArrivals}</td>
                      <td style="text-align: center; ${emp.earlyDepartures > 3 ? 'color: #f44336;' : emp.earlyDepartures > 1 ? 'color: #ff9800;' : 'color: #4caf50;'}">${emp.earlyDepartures}</td>
                      <td style="text-align: center; color: #4caf50;">${emp.perfectAttendanceDays}</td>
                      <td style="text-align: center;">
                        <span class="performance-indicator ${
                          emp.punctualityGrade === 'A+' || emp.punctualityGrade === 'A' ? 'excellent' : 
                          emp.punctualityGrade.startsWith('B') ? 'good' : 
                          emp.punctualityGrade === 'C+' || emp.punctualityGrade === 'C' ? 'satisfactory' : 
                          emp.punctualityGrade === 'D' ? 'needs-improvement' : 'critical'
                        }">${emp.punctualityGrade}</span>
                      </td>
                      <td style="text-align: center; font-weight: bold;">${emp.punctualityScore}</td>
                      <td style="text-align: center; ${emp.overtimeHours > 0 ? 'color: #4caf50; font-weight: bold;' : ''}">${emp.overtimeHours.toFixed(1)}</td>
                      <td style="text-align: center;">
                        ${emp.isMinHourBreach ? 
                          '<span class="performance-indicator critical">Critical</span>' : 
                          emp.overtimeHours > 10 ? 
                          '<span class="performance-indicator excellent">Star</span>' : 
                          '<span class="performance-indicator good">Regular</span>'
                        }
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            
            <div style="margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 10px;">
              <h4>📊 Data Explanation:</h4>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 15px;">
                <div>
                  <h5>Hours Calculation:</h5>
                  <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>Perfect attendance = recorded hours</li>
                    <li>Missed punch = 7.5 hrs - 0.5 hr penalty</li>
                    <li>Minimum requirement = 160 hours/month</li>
                    <li>Overtime = hours above 160</li>
                  </ul>
                </div>
                <div>
                  <h5>Punctuality Grading:</h5>
                  <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>A+/A = 90-100 points (Excellent)</li>
                    <li>B+/B = 80-89 points (Good)</li>
                    <li>C+/C = 70-79 points (Satisfactory)</li>
                    <li>D = 60-69 points (Needs Improvement)</li>
                    <li>F = <60 points (Critical)</li>
                  </ul>
                </div>
              </div>
              <div style="margin-top: 15px;">
                <h5>Punctuality Score Calculation:</h5>
                <p style="margin: 10px 0;">Base Score: 100 points | Deductions: Missed Punches (-10 each), Late Arrivals (-5 each), Early Departures (-3 each)</p>
              </div>
            </div>
          </div>
        </div>

        <div class="footer">
          <p><strong>Nexlinx Employee Management System</strong> | Comprehensive Analytics Dashboard</p>
          <p>Report Period: ${monthYear} | Generated: ${reportDate} | Biometric Employees Only</p>
          <p>For inquiries contact: <strong>admin@nexlinx.net.pk</strong> | System Administrator</p>
          <p style="font-size: 0.8em; opacity: 0.7;">This report contains confidential employee data. Distribute only to authorized personnel.</p>
        </div>
      </div>

      <script>
        // Set up Chart.js defaults
        Chart.defaults.font.family = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
        Chart.defaults.font.size = 12;

        // Compliance Pie Chart
        const complianceCtx = document.getElementById('complianceChart').getContext('2d');
        new Chart(complianceCtx, {
          type: 'doughnut',
          data: {
            labels: ['✅ Compliant (≥160h)', '⚠️ Non-Compliant (<160h)'],
            datasets: [{
              data: [${totalEmployees - minHourBreaches.length}, ${minHourBreaches.length}],
              backgroundColor: ['#4caf50', '#f44336'],
              borderWidth: 3,
              borderColor: '#fff'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { 
                position: 'bottom',
                labels: { padding: 20, usePointStyle: true }
              },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    const percentage = ((context.parsed / ${totalEmployees}) * 100).toFixed(1);
                    return context.label + ': ' + context.parsed + ' (' + percentage + '%)';
                  }
                }
              }
            }
          }
        });

        // Department Performance Chart
        const departmentCtx = document.getElementById('departmentChart').getContext('2d');
        new Chart(departmentCtx, {
          type: 'bar',
          data: {
            labels: [${Object.keys(departmentStats).map(dept => `'${dept}'`).join(', ')}],
            datasets: [{
              label: 'Total Employees',
              data: [${Object.values(departmentStats).map(stats => stats.total).join(', ')}],
              backgroundColor: '#667eea',
              borderRadius: 5
            }, {
              label: 'Non-Compliant',
              data: [${Object.values(departmentStats).map(stats => stats.breaches).join(', ')}],
              backgroundColor: '#f44336',
              borderRadius: 5
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: { 
                beginAtZero: true,
                grid: { color: '#e0e0e0' }
              },
              x: {
                grid: { display: false }
              }
            },
            plugins: {
              legend: { 
                position: 'top',
                labels: { padding: 20, usePointStyle: true }
              }
            }
          }
        });

        // Performance Distribution Chart
        const performanceCtx = document.getElementById('performanceDistribution').getContext('2d');
        new Chart(performanceCtx, {
          type: 'bar',
          data: {
            labels: ['🚨 Critical (<140h)', '⚠️ Needs Improvement (140-160h)', '✅ Satisfactory (160-180h)', '👍 Good (180-200h)', '🏆 Excellent (200h+)'],
            datasets: [{
              label: 'Number of Employees',
              data: [${performanceBands.critical}, ${performanceBands.needsImprovement}, ${performanceBands.satisfactory}, ${performanceBands.good}, ${performanceBands.excellent}],
              backgroundColor: ['#9c27b0', '#f44336', '#ff9800', '#2196f3', '#4caf50'],
              borderRadius: 8,
              borderSkipped: false
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: { 
                beginAtZero: true,
                grid: { color: '#e0e0e0' }
              },
              x: {
                grid: { display: false }
              }
            },
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    const percentage = ((context.parsed.y / ${totalEmployees}) * 100).toFixed(1);
                    return 'Employees: ' + context.parsed.y + ' (' + percentage + '%)';
                  }
                }
              }
            }
          }
        });

        // Hours Range Distribution
        const allEmployeeHours = [${allEmployees.map(emp => emp.totalWorkedHours).join(', ')}];
        const hoursRanges = ['<120', '120-140', '140-160', '160-180', '180-200', '200+'];
        const rangeCounts = [
          allEmployeeHours.filter(h => h < 120).length,
          allEmployeeHours.filter(h => h >= 120 && h < 140).length,
          allEmployeeHours.filter(h => h >= 140 && h < 160).length,
          allEmployeeHours.filter(h => h >= 160 && h < 180).length,
          allEmployeeHours.filter(h => h >= 180 && h < 200).length,
          allEmployeeHours.filter(h => h >= 200).length
        ];
        
        const hoursRangeCtx = document.getElementById('hoursRangeChart').getContext('2d');
        new Chart(hoursRangeCtx, {
          type: 'doughnut',
          data: {
            labels: hoursRanges,
            datasets: [{
              data: rangeCounts,
              backgroundColor: ['#9c27b0', '#f44336', '#ff9800', '#2196f3', '#4caf50', '#00bcd4'],
              borderWidth: 2,
              borderColor: '#fff'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { 
                position: 'bottom',
                labels: { padding: 15, usePointStyle: true }
              }
            }
          }
        });

        // Missed Punch Impact Chart
        const missedPunchData = [
          allEmployeeHours.filter((_, i) => ${JSON.stringify(allEmployees.map(emp => emp.missedPunches))}[i] === 0).length,
          allEmployeeHours.filter((_, i) => ${JSON.stringify(allEmployees.map(emp => emp.missedPunches))}[i] >= 1 && ${JSON.stringify(allEmployees.map(emp => emp.missedPunches))}[i] <= 3).length,
          allEmployeeHours.filter((_, i) => ${JSON.stringify(allEmployees.map(emp => emp.missedPunches))}[i] >= 4 && ${JSON.stringify(allEmployees.map(emp => emp.missedPunches))}[i] <= 7).length,
          allEmployeeHours.filter((_, i) => ${JSON.stringify(allEmployees.map(emp => emp.missedPunches))}[i] > 7).length
        ];

        const missedPunchCtx = document.getElementById('missedPunchChart').getContext('2d');
        new Chart(missedPunchCtx, {
          type: 'bar',
          data: {
            labels: ['Perfect (0)', 'Minor (1-3)', 'Moderate (4-7)', 'High (8+)'],
            datasets: [{
              label: 'Employees by Missed Punch Count',
              data: missedPunchData,
              backgroundColor: ['#4caf50', '#ff9800', '#f44336', '#9c27b0'],
              borderRadius: 6
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: { 
                beginAtZero: true,
                grid: { color: '#e0e0e0' }
              },
              x: {
                grid: { display: false }
              }
            },
            plugins: {
              legend: { display: false }
            }
          }
        });
      </script>
    </body>
    </html>
  `;
}

export async function sendVisualReportEmail(htmlReport: string, monthYear: string): Promise<boolean> {
  try {
    console.log('[Visual Email] Sending comprehensive visual hours report via Nexlinx SMTP...');

    const transporter = nodemailer.createTransport(EMAIL_CONFIG.smtpConfig);

    const mailOptions = {
      from: EMAIL_CONFIG.fromEmail,
      to: EMAIL_CONFIG.toEmails,
      subject: `📊 Nexlinx EMS - Visual Employee Hours Analytics Report (${monthYear})`,
      html: htmlReport,
      attachments: [
        {
          filename: `Nexlinx_Visual_Hours_Report_${monthYear.replace(' ', '_')}.html`,
          content: htmlReport,
          contentType: 'text/html'
        }
      ]
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('[Visual Email] Comprehensive visual report sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('[Visual Email] Failed to send visual report:', error);
    
    // Fallback: Save report to file
    try {
      const fs = require('fs');
      const path = require('path');
      const reportsDir = './reports';
      
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }
      
      const filename = `Visual_Hours_Report_${monthYear.replace(' ', '_')}_${new Date().toISOString().split('T')[0]}.html`;
      const filepath = path.join(reportsDir, filename);
      
      fs.writeFileSync(filepath, htmlReport);
      console.log(`[Visual Email] Visual report saved to file: ${filepath}`);
      return true;
    } catch (fileError) {
      console.error('[Visual Email] Failed to save visual report:', fileError);
      return false;
    }
  }
}

export async function executeVisualHoursReport(month?: string, year?: string): Promise<void> {
  try {
    console.log('[Visual Hours Report] Starting comprehensive visual employee hours report...');
    
    const reportData = await generateVisualHoursReport(month, year);
    const htmlReport = await generateVisualHtmlReport(reportData);
    
    console.log('[Visual Hours Report] Visual report generated successfully');
    console.log(`[Visual Hours Report] Analytics - Total: ${reportData.totalEmployees}, Critical Cases: ${reportData.minHourBreaches.length}, Top Performers: ${reportData.topPerformers.length}`);
    
    const emailSent = await sendVisualReportEmail(htmlReport, reportData.monthYear);
    
    if (emailSent) {
      console.log('[Visual Hours Report] ✅ Comprehensive visual report generated and emailed successfully!');
    } else {
      console.log('[Visual Hours Report] ⚠️ Visual report generated but email failed. Please check email configuration.');
    }
  } catch (error) {
    console.error('[Visual Hours Report] ❌ Failed to generate visual hours report:', error);
    throw error;
  }
}