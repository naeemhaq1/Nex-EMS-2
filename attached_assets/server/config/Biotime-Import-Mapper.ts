/**
 * BioTime Import Mapper Configuration
 * Maps CSV columns to database fields for June 2025 attendance data import
 * Created: 2025-07-20
 * Purpose: Standardized mapping for BioTime CSV imports with staging table processing
 */

export interface BiotimeCSVRow {
  id: string;                    // Unique BioTime ID (primary identifier)
  emp_code: string;              // Employee code
  first_name: string;            // Employee first name
  last_name: string;             // Employee last name
  department: string;            // Department name
  position: string;              // Job position/designation
  punch_time: string;            // Punch timestamp
  punch_state: string;           // Punch state code (0=In, 1=Out, 5=Overtime)
  punch_state_display: string;   // Human readable punch state
  verify_type: string;           // Verification type code
  verify_type_display: string;   // Human readable verification type
  work_code: string;             // Work code
  gps_location: string;          // GPS coordinates (if available)
  area_alias: string;            // Area/location alias
  terminal_sn: string;           // Terminal serial number
  temperature: string;           // Temperature reading
  terminal_alias: string;        // Terminal alias/name
  upload_time: string;           // Upload timestamp
}

export interface StagingTableRow {
  biotime_id: number;            // Unique BioTime ID
  employee_code: string;         // Employee code
  employee_first_name: string;   // First name
  employee_last_name: string;    // Last name
  department_name: string;       // Department
  position_title: string;        // Position/designation
  punch_timestamp: Date;         // Parsed punch time
  punch_state_code: number;      // Punch state (0=In, 1=Out, 5=Overtime)
  punch_state_label: string;     // Display label
  verification_type: number;     // Verification type code
  verification_label: string;    // Verification display
  work_code: string;             // Work code
  gps_coordinates: string;       // GPS location
  location_area: string;         // Area alias
  device_serial: string;         // Terminal serial
  device_alias: string;          // Terminal alias
  temperature_reading: number;   // Temperature
  upload_timestamp: Date;        // Upload time
  processed: boolean;            // Processing status
  processing_errors: string;     // Error messages
  created_at: Date;              // Import timestamp
}

export interface AttendanceRecordMapping {
  employee_code: string;         // Maps to: employee_code
  check_in: Date | null;         // Maps from: punch_timestamp (when punch_state_code = 0)
  check_out: Date | null;        // Maps from: punch_timestamp (when punch_state_code = 1)
  date: Date;                    // Maps from: DATE(punch_timestamp)
  status: string;                // Derived from punch patterns
  hours_worked: number;          // Calculated from check_in/check_out
  location: string;              // Maps from: location_area || device_alias
  punch_source: string;          // Always 'biotime_csv_import'
  device_info: string;           // Maps from: device_serial + device_alias
  verification_method: string;   // Maps from: verification_label
  notes: string;                 // Combined processing info
}

/**
 * CSV Column Mapping Configuration
 */
export const BIOTIME_CSV_MAPPING = {
  // Primary identifier
  id: 'biotime_id',
  
  // Employee information
  emp_code: 'employee_code',
  first_name: 'employee_first_name',
  last_name: 'employee_last_name',
  department: 'department_name',
  position: 'position_title',
  
  // Punch data
  punch_time: 'punch_timestamp',
  punch_state: 'punch_state_code',
  punch_state_display: 'punch_state_label',
  
  // Verification
  verify_type: 'verification_type',
  verify_type_display: 'verification_label',
  
  // Location and device
  gps_location: 'gps_coordinates',
  area_alias: 'location_area',
  terminal_sn: 'device_serial',
  terminal_alias: 'device_alias',
  temperature: 'temperature_reading',
  
  // Metadata
  work_code: 'work_code',
  upload_time: 'upload_timestamp'
};

/**
 * Punch State Code Mapping
 */
export const PUNCH_STATE_MAPPING = {
  0: 'Check In',
  1: 'Check Out',
  5: 'Overtime Out',
  2: 'Break Start',
  3: 'Break End',
  4: 'Overtime In'
};

/**
 * Verification Type Mapping
 */
export const VERIFICATION_TYPE_MAPPING = {
  1: 'Fingerprint',
  4: 'Card',
  15: 'Face',
  2: 'Password',
  3: 'Palm',
  5: 'Iris'
};

/**
 * Data Processing Rules
 */
export const PROCESSING_RULES = {
  // Date parsing format (M/D/YYYY H:MM)
  dateFormat: 'M/d/yyyy H:mm',
  
  // Timezone handling (Pakistan Standard Time)
  timezone: 'Asia/Karachi',
  
  // Duplicate handling
  duplicateStrategy: 'skip', // skip, overwrite, error
  
  // Validation rules
  validation: {
    requireEmployeeCode: true,
    requireValidPunchTime: true,
    requireValidPunchState: true,
    allowEmptyGPS: true,
    allowEmptyTemperature: true
  },
  
  // Attendance record generation
  attendanceRules: {
    groupByEmployeeAndDate: true,
    calculateHoursWorked: true,
    detectOvertimePatterns: true,
    handleMultiplePunches: 'latest', // latest, first, all
    statusDetermination: 'automatic' // automatic, manual
  }
};

/**
 * Error Handling Configuration
 */
export const ERROR_HANDLING = {
  skipInvalidRows: true,
  maxErrorsBeforeAbort: 100,
  logAllErrors: true,
  createErrorReport: true
};

export default {
  BIOTIME_CSV_MAPPING,
  PUNCH_STATE_MAPPING,
  VERIFICATION_TYPE_MAPPING,
  PROCESSING_RULES,
  ERROR_HANDLING
};