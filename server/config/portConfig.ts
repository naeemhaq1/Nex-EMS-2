
interface PortConfiguration {
  frontend: number;
  services: number;
  whatsapp: number;
  mode: 'single-port' | 'three-tier';
  host: string;
}

class PortConfigManager {
  private config: PortConfiguration;

  constructor() {
    // Environment-based configuration with fallbacks
    const mode = process.env.PORT_MODE as 'single-port' | 'three-tier' || 'single-port';
    const basePort = parseInt(process.env.PORT || '5000');

    if (mode === 'single-port') {
      // Development mode: everything on port 5000
      this.config = {
        frontend: basePort,
        services: basePort, // Same port for consolidated services
        whatsapp: basePort, // Same port for consolidated services
        mode: 'single-port',
        host: '0.0.0.0'
      };
    } else {
      // Three-tier mode: separate ports
      this.config = {
        frontend: basePort,
        services: basePort + 1,
        whatsapp: basePort + 2,
        mode: 'three-tier',
        host: '0.0.0.0'
      };
    }
  }

  /**
   * Get current port configuration
   */
  getConfig(): PortConfiguration {
    return { ...this.config };
  }

  /**
   * Get frontend port (always the main port)
   */
  getFrontendPort(): number {
    return this.config.frontend;
  }

  /**
   * Get services port (may be same as frontend in single-port mode)
   */
  getServicesPort(): number {
    return this.config.services;
  }

  /**
   * Get WhatsApp services port (may be same as frontend in single-port mode)
   */
  getWhatsAppPort(): number {
    return this.config.whatsapp;
  }

  /**
   * Get host binding address
   */
  getHost(): string {
    return this.config.host;
  }

  /**
   * Check if running in single-port mode
   */
  isSinglePortMode(): boolean {
    return this.config.mode === 'single-port';
  }

  /**
   * Check if running in three-tier mode
   */
  isThreeTierMode(): boolean {
    return this.config.mode === 'three-tier';
  }

  /**
   * Update configuration (for runtime changes)
   */
  updateConfig(newConfig: Partial<PortConfiguration>): void {
    this.config = { ...this.config, ...newConfig };
    console.log(`[PortConfig] Configuration updated:`, this.config);
  }

  /**
   * Switch to single-port mode
   */
  setSinglePortMode(port: number = 5000): void {
    this.config = {
      frontend: port,
      services: port,
      whatsapp: port,
      mode: 'single-port',
      host: '0.0.0.0'
    };
    console.log(`[PortConfig] Switched to single-port mode on port ${port}`);
  }

  /**
   * Switch to three-tier mode
   */
  setThreeTierMode(basePort: number = 5000): void {
    this.config = {
      frontend: basePort,
      services: basePort + 1,
      whatsapp: basePort + 2,
      mode: 'three-tier',
      host: '0.0.0.0'
    };
    console.log(`[PortConfig] Switched to three-tier mode starting at port ${basePort}`);
  }

  /**
   * Get display information for logging
   */
  getDisplayInfo(): string {
    if (this.isSinglePortMode()) {
      return `Single-Port Mode (Port ${this.config.frontend})`;
    } else {
      return `Three-Tier Mode (Frontend: ${this.config.frontend}, Services: ${this.config.services}, WhatsApp: ${this.config.whatsapp})`;
    }
  }

  /**
   * Get environment variables for setting up services
   */
  getEnvironmentVars(): Record<string, string> {
    return {
      PORT: this.config.frontend.toString(),
      FRONTEND_PORT: this.config.frontend.toString(),
      SERVICES_PORT: this.config.services.toString(),
      WHATSAPP_PORT: this.config.whatsapp.toString(),
      PORT_MODE: this.config.mode,
      HOST: this.config.host
    };
  }
}

// Export singleton instance
export const portConfig = new PortConfigManager();

// Export types
export type { PortConfiguration };
