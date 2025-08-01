/**
 * Utility functions for phone number formatting and WhatsApp integration
 */

/**
 * Normalize mobile number to WhatsApp format
 * Pakistani mobile numbers: 03XXXXXXXXX -> 923XXXXXXXXX
 * @param mobile Original mobile number
 * @returns Normalized WhatsApp number (92XXXXXXXXX) or null if invalid
 */
export function normalizeWhatsAppNumber(mobile: string | null | undefined): string | null {
  if (!mobile) return null;
  
  // Remove all non-digit characters
  const cleaned = mobile.replace(/\D/g, '');
  
  // Skip if empty after cleaning
  if (!cleaned) return null;
  
  // Handle Pakistani mobile numbers starting with 03
  if (cleaned.startsWith('03') && cleaned.length === 11) {
    // Remove leading 0 and add 92 prefix
    return '92' + cleaned.substring(1);
  }
  
  // Handle numbers already starting with 92
  if (cleaned.startsWith('92') && cleaned.length === 12) {
    return cleaned;
  }
  
  // Handle international format without country code (3XXXXXXXXX)
  if (cleaned.startsWith('3') && cleaned.length === 10) {
    return '92' + cleaned;
  }
  
  // Return null for invalid formats
  return null;
}

/**
 * Format phone number for display
 * @param phone Phone number
 * @returns Formatted phone number for display
 */
export function formatPhoneForDisplay(phone: string | null | undefined): string {
  if (!phone) return '';
  
  // Remove non-digits
  const cleaned = phone.replace(/\D/g, '');
  
  // Format Pakistani mobile numbers (03XX-XXXXXXX)
  if (cleaned.startsWith('03') && cleaned.length === 11) {
    return `${cleaned.substring(0, 4)}-${cleaned.substring(4)}`;
  }
  
  // Format WhatsApp numbers (92-3XX-XXXXXXX)
  if (cleaned.startsWith('92') && cleaned.length === 12) {
    return `92-${cleaned.substring(2, 5)}-${cleaned.substring(5)}`;
  }
  
  // Return original if no pattern matches
  return phone;
}

/**
 * Check if phone number is valid Pakistani mobile
 * @param phone Phone number to validate
 * @returns true if valid Pakistani mobile number
 */
export function isValidPakistaniMobile(phone: string | null | undefined): boolean {
  if (!phone) return false;
  
  const cleaned = phone.replace(/\D/g, '');
  
  // Valid Pakistani mobile formats
  return (
    // 03XXXXXXXXX (11 digits)
    (cleaned.startsWith('03') && cleaned.length === 11) ||
    // 923XXXXXXXXX (12 digits)
    (cleaned.startsWith('92') && cleaned.length === 12) ||
    // 3XXXXXXXXX (10 digits)
    (cleaned.startsWith('3') && cleaned.length === 10)
  );
}

/**
 * Get WhatsApp-ready phone number from employee record
 * @param phone Phone number from employee record
 * @returns WhatsApp-formatted number or null
 */
export function getEmployeeWhatsAppNumber(phone: string | null | undefined): string | null {
  return normalizeWhatsAppNumber(phone);
}