/**
 * Enhanced Location Collection API Routes
 * Manage field staff vs office staff location intervals
 */

import { Router } from 'express';
import { enhancedLocationCollectionService } from '../services/enhancedLocationCollectionService';
import { departmentFieldService } from '../services/departmentFieldService';

const router = Router();

/**
 * GET /api/admin/enhanced-location-stats
 * Get enhanced location collection statistics
 */
router.get('/enhanced-location-stats', async (req, res) => {
  try {
    const stats = await enhancedLocationCollectionService.getCollectionStatistics();
    const status = enhancedLocationCollectionService.getStatus();
    
    res.json({
      success: true,
      statistics: stats,
      serviceStatus: status,
      optimizationMessage: `Field staff (3min): ${stats.fieldStaff3Min}, Office staff (5min): ${stats.officeStaff5Min}, Hybrid (4min): ${stats.hybridStaff4Min}`
    });
  } catch (error) {
    console.error('[API] Error getting enhanced location stats:', error);
    res.status(500).json({ error: 'Failed to get location statistics' });
  }
});

/**
 * POST /api/admin/start-enhanced-collection
 * Start enhanced location collection service
 */
router.post('/start-enhanced-collection', async (req, res) => {
  try {
    await enhancedLocationCollectionService.startEnhancedCollection();
    res.json({
      success: true,
      message: 'Enhanced location collection started with optimized intervals'
    });
  } catch (error) {
    console.error('[API] Error starting enhanced collection:', error);
    res.status(500).json({ error: 'Failed to start enhanced collection' });
  }
});

/**
 * POST /api/admin/stop-enhanced-collection
 * Stop enhanced location collection service
 */
router.post('/stop-enhanced-collection', async (req, res) => {
  try {
    await enhancedLocationCollectionService.stopEnhancedCollection();
    res.json({
      success: true,
      message: 'Enhanced location collection stopped'
    });
  } catch (error) {
    console.error('[API] Error stopping enhanced collection:', error);
    res.status(500).json({ error: 'Failed to stop enhanced collection' });
  }
});

/**
 * POST /api/admin/update-employee-collection
 * Update individual employee collection interval
 */
router.post('/update-employee-collection', async (req, res) => {
  try {
    const { employeeCode } = req.body;
    
    if (!employeeCode) {
      return res.status(400).json({ error: 'Employee code required' });
    }
    
    await enhancedLocationCollectionService.updateEmployeeCollectionInterval(employeeCode);
    
    res.json({
      success: true,
      message: `Updated location collection interval for ${employeeCode}`
    });
  } catch (error) {
    console.error('[API] Error updating employee collection:', error);
    res.status(500).json({ error: 'Failed to update employee collection' });
  }
});

/**
 * GET /api/admin/location-optimization-summary
 * Get summary of location collection optimization
 */
router.get('/location-optimization-summary', async (req, res) => {
  try {
    const stats = await enhancedLocationCollectionService.getCollectionStatistics();
    const empTypeStats = await departmentFieldService.getEmployeeTypeStatistics();
    
    const summary = {
      totalEmployees: stats.totalEmployees,
      distribution: {
        fieldStaff: {
          count: stats.fieldStaff3Min,
          interval: '3 minutes',
          dailyRequests: stats.fieldStaff3Min * 480, // 8 hours * 60 minutes / 3 minutes
          priority: 'high'
        },
        hybridStaff: {
          count: stats.hybridStaff4Min,
          interval: '4 minutes', 
          dailyRequests: stats.hybridStaff4Min * 360, // 8 hours * 60 minutes / 4 minutes
          priority: 'medium'
        },
        officeStaff: {
          count: stats.officeStaff5Min,
          interval: '5 minutes',
          dailyRequests: stats.officeStaff5Min * 288, // 8 hours * 60 minutes / 5 minutes
          priority: 'standard'
        }
      },
      optimization: {
        dailyRequestsSaved: stats.costSavings.monthlySavings / 30,
        monthlyRequestsSaved: stats.costSavings.monthlySavings,
        optimizationRate: `${stats.costSavings.optimizationRate.toFixed(1)}%`,
        fieldStaffRatio: `${Math.round((stats.fieldStaff3Min / stats.totalEmployees) * 100)}%`
      },
      departmentBreakdown: empTypeStats.byType
    };
    
    res.json(summary);
  } catch (error) {
    console.error('[API] Error getting optimization summary:', error);
    res.status(500).json({ error: 'Failed to get optimization summary' });
  }
});

export { router as enhancedLocationCollectionRoutes };