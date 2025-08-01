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
      // Use the sql function directly with proper parameter handling
      let result;
      if (params && params.length > 0) {
        // For parameterized queries - handle params properly
        result = await sql(text, params);
      } else {
        // For non-parameterized queries - use direct query
        result = await sql([text] as any);
      }

      // Ensure result is always an array and properly formatted
      const rows = Array.isArray(result) ? result : (result ? [result] : []);
      
      // Convert Neon result format to pg-compatible format
      return {
        rows: rows,
        rowCount: rows.length,
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
      
      const rows = Array.isArray(result) ? result : (result ? [result] : []);
      
      return {
        rows: rows,
        rowCount: rows.length,
        command: text.trim().split(' ')[0].toUpperCase(),
        fields: [],
        oid: 0
      };
    },
    release: () => {}
  })
};