import { Request, Response } from 'express';
import { storage } from '../storage';
import { z } from 'zod';
import { validateRequest } from '../middleware/validation';
import { auditService } from '../services/audit';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

const getEmployeeParamsSchema = z.object({
  id: z.string().transform((val) => parseInt(val, 10)),
});

const getEmployeesQuerySchema = z.object({
  page: z.string().optional().transform((val) => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform((val) => val ? parseInt(val, 10) : 10),
  search: z.string().optional(),
  department: z.string().optional(),
  isActive: z.string().optional().transform((val) => val ? val === 'true' : undefined),
});

const createEmployeeSchema = z.object({
  employeeCode: z.string().min(1, "Employee code is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  department: z.string().optional(),
  position: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  mobile: z.string().optional(),
  nationalId: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  isActive: z.boolean().default(true),
  joiningDate: z.string().optional(),
});

const updateEmployeeSchema = z.object({
  employeeCode: z.string().optional(),
  firstName: z.string().optional(),
  middleName: z.union([z.string(), z.literal(""), z.null()]).optional().transform(val => val === "" ? null : val),
  lastName: z.string().optional(),
  salutation: z.union([z.string(), z.literal(""), z.null()]).optional().transform(val => val === "" ? null : val),
  department: z.string().optional(),
  subDepartment: z.union([z.string(), z.literal(""), z.null()]).optional().transform(val => val === "" ? null : val),
  position: z.string().nullable().optional(),
  designation: z.union([z.string(), z.literal(""), z.null()]).optional().transform(val => val === "" ? null : val),
  email: z.union([z.string().email(), z.literal(""), z.null()]).optional().transform(val => val === "" ? null : val),
  phone: z.union([z.string(), z.literal(""), z.null()]).optional().transform(val => val === "" ? null : val),
  mobile: z.union([z.string(), z.literal(""), z.null()]).optional().transform(val => val === "" ? null : val),
  nationalId: z.union([z.string(), z.literal(""), z.null()]).optional().transform(val => val === "" ? null : val),
  address: z.union([z.string(), z.literal(""), z.null()]).optional().transform(val => val === "" ? null : val),
  vrn: z.union([z.string(), z.literal(""), z.null()]).optional().transform(val => val === "" ? null : val),
  workTeam: z.union([z.string(), z.literal(""), z.null()]).optional().transform(val => val === "" ? null : val),
  location: z.union([z.string(), z.literal(""), z.null()]).optional().transform(val => val === "" ? null : val),
  empType: z.union([z.string(), z.literal(""), z.null()]).optional().transform(val => val === "" ? null : val),
  nonBio: z.boolean().optional(),
  suspect: z.boolean().optional(),
  susreason: z.union([z.string(), z.literal(""), z.null()]).optional().transform(val => val === "" ? null : val),
  pop: z.union([z.string(), z.literal(""), z.null()]).optional().transform(val => val === "" ? null : val),
  stopPay: z.boolean().optional(),
  city: z.union([z.string(), z.literal(""), z.null()]).optional().transform(val => val === "" ? null : val),
  isActive: z.boolean().optional(),
});

export async function getEmployees(req: Request, res: Response) {
  try {
    const query = getEmployeesQuerySchema.parse(req.query);
    
    // Debug logging
    console.log('Parsed query params:', JSON.stringify(query, null, 2));
    
    // Get user from request (set by auth middleware)
    const user = (req as any).user;
    
    // Apply department-based access control
    const result = await storage.getEmployeesWithDepartmentAccess(query, user);
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
}

export async function getAllEmployees(req: Request, res: Response) {
  try {
    // Get user from request (set by auth middleware)
    const user = (req as any).user;
    
    // Apply department-based access control
    const employees = await storage.getAllEmployeesWithDepartmentAccess(user);
    res.json(employees);
  } catch (error) {
    console.error('Error fetching all employees:', error);
    res.status(500).json({ error: 'Failed to fetch all employees' });
  }
}

export async function getEmployee(req: Request, res: Response) {
  try {
    const { id } = getEmployeeParamsSchema.parse(req.params);
    const employee = await storage.getEmployee(id);
    
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    res.json(employee);
  } catch (error) {
    console.error('Error fetching employee:', error);
    res.status(500).json({ error: 'Failed to fetch employee' });
  }
}

export async function createEmployee(req: Request, res: Response) {
  try {
    const employeeData = createEmployeeSchema.parse(req.body);
    
    // Check if employee code already exists
    const existingEmployee = await storage.getEmployeeByCode(employeeData.employeeCode);
    if (existingEmployee) {
      return res.status(400).json({ error: 'Employee code already exists' });
    }
    
    // Create the employee
    const newEmployee = await storage.createEmployee({
      employeeCode: employeeData.employeeCode,
      firstName: employeeData.firstName,
      lastName: employeeData.lastName,
      department: employeeData.department,
      position: employeeData.position,
      email: employeeData.email || null,
      phone: employeeData.mobile || null,
      nationalId: employeeData.nationalId || null,
      address: employeeData.address || null,
      city: employeeData.city || null,
      isActive: employeeData.isActive,
      joiningDate: employeeData.joiningDate ? new Date(employeeData.joiningDate) : new Date(),
    });
    
    // Log the create action
    const auditContext = auditService.getContextFromRequest(req);
    await auditService.logAction(
      auditContext,
      'employee',
      newEmployee.id.toString(),
      'create',
      { created: newEmployee }
    );
    
    res.status(201).json(newEmployee);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Error creating employee:', error);
    res.status(500).json({ error: 'Failed to create employee' });
  }
}

export async function updateEmployee(req: Request, res: Response) {
  try {
    const { id } = getEmployeeParamsSchema.parse(req.params);
    const updateData = updateEmployeeSchema.parse(req.body);
    
    const existingEmployee = await storage.getEmployee(id);
    if (!existingEmployee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    const updatedEmployee = await storage.updateEmployee(id, updateData);
    
    // Log the update action
    const auditContext = auditService.getContextFromRequest(req);
    await auditService.logAction(
      auditContext,
      'employee',
      id.toString(),
      'update',
      {
        before: existingEmployee,
        after: updatedEmployee,
        changes: updateData
      }
    );
    
    res.json(updatedEmployee);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error updating employee:', error.errors);
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`) 
      });
    }
    console.error('Error updating employee:', error);
    res.status(500).json({ error: 'Failed to update employee' });
  }
}



export async function getEmployeeAttendance(req: Request, res: Response) {
  try {
    const { id } = getEmployeeParamsSchema.parse(req.params);
    const query = z.object({
      page: z.string().optional().transform((val) => val ? parseInt(val, 10) : 1),
      limit: z.string().optional().transform((val) => val ? parseInt(val, 10) : 50),
      dateFrom: z.string().optional().transform((val) => val ? new Date(val) : undefined),
      dateTo: z.string().optional().transform((val) => val ? new Date(val) : undefined),
    }).parse(req.query);
    
    const result = await storage.getAttendanceRecords({
      employeeId: id,
      ...query,
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching employee attendance:', error);
    res.status(500).json({ error: 'Failed to fetch employee attendance' });
  }
}

export async function getEmployeeDepartments(req: Request, res: Response) {
  try {
    // Get only active employees to extract unique departments (exclude ex-employees)
    const result = await storage.getEmployees({ limit: 1000, isActive: true });
    const employees = result.employees || [];
    
    // Extract unique departments
    const departments = [...new Set(employees
      .map(emp => emp.department)
      .filter(dept => dept && dept.trim() !== '')
    )].sort();
    
    res.json(departments);
  } catch (error) {
    console.error('Error fetching employee departments:', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
}

export async function getEmployeeGroups(req: Request, res: Response) {
  try {
    // Get only active employees to extract unique groups (exclude ex-employees)
    const result = await storage.getEmployees({ limit: 1000, isActive: true });
    const employees = result.employees || [];
    
    // Extract unique groups (using department as groups)
    const groups = [...new Set(employees
      .map(emp => emp.department)
      .filter(dept => dept && dept.trim() !== '')
    )].sort();
    
    res.json(groups);
  } catch (error) {
    console.error('Error fetching employee groups:', error);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
}

export async function getEmployeeStatus(req: Request, res: Response) {
  try {
    // Get current attendance data for status calculation
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
    // Get all active employees
    const result = await storage.getEmployees({ limit: 1000, isActive: true });
    const employees = result.employees || [];
    
    // Get today's attendance records
    const attendanceRecords = await storage.getAttendanceRecords({
      dateFrom: startOfToday,
      dateTo: endOfToday
    });
    
    // Create status map
    const statusMap = new Map();
    const records = attendanceRecords.records || [];
    
    // Calculate status for each employee
    employees.forEach(emp => {
      const empRecords = records.filter(r => r.employeeCode === emp.employeeCode);
      let status = 'absent';
      let hoursWorked = 0;
      
      if (empRecords.length > 0) {
        const hasCheckIn = empRecords.some(r => r.punchType === 'punch_in');
        const hasCheckOut = empRecords.some(r => r.punchType === 'punch_out');
        
        if (hasCheckIn) {
          status = 'present';
          
          // Check if late (simplified logic - after 9:30 AM)
          const firstCheckIn = empRecords
            .filter(r => r.punchType === 'punch_in')
            .sort((a, b) => new Date(a.punchTime).getTime() - new Date(b.punchTime).getTime())[0];
          
          if (firstCheckIn) {
            const checkInTime = new Date(firstCheckIn.punchTime);
            const lateThreshold = new Date(checkInTime);
            lateThreshold.setHours(9, 30, 0, 0);
            
            if (checkInTime > lateThreshold) {
              status = 'late';
            }
          }
          
          // Calculate hours worked (simplified)
          if (hasCheckOut) {
            const checkInTimes = empRecords.filter(r => r.punchType === 'punch_in').map(r => new Date(r.punchTime));
            const checkOutTimes = empRecords.filter(r => r.punchType === 'punch_out').map(r => new Date(r.punchTime));
            
            if (checkInTimes.length > 0 && checkOutTimes.length > 0) {
              const firstIn = Math.min(...checkInTimes.map(t => t.getTime()));
              const lastOut = Math.max(...checkOutTimes.map(t => t.getTime()));
              hoursWorked = Math.round((lastOut - firstIn) / (1000 * 60 * 60) * 10) / 10;
            }
          }
        }
      }
      
      statusMap.set(emp.employeeCode, {
        employeeCode: emp.employeeCode,
        status,
        hoursWorked: hoursWorked > 0 ? hoursWorked : undefined,
        lastPunch: empRecords.length > 0 ? empRecords[empRecords.length - 1].punchTime : null
      });
    });
    
    res.json(Array.from(statusMap.values()));
  } catch (error) {
    console.error('Error fetching employee status:', error);
    res.status(500).json({ error: 'Failed to fetch employee status' });
  }
}

// Create router and add routes
import express from 'express';
const router = express.Router();

router.get('/', getEmployees);
router.get('/all', getAllEmployees);
router.get('/departments', getEmployeeDepartments);
router.get('/groups', getEmployeeGroups);
router.get('/status', getEmployeeStatus);
router.get('/:id', getEmployee);
router.get('/:id/attendance', getEmployeeAttendance);
router.post('/', createEmployee);
router.put('/:id', updateEmployee);

export default router;