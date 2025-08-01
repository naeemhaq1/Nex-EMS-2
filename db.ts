
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "./shared/schema";

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

// Get DATABASE_URL from environment variables (Replit secrets)
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL must be set in Replit Secrets. Please add your Neon database URL to secrets."
  );
}

console.log('🔌 Connecting to database...');

// Create the connection pool
export const pool = new Pool({ connectionString });

// Create the drizzle database instance
export const db = drizzle({ client: pool, schema });

// Test connection function
export async function testConnection() {
  try {
    console.log('🧪 Testing database connection...');
    const result = await db.execute({ sql: 'SELECT NOW() as current_time', args: [] });
    console.log('✅ Database connection successful!');
    console.log('⏰ Current database time:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

// Initialize connection test on startup
testConnection().catch(console.error);
