import { db } from '../db';
import { sql } from 'drizzle-orm';

export interface SystemConfig {
  mobileLocationPollingInterval: number; // in milliseconds
  locationAccuracyThreshold: number; // in meters
  geofenceValidationEnabled: boolean;
  batteryOptimizationEnabled: boolean;
  locationRetentionDays: number;
  maxLocationUpdatesPerHour: number;
}

class ConfigService {
  private config: SystemConfig = {
    mobileLocationPollingInterval: 3 * 60 * 1000, // 3 minutes default (changed from 1 minute)
    locationAccuracyThreshold: 50, // 50 meters
    geofenceValidationEnabled: true,
    batteryOptimizationEnabled: true,
    locationRetentionDays: 30,
    maxLocationUpdatesPerHour: 60
  };

  private configCache: Map<string, any> = new Map();
  private lastCacheUpdate: Date = new Date();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

  constructor() {
    console.log('[ConfigService] 🔧 Initializing configuration service...');
    this.loadConfig().catch(console.error);
  }

  /**
   * Load configuration from database or initialize with defaults
   */
  private async loadConfig(): Promise<void> {
    try {
      // Check if settings table exists, create if not
      await this.ensureSettingsTableExists();

      // Load all settings from database
      const settings = await db.execute(`SELECT key, value FROM system_settings`);

      for (const setting of settings) {
        const { key, value } = setting as { key: string; value: string };
        this.configCache.set(key, JSON.parse(value));
      }

      // Set defaults for missing keys
      await this.setDefaultsIfMissing();

      this.lastCacheUpdate = new Date();
      console.log('[ConfigService] ✅ Configuration loaded successfully');

    } catch (error) {
      console.error('[ConfigService] ❌ Error loading config:', error);
      console.log('[ConfigService] 📝 Using default configuration values');
    }
  }

  /**
   * Ensure system_settings table exists
   */
  private async ensureSettingsTableExists(): Promise<void> {
    try {
      const sql = `
        CREATE TABLE IF NOT EXISTS system_settings (
          key VARCHAR(255) PRIMARY KEY,
          value TEXT NOT NULL,
          description TEXT,
          category VARCHAR(100) DEFAULT 'general',
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      await db.execute(sql);
    } catch (error) {
      console.error('[ConfigService] Error creating settings table:', error);
    }
  }

  /**
   * Set default values for missing configuration keys
   */
  private async setDefaultsIfMissing(): Promise<void> {
    const defaults = {
      mobileLocationPollingInterval: { 
        value: 3 * 60 * 1000, 
        description: 'Mobile app location polling interval in milliseconds (default: 3 minutes)',
        category: 'location' 
      },
      locationAccuracyThreshold: { 
        value: 50, 
        description: 'Minimum GPS accuracy threshold in meters',
        category: 'location' 
      },
      geofenceValidationEnabled: { 
        value: true, 
        description: 'Enable geofence validation for location updates',
        category: 'location' 
      },
      batteryOptimizationEnabled: { 
        value: true, 
        description: 'Enable battery optimization features',
        category: 'location' 
      },
      locationRetentionDays: { 
        value: 30, 
        description: 'Number of days to retain location data',
        category: 'location' 
      },
      maxLocationUpdatesPerHour: { 
        value: 60, 
        description: 'Maximum location updates per employee per hour',
        category: 'location' 
      }
    };

    for (const [key, config] of Object.entries(defaults)) {
      if (!this.configCache.has(key)) {
        await this.setSetting(key, config.value, config.description, config.category);
      }
    }
  }

  /**
   * Get mobile location polling interval in milliseconds
   */
  getMobileLocationPollingInterval(): number {
    return this.getSetting('mobileLocationPollingInterval', 3 * 60 * 1000);
  }

  /**
   * Get mobile location polling interval in seconds (for display)
   */
  getMobileLocationPollingIntervalSeconds(): number {
    return Math.round(this.getMobileLocationPollingInterval() / 1000);
  }

  /**
   * Set mobile location polling interval
   */
  async setMobileLocationPollingInterval(intervalMs: number): Promise<void> {
    if (intervalMs < 30000) { // Minimum 30 seconds
      throw new Error('Location polling interval cannot be less than 30 seconds');
    }
    if (intervalMs > 30 * 60 * 1000) { // Maximum 30 minutes
      throw new Error('Location polling interval cannot be more than 30 minutes');
    }

    await this.setSetting('mobileLocationPollingInterval', intervalMs, 
      'Mobile app location polling interval in milliseconds');
  }

  /**
   * Get a configuration setting with fallback
   */
  getSetting<T>(key: string, defaultValue: T): T {
    if (this.isCacheExpired()) {
      this.loadConfig().catch(console.error);
    }

    return this.configCache.get(key) ?? defaultValue;
  }

  /**
   * Set a configuration setting
   */
  async setSetting(key: string, value: any, description?: string, category: string = 'general'): Promise<void> {
    try {
      const insertSql = `
        INSERT INTO system_settings (key, value, description, category, updated_at) 
        VALUES ('${key}', '${JSON.stringify(value).replace(/'/g, "''")}', '${(description || '').replace(/'/g, "''")}', '${category}', CURRENT_TIMESTAMP)
        ON CONFLICT (key) DO UPDATE SET 
          value = EXCLUDED.value,
          description = COALESCE(EXCLUDED.description, system_settings.description),
          category = EXCLUDED.category,
          updated_at = CURRENT_TIMESTAMP
      `;
      await db.execute(insertSql);

      // Update cache
      this.configCache.set(key, value);
      console.log(`[ConfigService] Setting updated: ${key} = ${value}`);

    } catch (error) {
      console.error(`[ConfigService] Error setting ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get all location-related settings
   */
  getLocationSettings(): any {
    return {
      pollingInterval: this.getMobileLocationPollingInterval(),
      pollingIntervalSeconds: this.getMobileLocationPollingIntervalSeconds(),
      accuracyThreshold: this.getSetting('locationAccuracyThreshold', 50),
      geofenceValidationEnabled: this.getSetting('geofenceValidationEnabled', true),
      batteryOptimizationEnabled: this.getSetting('batteryOptimizationEnabled', true),
      retentionDays: this.getSetting('locationRetentionDays', 30),
      maxUpdatesPerHour: this.getSetting('maxLocationUpdatesPerHour', 60)
    };
  }

  /**
   * Get all settings for admin interface
   */
  async getAllSettings(): Promise<any[]> {
    try {
      const settings = await db.execute(`
        SELECT key, value, description, category, updated_at 
        FROM system_settings 
        ORDER BY category, key
      `);

      return settings.map((row: any) => ({
        key: row.key,
        value: JSON.parse(row.value),
        description: row.description,
        category: row.category,
        updatedAt: row.updated_at
      }));
    } catch (error) {
      console.error('[ConfigService] Error getting all settings:', error);
      return [];
    }
  }

  /**
   * Check if cache is expired
   */
  private isCacheExpired(): boolean {
    return Date.now() - this.lastCacheUpdate.getTime() > this.CACHE_TTL;
  }

  /**
   * Clear cache and reload from database
   */
  async reloadConfig(): Promise<void> {
    this.configCache.clear();
    await this.loadConfig();
  }
}

// Create singleton instance
export const configService = new ConfigService();