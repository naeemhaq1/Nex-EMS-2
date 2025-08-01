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