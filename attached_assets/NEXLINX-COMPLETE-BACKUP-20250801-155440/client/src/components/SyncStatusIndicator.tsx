/**
 * Sync Status Indicator Component
 * Shows real-time sync status with visual feedback for offline data collection
 */

import React from 'react';
import { WifiOff, Wifi, Upload, Clock, AlertTriangle, CheckCircle, RotateCcw } from 'lucide-react';
import { useSyncManager } from '../hooks/useSyncManager';

interface SyncStatusIndicatorProps {
  className?: string;
  compact?: boolean;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({ 
  className = '', 
  compact = false 
}) => {
  const { 
    stats, 
    isOnline, 
    isSyncing, 
    triggerSync, 
    clearFailedItems, 
    retryFailedItems 
  } = useSyncManager();

  const getSyncStatusColor = () => {
    if (!isOnline) return 'text-orange-400';
    if (stats.totalFailed > 0) return 'text-red-400';
    if (stats.totalPending > 0) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getSyncStatusText = () => {
    if (!isOnline && stats.totalPending > 0) {
      return `Offline: ${stats.totalPending} pending`;
    }
    if (isSyncing) return 'Syncing...';
    if (stats.totalFailed > 0) return `${stats.totalFailed} failed`;
    if (stats.totalPending > 0) return `${stats.totalPending} pending`;
    return 'All synced';
  };

  const getIcon = () => {
    if (!isOnline) return <WifiOff className="w-4 h-4" />;
    if (isSyncing) return <Upload className="w-4 h-4 animate-pulse" />;
    if (stats.totalFailed > 0) return <AlertTriangle className="w-4 h-4" />;
    if (stats.totalPending > 0) return <Clock className="w-4 h-4" />;
    return <CheckCircle className="w-4 h-4" />;
  };

  if (compact) {
    return (
      <div className={`flex items-center space-x-1 ${className}`}>
        <div className={getSyncStatusColor()}>
          {getIcon()}
        </div>
        {stats.totalPending > 0 && (
          <span className="text-xs text-gray-300">{stats.totalPending}</span>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-gray-800/90 backdrop-blur-sm rounded-lg p-3 border border-gray-700 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className={getSyncStatusColor()}>
            {getIcon()}
          </div>
          <div>
            <div className="text-white text-sm font-medium">
              {getSyncStatusText()}
            </div>
            {!isOnline && stats.totalPending > 0 && (
              <div className="text-gray-400 text-xs">
                Data will sync when online
              </div>
            )}
          </div>
        </div>
        
        <div className="flex space-x-1">
          {isOnline && stats.totalPending > 0 && (
            <button
              onClick={triggerSync}
              disabled={isSyncing}
              className="p-1 hover:bg-gray-700 rounded text-blue-400 disabled:opacity-50"
              title="Sync now"
            >
              <Upload className="w-4 h-4" />
            </button>
          )}
          
          {stats.totalFailed > 0 && (
            <button
              onClick={retryFailedItems}
              className="p-1 hover:bg-gray-700 rounded text-yellow-400"
              title="Retry failed items"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      
      {/* Detailed stats */}
      {!compact && (stats.totalPending > 0 || stats.totalFailed > 0) && (
        <div className="mt-2 pt-2 border-t border-gray-600">
          <div className="grid grid-cols-2 gap-2 text-xs">
            {stats.totalPending > 0 && (
              <div className="text-yellow-400">
                {stats.totalPending} pending
              </div>
            )}
            {stats.totalFailed > 0 && (
              <div className="text-red-400">
                {stats.totalFailed} failed
              </div>
            )}
          </div>
          
          {stats.lastSyncTime && (
            <div className="text-gray-400 text-xs mt-1">
              Last sync: {new Date(stats.lastSyncTime).toLocaleTimeString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SyncStatusIndicator;