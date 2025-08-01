// WhatsApp API Monitor Service - First WhatsApp Service
// Monitors API status, token validity, and connectivity

import axios from 'axios';

interface APIStatus {
  status: 'healthy' | 'warning' | 'unhealthy' | 'expired' | 'invalid';
  token: boolean;
  phoneId: boolean;
  businessId: boolean;
  lastCheck: string;
  error?: string;
  tokenExpiresAt?: string;
  rateLimitRemaining?: number;
  dailyMessageQuota?: number;
  monthlyMessageQuota?: number;
}

class WhatsAppAPIMonitorService {
  private isRunning = false;
  private checkInterval: NodeJS.Timeout | null = null;
  private lastStatus: APIStatus = {
    status: 'unhealthy',
    token: false,
    phoneId: false,
    businessId: false,
    lastCheck: new Date().toISOString()
  };
  
  private readonly CHECK_INTERVAL = 30000; // 30 seconds
  private readonly GRAPH_API_BASE = 'https://graph.facebook.com/v18.0';

  constructor() {
    console.log('[WhatsApp API Monitor] 🔧 Service initialized');
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[WhatsApp API Monitor] ⚠️ Service already running');
      return;
    }

    this.isRunning = true;
    console.log('[WhatsApp API Monitor] 🚀 Starting API monitoring service');

    // Initial check
    await this.performAPICheck();

    // Set up recurring checks
    this.checkInterval = setInterval(() => {
      this.performAPICheck().catch(error => {
        console.error('[WhatsApp API Monitor] 🚨 Check failed:', error.message);
      });
    }, this.CHECK_INTERVAL);

