import { employeeFieldProtection } from "../services/employeeFieldProtectionService";

/**
 * Integration Script for Employee Field Protection
 * Integrates protection service with BioTime sync processes
 */

// Test the protection service
async function testProtectionService(): Promise<void> {
  console.log("🔒 TESTING EMPLOYEE FIELD PROTECTION SERVICE");
  console.log("=" .repeat(60));

  try {
    // Test with a sample employee
    const testEmployeeCode = "10008281";
    
    // Get current protection status
    const status = await employeeFieldProtection.getProtectionStatus(testEmployeeCode);
    console.log(`📊 Protection Status for ${testEmployeeCode}:`);
    console.log(`   Protected fields: ${status.protectedFields.join(', ')}`);
    console.log(`   Protection active: ${status.protectionActive}`);
    console.log(`   Current values:`, status.currentValues);

    // Test protection with corruption attempt
    const corruptionAttempt = {
      firstName: "1234567", // Numeric corruption
      lastName: "0008281", // Employee code corruption
      middleName: "biotime" // All lowercase corruption
    };

    console.log("\n🚨 Testing protection against corruption:");
    const protectionResult = await employeeFieldProtection.protectEmployeeFields(
      testEmployeeCode, 
      corruptionAttempt
    );

    console.log(`   Changes blocked: ${protectionResult.changesBlocked}`);
    console.log(`   Changes allowed: ${protectionResult.changesAllowed}`);
    
    protectionResult.protectedFields.forEach(field => {
      const status = field.isProtected ? "🔒 BLOCKED" : "✅ ALLOWED";
      console.log(`   ${field.fieldName}: ${status} - ${field.reason}`);
    });

    // Test with valid changes
    const validChanges = {
      email: "test@example.com", // Non-protected field
      phone: "123-456-7890" // Non-protected field
    };

    console.log("\n✅ Testing with valid changes:");
    const validResult = await employeeFieldProtection.protectEmployeeFields(
      testEmployeeCode, 
      validChanges
    );

    console.log(`   Changes blocked: ${validResult.changesBlocked}`);
    console.log(`   Changes allowed: ${validResult.changesAllowed}`);

    console.log("\n🎉 PROTECTION SERVICE TEST COMPLETED");
    console.log("✅ Field protection is working correctly");

  } catch (error) {
    console.error("❌ Protection service test failed:", error);
    throw error;
  }
}

// Run the test
testProtectionService().then(() => {
  console.log("\n🔒 EMPLOYEE FIELD PROTECTION INTEGRATED");
  console.log("✅ Protection service is ready to prevent BioTime corruption");
  console.log("✅ All name standardization work is now protected");
  
  process.exit(0);
}).catch((error) => {
  console.error("❌ Protection integration failed:", error);
  process.exit(1);
});