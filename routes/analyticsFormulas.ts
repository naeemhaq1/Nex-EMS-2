/**
 * Analytics Formulas API Routes
 * 
 * Provides API endpoints for accessing centralized analytics formulas and calculations
 */

import { Request, Response } from "express";
import { centralAnalyticsFormulas } from "../services/centralAnalyticsFormulas";
import { getCurrentPakistanDate } from "../utils/timezone";

/**
 * GET /api/analytics/tee-metrics
 * Get TEE (Total Expected Employees) metrics with AA1-AA7 and MA1-MA7 calculations
 */
export async function getTEEMetrics(req: Request, res: Response) {
  try {
    const metrics = await centralAnalyticsFormulas.calculateTEEMetrics();
    
    res.json({
      success: true,
      data: metrics,
      explanation: {
        aa_series: "AA1-AA7: Average unique punch-ins per weekday over 30 days",
        ma_series: "MA1-MA7: Maximum unique punch-ins per weekday over 30 days",
        usage: "TEE for any date uses MA value for that specific day of week"
      }
    });
  } catch (error) {
    console.error('[Analytics API] TEE metrics error:', error);
    res.status(500).json({
      success: false,
      error: "Failed to calculate TEE metrics"
    });
  }
}

/**
 * GET /api/analytics/absentees/:date?
 * Calculate absentees for specific date using TEE formula
 */
export async function calculateAbsentees(req: Request, res: Response) {
  try {
    const { date } = req.params;
    const { actualPunchIns } = req.query;
    
    const targetDate = date ? new Date(date) : new Date();
    const punchIns = actualPunchIns ? parseInt(actualPunchIns as string) : 156; // Default from current data
    
    const result = await centralAnalyticsFormulas.calculateAbsentees(targetDate, punchIns);
    
    res.json({
      success: true,
      data: result,
      explanation: "Absentees = TEE (Maximum expected for day of week) - Actual unique punch-ins"
    });
  } catch (error) {
    console.error('[Analytics API] Absentees calculation error:', error);
    res.status(500).json({
      success: false,
      error: "Failed to calculate absentees"
    });
  }
}

/**
 * GET /api/analytics/attendance-rate
 * Calculate attendance rate with formula explanation
 */
export async function getAttendanceRate(req: Request, res: Response) {
  try {
    const { present, total } = req.query;
    
    const presentEmployees = present ? parseInt(present as string) : 156;
    const totalExpected = total ? parseInt(total as string) : 312;
    
    const result = centralAnalyticsFormulas.calculateAttendanceRate(presentEmployees, totalExpected);
    
    res.json({
      success: true,
      data: result,
      explanation: "Attendance Rate = (Present Employees / Total Expected) * 100"
    });
  } catch (error) {
    console.error('[Analytics API] Attendance rate error:', error);
    res.status(500).json({
      success: false,
      error: "Failed to calculate attendance rate"
    });
  }
}

/**
 * GET /api/analytics/late-arrivals/:date?
 * Calculate late arrivals with grace period analysis
 */
export async function getLateArrivals(req: Request, res: Response) {
  try {
    const { date } = req.params;
    const targetDate = date ? new Date(date) : new Date();
    
    const result = await centralAnalyticsFormulas.calculateLateArrivals(targetDate);
    
    res.json({
      success: true,
      data: result,
      explanation: `Late arrivals are calculated as check-ins after 09:30 AM (30-minute grace period)`
    });
  } catch (error) {
    console.error('[Analytics API] Late arrivals error:', error);
    res.status(500).json({
      success: false,
      error: "Failed to calculate late arrivals"
    });
  }
}

/**
 * GET /api/analytics/missed-punchouts/:date?
 * Calculate missed punch-outs (check-in without check-out)
 */
export async function getMissedPunchouts(req: Request, res: Response) {
  try {
    const { date } = req.params;
    const targetDate = date ? new Date(date) : new Date();
    
    const result = await centralAnalyticsFormulas.calculateMissedPunchouts(targetDate);
    
    res.json({
      success: true,
      data: result,
      explanation: "Missed punch-outs = Employees with check-in but no check-out"
    });
  } catch (error) {
    console.error('[Analytics API] Missed punchouts error:', error);
    res.status(500).json({
      success: false,
      error: "Failed to calculate missed punchouts"
    });
  }
}

