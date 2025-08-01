import { storage } from "./storage";
import bcrypt from "bcrypt";

async function createTestEmployee() {
  try {
    console.log("Creating test employee user account...");
    
    // Check if user already exists
    const existingUser = await storage.getUserByUsername("test");
    if (existingUser) {
      console.log("✓ Test employee user account already exists");
      console.log("  Username: test");
      console.log("  Password: test");
      console.log("  Role: employee");
      console.log("  User ID:", existingUser.id);
      return;
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash("test", 10);
    
    // Create user account
    const user = await storage.createUser({
      username: "test",
      password: hashedPassword,
      role: "employee"
    });
    
    console.log("✓ Test employee user account created successfully");
    console.log("  Username: test");
    console.log("  Password: test");
    console.log("  Role: employee");
    console.log("  User ID:", user.id);
    
  } catch (error) {
    console.error("Error creating test employee:", error);
  }
}

// Run the script
createTestEmployee();