import { db } from './db.js';
import { sql } from 'drizzle-orm';
import nodemailer from 'nodemailer';

interface DailyAttendance {
  employee_code: string;
  employee_name: string;
  work_date: string;
  checkin_count: number;
  checkout_count: number;
  first_punch: string | null;
  last_punch: string | null;
  calculated_hours: number;
  attendance_status: string;
  comments: string;
}

interface EmployeeSummary {
  employee_code: string;
  employee_name: string;
  total_hours: number;
  working_days: number;
  missed_punch_days: number;
  complete_days: number;
  incomplete_days: number;
  comments: string[];
}

export async function generateAccurateHoursReport(month?: number, year?: number) {
  console.log('🔍 [AccurateReport] Starting comprehensive hours calculation from raw attendance data');
  
  // Default to July 2025 if not specified
  const reportMonth = month || 7;
  const reportYear = year || 2025;
  
  const startDate = `${reportYear}-${String(reportMonth).padStart(2, '0')}-01`;
  const endDate = new Date(reportYear, reportMonth, 0); // Last day of month
  const endDateStr = `${reportYear}-${String(reportMonth).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
  
  console.log(`📅 [AccurateReport] Analyzing period: ${startDate} to ${endDateStr}`);

  try {
    // Step 1: Calculate daily attendance for all biometric employees
    const dailyAttendanceQuery = await db.execute(sql`
      WITH biometric_employees AS (
        -- Get all employees who have biometric attendance (exclude non-biometric exemptions)
        SELECT DISTINCT 
          er.employee_code as employee_code,
          COALESCE(er.first_name || ' ' || er.last_name, er.employee_code) as employee_name
        FROM employee_records er
        WHERE er.employee_code LIKE '10%'  -- Only actual employee codes
          AND er.is_active = true
          AND er.employee_code NOT IN (
            SELECT employee_code 
            FROM biometric_exemptions 
            WHERE is_active = true
          )
      ),
      daily_punches AS (
        SELECT 
          ar.employee_code,
          DATE(ar.date) as work_date,
          
          -- Collect all actual punch times
          ARRAY_AGG(
            CASE 
              WHEN ar.check_in IS NOT NULL THEN ar.check_in::timestamp
              WHEN ar.check_out IS NOT NULL THEN ar.check_out::timestamp
            END
            ORDER BY 
              CASE WHEN ar.check_in IS NOT NULL THEN ar.check_in ELSE ar.check_out END
          ) FILTER (WHERE ar.check_in IS NOT NULL OR ar.check_out IS NOT NULL) as punch_times,
          
          COUNT(CASE WHEN ar.check_in IS NOT NULL THEN 1 END) as checkin_count,
          COUNT(CASE WHEN ar.check_out IS NOT NULL THEN 1 END) as checkout_count,
          COUNT(*) as total_records,
          
          -- First and last actual punches (not empty records)
          MIN(CASE WHEN ar.check_in IS NOT NULL THEN ar.check_in WHEN ar.check_out IS NOT NULL THEN ar.check_out END) as first_punch,
          MAX(CASE WHEN ar.check_in IS NOT NULL THEN ar.check_in WHEN ar.check_out IS NOT NULL THEN ar.check_out END) as last_punch,
          
          -- Check if we have meaningful punch data
          COUNT(CASE WHEN ar.check_in IS NOT NULL OR ar.check_out IS NOT NULL THEN 1 END) as actual_punch_count
          
        FROM attendance_records ar
        WHERE DATE(ar.date) >= ${startDate}::date 
          AND DATE(ar.date) <= ${endDateStr}::date
          AND ar.employee_code LIKE '10%'  -- Only actual employee codes
        GROUP BY ar.employee_code, DATE(ar.date)
      ),
      daily_calculations AS (
        SELECT 
          be.employee_code,
          be.employee_name,
          dp.work_date,
          COALESCE(dp.checkin_count, 0) as checkin_count,
          COALESCE(dp.checkout_count, 0) as checkout_count,
          dp.first_punch,
          dp.last_punch,
          COALESCE(dp.actual_punch_count, 0) as actual_punch_count,
          
          -- Calculate working hours using CORRECT business rules
          CASE 
            -- Complete day: Has both check-in and check-out with different times
            WHEN dp.checkin_count > 0 AND dp.checkout_count > 0 
                 AND dp.first_punch IS NOT NULL AND dp.last_punch IS NOT NULL 
                 AND dp.first_punch != dp.last_punch THEN
              -- Calculate actual hours worked minus 1 hour break, minimum 6 hours credit
              GREATEST(
                EXTRACT(EPOCH FROM (dp.last_punch - dp.first_punch)) / 3600.0 - 1.0,  -- Subtract 1 hour break
                6.0  -- Minimum 6 hours for any complete day
              )
            
            -- Punch-in only (no punch-out): Present till end of day, capped at 7.5 hours
            WHEN dp.checkin_count > 0 AND dp.checkout_count = 0 THEN
              7.5  -- Punch-in means present till punch-out, capped at 7.5 hrs
            
            -- Punch-out only (no punch-in): Assume full day worked, credit 7.5 hours
            WHEN dp.checkin_count = 0 AND dp.checkout_count > 0 THEN
              7.5  -- Full day credit for punch-out record
            
            -- Present but no clear punch data: Has attendance records but no actual punches
            WHEN dp.total_records > 0 THEN
              7.5  -- Full day credit for presence
            
            -- Completely absent: No records at all
            ELSE 0.0
          END as calculated_hours,
          
          -- Determine attendance status
          CASE 
            WHEN dp.total_records IS NULL OR dp.total_records = 0 THEN 'absent'
            WHEN dp.checkin_count > 0 AND dp.checkout_count > 0 AND dp.first_punch != dp.last_punch THEN 'complete'
            WHEN dp.actual_punch_count > 0 THEN 'incomplete_punch'
            WHEN dp.total_records > 0 THEN 'present_no_data'
            ELSE 'absent'
          END as attendance_status,
          
          -- Generate comments explaining the calculation
          CASE 
            WHEN dp.checkin_count > 0 AND dp.checkout_count > 0 AND dp.first_punch != dp.last_punch THEN
              'Complete day: ' || ROUND(EXTRACT(EPOCH FROM (dp.last_punch - dp.first_punch)) / 3600.0 - 1.0, 2) || ' hours worked'
            WHEN dp.checkin_count > 0 AND dp.checkout_count = 0 THEN
              'Punch-in only: Present till end of day, capped at 7.5 hours'
            WHEN dp.checkin_count = 0 AND dp.checkout_count > 0 THEN
              'Punch-out only: Full day credit (7.5 hours)'
            WHEN dp.actual_punch_count > 0 THEN
              'Incomplete punch data: Full day credit (7.5 hours)'
            WHEN dp.total_records > 0 THEN
              'Present without punch data: Full day credit (7.5 hours)'
            ELSE 'Absent: 0 hours'
          END as comments
          
        FROM biometric_employees be
        LEFT JOIN daily_punches dp ON be.employee_code = dp.employee_code
        WHERE dp.work_date IS NOT NULL  -- Only include days with some attendance data
      )
      SELECT 
        employee_code,
        employee_name,
        work_date::text,
        checkin_count,
        checkout_count,
        TO_CHAR(first_punch, 'HH24:MI') as first_punch,
        TO_CHAR(last_punch, 'HH24:MI') as last_punch,
        ROUND(calculated_hours::numeric, 2) as calculated_hours,
        attendance_status,
        comments
      FROM daily_calculations
      ORDER BY employee_code, work_date
    `);

    console.log(`📊 [AccurateReport] Found ${dailyAttendanceQuery.rows.length} daily attendance records`);

    // Step 2: Aggregate monthly summaries for each employee
    const employeeSummaries = new Map<string, EmployeeSummary>();
    
    for (const daily of dailyAttendanceQuery.rows as unknown as DailyAttendance[]) {
      const key = daily.employee_code;
      
      if (!employeeSummaries.has(key)) {
        employeeSummaries.set(key, {
          employee_code: daily.employee_code,
          employee_name: daily.employee_name,
          total_hours: 0,
          working_days: 0,
          missed_punch_days: 0,
          complete_days: 0,
          incomplete_days: 0,
          comments: []
        });
      }
      
      const summary = employeeSummaries.get(key)!;
      summary.total_hours += daily.calculated_hours;
      summary.working_days++;
      
      if (daily.attendance_status === 'complete') {
        summary.complete_days++;
      } else if (daily.attendance_status === 'incomplete_punch' || daily.attendance_status === 'present_no_data') {
        summary.incomplete_days++;
        summary.comments.push(`${daily.work_date}: ${daily.comments}`);
      }
    }

    // Step 3: Categorize employees based on performance
    const employeeList = Array.from(employeeSummaries.values());
    const minHourlyThreshold = 160; // Minimum hours for the month
    
    // Calculate average daily hours for threshold (6 days/week * 7 hours = 42 hours/week)
    const averageExpectedHours = employeeList.length > 0 
      ? employeeList.reduce((sum, emp) => sum + Math.max(emp.working_days * 7, 0), 0) / employeeList.length
      : 160;

    const topPerformers = employeeList
      .filter(emp => emp.total_hours > Math.max(minHourlyThreshold, emp.working_days * 7))
      .sort((a, b) => (b.total_hours - (b.working_days * 7)) - (a.total_hours - (a.working_days * 7)))
      .slice(0, 3);

    const minHourBreaches = employeeList
      .filter(emp => emp.total_hours < minHourlyThreshold)
      .sort((a, b) => a.total_hours - b.total_hours);

    const regularEmployees = employeeList
      .filter(emp => emp.total_hours >= minHourlyThreshold && 
                     emp.total_hours <= Math.max(minHourlyThreshold, emp.working_days * 7));

    console.log(`📈 [AccurateReport] Employee distribution:`);
    console.log(`   • ${topPerformers.length} top performers`);
    console.log(`   • ${regularEmployees.length} regular employees`);
    console.log(`   • ${minHourBreaches.length} minimum hour breaches`);

    // Step 4: Generate comprehensive HTML report
    const reportHtml = generateHtmlReport({
      month: reportMonth,
      year: reportYear,
      totalEmployees: employeeList.length,
      topPerformers,
      regularEmployees,
      minHourBreaches,
      dailyData: dailyAttendanceQuery.rows as unknown as DailyAttendance[]
    });

    // Step 5: Send email report
    await sendEmailReport(reportHtml, `Accurate Hours Report - ${getMonthName(reportMonth)} ${reportYear}`);

    console.log('✅ [AccurateReport] Accurate hours report generated and sent successfully');
    
    return {
      success: true,
      totalEmployees: employeeList.length,
      topPerformers: topPerformers.length,
      regularEmployees: regularEmployees.length,
      minHourBreaches: minHourBreaches.length,
      reportPeriod: `${getMonthName(reportMonth)} ${reportYear}`
    };

  } catch (error) {
    console.error('❌ [AccurateReport] Error generating report:', error);
    throw error;
  }
}

function generateHtmlReport(data: {
  month: number;
  year: number;
  totalEmployees: number;
  topPerformers: EmployeeSummary[];
  regularEmployees: EmployeeSummary[];
  minHourBreaches: EmployeeSummary[];
  dailyData: DailyAttendance[];
}) {
  const monthName = getMonthName(data.month);
  
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Accurate Employee Hours Report - ${monthName} ${data.year}</title>
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            margin: 0; 
            padding: 20px; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #fff;
        }
        .container { 
            max-width: 1200px; 
            margin: 0 auto; 
            background: #1a1a2e; 
            border-radius: 15px; 
            padding: 30px; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }
        .header { 
            text-align: center; 
            margin-bottom: 30px; 
            border-bottom: 2px solid #4a4a6a;
            padding-bottom: 20px;
        }
        .header h1 { 
            color: #9c88ff; 
            margin: 0; 
            font-size: 2.5em;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
        }
        .header p { 
            color: #b8b8d1; 
            margin: 10px 0 0 0; 
            font-size: 1.2em;
        }
        .summary { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
            gap: 20px; 
            margin-bottom: 30px;
        }
        .summary-card { 
            background: linear-gradient(135deg, #2d2d5f 0%, #3a3a6b 100%); 
            padding: 20px; 
            border-radius: 10px; 
            text-align: center;
            border: 1px solid #4a4a6a;
        }
        .summary-card h3 { 
            color: #9c88ff; 
            margin: 0 0 10px 0; 
            font-size: 1.1em;
        }
        .summary-card .number { 
            font-size: 2em; 
            font-weight: bold; 
            color: #fff;
        }
        .section { 
            margin-bottom: 30px; 
            background: #16213e; 
            padding: 25px; 
            border-radius: 10px;
            border: 1px solid #4a4a6a;
        }
        .section h2 { 
            color: #9c88ff; 
            margin: 0 0 20px 0; 
            font-size: 1.8em;
            border-bottom: 2px solid #4a4a6a;
            padding-bottom: 10px;
        }
        table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 15px;
            background: #1a1a2e;
        }
        th { 
            background: linear-gradient(135deg, #9c88ff 0%, #764ba2 100%); 
            color: white; 
            padding: 12px; 
            text-align: left; 
            font-weight: bold;
            border: 1px solid #4a4a6a;
        }
        td { 
            padding: 10px 12px; 
            border: 1px solid #4a4a6a; 
            color: #e0e0e0;
        }
        tr:nth-child(even) { 
            background: #252545; 
        }
        tr:hover { 
            background: #2d2d5f; 
        }
        .top-performer { 
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%) !important; 
            color: white !important; 
            font-weight: bold;
        }
        .breach { 
            background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%) !important; 
            color: white !important; 
            font-weight: bold;
        }
        .comments { 
            font-size: 0.9em; 
            color: #b8b8d1; 
            max-width: 300px;
            word-wrap: break-word;
        }
        .footer { 
            margin-top: 30px; 
            text-align: center; 
            color: #b8b8d1; 
            font-size: 0.9em;
            border-top: 2px solid #4a4a6a;
            padding-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Accurate Employee Hours Report</h1>
            <p>${monthName} ${data.year} | Based on Raw Attendance Data Analysis</p>
        </div>

        <div class="summary">
            <div class="summary-card">
                <h3>Total Employees</h3>
                <div class="number">${data.totalEmployees}</div>
            </div>
            <div class="summary-card">
                <h3>Top Performers</h3>
                <div class="number">${data.topPerformers.length}</div>
            </div>
            <div class="summary-card">
                <h3>Regular Performance</h3>
                <div class="number">${data.regularEmployees.length}</div>
            </div>
            <div class="summary-card">
                <h3>Min Hour Breaches</h3>
                <div class="number">${data.minHourBreaches.length}</div>
            </div>
        </div>

        <div class="section">
            <h2>🏆 Top 3 Performers (Extra Hours)</h2>
            <table>
                <thead>
                    <tr>
                        <th>Employee Code</th>
                        <th>Employee Name</th>
                        <th>Total Hours</th>
                        <th>Working Days</th>
                        <th>Extra Hours</th>
                        <th>Complete Days</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.topPerformers.map(emp => `
                        <tr class="top-performer">
                            <td>${emp.employee_code}</td>
                            <td>${emp.employee_name}</td>
                            <td>${emp.total_hours.toFixed(2)}</td>
                            <td>${emp.working_days}</td>
                            <td>+${(emp.total_hours - (emp.working_days * 7)).toFixed(2)}</td>
                            <td>${emp.complete_days}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="section">
            <h2>⚠️ Minimum Hour Breaches (Below 160 Hours)</h2>
            <table>
                <thead>
                    <tr>
                        <th>Employee Code</th>
                        <th>Employee Name</th>
                        <th>Total Hours</th>
                        <th>Working Days</th>
                        <th>Shortage</th>
                        <th>Missed Punches</th>
                        <th>Comments</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.minHourBreaches.map(emp => `
                        <tr class="breach">
                            <td>${emp.employee_code}</td>
                            <td>${emp.employee_name}</td>
                            <td>${emp.total_hours.toFixed(2)}</td>
                            <td>${emp.working_days}</td>
                            <td>-${(160 - emp.total_hours).toFixed(2)}</td>
                            <td>${emp.missed_punch_days}</td>
                            <td class="comments">${emp.comments.slice(0, 3).join('; ')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="section">
            <h2>👥 Regular Employees (Meeting Requirements)</h2>
            <table>
                <thead>
                    <tr>
                        <th>Employee Code</th>
                        <th>Employee Name</th>
                        <th>Total Hours</th>
                        <th>Working Days</th>
                        <th>Complete Days</th>
                        <th>Incomplete Days</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.regularEmployees.slice(0, 50).map(emp => `
                        <tr>
                            <td>${emp.employee_code}</td>
                            <td>${emp.employee_name}</td>
                            <td>${emp.total_hours.toFixed(2)}</td>
                            <td>${emp.working_days}</td>
                            <td>${emp.complete_days}</td>
                            <td>${emp.incomplete_days}</td>
                        </tr>
                    `).join('')}
                    ${data.regularEmployees.length > 50 ? `
                        <tr><td colspan="6" style="text-align: center; color: #b8b8d1; font-style: italic;">
                            ... and ${data.regularEmployees.length - 50} more employees meeting requirements
                        </td></tr>
                    ` : ''}
                </tbody>
            </table>
        </div>

        <div class="footer">
            <p><strong>Business Rules Applied:</strong></p>
            <p>• 8 hours/day with 1 hour break = 7 net hours minimum</p>
            <p>• Punch-in only: Present till end of day, capped at 7.5 hours</p>
            <p>• Monthly minimum: 160 hours (triggers salary deduction below this level)</p>
            <p>• Complete days: Both check-in and check-out with actual time difference</p>
            <p><em>Generated on ${new Date().toLocaleString()} | Nexlinx EMS Accurate Reporting System</em></p>
        </div>
    </div>
</body>
</html>
  `;
}

async function sendEmailReport(htmlContent: string, subject: string) {
  const transporter = nodemailer.createTransport({
    host: 'emailserver.nexlinx.net.pk',
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER || 'reports@nexlinx.net.pk',
      pass: process.env.SMTP_PASSWORD || 'your-smtp-password'
    }
  });

  const mailOptions = {
    from: '"Nexlinx EMS Reports" <reports@nexlinx.net.pk>',
    to: 'naeemhaq1@gmail.com',
    subject: subject,
    html: htmlContent
  };

  await transporter.sendMail(mailOptions);
  console.log('📧 [AccurateReport] Email sent successfully');
}

function getMonthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1] || 'Unknown';
}