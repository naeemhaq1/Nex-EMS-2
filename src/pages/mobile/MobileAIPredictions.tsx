import React, { useState, useEffect } from 'react';
import { ArrowLeft, Brain, Calendar, Clock, TrendingUp, AlertTriangle, CheckCircle, Target, Lightbulb, Star } from 'lucide-react';
import { useNavigate } from 'wouter';
import { useQuery } from '@tanstack/react-query';

interface PredictionResult {
  employeeCode: string;
  predictionDate: string;
  attendanceLikelihood: number;
  arrivalTimePrediction: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  confidenceScore: number;
  suggestions: string[];
  patterns: {
    averageArrivalTime: string;
    attendanceRate: number;
    lateFrequency: number;
    consistencyScore: number;
    weeklyPatterns: { [key: string]: number };
    monthlyTrends: { [key: string]: number };
  };
  factors: string[];
}

interface AIInsight {
  type: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  suggestions: string[];
}

export default function MobileAIPredictions() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'prediction' | 'insights' | 'patterns'>('prediction');

  // Get AI dashboard data
  const { data: aiDashboard, isLoading, error } = useQuery({
    queryKey: ['/api/ai/my-dashboard'],
    refetchInterval: 60000, // Refresh every minute
  });

  // Get AI service status
  const { data: aiStatus } = useQuery({
    queryKey: ['/api/ai/status'],
    refetchInterval: 30000,
  });

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'text-green-400 bg-green-500/10';
      case 'medium': return 'text-yellow-400 bg-yellow-500/10';
      case 'high': return 'text-orange-400 bg-orange-500/10';
      case 'critical': return 'text-red-400 bg-red-500/10';
      default: return 'text-blue-400 bg-blue-500/10';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'info': return 'text-blue-400 bg-blue-500/10';
      case 'warning': return 'text-yellow-400 bg-yellow-500/10';
      case 'critical': return 'text-red-400 bg-red-500/10';
      default: return 'text-blue-400 bg-blue-500/10';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1A1B3E] text-white">
        <div className="sticky top-0 z-10 bg-[#1A1B3E] border-b border-purple-500/20 p-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/mobile')} className="p-2 hover:bg-[#2A2B5E] rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Brain className="w-6 h-6 text-purple-400" />
            <h1 className="text-xl font-semibold">AI Predictions</h1>
          </div>
        </div>
        
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  if (error || !aiDashboard) {
    return (
      <div className="min-h-screen bg-[#1A1B3E] text-white">
        <div className="sticky top-0 z-10 bg-[#1A1B3E] border-b border-purple-500/20 p-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/mobile')} className="p-2 hover:bg-[#2A2B5E] rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Brain className="w-6 h-6 text-purple-400" />
            <h1 className="text-xl font-semibold">AI Predictions</h1>
          </div>
        </div>
        
        <div className="p-4">
          <div className="bg-[#2A2B5E] rounded-xl p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-orange-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">AI Service Unavailable</h3>
            <p className="text-gray-400 mb-4">
              {!aiStatus?.openaiConfigured 
                ? "OpenAI API key is not configured. Please contact your administrator." 
                : "Unable to load AI predictions. Please try again later."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const prediction = aiDashboard.prediction as PredictionResult;
  const patterns = aiDashboard.patterns;
  const insights = aiDashboard.insights as AIInsight[];

  return (
    <div className="min-h-screen bg-[#1A1B3E] text-white pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#1A1B3E] border-b border-purple-500/20 p-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/mobile')} className="p-2 hover:bg-[#2A2B5E] rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Brain className="w-6 h-6 text-purple-400" />
          <h1 className="text-xl font-semibold">AI Predictions</h1>
        </div>
      </div>

      {/* AI Service Status */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className={`w-3 h-3 rounded-full ${aiStatus?.aiServiceActive ? 'bg-green-400' : 'bg-orange-400'}`}></div>
          <span className="text-sm text-gray-400">
            AI Service {aiStatus?.aiServiceActive ? 'Active' : 'Limited'}
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="px-4">
        <div className="flex bg-[#2A2B5E] rounded-lg p-1">
          <button
            onClick={() => setActiveTab('prediction')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'prediction'
                ? 'bg-purple-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Target className="w-4 h-4 inline mr-1" />
            Prediction
          </button>
          <button
            onClick={() => setActiveTab('insights')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'insights'
                ? 'bg-purple-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Lightbulb className="w-4 h-4 inline mr-1" />
            Insights
          </button>
          <button
            onClick={() => setActiveTab('patterns')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'patterns'
                ? 'bg-purple-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-4 h-4 inline mr-1" />
            Patterns
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {activeTab === 'prediction' && prediction && (
          <>
            {/* Tomorrow's Prediction */}
            <div className="bg-[#2A2B5E] rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Calendar className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-medium">Tomorrow's Prediction</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Attendance Likelihood</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-gray-700 rounded-full">
                      <div 
                        className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full"
                        style={{ width: `${prediction.attendanceLikelihood}%` }}
                      ></div>
                    </div>
                    <span className="text-white font-medium">{prediction.attendanceLikelihood}%</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Expected Arrival</span>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-400" />
                    <span className="text-white">{prediction.arrivalTimePrediction}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Risk Level</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(prediction.riskLevel)}`}>
                    {prediction.riskLevel.toUpperCase()}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">AI Confidence</span>
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-400" />
                    <span className="text-white">{prediction.confidenceScore}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Suggestions */}
            {prediction.suggestions && prediction.suggestions.length > 0 && (
              <div className="bg-[#2A2B5E] rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Lightbulb className="w-5 h-5 text-yellow-400" />
                  <h3 className="text-lg font-medium">AI Suggestions</h3>
                </div>
                
                <div className="space-y-3">
                  {prediction.suggestions.map((suggestion, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300 text-sm">{suggestion}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'insights' && (
          <div className="space-y-4">
            {insights && insights.length > 0 ? (
              insights.map((insight, index) => (
                <div key={index} className="bg-[#2A2B5E] rounded-xl p-6">
                  <div className="flex items-start gap-3 mb-3">
                    <AlertTriangle className={`w-5 h-5 mt-0.5 ${getSeverityColor(insight.severity).split(' ')[0]}`} />
                    <div className="flex-1">
                      <h4 className="font-medium mb-1">{insight.title}</h4>
                      <p className="text-gray-400 text-sm mb-3">{insight.description}</p>
                      
                      {insight.suggestions && insight.suggestions.length > 0 && (
                        <div className="space-y-2">
                          <h5 className="text-sm font-medium text-purple-400">Recommendations:</h5>
                          {insight.suggestions.map((suggestion, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                              <CheckCircle className="w-3 h-3 text-green-400 mt-1 flex-shrink-0" />
                              <span className="text-gray-300 text-xs">{suggestion}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-[#2A2B5E] rounded-xl p-6 text-center">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Great Job!</h3>
                <p className="text-gray-400">No attendance issues detected. Keep up the excellent work!</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'patterns' && patterns && (
          <div className="space-y-4">
            {/* Overview Stats */}
            <div className="bg-[#2A2B5E] rounded-xl p-6">
              <h3 className="text-lg font-medium mb-4">30-Day Overview</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">{patterns.attendanceRate.toFixed(1)}%</div>
                  <div className="text-sm text-gray-400">Attendance Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">{patterns.averageArrivalTime}</div>
                  <div className="text-sm text-gray-400">Avg Arrival</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-400">{patterns.lateFrequency.toFixed(1)}%</div>
                  <div className="text-sm text-gray-400">Late Frequency</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">{patterns.consistencyScore.toFixed(0)}</div>
                  <div className="text-sm text-gray-400">Consistency</div>
                </div>
              </div>
            </div>

            {/* Weekly Patterns */}
            <div className="bg-[#2A2B5E] rounded-xl p-6">
              <h3 className="text-lg font-medium mb-4">Weekly Patterns</h3>
              
              <div className="space-y-3">
                {Object.entries(patterns.weeklyPatterns).map(([day, rate]) => (
                  <div key={day} className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">{day}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-gray-700 rounded-full">
                        <div 
                          className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full"
                          style={{ width: `${rate}%` }}
                        ></div>
                      </div>
                      <span className="text-white text-sm w-10 text-right">{rate.toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Monthly Trends */}
            <div className="bg-[#2A2B5E] rounded-xl p-6">
              <h3 className="text-lg font-medium mb-4">Monthly Trends</h3>
              
              <div className="space-y-3">
                {Object.entries(patterns.monthlyTrends).map(([week, rate]) => (
                  <div key={week} className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">{week}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-gray-700 rounded-full">
                        <div 
                          className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full"
                          style={{ width: `${rate}%` }}
                        ></div>
                      </div>
                      <span className="text-white text-sm w-10 text-right">{rate.toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}