import axios from "axios";
import https from "https";
import { storage } from "../storage";

interface BiotimeConfig {
  baseUrl: string;
  username: string;
  password: string;
  token?: string;
}

class BiotimeService {
  private config: BiotimeConfig;
  private axiosInstance;

  constructor() {
    // Don't initialize config here - do it lazily when needed
    this.config = {
      baseUrl: '',
      username: '',
      password: '',
    };

    this.axiosInstance = axios.create({
      timeout: 30000,
      httpsAgent: new https.Agent({
        rejectUnauthorized: false // Required for self-signed certificates
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Auto-establish connection on startup (delayed to let dotenv load)
    setTimeout(() => this.initializeConnection(), 100);
    
    // DISABLED: Auto-sync replaced with incremental sync strategy
    // Auto-start employee sync after connection (for testing duplicate detection)
    // setTimeout(() => this.autoStartEmployeeSync(), 5000);
    
    // Auto-start attendance sync after employee sync completes
    // setTimeout(() => this.autoStartAttendanceSync(), 25000);
    
    // Note: Duplicate detection test completed successfully

    // Add request interceptor to include authentication
    this.axiosInstance.interceptors.request.use(async (config) => {
      if (!this.config.token) {
        await this.authenticate();
      }
      
      if (this.config.token) {
        config.headers.Authorization = `JWT ${this.config.token}`;
      }
      
      return config;
    });

    // Add response interceptor to handle token expiration
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          this.config.token = undefined;
          await this.authenticate();
          
          if (this.config.token) {
            error.config.headers.Authorization = `Token ${this.config.token}`;
            return this.axiosInstance.request(error.config);
          }
        }
        throw error;
      }
    );
  }

  private async authenticate(): Promise<void> {
    try {
      this.loadConfig(); // Ensure config is loaded
      console.log('[BioTime] Authenticating with:', this.config.baseUrl);
      const response = await axios.post(`${this.config.baseUrl}/jwt-api-token-auth/`, {
        username: this.config.username,
        password: this.config.password,
      }, {
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        }),
        timeout: 30000
      });

      if (response.data && response.data.token) {
        this.config.token = response.data.token;
        console.log('[BioTime] Authentication successful');
      } else {
        throw new Error('No token received from authentication');
      }
    } catch (error: any) {
      console.error('[BioTime] Authentication failed:', error.message);
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  /**
   * Load configuration from environment variables
   */
  private loadConfig() {
    // Always reload config to ensure we get the latest environment variables
    console.log('[BioTime] Loading configuration from environment...');
    this.config = {
      baseUrl: process.env.BIOTIME_API_URL || process.env.BIOTIME_BASE_URL || "https://zkbiotime.nexlinx.net.pk/",
      username: process.env.BIOTIME_USERNAME || process.env.BIOTIME_API_USERNAME || "naeem",
      password: process.env.BIOTIME_PASSWORD || process.env.BIOTIME_API_PASSWORD || "4Lf58g!J8G2u",
    };

    // Update axios instance with the correct base URL
    this.axiosInstance.defaults.baseURL = this.config.baseUrl;
    
    console.log('[BioTime] Configuration loaded:', {
      baseUrl: this.config.baseUrl,
      username: this.config.username,
      hasPassword: !!this.config.password
    });
  }

  /**
   * Initialize connection on startup (non-blocking)
   */
  private async initializeConnection() {
    try {
      this.loadConfig();
      console.log('[BioTime] Initializing connection to:', this.config.baseUrl);
      await this.authenticate();
      console.log('[BioTime] Connection established on startup');
    } catch (error) {
      console.warn('[BioTime] Failed to establish initial connection:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Auto-start employee sync for testing
   */
  private async autoStartEmployeeSync() {
    try {
      console.log('[BioTime] Auto-starting employee sync for testing...');
      const result = await this.syncEmployees();
      console.log('[BioTime] Auto employee sync result:', result);
    } catch (error) {
      console.warn('[BioTime] Auto employee sync failed:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Auto-start attendance sync for testing
   */
  private async autoStartAttendanceSync() {
    try {
      console.log('[BioTime] Auto-starting attendance sync...');
      // First check how many records are available
      const recordCount = await this.checkAttendanceRecordCount();
      console.log('[BioTime] Attendance record count check result:', recordCount);
      
      if (recordCount.success && recordCount.totalRecords > 0) {
        // Get attendance data for the last 30 days
        const dateTo = new Date();
        const dateFrom = new Date(dateTo);
        dateFrom.setDate(dateFrom.getDate() - 30);
        
        const result = await this.syncAttendance(dateFrom, dateTo);
        console.log('[BioTime] Auto attendance sync result:', result);
      }
    } catch (error) {
      console.warn('[BioTime] Auto attendance sync failed:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Pull attendance data by ID range for historical data collection
   */
  async pullAttendanceByRange(startId: number, endId: number): Promise<{ success: boolean; records?: any[]; error?: string }> {
    try {
      await this.authenticate();
      
      console.log(`[BioTime] Pulling attendance data for ID range: ${startId} to ${endId}`);
      
      const response = await this.axiosInstance.get('/iclock/api/transactions/', {
        params: {
          id__gte: startId,
          id__lte: endId,
          page_size: 1000
        },
        timeout: 60000
      });
      
      if (response.data && response.data.data) {
        const records = response.data.data;
        console.log(`[BioTime] Retrieved ${records.length} records for ID range ${startId}-${endId}`);
        
        return {
          success: true,
          records: records
        };
      }
      
      return {
        success: true,
        records: []
      };
      
    } catch (error) {
      console.error(`[BioTime] Error pulling attendance by range:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check total attendance records available in BioTime
   */
  async checkAttendanceRecordCount(dateFrom?: Date, dateTo?: Date): Promise<{ success: boolean; totalRecords: number; message?: string }> {
    try {
      await this.authenticate();
      
      const params: any = {
        page: 1,
        limit: 1, // Only get one record to check total count
        page_size: 1,
      };
      
      if (dateFrom) {
        params.start_date = dateFrom.toISOString().split('T')[0];
      }
      if (dateTo) {
        params.end_date = dateTo.toISOString().split('T')[0];
      }
      
      // Try different attendance endpoints from BioTime API documentation
      const endpoints = [
        '/iclock/api/transactions/', // Transaction records (punch in/out)
        '/att/api/attendances/',     // Attendance records
        '/personnel/api/attendances/', // Alternative attendance endpoint
      ];
      
      for (const endpoint of endpoints) {
        try {
          console.log(`[BioTime] Checking attendance records at: ${endpoint}`);
          
          const response = await this.axiosInstance.get(endpoint, { params });
          
          if (response.data && (response.data.count !== undefined || response.data.data)) {
            const totalRecords = response.data.count || response.data.data?.length || 0;
            
            console.log(`[BioTime] Found ${totalRecords} attendance records at ${endpoint}`);
            console.log(`[BioTime] Sample response structure:`, {
              hasCount: 'count' in response.data,
              hasData: 'data' in response.data,
              hasNext: 'next' in response.data,
              hasPrevious: 'previous' in response.data,
              keys: Object.keys(response.data)
            });
            
            if (response.data.data && response.data.data.length > 0) {
              console.log(`[BioTime] Sample attendance record fields:`, Object.keys(response.data.data[0]));
              console.log(`[BioTime] First attendance record:`, JSON.stringify(response.data.data[0], null, 2));
            }
            
            return {
              success: true,
              totalRecords,
              message: `Found ${totalRecords} records at ${endpoint}`
            };
          }
        } catch (endpointError) {
          console.warn(`[BioTime] Endpoint ${endpoint} failed:`, endpointError.response?.status, endpointError.response?.data?.detail || endpointError.message);
          continue;
        }
      }
      
      return {
        success: false,
        totalRecords: 0,
        message: 'No accessible attendance endpoints found'
      };
      
    } catch (error) {
      console.error('[BioTime] Error checking attendance record count:', error);
      return {
        success: false,
        totalRecords: 0,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async syncEmployees(): Promise<{ success: boolean; processed: number; total: number; error?: string }> {
    try {
      await this.authenticate();
      await storage.updateSyncStatus('employees', 'running');
      
      let allEmployees: any[] = [];
      let page = 1;
      const pageSize = 50; // Smaller chunks for high latency
      let hasMore = true;
      let totalCount = 0;
      let consecutiveErrors = 0;
      const maxRetries = 3;

      // Fetch all employees with pagination and resume capability
      while (hasMore && consecutiveErrors < maxRetries) {
        try {
          console.log(`Fetching employees page ${page} (chunk size: ${pageSize})`);
          
          // Use the correct BioTime API endpoint based on official documentation
          console.log(`[BioTime] Fetching from: GET /personnel/api/employees/ (page ${page})`);
          
          const response = await this.axiosInstance.get('/personnel/api/employees/', {
            params: {
              page,
              limit: pageSize, // API uses 'limit' not 'page_size'
            },
            timeout: 45000
          });

          // Log the first employee record structure for debugging
          if (page === 1 && response.data.data && response.data.data.length > 0) {
            console.log('[BioTime] Sample employee record structure:');
            console.log('[BioTime] Available fields:', Object.keys(response.data.data[0]));
            console.log('[BioTime] Full first record:');
            console.log(JSON.stringify(response.data.data[0], null, 2));
          }

          // BioTime API uses 'data' array according to documentation
          const employees = response.data.data || [];
          
          if (employees.length === 0) {
            hasMore = false;
            break;
          }

          // Store complete API response for each employee
          await storage.insertEmployeePullData(employees);
          
          allEmployees = allEmployees.concat(employees);
          totalCount = response.data.count || allEmployees.length;
          
          // Update progress
          await storage.updateSyncStatus('employees', 'running', allEmployees.length, totalCount);
          
          console.log(`Fetched ${employees.length} employees (total: ${allEmployees.length}/${totalCount})`);
          
          // Check if we have more pages based on API response
          hasMore = response.data.next !== null || (employees.length === pageSize);
          page++;
          consecutiveErrors = 0; // Reset error counter on success
          
          // Adaptive delay based on response time
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } catch (pageError) {
          consecutiveErrors++;
          console.error(`Error fetching page ${page} (attempt ${consecutiveErrors}/${maxRetries}):`, pageError);
          
          // For network/timeout errors, implement exponential backoff
          if (pageError.code === 'ECONNRESET' || pageError.code === 'ETIMEDOUT' || pageError.response?.status >= 500) {
            if (consecutiveErrors < maxRetries) {
              const delay = Math.min(2000 * Math.pow(2, consecutiveErrors), 30000); // Max 30 seconds
              console.log(`Retrying page ${page} in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue; // Retry the same page
            }
          }
          
          // For other errors, break the loop
          if (consecutiveErrors >= maxRetries) {
            throw new Error(`Failed to fetch page ${page} after ${maxRetries} attempts: ${pageError.message}`);
          }
        }
      }

      // Process staging data into normalized table - COMMENTED OUT TO RETAIN DATA FOR ANALYSIS
      // const processed = await storage.processEmployeeData();
      
      await storage.updateSyncStatus('employees', 'completed', allEmployees.length, allEmployees.length);
      
      return {
        success: true,
        processed: allEmployees.length,
        total: allEmployees.length,
      };
    } catch (error) {
      console.error("Error syncing employees:", error);
      await storage.updateSyncStatus('employees', 'failed', 0, 0, error instanceof Error ? error.message : 'Unknown error');
      return {
        success: false,
        processed: 0,
        total: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async syncAttendance(dateFrom?: Date, dateTo?: Date): Promise<{ success: boolean; processed: number; total: number; error?: string }> {
    try {
      await this.authenticate();
      await storage.updateSyncStatus('attendance', 'running');
      
      const from = dateFrom || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
      const to = dateTo || new Date();

      let allAttendance: any[] = [];
      let page = 1;
      const pageSize = 200; // Larger chunks for attendance records
      let hasMore = true;
      let totalCount = 0;
      let consecutiveErrors = 0;
      const maxRetries = 3;

      console.log(`Syncing attendance records from ${from.toISOString().split('T')[0]} to ${to.toISOString().split('T')[0]}`);

      // Fetch all attendance records with pagination and resume capability
      while (hasMore && consecutiveErrors < maxRetries) {
        try {
          console.log(`Fetching attendance page ${page} (chunk size: ${pageSize})`);
          
          const response = await this.axiosInstance.get(`/iclock/api/transactions/`, {
            params: {
              page,
              page_size: pageSize,
              limit: pageSize,
              start_date: from.toISOString().split('T')[0],
              end_date: to.toISOString().split('T')[0],
              ordering: 'punch_time,id' // Consistent ordering for resume
            },
            timeout: 60000 // 60 second timeout for large attendance datasets
          });

          const attendance = response.data.results || response.data.data || [];
          
          if (attendance.length === 0) {
            hasMore = false;
            break;
          }

          // Filter out lock devices before storing
          const filteredAttendance = attendance.filter(record => {
            if (record.terminal_alias && record.terminal_alias.toLowerCase().includes('lock')) {
              console.log(`Skipping lock device during sync: ${record.terminal_alias}`);
              return false;
            }
            return true;
          });
          
          // Keep original field names exactly as API provides - NO transformation here
          await storage.insertAttendancePullData(filteredAttendance);
          
          allAttendance = allAttendance.concat(filteredAttendance);
          totalCount = response.data.count || allAttendance.length;
          
          // Update progress
          await storage.updateSyncStatus('attendance', 'running', allAttendance.length, totalCount);
          
          console.log(`Fetched ${attendance.length} attendance records (total: ${allAttendance.length}/${totalCount})`);
          
          // Check if we have more pages
          hasMore = response.data.next || (attendance.length === pageSize);
          page++;
          consecutiveErrors = 0; // Reset error counter on success
          
          // Adaptive delay - longer for attendance due to larger datasets
          await new Promise(resolve => setTimeout(resolve, 300));
          
        } catch (pageError) {
          consecutiveErrors++;
          console.error(`Error fetching attendance page ${page} (attempt ${consecutiveErrors}/${maxRetries}):`, pageError);
          
          // For network/timeout errors, implement exponential backoff
          if (pageError.code === 'ECONNRESET' || pageError.code === 'ETIMEDOUT' || pageError.response?.status >= 500) {
            if (consecutiveErrors < maxRetries) {
              const delay = Math.min(3000 * Math.pow(2, consecutiveErrors), 45000); // Max 45 seconds
              console.log(`Retrying attendance page ${page} in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue; // Retry the same page
            }
          }
          
          // For other errors, break the loop
          if (consecutiveErrors >= maxRetries) {
            throw new Error(`Failed to fetch attendance page ${page} after ${maxRetries} attempts: ${pageError.message}`);
          }
        }
      }

      // Process staging data into normalized table
      const processed = await storage.processAttendanceData();
      
      await storage.updateSyncStatus('attendance', 'completed', processed, allAttendance.length);
      
      return {
        success: true,
        processed,
        total: allAttendance.length,
      };
    } catch (error) {
      console.error("Error syncing attendance:", error);
      await storage.updateSyncStatus('attendance', 'failed', 0, 0, error instanceof Error ? error.message : 'Unknown error');
      return {
        success: false,
        processed: 0,
        total: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private normalizeCheckType(checkType: string): string {
    const type = checkType.toLowerCase();
    
    if (type.includes('in') && !type.includes('break')) {
      return 'check_in';
    } else if (type.includes('out') && !type.includes('break')) {
      return 'check_out';
    } else if (type.includes('break') && type.includes('in')) {
      return 'break_in';
    } else if (type.includes('break') && type.includes('out')) {
      return 'break_out';
    }
    
    return 'check_in'; // Default
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      this.loadConfig();
      console.log('[BioTime] Testing connection to:', this.config.baseUrl);
      
      await this.authenticate();
      console.log('[BioTime] Authentication successful, testing API endpoint...');
      
      // Try multiple endpoints to find the correct one
      const endpoints = [
        '/iclock/api/terminals/',
        '/api/employees/',
        '/personnel/api/employees/',
        '/iclock/api/employees/'
      ];
      
      let lastError = null;
      
      for (const endpoint of endpoints) {
        try {
          console.log(`[BioTime] Testing endpoint: ${endpoint}`);
          const response = await this.axiosInstance.get(endpoint, {
            params: { page: 1, page_size: 1 },
          });
          
          console.log(`[BioTime] Success! Endpoint ${endpoint} works. Response status: ${response.status}`);
          return {
            success: true,
            message: `Connection successful - API endpoint: ${endpoint}`,
          };
        } catch (endpointError: any) {
          console.log(`[BioTime] Endpoint ${endpoint} failed:`, endpointError.response?.status, endpointError.message);
          lastError = endpointError;
          continue;
        }
      }
      
      // If all endpoints fail, return the last error
      throw lastError;
      
    } catch (error: any) {
      console.error('[BioTime] Connection test failed:', error.response?.status, error.message);
      return {
        success: false,
        message: `Connection failed: ${error.response?.status || 'Unknown'} - ${error.message}`,
      };
    }
  }
}

export const biotimeService = new BiotimeService();
