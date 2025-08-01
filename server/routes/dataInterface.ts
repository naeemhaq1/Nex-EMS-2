import { Request, Response } from "express";
import { storage } from "../storage";
import { format, startOfDay, endOfDay } from "date-fns";
import { getCurrentPKTTime, formatPKTDateTime } from "../utils/timezone";
import { stringify } from "csv-stringify/sync";
import archiver from "archiver";
import fs from "fs";
import path from "path";

export async function getLiveAttendance(req: Request, res: Response) {
  try {
    const { search, department, checkType } = req.query;
    
    // Convert "undefined" strings to actual undefined values
    const cleanSearch = search === 'undefined' ? undefined : search as string;
    const cleanDepartment = department === 'undefined' ? undefined : department as string;
    const cleanCheckType = checkType === 'undefined' ? undefined : checkType as string;
    
    // Get today's date in Pakistan timezone
    const currentTime = getCurrentPKTTime();
    const startOfToday = startOfDay(currentTime);
    const endOfToday = endOfDay(currentTime);
    
    // Get all attendance records for today
    const attendanceData = await storage.getAttendanceRecords({
      dateFrom: startOfToday,
      dateTo: endOfToday,
      limit: 1000, // Get all records for today
    });
    
    // Also get raw attendance data from pull table for today
    const rawAttendanceData = await storage.getRawAttendanceForToday(startOfToday, endOfToday);
    
    // Get employee details for enrichment
    const employees = await storage.getEmployees({ limit: 1000 });
    const employeeMap = new Map(employees.employees.map(e => [e.employeeCode, e]));
    
    // Transform processed records for display
    let records = attendanceData.records.map(record => {
      const employee = employeeMap.get(record.employeeCode);
      // Use check_in time as the primary time, or check_out if check_in is null
      const rawCheckTime = record.checkIn || record.checkOut || new Date();
      const checkType = record.checkIn && !record.checkOut ? 'in' : 'out';
      
      // Convert time to Pakistan timezone before sending
      const checkTimePKT = formatPKTDateTime(rawCheckTime);
      
      return {
        id: record.id,
        employeeCode: record.employeeCode,
        employeeName: employee ? `${employee.firstName} ${employee.lastName}` : record.employeeCode,
        department: employee?.department || 'Unknown',
        checkTime: checkTimePKT.toISOString(),
        checkType: checkType,
        location: record.location || 'Main Office',
        deviceName: 'BioTime Terminal',
        createdAt: record.createdAt,
        source: 'processed'
      };
    });
    
    // Add raw attendance data if no processed records exist
    if (records.length === 0 && rawAttendanceData.length > 0) {
      const rawRecords = rawAttendanceData.map((record: any) => {
        const allFields = record.allFields || record.all_fields || {};
        const empCode = allFields.emp_code || record.empCode || 'Unknown';
        const employee = employeeMap.get(empCode);
        
        // Validate and parse punch time, then convert to Pakistan timezone
        let checkTime = new Date().toISOString();
        if (allFields.punch_time) {
          try {
            const parsedTime = new Date(allFields.punch_time);
            if (!isNaN(parsedTime.getTime())) {
              const checkTimePKT = formatPKTDateTime(parsedTime);
              checkTime = checkTimePKT.toISOString();
            }
          } catch (error) {
            console.error('Invalid punch_time:', allFields.punch_time, error);
          }
        }
        
        return {
          id: record.id,
          employeeCode: empCode,
          employeeName: employee ? `${employee.firstName} ${employee.lastName}` : empCode,
          department: employee?.department || 'Unknown',
          checkTime: checkTime,
          checkType: allFields.punch_state === '0' || allFields.punch_state === 0 ? 'in' : 'out',
          location: 'Main Office',
          deviceName: allFields.terminal_name || 'Unknown Device',
          createdAt: record.pulledAt || record.pulled_at || new Date().toISOString(),
          source: 'raw'
        };
      });
      records = rawRecords;
    }
    
    // Apply filters
    if (cleanSearch) {
      const searchLower = cleanSearch.toLowerCase();
      records = records.filter(r => 
        r.employeeCode.toLowerCase().includes(searchLower) ||
        r.employeeName.toLowerCase().includes(searchLower)
      );
    }
    
    if (cleanDepartment && cleanDepartment !== 'all') {
      records = records.filter(r => r.department === cleanDepartment);
    }
    
    if (cleanCheckType && cleanCheckType !== 'all') {
      records = records.filter(r => r.checkType === cleanCheckType);
    }
    
    // Sort by checkTime descending (most recent first)
    records.sort((a, b) => new Date(b.checkTime).getTime() - new Date(a.checkTime).getTime());
    
    res.json(records);
  } catch (error) {
    console.error('Error fetching live attendance:', error);
    res.status(500).json({ error: 'Failed to fetch live attendance data' });
  }
}

