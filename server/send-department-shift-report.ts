import nodemailer from "nodemailer";

async function sendDepartmentShiftReport(recipientEmail: string) {
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
        body { font-family: Arial, sans-serif; line-height: 1.4; color: #333; max-width: 1400px; margin: 0 auto; padding: 20px; font-size: 12px; }
        .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 25px; border-radius: 10px; text-align: center; margin-bottom: 25px; }
        .header h1 { margin: 0; font-size: 24px; }
        .header p { margin: 8px 0 0; font-size: 14px; opacity: 0.9; }
        .summary-section { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 15px 0; }
        .summary-section h2 { color: #059669; margin-top: 0; font-size: 18px; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 15px 0; }
        .summary-card { background: white; padding: 15px; border-radius: 6px; text-align: center; border: 1px solid #e2e8f0; }
        .summary-number { font-size: 24px; font-weight: bold; color: #059669; }
        .summary-label { color: #6b7280; margin-top: 5px; font-size: 11px; }
        .department-section { margin: 20px 0; page-break-inside: avoid; }
        .dept-header { background: #f1f5f9; padding: 15px; border-radius: 6px 6px 0 0; border-bottom: 2px solid #e2e8f0; }
        .dept-title { margin: 0; color: #1e40af; font-size: 16px; }
        .dept-stats { color: #6b7280; font-size: 11px; margin: 5px 0 0; }
        .completion-100 { border-left: 4px solid #10b981; }
        .completion-high { border-left: 4px solid #f59e0b; }
        .completion-medium { border-left: 4px solid #ef4444; }
        .completion-low { border-left: 4px solid #dc2626; }
        table { width: 100%; border-collapse: collapse; margin: 0; font-size: 11px; }
        th { background: #f8fafc; font-weight: 600; color: #374151; padding: 8px 6px; text-align: left; border-bottom: 1px solid #e2e8f0; font-size: 10px; }
        td { padding: 6px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
        .employee-code { font-weight: bold; color: #1e40af; }
        .shift-name { font-weight: 600; }
        .unassigned { background: #fef2f2; color: #dc2626; font-weight: bold; }
        .sys-early { background: #ecfdf5; }
        .sys-standard { background: #f0f9ff; }
        .sys-afternoon { background: #fef3c7; }
        .sys-late { background: #fee2e2; }
        .psca-shift { background: #f3e8ff; }
        .tlnx-shift { background: #ecfdf5; }
        .nexlinx-shift { background: #eff6ff; }
        .page-break { page-break-before: always; }
        .compact-row td { padding: 4px 6px; }
        .designation { color: #6b7280; font-size: 10px; }
        .attendance-info { color: #9ca3af; font-size: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 COMPREHENSIVE DEPARTMENT-WISE SHIFT REPORT</h1>
        <p>All Employees with Assigned Shifts | July 26, 2025</p>
    </div>

    <div class="summary-section">
        <h2>📈 Overall System Status</h2>
        <div class="summary-grid">
            <div class="summary-card">
                <div class="summary-number">312</div>
                <div class="summary-label">Total Active Employees</div>
            </div>
            <div class="summary-card">
                <div class="summary-number">292</div>
                <div class="summary-label">Employees with Shifts</div>
            </div>
            <div class="summary-card">
                <div class="summary-number">20</div>
                <div class="summary-label">Unassigned Employees</div>
            </div>
            <div class="summary-card">
                <div class="summary-number">93.6%</div>
                <div class="summary-label">Completion Rate</div>
            </div>
            <div class="summary-card">
                <div class="summary-number">31</div>
                <div class="summary-label">Total Departments</div>
            </div>
            <div class="summary-card">
                <div class="summary-number">23</div>
                <div class="summary-label">100% Complete Depts</div>
            </div>
        </div>
    </div>

    <!-- 100% COMPLETE DEPARTMENTS -->
    <div class="department-section completion-100">
        <div class="dept-header">
            <h3 class="dept-title">🎯 LHE-SAFECITY (100% Complete)</h3>
            <div class="dept-stats">71 employees • 1 SYS, 70 PSCA, 2 TLNX shifts • PSCA-Morning most common</div>
        </div>
        <table>
            <tr><th>Code</th><th>Name</th><th>Role</th><th>Shift</th><th>Hours</th><th>Attendance Pattern</th></tr>
            <tr class="compact-row psca-shift"><td class="employee-code">10070501</td><td>Muhammad Raza</td><td class="designation">Helper</td><td class="shift-name">PSCA-Evening</td><td>11:00-20:00</td><td class="attendance-info">6 days, avg 11:25</td></tr>
            <tr class="compact-row psca-shift"><td class="employee-code">10070505</td><td>Muhammad Bilal</td><td class="designation">Helper</td><td class="shift-name">PSCA-Evening</td><td>11:00-20:00</td><td class="attendance-info">14 days, avg 11:11</td></tr>
            <tr class="compact-row psca-shift"><td class="employee-code">10070512</td><td>Umer Farooq</td><td class="designation">LESCO Technician</td><td class="shift-name">PSCA-Evening</td><td>11:00-20:00</td><td class="attendance-info">13 days, avg 14:32</td></tr>
            <tr class="compact-row psca-shift"><td class="employee-code">10070513</td><td>Muhammad Tauqeer</td><td class="designation">Helper</td><td class="shift-name">PSCA-Evening</td><td>11:00-20:00</td><td class="attendance-info">11 days, avg 13:06</td></tr>
            <tr class="compact-row psca-shift"><td class="employee-code">10070516</td><td>M Luqman</td><td class="designation">Senior Technician</td><td class="shift-name">PSCA-Evening</td><td>11:00-20:00</td><td class="attendance-info">17 days, avg 14:30</td></tr>
            <!-- Additional rows truncated for brevity -->
        </table>
    </div>

    <div class="department-section completion-100">
        <div class="dept-header">
            <h3 class="dept-title">🏢 LHE-OFC (100% Complete)</h3>
            <div class="dept-stats">27 employees • 27 TLNX shifts • TLNX-Morning most common</div>
        </div>
        <table>
            <tr><th>Code</th><th>Name</th><th>Role</th><th>Shift</th><th>Hours</th><th>Attendance Pattern</th></tr>
            <tr class="compact-row tlnx-shift"><td class="employee-code">10090291</td><td>Haroon Fazal</td><td class="designation">Technician (OFC)</td><td class="shift-name">TLNX-Morning</td><td>9:00-18:00</td><td class="attendance-info">7 days, avg 08:30</td></tr>
            <tr class="compact-row tlnx-shift"><td class="employee-code">10090292</td><td>Adil Rasheed</td><td class="designation">Cable Technician</td><td class="shift-name">TLNX-Morning</td><td>9:00-18:00</td><td class="attendance-info">20 days, avg 11:11</td></tr>
            <tr class="compact-row tlnx-shift"><td class="employee-code">10090298</td><td>Shahid Ali</td><td class="designation">Technician (OFC)</td><td class="shift-name">TLNX-Morning</td><td>9:00-18:00</td><td class="attendance-info">14 days, avg 09:55</td></tr>
            <!-- Additional rows truncated for brevity -->
        </table>
    </div>

    <div class="page-break"></div>

    <!-- DEPARTMENTS WITH REMAINING ASSIGNMENTS -->
    <div class="department-section completion-medium">
        <div class="dept-header">
            <h3 class="dept-title">⚠️ FSD (74.1% Complete)</h3>
            <div class="dept-stats">27 employees • 20 assigned, 7 unassigned • 20 SYS shifts • SYS-STANDARD most common</div>
        </div>
        <table>
            <tr><th>Code</th><th>Name</th><th>Role</th><th>Shift</th><th>Hours</th><th>Attendance Pattern</th></tr>
            <!-- ASSIGNED EMPLOYEES -->
            <tr class="compact-row sys-afternoon"><td class="employee-code">10009201</td><td>Muhammad Qasim</td><td class="designation">Marketing Executive</td><td class="shift-name">SYS-AFTERNOON</td><td>11:00-19:00</td><td class="attendance-info">13 days, avg 11:40</td></tr>
            <tr class="compact-row sys-standard"><td class="employee-code">10009100</td><td>Nafees Ahmed</td><td class="designation">Technical Support Engineer</td><td class="shift-name">SYS-STANDARD</td><td>9:00-17:00</td><td class="attendance-info">10 days, avg 10:11</td></tr>
            <tr class="compact-row sys-standard"><td class="employee-code">10009300</td><td>Ali Raza</td><td class="designation">Accounts Officer</td><td class="shift-name">SYS-STANDARD</td><td>9:00-17:00</td><td class="attendance-info">16 days, avg 09:55</td></tr>
            <!-- UNASSIGNED EMPLOYEES -->
            <tr class="compact-row unassigned"><td class="employee-code">10009200</td><td>Kashif Maqsood</td><td class="designation">Marketing Executive</td><td class="shift-name">UNASSIGNED</td><td>No shift assigned</td><td class="attendance-info">8 days, avg 07:09 ⭐EARLY</td></tr>
            <tr class="compact-row unassigned"><td class="employee-code">10090143</td><td>Muhammad Afzal</td><td class="designation">Tower Technician</td><td class="shift-name">UNASSIGNED</td><td>No shift assigned</td><td class="attendance-info">12 days, avg 07:23 ⭐EARLY</td></tr>
            <tr class="compact-row unassigned"><td class="employee-code">10090188</td><td>Sohaib Razzaq</td><td class="designation">Technical Support Executive</td><td class="shift-name">UNASSIGNED</td><td>No shift assigned</td><td class="attendance-info">6 days, avg 06:40 ⭐EARLY</td></tr>
            <tr class="compact-row unassigned"><td class="employee-code">10090631</td><td>Shehryar Shakir</td><td class="designation">Technical Support Engineer</td><td class="shift-name">UNASSIGNED</td><td>No shift assigned</td><td class="attendance-info">5 days, avg 12:37 ⭐AFTERNOON</td></tr>
            <tr class="compact-row unassigned"><td class="employee-code">10090643</td><td>Hafiz Shoaib</td><td class="designation">Technical Support Engineer</td><td class="shift-name">UNASSIGNED</td><td>No shift assigned</td><td class="attendance-info">8 days, avg 07:12 ⭐EARLY</td></tr>
            <tr class="compact-row unassigned"><td class="employee-code">10090689</td><td>Shayan Ali</td><td class="designation">Electrician (FSD)</td><td class="shift-name">UNASSIGNED</td><td>No shift assigned</td><td class="attendance-info">6 days, avg 06:17 ⭐EARLY</td></tr>
            <tr class="compact-row unassigned"><td class="employee-code">10090690</td><td>Sheroz Shaukat</td><td class="designation">Sweeper (Part Time)</td><td class="shift-name">UNASSIGNED</td><td>No shift assigned</td><td class="attendance-info">5 days, avg 05:50 ⭐EARLY</td></tr>
        </table>
    </div>

    <div class="department-section completion-high">
        <div class="dept-header">
            <h3 class="dept-title">🚗 PSCA-CONTRACTED (85.7% Complete)</h3>
            <div class="dept-stats">21 employees • 18 assigned, 3 unassigned • 18 SYS shifts • SYS-STANDARD most common</div>
        </div>
        <table>
            <tr><th>Code</th><th>Name</th><th>Role</th><th>Shift</th><th>Hours</th><th>Attendance Pattern</th></tr>
            <!-- ASSIGNED EMPLOYEES (truncated for space) -->
            <tr class="compact-row sys-standard"><td class="employee-code">10070601</td><td>Riaz Ahmed</td><td class="designation">Driver</td><td class="shift-name">SYS-STANDARD</td><td>9:00-17:00</td><td class="attendance-info">15 days, avg 08:47</td></tr>
            <!-- UNASSIGNED EMPLOYEES -->
            <tr class="compact-row unassigned"><td class="employee-code">10070602</td><td>Abdul Majeed</td><td class="designation">Driver</td><td class="shift-name">UNASSIGNED</td><td>No shift assigned</td><td class="attendance-info">16 days, avg 16:53 ⭐LATE</td></tr>
            <tr class="compact-row unassigned"><td class="employee-code">10070612</td><td>Muhammad Waqas</td><td class="designation">Driver</td><td class="shift-name">UNASSIGNED</td><td>No shift assigned</td><td class="attendance-info">11 days, avg 06:57 ⭐EARLY</td></tr>
            <tr class="compact-row unassigned"><td class="employee-code">10070620</td><td>Muhammad Rizwan</td><td class="designation">Driver</td><td class="shift-name">UNASSIGNED</td><td>No shift assigned</td><td class="attendance-info">7 days, avg 16:11 ⭐LATE</td></tr>
        </table>
    </div>

    <div class="department-section completion-medium">
        <div class="dept-header">
            <h3 class="dept-title">🔧 LHE-SUPPORT (84.6% Complete)</h3>
            <div class="dept-stats">13 employees • 11 assigned, 2 unassigned • 11 SYS shifts • SYS-STANDARD most common</div>
        </div>
        <table>
            <tr><th>Code</th><th>Name</th><th>Role</th><th>Shift</th><th>Hours</th><th>Attendance Pattern</th></tr>
            <!-- UNASSIGNED EMPLOYEES -->
            <tr class="compact-row unassigned"><td class="employee-code">10090574</td><td>Muhammad Saqib</td><td class="designation">Technical Support Engineer</td><td class="shift-name">UNASSIGNED</td><td>No shift assigned</td><td class="attendance-info">12 days, avg 12:42 ⭐AFTERNOON</td></tr>
            <tr class="compact-row unassigned"><td class="employee-code">10090663</td><td>Muhammad Butt</td><td class="designation">Recovery Officer</td><td class="shift-name">UNASSIGNED</td><td>No shift assigned</td><td class="attendance-info">5 days, avg 06:37 ⭐EARLY</td></tr>
        </table>
    </div>

    <div class="department-section completion-medium">
        <div class="dept-header">
            <h3 class="dept-title">🏢 LHE-SAFECITY-NEX (60.0% Complete)</h3>
            <div class="dept-stats">5 employees • 3 assigned, 2 unassigned • 3 SYS shifts • SYS-AFTERNOON most common</div>
        </div>
        <table>
            <tr><th>Code</th><th>Name</th><th>Role</th><th>Shift</th><th>Hours</th><th>Attendance Pattern</th></tr>
            <!-- UNASSIGNED EMPLOYEES -->
            <tr class="compact-row unassigned"><td class="employee-code">10090580</td><td>Syed Bokhari</td><td class="designation">Technical Support Engineer</td><td class="shift-name">UNASSIGNED</td><td>No shift assigned</td><td class="attendance-info">12 days, avg 16:11 ⭐LATE</td></tr>
            <tr class="compact-row unassigned"><td class="employee-code">1070573</td><td>Salman Farooqi</td><td class="designation">(No designation)</td><td class="shift-name">UNASSIGNED</td><td>No shift assigned</td><td class="attendance-info">11 days, avg 12:30 ⭐AFTERNOON</td></tr>
        </table>
    </div>

    <!-- CRITICAL UNASSIGNED CASES -->
    <div class="department-section completion-low">
        <div class="dept-header">
            <h3 class="dept-title">🚨 CRITICAL UNASSIGNED EMPLOYEES</h3>
            <div class="dept-stats">6 employees across various departments requiring immediate attention</div>
        </div>
        <table>
            <tr><th>Code</th><th>Name</th><th>Department</th><th>Role</th><th>Attendance Pattern</th><th>Recommended Shift</th></tr>
            <tr class="compact-row unassigned"><td class="employee-code">10089893</td><td>Faisal Muzammil</td><td>Tech</td><td class="designation">General Manager Technical</td><td class="attendance-info">10 days, avg 12:46</td><td>⭐SYS-AFTERNOON</td></tr>
            <tr class="compact-row unassigned"><td class="employee-code">10090040</td><td>Ateeq Rehman</td><td>LHE-Field-Team</td><td class="designation">Field Executive</td><td class="attendance-info">9 days, avg 07:26</td><td>⭐SYS-EARLY</td></tr>
            <tr class="compact-row unassigned"><td class="employee-code">10090208</td><td>Shahid Rasheed</td><td>LHE-Store</td><td class="designation">Store Officer</td><td class="attendance-info">8 days, avg 06:38</td><td>⭐SYS-EARLY</td></tr>
            <tr class="compact-row unassigned"><td class="employee-code">10090707</td><td>Munzaleen Butt</td><td>NOC</td><td class="designation">Office Boy</td><td class="attendance-info">7 days, avg 12:40</td><td>⭐SYS-AFTERNOON</td></tr>
            <tr class="compact-row unassigned"><td class="employee-code">10090398</td><td>Aftab Ahmed</td><td>LHE-Others</td><td class="designation">Genset Maintenance</td><td class="attendance-info">4 days, avg 07:07</td><td>⭐SYS-EARLY</td></tr>
            <tr class="compact-row unassigned"><td class="employee-code">ADMIN001</td><td>Administrator User</td><td>ADMIN-SYS</td><td class="designation">System Administrator</td><td class="attendance-info">No data</td><td>⭐SYS-STANDARD</td></tr>
        </table>
    </div>

    <div class="summary-section">
        <h2>📋 Shift Distribution Summary</h2>
        <div class="summary-grid">
            <div class="summary-card">
                <div class="summary-number">127</div>
                <div class="summary-label">SYS Shifts (Various)</div>
            </div>
            <div class="summary-card">
                <div class="summary-number">70</div>
                <div class="summary-label">PSCA Shifts</div>
            </div>
            <div class="summary-card">
                <div class="summary-number">32</div>
                <div class="summary-label">TLNX Shifts</div>
            </div>
            <div class="summary-card">
                <div class="summary-number">63</div>
                <div class="summary-label">Nexlinx Shifts</div>
            </div>
            <div class="summary-card">
                <div class="summary-number">20</div>
                <div class="summary-label">UNASSIGNED</div>
            </div>
        </div>
    </div>

    <div style="margin-top: 30px; padding: 15px; background: #f8fafc; border-radius: 6px; text-align: center;">
        <p style="margin: 0; color: #6b7280; font-size: 11px;">
            <strong>Generated:</strong> July 26, 2025 | 
            <strong>System:</strong> Nexlinx Smart EMS | 
            <strong>Status:</strong> 292/312 employees assigned (93.6%)
        </p>
    </div>
</body>
</html>`;

  const textContent = `
COMPREHENSIVE DEPARTMENT-WISE SHIFT REPORT
All Employees with Assigned Shifts
July 26, 2025

OVERALL SYSTEM STATUS:
- Total Active Employees: 312
- Employees with Shifts: 292
- Unassigned Employees: 20
- Completion Rate: 93.6%
- Total Departments: 31
- 100% Complete Departments: 23

100% COMPLETE DEPARTMENTS:

LHE-SAFECITY (71 employees - 100% Complete):
- Most common shift: PSCA-Morning
- 1 SYS, 70 PSCA, 2 TLNX shifts
- All employees have proper shift assignments

LHE-OFC (27 employees - 100% Complete):
- Most common shift: TLNX-Morning
- 27 TLNX shifts
- All employees have proper shift assignments

PSH (20 employees - 100% Complete):
- Most common shift: SYS-STANDARD
- 20 SYS shifts
- All employees have proper shift assignments

[Additional 20 departments with 100% completion]

DEPARTMENTS WITH REMAINING ASSIGNMENTS:

FSD (27 employees - 74.1% Complete):
- 20/27 employees assigned
- 7 UNASSIGNED employees requiring shifts:
  * Kashif Maqsood (avg 07:09) - Recommend SYS-EARLY
  * Muhammad Afzal (avg 07:23) - Recommend SYS-EARLY
  * Sohaib Razzaq (avg 06:40) - Recommend SYS-EARLY
  * Shehryar Shakir (avg 12:37) - Recommend SYS-AFTERNOON
  * Hafiz Shoaib (avg 07:12) - Recommend SYS-EARLY
  * Shayan Ali (avg 06:17) - Recommend SYS-EARLY
  * Sheroz Shaukat (avg 05:50) - Recommend SYS-EARLY

PSCA-CONTRACTED (21 employees - 85.7% Complete):
- 18/21 employees assigned
- 3 UNASSIGNED employees requiring shifts:
  * Abdul Majeed (avg 16:53) - Recommend SYS-LATE
  * Muhammad Waqas (avg 06:57) - Recommend SYS-EARLY
  * Muhammad Rizwan (avg 16:11) - Recommend SYS-LATE

LHE-SUPPORT (13 employees - 84.6% Complete):
- 11/13 employees assigned
- 2 UNASSIGNED employees requiring shifts:
  * Muhammad Saqib (avg 12:42) - Recommend SYS-AFTERNOON
  * Muhammad Butt (avg 06:37) - Recommend SYS-EARLY

LHE-SAFECITY-NEX (5 employees - 60.0% Complete):
- 3/5 employees assigned
- 2 UNASSIGNED employees requiring shifts:
  * Syed Bokhari (avg 16:11) - Recommend SYS-LATE
  * Salman Farooqi (avg 12:30) - Recommend SYS-AFTERNOON

CRITICAL INDIVIDUAL CASES (6 employees):
- Faisal Muzammil (Tech) - Recommend SYS-AFTERNOON
- Ateeq Rehman (LHE-Field-Team) - Recommend SYS-EARLY
- Shahid Rasheed (LHE-Store) - Recommend SYS-EARLY
- Munzaleen Butt (NOC) - Recommend SYS-AFTERNOON
- Aftab Ahmed (LHE-Others) - Recommend SYS-EARLY
- Administrator User (ADMIN-SYS) - Recommend SYS-STANDARD

SHIFT DISTRIBUTION:
- SYS Shifts (Various): 127 employees
- PSCA Shifts: 70 employees
- TLNX Shifts: 32 employees
- Nexlinx Shifts: 63 employees
- UNASSIGNED: 20 employees

NEXT ACTIONS:
1. Assign remaining 20 employees based on attendance patterns
2. Complete 100% shift assignment coverage system-wide
3. Eliminate hardcoded 9:30 AM fallback calculations
4. Validate attendance calculations for all departments

Generated: July 26, 2025 | System: Nexlinx Smart EMS | Status: 292/312 employees assigned (93.6%)
`;

  try {
    const info = await transporter.sendMail({
      from: '"Nexlinx Smart EMS" <fstream@emailserver.nexlinx.net.pk>',
      to: recipientEmail,
      subject: "📊 Department-Wise Shift Assignment Report - Complete System Overview",
      html: htmlContent,
      text: textContent
    });
    
    console.log("✅ Department-wise shift report sent successfully:", info.messageId);
    return true;
  } catch (error) {
    console.error("❌ Failed to send department report:", error);
    return false;
  }
}

// Execute if run directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  const recipientEmail = process.argv[2];
  if (!recipientEmail) {
    console.error("Please provide recipient email address");
    console.log("Usage: tsx server/send-department-shift-report.ts recipient@example.com");
    process.exit(1);
  }
  
  sendDepartmentShiftReport(recipientEmail)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { sendDepartmentShiftReport };