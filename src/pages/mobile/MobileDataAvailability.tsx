import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, TrendingUp, TrendingDown, Minus, Database, Activity, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface HeatmapData {
  date: string;
  dayName: string;
  monthDay: string;
  count: number;
  fullDate: string;
  tier: 'high' | 'medium' | 'low';
}

interface HeatmapResponse {
  data: HeatmapData[];
  statistics: {
    totalRecords: number;
    averageRecords: number;
    maxRecords: number;
    minRecords: number;
    highTierThreshold: number;
    mediumTierThreshold: number;
  };
}

export default function MobileDataAvailability() {
  const { data: heatmapData, isLoading, error } = useQuery<HeatmapResponse>({
    queryKey: ['/api/analytics/data-availability-heatmap'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const getTierColor = (tier: 'high' | 'medium' | 'low') => {
    switch (tier) {
      case 'high': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getTierIcon = (tier: 'high' | 'medium' | 'low') => {
    switch (tier) {
      case 'high': return <TrendingUp className="h-4 w-4" />;
      case 'medium': return <Minus className="h-4 w-4" />;
      case 'low': return <TrendingDown className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1A1B3E] text-white">
        <div className="p-4">
          <div className="flex items-center gap-4 mb-6">
            <Link href="/mobile">
              <Button variant="ghost" size="sm" className="text-white hover:bg-[#2A2B5E]">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold">Data Availability</h1>
          </div>
          
          <div className="space-y-4">
            <div className="bg-[#2A2B5E] rounded-lg p-4 animate-pulse">
              <div className="h-6 bg-gray-600 rounded mb-2"></div>
              <div className="h-4 bg-gray-600 rounded w-3/4"></div>
            </div>
            <div className="bg-[#2A2B5E] rounded-lg p-4 animate-pulse">
              <div className="h-32 bg-gray-600 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#1A1B3E] text-white">
        <div className="p-4">
          <div className="flex items-center gap-4 mb-6">
            <Link href="/mobile">
              <Button variant="ghost" size="sm" className="text-white hover:bg-[#2A2B5E]">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold">Data Availability</h1>
          </div>
          
          <Card className="bg-red-900/20 border-red-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-400">
                <Database className="h-5 w-5" />
                <span className="font-medium">Error loading data</span>
              </div>
              <p className="text-sm text-red-400/80 mt-2">
                Failed to fetch attendance data. Please try again later.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1B3E] text-white">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/mobile">
            <Button variant="ghost" size="sm" className="text-white hover:bg-[#2A2B5E]">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Data Availability</h1>
            <p className="text-sm text-gray-400">Attendance data coverage heatmap</p>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Card className="bg-[#2A2B5E] border-slate-700">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Total Records</p>
                  <p className="text-lg font-bold text-white">
                    {heatmapData?.statistics.totalRecords.toLocaleString()}
                  </p>
                </div>
                <Database className="h-5 w-5 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#2A2B5E] border-slate-700">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Daily Average</p>
                  <p className="text-lg font-bold text-white">
                    {heatmapData?.statistics.averageRecords.toLocaleString()}
                  </p>
                </div>
                <TrendingUp className="h-5 w-5 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#2A2B5E] border-slate-700">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Peak Day</p>
                  <p className="text-lg font-bold text-white">
                    {heatmapData?.statistics.maxRecords.toLocaleString()}
                  </p>
                </div>
                <Activity className="h-5 w-5 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#2A2B5E] border-slate-700">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Minimum Day</p>
                  <p className="text-lg font-bold text-white">
                    {heatmapData?.statistics.minRecords.toLocaleString()}
                  </p>
                </div>
                <TrendingDown className="h-5 w-5 text-red-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Heatmap */}
        <Card className="bg-[#2A2B5E] border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Data Availability Heatmap
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {heatmapData?.data.map((day, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-[#1A1B3E] rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${getTierColor(day.tier)}`}></div>
                    <div>
                      <p className="text-sm font-medium text-white">{day.dayName}</p>
                      <p className="text-xs text-gray-400">{day.monthDay}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs border-gray-600 text-gray-300">
                      {day.count.toLocaleString()}
                    </Badge>
                    <div className="text-gray-400">
                      {getTierIcon(day.tier)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="mt-6 p-3 bg-[#1A1B3E] rounded-lg">
              <p className="text-sm font-medium text-white mb-2">Legend</p>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-gray-400">High Activity (≥{heatmapData?.statistics.highTierThreshold.toLocaleString()})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-gray-400">Medium Activity (≥{heatmapData?.statistics.mediumTierThreshold.toLocaleString()})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-gray-400">Low Activity (&lt;{heatmapData?.statistics.mediumTierThreshold.toLocaleString()})</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}