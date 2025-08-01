
import { db, testConnection } from './db.js';
import { sql } from 'drizzle-orm';

async function runDatabaseTest() {
  console.log('🚀 Starting database connection test...\n');
  
  try {
    // Test basic connection
    const connectionSuccess = await testConnection();
    
    if (!connectionSuccess) {
      console.log('❌ Basic connection test failed');
      return;
    }
    
    // Test table queries
    console.log('\n📋 Checking available tables...');
    const tableCheck = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
      LIMIT 10
    `);
    
    if (tableCheck.rows.length > 0) {
      console.log('📊 Available tables:', tableCheck.rows.map(row => row.table_name));
    } else {
      console.log('📝 No tables found - you may need to run migrations');
    }
    
    console.log('\n✅ Database test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Database test failed:', error);
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Check if DATABASE_URL is set in Replit Secrets');
    console.log('2. Verify your Neon database is active');
    console.log('3. Ensure your database URL is correct');
  }
}

// Run the test
runDatabaseTest();