export async function getDataStats(req: Request, res: Response) {
  try {
    const currentTime = getCurrentTimeInPakistan();
    const startOfToday = startOfDay(currentTime);
    const endOfToday = endOfDay(currentTime);
    
    // Get today's attendance count
    const todayAttendance = await storage.getAttendanceRecords({
      dateFrom: startOfToday,
      dateTo: endOfToday,
      limit: 1
    });
    
    // Get total employees
    const employees = await storage.getEmployees({ limit: 1 });
    
    // Check if backup exists for today
    const backupDir = path.join(process.cwd(), 'backups');
    const todayBackupFile = path.join(backupDir, `attendance_${format(currentTime, 'yyyy-MM-dd')}.zip`);
    const backupExists = fs.existsSync(todayBackupFile);
    
    const stats = {
      totalRecords: todayAttendance.total || 0,
      totalEmployees: employees.total || 0,
      lastUpdate: currentTime.toISOString(),
      todayBackupStatus: backupExists ? "completed" : "pending"
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching data stats:', error);
    res.status(500).json({ error: 'Failed to fetch data statistics' });
  }
}

export async function downloadTodayData(req: Request, res: Response) {
  try {
    const currentTime = getCurrentTimeInPakistan();
    const startOfToday = startOfDay(currentTime);
    const endOfToday = endOfDay(currentTime);
    
    // Get all attendance records for today
    const attendanceData = await storage.getAttendanceRecords({
      dateFrom: startOfToday,
      dateTo: endOfToday
    });
    
    // Get employee details
    const employees = await storage.getEmployees({ limit: 1000 });
    const employeeMap = new Map(employees.employees.map(e => [e.employeeCode, e]));
    
    // Prepare CSV data
    const csvData = attendanceData.records.map(record => {
      const employee = employeeMap.get(record.employeeCode);
      return {
        'Employee Code': record.employeeCode,
        'Employee Name': employee ? `${employee.firstName} ${employee.lastName}` : record.employeeName || '',
        'Department': employee?.department || 'Unknown',
        'Check Type': record.status === 'check_in' ? 'IN' : 'OUT',
        'Check Time': format(new Date(record.punchTime), 'yyyy-MM-dd HH:mm:ss'),
        'Location': record.location || 'Main Office',
        'Device': record.terminalName || 'Unknown',
        'Hours Worked': record.hoursWorked || 0,
        'Total Hours': record.totalHours || 0
      };
    });
    
    // Generate CSV
    const csv = stringify(csvData, {
      header: true,
      columns: [
        'Employee Code',
        'Employee Name',
        'Department',
        'Check Type',
        'Check Time',
        'Location',
        'Device',
        'Hours Worked',
        'Total Hours'
      ]
    });
    
    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="attendance_${format(currentTime, 'yyyy-MM-dd')}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Error downloading attendance data:', error);
    res.status(500).json({ error: 'Failed to download attendance data' });
  }
}

// Automatic daily backup function (to be called by a scheduler)
export async function performDailyBackup() {
  try {
    const currentTime = getCurrentTimeInPakistan();
    const yesterday = new Date(currentTime);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const startOfYesterday = startOfDay(yesterday);
    const endOfYesterday = endOfDay(yesterday);
    
    // Create backups directory if it doesn't exist
    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Get all attendance records for yesterday
    const attendanceData = await storage.getAttendanceRecords({
      dateFrom: startOfYesterday,
      dateTo: endOfYesterday
    });
    
    // Get employee details
    const employees = await storage.getEmployees({ limit: 1000 });
    const employeeMap = new Map(employees.employees.map(e => [e.employeeCode, e]));
    
    // Prepare CSV data
    const csvData = attendanceData.records.map(record => {
      const employee = employeeMap.get(record.employeeCode);
      return {
        'Employee Code': record.employeeCode,
        'Employee Name': employee ? `${employee.firstName} ${employee.lastName}` : record.employeeName || '',
        'Department': employee?.department || 'Unknown',
        'Check Type': record.status === 'check_in' ? 'IN' : 'OUT',
        'Check Time': format(new Date(record.punchTime), 'yyyy-MM-dd HH:mm:ss'),
        'Location': record.location || 'Main Office',
        'Device': record.terminalName || 'Unknown',
        'Hours Worked': record.hoursWorked || 0,
        'Total Hours': record.totalHours || 0
      };
    });
    
    // Generate CSV
    const csv = stringify(csvData, {
      header: true,
      columns: [
        'Employee Code',
        'Employee Name',
        'Department',
        'Check Type',
        'Check Time',
        'Location',
        'Device',
        'Hours Worked',
        'Total Hours'
      ]
    });
    
    // Create zip file
    const zipPath = path.join(backupDir, `attendance_${format(yesterday, 'yyyy-MM-dd')}.zip`);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    output.on('close', () => {
      console.log(`Daily backup created: ${zipPath} (${archive.pointer()} bytes)`);
    });
    
    archive.on('error', (err) => {
      throw err;
    });
    
    archive.pipe(output);
    archive.append(csv, { name: `attendance_${format(yesterday, 'yyyy-MM-dd')}.csv` });
    await archive.finalize();
    
    // Clean up old backups (keep last 30 days)
    const files = fs.readdirSync(backupDir);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    files.forEach(file => {
      const filePath = path.join(backupDir, file);
      const stats = fs.statSync(filePath);
      if (stats.mtime < thirtyDaysAgo) {
        fs.unlinkSync(filePath);
        console.log(`Deleted old backup: ${file}`);
      }
    });
    
  } catch (error) {
    console.error('Error performing daily backup:', error);
  }
}