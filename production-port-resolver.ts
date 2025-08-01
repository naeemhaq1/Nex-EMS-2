import net from 'net';

/**
 * Production Port Resolver - Handles port conflicts in deployment environments
 * Automatically finds available ports when default ports are in use
 */

interface PortConfig {
  main: number;
  services: number;
  whatsapp: number;
}

const DEFAULT_PORTS: PortConfig = {
  main: 5000,
  services: 5001,  // Core services port
  whatsapp: 5002   // WhatsApp services port
};

const PRODUCTION_FALLBACK_PORTS: PortConfig = {
  main: 5000,
  services: 5001,  // Core services port
  whatsapp: 5002   // WhatsApp services port
};

/**
 * Check if a port is available
 */
function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.once('close', () => resolve(true));
      server.close();
    });
    server.on('error', () => resolve(false));
  });
}

/**
 * Find next available port starting from given port
 */
async function findAvailablePort(startPort: number): Promise<number> {
  for (let port = startPort; port <= startPort + 100; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available ports found starting from ${startPort}`);
}

/**
 * Get production-ready port configuration
 * Falls back to available ports if defaults are in use
 */
export async function getProductionPorts(): Promise<PortConfig> {
  const isProduction = process.env.NODE_ENV === 'production';
  const config = isProduction ? PRODUCTION_FALLBACK_PORTS : DEFAULT_PORTS;
  
  console.log('[Production Port Resolver] Checking port availability...');
  
  // Check if default ports are available
  const mainAvailable = await isPortAvailable(config.main);
  const servicesAvailable = await isPortAvailable(config.services);
  const whatsappAvailable = await isPortAvailable(config.whatsapp);
  
  const finalConfig: PortConfig = {
    main: config.main,
    services: servicesAvailable ? config.services : await findAvailablePort(config.services + 1),
    whatsapp: whatsappAvailable ? config.whatsapp : await findAvailablePort(config.whatsapp + 1)
  };
  
  console.log('[Production Port Resolver] Final port configuration:', finalConfig);
  
  if (!mainAvailable) {
    console.warn(`⚠️ Main port ${config.main} is in use - this may cause issues in deployment`);
  }
  
  return finalConfig;
}

/**
 * Production-safe server initialization
 * Disables three-tier architecture only when explicitly set or in Docker
 */
export function shouldDisableThreeTier(): boolean {
  // Disable three-tier only when explicitly requested or in Docker
  return process.env.DISABLE_THREE_TIER === 'true' || 
         (process.env.NODE_ENV === 'production' && process.env.DOCKER_ENV === 'true');
}

/**
 * Get simplified production configuration
 * All services run on main port when three-tier is disabled
 */
export function getSimplifiedConfig(): PortConfig {
  const mainPort = parseInt(process.env.PORT || '5000');
  return {
    main: mainPort,
    services: mainPort, // Same port - no separate service tier
    whatsapp: mainPort  // Same port - no separate WhatsApp tier
  };
}