// Port Configuration Management
export interface PortConfig {
  mode: 'single-port' | 'three-tier';
  mainPort: number;
  frontendPort?: number;
  servicesPort?: number;
  whatsappPort?: number;
  host: string;
}

export function loadPortConfig(): PortConfig {
  const mode = process.env.PORT_MODE || 'single-port';
  const host = process.env.HOST || '0.0.0.0';

  if (mode === 'three-tier') {
    return {
      mode: 'three-tier',
      mainPort: parseInt(process.env.PORT || '5000'),
      frontendPort: parseInt(process.env.FRONTEND_PORT || '5000'),
      servicesPort: parseInt(process.env.SERVICES_PORT || '5001'),
      whatsappPort: parseInt(process.env.WHATSAPP_PORT || '5002'),
      host
    };
  }

  return {
    mode: 'single-port',
    mainPort: parseInt(process.env.PORT || '5000'),
    host
  };
}

export const portConfig = loadPortConfig();

console.log('[Port Config] Loaded configuration:', {
  mode: portConfig.mode,
  mainPort: portConfig.mainPort,
  host: portConfig.host
});