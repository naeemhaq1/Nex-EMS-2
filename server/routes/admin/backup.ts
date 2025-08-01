import { Router } from 'express';
import { autoBackupService, type BackupStats } from '../../services/autoBackupService';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import fs from 'fs/promises';
import path from 'path';

const router = Router();

// Apply authentication middleware
router.use(requireAuth);
router.use(requireAdmin);

/**
 * Get backup service status
 */
router.get('/status', async (req, res) => {
  try {
    const status = autoBackupService.getStatus();
    const backupDirectory = './backups';
    
    // Get list of existing backups
    let backupFiles: Array<{ name: string; size: number; created: Date }> = [];
    
    try {
      const files = await fs.readdir(backupDirectory);
      const backupPromises = files
        .filter(file => file.startsWith('NEXLINX-COMPREHENSIVE-BACKUP-') && file.endsWith('.tar.gz'))
        .map(async (file) => {
          const filePath = path.join(backupDirectory, file);
          const stats = await fs.stat(filePath);
          return {
            name: file,
            size: stats.size,
            created: stats.mtime
          };
        });
      
      backupFiles = await Promise.all(backupPromises);
      backupFiles.sort((a, b) => b.created.getTime() - a.created.getTime());
    } catch (error) {
      console.warn('[Backup API] Warning reading backup files:', error);
    }

    res.json({
      service: {
        ...status,
        backupDirectory
      },
      backups: backupFiles,
      summary: {
        totalBackups: backupFiles.length,
        totalSize: backupFiles.reduce((sum, file) => sum + file.size, 0),
        latestBackup: backupFiles[0] || null,
        oldestBackup: backupFiles[backupFiles.length - 1] || null
      }
    });
    
  } catch (error) {
    console.error('[Backup API] Error getting backup status:', error);
    res.status(500).json({ 
      error: 'Failed to get backup status',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Trigger manual backup
 */
router.post('/trigger', async (req, res) => {
  try {
    console.log('[Backup API] Manual backup triggered by admin');
    
    // Start backup in background
    const backupPromise = autoBackupService.triggerManualBackup();
    
    // Return immediate response
    res.json({
      success: true,
      message: 'Manual backup started',
      timestamp: new Date().toISOString()
    });

    // Handle backup completion in background
    backupPromise
      .then(stats => {
        if (stats.success) {
          console.log(`[Backup API] Manual backup completed successfully: ${stats.backupPath}`);
        } else {
          console.error(`[Backup API] Manual backup failed: ${stats.errorMessage}`);
        }
      })
      .catch(error => {
        console.error('[Backup API] Manual backup error:', error);
      });

  } catch (error) {
    console.error('[Backup API] Error triggering manual backup:', error);
    res.status(500).json({ 
      error: 'Failed to trigger backup',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Download backup file
 */
router.get('/download/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    
    // Validate filename for security
    if (!filename.startsWith('NEXLINX-COMPREHENSIVE-BACKUP-') || !filename.endsWith('.tar.gz')) {
      return res.status(400).json({ error: 'Invalid backup filename' });
    }

    const backupPath = path.join('./backups', filename);
    
    // Check if file exists
    try {
      await fs.access(backupPath);
    } catch {
      return res.status(404).json({ error: 'Backup file not found' });
    }

    // Send file for download
    res.download(backupPath, filename, (error) => {
      if (error) {
        console.error('[Backup API] Error sending backup file:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to download backup' });
        }
      }
    });

  } catch (error) {
    console.error('[Backup API] Error in download route:', error);
    res.status(500).json({ 
      error: 'Failed to process download request',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Delete backup file
 */
router.delete('/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    
    // Validate filename for security
    if (!filename.startsWith('NEXLINX-COMPREHENSIVE-BACKUP-') || !filename.endsWith('.tar.gz')) {
      return res.status(400).json({ error: 'Invalid backup filename' });
    }

    const backupPath = path.join('./backups', filename);
    
    // Check if file exists and delete
    try {
      await fs.unlink(backupPath);
      console.log(`[Backup API] Deleted backup file: ${filename}`);
      
      res.json({
        success: true,
        message: 'Backup deleted successfully',
        filename
      });
      
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return res.status(404).json({ error: 'Backup file not found' });
      }
      throw error;
    }

  } catch (error) {
    console.error('[Backup API] Error deleting backup:', error);
    res.status(500).json({ 
      error: 'Failed to delete backup',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Get backup configuration
 */
router.get('/config', (req, res) => {
  res.json({
    backupDirectory: './backups',
    maxBackupAge: 30, // days
    scheduleTime: '00:01 PKT',
    timezone: 'Asia/Karachi',
    compressionLevel: 9,
    includedTables: [
      'users', 'employee_records', 'attendance_records', 'biotime_sync_data',
      'whatsapp_message_logs', 'whatsapp_blacklist', 'whatsapp_contacts', 
      'whatsapp_groups', 'whatsapp_messages', 'whatsapp_analytics',
      'geofence_clusters', 'mobile_punch_validation', 'announcements'
    ]
  });
});

export default router;