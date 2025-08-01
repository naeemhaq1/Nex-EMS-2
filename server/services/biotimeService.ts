import axios from 'axios';
import https from 'https';
import { db } from '../db';
import { attendancePullExt, employeePullExt } from '@shared/schema';
import { sql } from 'drizzle-orm';
import { duplicatePreventionService } from './duplicatePreventionService';

interface BioTimeConfig {
  baseUrl: string;
  username: string;
  password: string;
  timeout: number;
}

interface PullResult {
  recordsPulled: number;
  success: boolean;
  error?: string;
}

export class BioTimeService {
  private config: BioTimeConfig;
  private authToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor() {
    this.config = {
      baseUrl: process.env.BIOTIME_API_URL || 'https://zkbiotime.nexlinx.net.pk/',
      username: process.env.BIOTIME_USERNAME || 'naeem',
      password: process.env.BIOTIME_PASSWORD || '',
      timeout: 30000
    };
  }

  async authenticate(): Promise<boolean> {
    try {
      console.log('[BioTimeService] Authenticating with BioTime API...');
      
      const response = await axios.post(
        `${this.config.baseUrl}jwt-api-token-auth/`,
        {
          username: this.config.username,
          password: this.config.password
        },
        {
          timeout: this.config.timeout,
          headers: {
            'Content-Type': 'application/json'
          },
          httpsAgent: new https.Agent({
            rejectUnauthorized: false
          })
        }
      );

      if (response.data && response.data.token) {
        this.authToken = response.data.token;
        this.tokenExpiry = new Date(Date.now() + (23 * 60 * 60 * 1000)); // 23 hours
        console.log('[BioTimeService] Authentication successful');
        return true;
      } else {
        console.error('[BioTimeService] Invalid authentication response');
        return false;
      }

    } catch (error) {
      console.error('[BioTimeService] Authentication failed:', error.message);
      return false;
    }
  }

  private async ensureAuthenticated(): Promise<boolean> {
    if (!this.authToken || !this.tokenExpiry || this.tokenExpiry < new Date()) {
      return await this.authenticate();
    }
    return true;
  }

