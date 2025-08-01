import { db } from "../db";
import { employeeRecords } from "@shared/schema";
import { eq } from "drizzle-orm";

interface ProtectedField {
  fieldName: string;
  currentValue: string | null;
  isProtected: boolean;
  reason: string;
}

interface FieldProtectionResult {
  employeeCode: string;
  protectedFields: ProtectedField[];
  changesBlocked: number;
  changesAllowed: number;
  protectionActive: boolean;
}

/**
 * Employee Field Protection Service
 * Prevents BioTime data corruption from overwriting cleaned employee name fields
 */
export class EmployeeFieldProtectionService {
  private static instance: EmployeeFieldProtectionService;
  private protectedFields = ['firstName', 'middleName', 'lastName', 'salutation', 'employeeCode', 'nationalId'];
  private isEnabled = true;

  static getInstance(): EmployeeFieldProtectionService {
    if (!EmployeeFieldProtectionService.instance) {
      EmployeeFieldProtectionService.instance = new EmployeeFieldProtectionService();
    }
    return EmployeeFieldProtectionService.instance;
  }

  /**
   * Enable field protection (default state)
   */
  enableProtection(): void {
    this.isEnabled = true;
    console.log("🔒 Employee field protection ENABLED");
  }

  /**
   * Disable field protection (for manual updates only)
   */
  disableProtection(): void {
    this.isEnabled = false;
    console.log("🔓 Employee field protection DISABLED");
  }

  /**
   * Check if field protection is active
   */
  isProtectionActive(): boolean {
    return this.isEnabled;
  }

  /**
   * Validate and protect employee fields before update
   */
  async protectEmployeeFields(
    employeeCode: string, 
    proposedChanges: Partial<{
      firstName: string;
      middleName: string;
      lastName: string;
      salutation: string;
      nationalId: string;
    }>
  ): Promise<FieldProtectionResult> {
    
    if (!this.isEnabled) {
      return {
        employeeCode,
        protectedFields: [],
        changesBlocked: 0,
        changesAllowed: Object.keys(proposedChanges).length,
        protectionActive: false
      };
    }

    // Get current employee record
    const [currentRecord] = await db
      .select()
      .from(employeeRecords)
      .where(eq(employeeRecords.employeeCode, employeeCode));

    if (!currentRecord) {
      throw new Error(`Employee not found: ${employeeCode}`);
    }

    const result: FieldProtectionResult = {
      employeeCode,
      protectedFields: [],
      changesBlocked: 0,
      changesAllowed: 0,
      protectionActive: true
    };

    // Check each proposed change
    for (const [fieldName, proposedValue] of Object.entries(proposedChanges)) {
      const currentValue = currentRecord[fieldName as keyof typeof currentRecord];
      
      const fieldProtection: ProtectedField = {
        fieldName,
        currentValue: currentValue as string,
        isProtected: false,
        reason: ''
      };

      // Protection rules
      if (this.protectedFields.includes(fieldName)) {
        // Rule 1: Don't overwrite existing non-null values
        if (currentValue && currentValue.trim() !== '') {
          fieldProtection.isProtected = true;
          fieldProtection.reason = 'Non-null value exists - preventing overwrite';
          result.changesBlocked++;
        }
        // Rule 2: Don't allow BioTime corruption patterns
        else if (this.detectCorruptionPattern(proposedValue)) {
          fieldProtection.isProtected = true;
          fieldProtection.reason = 'BioTime corruption pattern detected';
          result.changesBlocked++;
        }
        // Rule 3: Don't allow numeric values in name fields
        else if (['firstName', 'middleName', 'lastName'].includes(fieldName) && 
                 this.isNumericValue(proposedValue)) {
          fieldProtection.isProtected = true;
          fieldProtection.reason = 'Numeric value in name field blocked';
          result.changesBlocked++;
        }
        // Rule 4: Allow only if value is null/empty and proposed value is valid
        else if ((!currentValue || currentValue.trim() === '') && 
                 proposedValue && 
                 this.isValidValue(proposedValue)) {
          fieldProtection.isProtected = false;
          fieldProtection.reason = 'Valid value for empty field - allowed';
          result.changesAllowed++;
        }
        // Rule 5: Block everything else
        else {
          fieldProtection.isProtected = true;
          fieldProtection.reason = 'Protected field - change blocked';
          result.changesBlocked++;
        }
      } else {
        // Non-protected field
        fieldProtection.isProtected = false;
        fieldProtection.reason = 'Non-protected field - allowed';
        result.changesAllowed++;
      }

      result.protectedFields.push(fieldProtection);
    }

    return result;
  }

