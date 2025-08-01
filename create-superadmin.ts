import { db } from "./db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

async function createSuperAdmin() {
  try {
    console.log("Creating SuperAdmin user 'master'...");
    
    // Check if master user already exists
    const existingUser = await db.select().from(users).where(eq(users.username, "master"));
    
    if (existingUser.length > 0) {
      console.log("Master user already exists. Updating role to superadmin...");
      
      // Update existing user to superadmin role
      await db
        .update(users)
        .set({ 
          role: "superadmin",
          isActive: true
        })
        .where(eq(users.username, "master"));
      
      console.log("✓ Master user updated to SuperAdmin role");
    } else {
      // Create new master user
      const hashedPassword = await bcrypt.hash("Empl0yees#", 10);
      
      await db.insert(users).values({
        username: "master",
        password: hashedPassword,
        role: "superadmin",
        isActive: true
      });
      
      console.log("✓ Master SuperAdmin user created successfully");
    }
    
    console.log("SuperAdmin setup complete!");
    console.log("Login credentials:");
    console.log("  Username: master");
    console.log("  Password: Empl0yees#");
    console.log("  Role: superadmin");
    
  } catch (error) {
    console.error("Error creating SuperAdmin:", error);
    process.exit(1);
  }
}

// Run the function
createSuperAdmin().then(() => {
  console.log("SuperAdmin creation completed");
  process.exit(0);
});