import { drizzle } from "drizzle-orm/neon-serverless";
import { neon } from "@neondatabase/serverless";
import * as schema from "@shared/schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
}

// Create the SQL connection
export const sql = neon(connectionString);

// Create the drizzle database instance
export const db = drizzle(sql, { schema });

// Test connection on startup
async function testConnection() {
  try {
    const result = await sql`SELECT 1 as test`;
    console.log('✅ Database connection verified');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

// Initialize connection test
testConnection().catch(console.error);

// For backward compatibility with existing code that expects pool
// Create a pool-compatible wrapper for the session store
export const pool = {
  query: async (text: string, params?: any[]) => {
    try {
      // Use the template literal syntax for Neon instead of unsafe
      let result;
      if (params && params.length > 0) {
        // For parameterized queries, we need to handle them differently
        // Since Neon doesn't have unsafe, we'll use the sql template function
        result = await sql(text, params);
      } else {
        // For non-parameterized queries, use the sql template directly
        result = await sql([text] as any);
      }
      
      // Convert Neon result format to pg-compatible format
      return {
        rows: Array.isArray(result) ? result : [result],
        rowCount: Array.isArray(result) ? result.length : (result ? 1 : 0),
        command: text.trim().split(' ')[0].toUpperCase(),
        fields: [],
        oid: 0
      };
    } catch (error) {
      console.error('Pool query error:', error);
      throw error;
    }
  },
  end: () => Promise.resolve(),
  connect: () => Promise.resolve({ 
    query: async (text: string, params?: any[]) => {
      let result;
      if (params && params.length > 0) {
        result = await sql(text, params);
      } else {
        result = await sql([text] as any);
      }
      return {
        rows: Array.isArray(result) ? result : [result],
        rowCount: Array.isArray(result) ? result.length : (result ? 1 : 0),
        command: text.trim().split(' ')[0].toUpperCase(),
        fields: [],
        oid: 0
      };
    },
    release: () => {}
  })
};