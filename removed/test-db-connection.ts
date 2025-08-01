
import { db } from "./server/db";
import { sql } from "drizzle-orm";

async function testConnection() {
  try {
    console.log('Testing database connection...');
    
    // Simple query to test connection
    const result = await db.execute(sql`SELECT NOW() as current_time`);
    console.log('✅ Database connection successful!');
    console.log('Current database time:', result.rows[0]);
    
    // Test if tables exist
    const tableCheck = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      LIMIT 5
    `);
    
    console.log('Available tables:', tableCheck.rows.map(row => row.table_name));
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  }
}

testConnection();
