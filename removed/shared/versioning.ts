// Component and App Versioning System
// Tracks versions of dashboards, services, WhatsApp console, and project components

export interface ComponentVersion {
  id: string;
  name: string;
  category: 'dashboard' | 'service' | 'whatsapp' | 'mobile' | 'admin' | 'core';
  version: string;
  lastUpdated: Date;
  description: string;
  author?: string;
  changes?: string[];
  dependencies?: string[];
  status: 'stable' | 'beta' | 'alpha' | 'deprecated';
}

export interface VersionHistory {
  componentId: string;
  version: string;
  releaseDate: Date;
  changes: string[];
  author?: string;
  buildNumber?: number;
  gitCommit?: string;
}

// System Version Configuration
export const SYSTEM_VERSION = "2.3.1";
export const BUILD_NUMBER = 20250725001;
export const RELEASE_DATE = new Date("2025-07-25");

// Initial Component Versions - Baseline for tracking
export const INITIAL_COMPONENT_VERSIONS: ComponentVersion[] = [
  // Core System Components
  {
    id: 'nexlinx-core',
    name: 'NEXLINX Core System',
    category: 'core',
    version: '2.3.1',
    lastUpdated: new Date('2025-07-25'),
    description: 'Main employee management system core',
    status: 'stable',
    dependencies: ['database', 'authentication', 'biotime-integration']
  },
  {
    id: 'authentication-system',
    name: 'Authentication & Security',
    category: 'core',
    version: '1.8.2',
    lastUpdated: new Date('2025-07-24'),
    description: 'Role-based authentication with session management',
    status: 'stable'
  },
  {
    id: 'database-layer',
    name: 'Database Layer',
    category: 'core',
    version: '1.5.1',
    lastUpdated: new Date('2025-07-20'),
    description: 'PostgreSQL with Drizzle ORM integration',
    status: 'stable'
  },

  // Dashboard Components
  {
    id: 'employee-dashboard',
    name: 'Employee Dashboard',
    category: 'dashboard',
    version: '3.1.0',
    lastUpdated: new Date('2025-07-25'),
    description: 'Enhanced mobile employee dashboard with cross-platform location services',
    status: 'stable',
    changes: ['Cross-platform location enablement', 'Performance impact warnings', 'Enhanced device detection'],
    dependencies: ['location-services', 'device-detection', 'attendance-tracking']
  },
  {
    id: 'admin-dashboard',
    name: 'Admin Dashboard',
    category: 'dashboard',
    version: '3.0.5',
    lastUpdated: new Date('2025-07-25'),
    description: 'Comprehensive admin dashboard with system monitoring',
    status: 'stable',
    changes: ['Cross-platform location support', 'Enhanced KPI panels', 'Service monitoring integration'],
    dependencies: ['system-metrics', 'service-monitor', 'employee-directory']
  },
  {
    id: 'desktop-dashboard',
    name: 'Desktop Dashboard',
    category: 'dashboard',
    version: '2.8.3',
    lastUpdated: new Date('2025-07-23'),
    description: 'Full-featured desktop admin interface',
    status: 'stable'
  },

  // Mobile Components
  {
    id: 'mobile-employee-app',
    name: 'Mobile Employee App',
    category: 'mobile',
    version: '2.1.0',
    lastUpdated: new Date('2025-07-25'),
    description: 'Cross-platform mobile employee application',
    status: 'stable',
    changes: ['One-click location enablement', 'Platform-specific GPS optimization', 'Enhanced error handling']
  },
  {
    id: 'mobile-admin-console',
    name: 'Mobile Admin Console',
    category: 'mobile',
    version: '2.0.8',
    lastUpdated: new Date('2025-07-25'),
    description: 'Mobile admin interface with full system control',
    status: 'stable',
    changes: ['Cross-platform location support', 'Advanced device detection', 'Service monitoring']
  },
  {
    id: 'device-permission-checker',
    name: 'Device Permission Checker',
    category: 'mobile',
    version: '1.6.2',
    lastUpdated: new Date('2025-07-25'),
    description: 'Cross-platform device capability and permission detection',
    status: 'stable',
    changes: ['Platform detection enhancement', 'Location service optimization']
  },

  // Service Components
  {
    id: 'attendance-service',
    name: 'Attendance Processing Service',
    category: 'service',
    version: '1.9.1',
    lastUpdated: new Date('2025-07-22'),
    description: 'Real-time attendance processing with BioTime integration',
    status: 'stable'
  },
  {
    id: 'notification-service',
    name: 'Notification Service',
    category: 'service',
    version: '1.4.3',
    lastUpdated: new Date('2025-07-21'),
    description: 'Multi-channel notification delivery system',
    status: 'stable'
  },
  {
    id: 'service-monitor',
    name: 'Service Monitoring System',
    category: 'service',
    version: '1.7.0',
    lastUpdated: new Date('2025-07-24'),
    description: 'Three-tier architecture service health monitoring',
    status: 'stable',
    changes: ['Three-tier monitoring', 'Port management', 'Health checks']
  },
  {
    id: 'backup-service',
    name: 'Backup & Recovery Service',
    category: 'service',
    version: '1.3.2',
    lastUpdated: new Date('2025-07-20'),
    description: 'Automated backup and data recovery system',
    status: 'stable'
  },

  // WhatsApp Components
  {
    id: 'whatsapp-console',
    name: 'WhatsApp Management Console',
    category: 'whatsapp',
    version: '2.4.1',
    lastUpdated: new Date('2025-07-25'),
    description: 'Enhanced WhatsApp messaging interface with contact management',
    status: 'stable',
    changes: ['Real database integration', 'Contact persistence', 'Enhanced UI'],
    dependencies: ['whatsapp-api', 'contact-manager', 'message-history']
  },
  {
    id: 'whatsapp-manager',
    name: 'Mobile WhatsApp Manager',
    category: 'whatsapp',
    version: '1.8.0',
    lastUpdated: new Date('2025-07-25'),
    description: 'Mobile WhatsApp interface with broadcast capabilities',
    status: 'stable',
    changes: ['Database-backed contacts', 'Enhanced messaging', 'Mobile optimization']
  },
  {
    id: 'whatsapp-service',
    name: 'WhatsApp Service Layer',
    category: 'whatsapp',
    version: '1.6.3',
    lastUpdated: new Date('2025-07-24'),
    description: 'Core WhatsApp messaging service with API integration',
    status: 'stable'
  },
  {
    id: 'contact-manager',
    name: 'Contact Management System',
    category: 'whatsapp',
    version: '1.5.1',
    lastUpdated: new Date('2025-07-25'),
    description: 'Employee contact database with WhatsApp integration',
    status: 'stable',
    changes: ['Real database storage', 'User isolation', 'Phone formatting']
  },

  // Admin Tools
  {
    id: 'employee-directory',
    name: 'Employee Directory',
    category: 'admin',
    version: '2.2.0',
    lastUpdated: new Date('2025-07-23'),
    description: 'Comprehensive employee management interface',
    status: 'stable'
  },
  {
    id: 'analytics-suite',
    name: 'Analytics Suite',
    category: 'admin',
    version: '1.9.5',
    lastUpdated: new Date('2025-07-22'),
    description: 'Advanced analytics and reporting dashboard',
    status: 'stable'
  },
  {
    id: 'announcement-system',
    name: 'Announcement System',
    category: 'admin',
    version: '1.4.8',
    lastUpdated: new Date('2025-07-21'),
    description: 'Group-based announcement and communication system',
    status: 'stable'
  }
];

