import { Request, Response } from 'express';
import { intelligentPollingService } from '../services/intelligentPollingService';
import { attendanceConsistencyMonitor } from '../services/attendanceConsistencyMonitor';

export async function startIntelligentPolling(req: Request, res: Response) {
  try {
    console.log('[IntelligentPolling] Starting intelligent polling system...');
    
    // Configure intelligent polling with overlap
    intelligentPollingService.updateConfig({
      intervalMinutes: 5,        // Poll every 5 minutes
      overlapMinutes: 2,         // 2-minute overlap buffer
      retrievalMinutes: 7,       // Retrieve 7 minutes of data
      maxRetries: 3,
      retryDelayMs: 30000,
      minAttendanceRate: 80,
      duplicateCleanupHours: 24
    });

    // Start the services
    await intelligentPollingService.start();
    await attendanceConsistencyMonitor.start();
    
    console.log('[IntelligentPolling] ✅ Intelligent polling system started successfully');
    
    res.json({
      success: true,
      message: 'Intelligent polling system started',
      configuration: {
        intervalMinutes: 5,
        overlapMinutes: 2,
        retrievalMinutes: 7,
        minAttendanceRate: 80
      }
    });
    
  } catch (error) {
    console.error('[IntelligentPolling] Error starting intelligent polling:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

export async function stopIntelligentPolling(req: Request, res: Response) {
  try {
    console.log('[IntelligentPolling] Stopping intelligent polling system...');
    
    await intelligentPollingService.stop();
    await attendanceConsistencyMonitor.stop();
    
    console.log('[IntelligentPolling] ✅ Intelligent polling system stopped');
    
    res.json({
      success: true,
      message: 'Intelligent polling system stopped'
    });
    
  } catch (error) {
    console.error('[IntelligentPolling] Error stopping intelligent polling:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

export async function getIntelligentPollingStatus(req: Request, res: Response) {
  try {
    const pollingStatus = await intelligentPollingService.getStatus();
    const monitoringStatus = await attendanceConsistencyMonitor.getStatus();
    
    res.json({
      success: true,
      polling: pollingStatus,
      monitoring: monitoringStatus
    });
    
  } catch (error) {
    console.error('[IntelligentPolling] Error getting status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

export async function triggerManualPoll(req: Request, res: Response) {
  try {
    console.log('[IntelligentPolling] Triggering manual poll...');
    
    // Perform a manual poll
    const result = await (intelligentPollingService as any).performIntelligentPoll();
    
    res.json({
      success: true,
      message: 'Manual poll completed',
      result: result
    });
    
  } catch (error) {
    console.error('[IntelligentPolling] Error during manual poll:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

export async function updatePollingConfig(req: Request, res: Response) {
  try {
    const config = req.body;
    
    // Validate config
    if (config.intervalMinutes && config.intervalMinutes < 1) {
      return res.status(400).json({
        success: false,
        error: 'Interval must be at least 1 minute'
      });
    }
    
    if (config.retrievalMinutes && config.intervalMinutes && config.retrievalMinutes <= config.intervalMinutes) {
      return res.status(400).json({
        success: false,
        error: 'Retrieval minutes must be greater than interval minutes to ensure overlap'
      });
    }
    
    intelligentPollingService.updateConfig(config);
    
    res.json({
      success: true,
      message: 'Configuration updated',
      config: config
    });
    
  } catch (error) {
    console.error('[IntelligentPolling] Error updating config:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}