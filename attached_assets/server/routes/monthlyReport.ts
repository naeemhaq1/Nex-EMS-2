import { Request, Response } from "express";
import { attendanceReportService } from "../services/attendanceReportService";
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { format } from 'date-fns';

export async function getMonthlyReport(req: Request, res: Response) {
  try {
    const { year, month } = req.query;
    
    if (!year || !month) {
      return res.status(400).json({ error: "Year and month are required" });
    }

    const yearNum = parseInt(year as string);
    const monthNum = parseInt(month as string);

    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ error: "Invalid year or month" });
    }

    const report = await attendanceReportService.generateComprehensiveMonthlyReport(yearNum, monthNum);
    res.json(report);
  } catch (error) {
    console.error('Error generating monthly report:', error);
    res.status(500).json({ error: 'Failed to generate monthly report' });
  }
}

export async function exportMonthlyReportCSV(req: Request, res: Response) {
  try {
    const { year, month } = req.query;
    
    if (!year || !month) {
      return res.status(400).json({ error: "Year and month are required" });
    }

    const yearNum = parseInt(year as string);
    const monthNum = parseInt(month as string);

    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ error: "Invalid year or month" });
    }

    const report = await attendanceReportService.generateComprehensiveMonthlyReport(yearNum, monthNum);
    
    // Flatten the data for CSV export
    const csvData: any[] = [];
    
    for (const employee of report) {
      // Add summary row for employee
      csvData.push({
        'Employee Code': employee.employeeCode,
        'Employee Name': employee.employeeName,
        'Department': employee.department,
        'Position': employee.position || '',
        'Joining Date': employee.joiningDate || '',
        'Total Working Days': employee.totalWorkingDays,
        'Present Days': employee.presentDays,
        'Absent Days': employee.absentDays,
        'Half Days': employee.halfDays,
        'Total Hours Worked': employee.totalHoursWorked,
        'Expected Hours': employee.expectedHours,
        'Late Deductions (PKR)': employee.deductions.lateDeductions,
        'Absent Deductions (PKR)': employee.deductions.absentDeductions,
        'Half Day Deductions (PKR)': employee.deductions.halfDayDeductions,
        'Total Deductions (PKR)': employee.deductions.totalDeductions,
      });
      
      // Add daily attendance details
      for (const day of employee.dailyHours) {
        csvData.push({
          'Employee Code': employee.employeeCode,
          'Date': day.date,
          'Day': format(new Date(day.date), 'EEEE'),
          'Check In': day.checkIn || '',
          'Check Out': day.checkOut || '',
          'Hours Worked': day.hoursWorked,
          'Late Minutes': day.lateMinutes,
          'Early Out Minutes': day.earlyOutMinutes,
          'Status': day.status,
        });
      }
      
      // Add empty row for separation
      csvData.push({});
    }

    const csv = stringify(csvData, { header: true });
    const monthName = format(new Date(yearNum, monthNum - 1), 'MMMM yyyy');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="monthly_report_${monthName}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting monthly report:', error);
    res.status(500).json({ error: 'Failed to export monthly report' });
  }
}

export async function exportMonthlyReportPDF(req: Request, res: Response) {
  try {
    const { year, month } = req.query;
    
    if (!year || !month) {
      return res.status(400).json({ error: "Year and month are required" });
    }

    const yearNum = parseInt(year as string);
    const monthNum = parseInt(month as string);

    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ error: "Invalid year or month" });
    }

    const report = await attendanceReportService.generateComprehensiveMonthlyReport(yearNum, monthNum);
    const monthName = format(new Date(yearNum, monthNum - 1), 'MMMM yyyy');
    
    // Generate HTML for PDF
    let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { text-align: center; color: #333; }
        h2 { color: #555; margin-top: 30px; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; font-weight: bold; }
        .summary { background-color: #f9f9f9; }
        .weekend { background-color: #e8e8e8; }
        .absent { background-color: #ffcccc; }
        .half-day { background-color: #fff3cd; }
        .present { background-color: #d4edda; }
        .deductions { color: #d9534f; font-weight: bold; }
        .page-break { page-break-after: always; }
      </style>
    </head>
    <body>
      <h1>Monthly Attendance Report - ${monthName}</h1>
    `;
    
    let currentDepartment = '';
    
    for (const employee of report) {
      // Add department header if changed
      if (employee.department !== currentDepartment) {
        currentDepartment = employee.department;
        html += `<h2>Department: ${currentDepartment}</h2>`;
      }
      
      html += `
        <div class="employee-section">
          <h3>${employee.employeeName} (${employee.employeeCode})</h3>
          <p><strong>Position:</strong> ${employee.position || 'N/A'} | <strong>Joining Date:</strong> ${employee.joiningDate || 'N/A'}</p>
          
          <table>
            <tr class="summary">
              <th>Total Working Days</th>
              <th>Present</th>
              <th>Absent</th>
              <th>Half Days</th>
              <th>Total Hours</th>
              <th>Expected Hours</th>
            </tr>
            <tr class="summary">
              <td>${employee.totalWorkingDays}</td>
              <td>${employee.presentDays}</td>
              <td>${employee.absentDays}</td>
              <td>${employee.halfDays}</td>
              <td>${employee.totalHoursWorked}</td>
              <td>${employee.expectedHours}</td>
            </tr>
          </table>
          
          <table>
            <tr>
              <th>Date</th>
              <th>Day</th>
              <th>Check In</th>
              <th>Check Out</th>
              <th>Hours</th>
              <th>Late (min)</th>
              <th>Early Out (min)</th>
              <th>Status</th>
            </tr>
      `;
      
      // Add daily attendance rows
      for (const day of employee.dailyHours) {
        const dayName = format(new Date(day.date), 'EEE');
        const statusClass = day.status.replace('-', '-');
        html += `
          <tr class="${statusClass}">
            <td>${day.date}</td>
            <td>${dayName}</td>
            <td>${day.checkIn || '-'}</td>
            <td>${day.checkOut || '-'}</td>
            <td>${day.hoursWorked}</td>
            <td>${day.lateMinutes || '-'}</td>
            <td>${day.earlyOutMinutes || '-'}</td>
            <td>${day.status}</td>
          </tr>
        `;
      }
      
      html += `
          </table>
          
          <table>
            <tr>
              <th>Deduction Type</th>
              <th>Amount (PKR)</th>
            </tr>
            <tr>
              <td>Late Deductions</td>
              <td class="deductions">${employee.deductions.lateDeductions}</td>
            </tr>
            <tr>
              <td>Absent Deductions</td>
              <td class="deductions">${employee.deductions.absentDeductions}</td>
            </tr>
            <tr>
              <td>Half Day Deductions</td>
              <td class="deductions">${employee.deductions.halfDayDeductions}</td>
            </tr>
            <tr>
              <td><strong>Total Deductions</strong></td>
              <td class="deductions"><strong>${employee.deductions.totalDeductions}</strong></td>
            </tr>
          </table>
          <div class="page-break"></div>
        </div>
      `;
    }
    
    html += `
    </body>
    </html>
    `;
    
    // For now, return HTML (in production, you'd use a PDF library like puppeteer)
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Error generating PDF report:', error);
    res.status(500).json({ error: 'Failed to generate PDF report' });
  }
}