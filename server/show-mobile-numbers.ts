import axios from "axios";

async function showMobileNumbers() {
  console.log("=== Mobile Numbers from BioTime API ===\n");
  
  try {
    // Fetch the HTML page with employee data
    console.log("🌐 Fetching employee data from BioTime API...");
    
    const response = await axios.get('http://202.59.80.69/employees.aspx', {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    });
    
    console.log(`✅ HTML response received (${response.data.length} characters)`);
    
    // Extract mobile numbers and employee codes from HTML
    const htmlContent = response.data;
    
    // Find all mobile numbers (Pakistani format - 11 digits total: 03xxxxxxxxx)
    const mobileNumbers = htmlContent.match(/03\d{9}/g) || [];
    
    // Find all employee codes
    const employeeCodes = htmlContent.match(/10\d{6}/g) || [];
    
    console.log(`📱 Found ${mobileNumbers.length} mobile numbers`);
    console.log(`👥 Found ${employeeCodes.length} employee codes`);
    
    // Try to extract structured data from HTML table
    const employeeDataRegex = /<tr[^>]*>[\s\S]*?<\/tr>/gi;
    const tableRows = htmlContent.match(employeeDataRegex) || [];
    
    const employees = [];
    
    for (const row of tableRows) {
      // Extract cell contents
      const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
      const cells = [];
      let cellMatch;
      
      while ((cellMatch = cellRegex.exec(row)) !== null) {
        const cellContent = cellMatch[1]
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .trim();
        cells.push(cellContent);
      }
      
      // Look for employee code and mobile number in this row
      const empCode = cells.find(cell => cell.match(/^10\d{6}$/));
      const mobile = cells.find(cell => cell.match(/^03\d{9}$/)); // 11 digits total
      const name = cells.find(cell => 
        cell && 
        cell.length > 2 && 
        !cell.match(/^\d+$/) && 
        !cell.match(/^03\d{9}$/) &&
        !cell.includes('Department') &&
        !cell.includes('Employee')
      );
      
      if (empCode && mobile) {
        employees.push({
          empCode,
          mobile,
          name: name || 'Unknown'
        });
      }
    }
    
    console.log(`\n📋 Extracted ${employees.length} employee records with mobile numbers:`);
    console.log("=".repeat(80));
    console.log("Employee Code | Mobile Number | Name");
    console.log("=".repeat(80));
    
    // Show first 50 records
    employees.slice(0, 50).forEach((emp, index) => {
      console.log(`${(index + 1).toString().padStart(3)}. ${emp.empCode} | ${emp.mobile} | ${emp.name}`);
    });
    
    if (employees.length > 50) {
      console.log(`... and ${employees.length - 50} more records`);
    }
    
    console.log("=".repeat(80));
    
    // Show unique mobile numbers
    const uniqueMobiles = [...new Set(mobileNumbers)];
    console.log(`\n📱 All ${uniqueMobiles.length} unique mobile numbers:`);
    console.log("-".repeat(50));
    
    uniqueMobiles.slice(0, 100).forEach((mobile, index) => {
      if (index % 5 === 0) console.log(); // New line every 5 numbers
      process.stdout.write(`${mobile.padEnd(12)}`);
    });
    
    if (uniqueMobiles.length > 100) {
      console.log(`\n... and ${uniqueMobiles.length - 100} more numbers`);
    }
    
    console.log("\n" + "-".repeat(50));
    
    // Department analysis if available
    const departments = htmlContent.match(/LHE-[A-Z]+|FSD|PSH|ISB-[A-Z]+|KHI-[A-Z]+/g) || [];
    const uniqueDepartments = [...new Set(departments)];
    
    if (uniqueDepartments.length > 0) {
      console.log(`\n🏢 Departments found: ${uniqueDepartments.length}`);
      uniqueDepartments.slice(0, 20).forEach(dept => {
        console.log(`   ${dept}`);
      });
    }
    
    console.log(`\n✅ Ready to import ${employees.length} mobile numbers!`);
    
  } catch (error) {
    console.error("❌ Error fetching mobile numbers:", error);
  }
}

// Run the display
showMobileNumbers().then(() => {
  console.log("\n✅ Mobile number display complete!");
  process.exit(0);
}).catch(error => {
  console.error("Script failed:", error);
  process.exit(1);
});