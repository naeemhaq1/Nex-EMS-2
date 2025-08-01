/**
 * Department Field Management API Routes
 */

import { Router } from 'express';
import { departmentFieldService } from '../services/departmentFieldService';

const router = Router();

/**
 * GET /api/admin/department-field-configs
 * Get all department field configurations
 */
router.get('/department-field-configs', async (req, res) => {
  try {
    const configs = await departmentFieldService.getDepartmentFieldConfigs();
    res.json(configs);
  } catch (error) {
    console.error('[API] Error getting department field configs:', error);
    res.status(500).json({ error: 'Failed to get department configurations' });
  }
});

/**
 * POST /api/admin/update-department-field
 * Update department field designation
 */
router.post('/update-department-field', async (req, res) => {
  try {
    const { departmentName, isFieldDepartment, defaultEmpType } = req.body;

    if (!departmentName || typeof isFieldDepartment !== 'boolean') {
      return res.status(400).json({ error: 'Department name and field designation required' });
    }

    const success = await departmentFieldService.updateDepartmentFieldDesignation(
      departmentName,
      isFieldDepartment,
      defaultEmpType
    );

    if (success) {
      res.json({ 
        success: true, 
        message: `Updated ${departmentName} to ${isFieldDepartment ? 'field' : 'office'} department` 
      });
    } else {
      res.status(500).json({ error: 'Failed to update department' });
    }
  } catch (error) {
    console.error('[API] Error updating department field designation:', error);
    res.status(500).json({ error: 'Failed to update department' });
  }
});

/**
 * POST /api/admin/auto-classify-departments
 * Auto-classify all departments based on patterns
 */
router.post('/auto-classify-departments', async (req, res) => {
  try {
    const result = await departmentFieldService.autoClassifyDepartments();
    res.json({
      success: true,
      message: `Auto-classified ${result.classified} departments`,
      details: {
        fieldDepartments: result.fieldDepartments,
        officeDepartments: result.officeDepartments,
        classified: result.classified
      }
    });
  } catch (error) {
    console.error('[API] Error auto-classifying departments:', error);
    res.status(500).json({ error: 'Failed to auto-classify departments' });
  }
});

/**
 * GET /api/admin/employee-type-stats
 * Get employee type statistics
 */
router.get('/employee-type-stats', async (req, res) => {
  try {
    const stats = await departmentFieldService.getEmployeeTypeStatistics();
    res.json(stats);
  } catch (error) {
    console.error('[API] Error getting employee type statistics:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

/**
 * POST /api/admin/update-employee-type
 * Update individual employee type
 */
router.post('/update-employee-type', async (req, res) => {
  try {
    const { employeeCode, empType } = req.body;

    if (!employeeCode || !empType) {
      return res.status(400).json({ error: 'Employee code and type required' });
    }

    const validTypes = ['Drivers', 'Field Staff', 'Desk Job', 'Hybrid'];
    if (!validTypes.includes(empType)) {
      return res.status(400).json({ error: 'Invalid employee type' });
    }

    const success = await departmentFieldService.updateEmployeeType(employeeCode, empType);

    if (success) {
      res.json({ 
        success: true, 
        message: `Updated ${employeeCode} to ${empType}` 
      });
    } else {
      res.status(500).json({ error: 'Failed to update employee type' });
    }
  } catch (error) {
    console.error('[API] Error updating employee type:', error);
    res.status(500).json({ error: 'Failed to update employee type' });
  }
});

/**
 * POST /api/admin/bulk-update-by-pattern
 * Bulk update employees by department pattern
 */
router.post('/bulk-update-by-pattern', async (req, res) => {
  try {
    const { pattern, empType, isFieldDepartment } = req.body;

    if (!pattern || !empType || typeof isFieldDepartment !== 'boolean') {
      return res.status(400).json({ error: 'Pattern, employee type, and field designation required' });
    }

    const validTypes = ['Drivers', 'Field Staff', 'Desk Job', 'Hybrid'];
    if (!validTypes.includes(empType)) {
      return res.status(400).json({ error: 'Invalid employee type' });
    }

    const updatedCount = await departmentFieldService.bulkUpdateByPattern(
      pattern,
      empType,
      isFieldDepartment
    );

    res.json({
      success: true,
      message: `Updated ${updatedCount} employees matching pattern "${pattern}"`,
      updatedCount
    });
  } catch (error) {
    console.error('[API] Error bulk updating by pattern:', error);
    res.status(500).json({ error: 'Failed to bulk update' });
  }
});

export { router as departmentFieldRoutes };