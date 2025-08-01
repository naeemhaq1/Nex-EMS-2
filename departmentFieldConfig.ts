/**
 * Department Field Configuration
 * Manages department-based field designation and employee type classification
 */

export interface DepartmentFieldConfig {
  id: string;
  departmentName: string;
  isFieldDepartment: boolean;
  defaultEmpType: 'Drivers' | 'Field Staff' | 'Desk Job' | 'Hybrid';
  locationInterval: number; // in seconds: 180 for field, 300 for office
  description: string;
  employeeCount: number;
  lastUpdated: Date;
}

export interface EmployeeTypeConfig {
  type: 'Drivers' | 'Field Staff' | 'Desk Job' | 'Hybrid';
  locationInterval: number; // in seconds
  description: string;
  priority: 'high' | 'standard' | 'low';
  trackingReason: string;
}

// Employee type configurations with location intervals
export const employeeTypeConfigs: Record<string, EmployeeTypeConfig> = {
  'Drivers': {
    type: 'Drivers',
    locationInterval: 180, // 3 minutes - highest priority for mobile drivers
    description: 'Vehicle operators requiring real-time location tracking',
    priority: 'high',
    trackingReason: 'Vehicle route optimization and safety monitoring'
  },
  'Field Staff': {
    type: 'Field Staff',
    locationInterval: 180, // 3 minutes - high priority for field operations
    description: 'Field technicians, OFC staff, and on-site workers',
    priority: 'high',
    trackingReason: 'Field operation coordination and safety compliance'
  },
  'Hybrid': {
    type: 'Hybrid',
    locationInterval: 240, // 4 minutes - medium priority for mixed work
    description: 'Employees who spend more time out of office than average',
    priority: 'standard',
    trackingReason: 'Mixed location tracking for flexible work patterns'
  },
  'Desk Job': {
    type: 'Desk Job',
    locationInterval: 300, // 5 minutes - standard for office workers
    description: 'Office-based employees with minimal field work',
    priority: 'low',
    trackingReason: 'Basic location tracking for attendance verification'
  }
};

// Predefined field departments based on your data
export const knownFieldDepartments = [
  'LHE OFC',
  'LHE-OFC', 
  'FSD OFC',
  'FSD-OFC',
  'LHE-Safecity',
  'LHE-Safecity-Drivers',
  'Safe city',
  'Safecity',
  'Field Operations',
  'Technical Services',
  'Installation Team',
  'Maintenance Team'
];

// Department patterns for auto-detection
export const fieldDepartmentPatterns = [
  /.*ofc.*/i,
  /.*field.*/i,
  /.*safecity.*/i,
  /.*safe.*city.*/i,
  /.*driver.*/i,
  /.*technician.*/i,
  /.*installation.*/i,
  /.*maintenance.*/i,
  /.*technical.*/i
];

/**
 * Auto-detect if department should be classified as field department
 */
export function isFieldDepartmentByName(departmentName: string): boolean {
  if (!departmentName) return false;
  
  // Check known field departments
  if (knownFieldDepartments.some(dept => 
    departmentName.toLowerCase().includes(dept.toLowerCase())
  )) {
    return true;
  }
  
  // Check patterns
  return fieldDepartmentPatterns.some(pattern => pattern.test(departmentName));
}

/**
 * Get recommended employee type based on department and position
 */
export function getRecommendedEmpType(department: string, position: string): 'Drivers' | 'Field Staff' | 'Desk Job' | 'Hybrid' {
  const deptLower = (department || '').toLowerCase();
  const posLower = (position || '').toLowerCase();
  
  // Drivers
  if (deptLower.includes('driver') || posLower.includes('driver')) {
    return 'Drivers';
  }
  
  // Field Staff
  if (deptLower.includes('ofc') || 
      deptLower.includes('safecity') || 
      deptLower.includes('field') ||
      posLower.includes('technician') ||
      posLower.includes('ofc') ||
      posLower.includes('field')) {
    return 'Field Staff';
  }
  
  // Hybrid (supervisor, coordinator, mobile roles)
  if (posLower.includes('supervisor') ||
      posLower.includes('coordinator') ||
      posLower.includes('mobile') ||
      posLower.includes('site')) {
    return 'Hybrid';
  }
  
  // Default to desk job
  return 'Desk Job';
}