import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MobileLayout } from '@/components/MobileLayout';
import { useToast } from '@/hooks/use-toast';
// Mock offline service for demonstration
const mockOfflineService = {
  getStorageStats: async () => ({
    totalRecords: 0,
    pendingRecords: 0,
    syncedRecords: 0,
    oldestRecord: null
  }),
  syncAllRecords: async () => 0,
  clearSyncedRecords: async () => {}
};
import { 
  RotateCcw, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Database, 
  RefreshCw,
  Activity,
  TrendingUp,
  Wifi,
  WifiOff,
  Shield
} from 'lucide-react';

export default function MobileSyncStatus() {
  const [syncStats, setSyncStats] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);
  const { toast } = useToast();

  // Load sync statistics
  const loadSyncStats = async () => {
    try {
      const stats = await mockOfflineService.getStorageStats();
      setSyncStats(stats);
      setLastRefresh(new Date().toISOString());
    } catch (error) {
      console.error('Failed to load sync stats:', error);
    }
  };

  // Initialize on mount
  useEffect(() => {
    loadSyncStats();
  }, []);

  // Refresh stats
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadSyncStats();
    setIsRefreshing(false);
    toast({
      title: "Refreshed",
      description: "Sync status updated",
    });
  };

  // Force sync
  const handleForceSync = async () => {
    if (!navigator.onLine) {
      toast({
        title: "Offline",
        description: "Cannot sync while offline",
        variant: "destructive"
      });
      return;
    }

    try {
      const syncedCount = await mockOfflineService.syncAllRecords();
      await loadSyncStats();
      toast({
        title: "Sync Complete",
        description: `${syncedCount} records synchronized`,
      });
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync records",
        variant: "destructive"
      });
    }
  };

  // Calculate sync health
  const getSyncHealth = () => {
    if (!syncStats) return { level: 'unknown', color: 'text-gray-400' };
    
    const pendingRatio = syncStats.totalRecords > 0 
      ? syncStats.pendingRecords / syncStats.totalRecords 
      : 0;
    
    if (pendingRatio === 0) return { level: 'excellent', color: 'text-green-400' };
    if (pendingRatio < 0.1) return { level: 'good', color: 'text-blue-400' };
    if (pendingRatio < 0.3) return { level: 'fair', color: 'text-yellow-400' };
    return { level: 'poor', color: 'text-red-400' };
  };

  const health = getSyncHealth();

  return (
    <MobileLayout title="Sync Status">
      <div className="flex flex-col h-screen bg-[#1A1B3E] p-4 space-y-4">
        {/* Header */}
        <Card className="bg-[#2A2B5E] border-slate-700">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-lg flex items-center space-x-2">
                <Shield className="h-5 w-5 text-blue-400" />
                <span>Sync Status</span>
              </CardTitle>
              <Button
                onClick={handleRefresh}
                disabled={isRefreshing}
                variant="ghost"
                size="sm"
                className="text-slate-300 hover:text-white p-2 touch-manipulation"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {navigator.onLine ? (
                  <Wifi className="h-5 w-5 text-green-400" />
                ) : (
                  <WifiOff className="h-5 w-5 text-red-400" />
                )}
                <span className="text-white text-sm">
                  {navigator.onLine ? 'Online' : 'Offline'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${health.color.replace('text-', 'bg-')}`} />
                <span className={`text-sm ${health.color}`}>
                  {health.level.charAt(0).toUpperCase() + health.level.slice(1)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-[#2A2B5E] border-slate-700">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">
                {syncStats?.totalRecords || 0}
              </div>
              <div className="text-xs text-slate-400">Total Records</div>
            </CardContent>
          </Card>
          <Card className="bg-[#2A2B5E] border-slate-700">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-400">
                {syncStats?.pendingRecords || 0}
              </div>
              <div className="text-xs text-slate-400">Pending Sync</div>
            </CardContent>
          </Card>
          <Card className="bg-[#2A2B5E] border-slate-700">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-400">
                {syncStats?.syncedRecords || 0}
              </div>
              <div className="text-xs text-slate-400">Synced</div>
            </CardContent>
          </Card>
          <Card className="bg-[#2A2B5E] border-slate-700">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-400">
                {syncStats?.totalRecords > 0 
                  ? Math.round((syncStats.syncedRecords / syncStats.totalRecords) * 100) 
                  : 0}%
              </div>
              <div className="text-xs text-slate-400">Sync Rate</div>
            </CardContent>
          </Card>
        </div>

        {/* Sync Progress */}
        {syncStats && syncStats.pendingRecords > 0 && (
          <Card className="bg-[#2A2B5E] border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm flex items-center space-x-2">
                <Activity className="h-4 w-4" />
                <span>Sync Progress</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white">Completion</span>
                  <span className="text-slate-400">
                    {syncStats.syncedRecords}/{syncStats.totalRecords}
                  </span>
                </div>
                <Progress 
                  value={syncStats.totalRecords > 0 ? (syncStats.syncedRecords / syncStats.totalRecords) * 100 : 0} 
                  className="h-2"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sync Actions */}
        <Card className="bg-[#2A2B5E] border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm flex items-center space-x-2">
              <RotateCcw className="h-4 w-4" />
              <span>Sync Actions</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <Button
              onClick={handleForceSync}
              disabled={!navigator.onLine}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 touch-manipulation"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Force Sync Now
            </Button>
            
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => mockOfflineService.clearSyncedRecords()}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700 py-2 text-sm touch-manipulation"
              >
                <Database className="h-4 w-4 mr-2" />
                Clear Synced
              </Button>
              <Button
                onClick={handleRefresh}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700 py-2 text-sm touch-manipulation"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Sync History */}
        <Card className="bg-[#2A2B5E] border-slate-700 flex-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>Sync History</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {syncStats?.oldestRecord ? (
                <div className="flex items-center justify-between p-3 bg-[#1A1B3E] rounded-lg">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <div>
                      <div className="text-sm font-medium text-white">
                        Last Sync
                      </div>
                      <div className="text-xs text-slate-400">
                        {new Date(syncStats.oldestRecord).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <Badge className="bg-green-600 text-white">
                    Complete
                  </Badge>
                </div>
              ) : (
                <div className="flex items-center justify-center py-8 text-center">
                  <div>
                    <Clock className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">No Sync History</h3>
                    <p className="text-slate-400 text-sm">Sync history will appear here</p>
                  </div>
                </div>
              )}
              
              {lastRefresh && (
                <div className="text-xs text-slate-400 text-center">
                  Last updated: {new Date(lastRefresh).toLocaleString()}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
}