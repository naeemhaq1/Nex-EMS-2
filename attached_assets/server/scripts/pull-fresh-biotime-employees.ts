import { bioTimeService } from "../services/biotimeService";

async function pullFreshBioTimeEmployees() {
  try {
    console.log("🚀 PULLING FRESH EMPLOYEE DATA FROM BIOTIME API");
    console.log("=" .repeat(60));
    
    // Pull fresh employee data from BioTime
    console.log("📡 Connecting to BioTime employee endpoint...");
    const result = await bioTimeService.pullEmployeeData();
    
    if (!result.success) {
      console.error(`❌ Failed to pull employee data: ${result.error}`);
      process.exit(1);
    }
    
    console.log(`✅ Successfully pulled ${result.recordsPulled} employee records`);
    
    // Validate the data quality
    console.log("\n🔍 VALIDATING DATA QUALITY...");
    const validation = await bioTimeService.validateEmployeeNames();
    
    console.log(`📊 VALIDATION RESULTS:`);
    console.log(`   Total records: ${validation.total}`);
    console.log(`   Valid records: ${validation.valid}`);
    console.log(`   Corrupted records: ${validation.corrupted}`);
    console.log(`   Data quality: ${Math.round((validation.valid / validation.total) * 100)}%`);
    
    // Show corrupted records
    if (validation.corruptedRecords.length > 0) {
      console.log(`\n⚠️  CORRUPTED RECORDS (${validation.corruptedRecords.length}):`);
      validation.corruptedRecords.slice(0, 20).forEach(record => {
        console.log(`   ${record.empCode}: "${record.firstName}" "${record.lastName}" (${record.nickname}) - ${record.issue}`);
      });
      
      if (validation.corruptedRecords.length > 20) {
        console.log(`   ... and ${validation.corruptedRecords.length - 20} more corrupted records`);
      }
    }
    
    // Recommendations
    console.log("\n💡 RECOMMENDATIONS:");
    
    const qualityScore = Math.round((validation.valid / validation.total) * 100);
    
    if (qualityScore >= 90) {
      console.log("   ✅ BioTime employee data quality is good - proceed with using this data");
    } else if (qualityScore >= 70) {
      console.log("   ⚠️  BioTime employee data has some issues - consider hybrid approach");
    } else {
      console.log("   ❌ BioTime employee data quality is poor - use alternative data sources");
    }
    
    // Check for specific corruption patterns
    const lowercaseLastNames = validation.corruptedRecords.filter(r => 
      r.issue.includes('lastName does not start with uppercase')
    );
    
    if (lowercaseLastNames.length > 0) {
      console.log(`   ⚠️  Found ${lowercaseLastNames.length} records with lowercase lastName (corruption indicator)`);
    }
    
    const missingNames = validation.corruptedRecords.filter(r => 
      r.issue.includes('missing')
    );
    
    if (missingNames.length > 0) {
      console.log(`   ⚠️  Found ${missingNames.length} records with missing name fields`);
    }
    
    // Sample of good records
    if (validation.valid > 0) {
      console.log(`\n✅ SAMPLE OF VALID RECORDS:`);
      
      // Get a few valid records to show
      const { db } = await import("../db");
      const { employeePullExt } = await import("../../shared/schema");
      
      const sampleRecords = await db
        .select({
          empCode: employeePullExt.empCode,
          firstName: employeePullExt.firstName,
          lastName: employeePullExt.lastName,
          nickname: employeePullExt.nickname
        })
        .from(employeePullExt)
        .limit(10);
      
      sampleRecords.forEach(record => {
        // Check if this record is valid
        const isValid = record.firstName && 
                       record.firstName.length >= 2 && 
                       (record.lastName?.charAt(0) === record.lastName?.charAt(0).toUpperCase() || 
                        (record.nickname && record.nickname !== 'null'));
        
        if (isValid) {
          console.log(`   ${record.empCode}: "${record.firstName}" "${record.lastName}" (${record.nickname})`);
        }
      });
    }
    
  } catch (error) {
    console.error("❌ Error pulling fresh BioTime employees:", error);
    process.exit(1);
  }
}

pullFreshBioTimeEmployees().then(() => {
  console.log("\n✅ Fresh BioTime employee data pull completed");
  process.exit(0);
});