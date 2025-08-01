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
      const result = await sql.unsafe(text, params);
      // Convert Neon result format to pg-compatible format
      return {
        rows: Array.isArray(result) ? result : [result],
        rowCount: Array.isArray(result) ? result.length : 1,
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
      const result = await sql.unsafe(text, params);
      return {
        rows: Array.isArray(result) ? result : [result],
        rowCount: Array.isArray(result) ? result.length : 1,
        command: text.trim().split(' ')[0].toUpperCase(),
        fields: [],
        oid: 0
      };
    },
    release: () => {}
  })
};