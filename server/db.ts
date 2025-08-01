import { drizzle } from "drizzle-orm/neon-serverless";
import { neon } from "@neondatabase/serverless";
import * as schema from "@shared/schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
}

// Use neon function for serverless
const sql = neon(connectionString);
export const db = drizzle(sql, { schema });

// Test connection
sql`SELECT 1`.then(() => {
  console.log('✅ Database connection verified');
}).catch((error) => {
  console.error('❌ Database connection failed:', error);
});