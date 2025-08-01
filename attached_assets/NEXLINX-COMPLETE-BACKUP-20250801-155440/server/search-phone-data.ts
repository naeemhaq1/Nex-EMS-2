import { db } from "./db";
import { employeeRecords, employeePullExt } from "@shared/schema";
import { like, or, and, eq, isNotNull } from "drizzle-orm";

async function searchPhoneData() {
  console.log("Searching for mobile phone and contact information starting with 03...\n");
  
  // Search in employee_records table
  console.log("=== SEARCHING IN EMPLOYEE_RECORDS TABLE ===");
  const employeeRecordsWithPhone = await db
    .select({
      employeeCode: employeeRecords.employeeCode,
      firstName: employeeRecords.firstName,
      middleName: employeeRecords.middleName,
      lastName: employeeRecords.lastName,
      department: employeeRecords.department,
      phone: employeeRecords.phone,
      nationalId: employeeRecords.nationalId
    })
    .from(employeeRecords)
    .where(
      and(
        eq(employeeRecords.isActive, true),
        or(
          like(employeeRecords.phone, '03%'),
          like(employeeRecords.phone, '%03%')
        )
      )
    )
    .orderBy(employeeRecords.employeeCode);
  
  console.log(`Found ${employeeRecordsWithPhone.length} employees with phone numbers containing '03':`);
  employeeRecordsWithPhone.forEach(emp => {
    const fullName = `${emp.firstName || ''} ${emp.middleName || ''} ${emp.lastName || ''}`.trim();
    const hasNationalId = emp.nationalId && emp.nationalId.trim() !== '';
    console.log(`${emp.employeeCode}: ${fullName} (${emp.department})`);
    console.log(`  Phone: ${emp.phone}`);
    console.log(`  National ID: ${hasNationalId ? 'Present' : 'MISSING'}`);
    console.log('');
  });
  
  // Search in employee_pull_ext table (mobile field)
  console.log("\n=== SEARCHING IN EMPLOYEE_PULL_EXT TABLE (mobile field) ===");
  const pullExtMobile = await db
    .select({
      empCode: employeePullExt.empCode,
      firstName: employeePullExt.firstName,
      lastName: employeePullExt.lastName,
      mobile: employeePullExt.mobile,
      national: employeePullExt.national,
      department: employeePullExt.department
    })
    .from(employeePullExt)
    .where(
      and(
        isNotNull(employeePullExt.mobile),
        or(
          like(employeePullExt.mobile, '03%'),
          like(employeePullExt.mobile, '%03%')
        )
      )
    )
    .orderBy(employeePullExt.empCode);
  
  console.log(`Found ${pullExtMobile.length} employees with mobile numbers containing '03':`);
  pullExtMobile.forEach(emp => {
    const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
    const hasNational = emp.national && emp.national.trim() !== '';
    const deptInfo = emp.department ? JSON.stringify(emp.department) : 'No dept info';
    console.log(`${emp.empCode}: ${fullName}`);
    console.log(`  Mobile: ${emp.mobile}`);
    console.log(`  National: ${hasNational ? emp.national : 'MISSING'}`);
    console.log(`  Department: ${deptInfo}`);
    console.log('');
  });
  
  // Search in employee_pull_ext table (contact_tel field)
  console.log("\n=== SEARCHING IN EMPLOYEE_PULL_EXT TABLE (contact_tel field) ===");
  const pullExtContactTel = await db
    .select({
      empCode: employeePullExt.empCode,
      firstName: employeePullExt.firstName,
      lastName: employeePullExt.lastName,
      contactTel: employeePullExt.contactTel,
      national: employeePullExt.national,
      department: employeePullExt.department
    })
    .from(employeePullExt)
    .where(
      and(
        isNotNull(employeePullExt.contactTel),
        or(
          like(employeePullExt.contactTel, '03%'),
          like(employeePullExt.contactTel, '%03%')
        )
      )
    )
    .orderBy(employeePullExt.empCode);
  
  console.log(`Found ${pullExtContactTel.length} employees with contact_tel numbers containing '03':`);
  pullExtContactTel.forEach(emp => {
    const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
    const hasNational = emp.national && emp.national.trim() !== '';
    const deptInfo = emp.department ? JSON.stringify(emp.department) : 'No dept info';
    console.log(`${emp.empCode}: ${fullName}`);
    console.log(`  Contact Tel: ${emp.contactTel}`);
    console.log(`  National: ${hasNational ? emp.national : 'MISSING'}`);
    console.log(`  Department: ${deptInfo}`);
    console.log('');
  });
  
  // Search in employee_pull_ext table (office_tel field)
  console.log("\n=== SEARCHING IN EMPLOYEE_PULL_EXT TABLE (office_tel field) ===");
  const pullExtOfficeTel = await db
    .select({
      empCode: employeePullExt.empCode,
      firstName: employeePullExt.firstName,
      lastName: employeePullExt.lastName,
      officeTel: employeePullExt.officeTel,
      national: employeePullExt.national,
      department: employeePullExt.department
    })
    .from(employeePullExt)
    .where(
      and(
        isNotNull(employeePullExt.officeTel),
        or(
          like(employeePullExt.officeTel, '03%'),
          like(employeePullExt.officeTel, '%03%')
        )
      )
    )
    .orderBy(employeePullExt.empCode);
  
  console.log(`Found ${pullExtOfficeTel.length} employees with office_tel numbers containing '03':`);
  pullExtOfficeTel.forEach(emp => {
    const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
    const hasNational = emp.national && emp.national.trim() !== '';
    const deptInfo = emp.department ? JSON.stringify(emp.department) : 'No dept info';
    console.log(`${emp.empCode}: ${fullName}`);
    console.log(`  Office Tel: ${emp.officeTel}`);
    console.log(`  National: ${hasNational ? emp.national : 'MISSING'}`);
    console.log(`  Department: ${deptInfo}`);
    console.log('');
  });
  
  // Summary
  console.log("\n=== SUMMARY ===");
  console.log(`Employee Records with phone (03): ${employeeRecordsWithPhone.length}`);
  console.log(`Pull Ext Mobile (03): ${pullExtMobile.length}`);
  console.log(`Pull Ext Contact Tel (03): ${pullExtContactTel.length}`);
  console.log(`Pull Ext Office Tel (03): ${pullExtOfficeTel.length}`);
  
  const totalUnique = new Set([
    ...employeeRecordsWithPhone.map(emp => emp.employeeCode),
    ...pullExtMobile.map(emp => emp.empCode),
    ...pullExtContactTel.map(emp => emp.empCode),
    ...pullExtOfficeTel.map(emp => emp.empCode)
  ]).size;
  
  console.log(`Total unique employees with 03 phone numbers: ${totalUnique}`);
  
  // Check for employees missing National IDs but have phone numbers
  console.log("\n=== EMPLOYEES WITH PHONE BUT MISSING NATIONAL ID ===");
  const missingNationalWithPhone = employeeRecordsWithPhone.filter(emp => !emp.nationalId || emp.nationalId.trim() === '');
  
  if (missingNationalWithPhone.length > 0) {
    console.log(`Found ${missingNationalWithPhone.length} employees with phone numbers but missing National IDs:`);
    missingNationalWithPhone.forEach(emp => {
      const fullName = `${emp.firstName || ''} ${emp.middleName || ''} ${emp.lastName || ''}`.trim();
      console.log(`${emp.employeeCode}: ${fullName} (${emp.department})`);
      console.log(`  Phone: ${emp.phone}`);
      console.log('');
    });
  } else {
    console.log("No employees found with phone numbers but missing National IDs");
  }
}

searchPhoneData().catch(console.error);