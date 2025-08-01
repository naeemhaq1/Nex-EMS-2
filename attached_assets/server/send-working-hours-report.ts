import nodemailer from "nodemailer";

async function sendWorkingHoursReport(recipientEmail: string) {
  const transporter = nodemailer.createTransport({
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
  });

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.4; color: #333; max-width: 1400px; margin: 0 auto; padding: 20px; font-size: 11px; }
        .header { background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: white; padding: 25px; border-radius: 10px; text-align: center; margin-bottom: 25px; }
        .header h1 { margin: 0; font-size: 24px; }
        .header p { margin: 8px 0 0; font-size: 14px; opacity: 0.9; }
        .summary-section { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 15px 0; }
        .summary-section h2 { color: #7c3aed; margin-top: 0; font-size: 18px; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin: 15px 0; }
        .summary-card { background: white; padding: 12px; border-radius: 6px; text-align: center; border: 1px solid #e2e8f0; }
        .summary-number { font-size: 20px; font-weight: bold; color: #7c3aed; }
        .summary-label { color: #6b7280; margin-top: 3px; font-size: 10px; }
        .department-section { margin: 15px 0; page-break-inside: avoid; }
        .dept-header { background: #f1f5f9; padding: 12px; border-radius: 6px 6px 0 0; border-bottom: 2px solid #e2e8f0; }
        .dept-title { margin: 0; color: #1e40af; font-size: 14px; }
        .dept-stats { color: #6b7280; font-size: 10px; margin: 3px 0 0; }
        .high-hours { border-left: 4px solid #10b981; }
        .medium-hours { border-left: 4px solid #f59e0b; }
        .low-hours { border-left: 4px solid #ef4444; }
        .no-hours { border-left: 4px solid #6b7280; }
        table { width: 100%; border-collapse: collapse; margin: 0; font-size: 10px; }
        th { background: #f8fafc; font-weight: 600; color: #374151; padding: 6px 4px; text-align: left; border-bottom: 1px solid #e2e8f0; font-size: 9px; }
        td { padding: 4px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
        .employee-code { font-weight: bold; color: #1e40af; font-size: 9px; }
        .hours-high { background: #ecfdf5; font-weight: bold; color: #059669; }
        .hours-medium { background: #fef3c7; font-weight: bold; color: #d97706; }
        .hours-low { background: #fee2e2; font-weight: bold; color: #dc2626; }
        .overtime-yes { background: #fef2f2; color: #dc2626; font-weight: bold; }
        .overtime-no { color: #6b7280; }
        .completion-high { color: #059669; font-weight: bold; }
        .completion-medium { color: #d97706; font-weight: bold; }
        .completion-low { color: #dc2626; font-weight: bold; }
        .page-break { page-break-before: always; }
        .compact-row td { padding: 3px 4px; }
        .designation { color: #6b7280; font-size: 9px; }
        .shift-info { color: #7c3aed; font-size: 9px; font-weight: 500; }
        .policy-note { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 12px; margin: 15px 0; }
        .policy-note h3 { color: #d97706; margin: 0 0 8px 0; font-size: 12px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>⏰ COMPREHENSIVE WORKING HOURS REPORT</h1>
        <p>Department-wise Analysis with Overtime & Completion Rates | July 26, 2025</p>
    </div>

    <div class="policy-note">
        <h3>📋 Working Hours Calculation Policy</h3>
        <p><strong>Missed Punch-outs:</strong> Employees who punch-in but fail to punch-out are automatically credited with <strong>7 hours maximum</strong> as per company policy.</p>
        <p><strong>Overtime Policy:</strong> Hours worked beyond 8 hours per day are calculated as overtime. Standard working day = 8 hours.</p>
        <p><strong>Completion Rate:</strong> Percentage of working days where employee completed both punch-in and punch-out properly.</p>
    </div>

    <div class="summary-section">
        <h2>📊 System-wide Working Hours Overview (Last 30 Days)</h2>
        <div class="summary-grid">
            <div class="summary-card">
                <div class="summary-number">18,449</div>
                <div class="summary-label">Total Hours Worked</div>
            </div>
            <div class="summary-card">
                <div class="summary-number">2,835</div>
                <div class="summary-label">Total Working Days</div>
            </div>
            <div class="summary-card">
                <div class="summary-number">1,733</div>
                <div class="summary-label">Missed Punch-outs</div>
            </div>
            <div class="summary-card">
                <div class="summary-number">1,102</div>
                <div class="summary-label">Complete Days</div>
            </div>
            <div class="summary-card">
                <div class="summary-number">571.8</div>
                <div class="summary-label">Total Overtime Hours</div>
            </div>
            <div class="summary-card">
                <div class="summary-number">6.5</div>
                <div class="summary-label">Average Hours/Day</div>
            </div>
        </div>
    </div>

    <!-- TOP PERFORMING DEPARTMENTS -->
    <div class="department-section high-hours">
        <div class="dept-header">
            <h3 class="dept-title">🏆 LHE-SAFECITY (5,507.9 Total Hours)</h3>
            <div class="dept-stats">73 employees • 846 working days • 628 missed punch-outs • 6.4 avg hrs/day • 138.3 overtime hrs • 25.8% completion rate</div>
        </div>
        <table>
            <tr><th>Code</th><th>Name</th><th>Role</th><th>Shift</th><th>Days</th><th>Missed</th><th>Complete</th><th>Total Hrs</th><th>Avg/Day</th><th>Overtime</th><th>Rate</th></tr>
            <tr class="compact-row">
                <td class="employee-code">10070502</td><td>Hamza Shafiq</td><td class="designation">Helper</td><td class="shift-info">PSCA-Evening</td><td>19</td><td>15</td><td>4</td><td class="hours-high">123.2</td><td>6.5</td><td class="overtime-yes">8.2</td><td class="completion-low">21.1%</td>
            </tr>
            <tr class="compact-row">
                <td class="employee-code">10070503</td><td>Shahzad Ali</td><td class="designation">Helper</td><td class="shift-info">PSCA-Morning</td><td>18</td><td>14</td><td>4</td><td class="hours-high">119.5</td><td>6.6</td><td class="overtime-yes">9.5</td><td class="completion-low">22.2%</td>
            </tr>
            <tr class="compact-row">
                <td class="employee-code">10070556</td><td>Gull Hassan</td><td class="designation">Helper (OFC)</td><td class="shift-info">PSCA-Evening-2</td><td>18</td><td>15</td><td>3</td><td class="hours-high">115.8</td><td>6.4</td><td class="overtime-yes">0.8</td><td class="completion-low">16.7%</td>
            </tr>
            <!-- Additional top performers truncated for space -->
        </table>
    </div>

    <div class="department-section high-hours">
        <div class="dept-header">
            <h3 class="dept-title">🔧 FSD (1,945.1 Total Hours)</h3>
            <div class="dept-stats">27 employees • 303 working days • 191 missed punch-outs • 6.3 avg hrs/day • 56.0 overtime hrs • 37.0% completion rate</div>
        </div>
        <table>
            <tr><th>Code</th><th>Name</th><th>Role</th><th>Shift</th><th>Days</th><th>Missed</th><th>Complete</th><th>Total Hrs</th><th>Avg/Day</th><th>Overtime</th><th>Rate</th></tr>
            <tr class="compact-row">
                <td class="employee-code">10090684</td><td>Muhammad Irfan</td><td class="designation">Office Boy</td><td class="shift-info">SYS-AFTERNOON</td><td>24</td><td>18</td><td>6</td><td class="hours-high">153.5</td><td>6.4</td><td class="overtime-yes">3.5</td><td class="completion-low">25.0%</td>
            </tr>
            <tr class="compact-row">
                <td class="employee-code">10090310</td><td>Khadim Hussain</td><td class="designation">Ragger</td><td class="shift-info">SYS-STANDARD</td><td>16</td><td>11</td><td>5</td><td class="hours-high">120.3</td><td>7.5</td><td class="overtime-yes">4.5</td><td class="completion-medium">31.3%</td>
            </tr>
            <tr class="compact-row">
                <td class="employee-code">10009101</td><td>Syed Zaidi</td><td class="designation">Technical Support</td><td class="shift-info">SYS-LATE-MORNING</td><td>17</td><td>12</td><td>5</td><td class="hours-high">117.9</td><td>6.9</td><td class="overtime-yes">2.6</td><td class="completion-low">29.4%</td>
            </tr>
            <!-- Additional FSD employees truncated -->
        </table>
    </div>

    <div class="department-section medium-hours">
        <div class="dept-header">
            <h3 class="dept-title">🏢 LHE-SALES (1,542.6 Total Hours)</h3>
            <div class="dept-stats">19 employees • 240 working days • 150 missed punch-outs • 6.4 avg hrs/day • 65.1 overtime hrs • 37.5% completion rate</div>
        </div>
        <table>
            <tr><th>Code</th><th>Name</th><th>Role</th><th>Shift</th><th>Days</th><th>Missed</th><th>Complete</th><th>Total Hrs</th><th>Avg/Day</th><th>Overtime</th><th>Rate</th></tr>
            <tr class="compact-row">
                <td class="employee-code">10090169</td><td>Babar Hussain</td><td class="designation">Sales Executive</td><td class="shift-info">Nexlinx-10to6</td><td>19</td><td>14</td><td>5</td><td class="hours-high">137.6</td><td>7.2</td><td class="overtime-yes">12.6</td><td class="completion-low">26.3%</td>
            </tr>
            <tr class="compact-row">
                <td class="employee-code">10090172</td><td>Muhammad Butt</td><td class="designation">Sales Manager</td><td class="shift-info">Nexlinx-10to6</td><td>18</td><td>12</td><td>6</td><td class="hours-high">131.2</td><td>7.3</td><td class="overtime-yes">11.2</td><td class="completion-medium">33.3%</td>
            </tr>
            <!-- Additional sales employees truncated -->
        </table>
    </div>

    <div class="page-break"></div>

    <!-- EFFICIENCY LEADERS -->
    <div class="department-section high-hours">
        <div class="dept-header">
            <h3 class="dept-title">⚡ HIGH EFFICIENCY DEPARTMENTS (Best Completion Rates)</h3>
            <div class="dept-stats">Departments with 50%+ punch-out completion rates</div>
        </div>
        <table>
            <tr><th>Department</th><th>Employees</th><th>Total Hours</th><th>Avg Hrs/Day</th><th>Completion Rate</th><th>Overtime Hours</th></tr>
            <tr class="compact-row">
                <td><strong>LHE-Store</strong></td><td>2</td><td class="hours-medium">113.2</td><td>7.1</td><td class="completion-high">68.8%</td><td class="overtime-yes">10.4</td>
            </tr>
            <tr class="compact-row">
                <td><strong>LHE-Datacom</strong></td><td>11</td><td class="hours-medium">476.8</td><td>5.9</td><td class="completion-high">58.0%</td><td class="overtime-no">10.2</td>
            </tr>
            <tr class="compact-row">
                <td><strong>LHE-Field-Team</strong></td><td>4</td><td class="hours-medium">279.3</td><td>6.1</td><td class="completion-high">54.3%</td><td class="overtime-no">8.8</td>
            </tr>
            <tr class="compact-row">
                <td><strong>LHE-Switching</strong></td><td>3</td><td class="hours-medium">181.7</td><td>6.3</td><td class="completion-medium">48.3%</td><td class="overtime-no">1.3</td>
            </tr>
        </table>
    </div>

    <!-- OVERTIME ANALYSIS -->
    <div class="department-section medium-hours">
        <div class="dept-header">
            <h3 class="dept-title">⏰ OVERTIME ANALYSIS</h3>
            <div class="dept-stats">Departments with highest overtime hours</div>
        </div>
        <table>
            <tr><th>Department</th><th>Total Overtime</th><th>Avg Per Employee</th><th>Top Overtime Worker</th><th>Individual Max</th></tr>
            <tr class="compact-row">
                <td><strong>LHE-Safecity</strong></td><td class="overtime-yes">138.3 hrs</td><td>1.9 hrs</td><td>Shahid Rashid (17.8 hrs)</td><td class="overtime-yes">17.8 hrs</td>
            </tr>
            <tr class="compact-row">
                <td><strong>LHE-OFC</strong></td><td class="overtime-yes">66.4 hrs</td><td>2.5 hrs</td><td>Ali Zaib (12.2 hrs)</td><td class="overtime-yes">12.2 hrs</td>
            </tr>
            <tr class="compact-row">
                <td><strong>LHE-Sales</strong></td><td class="overtime-yes">65.1 hrs</td><td>3.4 hrs</td><td>Babar Hussain (12.6 hrs)</td><td class="overtime-yes">12.6 hrs</td>
            </tr>
            <tr class="compact-row">
                <td><strong>FSD</strong></td><td class="overtime-yes">56.0 hrs</td><td>2.1 hrs</td><td>Kashif Maqsood (4.8 hrs)</td><td class="overtime-yes">4.8 hrs</td>
            </tr>
        </table>
    </div>

    <!-- DEPARTMENTS WITH ATTENDANCE ISSUES -->
    <div class="department-section low-hours">
        <div class="dept-header">
            <h3 class="dept-title">⚠️ DEPARTMENTS REQUIRING ATTENTION</h3>
            <div class="dept-stats">Low completion rates or minimal attendance data</div>
        </div>
        <table>
            <tr><th>Department</th><th>Employees</th><th>Completion Rate</th><th>Issue Description</th><th>Recommendation</th></tr>
            <tr class="compact-row">
                <td><strong>ADMIN-SYS</strong></td><td>1</td><td class="completion-low">0.0%</td><td>No attendance records</td><td>Assign shift and track attendance</td>
            </tr>
            <tr class="compact-row">
                <td><strong>Okara</strong></td><td>1</td><td class="completion-low">0.0%</td><td>No attendance records</td><td>Verify employee status and location</td>
            </tr>
            <tr class="compact-row">
                <td><strong>LHE-OFC</strong></td><td>27</td><td class="completion-low">24.9%</td><td>Very high missed punch-outs (175/233)</td><td>Improve punch-out compliance training</td>
            </tr>
            <tr class="compact-row">
                <td><strong>NOC</strong></td><td>11</td><td class="completion-low">24.2%</td><td>High missed punch-outs (113/149)</td><td>Implement punch-out reminders</td>
            </tr>
        </table>
    </div>

    <!-- INDIVIDUAL TOP PERFORMERS -->
    <div class="department-section high-hours">
        <div class="dept-header">
            <h3 class="dept-title">🌟 TOP INDIVIDUAL PERFORMERS (Highest Total Hours)</h3>
            <div class="dept-stats">Employees with exceptional working hours</div>
        </div>
        <table>
            <tr><th>Code</th><th>Name</th><th>Department</th><th>Total Hours</th><th>Working Days</th><th>Avg/Day</th><th>Completion Rate</th></tr>
            <tr class="compact-row">
                <td class="employee-code">10090684</td><td><strong>Muhammad Irfan</strong></td><td>FSD</td><td class="hours-high">153.5</td><td>24</td><td>6.4</td><td class="completion-low">25.0%</td>
            </tr>
            <tr class="compact-row">
                <td class="employee-code">10070502</td><td><strong>Hamza Shafiq</strong></td><td>LHE-Safecity</td><td class="hours-high">123.2</td><td>19</td><td>6.5</td><td class="completion-low">21.1%</td>
            </tr>
            <tr class="compact-row">
                <td class="employee-code">10090310</td><td><strong>Khadim Hussain</strong></td><td>FSD</td><td class="hours-high">120.3</td><td>16</td><td>7.5</td><td class="completion-medium">31.3%</td>
            </tr>
            <tr class="compact-row">
                <td class="employee-code">10090162</td><td><strong>Sheikh Shahzad</strong></td><td>LHE-Accounts</td><td class="hours-high">120.7</td><td>18</td><td>6.7</td><td class="completion-medium">38.9%</td>
            </tr>
            <tr class="compact-row">
                <td class="employee-code">10070503</td><td><strong>Shahzad Ali</strong></td><td>LHE-Safecity</td><td class="hours-high">119.5</td><td>18</td><td>6.6</td><td class="completion-low">22.2%</td>
            </tr>
        </table>
    </div>

    <div class="summary-section">
        <h2>📈 Key Insights & Recommendations</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div>
                <h3 style="color: #10b981; margin-top: 0;">✅ Positive Trends</h3>
                <ul style="font-size: 11px; line-height: 1.4;">
                    <li><strong>High Total Productivity:</strong> 18,449 hours worked across all departments</li>
                    <li><strong>Consistent Average:</strong> 6.5 hours per working day is reasonable</li>
                    <li><strong>Some Departments Excel:</strong> LHE-Store (68.8%), LHE-Datacom (58.0%) completion rates</li>
                    <li><strong>Overtime Contained:</strong> 571.8 total overtime hours (3.1% of total hours)</li>
                </ul>
            </div>
            <div>
                <h3 style="color: #ef4444; margin-top: 0;">⚠️ Areas for Improvement</h3>
                <ul style="font-size: 11px; line-height: 1.4;">
                    <li><strong>High Missed Punch-outs:</strong> 1,733 out of 2,835 working days (61.1%)</li>
                    <li><strong>Low System Completion:</strong> Overall 38.9% proper punch-in/out completion</li>
                    <li><strong>Zero Attendance:</strong> ADMIN-SYS, Okara need attention</li>
                    <li><strong>Training Needed:</strong> Punch-out compliance across all departments</li>
                </ul>
            </div>
        </div>
    </div>

    <div style="margin-top: 30px; padding: 15px; background: #f8fafc; border-radius: 6px; text-align: center;">
        <p style="margin: 0; color: #6b7280; font-size: 11px;">
            <strong>Generated:</strong> July 26, 2025 | 
            <strong>Period:</strong> Last 30 Days | 
            <strong>System:</strong> Nexlinx Smart EMS | 
            <strong>Policy:</strong> 7-hour max for missed punch-outs, 8-hour standard workday
        </p>
    </div>
</body>
</html>`;

  const textContent = `
COMPREHENSIVE WORKING HOURS REPORT
Department-wise Analysis with Overtime & Completion Rates
July 26, 2025

WORKING HOURS CALCULATION POLICY:
- Missed Punch-outs: Employees who punch-in but fail to punch-out are automatically credited with 7 hours maximum
- Overtime Policy: Hours worked beyond 8 hours per day are calculated as overtime
- Completion Rate: Percentage of working days where employee completed both punch-in and punch-out properly

SYSTEM-WIDE OVERVIEW (Last 30 Days):
- Total Hours Worked: 18,449 hours
- Total Working Days: 2,835 days
- Missed Punch-outs: 1,733 instances
- Complete Days: 1,102 days
- Total Overtime Hours: 571.8 hours
- Average Hours per Day: 6.5 hours

TOP PERFORMING DEPARTMENTS:

1. LHE-SAFECITY (5,507.9 Total Hours)
   - 73 employees, 846 working days, 628 missed punch-outs
   - 6.4 avg hrs/day, 138.3 overtime hrs, 25.8% completion rate
   - Top performer: Hamza Shafiq (123.2 hours, 19 days)

2. FSD (1,945.1 Total Hours)
   - 27 employees, 303 working days, 191 missed punch-outs
   - 6.3 avg hrs/day, 56.0 overtime hrs, 37.0% completion rate
   - Top performer: Muhammad Irfan (153.5 hours, 24 days)

3. LHE-SALES (1,542.6 Total Hours)
   - 19 employees, 240 working days, 150 missed punch-outs
   - 6.4 avg hrs/day, 65.1 overtime hrs, 37.5% completion rate

HIGH EFFICIENCY DEPARTMENTS (Best Completion Rates):
- LHE-Store: 68.8% completion rate (2 employees, 113.2 hours)
- LHE-Datacom: 58.0% completion rate (11 employees, 476.8 hours)
- LHE-Field-Team: 54.3% completion rate (4 employees, 279.3 hours)
- LHE-Switching: 48.3% completion rate (3 employees, 181.7 hours)

OVERTIME ANALYSIS:
- LHE-Safecity: 138.3 total overtime hours (1.9 avg per employee)
- LHE-OFC: 66.4 total overtime hours (2.5 avg per employee)
- LHE-Sales: 65.1 total overtime hours (3.4 avg per employee)
- FSD: 56.0 total overtime hours (2.1 avg per employee)

DEPARTMENTS REQUIRING ATTENTION:
- ADMIN-SYS: 0.0% completion rate (no attendance records)
- Okara: 0.0% completion rate (no attendance records)
- LHE-OFC: 24.9% completion rate (very high missed punch-outs: 175/233)
- NOC: 24.2% completion rate (high missed punch-outs: 113/149)

TOP INDIVIDUAL PERFORMERS:
1. Muhammad Irfan (FSD): 153.5 hours, 24 days, 6.4 avg/day
2. Hamza Shafiq (LHE-Safecity): 123.2 hours, 19 days, 6.5 avg/day
3. Khadim Hussain (FSD): 120.3 hours, 16 days, 7.5 avg/day
4. Sheikh Shahzad (LHE-Accounts): 120.7 hours, 18 days, 6.7 avg/day
5. Shahzad Ali (LHE-Safecity): 119.5 hours, 18 days, 6.6 avg/day

KEY INSIGHTS & RECOMMENDATIONS:

POSITIVE TRENDS:
- High Total Productivity: 18,449 hours worked across all departments
- Consistent Average: 6.5 hours per working day is reasonable
- Some Departments Excel: LHE-Store (68.8%), LHE-Datacom (58.0%) completion rates
- Overtime Contained: 571.8 total overtime hours (3.1% of total hours)

AREAS FOR IMPROVEMENT:
- High Missed Punch-outs: 1,733 out of 2,835 working days (61.1%)
- Low System Completion: Overall 38.9% proper punch-in/out completion
- Zero Attendance: ADMIN-SYS, Okara need attention
- Training Needed: Punch-out compliance across all departments

Generated: July 26, 2025 | Period: Last 30 Days | System: Nexlinx Smart EMS
Policy: 7-hour max for missed punch-outs, 8-hour standard workday
`;

  try {
    const info = await transporter.sendMail({
      from: '"Nexlinx Smart EMS" <fstream@emailserver.nexlinx.net.pk>',
      to: recipientEmail,
      subject: "⏰ Working Hours Report - Department-wise Analysis & Overtime Tracking",
      html: htmlContent,
      text: textContent
    });
    
    console.log("✅ Working hours report sent successfully:", info.messageId);
    return true;
  } catch (error) {
    console.error("❌ Failed to send working hours report:", error);
    return false;
  }
}

// Execute if run directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  const recipientEmail = process.argv[2];
  if (!recipientEmail) {
    console.error("Please provide recipient email address");
    console.log("Usage: tsx server/send-working-hours-report.ts recipient@example.com");
    process.exit(1);
  }
  
  sendWorkingHoursReport(recipientEmail)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { sendWorkingHoursReport };