  async pullAttendanceData(startTime: Date, endTime: Date): Promise<PullResult> {
    try {
      // Ensure parameters are Date objects
      const startDate = new Date(startTime);
      const endDate = new Date(endTime);
      
      console.log(`[BioTimeService] Starting dynamic pagination pull from ${startDate.toISOString()} to ${endDate.toISOString()}`);
      
      if (!await this.ensureAuthenticated()) {
        return {
          recordsPulled: 0,
          success: false,
          error: 'Authentication failed'
        };
      }

      // Format dates for BioTime API using Django-style filtering
      const startStr = startDate.toISOString();
      const endStr = endDate.toISOString();

      let allRecords = [];
      let currentPage = 1;
      let totalRecordsPulled = 0;
      let hasMoreData = true;
      const maxPageSize = 10000; // Maximum records per request

      console.log(`[BioTimeService] Starting dynamic pagination with max page size: ${maxPageSize}`);

      // Dynamic pagination loop - pull ALL available data
      while (hasMoreData) {
        console.log(`[BioTimeService] Fetching page ${currentPage}...`);
        
        const response = await axios.get(
          `${this.config.baseUrl}iclock/api/transactions/`,
          {
            params: {
              punch_time__gte: startStr,
              punch_time__lte: endStr,
              page_size: maxPageSize,
              page: currentPage
            },
            headers: {
              'Authorization': `JWT ${this.authToken}`,
              'Content-Type': 'application/json'
            },
            timeout: this.config.timeout,
            httpsAgent: new https.Agent({
              rejectUnauthorized: false
            })
          }
        );

        if (!response.data || !response.data.data) {
          console.log(`[BioTimeService] No data returned for page ${currentPage}`);
          break;
        }

        const pageRecords = response.data.data;
        const recordCount = pageRecords.length;
        console.log(`[BioTimeService] Page ${currentPage}: Retrieved ${recordCount} records`);
        
        if (recordCount === 0) {
          hasMoreData = false;
          break;
        }

        // Add records to collection
        allRecords.push(...pageRecords);
        totalRecordsPulled += recordCount;

        // Check if we got less than max page size (indicates last page)
        if (recordCount < maxPageSize) {
          hasMoreData = false;
          console.log(`[BioTimeService] Reached end of data - page ${currentPage} had ${recordCount} records (less than ${maxPageSize})`);
        } else {
          currentPage++;
          // Small delay between requests to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log(`[BioTimeService] Dynamic pagination complete: ${totalRecordsPulled} total records across ${currentPage} pages`);

      // Process all collected records using attendance_pull_ext staging table
      let recordsPulled = 0;
      
      for (const record of allRecords) {
        try {
          // Skip access control devices (devices with "lock" in terminal name)
          const terminal = record.terminal || '';
          if (terminal.toLowerCase().includes('lock')) {
            continue; // Skip access control device records
          }

          // Check if record already exists using biotime_id as primary duplicate prevention
          // biotime_id is unique per punch transaction and is the most reliable identifier
          const biotimeId = record.id?.toString();
          
          if (biotimeId) {
            const existingRecord = await db.execute(sql`
              SELECT id FROM attendance_pull_ext 
              WHERE biotime_id = ${biotimeId}
              LIMIT 1
            `);

            if (existingRecord.length > 0) {
              continue; // Skip duplicate - biotime_id already exists
            }
          } else {
            // Fallback for records without biotime_id - use timestamp + emp_code + punch_state
            const existingRecord = await db.execute(sql`
              SELECT id FROM attendance_pull_ext 
              WHERE (all_fields->>'punch_time') = ${record.punch_time}
              AND (all_fields->>'emp_code') = ${record.emp_code}
              AND (all_fields->>'punch_state') = ${record.punch_state}
              LIMIT 1
            `);

            if (existingRecord.length > 0) {
              continue; // Skip duplicate - timestamp match found
            }
          }

          // Insert new record with proper punch_time mapping
          await db.insert(attendancePullExt).values({
            biotimeId: record.id?.toString() || null,
            empCode: record.emp_code || null,
            punchTime: record.punch_time ? new Date(record.punch_time) : null,
            allFields: record
          });

          recordsPulled++;

        } catch (error) {
          console.error(`[BioTimeService] Error storing record:`, error);
          // Continue processing other records
        }
      }

      console.log(`[BioTimeService] Successfully stored ${recordsPulled} new records`);

      return {
        recordsPulled,
        success: true
      };

    } catch (error) {
      console.error('[BioTimeService] Error pulling attendance data:', error);
      return {
        recordsPulled: 0,
        success: false,
        error: error.message
      };
    }
  }

  async syncAttendanceData(startTime: Date, endTime: Date): Promise<PullResult> {
    // Wrapper method for backward compatibility
    return await this.pullAttendanceData(startTime, endTime);
  }

  async getLastSyncTime(): Promise<Date | null> {
    try {
      const result = await db.execute(sql`
        SELECT MAX((all_fields->>'punch_time')::timestamp) as last_sync
        FROM attendance_pull_ext
      `);

      if (result.length > 0 && result[0].last_sync) {
        return new Date(result[0].last_sync);
      }

      return null;

    } catch (error) {
      console.error('[BioTimeService] Error getting last sync time:', error);
      return null;
    }
  }

  async pullAttendanceByRange(startId: number, endId: number): Promise<{
    success: boolean;
    records?: any[];
    error?: string;
  }> {
    try {
      const authenticated = await this.ensureAuthenticated();
      if (!authenticated) {
        throw new Error('Authentication failed');
      }

      console.log(`[BioTimeService] Pulling attendance data for ID range: ${startId} to ${endId}`);

      // Use the transactions endpoint with ID range filtering
      const response = await axios.get(
        `${this.config.baseUrl}iclock/api/transactions/`,
        {
          headers: {
            'Authorization': `JWT ${this.authToken}`,
            'Content-Type': 'application/json'
          },
          params: {
            id__gte: startId,
            id__lte: endId,
            page_size: 1000 // Large page size for efficiency
          },
          timeout: this.config.timeout
        }
      );

      const records = response.data.results || [];
      console.log(`[BioTimeService] Retrieved ${records.length} records for range ${startId}-${endId}`);

      return {
        success: true,
        records: records
      };

    } catch (error) {
      console.error(`[BioTimeService] Error pulling range ${startId}-${endId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async pullEmployeeData(): Promise<{
    success: boolean;
    recordsPulled: number;
    error?: string;
  }> {
    try {
      console.log('[BioTimeService] Pulling employee data from BioTime API...');
      
      if (!await this.ensureAuthenticated()) {
        return {
          success: false,
          recordsPulled: 0,
          error: 'Authentication failed'
        };
      }

      let allEmployees = [];
      let page = 1;
      let hasMore = true;

      // Paginate through all employees
      while (hasMore) {
        const response = await axios.get(
          `${this.config.baseUrl}personnel/api/employees/`,
          {
            headers: {
              'Authorization': `JWT ${this.authToken}`,
              'Content-Type': 'application/json'
            },
            params: {
              page: page,
              page_size: 100
            },
            timeout: this.config.timeout,
            httpsAgent: new https.Agent({
              rejectUnauthorized: false
            })
          }
        );

        if (!response.data) {
          console.log('[BioTimeService] No data returned from employee API');
          break;
        }

        const employees = response.data.results || response.data.data || [];
        allEmployees = allEmployees.concat(employees);

        console.log(`[BioTimeService] Retrieved ${employees.length} employees from page ${page}`);

        // Check if there are more pages
        hasMore = response.data.next || (employees.length === 100);
        page++;
      }

      console.log(`[BioTimeService] Total employees retrieved: ${allEmployees.length}`);

      // Store/update employee records
      let recordsPulled = 0;
      
      for (const employee of allEmployees) {
        try {
          const empCode = employee.emp_code;
          
          if (!empCode) {
            continue; // Skip employees without emp_code
          }

          // Check if employee record already exists
          const existingRecord = await db.execute(sql`
            SELECT id FROM employee_pull_ext 
            WHERE emp_code = ${empCode}
            LIMIT 1
          `);

          if (existingRecord.length > 0) {
            // Update existing record
            await db.execute(sql`
              UPDATE employee_pull_ext 
              SET 
                biotime_id = ${employee.id?.toString() || null},
                first_name = ${employee.first_name || null},
                last_name = ${employee.last_name || null},
                nickname = ${employee.nickname || null},
                format_name = ${employee.format_name || null},
                gender = ${employee.gender || null},
                birthday = ${employee.birthday || null},
                mobile = ${employee.mobile || null},
                contact_tel = ${employee.contact_tel || null},
                office_tel = ${employee.office_tel || null},
                email = ${employee.email || null},
                address = ${employee.address || null},
                city = ${employee.city || null},
                postcode = ${employee.postcode || null},
                national = ${employee.national || null},
                ssn = ${employee.ssn || null},
                card_no = ${employee.card_no || null},
                department = ${employee.department ? JSON.stringify(employee.department) : null},
                position = ${employee.position ? JSON.stringify(employee.position) : null},
                hire_date = ${employee.hire_date || null},
                emp_type = ${employee.emp_type || null},
                area = ${employee.area ? JSON.stringify(employee.area) : null},
                device_password = ${employee.device_password || null},
                dev_privilege = ${employee.dev_privilege || null},
                verify_mode = ${employee.verify_mode || null},
                fingerprint = ${employee.fingerprint || null},
                face = ${employee.face || null},
                palm = ${employee.palm || null},
                vl_face = ${employee.vl_face || null},
                enroll_sn = ${employee.enroll_sn || null},
                app_status = ${employee.app_status || null},
                app_role = ${employee.app_role || null},
                attemployee = ${employee.attemployee ? JSON.stringify(employee.attemployee) : null},
                religion = ${employee.religion || null},
                update_time = ${employee.update_time || null},
                all_fields = ${JSON.stringify(employee)},
                pulled_at = ${new Date()}
              WHERE emp_code = ${empCode}
            `);
          } else {
            // Insert new record
            await db.insert(employeePullExt).values({
              biotimeId: employee.id?.toString() || null,
              empCode: empCode,
              firstName: employee.first_name || null,
              lastName: employee.last_name || null,
              nickname: employee.nickname || null,
              formatName: employee.format_name || null,
              gender: employee.gender || null,
              birthday: employee.birthday || null,
              mobile: employee.mobile || null,
              contactTel: employee.contact_tel || null,
              officeTel: employee.office_tel || null,
              email: employee.email || null,
              address: employee.address || null,
              city: employee.city || null,
              postcode: employee.postcode || null,
              national: employee.national || null,
              ssn: employee.ssn || null,
              cardNo: employee.card_no || null,
              department: employee.department ? JSON.stringify(employee.department) : null,
              position: employee.position ? JSON.stringify(employee.position) : null,
              hireDate: employee.hire_date || null,
              empType: employee.emp_type || null,
              area: employee.area ? JSON.stringify(employee.area) : null,
              devicePassword: employee.device_password || null,
              devPrivilege: employee.dev_privilege || null,
              verifyMode: employee.verify_mode || null,
              fingerprint: employee.fingerprint || null,
              face: employee.face || null,
              palm: employee.palm || null,
              vlFace: employee.vl_face || null,
              enrollSn: employee.enroll_sn || null,
              appStatus: employee.app_status || null,
              appRole: employee.app_role || null,
              attemployee: employee.attemployee ? JSON.stringify(employee.attemployee) : null,
              religion: employee.religion || null,
              updateTime: employee.update_time || null,
              allFields: JSON.stringify(employee),
              pulledAt: new Date()
            });
          }

          recordsPulled++;

        } catch (error) {
          console.error(`[BioTimeService] Error storing employee ${employee.emp_code}:`, error);
          // Continue processing other employees
        }
      }

      console.log(`[BioTimeService] Successfully processed ${recordsPulled} employee records`);

      return {
        success: true,
        recordsPulled
      };

    } catch (error) {
      console.error('[BioTimeService] Error pulling employee data:', error);
      return {
        success: false,
        recordsPulled: 0,
        error: error.message
      };
    }
  }

  async validateEmployeeNames(): Promise<{
    total: number;
    valid: number;
    corrupted: number;
    corruptedRecords: Array<{
      empCode: string;
      firstName: string;
      lastName: string;
      nickname: string;
      issue: string;
    }>;
  }> {
    try {
      console.log('[BioTimeService] Validating employee name data quality...');
      
      const employees = await db
        .select({
          empCode: employeePullExt.empCode,
          firstName: employeePullExt.firstName,
          lastName: employeePullExt.lastName,
          nickname: employeePullExt.nickname
        })
        .from(employeePullExt);

      const corruptedRecords = [];
      let validCount = 0;

      for (const employee of employees) {
        const issues = [];
        
        // Check for lowercase first letter in lastName (corruption indicator)
        if (employee.lastName && employee.lastName.length > 0) {
          const firstChar = employee.lastName.charAt(0);
          if (firstChar !== firstChar.toUpperCase()) {
            issues.push('lastName does not start with uppercase');
          }
        }
        
        // Check for numeric names
        if (employee.firstName && /^\d+$/.test(employee.firstName)) {
          issues.push('firstName is numeric');
        }
        
        if (employee.lastName && /^\d+$/.test(employee.lastName)) {
          issues.push('lastName is numeric');
        }
        
        // Check for suspiciously short names
        if (employee.firstName && employee.firstName.length < 2) {
          issues.push('firstName too short');
        }
        
        // Check for missing critical data
        if (!employee.firstName || employee.firstName.trim() === '') {
          issues.push('missing firstName');
        }
        
        if (!employee.lastName || employee.lastName.trim() === '') {
          if (!employee.nickname || employee.nickname.trim() === '' || employee.nickname.trim() === 'null') {
            issues.push('missing both lastName and nickname');
          }
        }
        
        if (issues.length > 0) {
          corruptedRecords.push({
            empCode: employee.empCode,
            firstName: employee.firstName || '',
            lastName: employee.lastName || '',
            nickname: employee.nickname || '',
            issue: issues.join(', ')
          });
        } else {
          validCount++;
        }
      }

      console.log(`[BioTimeService] Validation complete: ${validCount} valid, ${corruptedRecords.length} corrupted out of ${employees.length} total`);

      return {
        total: employees.length,
        valid: validCount,
        corrupted: corruptedRecords.length,
        corruptedRecords
      };

    } catch (error) {
      console.error('[BioTimeService] Error validating employee names:', error);
      return {
        total: 0,
        valid: 0,
        corrupted: 0,
        corruptedRecords: []
      };
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const authenticated = await this.ensureAuthenticated();
      if (!authenticated) {
        return false;
      }

      // Test with a simple API call
      const response = await axios.get(
        `${this.config.baseUrl}iclock/api/terminals/`,
        {
          headers: {
            'Authorization': `JWT ${this.authToken}`,
            'Content-Type': 'application/json'
          },
          timeout: this.config.timeout
        }
      );

      return response.status === 200;

    } catch (error) {
      console.error('[BioTimeService] Connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const bioTimeService = new BioTimeService();