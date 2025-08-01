import { db } from './db';
import { employeeRecords } from '../shared/schema';
import { eq } from 'drizzle-orm';

// Data from the image - focusing on the missing employees
const imageData = [
  { name: "Mr. Rashid Ali", designation: "Ofc Helper" },
  { name: "Mr. Babar Iqbal", designation: "Ofc Driver" },
  { name: "Mr. Ali Hamza", designation: "Ofc Helper" },
  { name: "Mr. IKHLAQ HUSSAIN", designation: "Ofc Driver" },
  { name: "Mr. Muhammad Saeed Khan", designation: "Ofc Driver" },
  { name: "Mr. Faizullah", designation: "Ofc Helper" },
  { name: "Mr. ZEESHAN", designation: "Ofc Helper" },
  { name: "Mr. Salman Ali Farooqi", designation: "Ofc Technician" },
  { name: "Mr. Shah Zain", designation: "Ofc Helper" }
];

function normalizeNameForMatching(name: string): string {
  return name.toLowerCase()
    .replace(/\bmr\./g, '') // Remove "Mr."
    .replace(/\bsyed\b/g, '') // Remove "Syed"
    .replace(/\bmuhammad\b/g, '') // Remove "Muhammad"
    .replace(/\bmohammad\b/g, '') // Remove "Mohammad"
    .replace(/\braja\b/g, '') // Remove "Raja"
    .replace(/\bsheikh\b/g, '') // Remove "Sheikh"
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Multiple spaces to single space
    .trim();
}

async function matchWithNewImageData() {
  console.log('🔍 Matching remaining LHE-OFC employees with new image data...\n');
  
  // Get the 2 remaining employees without designations
  const unmatchedEmployees = await db.select().from(employeeRecords)
    .where(eq(employeeRecords.department, 'LHE-OFC'));
  
  const remainingEmployees = unmatchedEmployees.filter(emp => 
    !emp.designation || emp.designation === ''
  );
  
  console.log(`📋 Found ${remainingEmployees.length} employees without designations:`);
  remainingEmployees.forEach(emp => {
    console.log(`   ${emp.employeeCode}: "${emp.firstName} ${emp.lastName}"`);
  });
  
  console.log('\n🔍 Matching with image data:\n');
  
  const matches = [];
  
  for (const emp of remainingEmployees) {
    const empFullName = `${emp.firstName} ${emp.lastName}`;
    const empNormalized = normalizeNameForMatching(empFullName);
    
    console.log(`Looking for matches for: ${emp.employeeCode} - "${empFullName}"`);
    console.log(`   Normalized: "${empNormalized}"`);
    
    // Find potential matches in image data
    const potentialMatches = [];
    
    for (const imageItem of imageData) {
      const imageNormalized = normalizeNameForMatching(imageItem.name);
      
      // Check for exact match or partial match
      if (empNormalized === imageNormalized) {
        potentialMatches.push({
          imageItem,
          matchType: 'exact',
          confidence: 100
        });
      } else if (empNormalized.includes(imageNormalized.split(' ')[0]) || 
                 imageNormalized.includes(empNormalized.split(' ')[0])) {
        potentialMatches.push({
          imageItem,
          matchType: 'partial',
          confidence: 80
        });
      }
    }
    
    if (potentialMatches.length > 0) {
      console.log(`   Found ${potentialMatches.length} potential matches:`);
      potentialMatches.forEach((match, index) => {
        console.log(`   ${index + 1}. "${match.imageItem.name}" -> ${match.imageItem.designation} (${match.matchType}, ${match.confidence}%)`);
        console.log(`      Image normalized: "${normalizeNameForMatching(match.imageItem.name)}"`);
      });
      
      // Add best match to results
      const bestMatch = potentialMatches.sort((a, b) => b.confidence - a.confidence)[0];
      matches.push({
        employeeCode: emp.employeeCode,
        currentName: empFullName,
        matchedName: bestMatch.imageItem.name,
        designation: bestMatch.imageItem.designation,
        confidence: bestMatch.confidence
      });
    } else {
      console.log(`   No matches found`);
    }
    console.log('');
  }
  
  console.log('\n🎯 FINAL MATCHES TO UPDATE:\n');
  
  if (matches.length > 0) {
    for (const match of matches) {
      console.log(`${match.employeeCode}: "${match.currentName}" -> "${match.matchedName}"`);
      console.log(`   Designation: ${match.designation} (${match.confidence}% confidence)`);
      
      // Update the employee
      try {
        await db.update(employeeRecords)
          .set({ designation: match.designation })
          .where(eq(employeeRecords.employeeCode, match.employeeCode));
        
        console.log(`   ✅ Updated successfully`);
      } catch (error) {
        console.log(`   ❌ Error updating: ${error}`);
      }
      console.log('');
    }
  } else {
    console.log('No matches found to update.');
  }
  
  // Check final status
  const finalCheck = await db.select().from(employeeRecords)
    .where(eq(employeeRecords.department, 'LHE-OFC'));
  
  const totalEmployees = finalCheck.length;
  const withDesignations = finalCheck.filter(emp => emp.designation && emp.designation !== '').length;
  const percentage = Math.round((withDesignations / totalEmployees) * 100);
  
  console.log('\n📊 FINAL LHE-OFC DESIGNATION COVERAGE:');
  console.log(`   Total employees: ${totalEmployees}`);
  console.log(`   With designations: ${withDesignations}`);
  console.log(`   Coverage: ${percentage}%`);
  
  if (percentage === 100) {
    console.log('   🎉 COMPLETE! All LHE-OFC employees now have designations!');
  } else {
    const stillMissing = finalCheck.filter(emp => !emp.designation || emp.designation === '');
    console.log(`   Still missing: ${stillMissing.length} employees`);
    stillMissing.forEach(emp => {
      console.log(`     ${emp.employeeCode}: "${emp.firstName} ${emp.lastName}"`);
    });
  }
}

matchWithNewImageData().catch(console.error);