import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import * as schema from "@shared/schema";

const connectionString = process.env.DATABASE_URL || "postgresql://username:password@localhost/database";

export const pool = new Pool({ 
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const db = drizzle(pool, { schema });

// Test connection on startup
pool.query('SELECT 1').then(() => {
  console.log('✅ Database connection verified');
}).catch((error) => {
  console.error('❌ Database connection failed:', error);
});