// Version History for tracking changes
export const VERSION_HISTORY: VersionHistory[] = [
  {
    componentId: 'nexlinx-core',
    version: '2.3.1',
    releaseDate: new Date('2025-07-25'),
    changes: [
      'Cross-platform location enablement implementation',
      'Enhanced mobile dashboard device detection',
      'Performance impact warning system integration',
      'Three-tier architecture optimization'
    ],
    author: 'System',
    buildNumber: BUILD_NUMBER
  },
  {
    componentId: 'employee-dashboard',
    version: '3.1.0',
    releaseDate: new Date('2025-07-25'),
    changes: [
      'Cross-platform GPS optimization (iOS, Android, Desktop, WebApp)',
      'Platform-specific timeout configurations',
      'Enhanced error handling with platform guidance',
      'Performance impact warning overlays',
      'Smart fallback location system'
    ],
    author: 'Development Team',
    buildNumber: BUILD_NUMBER
  },
  {
    componentId: 'admin-dashboard',
    version: '3.0.5',
    releaseDate: new Date('2025-07-25'),
    changes: [
      'Cross-platform admin location services',
      'Enhanced device detection integration',
      'Admin-specific GPS timeout optimization',
      'System monitoring location warnings',
      'Clickable location status indicator'
    ],
    author: 'Development Team',
    buildNumber: BUILD_NUMBER
  },
  {
    componentId: 'whatsapp-console',
    version: '2.4.1',
    releaseDate: new Date('2025-07-25'),
    changes: [
      'Real database integration for contact management',
      'PostgreSQL contact persistence',
      'Enhanced contact validation and formatting',
      'User isolation for contact data',
      'Duplicate contact detection'
    ],
    author: 'WhatsApp Team',
    buildNumber: BUILD_NUMBER
  }
];

// Utility functions for version management
export const getComponentVersion = (componentId: string): ComponentVersion | undefined => {
  return INITIAL_COMPONENT_VERSIONS.find(comp => comp.id === componentId);
};

export const getVersionHistory = (componentId: string): VersionHistory[] => {
  return VERSION_HISTORY.filter(history => history.componentId === componentId)
    .sort((a, b) => b.releaseDate.getTime() - a.releaseDate.getTime());
};

export const getComponentsByCategory = (category: ComponentVersion['category']): ComponentVersion[] => {
  return INITIAL_COMPONENT_VERSIONS.filter(comp => comp.category === category);
};

export const getLatestVersions = (): ComponentVersion[] => {
  return INITIAL_COMPONENT_VERSIONS.sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime());
};

// Version comparison utility
export const compareVersions = (version1: string, version2: string): number => {
  const v1Parts = version1.split('.').map(Number);
  const v2Parts = version2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const v1Part = v1Parts[i] || 0;
    const v2Part = v2Parts[i] || 0;
    
    if (v1Part > v2Part) return 1;
    if (v1Part < v2Part) return -1;
  }
  
  return 0;
};

export const incrementVersion = (currentVersion: string, type: 'major' | 'minor' | 'patch' = 'patch'): string => {
  const parts = currentVersion.split('.').map(Number);
  
  switch (type) {
    case 'major':
      return `${parts[0] + 1}.0.0`;
    case 'minor':
      return `${parts[0]}.${(parts[1] || 0) + 1}.0`;
    case 'patch':
    default:
      return `${parts[0]}.${parts[1] || 0}.${(parts[2] || 0) + 1}`;
  }
};