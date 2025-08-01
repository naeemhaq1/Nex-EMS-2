#!/usr/bin/env node

/**
 * Unified Metrics Recalculator
 * 
 * Recalculates and repopulates unified metrics for specified months
 * Features process tracking and automatic resumption if interrupted
 * Processes June and July 2025 data with comprehensive validation
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');
const { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } = require('date-fns');

class UnifiedMetricsRecalculator {
  constructor(options = {}) {
    this.processId = options.processId || `recalc_${Date.now()}`;
    this.processFile = path.join(__dirname, '..', 'logs', 'recalculation-progress.json');
    
    // Flexible date range configuration
    this.startDate = options.startDate || '2025-06-01'; // Default: June 1, 2025
    this.endDate = options.endDate || '2025-07-31';     // Default: July 31, 2025
    this.months = this.generateMonthsFromRange(this.startDate, this.endDate);
    
    // Optional filters
    this.employeeFilter = options.employeeFilter || null; // Array of employee codes
    this.departmentFilter = options.departmentFilter || null; // Array of departments
    this.forceRecalculation = options.forceRecalculation !== false; // Default: true
    
    this.progress = {
      processId: this.processId,
      startTime: new Date().toISOString(),
      status: 'initializing',
      dateRange: { start: this.startDate, end: this.endDate },
      totalMonths: this.months.length,
      completedMonths: 0,
      currentMonth: null,
      totalDays: 0,
      completedDays: 0,
      filters: {
        employees: this.employeeFilter,
        departments: this.departmentFilter
      },
      errors: [],
      stats: {
        attendanceRecordsProcessed: 0,
        metricsRecalculated: 0,
        employeesProcessed: 0,
        daysProcessed: 0
      }
    };
  }

  generateMonthsFromRange(startDate, endDate) {
    const months = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    let current = new Date(start.getFullYear(), start.getMonth(), 1);
    
    while (current <= end) {
      months.push(format(current, 'yyyy-MM'));
      current.setMonth(current.getMonth() + 1);
    }
    
    return months;
  }

  async run() {
    console.log('🔄 UNIFIED METRICS RECALCULATOR');
    console.log('===============================');
    console.log(`🆔 Process ID: ${this.processId}`);
    console.log(`📅 Date Range: ${this.startDate} to ${this.endDate}`);
    console.log(`📅 Target Months: ${this.months.join(', ')}`);
    console.log(`👥 Employee Filter: ${this.employeeFilter ? this.employeeFilter.length + ' employees' : 'All employees'}`);
    console.log(`🏢 Department Filter: ${this.departmentFilter ? this.departmentFilter.join(', ') : 'All departments'}`);
    console.log(`⏰ Start Time: ${this.progress.startTime}`);
    console.log('');

    try {
      // Check for existing process and resume if needed
      await this.checkForExistingProcess();

      // Initialize database connection
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });

      // Start or resume recalculation
      await this.processMonths(pool);

      // Finalize process
      await this.finalizeProcess();

      await pool.end();
      console.log('\n✅ UNIFIED METRICS RECALCULATION COMPLETED SUCCESSFULLY');
      return this.generateSummary();

    } catch (error) {
      console.error('❌ RECALCULATION FAILED:', error);
      this.progress.status = 'failed';
      this.progress.error = error.message;
      this.progress.endTime = new Date().toISOString();
      await this.saveProgress();
      
      return this.generateSummary();
    }
  }

  async checkForExistingProcess() {
    console.log('🔍 CHECKING FOR EXISTING PROCESS');
    console.log('================================');

    try {
      const existingProgress = await fs.readFile(this.processFile, 'utf8');
      const existing = JSON.parse(existingProgress);

      if (existing.status === 'in_progress' || existing.status === 'paused') {
        console.log(`📋 Found existing process: ${existing.processId}`);
        console.log(`📊 Progress: ${existing.completedMonths}/${existing.totalMonths} months`);
        console.log(`📈 Days: ${existing.completedDays}/${existing.totalDays} completed`);
        
        const resume = true; // Auto-resume for automated processing
        if (resume) {
          console.log('🔄 Resuming existing process...');
          this.progress = { ...existing, status: 'resuming' };
          this.processId = existing.processId;
          
          // Remove completed months from processing list
          this.months = this.months.slice(existing.completedMonths);
          console.log(`📅 Remaining months: ${this.months.join(', ')}`);
        }
      }
    } catch (error) {
      console.log('📝 No existing process found - starting fresh');
    }

    await this.saveProgress();
  }

  async processMonths(pool) {
    console.log('\n📊 PROCESSING MONTHS FOR RECALCULATION');
    console.log('======================================');

    this.progress.status = 'in_progress';
    this.progress.totalDays = await this.calculateTotalDays();
    
    for (let i = 0; i < this.months.length; i++) {
      const month = this.months[i];
      console.log(`\n🗓️  PROCESSING MONTH: ${month}`);
      console.log('========================');

      this.progress.currentMonth = month;
      await this.saveProgress();

      try {
        await this.processMonth(pool, month);
        this.progress.completedMonths++;
        console.log(`✅ Month ${month} completed successfully`);
        
      } catch (error) {
        console.error(`❌ Error processing month ${month}:`, error);
        this.progress.errors.push({
          month: month,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        
        // Continue with next month instead of failing completely
        console.log('⚠️  Skipping to next month...');
      }

      await this.saveProgress();
    }
  }

  async processMonth(pool, monthStr) {
    let monthStartDate = startOfMonth(new Date(monthStr + '-01'));
    let monthEndDate = endOfMonth(new Date(monthStr + '-01'));
    
    // Respect the overall date range boundaries
    if (monthStartDate < new Date(this.startDate)) {
      monthStartDate = new Date(this.startDate);
    }
    if (monthEndDate > new Date(this.endDate)) {
      monthEndDate = new Date(this.endDate);
    }
    
    console.log(`📅 Date Range: ${format(monthStartDate, 'yyyy-MM-dd')} to ${format(monthEndDate, 'yyyy-MM-dd')}`);

    // Get all days in the adjusted range
    const days = eachDayOfInterval({ start: monthStartDate, end: monthEndDate });
    console.log(`📆 Processing ${days.length} days`);

    // Clear existing unified metrics for this month
    await this.clearExistingMetrics(pool, monthStr);

    // Process each day
    for (const day of days) {
      const dayStr = format(day, 'yyyy-MM-dd');
      console.log(`\n📅 Processing day: ${dayStr}`);

      try {
        await this.processDayMetrics(pool, dayStr);
        this.progress.completedDays++;
        
        // Save progress every 5 days
        if (this.progress.completedDays % 5 === 0) {
          await this.saveProgress();
        }
        
      } catch (error) {
        console.error(`❌ Error processing day ${dayStr}:`, error);
        this.progress.errors.push({
          day: dayStr,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Generate month summary
    await this.generateMonthSummary(pool, monthStr);
  }

  async clearExistingMetrics(pool, monthStr) {
    console.log('🧹 Clearing existing unified metrics...');

    try {
      // Calculate actual date boundaries for this month within our range
      let monthStart = `${monthStr}-01`;
      let monthEnd = `${monthStr}-31`;
      
      if (monthStart < this.startDate) monthStart = this.startDate;
      if (monthEnd > this.endDate) monthEnd = this.endDate;

      // Clear unified attendance service data for the date range
      let deleteQuery = `
        DELETE FROM unified_attendance_metrics 
        WHERE date >= $1 AND date <= $2
      `;
      let queryParams = [monthStart, monthEnd];

      // Add employee filter if specified
      if (this.employeeFilter && this.employeeFilter.length > 0) {
        deleteQuery += ` AND employee_code = ANY($3)`;
        queryParams.push(this.employeeFilter);
      }

      // Add department filter if specified
      if (this.departmentFilter && this.departmentFilter.length > 0) {
        const paramIndex = queryParams.length + 1;
        deleteQuery += ` AND department = ANY($${paramIndex})`;
        queryParams.push(this.departmentFilter);
      }

      const result = await pool.query(deleteQuery, queryParams);
      console.log(`   🗑️  Cleared ${result.rowCount} existing metric records`);

    } catch (error) {
      // Table might not exist, create it
      console.log('📋 Creating unified_attendance_metrics table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS unified_attendance_metrics (
          id SERIAL PRIMARY KEY,
          date DATE NOT NULL,
          employee_code VARCHAR(50) NOT NULL,
          department VARCHAR(100),
          check_in TIMESTAMP,
          check_out TIMESTAMP,
          total_hours DECIMAL(4,2),
          regular_hours DECIMAL(4,2),
          overtime_hours DECIMAL(4,2),
          status VARCHAR(20),
          is_late BOOLEAN DEFAULT FALSE,
          is_early_departure BOOLEAN DEFAULT FALSE,
          break_duration DECIMAL(4,2) DEFAULT 0,
          productivity_score DECIMAL(3,2),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(date, employee_code)
        )
      `);
      
      console.log('✅ Table created successfully');
    }
  }

  async processDayMetrics(pool, dayStr) {
    // Build query with optional filters
    let attendanceQuery = `
      SELECT 
        ar.*,
        er.first_name,
        er.last_name,
        er.department,
        er.designation
      FROM attendance_records ar
      JOIN employee_records er ON ar.employee_code = er.employee_code
      WHERE DATE(ar.date) = $1
    `;
    let queryParams = [dayStr];

    // Add employee filter if specified
    if (this.employeeFilter && this.employeeFilter.length > 0) {
      attendanceQuery += ` AND ar.employee_code = ANY($2)`;
      queryParams.push(this.employeeFilter);
    }

    // Add department filter if specified
    if (this.departmentFilter && this.departmentFilter.length > 0) {
      const paramIndex = queryParams.length + 1;
      attendanceQuery += ` AND er.department = ANY($${paramIndex})`;
      queryParams.push(this.departmentFilter);
    }

    attendanceQuery += ` ORDER BY ar.employee_code`;

    const attendanceResult = await pool.query(attendanceQuery, queryParams);

    const records = attendanceResult.rows;
    console.log(`   📊 Found ${records.length} attendance records`);

    if (records.length === 0) {
      console.log('   ⚠️  No attendance data for this day');
      return;
    }

    // Process each attendance record
    for (const record of records) {
      const metrics = await this.calculateEmployeeMetrics(record);
      await this.saveUnifiedMetrics(pool, dayStr, record, metrics);
      this.progress.stats.attendanceRecordsProcessed++;
    }

    this.progress.stats.metricsRecalculated += records.length;
    this.progress.stats.daysProcessed++;
    
    // Track unique employees
    const uniqueEmployees = new Set(records.map(r => r.employee_code));
    this.progress.stats.employeesProcessed = Math.max(
      this.progress.stats.employeesProcessed,
      uniqueEmployees.size
    );

    console.log(`   ✅ Processed ${records.length} records for ${dayStr}`);
  }

  async calculateEmployeeMetrics(record) {
    const metrics = {
      totalHours: 0,
      regularHours: 0,
      overtimeHours: 0,
      isLate: false,
      isEarlyDeparture: false,
      breakDuration: 0,
      productivityScore: 1.0,
      status: 'absent'
    };

    // Calculate basic metrics from existing data
    if (record.check_in) {
      metrics.status = record.check_out ? 'present' : 'incomplete';
      
      if (record.total_hours) {
        metrics.totalHours = parseFloat(record.total_hours) || 0;
      }
      
      if (record.regular_hours) {
        metrics.regularHours = parseFloat(record.regular_hours) || 0;
      }
      
      if (record.overtime_hours) {
        metrics.overtimeHours = parseFloat(record.overtime_hours) || 0;
      }

      // Calculate late arrival (assuming 9:00 AM standard time)
      const checkInTime = new Date(record.check_in);
      const standardTime = new Date(checkInTime);
      standardTime.setHours(9, 30, 0, 0); // 9:30 AM with 30-minute grace period
      
      metrics.isLate = checkInTime > standardTime;

      // Calculate early departure (assuming 6:00 PM standard time)
      if (record.check_out) {
        const checkOutTime = new Date(record.check_out);
        const endTime = new Date(checkOutTime);
        endTime.setHours(18, 0, 0, 0); // 6:00 PM
        
        metrics.isEarlyDeparture = checkOutTime < endTime;
      }

      // Calculate productivity score based on various factors
      let productivityScore = 1.0;
      
      if (metrics.isLate) productivityScore -= 0.1;
      if (metrics.isEarlyDeparture) productivityScore -= 0.1;
      if (metrics.totalHours < 8) productivityScore -= 0.2;
      if (metrics.totalHours >= 9) productivityScore += 0.1;
      
      metrics.productivityScore = Math.max(0.1, Math.min(1.0, productivityScore));
    }

    return metrics;
  }

  async saveUnifiedMetrics(pool, dayStr, record, metrics) {
    try {
      await pool.query(`
        INSERT INTO unified_attendance_metrics (
          date, employee_code, department, check_in, check_out,
          total_hours, regular_hours, overtime_hours, status,
          is_late, is_early_departure, break_duration, productivity_score
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (date, employee_code) DO UPDATE SET
          department = EXCLUDED.department,
          check_in = EXCLUDED.check_in,
          check_out = EXCLUDED.check_out,
          total_hours = EXCLUDED.total_hours,
          regular_hours = EXCLUDED.regular_hours,
          overtime_hours = EXCLUDED.overtime_hours,
          status = EXCLUDED.status,
          is_late = EXCLUDED.is_late,
          is_early_departure = EXCLUDED.is_early_departure,
          break_duration = EXCLUDED.break_duration,
          productivity_score = EXCLUDED.productivity_score,
          updated_at = NOW()
      `, [
        dayStr,
        record.employee_code,
        record.department,
        record.check_in,
        record.check_out,
        metrics.totalHours,
        metrics.regularHours,
        metrics.overtimeHours,
        metrics.status,
        metrics.isLate,
        metrics.isEarlyDeparture,
        metrics.breakDuration,
        metrics.productivityScore
      ]);

    } catch (error) {
      console.error(`❌ Error saving metrics for ${record.employee_code} on ${dayStr}:`, error);
      throw error;
    }
  }

  async generateMonthSummary(pool, monthStr) {
    console.log(`\n📈 GENERATING MONTH SUMMARY: ${monthStr}`);
    console.log('================================');

    try {
      const summaryResult = await pool.query(`
        SELECT 
          COUNT(*) as total_records,
          COUNT(DISTINCT employee_code) as unique_employees,
          COUNT(CASE WHEN status = 'present' THEN 1 END) as present_count,
          COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent_count,
          COUNT(CASE WHEN is_late = true THEN 1 END) as late_arrivals,
          ROUND(AVG(total_hours), 2) as avg_hours,
          SUM(overtime_hours) as total_overtime,
          ROUND(AVG(productivity_score), 3) as avg_productivity
        FROM unified_attendance_metrics 
        WHERE date >= $1 AND date <= $2
      `, [`${monthStr}-01`, `${monthStr}-31`]);

      const summary = summaryResult.rows[0];
      
      console.log('📊 MONTH SUMMARY:');
      console.log(`   ┌─────────────────────────────────────────────────────`);
      console.log(`   │ Total Records: ${summary.total_records}`);
      console.log(`   │ Unique Employees: ${summary.unique_employees}`);
      console.log(`   │ Present: ${summary.present_count}`);
      console.log(`   │ Absent: ${summary.absent_count}`);
      console.log(`   │ Late Arrivals: ${summary.late_arrivals}`);
      console.log(`   │ Average Hours: ${summary.avg_hours}`);
      console.log(`   │ Total Overtime: ${summary.total_overtime}`);
      console.log(`   │ Avg Productivity: ${summary.avg_productivity}`);
      console.log(`   └─────────────────────────────────────────────────────`);

    } catch (error) {
      console.error('❌ Error generating month summary:', error);
    }
  }

  async calculateTotalDays() {
    const startDate = new Date(this.startDate);
    const endDate = new Date(this.endDate);
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    return days.length;
  }

  async saveProgress() {
    try {
      await fs.mkdir(path.dirname(this.processFile), { recursive: true });
      await fs.writeFile(this.processFile, JSON.stringify(this.progress, null, 2));
    } catch (error) {
      console.warn('⚠️  Could not save progress:', error.message);
    }
  }

  async finalizeProcess() {
    this.progress.status = 'completed';
    this.progress.endTime = new Date().toISOString();
    this.progress.duration = new Date(this.progress.endTime).getTime() - new Date(this.progress.startTime).getTime();
    await this.saveProgress();
  }

  generateSummary() {
    console.log('\n📋 RECALCULATION SUMMARY');
    console.log('========================');
    console.log(`🆔 Process ID: ${this.processId}`);
    console.log(`📊 Status: ${this.progress.status}`);
    console.log(`⏰ Duration: ${this.progress.duration ? Math.round(this.progress.duration / 1000) : 'N/A'} seconds`);
    console.log('');

    // Progress statistics
    console.log('📈 PROGRESS STATISTICS');
    console.log('   ┌─────────────────────────────────────────────────────');
    console.log(`   │ Months Completed: ${this.progress.completedMonths}/${this.progress.totalMonths}`);
    console.log(`   │ Days Completed: ${this.progress.completedDays}/${this.progress.totalDays}`);
    console.log(`   │ Records Processed: ${this.progress.stats.attendanceRecordsProcessed}`);
    console.log(`   │ Metrics Recalculated: ${this.progress.stats.metricsRecalculated}`);
    console.log(`   │ Employees Processed: ${this.progress.stats.employeesProcessed}`);
    console.log(`   │ Days Processed: ${this.progress.stats.daysProcessed}`);
    console.log('   └─────────────────────────────────────────────────────');

    // Errors
    if (this.progress.errors.length > 0) {
      console.log(`\n❌ ERRORS: ${this.progress.errors.length}`);
      this.progress.errors.slice(0, 5).forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.month || error.day}: ${error.error}`);
      });
      if (this.progress.errors.length > 5) {
        console.log(`   ... and ${this.progress.errors.length - 5} more errors`);
      }
    }

    const success = this.progress.status === 'completed' && this.progress.errors.length === 0;
    console.log(`\n${success ? '✅' : '⚠️'} RECALCULATION ${success ? 'COMPLETED' : 'FINISHED WITH ISSUES'}`);
    
    return {
      processId: this.processId,
      success: success,
      status: this.progress.status,
      stats: this.progress.stats,
      errors: this.progress.errors.length,
      duration: this.progress.duration
    };
  }
}

// Parse command line arguments for flexible usage
function parseCommandLineArgs() {
  const args = process.argv.slice(2);
  const options = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--start-date' && args[i + 1]) {
      options.startDate = args[i + 1];
      i++;
    } else if (arg === '--end-date' && args[i + 1]) {
      options.endDate = args[i + 1];
      i++;
    } else if (arg === '--employees' && args[i + 1]) {
      options.employeeFilter = args[i + 1].split(',').map(e => e.trim());
      i++;
    } else if (arg === '--departments' && args[i + 1]) {
      options.departmentFilter = args[i + 1].split(',').map(d => d.trim());
      i++;
    } else if (arg === '--process-id' && args[i + 1]) {
      options.processId = args[i + 1];
      i++;
    } else if (arg === '--no-force') {
      options.forceRecalculation = false;
    }
  }
  
  return options;
}

// Show usage information
function showUsage() {
  console.log('📖 UNIFIED METRICS RECALCULATOR - USAGE');
  console.log('========================================');
  console.log('');
  console.log('Basic Usage:');
  console.log('  node scripts/unified-metrics-recalculator.cjs [options]');
  console.log('');
  console.log('Options:');
  console.log('  --start-date YYYY-MM-DD    Start date for recalculation (default: 2025-06-01)');
  console.log('  --end-date YYYY-MM-DD      End date for recalculation (default: 2025-07-31)');
  console.log('  --employees CODE1,CODE2    Comma-separated employee codes to process');
  console.log('  --departments DEPT1,DEPT2  Comma-separated departments to process');
  console.log('  --process-id ID            Custom process identifier');
  console.log('  --no-force                 Do not force recalculation of existing data');
  console.log('');
  console.log('Examples:');
  console.log('  # Recalculate June and July 2025 (default)');
  console.log('  node scripts/unified-metrics-recalculator.cjs');
  console.log('');
  console.log('  # Recalculate specific month');
  console.log('  node scripts/unified-metrics-recalculator.cjs --start-date 2025-05-01 --end-date 2025-05-31');
  console.log('');
  console.log('  # Recalculate for specific employees');
  console.log('  node scripts/unified-metrics-recalculator.cjs --employees 10090001,10090002,10090003');
  console.log('');
  console.log('  # Recalculate for specific departments');
  console.log('  node scripts/unified-metrics-recalculator.cjs --departments IT,HR,Finance');
  console.log('');
  console.log('  # Recalculate entire year 2025');
  console.log('  node scripts/unified-metrics-recalculator.cjs --start-date 2025-01-01 --end-date 2025-12-31');
  console.log('');
  console.log('  # Resume existing process');
  console.log('  node scripts/unified-metrics-recalculator.cjs --process-id recalc_1234567890');
  console.log('');
}

// Run the recalculator if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  
  // Check for help flag
  if (args.includes('--help') || args.includes('-h')) {
    showUsage();
    process.exit(0);
  }
  
  const options = parseCommandLineArgs();
  const recalculator = new UnifiedMetricsRecalculator(options);
  
  recalculator.run().then(result => {
    console.log('\n🎯 RECALCULATION RESULT:', JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
  }).catch(error => {
    console.error('💥 CRITICAL ERROR:', error);
    process.exit(1);
  });
}

module.exports = { UnifiedMetricsRecalculator };