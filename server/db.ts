import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Ensure DATABASE_URL is available
const databaseUrl = process.env.DATABASE_URL;
console.log('DATABASE_URL check:', databaseUrl ? 'Present' : 'Missing');

if (!databaseUrl) {
  console.error('Environment variables available:', Object.keys(process.env).filter(key => key.includes('DATABASE')));
  throw new Error(
    "DATABASE_URL must be set. Please check your .env file and ensure DATABASE_URL is properly configured.",
  );
}

export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle({ client: pool, schema });

console.log('✅ Database connection pool created successfully');