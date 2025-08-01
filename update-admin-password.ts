
import { db } from "./db";
import { users } from "./shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

async function updateAdminPassword() {
  try {
    console.log("Updating admin password...");
    
    // Hash the new password
    const newPassword = "admin123";
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update the admin user's password
    const result = await db
      .update(users)
      .set({ 
        password: hashedPassword,
        isTemporaryPassword: false,
        lastPasswordChange: new Date()
      })
      .where(eq(users.username, "admin"))
      .returning();
    
    if (result.length > 0) {
      console.log("✓ Admin password updated successfully");
      console.log("  Username: admin");
      console.log("  New Password: admin123");
    } else {
      console.log("✗ Admin user not found");
    }
    
    process.exit(0);
  } catch (error) {
    console.error("Error updating admin password:", error);
    process.exit(1);
  }
}

updateAdminPassword();
