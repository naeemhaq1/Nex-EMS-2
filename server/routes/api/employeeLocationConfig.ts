import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { db } from '../../db';

const router = Router();

/**
 * Get location tracking configuration for authenticated employee
 */
router.get('/location/my-config', requireAuth, async (req, res) => {
  try {
    const session = req.session as any;
    const employeeId = session?.username;

    if (!employeeId) {
      return res.status(401).json({
        success: false,
        error: 'Employee ID not found in session'
      });
    }

    const result = await db.execute(`
      SELECT 
        emp_code,
        first_name,
        last_name,
        department,
        designation,
        COALESCE(location_tracking_enabled, false) as tracking_enabled,
        COALESCE(location_tracking_tier, 2) as tracking_tier,
        COALESCE(polling_interval_minutes, 10) as polling_interval_minutes,
        COALESCE(tracking_reason, 'Standard tracking') as tracking_reason
      FROM employee_records 
      WHERE emp_code = $1 AND is_active = true
    `, [employeeId]);

    const rows = (result as any).rows;
    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Employee record not found'
      });
    }

    const employee = rows[0];

    res.json({
      success: true,
      config: {
        employeeId: employee.emp_code,
        name: `${employee.first_name} ${employee.last_name}`,
        department: employee.department,
        designation: employee.designation,
        trackingEnabled: employee.tracking_enabled,
        pollingIntervalMinutes: employee.polling_interval_minutes,
        pollingIntervalMs: employee.polling_interval_minutes * 60 * 1000,
        tier: employee.tracking_tier,
        reason: employee.tracking_reason,
        tierDescription: getTierDescription(employee.tracking_tier, employee.polling_interval_minutes)
      }
    });

  } catch (error) {
    console.error('[LocationConfig] Error getting employee config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get location configuration'
    });
  }
});

/**
 * Get tier description based on tier and interval
 */
function getTierDescription(tier: number, intervalMinutes: number): string {
  if (tier === 1 && intervalMinutes <= 3) {
    return 'High Priority - OFC/PSCA Operations';
  } else if (tier === 2 && intervalMinutes <= 10) {
    return 'Standard - Regular Employee Tracking';
  } else if (tier === 3 && intervalMinutes >= 30) {
    return 'Low Priority - Minimal Tracking';
  } else if (tier === 0) {
    return 'Disabled - No Location Tracking';
  } else {
    return `Custom - ${intervalMinutes} minute intervals`;
  }
}

export default router;