/**
 * GET /api/analytics/working-hours/:date?
 * Calculate working hours, overtime, and shift completion metrics
 */
export async function getWorkingHours(req: Request, res: Response) {
  try {
    const { date } = req.params;
    const targetDate = date ? new Date(date) : new Date();
    
    const result = await centralAnalyticsFormulas.calculateWorkingHours(targetDate);
    
    res.json({
      success: true,
      data: result,
      explanation: "Working hours calculated from check-in to check-out time difference"
    });
  } catch (error) {
    console.error('[Analytics API] Working hours error:', error);
    res.status(500).json({
      success: false,
      error: "Failed to calculate working hours"
    });
  }
}

/**
 * GET /api/analytics/department-breakdown/:date?
 * Get department-wise attendance analytics
 */
export async function getDepartmentBreakdown(req: Request, res: Response) {
  try {
    const { date } = req.params;
    const targetDate = date ? new Date(date) : new Date();
    
    const result = await centralAnalyticsFormulas.calculateDepartmentAnalytics(targetDate);
    
    res.json({
      success: true,
      data: result,
      explanation: "Department-wise attendance rates calculated as (Present/Total) * 100"
    });
  } catch (error) {
    console.error('[Analytics API] Department breakdown error:', error);
    res.status(500).json({
      success: false,
      error: "Failed to calculate department breakdown"
    });
  }
}

/**
 * GET /api/analytics/comprehensive/:date?
 * Get comprehensive analytics report with all formulas
 */
export async function getComprehensiveAnalytics(req: Request, res: Response) {
  try {
    const { date } = req.params;
    const targetDate = date ? new Date(date) : new Date();
    
    const result = await centralAnalyticsFormulas.getComprehensiveAnalytics(targetDate);
    
    res.json({
      success: true,
      data: result,
      explanation: "Comprehensive analytics report combining all standardized formulas"
    });
  } catch (error) {
    console.error('[Analytics API] Comprehensive analytics error:', error);
    res.status(500).json({
      success: false,
      error: "Failed to generate comprehensive analytics"
    });
  }
}

/**
 * GET /api/analytics/formulas
 * Get list of all available formulas with descriptions
 */
export async function getFormulasList(req: Request, res: Response) {
  try {
    const formulas = [
      {
        name: "TEE (Total Expected Employees)",
        formula: "AA1-AA7: Average unique punch-ins per weekday over 30 days, MA1-MA7: Maximum unique punch-ins per weekday over 30 days",
        endpoint: "/api/analytics/tee-metrics",
        usage: "Determines expected attendance based on historical patterns"
      },
      {
        name: "Absentees Calculation",
        formula: "Absentees = MA (for target day of week) - Actual unique punch-ins",
        endpoint: "/api/analytics/absentees/:date",
        usage: "Calculate absent employees using TEE-based expectations"
      },
      {
        name: "Attendance Rate",
        formula: "Attendance Rate = (Present Employees / Total Expected) * 100",
        endpoint: "/api/analytics/attendance-rate",
        usage: "Standard attendance percentage calculation"
      },
      {
        name: "Late Arrivals",
        formula: "Late Arrivals = COUNT(check-in > 09:30 AM with 30min grace period)",
        endpoint: "/api/analytics/late-arrivals/:date",
        usage: "Count employees arriving after grace period"
      },
      {
        name: "Missed Punch-outs",
        formula: "Missed Punch-outs = COUNT(check-in exists AND check-out is NULL)",
        endpoint: "/api/analytics/missed-punchouts/:date",
        usage: "Employees who checked in but didn't check out"
      },
      {
        name: "Working Hours Analysis",
        formula: "Average Hours = Total Hours / Completed Shifts, Overtime = SUM(hours > 8)",
        endpoint: "/api/analytics/working-hours/:date",
        usage: "Calculate working hours, overtime, and shift metrics"
      }
    ];
    
    res.json({
      success: true,
      data: {
        formulas,
        totalFormulas: formulas.length,
        lastUpdated: new Date(),
        note: "All formulas use Pakistan timezone (UTC+5) for date calculations"
      }
    });
  } catch (error) {
    console.error('[Analytics API] Formulas list error:', error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve formulas list"
    });
  }
}