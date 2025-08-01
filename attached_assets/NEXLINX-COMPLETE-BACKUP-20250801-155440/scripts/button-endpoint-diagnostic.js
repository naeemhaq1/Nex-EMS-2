#!/usr/bin/env node

/**
 * COMPREHENSIVE BUTTON ENDPOINT DIAGNOSTIC TOOL
 * Systematically checks all interface buttons and their API endpoints
 */

import fs from 'fs';
import path from 'path';

console.log('🔍 COMPREHENSIVE BUTTON ENDPOINT DIAGNOSTIC');
console.log('===========================================');

/**
 * Recursively find all React component files
 */
function findAllInterfaceFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Skip node_modules, .git, and other non-source directories
      if (!['node_modules', '.git', 'dist', 'build', '.next'].includes(item)) {
        findAllInterfaceFiles(fullPath, files);
      }
    } else if (stat.isFile()) {
      // Include React component files
      if (item.match(/\.(tsx|ts|jsx|js)$/) && 
          !item.includes('.test.') && 
          !item.includes('.spec.') &&
          !item.includes('.d.ts')) {
        files.push(fullPath);
      }
    }
  }
  
  return files;
}

// Find ALL interface files automatically
const interfaceFiles = [
  ...findAllInterfaceFiles('client/src/pages'),
  ...findAllInterfaceFiles('client/src/components'),
  ...findAllInterfaceFiles('client/src/lib'),
  ...findAllInterfaceFiles('shared')
].filter(file => {
  // Only include files that likely contain UI components with buttons
  const content = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  return content.includes('Button') || 
         content.includes('onClick') || 
         content.includes('onSubmit') ||
         content.includes('apiRequest') ||
         content.includes('useMutation');
});

