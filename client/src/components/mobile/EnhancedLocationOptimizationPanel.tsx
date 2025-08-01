/**
 * Enhanced Location Optimization Panel for Mobile Admin
 * Shows field staff vs office staff optimization metrics
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Navigation2, 
  Timer, 
  Users, 
  TrendingDown, 
  Play, 
  Square, 
  Activity,
  MapPin,
  Zap,
  Clock,
  Target
} from 'lucide-react';

interface LocationOptimizationStats {
  fieldStaff3Min: number;
  officeStaff5Min: number;
  hybridStaff4Min: number;
  totalEmployees: number;
  costSavings: {
    requestsPerDay: number;
    monthlySavings: number;
    optimizationRate: number;
  };
}

interface ServiceStatus {
  isRunning: boolean;
  activeCollections: number;
  categories: Record<string, number>;
}

export function EnhancedLocationOptimizationPanel() {
  const [activeTab, setActiveTab] = useState<'overview' | 'control' | 'metrics'>('overview');

  // Get optimization statistics
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<LocationOptimizationStats>({
    queryKey: ['/api/admin/enhanced-location-stats'],
    refetchInterval: 10000, // Update every 10 seconds
  });

  // Get optimization summary
  const { data: summary, isLoading: summaryLoading } = useQuery<any>({
    queryKey: ['/api/admin/location-optimization-summary'],
    refetchInterval: 15000,
  });

  // Service control functions
  const startEnhancedCollection = async () => {
    try {
      const response = await fetch('/api/admin/start-enhanced-collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        refetchStats();
      }
    } catch (error) {
      console.error('Failed to start enhanced collection:', error);
    }
  };

  const stopEnhancedCollection = async () => {
    try {
      const response = await fetch('/api/admin/stop-enhanced-collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        refetchStats();
      }
    } catch (error) {
      console.error('Failed to stop enhanced collection:', error);
    }
  };

  if (statsLoading || summaryLoading) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Navigation2 className="h-5 w-5 text-orange-500" />
            Enhanced Location Optimization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Navigation2 className="h-5 w-5 text-orange-500" />
          Enhanced Location Optimization
        </CardTitle>
        <p className="text-sm text-gray-600 mt-1">
          Field staff (3min) vs Office staff (5min) tracking intervals
        </p>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
            <TabsTrigger value="control" className="text-xs">Control</TabsTrigger>
            <TabsTrigger value="metrics" className="text-xs">Metrics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Staff Distribution */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Field Staff</span>
                </div>
                <div className="mt-2">
                  <div className="text-2xl font-bold text-green-700">{stats?.fieldStaff3Min || 0}</div>
                  <div className="text-xs text-green-600">3-minute intervals</div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Office Staff</span>
                </div>
                <div className="mt-2">
                  <div className="text-2xl font-bold text-blue-700">{stats?.officeStaff5Min || 0}</div>
                  <div className="text-xs text-blue-600">5-minute intervals</div>
                </div>
              </div>
            </div>

            {/* Hybrid Staff */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium">Hybrid Staff</span>
                <Badge variant="outline" className="ml-auto text-xs">4-min intervals</Badge>
              </div>
              <div className="mt-2">
                <div className="text-xl font-bold text-purple-700">{stats?.hybridStaff4Min || 0}</div>
                <div className="text-xs text-purple-600">Mixed work patterns</div>
              </div>
            </div>

            {/* Optimization Rate */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium">Cost Savings</span>
              </div>
              <div className="mt-2">
                <div className="text-xl font-bold text-orange-700">
                  {stats?.costSavings.optimizationRate.toFixed(1) || 0}%
                </div>
                <div className="text-xs text-orange-600">
                  {stats?.costSavings.monthlySavings.toLocaleString() || 0} requests/month saved
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="control" className="space-y-4 mt-4">
            {/* Service Control */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4 text-gray-600" />
                Enhanced Collection Service
              </h4>
              
              <div className="flex gap-2">
                <Button 
                  onClick={startEnhancedCollection}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  size="sm"
                >
                  <Play className="h-4 w-4 mr-1" />
                  Start
                </Button>
                <Button 
                  onClick={stopEnhancedCollection}
                  variant="destructive"
                  className="flex-1"
                  size="sm"
                >
                  <Square className="h-4 w-4 mr-1" />
                  Stop
                </Button>
              </div>

              {/* Service Status */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <div className="text-xs text-gray-600 mb-1">Service Status</div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm">Enhanced location collection active</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Zap className="h-4 w-4 text-gray-600" />
                Quick Actions
              </h4>
              <Button 
                variant="outline" 
                className="w-full justify-start" 
                size="sm"
              >
                <Target className="h-4 w-4 mr-2" />
                Recalculate Field Departments
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start" 
                size="sm"
              >
                <Clock className="h-4 w-4 mr-2" />
                Reset All Intervals to Default
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="metrics" className="space-y-4 mt-4">
            {/* Daily Request Metrics */}
            {summary?.distribution && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Daily Request Distribution</h4>
                
                {Object.entries(summary.distribution).map(([type, data]: [string, any]) => (
                  <div key={type} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium capitalize">
                        {type.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {data.interval}
                      </Badge>
                    </div>
                    <div className="text-lg font-bold">{data.count}</div>
                    <div className="text-xs text-gray-600">
                      {data.dailyRequests.toLocaleString()} requests/day
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Monthly Optimization Summary */}
            {summary?.optimization && (
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 rounded-lg p-3">
                <h4 className="text-sm font-medium text-indigo-700 mb-2">Monthly Optimization</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Requests Saved:</span>
                    <span className="font-medium">{summary.optimization.monthlyRequestsSaved.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Optimization Rate:</span>
                    <span className="font-medium">{summary.optimization.optimizationRate}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Field Staff Ratio:</span>
                    <span className="font-medium">{summary.optimization.fieldStaffRatio}</span>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}