import axios from "axios";
import https from "https";
import { storage } from "../storage";

export interface Device {
  id: string;
  alias: string;
  ip_address: string;
  port: number;
  terminal_name: string;
  area: number;
  model: string;
  sn: string;
  firmware: string;
  is_active: boolean;
  last_activity: Date;
  isSelected: boolean;
  apiEndpoint: string;
  device_type: 'access_control' | 'time_attendance' | 'both';
}

export interface DeviceDiscoveryResult {
  devices: Device[];
  scanDuration: number;
  timestamp: Date;
}

interface BioTimeDevice {
  id: number;
  sn: string;
  alias: string;
  terminal_name: string;
  ip_address: string;
  fw_ver: string;
  push_ver: string;
  state: number;
  area: {
    id: number;
    area_code: string;
    area_name: string;
  };
  area_name: string;
  terminal_tz: number;
  last_activity: string;
  user_count: number;
  fp_count: number;
  face_count: number;
  palm_count: number;
  transaction_count: number;
  push_time: string;
  transfer_time: string;
  transfer_interval: number;
  is_attendance: boolean;
}

class DeviceDiscoveryService {
  private baseUrl: string;
  private username: string;
  private password: string;
  private authToken: string | null = null;
  private api: any = null;
  private isAuthenticated: boolean = false;
  private timeout: number = 30000;
  private batchSize: number = 100;

  constructor() {
    // Don't load config here - do it lazily when needed
    this.baseUrl = '';
    this.username = '';
    this.password = '';
    
    // Auto-initialize connection on startup (delayed to let dotenv load)
    setTimeout(() => this.initializeConnection(), 100);
  }

  /**
   * Load configuration from environment variables
   */
  private loadConfig() {
    if (!this.baseUrl) {
      this.log('Loading configuration from environment...');
      this.baseUrl = process.env.BIOTIME_API_URL || '';
      this.username = process.env.BIOTIME_USERNAME || '';
      this.password = process.env.BIOTIME_PASSWORD || '';
      
      this.log(`Configuration loaded: baseUrl=${this.baseUrl}, username=${this.username}, hasPassword=${!!this.password}`);
    }
  }

  /**
   * Initialize connection on startup (non-blocking)
   */
  private async initializeConnection() {
    try {
      this.loadConfig();
      await this.initialize();
      this.log('BioTime connection established on startup');
    } catch (error) {
      this.log(`Failed to establish initial connection: ${error instanceof Error ? error.message : 'Unknown error'}`, 'warn');
    }
  }

  private log(message: string, level: string = 'info') {
    console.log(`[DeviceDiscovery] ${level.toUpperCase()}: ${message}`);
  }

  /**
   * Check if an IP address is in a private network range
   */
  private isPrivateNetwork(ip: string): boolean {
    const privateRanges = [
      /^10\./,                    // 10.0.0.0/8
      /^172\.(1[6-9]|2[0-9]|3[01])\./,  // 172.16.0.0/12
      /^192\.168\./,              // 192.168.0.0/16
      /^127\./,                   // 127.0.0.0/8 (localhost)
      /^169\.254\./,              // 169.254.0.0/16 (link-local)
    ];
    
    return privateRanges.some(range => range.test(ip));
  }

