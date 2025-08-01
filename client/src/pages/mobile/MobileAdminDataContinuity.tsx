import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import MobileAdminDualNavigation from '@/components/mobile/MobileAdminDualNavigation';
import { 
  Database, 
  Calendar, 
  Activity, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Filter,
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  X,
  ArrowLeft
} from 'lucide-react';
import { formatPKTDateTime, getPakistanDayOfWeek, getCurrentPakistanDate } from '@/utils/timezone';

interface DataQuality {
  date: string;
  recordCount: number;
  qualityScore: number;
  gaps: number;
  duplicates: number;
  tier: 'good' | 'fair' | 'poor';
}

interface DataStats {
  totalRecords: number;
  goodDays: number;
  fairDays: number;
  poorDays: number;
  averageQuality: number;
  lastUpdated: string;
}

export default function MobileAdminDataContinuity() {
  const [, navigate] = useLocation();
  // Use Pakistan timezone for current month calculation
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const pktDate = new Date(new Date().getTime() + (5 * 60 * 60 * 1000)); // Current time in PKT
    return pktDate.getMonth();
  });
  const [selectedYear, setSelectedYear] = useState(2025);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch data quality information (convert to 1-based month for API)
  const { data: dataQuality = [], isLoading } = useQuery<DataQuality[]>({
    queryKey: [`/api/admin/data-quality?month=${selectedMonth + 1}&year=${selectedYear}`, selectedMonth + 1, selectedYear],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch data statistics (convert to 1-based month for API)
  const { data: stats } = useQuery<DataStats>({
    queryKey: [`/api/admin/data-stats?month=${selectedMonth + 1}&year=${selectedYear}`, selectedMonth + 1, selectedYear],
    refetchInterval: 30000,
  });

  // NO MOCK DATA - Only use real data from API
  const currentData = dataQuality || [];
  const currentStats = stats || {
    totalRecords: 0,
    goodDays: 0,
    fairDays: 0,
    poorDays: 0,
    averageQuality: 0,
    lastUpdated: new Date().toISOString()
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'good': return 'bg-green-500';
      case 'fair': return 'bg-yellow-500';
      case 'poor': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getTierTextColor = (tier: string) => {
    switch (tier) {
      case 'good': return 'text-green-400';
      case 'fair': return 'text-yellow-400';
      case 'poor': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getQualityTrend = (currentScore: number, previousScore: number) => {
    if (currentScore > previousScore) return <TrendingUp className="w-3 h-3 text-green-400" />;
    if (currentScore < previousScore) return <TrendingDown className="w-3 h-3 text-red-400" />;
    return <Minus className="w-3 h-3 text-gray-400" />;
  };

  const handleRefresh = () => {
    console.log('[Refresh] Button clicked - invalidating queries');
    // Invalidate both specific query keys for current month
    queryClient.invalidateQueries({ 
      queryKey: [`/api/admin/data-quality?month=${selectedMonth + 1}&year=${selectedYear}`, selectedMonth + 1, selectedYear]
    });
    queryClient.invalidateQueries({ 
      queryKey: [`/api/admin/data-stats?month=${selectedMonth + 1}&year=${selectedYear}`, selectedMonth + 1, selectedYear]
    });
    console.log('[Refresh] Queries invalidated, forcing refetch');
  };

  const generateCalendar = () => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const firstDay = new Date(selectedYear, selectedMonth, 1).getDay();
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayData = currentData.find(d => d.date === dateString);
      days.push({ day, data: dayData });
    }

    return days;
  };

  const selectedDayData = selectedDate ? currentData.find(d => d.date === selectedDate) : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1A1B3E] flex items-center justify-center">
        <div className="text-center">
          <Database className="w-8 h-8 text-blue-500 animate-pulse mx-auto mb-4" />
          <p className="text-gray-400">Loading data continuity...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#1A1B3E] text-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-[#1A1B3E] p-4 border-b border-gray-700 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/mobile/admin/dashboard')}
              className="bg-[#2A2B5E] hover:bg-[#3A3B6E] p-2 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="bg-[#2A2B5E] p-2 rounded-lg">
              <Database className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-white text-xl font-semibold">Data Continuity</h1>
              <p className="text-gray-400 text-sm">System data quality heatmap</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              className="bg-blue-600 hover:bg-blue-700 p-2 rounded-lg transition-colors"
              title="Refresh data"
            >
              <RefreshCw className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="bg-[#2A2B5E] hover:bg-[#3A3B6E] p-2 rounded-lg transition-colors"
            >
              <Filter className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-[#2A2B5E] rounded-lg p-3 text-center">
            <div className="text-white text-lg font-bold">{currentStats.totalRecords.toLocaleString()}</div>
            <div className="text-gray-400 text-xs">Records</div>
          </div>
          <div className="bg-[#2A2B5E] rounded-lg p-3 text-center">
            <div className="text-white text-lg font-bold">{currentStats.goodDays}</div>
            <div className="text-gray-400 text-xs">Good Days</div>
          </div>
          <div className="bg-[#2A2B5E] rounded-lg p-3 text-center">
            <div className="text-white text-lg font-bold">{currentStats.fairDays}</div>
            <div className="text-gray-400 text-xs">Fair Days</div>
          </div>
          <div className="bg-[#2A2B5E] rounded-lg p-3 text-center">
            <div className="text-white text-lg font-bold">{currentStats.averageQuality}%</div>
            <div className="text-gray-400 text-xs">Quality</div>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-[#2A2B5E] border border-gray-700 rounded-lg mt-4 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-medium">Filters</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Month</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="w-full bg-[#1A1B3E] border border-gray-600 rounded-lg p-2 text-white text-sm"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i} value={i}>
                      {new Date(0, i).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="w-full bg-[#1A1B3E] border border-gray-600 rounded-lg p-2 text-white text-sm"
                >
                  <option value={2025}>2025</option>
                  <option value={2024}>2024</option>
                  <option value={2023}>2023</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-scroll mobile-admin-content-scroll">
        <div className="p-4 space-y-4">
          {/* Calendar */}
          <div className="bg-[#2A2B5E] rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium">
                {new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
              </h3>
              <Calendar className="w-4 h-4 text-blue-400" />
            </div>
            
            {/* Days of week header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-xs text-gray-400 p-1">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {generateCalendar().map((item, index) => (
                <div
                  key={index}
                  className={`aspect-square p-1 text-center text-xs rounded cursor-pointer transition-all ${
                    item === null ? '' : 
                    item.data ? 
                      `${getTierColor(item.data.tier)} hover:opacity-80` : 
                      'bg-gray-700 hover:bg-gray-600'
                  }`}
                  onClick={() => item && setSelectedDate(item.data ? item.data.date : `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(item.day).padStart(2, '0')}`)}
                >
                  {item && (
                    <div className="text-white font-medium">
                      {item.day}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Legend */}
            <div className="flex items-center justify-center space-x-4 mt-4 text-xs">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span className="text-gray-400">Good (80%+)</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                <span className="text-gray-400">Fair (60-79%)</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span className="text-gray-400">Poor (&lt;60%)</span>
              </div>
            </div>
          </div>

          {/* Quality Trends */}
          <div className="bg-[#2A2B5E] rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-medium">Quality Trends</h3>
              <Activity className="w-4 h-4 text-blue-400" />
            </div>
            <div className="space-y-2">
              {/* Show only recent days with actual data, latest first */}
              {currentData
                .filter(day => 
                  day.recordCount > 0 && 
                  new Date(day.date) <= new Date() // Only past/present dates, includes today (July 26th)
                )
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) // Sort by date descending (latest first)
                .slice(0, 7) // Take first 7 (latest)
                .map((day, index, arr) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="text-gray-400 text-sm">
                      {new Date(day.date).toLocaleDateString()}
                    </div>
                    {index > 0 && getQualityTrend(day.qualityScore, arr[index - 1].qualityScore)}
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-white text-sm">{day.recordCount} records</div>
                    <div className={`text-sm ${getTierTextColor(day.tier)}`}>
                      {day.qualityScore}%
                    </div>
                  </div>
                </div>
              ))}
              {/* Show message if no recent data available */}
              {currentData.filter(day => 
                day.recordCount > 0 && 
                new Date(day.date) <= new Date()
              ).length === 0 && (
                <div className="text-center text-gray-400 text-sm py-4">
                  No recent data trends available
                </div>
              )}
            </div>
          </div>

          {/* Data Issues */}
          <div className="bg-[#2A2B5E] rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-medium">Data Issues</h3>
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
            </div>
            <div className="space-y-3">
              {/* Only show real data issues from days with actual records */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-gray-300 text-sm">Data Gaps</span>
                </div>
                <span className="text-red-400 text-sm">
                  {currentData.filter(day => day.recordCount > 0).reduce((sum, day) => sum + day.gaps, 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span className="text-gray-300 text-sm">Duplicates</span>
                </div>
                <span className="text-yellow-400 text-sm">
                  {currentData.filter(day => day.recordCount > 0).reduce((sum, day) => sum + day.duplicates, 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-300 text-sm">Poor Quality Days</span>
                </div>
                <span className="text-blue-400 text-sm">{currentStats.poorDays}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-[#2A2B5E] rounded-lg p-4 border border-gray-700">
            <h3 className="text-white font-medium mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <button className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors">
                <Download className="w-4 h-4" />
                <span className="text-sm">Export Report</span>
              </button>
              <button className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors">
                <RefreshCw className="w-4 h-4" />
                <span className="text-sm">Refresh Data</span>
              </button>
              <button className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition-colors">
                <Activity className="w-4 h-4" />
                <span className="text-sm">Run Analysis</span>
              </button>
              <button className="flex items-center space-x-2 bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-lg transition-colors">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">Validate Data</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Date Details Modal */}
      {selectedDate && selectedDayData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1A1B3E] rounded-3xl w-full max-w-md max-h-[85vh] overflow-hidden animate-slide-up">
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold text-lg">
                  {(() => {
                    // Use Pakistan timezone (UTC+5) for consistent date display
                    const [year, month, day] = selectedDate.split('-').map(Number);
                    const pktDate = new Date(year, month - 1, day, 12, 0, 0); // Use noon PKT to avoid timezone shifts
                    const dayOfWeek = getPakistanDayOfWeek(selectedDate);
                    const monthName = pktDate.toLocaleDateString('default', { month: 'long' });
                    
                    return `${dayOfWeek}, ${monthName} ${day}, ${year}`;
                  })()}
                </h3>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Quality Score</p>
                  <p className={`text-lg font-bold ${getTierTextColor(selectedDayData.tier)}`}>
                    {selectedDayData.qualityScore}%
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Records</p>
                  <p className="text-white text-lg font-bold">{selectedDayData.recordCount}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Gaps</p>
                  <p className="text-red-400 text-lg font-bold">{selectedDayData.gaps}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Duplicates</p>
                  <p className="text-yellow-400 text-lg font-bold">{selectedDayData.duplicates}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Admin Navigation */}
      <MobileAdminDualNavigation currentPage="data-continuity" />
    </div>
  );
}