// Common API endpoint patterns to detect
const apiPatterns = [
  /apiRequest\(\s*['"](\/api\/[^'"]+)['"]/g,
  /apiRequest\(\s*{\s*url:\s*['"](\/api\/[^'"]+)['"]/g,
  /fetch\(['"](\/api\/[^'"]+)['"]/g,
  /axios\.[a-z]+\(['"](\/api\/[^'"]+)['"]/g,
  /useMutation\(\s*{\s*mutationFn:\s*\(\)\s*=>\s*apiRequest\(['"](\/api\/[^'"]+)['"]/g
];

// Button patterns to detect
const buttonPatterns = [
  /<Button[^>]*onClick={([^}]+)}>([^<]+)<\/Button>/g,
  /<button[^>]*onClick={([^}]+)}>([^<]+)<\/button>/g,
  /onClick:\s*([^,}\n]+)/g
];

// Store results
const diagnosticResults = {
  interfaces: {},
  missingEndpoints: [],
  workingEndpoints: [],
  totalButtons: 0,
  totalEndpoints: 0,
  issues: []
};

/**
 * Extract API endpoints from file content
 */
function extractApiEndpoints(content, filename) {
  const endpoints = new Set();
  
  apiPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      endpoints.add(match[1]);
    }
  });
  
  return Array.from(endpoints);
}

/**
 * Extract button information from file content
 */
function extractButtons(content, filename) {
  const buttons = [];
  
  // Extract onClick handlers and button text
  const buttonRegex = /<Button[^>]*onClick={([^}]+)}[^>]*>([^<]+)<\/Button>/g;
  let match;
  
  while ((match = buttonRegex.exec(content)) !== null) {
    buttons.push({
      handler: match[1].trim(),
      text: match[2].trim(),
      line: content.substring(0, match.index).split('\n').length
    });
  }
  
  return buttons;
}

/**
 * Map buttons to their API endpoints
 */
function mapButtonsToEndpoints(content, buttons, endpoints) {
  const mappings = [];
  
  buttons.forEach(button => {
    // Clean handler name, escaping special regex characters
    const handlerName = button.handler.replace(/\(\)|\s/g, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Skip complex inline handlers that aren't function names
    if (handlerName.includes('=') || handlerName.includes('{') || handlerName.includes('>')) {
      mappings.push({
        button: button.text,
        handler: button.handler,
        endpoints: [],
        line: button.line,
        hasEndpoint: false,
        issue: 'Inline handler - cannot trace endpoints'
      });
      return;
    }
    
    // Find function definition - simplified to avoid regex errors
    const simpleSearch = content.includes(`const ${handlerName.replace(/\\/g, '')} =`) || 
                        content.includes(`function ${handlerName.replace(/\\/g, '')}`) ||
                        content.includes(`${handlerName.replace(/\\/g, '')} =`);
    
    if (simpleSearch) {
      const usedEndpoints = endpoints.filter(endpoint => content.includes(endpoint));
      
      mappings.push({
        button: button.text,
        handler: button.handler,
        endpoints: usedEndpoints,
        line: button.line,
        hasEndpoint: usedEndpoints.length > 0
      });
    } else {
    
    if (funcMatch) {
      const funcBody = funcMatch[2];
      const usedEndpoints = endpoints.filter(endpoint => funcBody.includes(endpoint));
      
      mappings.push({
        button: button.text,
        handler: handlerName,
        endpoints: usedEndpoints,
        line: button.line,
        hasEndpoint: usedEndpoints.length > 0
      });
    } else {
      mappings.push({
        button: button.text,
        handler: handlerName,
        endpoints: [],
        line: button.line,
        hasEndpoint: false,
        issue: 'Handler function not found'
      });
    }
  });
  
  return mappings;
}

/**
 * Analyze a single interface file
 */
function analyzeInterface(filename) {
  console.log(`\n📁 Analyzing: ${filename}`);
  
  if (!fs.existsSync(filename)) {
    console.log(`❌ File not found: ${filename}`);
    diagnosticResults.issues.push(`File not found: ${filename}`);
    return;
  }
  
  const content = fs.readFileSync(filename, 'utf8');
  const endpoints = extractApiEndpoints(content, filename);
  const buttons = extractButtons(content, filename);
  const mappings = mapButtonsToEndpoints(content, buttons, endpoints);
  
  console.log(`   📊 Found ${buttons.length} buttons, ${endpoints.length} API endpoints`);
  
  // Store results
  diagnosticResults.interfaces[filename] = {
    buttons: buttons.length,
    endpoints: endpoints.length,
    mappings: mappings,
    allEndpoints: endpoints,
    workingCount: mappings.filter(m => m.hasEndpoint).length,
    brokenCount: mappings.filter(m => !m.hasEndpoint).length
  };
  
  diagnosticResults.totalButtons += buttons.length;
  diagnosticResults.totalEndpoints += endpoints.length;
  
  // Report issues
  mappings.forEach(mapping => {
    if (!mapping.hasEndpoint) {
      console.log(`   ❌ BROKEN: "${mapping.button}" (${mapping.handler}) - Line ${mapping.line}`);
      if (mapping.issue) {
        console.log(`      Issue: ${mapping.issue}`);
      }
    } else {
      console.log(`   ✅ WORKING: "${mapping.button}" -> ${mapping.endpoints.join(', ')}`);
    }
  });
}

/**
 * Check if server endpoints exist
 */
function checkServerEndpoints() {
  console.log('\n🔍 CHECKING SERVER ENDPOINTS');
  console.log('============================');
  
  const serverFiles = [
    'server/routes.ts',
    'server/routes/whatsappRoutes.ts',
    'server/routes/adminRoutes.ts',
    'server/routes/employeeRoutes.ts',
    'server/routes/announcementRoutes.ts'
  ];
  
  const allServerEndpoints = new Set();
  
  serverFiles.forEach(file => {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      
      // Extract route definitions
      const routePatterns = [
        /router\.(get|post|put|delete|patch)\(['"](\/api\/[^'"]+)['"]/g,
        /app\.(get|post|put|delete|patch)\(['"](\/api\/[^'"]+)['"]/g
      ];
      
      routePatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          allServerEndpoints.add(`${match[1].toUpperCase()} ${match[2]}`);
        }
      });
    }
  });
  
  console.log(`📊 Found ${allServerEndpoints.size} server endpoints`);
  
  // Check which frontend endpoints are missing
  const allFrontendEndpoints = new Set();
  Object.values(diagnosticResults.interfaces).forEach(iface => {
    iface.allEndpoints.forEach(endpoint => allFrontendEndpoints.add(endpoint));
  });
  
  console.log('\n🔍 ENDPOINT VERIFICATION:');
  allFrontendEndpoints.forEach(endpoint => {
    const hasGet = allServerEndpoints.has(`GET ${endpoint}`);
    const hasPost = allServerEndpoints.has(`POST ${endpoint}`);
    const hasPut = allServerEndpoints.has(`PUT ${endpoint}`);
    const hasDelete = allServerEndpoints.has(`DELETE ${endpoint}`);
    const hasAny = hasGet || hasPost || hasPut || hasDelete;
    
    if (hasAny) {
      const methods = [];
      if (hasGet) methods.push('GET');
      if (hasPost) methods.push('POST');
      if (hasPut) methods.push('PUT');
      if (hasDelete) methods.push('DELETE');
      console.log(`✅ ${endpoint} - Available methods: ${methods.join(', ')}`);
      diagnosticResults.workingEndpoints.push(endpoint);
    } else {
      console.log(`❌ MISSING: ${endpoint}`);
      diagnosticResults.missingEndpoints.push(endpoint);
    }
  });
}

/**
 * Generate comprehensive report
 */
function generateReport() {
  console.log('\n📊 COMPREHENSIVE DIAGNOSTIC REPORT');
  console.log('===================================');
  
  console.log(`\n📈 SUMMARY STATISTICS:`);
  console.log(`   Total Interfaces Analyzed: ${Object.keys(diagnosticResults.interfaces).length}`);
  console.log(`   Total Buttons Found: ${diagnosticResults.totalButtons}`);
  console.log(`   Total API Endpoints: ${diagnosticResults.totalEndpoints}`);
  console.log(`   Working Endpoints: ${diagnosticResults.workingEndpoints.length}`);
  console.log(`   Missing Endpoints: ${diagnosticResults.missingEndpoints.length}`);
  
  const totalBroken = Object.values(diagnosticResults.interfaces).reduce((sum, iface) => sum + iface.brokenCount, 0);
  const totalWorking = Object.values(diagnosticResults.interfaces).reduce((sum, iface) => sum + iface.workingCount, 0);
  
  console.log(`   Working Buttons: ${totalWorking}`);
  console.log(`   Broken Buttons: ${totalBroken}`);
  console.log(`   Success Rate: ${totalWorking > 0 ? ((totalWorking / (totalWorking + totalBroken)) * 100).toFixed(1) : 0}%`);
  
  console.log(`\n🚨 TOP ISSUES:`);
  
  // Find interfaces with most broken buttons
  const sortedInterfaces = Object.entries(diagnosticResults.interfaces)
    .sort((a, b) => b[1].brokenCount - a[1].brokenCount)
    .slice(0, 5);
  
  sortedInterfaces.forEach(([filename, data]) => {
    if (data.brokenCount > 0) {
      console.log(`   ${filename}: ${data.brokenCount} broken buttons out of ${data.buttons}`);
    }
  });
  
  if (diagnosticResults.missingEndpoints.length > 0) {
    console.log(`\n❌ MISSING SERVER ENDPOINTS (${diagnosticResults.missingEndpoints.length}):`);
    diagnosticResults.missingEndpoints.forEach(endpoint => {
      console.log(`   - ${endpoint}`);
    });
  }
  
  // Save detailed report to file
  const reportData = {
    timestamp: new Date().toISOString(),
    summary: {
      totalInterfaces: Object.keys(diagnosticResults.interfaces).length,
      totalButtons: diagnosticResults.totalButtons,
      totalEndpoints: diagnosticResults.totalEndpoints,
      workingButtons: totalWorking,
      brokenButtons: totalBroken,
      successRate: totalWorking > 0 ? ((totalWorking / (totalWorking + totalBroken)) * 100) : 0,
      workingEndpoints: diagnosticResults.workingEndpoints.length,
      missingEndpoints: diagnosticResults.missingEndpoints.length
    },
    interfaces: diagnosticResults.interfaces,
    missingEndpoints: diagnosticResults.missingEndpoints,
    workingEndpoints: diagnosticResults.workingEndpoints,
    issues: diagnosticResults.issues
  };
  
  fs.writeFileSync('logs/button-diagnostic-report.json', JSON.stringify(reportData, null, 2));
  console.log(`\n💾 Detailed report saved to: logs/button-diagnostic-report.json`);
}

/**
 * Main execution
 */
function main() {
  // Create logs directory if it doesn't exist
  if (!fs.existsSync('logs')) {
    fs.mkdirSync('logs');
  }
  
  // Analyze each interface
  interfaceFiles.forEach(analyzeInterface);
  
  // Check server endpoints
  checkServerEndpoints();
  
  // Generate comprehensive report
  generateReport();
  
  console.log('\n🏁 DIAGNOSTIC COMPLETE');
  console.log('======================');
  
  const totalBroken = Object.values(diagnosticResults.interfaces).reduce((sum, iface) => sum + iface.brokenCount, 0);
  
  if (totalBroken > 0) {
    console.log(`\n🚨 CRITICAL: ${totalBroken} broken buttons detected!`);
    console.log('   Check the detailed report for specific issues.');
    process.exit(1);
  } else {
    console.log('\n✅ All buttons appear to be properly connected to API endpoints.');
  }
}

// Run the diagnostic
main();