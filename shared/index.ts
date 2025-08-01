
// Shared module exports - NO React imports to prevent dispatcher errors

// Export all shared modules with proper error handling
export * from './schema';
export * from './versioning';
export * from './departmentFieldConfig';
export * from './departmentGroups';
export * from './geofenceSchema';
export * from './jobSites';
export * from './location-schema';
export * from './version';
export * from './whatsappSchema';

// Re-export utilities
export * from './utils/phoneUtils';
