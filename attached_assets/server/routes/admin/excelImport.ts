import { Router } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { db } from '../../db.js';
import { attendanceRecords, biotimeImportStaging } from '../../../shared/schema.js';
import { requireAuth, requireAdmin } from '../../middleware/auth.js';
import { BIOTIME_CSV_MAPPING, PUNCH_STATE_MAPPING, VERIFICATION_TYPE_MAPPING, PROCESSING_RULES } from '../../config/Biotime-Import-Mapper.js';
import path from 'path';
import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { format, parseISO } from 'date-fns';
import { nanoid } from 'nanoid';

const router = Router();

// Configure multer for Excel file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/excel';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    cb(null, `june-data-${timestamp}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.csv'];
    const fileExt = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed for BioTime import'));
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  }
});

// Stop all polling services before import
router.post('/stop-polling-for-import', requireAuth, requireAdmin, async (req, res) => {
  try {
    console.log('[Excel Import] Stopping all polling services for data import...');
    
    // Stop the three-poller system
    const { serviceManager } = await import('../../services/serviceManager.js');
    await serviceManager.stopService('threePollerSystem');
    
    console.log('[Excel Import] ✅ All polling services stopped for import');
    
    res.json({
      success: true,
      message: 'All polling services stopped. You can now import June data.'
    });
    
  } catch (error) {
    console.error('[Excel Import] Error stopping polling services:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Upload and process June CSV data using staging table
router.post('/upload-june-data', requireAuth, requireAdmin, upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No CSV file uploaded'
      });
    }

    console.log('[BioTime Import] Processing June data file:', req.file.filename);
    
    // Generate batch ID for tracking
    const batchId = `JUNE_2025_${nanoid(8)}`;
    
    // Read CSV file
    const csvContent = fs.readFileSync(req.file.path, 'utf-8');
    const csvData = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    
    console.log('[BioTime Import] CSV data loaded:', csvData.length, 'rows');
    
    // Process and validate data using BioTime mapper
    const stagingRecords = [];
    const errors = [];
    let processedCount = 0;
    
    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      try {
        // Parse punch time - format: M/D/YYYY H:mm
        const punchTimeStr = row.punch_time;
        const uploadTimeStr = row.upload_time;
        
        if (!punchTimeStr) {
          errors.push(`Row ${i + 1}: Missing punch_time`);
          continue;
        }
        
        // Parse date using MM/DD/YYYY format
        const punchTimestamp = new Date(punchTimeStr);
        const uploadTimestamp = uploadTimeStr ? new Date(uploadTimeStr) : null;
        
        if (isNaN(punchTimestamp.getTime())) {
          errors.push(`Row ${i + 1}: Invalid punch_time format: ${punchTimeStr}`);
          continue;
        }
        
        // Map CSV row to staging table structure using BioTime mapper
        const stagingRecord = {
          biotime_id: parseInt(row.id),
          employee_code: row.emp_code || '',
          employee_first_name: row.first_name || '',
          employee_last_name: row.last_name || '',
          department_name: row.department || '',
          position_title: row.position || '',
          punch_timestamp: punchTimestamp,
          punch_state_code: parseInt(row.punch_state) || 0,
          punch_state_label: row.punch_state_display || '',
          verification_type: parseInt(row.verify_type) || 1,
          verification_label: row.verify_type_display || '',
          work_code: row.work_code || '',
          gps_coordinates: row.gps_location || '',
          location_area: row.area_alias || '',
          device_serial: row.terminal_sn || '',
          device_alias: row.terminal_alias || '',
          temperature_reading: parseFloat(row.temperature) || 0,
          upload_timestamp: uploadTimestamp,
          import_batch_id: batchId,
          source_file: req.file.filename,
          processed: false,
          attendance_record_created: false
        };

        // Validate required fields
        if (!stagingRecord.biotime_id || !stagingRecord.employee_code || !stagingRecord.punch_timestamp) {
          errors.push(`Row ${i + 1}: Missing required fields (id, emp_code, punch_time)`);
          continue;
        }

        stagingRecords.push(stagingRecord);
        processedCount++;
        
      } catch (error) {
        errors.push(`Row ${i + 1}: ${error.message}`);
      }
    }

    if (errors.length > 0 && stagingRecords.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid records found',
        errors: errors.slice(0, 10) // Show first 10 errors
      });
    }

    console.log('[BioTime Import] Inserting', stagingRecords.length, 'records into staging table...');

    // Insert into staging table in batches
    const BATCH_SIZE = 1000;
    let totalInserted = 0;
    let duplicateCount = 0;
    
    for (let i = 0; i < stagingRecords.length; i += BATCH_SIZE) {
      const batch = stagingRecords.slice(i, i + BATCH_SIZE);
      
      try {
        await db.insert(biotimeImportStaging).values(batch);
        totalInserted += batch.length;
        console.log('[BioTime Import] Inserted batch:', totalInserted, '/', stagingRecords.length);
      } catch (error) {
        // Handle individual record errors
        for (const record of batch) {
          try {
            await db.insert(biotimeImportStaging).values(record);
            totalInserted++;
          } catch (recordError) {
            if (recordError.message.includes('duplicate') || recordError.message.includes('unique')) {
              duplicateCount++;
            } else {
              console.error('[BioTime Import] Record insert error:', recordError);
              errors.push(`Failed to insert BioTime ID ${record.biotime_id}: ${recordError.message}`);
            }
          }
        }
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    console.log('[BioTime Import] ✅ Staging import completed:', {
      totalRows: csvData.length,
      processed: processedCount,
      inserted: totalInserted,
      duplicates: duplicateCount,
      errors: errors.length,
      batchId: batchId
    });

    res.json({
      success: true,
      message: 'June BioTime data imported to staging table successfully',
      summary: {
        totalRows: csvData.length,
        processedRecords: processedCount,
        insertedRecords: totalInserted,
        duplicateRecords: duplicateCount,
        errorCount: errors.length,
        batchId: batchId,
        errors: errors.slice(0, 5) // Show first 5 errors if any
      }
    });

  } catch (error) {
    console.error('[BioTime Import] Error processing CSV file:', error);
    
    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to process CSV file',
      details: error.message
    });
  }
});

