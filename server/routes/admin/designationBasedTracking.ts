import { Router } from 'express';
import { requireAdmin } from '../../middleware/auth';
import { db } from '../../db';

const router = Router();

/**
 * Get current designation-based tracking rules
 */
router.get('/tracking/designation-rules', requireAdmin, async (req, res) => {
  try {
    const rules = await db.execute(`
      SELECT * FROM designation_tracking_rules 
      WHERE active = true 
      ORDER BY tracking_tier DESC, designation_pattern
    `);

    res.json({
      success: true,
      rules: (rules as any).rows || []
    });

  } catch (error) {
    console.error('[DesignationTracking] Error getting rules:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Create or update designation tracking rule
 */
router.post('/tracking/designation-rules', requireAdmin, async (req, res) => {
  try {
    const {
      designationPattern,
      departmentPattern,
      trackingTier,
      pollingIntervalMinutes,
      trackingReason
    } = req.body;

    if (!designationPattern || trackingTier === undefined) {
      return res.status(400).json({
        success: false,
        error: 'designationPattern and trackingTier are required'
      });
    }

    await db.execute(`
      INSERT INTO designation_tracking_rules 
      (designation_pattern, department_pattern, tracking_tier, polling_interval_minutes, tracking_reason)
      VALUES ($1, $2, $3, $4, $5)
    `, [
      designationPattern,
      departmentPattern || null,
      trackingTier,
      pollingIntervalMinutes || 0,
      trackingReason || 'Admin configured'
    ]);

    res.json({
      success: true,
      message: 'Designation tracking rule created'
    });

  } catch (error) {
    console.error('[DesignationTracking] Error creating rule:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Apply designation rules to all employees
 */
router.post('/tracking/apply-rules', requireAdmin, async (req, res) => {
  try {
    // Get all active employees with their designations
    const employees = await db.execute(`
      SELECT emp_code, designation, department, first_name, last_name
      FROM employee_records 
      WHERE active = true
    `);

    const employeeRows = (employees as any).rows || [];
    let updatedCount = 0;

    for (const employee of employeeRows) {
      // Find matching rule for this employee
      const matchingRules = await db.execute(`
        SELECT * FROM designation_tracking_rules 
        WHERE active = true 
          AND (designation_pattern IS NULL OR $1 ILIKE designation_pattern)
          AND (department_pattern IS NULL OR $2 ILIKE department_pattern)
        ORDER BY 
          CASE 
            WHEN designation_pattern IS NOT NULL AND department_pattern IS NOT NULL THEN 1
            WHEN designation_pattern IS NOT NULL THEN 2  
            WHEN department_pattern IS NOT NULL THEN 3
            ELSE 4 
          END
        LIMIT 1
      `, [employee.designation, employee.department]);

      const rules = (matchingRules as any).rows;
      if (rules && rules.length > 0) {
        const rule = rules[0];
        
        // Update employee with matching rule
        await db.execute(`
          UPDATE employee_records SET
            location_tracking_enabled = $1,
            location_tracking_tier = $2,
            polling_interval_minutes = $3,
            tracking_reason = $4
          WHERE emp_code = $5
        `, [
          rule.tracking_tier > 0,
          rule.tracking_tier,
          rule.polling_interval_minutes,
          rule.tracking_reason,
          employee.emp_code
        ]);

        updatedCount++;
      }
    }

    res.json({
      success: true,
      message: `Applied tracking rules to ${updatedCount} employees`,
      updatedCount,
      totalEmployees: employeeRows.length
    });

  } catch (error) {
    console.error('[DesignationTracking] Error applying rules:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Get tracking overview and cost analysis
 */
router.get('/tracking/overview', requireAdmin, async (req, res) => {
  try {
    const overview = await db.execute(`
      SELECT 
        location_tracking_tier,
        polling_interval_minutes,
        COUNT(*) as employee_count,
        tracking_reason
      FROM employee_records 
      WHERE active = true
      GROUP BY location_tracking_tier, polling_interval_minutes, tracking_reason
      ORDER BY location_tracking_tier DESC
    `);

    const overviewRows = (overview as any).rows || [];
    
    // Calculate cost analysis
    let totalMonthlyUpdates = 0;
    let trackingEnabledCount = 0;

    const tierAnalysis = overviewRows.map(row => {
      const employeeCount = parseInt(row.employee_count);
      const intervalMinutes = parseInt(row.polling_interval_minutes);
      const tier = parseInt(row.location_tracking_tier);
      
      let monthlyUpdates = 0;
      if (tier > 0 && intervalMinutes > 0) {
        // Calculate monthly updates (8 hours/day, 22 working days)
        const updatesPerDay = (8 * 60) / intervalMinutes;
        monthlyUpdates = updatesPerDay * 22 * employeeCount;
        totalMonthlyUpdates += monthlyUpdates;
        trackingEnabledCount += employeeCount;
      }

      return {
        tier,
        intervalMinutes,
        employeeCount,
        monthlyUpdates: Math.round(monthlyUpdates),
        trackingReason: row.tracking_reason,
        estimatedCost: Math.round((monthlyUpdates / 1000) * 5 * 100) / 100
      };
    });

    const totalMonthlyCost = Math.round((totalMonthlyUpdates / 1000) * 5 * 100) / 100;

    // Get total employee count
    const totalResult = await db.execute(`
      SELECT COUNT(*) as total_employees FROM employee_records WHERE active = true
    `);
    const totalEmployees = parseInt(((totalResult as any).rows[0] || {}).total_employees || 0);

    res.json({
      success: true,
      overview: {
        totalEmployees,
        trackingEnabled: trackingEnabledCount,
        trackingDisabled: totalEmployees - trackingEnabledCount,
        totalMonthlyUpdates: Math.round(totalMonthlyUpdates),
        estimatedMonthlyCost: totalMonthlyCost,
        tierBreakdown: tierAnalysis
      }
    });

  } catch (error) {
    console.error('[DesignationTracking] Error getting overview:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Override individual employee tracking
 */
router.post('/tracking/employee/:empCode/override', requireAdmin, async (req, res) => {
  try {
    const { empCode } = req.params;
    const {
      trackingEnabled,
      pollingIntervalMinutes,
      trackingReason
    } = req.body;

    await db.execute(`
      UPDATE employee_records SET
        location_tracking_enabled = $1,
        polling_interval_minutes = $2,
        tracking_reason = $3,
        location_tracking_tier = CASE WHEN $1 = true THEN 
          CASE 
            WHEN $2 <= 5 THEN 1
            WHEN $2 <= 15 THEN 2  
            ELSE 3
          END
        ELSE 0 END
      WHERE emp_code = $4
    `, [
      trackingEnabled,
      pollingIntervalMinutes || 0,
      trackingReason || 'Admin override',
      empCode
    ]);

    res.json({
      success: true,
      message: `Updated tracking settings for employee ${empCode}`
    });

  } catch (error) {
    console.error('[DesignationTracking] Error overriding employee:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Get employees with their tracking status
 */
router.get('/tracking/employees', requireAdmin, async (req, res) => {
  try {
    const { tier, department, page = 1, limit = 50 } = req.query;
    
    let whereConditions = ['active = true'];
    let params = [];
    let paramIndex = 1;

    if (tier !== undefined) {
      whereConditions.push(`location_tracking_tier = $${paramIndex++}`);
      params.push(parseInt(tier as string));
    }

    if (department) {
      whereConditions.push(`department ILIKE $${paramIndex++}`);
      params.push(`%${department}%`);
    }

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    const employees = await db.execute(`
      SELECT 
        emp_code,
        first_name,
        last_name,
        designation,
        department,
        location_tracking_enabled,
        location_tracking_tier,
        polling_interval_minutes,
        tracking_reason
      FROM employee_records 
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY location_tracking_tier DESC, emp_code
      LIMIT ${limit} OFFSET ${offset}
    `, params);

    const countResult = await db.execute(`
      SELECT COUNT(*) as total 
      FROM employee_records 
      WHERE ${whereConditions.join(' AND ')}
    `, params);

    const totalCount = parseInt(((countResult as any).rows[0] || {}).total || 0);

    res.json({
      success: true,
      employees: (employees as any).rows || [],
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: totalCount,
        pages: Math.ceil(totalCount / parseInt(limit as string))
      }
    });

  } catch (error) {
    console.error('[DesignationTracking] Error getting employees:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;