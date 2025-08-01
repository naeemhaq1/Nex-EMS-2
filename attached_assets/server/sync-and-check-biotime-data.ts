import { db } from "./db";
import { employeeRecords, employeePullExt } from "@shared/schema";
import { sql } from "drizzle-orm";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

async function syncAndCheckBiotimeData() {
  console.log("=== Syncing Employee Data from BioTime API ===\n");
  
  try {
    // First, let's manually sync some data from BioTime to see what fields are available
    const baseUrl = process.env.BIOTIME_API_URL || 'https://zkbiotime.nexlinx.net.pk/';
    const username = process.env.BIOTIME_USERNAME || 'naeem';
    const password = process.env.BIOTIME_PASSWORD || '4Lf58g!J8G2u';
    
    console.log(`Connecting to BioTime API at: ${baseUrl}`);
    
    // Create axios instance
    const axiosInstance = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    // Authenticate
    console.log('Authenticating...');
    const authResponse = await axiosInstance.post('/jwt-api-token-auth/', {
      username,
      password,
    });
    
    const token = authResponse.data.token;
    console.log('Authentication successful!');
    
    // Set token for subsequent requests
    axiosInstance.defaults.headers.Authorization = `JWT ${token}`;
    
    // Fetch a few employees to see the data structure
    console.log('\nFetching employee data...');
    const response = await axiosInstance.get('/personnel/api/employees/', {
      params: {
        page: 1,
        limit: 10,
      },
    });
    
    console.log(`\nReceived ${response.data.data.length} employees`);
    console.log('\n📊 ANALYZING BIOTIME API RESPONSE STRUCTURE:\n');
    
    if (response.data.data && response.data.data.length > 0) {
      const firstEmployee = response.data.data[0];
      console.log('Available fields in employee data:');
      console.log(Object.keys(firstEmployee).join(', '));
      
      console.log('\n📋 FIRST EMPLOYEE FULL DATA:');
      console.log(JSON.stringify(firstEmployee, null, 2));
      
      // Store this data in employee_pull_ext
      console.log('\nStoring data in employee_pull_ext table...');
      
      for (const employee of response.data.data) {
        await db.insert(employeePullExt).values({
          biotimeId: employee.id?.toString() || null,
          employeeCode: employee.emp_code || null,
          allFields: employee,
        });
      }
      
      console.log(`✅ Stored ${response.data.data.length} records in employee_pull_ext`);
      
      // Now let's analyze what might contain CNIC and mobile data
      console.log('\n🔍 SEARCHING FOR CNIC AND MOBILE PATTERNS IN API DATA:\n');
      
      for (const employee of response.data.data) {
        console.log(`\nEmployee: ${employee.emp_code} - ${employee.first_name} ${employee.last_name}`);
        
        // Check all fields for 13-digit and 11-digit patterns
        for (const [key, value] of Object.entries(employee)) {
          if (value && typeof value === 'string') {
            // Check for 13-digit CNIC
            if (value.match(/\d{13}/)) {
              console.log(`  ✅ Possible CNIC in ${key}: ${value}`);
            }
            // Check for 11-digit mobile
            if (value.match(/03\d{9}/)) {
              console.log(`  ✅ Possible Mobile in ${key}: ${value}`);
            }
            // Check fields that might contain CNIC/mobile
            if (key.toLowerCase().includes('national') || 
                key.toLowerCase().includes('cnic') || 
                key.toLowerCase().includes('mobile') || 
                key.toLowerCase().includes('phone') ||
                key.toLowerCase().includes('contact')) {
              console.log(`  📍 ${key}: ${value}`);
            }
          }
        }
      }
      
      // Check if there are any custom fields
      console.log('\n📊 CHECKING FOR CUSTOM FIELDS:\n');
      
      for (const employee of response.data.data) {
        if (employee.extra_fields || employee.custom_fields || employee.additional_info) {
          console.log(`Employee ${employee.emp_code} has extra fields:`);
          console.log(JSON.stringify(employee.extra_fields || employee.custom_fields || employee.additional_info, null, 2));
        }
      }
      
    }
    
  } catch (error) {
    console.error("Error syncing data:", error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
  }
}

// Run the sync
syncAndCheckBiotimeData().then(() => {
  console.log("\n✅ Sync and analysis complete!");
  process.exit(0);
}).catch(error => {
  console.error("Script failed:", error);
  process.exit(1);
});