import { db } from './db';
import { employeePullExt, employeeRecords } from '@shared/schema';
import { eq } from 'drizzle-orm';
import axios from 'axios';

/**
 * Proper BioTime Employee Re-Import Service
 * Uses correct field mapping based on discovered BioTime API structure
 */

interface BioTimeEmployee {
  id: number;
  emp_code: string;
  first_name: string;  // Contains full name
  last_name: string;   // Contains employee ID
  nickname: string;    // Contains actual last name
  format_name: string; // Contains formatted display name
  department: string;
  position: string;
  email: string;
  mobile: string;
  hire_date: string;
  active: boolean;
}

class BioTimeReImportService {
  private baseUrl = process.env.BIOTIME_API_URL || 'https://zkbiotime.nexlinx.net.pk/';
  private username = process.env.BIOTIME_USERNAME || 'naeem';
  private password = process.env.BIOTIME_PASSWORD || '4Lf58g!J8G2u';
  private token: string | null = null;
  private axiosInstance: any;
  
  constructor() {
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
  
  private async authenticate(): Promise<void> {
    try {
      console.log('🔐 Authenticating with BioTime API...');
      const response = await this.axiosInstance.post('/jwt-api-token-auth/', {
        username: this.username,
        password: this.password,
      });
      
      this.token = response.data.token;
      this.axiosInstance.defaults.headers.Authorization = `JWT ${this.token}`;
      console.log('✅ BioTime authentication successful!');
    } catch (error) {
      console.error('❌ BioTime authentication failed:', error);
      throw error;
    }
  }
  
  private parseCorrectName(biotimeEmployee: BioTimeEmployee): { firstName: string; lastName: string; middleName?: string } {
    // Use format_name as primary source (most complete)
    const formatName = biotimeEmployee.format_name;
    
    if (formatName) {
      // Format: "10001000 Naeem Haq"
      const parts = formatName.split(' ');
      if (parts.length >= 3) {
        const nameOnly = parts.slice(1).join(' ');
        return this.parseFullName(nameOnly);
      }
    }
    
    // Fallback to first_name (contains full name)
    const firstName = biotimeEmployee.first_name;
    if (firstName) {
      return this.parseFullName(firstName);
    }
    
    // Last resort: use nickname as last name
    return {
      firstName: biotimeEmployee.first_name || 'Unknown',
      lastName: biotimeEmployee.nickname || 'Unknown'
    };
  }
  
  private parseFullName(fullName: string): { firstName: string; lastName: string; middleName?: string } {
    const parts = fullName.trim().split(' ').filter(p => p.length > 0);
    
    if (parts.length === 1) {
      return { firstName: parts[0], lastName: parts[0] };
    } else if (parts.length === 2) {
      return { firstName: parts[0], lastName: parts[1] };
    } else {
      return { 
        firstName: parts[0], 
        lastName: parts[parts.length - 1],
        middleName: parts.slice(1, -1).join(' ')
      };
    }
  }
  
  async reImportEmployees(): Promise<void> {
    try {
      await this.authenticate();
      
      console.log('📥 Fetching employees from BioTime API...');
      let page = 1;
      let totalProcessed = 0;
      let hasMore = true;
      
      while (hasMore) {
        const response = await this.axiosInstance.get('/personnel/api/employees/', {
          params: {
            page: page,
            limit: 100,
          },
        });
        
        const employees = response.data.data;
        
        if (!employees || employees.length === 0) {
          hasMore = false;
          break;
        }
        
        console.log(`📋 Processing page ${page} (${employees.length} employees)...`);
        
        for (const biotimeEmployee of employees) {
          try {
            const parsed = this.parseCorrectName(biotimeEmployee);
            
            // Update existing employee record
            const existingEmployee = await db
              .select()
              .from(employeeRecords)
              .where(eq(employeeRecords.employeeCode, biotimeEmployee.emp_code));
            
            if (existingEmployee.length > 0) {
              await db
                .update(employeeRecords)
                .set({
                  firstName: parsed.firstName,
                  lastName: parsed.lastName,
                  middleName: parsed.middleName || null,
                  updatedAt: new Date()
                })
                .where(eq(employeeRecords.employeeCode, biotimeEmployee.emp_code));
              
              console.log(`  ✅ Updated: ${biotimeEmployee.emp_code} → "${parsed.firstName} ${parsed.lastName}"`);
            }
            
            // Also update pull table for future reference
            await db
              .update(employeePullExt)
              .set({
                firstName: parsed.firstName,
                lastName: parsed.lastName,
                nickname: parsed.middleName || biotimeEmployee.nickname,
                allFields: biotimeEmployee
              })
              .where(eq(employeePullExt.empCode, biotimeEmployee.emp_code));
            
            totalProcessed++;
            
          } catch (error) {
            console.error(`❌ Error processing employee ${biotimeEmployee.emp_code}:`, error);
          }
        }
        
        page++;
        
        // Add delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      console.log(`\n🎉 BioTime re-import completed! Processed ${totalProcessed} employees.`);
      
    } catch (error) {
      console.error('❌ Error during BioTime re-import:', error);
      throw error;
    }
  }
}

// Export function to run the service
export async function runBioTimeReImport() {
  const service = new BioTimeReImportService();
  await service.reImportEmployees();
}

// Run if called directly
if (require.main === module) {
  runBioTimeReImport().catch(console.error);
}