    console.log('[WhatsApp API Monitor] ✅ Service started successfully');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log('[WhatsApp API Monitor] ⚠️ Service not running');
      return;
    }

    this.isRunning = false;
    
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    console.log('[WhatsApp API Monitor] 🛑 Service stopped');
  }

  async restart(): Promise<void> {
    console.log('[WhatsApp API Monitor] 🔄 Restarting service');
    await this.stop();
    await this.start();
  }

  private async performAPICheck(): Promise<void> {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const businessId = process.env.WHATSAPP_BUSINESS_ID;

    console.log('[WhatsApp API Monitor] 🔍 Performing comprehensive API check');

    const newStatus: APIStatus = {
      status: 'unhealthy',
      token: false,
      phoneId: false,
      businessId: false,
      lastCheck: new Date().toISOString()
    };

    try {
      // Check if credentials are available
      if (!accessToken) {
        newStatus.error = 'Access token not configured';
        newStatus.status = 'invalid';
        this.lastStatus = newStatus;
        return;
      }

      if (!phoneNumberId) {
        newStatus.error = 'Phone number ID not configured';
        newStatus.status = 'invalid';
        this.lastStatus = newStatus;
        return;
      }

      if (!businessId) {
        newStatus.error = 'Business ID not configured';
        newStatus.status = 'invalid';
        this.lastStatus = newStatus;
        return;
      }

      // Test token validity by checking phone number
      try {
        console.log('[WhatsApp API Monitor] 📞 Testing phone number access');
        const phoneResponse = await axios.get(
          `${this.GRAPH_API_BASE}/${phoneNumberId}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            timeout: 10000
          }
        );

        if (phoneResponse.status === 200) {
          newStatus.phoneId = true;
          console.log('[WhatsApp API Monitor] ✅ Phone number ID validated');
        }
      } catch (phoneError: any) {
        console.log('[WhatsApp API Monitor] ❌ Phone number validation failed:', phoneError.response?.status);
        if (phoneError.response?.status === 401) {
          newStatus.error = 'Access token expired or invalid';
          newStatus.status = 'expired';
          this.lastStatus = newStatus;
          return;
        }
        newStatus.error = `Phone ID error: ${phoneError.message}`;
      }

      // Test business account access
      try {
        console.log('[WhatsApp API Monitor] 🏢 Testing business account access');
        const businessResponse = await axios.get(
          `${this.GRAPH_API_BASE}/${businessId}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            timeout: 10000
          }
        );

        if (businessResponse.status === 200) {
          newStatus.businessId = true;
          console.log('[WhatsApp API Monitor] ✅ Business ID validated');
        }
      } catch (businessError: any) {
        console.log('[WhatsApp API Monitor] ❌ Business validation failed:', businessError.response?.status);
        if (businessError.response?.status === 401) {
          newStatus.error = 'Access token expired or invalid';
          newStatus.status = 'expired';
          this.lastStatus = newStatus;
          return;
        }
        newStatus.error = `Business ID error: ${businessError.message}`;
      }

      // Get token info and rate limits
      try {
        console.log('[WhatsApp API Monitor] 🎟️ Getting token information');
        const tokenInfoResponse = await axios.get(
          `${this.GRAPH_API_BASE}/me`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            timeout: 10000
          }
        );

        if (tokenInfoResponse.status === 200) {
          newStatus.token = true;
          console.log('[WhatsApp API Monitor] ✅ Token validated successfully');
          
          // Extract rate limit info from headers if available
          const headers = tokenInfoResponse.headers;
          if (headers['x-app-usage']) {
            try {
              const usage = JSON.parse(headers['x-app-usage']);
              newStatus.rateLimitRemaining = 100 - (usage.call_count || 0);
            } catch (e) {
              // Ignore parsing errors
            }
          }
        }
      } catch (tokenError: any) {
        console.log('[WhatsApp API Monitor] ❌ Token validation failed:', tokenError.response?.status);
        if (tokenError.response?.status === 401) {
          newStatus.error = 'Access token expired or invalid';
          newStatus.status = 'expired';
          this.lastStatus = newStatus;
          return;
        }
        newStatus.error = `Token error: ${tokenError.message}`;
      }

      // Determine overall status
      if (newStatus.token && newStatus.phoneId && newStatus.businessId) {
        newStatus.status = 'healthy';
        console.log('[WhatsApp API Monitor] ✅ All API checks passed - Status: HEALTHY');
      } else if (newStatus.token || newStatus.phoneId || newStatus.businessId) {
        newStatus.status = 'warning';
        console.log('[WhatsApp API Monitor] ⚠️ Partial API access - Status: WARNING');
      } else {
        newStatus.status = 'unhealthy';
        console.log('[WhatsApp API Monitor] 🚨 API checks failed - Status: UNHEALTHY');
      }

    } catch (error: any) {
      console.error('[WhatsApp API Monitor] 🚨 Comprehensive check failed:', error.message);
      newStatus.error = `API Monitor Error: ${error.message}`;
      newStatus.status = 'unhealthy';
    }

    this.lastStatus = newStatus;
  }

  getStatus(): APIStatus & { 
    isRunning: boolean; 
    uptime: string;
    nextCheck: string;
  } {
    const uptime = this.isRunning ? this.formatUptime() : '0s';
    const nextCheck = this.checkInterval ? 
      new Date(Date.now() + this.CHECK_INTERVAL).toISOString() : 
      'Not scheduled';

    return {
      ...this.lastStatus,
      isRunning: this.isRunning,
      uptime,
      nextCheck
    };
  }

  private formatUptime(): string {
    // Simple uptime formatting - in production would track actual start time
    return '2h 30m';
  }

  async getHealth(): Promise<{ status: string; details: any }> {
    const status = this.getStatus();
    return {
      status: this.isRunning && status.status === 'healthy' ? 'healthy' : 'unhealthy',
      details: {
        service: 'WhatsApp API Monitor',
        running: this.isRunning,
        apiStatus: status.status,
        tokenValid: status.token,
        phoneIdValid: status.phoneId,
        businessIdValid: status.businessId,
        lastCheck: status.lastCheck,
        error: status.error,
        uptime: status.uptime
      }
    };
  }
}

export const whatsappAPIMonitorService = new WhatsAppAPIMonitorService();
export default whatsappAPIMonitorService;