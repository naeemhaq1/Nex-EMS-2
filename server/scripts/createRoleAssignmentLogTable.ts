
import { sql } from '../db';

async function createRoleAssignmentLogTable() {
  try {
    console.log('Creating role_assignment_log table...');
    
    await sql`
      CREATE TABLE IF NOT EXISTS role_assignment_log (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES users(id),
        "roleId" VARCHAR(50) NOT NULL,
        "assignedBy" VARCHAR(255) NOT NULL,
        "assignedAt" TIMESTAMP DEFAULT NOW(),
        "accessScope" VARCHAR(20) DEFAULT 'global',
        "departmentRestrictions" TEXT[],
        "locationRestrictions" TEXT[],
        "specializedAccess" TEXT[],
        "action" VARCHAR(20) DEFAULT 'assigned',
        "notes" TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW()
      )
    `;

    console.log('✅ role_assignment_log table created successfully');

    // Create indexes for better performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_role_assignment_log_user_id 
      ON role_assignment_log("userId")
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_role_assignment_log_role_id 
      ON role_assignment_log("roleId")
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_role_assignment_log_assigned_at 
      ON role_assignment_log("assignedAt")
    `;

    console.log('✅ Indexes created successfully');

  } catch (error) {
    console.error('❌ Error creating role_assignment_log table:', error);
    throw error;
  }
}

// Run the script if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createRoleAssignmentLogTable()
    .then(() => {
      console.log('✅ Role assignment log table setup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Setup failed:', error);
      process.exit(1);
    });
}

export { createRoleAssignmentLogTable };
