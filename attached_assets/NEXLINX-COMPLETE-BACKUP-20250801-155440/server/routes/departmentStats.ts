import { Request, Response } from "express";
import { storage } from "../storage";

export async function getDepartmentEmployeeCounts(req: Request, res: Response) {
  try {
    const employees = await storage.getEmployees({ limit: 1000, isActive: true });
    
    // Count employees per department (unique by employee code)
    const departmentCounts: Record<string, number> = {};
    const departmentEmployees: Record<string, Set<string>> = {};
    
    employees.employees.forEach(emp => {
      const dept = emp.department || 'Unknown';
      if (!departmentEmployees[dept]) {
        departmentEmployees[dept] = new Set();
      }
      // Use Set to ensure unique employee codes per department
      departmentEmployees[dept].add(emp.employeeCode);
    });
    
    // Convert sets to counts
    Object.entries(departmentEmployees).forEach(([dept, empSet]) => {
      departmentCounts[dept] = empSet.size;
    });
    
    res.json(departmentCounts);
  } catch (error) {
    console.error('Error fetching department employee counts:', error);
    res.status(500).json({ error: 'Failed to fetch department employee counts' });
  }
}

export async function getDepartmentEmployees(req: Request, res: Response) {
  try {
    const { department } = req.params;
    
    if (!department) {
      return res.status(400).json({ error: 'Department is required' });
    }
    
    const employees = await storage.getEmployees({ 
      limit: 1000, 
      isActive: true,
      department: department
    });
    
    // Return employee details with essential info
    const employeeList = employees.employees.map(emp => ({
      employeeCode: emp.employeeCode,
      name: `${emp.firstName} ${emp.lastName}`,
      mobile: emp.mobile || '-',
      nationalId: emp.nationalId || '-',
      position: emp.position || '-'
    }));
    
    res.json({
      department,
      count: employeeList.length,
      employees: employeeList
    });
  } catch (error) {
    console.error('Error fetching department employees:', error);
    res.status(500).json({ error: 'Failed to fetch department employees' });
  }
}

export async function checkDepartmentGroupDuplicates(req: Request, res: Response) {
  try {
    const { departments } = req.body;
    
    if (!departments || !Array.isArray(departments)) {
      return res.status(400).json({ error: 'Departments array is required' });
    }
    
    // Get all employees from the selected departments
    const employees = await storage.getEmployees({ limit: 1000, isActive: true });
    
    // Track employee codes and their departments
    const employeeDepartments: Record<string, string[]> = {};
    const duplicates: Array<{
      employeeCode: string;
      name: string;
      departments: string[];
    }> = [];
    
    // Filter employees by selected departments and track duplicates
    employees.employees.forEach(emp => {
      if (departments.includes(emp.department)) {
        if (!employeeDepartments[emp.employeeCode]) {
          employeeDepartments[emp.employeeCode] = [];
        }
        employeeDepartments[emp.employeeCode].push(emp.department || 'Unknown');
      }
    });
    
    // Find duplicates (employees in multiple departments)
    Object.entries(employeeDepartments).forEach(([empCode, depts]) => {
      if (depts.length > 1) {
        const employee = employees.employees.find(e => e.employeeCode === empCode);
        if (employee) {
          duplicates.push({
            employeeCode: empCode,
            name: `${employee.firstName} ${employee.lastName}`,
            departments: [...new Set(depts)] // Unique departments
          });
        }
      }
    });
    
    // Count unique employees
    const uniqueEmployeeCodes = new Set(Object.keys(employeeDepartments));
    
    res.json({
      totalEmployees: uniqueEmployeeCodes.size,
      duplicateCount: duplicates.length,
      duplicates: duplicates
    });
  } catch (error) {
    console.error('Error checking department group duplicates:', error);
    res.status(500).json({ error: 'Failed to check for duplicates' });
  }
}