import { biotimeService } from "./services/biotime";

async function syncEmployeesManually() {
  console.log("Starting manual employee sync...");
  
  try {
    const result = await biotimeService.syncEmployees();
    
    if (result.success) {
      console.log(`✅ Sync completed successfully!`);
      console.log(`   Processed: ${result.processed} employees`);
      console.log(`   Total: ${result.total} employees`);
    } else {
      console.log(`❌ Sync failed!`);
    }
  } catch (error) {
    console.error("Error during sync:", error);
  }
}

// Run the sync
syncEmployeesManually().then(() => {
  console.log("Sync process completed");
  process.exit(0);
}).catch(error => {
  console.error("Sync failed:", error);
  process.exit(1);
});