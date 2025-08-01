// Shared module exports - NO React imports to prevent dispatcher errors

// Export all shared modules with proper error handling
try {
  export * from './schema';
  export * from './versioning';
  export * from './departmentFieldConfig';
  export * from './departmentGroups';
  export * from './geofenceSchema';
  export * from './jobSites';
  export * from './location-schema';
  export * from './version';
  export * from './whatsappSchema';
} catch (error) {
  console.error('Error exporting shared modules:', error);
}

// Re-export utilities
export * from './utils/phoneUtils';