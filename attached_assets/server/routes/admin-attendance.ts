import express from 'express';
import { requireAdmin } from '../middleware/auth.js';
import { storage } from '../storage.js';
import { format, startOfDay, endOfDay, parseISO } from 'date-fns';

const router = express.Router();

// Get comprehensive attendance records for admin tracking
router.get('/attendance-records', requireAdmin, async (req, res) => {
  try {
    const { employee, from, to, status } = req.query as {
      employee?: string;
      from?: string;
      to?: string;
      status?: string;
    };

    // Default to last 7 days if no dates provided
    const fromDate = from ? startOfDay(parseISO(from)) : startOfDay(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    const toDate = to ? endOfDay(parseISO(to)) : endOfDay(new Date());

    // Get attendance data using existing storage methods
    const attendanceData = await storage.getAttendanceRecords({
      page: 1,
      limit: 1000,
      employeeCode: employee && employee !== 'all' ? employee : undefined,
      from: format(fromDate, 'yyyy-MM-dd'),
      to: format(toDate, 'yyyy-MM-dd')
    });

    // Process records for admin interface
    const processedRecords = attendanceData.records.map(record => ({
      id: record.id,
      employeeCode: record.employeeCode,
      employeeName: record.employeeName || 'Unknown',
      date: format(record.checkTime, 'yyyy-MM-dd'),
      punchIn: record.checkTime.toISOString(),
      punchOut: record.punchOut ? record.punchOut.toISOString() : null,
      hoursWorked: record.hoursWorked || 0,
      status: record.status || 'absent',
      location: record.location || '',
      recordType: record.punchSource || 'biometric',
      notes: record.notes || ''
    }));

    // Filter by status if specified
    const filteredRecords = status && status !== 'all' 
      ? processedRecords.filter(record => record.status === status)
      : processedRecords;

    // Calculate summary statistics
    const summary = {
      total: filteredRecords.length,
      present: filteredRecords.filter(r => r.status === 'present').length,
      late: filteredRecords.filter(r => r.status === 'late').length,
      early: filteredRecords.filter(r => r.status === 'early').length,
      grace: filteredRecords.filter(r => r.status === 'grace').length,
      absent: filteredRecords.filter(r => r.status === 'absent').length
    };

    res.json({
      records: filteredRecords,
      summary,
      dateRange: {
        from: format(fromDate, 'yyyy-MM-dd'),
        to: format(toDate, 'yyyy-MM-dd')
      }
    });

  } catch (error) {
    console.error('Error fetching admin attendance records:', error);
    res.status(500).json({ 
      error: 'Failed to fetch attendance records',
      details: error.message 
    });
  }
});

// Get employee attendance timeline (detailed punch history)
router.get('/employee-timeline/:employeeCode', requireAdmin, async (req, res) => {
  try {
    const { employeeCode } = req.params;
    const { from, to } = req.query as { from?: string; to?: string };

    const fromDate = from ? startOfDay(parseISO(from)) : startOfDay(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const toDate = to ? endOfDay(parseISO(to)) : endOfDay(new Date());

    // Get employee details
    const employees = await storage.getEmployees({
      page: 1,
      limit: 1,
      employeeCode
    });
    const employee = employees.employees[0] || null;

    // Get attendance timeline
    const attendanceData = await storage.getAttendanceRecords({
      page: 1,
      limit: 1000,
      employeeCode,
      from: format(fromDate, 'yyyy-MM-dd'),
      to: format(toDate, 'yyyy-MM-dd')
    });

    const timeline = attendanceData.records.map(record => ({
      id: record.id,
      checkTime: record.checkTime,
      status: record.status,
      location: record.location,
      punchSource: record.punchSource,
      notes: record.notes,
      gpsLocation: record.gpsLocation,
      accuracy: record.accuracy
    }));

    res.json({
      employee,
      timeline,
      dateRange: {
        from: format(fromDate, 'yyyy-MM-dd'),
        to: format(toDate, 'yyyy-MM-dd')
      }
    });

  } catch (error) {
    console.error('Error fetching employee timeline:', error);
    res.status(500).json({ 
      error: 'Failed to fetch employee timeline',
      details: error.message 
    });
  }
});

// Export attendance records to CSV
router.post('/export-attendance', requireAdmin, async (req, res) => {
  try {
    const { employee, from, to, status, format: exportFormat } = req.body;

    const fromDate = from ? startOfDay(parseISO(from)) : startOfDay(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    const toDate = to ? endOfDay(parseISO(to)) : endOfDay(new Date());

    // Get attendance data
    const attendanceData = await storage.getAttendanceRecords({
      page: 1,
      limit: 10000,
      employeeCode: employee && employee !== 'all' ? employee : undefined,
      from: format(fromDate, 'yyyy-MM-dd'),
      to: format(toDate, 'yyyy-MM-dd')
    });

    const records = attendanceData.records;

    // Format as CSV
    if (exportFormat === 'csv') {
      const csvHeader = 'Employee Code,Employee Name,Date,Time,Status,Hours Worked,Location,Source,Notes\n';
      const csvRows = records.map(record => 
        `"${record.employeeCode}","${record.employeeName || ''}","${format(record.checkTime, 'yyyy-MM-dd')}","${format(record.checkTime, 'HH:mm:ss')}","${record.status || ''}","${record.hoursWorked || 0}","${record.location || ''}","${record.punchSource || 'biometric'}","${record.notes || ''}"`
      ).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="attendance-export-${format(new Date(), 'yyyy-MM-dd')}.csv"`);
      res.send(csvHeader + csvRows);
    } else {
      res.json(records);
    }

  } catch (error) {
    console.error('Error exporting attendance records:', error);
    res.status(500).json({ 
      error: 'Failed to export attendance records',
      details: error.message 
    });
  }
});

export { router as adminAttendanceRouter };