import { Request, Response } from "express";
import { performanceOverviewService } from "../services/performanceOverviewService";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

export async function getPerformanceOverview(req: Request, res: Response) {
  try {
    const { startDate, endDate, department, period } = req.query;
    
    let start: Date;
    let end: Date;
    
    // Handle period shortcuts
    if (period === 'last_month') {
      const lastMonth = subMonths(new Date(), 1);
      start = startOfMonth(lastMonth);
      end = endOfMonth(lastMonth);
    } else if (period === 'current_month') {
      start = startOfMonth(new Date());
      end = endOfMonth(new Date());
    } else if (period === 'last_3_months') {
      const threeMonthsAgo = subMonths(new Date(), 3);
      start = startOfMonth(threeMonthsAgo);
      end = endOfMonth(new Date());
    } else if (startDate && endDate) {
      start = new Date(startDate as string);
      end = new Date(endDate as string);
    } else {
      // Default to current month
      start = startOfMonth(new Date());
      end = endOfMonth(new Date());
    }
    
    const metrics = await performanceOverviewService.generatePerformanceOverview(
      start,
      end,
      department as string
    );
    
    const summary = await performanceOverviewService.getPerformanceSummary(metrics);
    
    res.json({
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      summary,
      employees: metrics,
    });
  } catch (error) {
    console.error("[API] Error generating performance overview:", error);
    res.status(500).json({ message: "Failed to generate performance overview" });
  }
}

export async function exportPerformanceOverviewCSV(req: Request, res: Response) {
  try {
    const { startDate, endDate, department, period } = req.query;
    
    let start: Date;
    let end: Date;
    
    // Handle period shortcuts
    if (period === 'last_month') {
      const lastMonth = subMonths(new Date(), 1);
      start = startOfMonth(lastMonth);
      end = endOfMonth(lastMonth);
    } else if (period === 'current_month') {
      start = startOfMonth(new Date());
      end = endOfMonth(new Date());
    } else if (period === 'last_3_months') {
      const threeMonthsAgo = subMonths(new Date(), 3);
      start = startOfMonth(threeMonthsAgo);
      end = endOfMonth(new Date());
    } else if (startDate && endDate) {
      start = new Date(startDate as string);
      end = new Date(endDate as string);
    } else {
      // Default to current month
      start = startOfMonth(new Date());
      end = endOfMonth(new Date());
    }
    
    const metrics = await performanceOverviewService.generatePerformanceOverview(
      start,
      end,
      department as string
    );
    
    // Convert to CSV format
    const csvHeaders = [
      'Employee Code',
      'Employee Name',
      'Department',
      'Position',
      'Total Working Days',
      'Present Days',
      'Absent Days',
      'Late Days',
      'Half Days',
      'Total Hours Worked',
      'Average Hours/Day',
      'Overtime Hours',
      'Undertime Hours',
      'Late Frequency %',
      'Absent Frequency %',
      'Consistency Score',
      'Total Late Minutes',
      'Estimated Deductions',
      'Performance Category',
      'Risk Level',
      'Flags'
    ];
    
    const csvRows = metrics.map(m => [
      m.employeeCode,
      m.employeeName,
      m.department,
      m.position || '',
      m.totalWorkingDays,
      m.presentDays,
      m.absentDays,
      m.lateDays,
      m.halfDays,
      m.totalHoursWorked,
      m.averageHoursPerDay,
      m.overtimeHours,
      m.undertimeHours,
      m.lateFrequency,
      m.absentFrequency,
      m.consistencyScore,
      m.totalLateMinutes,
      m.estimatedDeductions,
      m.performanceCategory,
      m.riskLevel,
      m.flags.join('; ')
    ]);
    
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="performance-overview.csv"');
    res.send(csvContent);
  } catch (error) {
    console.error("[API] Error exporting performance overview:", error);
    res.status(500).json({ message: "Failed to export performance overview" });
  }
}