  /**
   * Detect BioTime corruption patterns
   */
  private detectCorruptionPattern(value: string | null): boolean {
    if (!value) return false;
    
    const corruptionPatterns = [
      /^\d+$/, // Pure numeric values
      /^[a-z]+$/, // All lowercase (BioTime corruption indicator)
      /^\d{7,}/, // Employee codes in name fields
      /^0\d+/, // Leading zeros (typical BioTime corruption)
      /^[A-Z]+$/ // All uppercase (except for specific cases)
    ];

    return corruptionPatterns.some(pattern => pattern.test(value));
  }

  /**
   * Check if value is numeric
   */
  private isNumericValue(value: string | null): boolean {
    if (!value) return false;
    return /^\d+$/.test(value);
  }

  /**
   * Validate if value is acceptable
   */
  private isValidValue(value: string | null): boolean {
    if (!value || value.trim() === '') return false;
    
    // Must contain at least one letter
    if (!/[a-zA-Z]/.test(value)) return false;
    
    // Must not be pure numbers
    if (/^\d+$/.test(value)) return false;
    
    // Must not be BioTime corruption pattern
    if (this.detectCorruptionPattern(value)) return false;
    
    return true;
  }

  /**
   * Filter out protected changes from update object
   */
  async filterProtectedChanges(
    employeeCode: string, 
    proposedChanges: any
  ): Promise<any> {
    const protection = await this.protectEmployeeFields(employeeCode, proposedChanges);
    const allowedChanges: any = {};

    protection.protectedFields.forEach(field => {
      if (!field.isProtected) {
        allowedChanges[field.fieldName] = proposedChanges[field.fieldName];
      }
    });

    if (protection.changesBlocked > 0) {
      console.log(`🔒 PROTECTION: ${employeeCode} - ${protection.changesBlocked} changes blocked, ${protection.changesAllowed} allowed`);
    }

    return allowedChanges;
  }

  /**
   * Safe update with field protection
   */
  async safeUpdateEmployee(
    employeeCode: string, 
    proposedChanges: any
  ): Promise<FieldProtectionResult> {
    const protection = await this.protectEmployeeFields(employeeCode, proposedChanges);
    
    if (protection.changesAllowed > 0) {
      const allowedChanges = await this.filterProtectedChanges(employeeCode, proposedChanges);
      
      if (Object.keys(allowedChanges).length > 0) {
        await db
          .update(employeeRecords)
          .set({
            ...allowedChanges,
            updatedAt: new Date()
          })
          .where(eq(employeeRecords.employeeCode, employeeCode));
      }
    }

    return protection;
  }

  /**
   * Get protection status for employee
   */
  async getProtectionStatus(employeeCode: string): Promise<{
    employeeCode: string;
    protectedFields: string[];
    currentValues: Record<string, string>;
    protectionActive: boolean;
  }> {
    const [record] = await db
      .select()
      .from(employeeRecords)
      .where(eq(employeeRecords.employeeCode, employeeCode));

    if (!record) {
      throw new Error(`Employee not found: ${employeeCode}`);
    }

    const currentValues: Record<string, string> = {};
    this.protectedFields.forEach(field => {
      currentValues[field] = record[field as keyof typeof record] as string || '';
    });

    return {
      employeeCode,
      protectedFields: this.protectedFields,
      currentValues,
      protectionActive: this.isEnabled
    };
  }
}

// Export singleton instance
export const employeeFieldProtection = EmployeeFieldProtectionService.getInstance();