import { drizzle } from "drizzle-orm/neon-serverless";
import { neon } from "@neondatabase/serverless";
import { Pool } from "pg";
import * as schema from "@shared/schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
}

console.log('✅ Database connection configured successfully');

// Use neon for serverless environments  
const sql = neon(connectionString);
export const db = drizzle(sql, {
  schema,
  logger: false // Disable query logging for cleaner output
});

// Also export pool for session store
export const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});