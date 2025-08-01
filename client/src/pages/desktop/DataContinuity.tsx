import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';

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
import { formatPKTDateTime, getPakistanDayOfWeek } from '@/utils/timezone';

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

export default function DataContinuity() {
  const [, navigate] = useLocation();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // Current month
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
    if (currentScore > previousScore) return <TrendingUp className="w-4 h-4 text-green-400" />;
    if (currentScore < previousScore) return <TrendingDown className="w-4 h-4 text-red-400" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
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
      <div className="min-h-screen bg-[#1A1B3E] text-white flex items-center justify-center">
        <div className="text-center">
          <Database className="w-12 h-12 text-blue-500 animate-pulse mx-auto mb-6" />
          <p className="text-gray-400 text-lg">Loading data continuity...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1B3E] text-white">
      <div className="flex-1 overflow-hidden">
        {/* Header */}
        <div className="bg-[#1A1B3E] p-6 border-b border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="bg-[#2A2B5E] p-3 rounded-lg">
                <Database className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-white text-2xl font-semibold">Data Continuity</h1>
                <p className="text-gray-400 text-lg">System data quality heatmap and analytics</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleRefresh}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                title="Refresh data"
              >
                <RefreshCw className="w-5 h-5 text-white" />
                <span className="text-white">Refresh</span>
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="bg-[#2A2B5E] hover:bg-[#3A3B6E] px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
              >
                <Filter className="w-5 h-5 text-white" />
                <span className="text-white">Filters</span>
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-6">
            <div className="bg-[#2A2B5E] rounded-lg p-6 text-center border border-gray-700">
              <div className="text-white text-3xl font-bold mb-2">{currentStats.totalRecords.toLocaleString()}</div>
              <div className="text-gray-400 text-sm">Total Records</div>
            </div>
            <div className="bg-[#2A2B5E] rounded-lg p-6 text-center border border-gray-700">
              <div className="text-white text-3xl font-bold mb-2">{currentStats.goodDays}</div>
              <div className="text-gray-400 text-sm">Good Days</div>
            </div>
            <div className="bg-[#2A2B5E] rounded-lg p-6 text-center border border-gray-700">
              <div className="text-white text-3xl font-bold mb-2">{currentStats.fairDays}</div>
              <div className="text-gray-400 text-sm">Fair Days</div>
            </div>
            <div className="bg-[#2A2B5E] rounded-lg p-6 text-center border border-gray-700">
              <div className="text-white text-3xl font-bold mb-2">{currentStats.averageQuality}%</div>
              <div className="text-gray-400 text-sm">Average Quality</div>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="bg-[#2A2B5E] border border-gray-700 rounded-lg mt-6 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-lg">Time Period Filters</h3>
                <button
                  onClick={() => setShowFilters(false)}
                  className="text-gray-400 hover:text-white p-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-gray-300 text-base mb-2 block font-medium">Month</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="w-full bg-[#1A1B3E] border border-gray-600 rounded-lg p-3 text-white text-base"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i} value={i}>
                        {new Date(0, i).toLocaleString('default', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="text-gray-300 text-base mb-2 block font-medium">Year</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="w-full bg-[#1A1B3E] border border-gray-600 rounded-lg p-3 text-white text-base"
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

        {/* Main Content */}
        <div className="p-6 overflow-y-auto" style={{ height: 'calc(100vh - 280px)' }}>
          <div className="grid grid-cols-12 gap-6 h-full">
            
            {/* Left Column - Calendar */}
            <div className="col-span-8 space-y-6">
              <div className="bg-[#2A2B5E] rounded-lg p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-white font-semibold text-xl">
                    {new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </h3>
                  <Calendar className="w-6 h-6 text-blue-400" />
                </div>
                
                {/* Days of week header */}
                <div className="grid grid-cols-7 gap-2 mb-4">
                  {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                    <div key={day} className="text-center text-base text-gray-400 p-3 font-medium">
                      {day}
                    </div>
                  ))}
                </div>
                
                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-2">
                  {generateCalendar().map((item, index) => (
                    <div
                      key={index}
                      className={`aspect-square p-2 text-center text-base rounded-lg cursor-pointer transition-all ${
                        item === null ? '' : 
                        item.data ? 
                          `${getTierColor(item.data.tier)} hover:opacity-80 border-2 border-transparent hover:border-white` : 
                          'bg-gray-700 hover:bg-gray-600 border-2 border-transparent hover:border-gray-400'
                      }`}
                      onClick={() => item && setSelectedDate(item.data ? item.data.date : `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(item.day).padStart(2, '0')}`)}
                    >
                      {item && (
                        <div className="text-white font-semibold text-lg">
                          {item.day}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Legend */}
                <div className="flex items-center justify-center space-x-8 mt-6 text-base">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                    <span className="text-gray-300">Good (80%+)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                    <span className="text-gray-300">Fair (60-79%)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-red-500 rounded"></div>
                    <span className="text-gray-300">Poor (&lt;60%)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-gray-700 rounded"></div>
                    <span className="text-gray-300">No Data</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Analytics */}
            <div className="col-span-4 space-y-6">
              
              {/* Quality Trends */}
              <div className="bg-[#2A2B5E] rounded-lg p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold text-lg">Quality Trends</h3>
                  <Activity className="w-5 h-5 text-blue-400" />
                </div>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {/* Show only recent days with actual data, not future dates or empty days */}
                  {currentData.filter(day => {
                    if (day.recordCount <= 0) return false;
                    // Use Pakistan timezone for date comparison
                    const dayDate = new Date(day.date + 'T12:00:00+05:00'); // Noon PKT
                    const todayPKT = new Date(new Date().getTime() + (5 * 60 * 60 * 1000)); // Current time in PKT
                    return dayDate <= todayPKT; // Only past/present dates in PKT
                  }).slice(-7).map((day, index, arr) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-[#1A1B3E] rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="text-gray-300 text-sm">
                          {(() => {
                            // Format date using Pakistan timezone
                            const [year, month, dayNum] = day.date.split('-').map(Number);
                            const pktDate = new Date(year, month - 1, dayNum);
                            return pktDate.toLocaleDateString();
                          })()}
                        </div>
                        {index > 0 && getQualityTrend(day.qualityScore, arr[index - 1].qualityScore)}
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-white text-sm font-medium">{day.recordCount} records</div>
                        <div className={`text-base font-semibold ${getTierTextColor(day.tier)}`}>
                          {day.qualityScore}%
                        </div>
                      </div>
                    </div>
                  ))}
                  {/* Show message if no recent data available */}
                  {currentData.filter(day => {
                    if (day.recordCount <= 0) return false;
                    // Use Pakistan timezone for date comparison
                    const dayDate = new Date(day.date + 'T12:00:00+05:00'); // Noon PKT
                    const todayPKT = new Date(new Date().getTime() + (5 * 60 * 60 * 1000)); // Current time in PKT
                    return dayDate <= todayPKT; // Only past/present dates in PKT
                  }).length === 0 && (
                    <div className="text-center text-gray-400 py-8">
                      No recent data trends available
                    </div>
                  )}
                </div>
              </div>

              {/* Data Issues */}
              <div className="bg-[#2A2B5E] rounded-lg p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold text-lg">Data Issues</h3>
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                </div>
                <div className="space-y-4">
                  {/* Only show real data issues from days with actual records */}
                  <div className="flex items-center justify-between p-3 bg-[#1A1B3E] rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-gray-300">Data Gaps</span>
                    </div>
                    <span className="text-red-400 font-semibold">
                      {currentData.filter(day => day.recordCount > 0).reduce((sum, day) => sum + day.gaps, 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#1A1B3E] rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="text-gray-300">Duplicates</span>
                    </div>
                    <span className="text-yellow-400 font-semibold">
                      {currentData.filter(day => day.recordCount > 0).reduce((sum, day) => sum + day.duplicates, 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#1A1B3E] rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-gray-300">Poor Quality Days</span>
                    </div>
                    <span className="text-blue-400 font-semibold">{currentStats.poorDays}</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-[#2A2B5E] rounded-lg p-6 border border-gray-700">
                <h3 className="text-white font-semibold text-lg mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 gap-3">
                  <button className="flex items-center justify-center space-x-3 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition-colors">
                    <Download className="w-5 h-5" />
                    <span>Export Report</span>
                  </button>
                  <button className="flex items-center justify-center space-x-3 bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg transition-colors">
                    <RefreshCw className="w-5 h-5" />
                    <span>Refresh Data</span>
                  </button>
                  <button className="flex items-center justify-center space-x-3 bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg transition-colors">
                    <Activity className="w-5 h-5" />
                    <span>Run Analysis</span>
                  </button>
                  <button className="flex items-center justify-center space-x-3 bg-orange-600 hover:bg-orange-700 text-white py-3 px-4 rounded-lg transition-colors">
                    <CheckCircle className="w-5 h-5" />
                    <span>Validate Data</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Date Details Modal */}
      {selectedDate && selectedDayData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1A1B3E] rounded-2xl max-w-lg w-full mx-4 border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold text-xl">
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
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center p-4 bg-[#2A2B5E] rounded-lg">
                  <p className="text-gray-400 text-sm mb-2">Quality Score</p>
                  <p className={`text-2xl font-bold ${getTierTextColor(selectedDayData.tier)}`}>
                    {selectedDayData.qualityScore}%
                  </p>
                </div>
                <div className="text-center p-4 bg-[#2A2B5E] rounded-lg">
                  <p className="text-gray-400 text-sm mb-2">Records</p>
                  <p className="text-white text-2xl font-bold">{selectedDayData.recordCount}</p>
                </div>
                <div className="text-center p-4 bg-[#2A2B5E] rounded-lg">
                  <p className="text-gray-400 text-sm mb-2">Gaps</p>
                  <p className="text-red-400 text-2xl font-bold">{selectedDayData.gaps}</p>
                </div>
                <div className="text-center p-4 bg-[#2A2B5E] rounded-lg">
                  <p className="text-gray-400 text-sm mb-2">Duplicates</p>
                  <p className="text-yellow-400 text-2xl font-bold">{selectedDayData.duplicates}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}