  /**
   * Initialize API connection and authenticate
   */
  async initialize() {
    try {
      this.log('Initializing BioTime API connection...');
      
      // Load config if not already loaded
      this.loadConfig();
      
      // Check if credentials are available
      if (!this.baseUrl || !this.username || !this.password) {
        const missing = [];
        if (!this.baseUrl) missing.push('BIOTIME_API_URL');
        if (!this.username) missing.push('BIOTIME_USERNAME');
        if (!this.password) missing.push('BIOTIME_PASSWORD');
        throw new Error(`Missing BioTime API credentials: ${missing.join(', ')}`);
      }

      this.log(`Connecting to BioTime API at: ${this.baseUrl}`);

      // Create axios instance with SSL bypass for self-signed certificates
      this.api = axios.create({
        baseURL: this.baseUrl,
        timeout: this.timeout,
        httpsAgent: new https.Agent({
          rejectUnauthorized: false // Required for self-signed certificates
        }),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      // Add request interceptor for authentication
      this.api.interceptors.request.use((config: any) => {
        if (this.authToken && config.url !== '/jwt-api-token-auth/') {
          config.headers.Authorization = `JWT ${this.authToken}`;
        }
        return config;
      });

      // Add response interceptor for error handling
      this.api.interceptors.response.use(
        (response: any) => response,
        async (error: any) => {
          if (error.response?.status === 401 && error.config?.url !== '/jwt-api-token-auth/') {
            this.log('Authentication expired, re-authenticating...', 'warn');
            await this.authenticate();
            return this.api.request(error.config);
          }
          return Promise.reject(error);
        }
      );

      // Test basic connectivity first
      this.log('Testing API connectivity...');
      try {
        await this.api.get('/iclock/api/');
        this.log('API connectivity confirmed');
      } catch (error) {
        this.log('API connectivity test failed, proceeding with authentication...', 'warn');
      }

      // Authenticate
      await this.authenticate();
      
      this.log('BioTime API connection established successfully');
      return true;
      
    } catch (error) {
      this.log(`Failed to initialize BioTime API: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      throw error;
    }
  }

  /**
   * Authenticate with BioTime API
   */
  async authenticate() {
    try {
      this.log('Authenticating with BioTime API...');
      
      const response = await this.api.post('/jwt-api-token-auth/', {
        username: this.username,
        password: this.password
      });
      
      if (response.data && response.data.token) {
        this.authToken = response.data.token;
        this.isAuthenticated = true;
        this.log('Authentication successful');
        return true;
      } else {
        throw new Error('No authentication token received');
      }
      
    } catch (error) {
      this.isAuthenticated = false;
      this.log(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      throw error;
    }
  }

  /**
   * Discover terminals from BioTime API
   */
  async discoverDevices(): Promise<DeviceDiscoveryResult> {
    const startTime = Date.now();
    this.log('Starting terminal discovery...');
    
    // Always ensure fresh connection before discovery
    if (!this.isAuthenticated || !this.api) {
      this.log('Establishing API connection for discovery...');
      await this.initialize();
    } else {
      this.log('Using existing authenticated connection');
    }
    
    try {
      const allDevices: Device[] = [];
      let page = 1;
      let hasMorePages = true;
      
      while (hasMorePages) {
        this.log(`Fetching terminals page ${page}...`);
        
        const response = await this.api.get(`/iclock/api/terminals/?page=${page}&limit=${this.batchSize}`);
        
        if (!response.data) {
          throw new Error('No data received from terminals API');
        }
        
        const terminals: BioTimeDevice[] = response.data.data || response.data.results || [];
        
        if (terminals.length === 0) {
          hasMorePages = false;
          break;
        }
        
        // Process terminals
        for (const terminal of terminals) {
          try {
            const device: Device = {
              id: terminal.id?.toString() || terminal.sn,
              alias: terminal.alias || terminal.terminal_name || `Terminal ${terminal.sn}`,
              ip_address: terminal.ip_address || 'Unknown',
              port: 80,
              terminal_name: terminal.terminal_name || terminal.alias || `Terminal ${terminal.sn}`,
              area: terminal.area?.id || 0,
              model: 'BioTime Terminal',
              sn: terminal.sn || 'Unknown',
              firmware: terminal.fw_ver || terminal.push_ver || 'Unknown',
              is_active: terminal.state === 1,
              last_activity: terminal.last_activity ? new Date(terminal.last_activity) : new Date(),
              isSelected: false,
              apiEndpoint: this.baseUrl,
              device_type: terminal.is_attendance ? 'time_attendance' : 'access_control'
            };
            
            allDevices.push(device);
            this.log(`Found terminal: ${device.alias} (${device.sn}) - Type: ${device.device_type}`);
          } catch (error) {
            this.log(`Error processing terminal ${terminal.sn}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
          }
        }
        
        // Check if there are more pages
        hasMorePages = response.data.next !== null;
        page++;
      }
      
      const duration = Date.now() - startTime;
      this.log(`Terminal discovery completed in ${duration}ms. Found ${allDevices.length} terminals.`);
      
      return {
        devices: allDevices,
        scanDuration: duration,
        timestamp: new Date()
      };
      
    } catch (error) {
      this.log(`Terminal discovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      throw error;
    }
  }

  /**
   * Test device connection via BioTime API
   */
  async testDeviceConnection(device: Device): Promise<{
    success: boolean;
    message: string;
    responseTime?: number;
  }> {
    const startTime = Date.now();
    
    try {
      if (!this.isAuthenticated) {
        await this.initialize();
      }
      
      // Test device specific endpoint via BioTime API
      const response = await this.api.get(`/iclock/api/terminals/${device.id}/`);
      
      const responseTime = Date.now() - startTime;
      
      return {
        success: true,
        message: `Device ${device.alias} is accessible via BioTime API (Status: ${response.data.state === 1 ? 'Online' : 'Offline'})`,
        responseTime
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'BioTime API test failed'
      };
    }
  }

  /**
   * Save device configuration to database
   */
  async saveDeviceConfiguration(devices: Device[]): Promise<void> {
    try {
      for (const device of devices) {
        try {
          await storage.createDevice({
            deviceId: device.id,
            alias: device.alias,
            ipAddress: device.ip_address,
            port: device.port,
            terminalName: device.terminal_name,
            area: device.area,
            model: device.model,
            sn: device.sn,
            firmware: device.firmware,
            isActive: device.is_active,
            isSelected: device.isSelected,
            deviceType: device.device_type,
            apiEndpoint: device.apiEndpoint,
            lastActivity: device.last_activity,
          });
        } catch (error) {
          this.log(`Error saving device ${device.alias}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
      }
      
      this.log(`Saved configuration for ${devices.length} devices`);
    } catch (error) {
      this.log(`Error saving device configuration: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      throw error;
    }
  }

  /**
   * Get selected devices from database
   */
  async getSelectedDevices(): Promise<Device[]> {
    try {
      return await storage.getSelectedDevices();
    } catch (error) {
      this.log(`Error getting selected devices: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      return [];
    }
  }

  /**
   * Update device selection in database
   */
  async updateDeviceSelection(deviceId: string, isSelected: boolean): Promise<void> {
    try {
      await storage.updateDeviceSelection(deviceId, isSelected);
    } catch (error) {
      this.log(`Error updating device selection: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      throw error;
    }
  }
}

export const deviceDiscoveryService = new DeviceDiscoveryService();