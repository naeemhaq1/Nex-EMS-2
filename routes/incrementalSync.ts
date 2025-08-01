import { Request, Response } from "express";
import { incrementalSyncService } from "../services/incrementalSync";

/**
 * Perform incremental sync - only pull new records since last timestamp
 */
export async function performIncrementalSync(req: Request, res: Response) {
  try {
    const { chunkSize, maxRetries, timeoutMinutes } = req.body;
    
    const config = {
      chunkSize: chunkSize || 200,
      maxRetries: maxRetries || 3,
      timeoutMinutes: timeoutMinutes || 10,
    };

    const result = await incrementalSyncService.performIncrementalSync(config);
    res.json(result);
  } catch (error) {
    console.error('Error in incremental sync:', error);
    res.status(500).json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error',
      newRecords: 0 
    });
  }
}

/**
 * Perform manual sync for specified date range
 */
export async function performManualSync(req: Request, res: Response) {
  try {
    const { dateFrom, dateTo, chunkSize, maxRetries, timeoutMinutes } = req.body;
    
    if (!dateFrom || !dateTo) {
      return res.status(400).json({ 
        success: false, 
        message: 'dateFrom and dateTo are required for manual sync',
        totalRecords: 0 
      });
    }

    const config = {
      chunkSize: chunkSize || 500,
      maxRetries: maxRetries || 3,
      timeoutMinutes: timeoutMinutes || 30,
    };

    const result = await incrementalSyncService.performManualSync(
      new Date(dateFrom),
      new Date(dateTo),
      config
    );
    res.json(result);
  } catch (error) {
    console.error('Error in manual sync:', error);
    res.status(500).json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error',
      totalRecords: 0 
    });
  }
}

/**
 * Get incremental sync status
 */
export async function getIncrementalSyncStatus(req: Request, res: Response) {
  try {
    const status = incrementalSyncService.getStatus();
    res.json(status);
  } catch (error) {
    console.error('Error getting incremental sync status:', error);
    res.status(500).json({ 
      isRunning: false, 
      lastSyncTimestamp: null,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}