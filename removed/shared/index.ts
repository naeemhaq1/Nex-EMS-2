// Shared module exports - NO React imports to prevent dispatcher errors
// Each export is isolated to prevent module resolution conflicts

// Database schemas
export * from './schema';
export * from './geofenceSchema';
export * from './location-schema';  
export * from './whatsappSchema';

// Configuration modules
export * from './departmentFieldConfig';
export * from './departmentGroups';
export * from './jobSites';

// Version management (isolated to prevent conflicts)
export { version } from './version';
export * from './versioning';

// Utilities (isolated)  
export * from './utils/phoneUtils';