import { Router, Request, Response } from 'express';
import { sql } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Basic analytics endpoint
router.get('/dashboard-stats', requireAuth, async (req: Request, res: Response) => {
  try {
    const stats = await sql`
      SELECT 
        COUNT(*) as total_employees,
        COUNT(CASE WHEN "isActive" = true THEN 1 END) as active_employees
      FROM employees
    `;

    res.json({ 
      success: true, 
      data: stats[0] || { total_employees: 0, active_employees: 0 }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ success: false, error: 'Analytics fetch failed' });
  }
});

export default router;