// Restart polling services after import
router.post('/restart-polling-after-import', requireAuth, requireAdmin, async (req, res) => {
  try {
    console.log('[Excel Import] Restarting polling services after import...');
    
    // Restart the three-poller system
    const { serviceManager } = await import('../../services/serviceManager.js');
    await serviceManager.startService('threePollerSystem');
    
    console.log('[Excel Import] ✅ All polling services restarted');
    
    res.json({
      success: true,
      message: 'Polling services restarted successfully'
    });
    
  } catch (error) {
    console.error('[Excel Import] Error restarting polling services:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Process staging records into attendance records
router.post('/process-staging-data', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { batchId } = req.body;
    
    if (!batchId) {
      return res.status(400).json({
        success: false,
        error: 'Batch ID is required'
      });
    }

    console.log('[BioTime Processing] Processing staging records for batch:', batchId);
    
    // Get unprocessed staging records
    const stagingRecords = await db
      .select()
      .from(biotimeImportStaging)
      .where(
        db.sql`import_batch_id = ${batchId} AND processed = false`
      )
      .orderBy(db.sql`punch_timestamp ASC`);

    if (stagingRecords.length === 0) {
      return res.json({
        success: true,
        message: 'No unprocessed records found',
        summary: { processedCount: 0, attendanceRecords: 0, errors: [] }
      });
    }

    console.log('[BioTime Processing] Found', stagingRecords.length, 'unprocessed staging records');

    // Group records by employee and date for attendance processing
    const groupedRecords = new Map();
    
    for (const record of stagingRecords) {
      const dateKey = format(record.punch_timestamp, 'yyyy-MM-dd');
      const employeeKey = `${record.employee_code}_${dateKey}`;
      
      if (!groupedRecords.has(employeeKey)) {
        groupedRecords.set(employeeKey, {
          employee_code: record.employee_code,
          date: dateKey,
          punches: []
        });
      }
      
      groupedRecords.get(employeeKey).punches.push(record);
    }

    console.log('[BioTime Processing] Grouped into', groupedRecords.size, 'employee-date combinations');

    // Process each employee-date group
    let attendanceCreated = 0;
    let recordsProcessed = 0;
    const errors = [];

    for (const [key, group] of groupedRecords) {
      try {
        // Sort punches by time
        group.punches.sort((a, b) => a.punch_timestamp.getTime() - b.punch_timestamp.getTime());
        
        // Find check-in and check-out times
        const checkInPunch = group.punches.find(p => p.punch_state_code === 0); // Check In
        const checkOutPunch = group.punches.find(p => p.punch_state_code === 1); // Check Out
        
        if (checkInPunch || checkOutPunch) {
          // Calculate hours worked
          let hoursWorked = 0;
          if (checkInPunch && checkOutPunch) {
            const timeDiff = checkOutPunch.punch_timestamp.getTime() - checkInPunch.punch_timestamp.getTime();
            hoursWorked = timeDiff / (1000 * 60 * 60); // Convert to hours
          }

          // Create attendance record
          const attendanceRecord = {
            employee_code: group.employee_code,
            check_in: checkInPunch?.punch_timestamp || null,
            check_out: checkOutPunch?.punch_timestamp || null,
            date: new Date(group.date),
            status: (checkInPunch && checkOutPunch) ? 'present' : 'incomplete',
            hours_worked: Math.round(hoursWorked * 100) / 100, // Round to 2 decimal places
            location: checkInPunch?.location_area || checkOutPunch?.location_area || 'BioTime',
            punch_source: 'biotime_csv_import',
            device_info: `${checkInPunch?.device_alias || checkOutPunch?.device_alias || 'Unknown'} (${checkInPunch?.device_serial || checkOutPunch?.device_serial || 'Unknown'})`,
            verification_method: checkInPunch?.verification_label || checkOutPunch?.verification_label || 'Unknown',
            notes: `Imported from BioTime CSV. Punches: ${group.punches.length}. Batch: ${batchId}`
          };

          try {
            await db.insert(attendanceRecords).values(attendanceRecord);
            attendanceCreated++;
          } catch (insertError) {
            if (!insertError.message.includes('duplicate')) {
              console.error('[BioTime Processing] Attendance insert error:', insertError);
              errors.push(`Failed to create attendance for ${group.employee_code} on ${group.date}: ${insertError.message}`);
            }
          }
        }

        // Mark staging records as processed
        for (const punch of group.punches) {
          await db
            .update(biotimeImportStaging)
            .set({ 
              processed: true, 
              processed_at: new Date(),
              attendance_record_created: !!(checkInPunch || checkOutPunch)
            })
            .where(db.sql`id = ${punch.id}`);
          recordsProcessed++;
        }

      } catch (groupError) {
        console.error('[BioTime Processing] Group processing error:', groupError);
        errors.push(`Failed to process group ${key}: ${groupError.message}`);
      }
    }

    console.log('[BioTime Processing] ✅ Processing completed:', {
      recordsProcessed,
      attendanceCreated,
      errorCount: errors.length
    });

    res.json({
      success: true,
      message: 'Staging data processed successfully',
      summary: {
        processedRecords: recordsProcessed,
        attendanceRecords: attendanceCreated,
        errorCount: errors.length,
        errors: errors.slice(0, 5)
      }
    });

  } catch (error) {
    console.error('[BioTime Processing] Error processing staging data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process staging data',
      details: error.message
    });
  }
});

// Get import status and recent imports
router.get('/import-status', requireAuth, requireAdmin, async (req, res) => {
  try {
    // Check if polling is stopped
    const { serviceManager } = await import('../../services/serviceManager.js');
    const services = await serviceManager.getServiceStatus();
    const pollingService = services.find(s => s.name === 'threePollerSystem');
    
    // Count staging records
    const stagingCount = await db
      .select({ count: db.sql<number>`count(*)` })
      .from(biotimeImportStaging);
    
    const processedCount = await db
      .select({ count: db.sql<number>`count(*)` })
      .from(biotimeImportStaging)
      .where(db.sql`processed = true`);

    // Count June attendance records
    const juneRecords = await db
      .select({ count: db.sql<number>`count(*)` })
      .from(attendanceRecords)
      .where(db.sql`date_part('month', date) = 6 AND date_part('year', date) = 2025`);

    // Get recent batches
    const recentBatches = await db
      .select({
        batchId: biotimeImportStaging.import_batch_id,
        sourceFile: biotimeImportStaging.source_file,
        totalRecords: db.sql<number>`count(*)`,
        processedRecords: db.sql<number>`count(*) filter (where processed = true)`,
        createdAt: db.sql<Date>`min(created_at)`
      })
      .from(biotimeImportStaging)
      .groupBy(biotimeImportStaging.import_batch_id, biotimeImportStaging.source_file)
      .orderBy(db.sql`min(created_at) DESC`)
      .limit(5);

    res.json({
      success: true,
      pollingStatus: pollingService?.isRunning ? 'running' : 'stopped',
      stagingRecords: stagingCount[0]?.count || 0,
      processedRecords: processedCount[0]?.count || 0,
      juneAttendanceRecords: juneRecords[0]?.count || 0,
      recentBatches: recentBatches,
      readyForImport: !pollingService?.isRunning
    });
    
  } catch (error) {
    console.error('[BioTime Import] Error getting import status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;