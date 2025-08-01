import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Wifi, 
  WifiOff, 
  Clock, 
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface WhatsAppServiceStatus {
  status: 'connected' | 'degraded' | 'disconnected';
  statusText: string;
  responseTime: number;
  lastChecked: string;
  nextCheck: string;
  details: any;
}

interface WhatsAppStatusIndicatorProps {
  showDetails?: boolean;
  compact?: boolean;
  onStatusChange?: (status: WhatsAppServiceStatus) => void;
}

export default function WhatsAppStatusIndicator({ 
  showDetails = false, 
  compact = false,
  onStatusChange
}: WhatsAppStatusIndicatorProps) {
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('');

  // Query WhatsApp service status every 30 seconds
  const { data: status, isLoading, refetch } = useQuery<WhatsAppServiceStatus>({
    queryKey: ['/api/whatsapp-management/service-status'],
    refetchInterval: 30000, // 30 second intervals for UI updates
    staleTime: 25000, // 25 seconds
    onSuccess: (data) => {
      if (data) {
        setLastUpdateTime(new Date().toLocaleTimeString());
        onStatusChange?.(data);
      }
    }
  });

  // Manual refresh handler
  const handleRefresh = async () => {
    try {
      await apiRequest('/api/whatsapp-management/service-status/refresh', {
        method: 'POST'
      });
      refetch();
    } catch (error) {
      console.error('Failed to refresh WhatsApp status:', error);
    }
  };

  // Get status indicator elements
  const getStatusIndicator = () => {
    if (isLoading) {
      return {
        icon: <Clock className="h-4 w-4 animate-pulse" />,
        color: 'bg-gray-500',
        textColor: 'text-gray-400',
        text: 'Checking...'
      };
    }

    if (!status) {
      return {
        icon: <XCircle className="h-4 w-4" />,
        color: 'bg-red-500',
        textColor: 'text-red-400',
        text: 'Unknown'
      };
    }

    switch (status.status) {
      case 'connected':
        return {
          icon: <CheckCircle className="h-4 w-4" />,
          color: 'bg-green-500',
          textColor: 'text-green-400',
          text: status.statusText
        };
      case 'degraded':
        return {
          icon: <AlertTriangle className="h-4 w-4" />,
          color: 'bg-yellow-500',
          textColor: 'text-yellow-400',
          text: status.statusText
        };
      case 'disconnected':
        return {
          icon: <XCircle className="h-4 w-4" />,
          color: 'bg-red-500',
          textColor: 'text-red-400',
          text: status.statusText
        };
      default:
        return {
          icon: <WifiOff className="h-4 w-4" />,
          color: 'bg-gray-500',
          textColor: 'text-gray-400',
          text: 'Unknown'
        };
    }
  };

  const indicator = getStatusIndicator();

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${indicator.color} animate-pulse`} />
        <span className={`text-xs ${indicator.textColor}`}>
          WhatsApp {indicator.text}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-[#2A2B5E] rounded-lg">
      {/* Status Light */}
      <div className="relative">
        <div className={`w-4 h-4 rounded-full ${indicator.color}`} />
        <div className={`absolute inset-0 w-4 h-4 rounded-full ${indicator.color} animate-ping opacity-75`} />
      </div>

      {/* Status Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {indicator.icon}
          <span className="font-medium text-white">WhatsApp Service</span>
          <Badge 
            variant={status?.status === 'connected' ? 'default' : 'destructive'}
            className="text-xs"
          >
            {indicator.text}
          </Badge>
        </div>
        
        {showDetails && status && (
          <div className="text-xs text-slate-400 mt-1 space-y-1">
            <div>Response: {status.responseTime}ms</div>
            <div>Last checked: {new Date(status.lastChecked).toLocaleTimeString()}</div>
            <div>Next check: {new Date(status.nextCheck).toLocaleTimeString()}</div>
            {status.details?.error && (
              <div className="text-red-400">Error: {status.details.error}</div>
            )}
            {status.details?.businessName && (
              <div>Business: {status.details.businessName}</div>
            )}
          </div>
        )}
      </div>

      {/* Refresh Button */}
      <Button
        onClick={handleRefresh}
        size="sm"
        variant="ghost"
        className="p-2 hover:bg-[#1A1B3E]"
      >
        <RefreshCw className="h-4 w-4" />
      </Button>
    </div>
  );
}