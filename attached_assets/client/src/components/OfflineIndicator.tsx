/**
 * OfflineIndicator Component
 * Shows connection status and offline capabilities
 */

import React from 'react';
import { WifiOff, Wifi, RefreshCw, AlertCircle } from 'lucide-react';
import { useConnectionStatus } from '../hooks/useOfflineData';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface OfflineIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export function OfflineIndicator({ className = '', showDetails = false }: OfflineIndicatorProps) {
  const { isOnline, lastOnline } = useConnectionStatus();

  const handleRefresh = () => {
    window.location.reload();
  };

  const getStatusColor = () => {
    return isOnline ? 'bg-green-500' : 'bg-red-500';
  };

  const getStatusText = () => {
    if (isOnline) return 'Online';
    
    if (lastOnline) {
      const timeSinceOnline = Date.now() - lastOnline.getTime();
      const minutesAgo = Math.floor(timeSinceOnline / (1000 * 60));
      
      if (minutesAgo < 1) return 'Just went offline';
      if (minutesAgo < 60) return `Offline ${minutesAgo}m`;
      
      const hoursAgo = Math.floor(minutesAgo / 60);
      return `Offline ${hoursAgo}h`;
    }
    
    return 'Offline';
  };

  if (showDetails) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800">
          {isOnline ? (
            <Wifi className="w-4 h-4 text-green-500" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-500" />
          )}
          <span className="text-sm font-medium">{getStatusText()}</span>
        </div>
        
        {!isOnline && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  className="h-8 w-8 p-0"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Refresh to check connection</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        
        {!isOnline && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center">
                  <AlertCircle className="w-4 h-4 text-yellow-500" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Using cached data - some features may be limited</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    );
  }

  // Compact indicator
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center ${className}`}>
            <Badge
              variant={isOnline ? "default" : "destructive"}
              className="gap-1 text-xs"
            >
              <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-center">
            <p className="font-medium">{getStatusText()}</p>
            {!isOnline && (
              <p className="text-xs text-gray-500 mt-1">
                Using cached data
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Connection status for mobile dashboards
export function MobileConnectionStatus({ className = '' }: { className?: string }) {
  const { isOnline, lastOnline } = useConnectionStatus();

  if (isOnline) return null; // Don't show anything when online

  return (
    <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4 ${className}`}>
      <div className="flex items-center gap-2">
        <WifiOff className="w-5 h-5 text-red-500 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="text-sm font-medium text-red-800 dark:text-red-200">
            No Internet Connection
          </h4>
          <p className="text-xs text-red-600 dark:text-red-300 mt-1">
            {lastOnline 
              ? `Last online: ${lastOnline.toLocaleTimeString()}` 
              : 'Currently offline'
            }
          </p>
          <p className="text-xs text-red-600 dark:text-red-300">
            Using cached data • Some features may be limited
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.reload()}
          className="text-red-600 border-red-300 hover:bg-red-50"
        >
          <RefreshCw className="w-4 h-4 mr-1" />
          Retry
        </Button>
      </div>
    </div>
  );
}