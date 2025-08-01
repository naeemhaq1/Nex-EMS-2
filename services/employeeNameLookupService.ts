import { db } from '../db';
import { employeePullExt, employeeRecords } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

interface EmployeeNameData {
  firstName: string;
  lastName: string;
  source: 'biotime' | 'employee_records' | 'fallback';
  confidence: number;
}

/**
 * Service for looking up clean employee names from BioTime employee data
 * Prevents name corruption during attendance processing
 */
export class EmployeeNameLookupService {
  private nameCache = new Map<string, EmployeeNameData>();
  private cacheExpiry = 5 * 60 * 1000; // 5 minutes
  private lastCacheUpdate = 0;

  /**
   * Get clean employee name from BioTime employee data
   * Uses corruption detection to select best name source
   */
  async getCleanEmployeeName(empCode: string): Promise<EmployeeNameData> {
    // Check cache first
    const cached = this.nameCache.get(empCode);
    if (cached && Date.now() - this.lastCacheUpdate < this.cacheExpiry) {
      return cached;
    }

    // Refresh cache if needed
    if (Date.now() - this.lastCacheUpdate > this.cacheExpiry) {
      await this.refreshCache();
    }

    // Return cached result or fallback
    return this.nameCache.get(empCode) || {
      firstName: 'Unknown',
      lastName: 'Employee',
      source: 'fallback',
      confidence: 0
    };
  }

  /**
   * Refresh the name cache with BioTime employee data
   */
  private async refreshCache(): Promise<void> {
    try {
      console.log('[EmployeeNameLookup] 🔄 Refreshing employee name cache...');
      
      // Get BioTime employee data
      const bioTimeEmployees = await db
        .select({
          empCode: employeePullExt.empCode,
          firstName: employeePullExt.firstName,
          lastName: employeePullExt.lastName,
          nickname: employeePullExt.nickname
        })
        .from(employeePullExt)
        .where(sql`${employeePullExt.empCode} IS NOT NULL`);

      // Get employee records as fallback
      const employeeRecordsData = await db
        .select({
          empCode: employeeRecords.employeeCode,
          firstName: employeeRecords.firstName,
          lastName: employeeRecords.lastName
        })
        .from(employeeRecords);

      // Create fallback map
      const fallbackMap = new Map<string, { firstName: string; lastName: string }>();
      employeeRecordsData.forEach(emp => {
        fallbackMap.set(emp.empCode, {
          firstName: emp.firstName || 'Unknown',
          lastName: emp.lastName || 'Employee'
        });
      });

      // Clear cache
      this.nameCache.clear();

      // Process BioTime employee data
      for (const emp of bioTimeEmployees) {
        if (!emp.empCode) continue;

        const nameData = this.selectBestName(emp, fallbackMap.get(emp.empCode));
        this.nameCache.set(emp.empCode, nameData);
      }

      // Add fallback entries for employees not in BioTime
      for (const [empCode, fallback] of fallbackMap.entries()) {
        if (!this.nameCache.has(empCode)) {
          this.nameCache.set(empCode, {
            firstName: fallback.firstName,
            lastName: fallback.lastName,
            source: 'employee_records',
            confidence: 60
          });
        }
      }

      this.lastCacheUpdate = Date.now();
      console.log(`[EmployeeNameLookup] ✅ Cached ${this.nameCache.size} employee names`);

    } catch (error) {
      console.error('[EmployeeNameLookup] ❌ Error refreshing cache:', error);
    }
  }

  /**
   * Select the best name from available sources using corruption detection
   */
  private selectBestName(
    bioTimeData: { firstName: string; lastName: string; nickname: string },
    fallbackData?: { firstName: string; lastName: string }
  ): EmployeeNameData {
    let bestFirstName = bioTimeData.firstName;
    let bestLastName = bioTimeData.lastName;
    let source: 'biotime' | 'employee_records' | 'fallback' = 'biotime';
    let confidence = 90;

    // Check for lastName corruption (doesn't start with uppercase)
    if (bestLastName && bestLastName.length > 0) {
      const firstChar = bestLastName.charAt(0);
      if (firstChar !== firstChar.toUpperCase()) {
        // lastName is corrupted, use nickname
        bestLastName = bioTimeData.nickname;
        confidence = 75;
      }
    } else if (bioTimeData.nickname) {
      // No lastName, use nickname
      bestLastName = bioTimeData.nickname;
      confidence = 70;
    }

    // Clean up names
    if (bestFirstName) {
      bestFirstName = bestFirstName.trim();
    }

    if (bestLastName) {
      bestLastName = bestLastName.trim();
      
      // Remove corruption patterns
      if (bestLastName === 'null' || bestLastName === '' || 
          bestLastName === bioTimeData.firstName || 
          /^\d+$/.test(bestLastName)) {
        bestLastName = null;
        confidence = 50;
      }
    }

    // Use fallback if BioTime data is poor
    if ((!bestFirstName || bestFirstName.length < 2) && fallbackData) {
      bestFirstName = fallbackData.firstName;
      bestLastName = fallbackData.lastName;
      source = 'employee_records';
      confidence = 60;
    }

    // Final fallback
    if (!bestFirstName || bestFirstName.length < 2) {
      bestFirstName = 'Unknown';
      bestLastName = 'Employee';
      source = 'fallback';
      confidence = 0;
    }

    return {
      firstName: bestFirstName,
      lastName: bestLastName || 'Employee',
      source,
      confidence
    };
  }

  /**
   * Get name for attendance record processing
   * Returns formatted name string for display
   */
  async getNameForAttendance(empCode: string): Promise<string> {
    const nameData = await this.getCleanEmployeeName(empCode);
    return `${nameData.firstName} ${nameData.lastName}`.trim();
  }

  /**
   * Get name parts for database storage
   */
  async getNameParts(empCode: string): Promise<{ firstName: string; lastName: string }> {
    const nameData = await this.getCleanEmployeeName(empCode);
    return {
      firstName: nameData.firstName,
      lastName: nameData.lastName
    };
  }

  /**
   * Force refresh the cache
   */
  async forceRefresh(): Promise<void> {
    this.lastCacheUpdate = 0;
    await this.refreshCache();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalEntries: number;
    biotimeEntries: number;
    employeeRecordEntries: number;
    fallbackEntries: number;
    cacheAge: number;
  } {
    const entries = Array.from(this.nameCache.values());
    
    return {
      totalEntries: entries.length,
      biotimeEntries: entries.filter(e => e.source === 'biotime').length,
      employeeRecordEntries: entries.filter(e => e.source === 'employee_records').length,
      fallbackEntries: entries.filter(e => e.source === 'fallback').length,
      cacheAge: Date.now() - this.lastCacheUpdate
    };
  }
}

// Export singleton instance
export const employeeNameLookupService = new EmployeeNameLookupService();