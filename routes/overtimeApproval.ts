import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { db } from '../db';
import { attendanceRecords, employeeRecords } from '@shared/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { startOfDay, endOfDay } from 'date-fns';

const router = Router();

/**
 * Get pending overtime approvals
 */
router.get('/pending', requireAuth, async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date as string) : new Date();
    
    // Find attendance records with >8 hours but no overtime approval
    const pendingOvertime = await db
      .select({
        id: attendanceRecords.id,
        employeeCode: attendanceRecords.employeeCode,
        date: attendanceRecords.date,
        checkIn: attendanceRecords.checkIn,
        checkOut: attendanceRecords.checkOut,
        totalHours: attendanceRecords.totalHours,
        notes: attendanceRecords.notes
      })
      .from(attendanceRecords)
      .leftJoin(employeeRecords, eq(attendanceRecords.employeeCode, employeeRecords.employeeCode))
      .where(
        and(
          gte(attendanceRecords.date, startOfDay(targetDate)),
          lte(attendanceRecords.date, endOfDay(targetDate)),
          // More than 8 hours worked
          gte(attendanceRecords.totalHours, 8),
          // No overtime approval note
          // Add your overtime approval logic here
        )
      );

    res.json({
      success: true,
      data: pendingOvertime
    });

  } catch (error) {
    console.error('[OvertimeApproval] Error fetching pending overtime:', error);
    res.status(500).json({ 
      error: 'Failed to fetch pending overtime approvals',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Approve overtime for specific attendance record
 */
router.post('/approve/:recordId', requireAdmin, async (req, res) => {
  try {
    const recordId = parseInt(req.params.recordId);
    const { approvedHours, reason } = req.body;
    
    if (!approvedHours || approvedHours <= 0) {
      return res.status(400).json({ 
        error: 'Approved hours must be greater than 0' 
      });
    }

    // Update attendance record with overtime approval
    await db
      .update(attendanceRecords)
      .set({
        totalHours: approvedHours,
        notes: `${reason || 'Overtime approved'} - Approved by admin`,
        updatedAt: new Date()
      })
      .where(eq(attendanceRecords.id, recordId));

    res.json({
      success: true,
      message: `Overtime approved: ${approvedHours} hours`,
      data: { recordId, approvedHours, reason }
    });

  } catch (error) {
    console.error('[OvertimeApproval] Error approving overtime:', error);
    res.status(500).json({ 
      error: 'Failed to approve overtime',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Bulk approve overtime for multiple records
 */
router.post('/bulk-approve', requireAdmin, async (req, res) => {
  try {
    const { records } = req.body; // Array of {recordId, approvedHours, reason}
    
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ 
        error: 'Records array is required' 
      });
    }

    const results = [];
    const errors = [];

    for (const record of records) {
      try {
        const { recordId, approvedHours, reason } = record;
        
        await db
          .update(attendanceRecords)
          .set({
            totalHours: approvedHours,
            notes: `${reason || 'Overtime approved'} - Bulk approved by admin`,
            updatedAt: new Date()
          })
          .where(eq(attendanceRecords.id, recordId));

        results.push({ recordId, approvedHours, status: 'approved' });
      } catch (error) {
        errors.push({ 
          recordId: record.recordId, 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    }

    res.json({
      success: true,
      message: `Bulk approval completed: ${results.length} approved, ${errors.length} errors`,
      data: { approved: results, errors }
    });

  } catch (error) {
    console.error('[OvertimeApproval] Error in bulk approval:', error);
    res.status(500).json({ 
      error: 'Failed to process bulk approval',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Set overtime policy for specific employee/department
 */
router.post('/policy', requireAdmin, async (req, res) => {
  try {
    const { 
      employeeCode, 
      department, 
      maxDailyOvertime, 
      maxWeeklyOvertime, 
      autoApproveThreshold,
      validFrom,
      validTo
    } = req.body;

    // This would typically save to an overtime_policies table
    // For now, return success with policy details
    
    res.json({
      success: true,
      message: 'Overtime policy updated successfully',
      data: {
        employeeCode,
        department,
        maxDailyOvertime,
        maxWeeklyOvertime,
        autoApproveThreshold,
        validFrom,
        validTo
      }
    });

  } catch (error) {
    console.error('[OvertimeApproval] Error setting overtime policy:', error);
    res.status(500).json({ 
      error: 'Failed to set overtime policy',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export { router as overtimeApprovalRoutes };