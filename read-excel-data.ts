import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { execSync } from 'child_process';

// First, let's try to convert the Excel file to CSV using Python
const xlsxPath = path.join(process.cwd(), 'attached_assets/PSCA Employee-short_1752005943862.xlsx');
const csvPath = path.join(process.cwd(), 'attached_assets/psca-employees.csv');

try {
  // Try to convert using Python pandas
  const pythonScript = `
import pandas as pd
df = pd.read_excel('${xlsxPath}')
df.to_csv('${csvPath}', index=False)
print("Excel file converted successfully")
print(f"Columns: {list(df.columns)}")
print(f"Rows: {len(df)}")
`;

  execSync(`python3 -c "${pythonScript}"`, { stdio: 'inherit' });
  
  // Read the CSV file
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  console.log('\nFirst few lines of CSV:');
  console.log(csvContent.split('\n').slice(0, 5).join('\n'));
  
} catch (error) {
  console.error('Error converting Excel file:', error);
  
  // Alternative: try using libreoffice
  try {
    console.log('\nTrying with LibreOffice...');
    execSync(`libreoffice --headless --convert-to csv --outdir attached_assets "${xlsxPath}"`, { stdio: 'inherit' });
  } catch (err) {
    console.error('LibreOffice conversion also failed:', err);
  }
}