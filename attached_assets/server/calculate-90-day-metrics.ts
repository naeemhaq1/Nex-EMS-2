#!/usr/bin/env tsx

import { calculateLast90DaysMetrics } from "./services/dailyAttendanceMetrics";

async function main() {
  console.log("Starting 90-day metrics calculation...");
  
  try {
    await calculateLast90DaysMetrics();
    console.log("✅ Successfully calculated metrics for the last 90 days!");
  } catch (error) {
    console.error("❌ Error calculating metrics:", error);
    process.exit(1);
  }
}

main();