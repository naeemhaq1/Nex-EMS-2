import React, { useState, useEffect } from 'react';
import { MapPin, Settings, Save, RotateCcw } from 'lucide-react';

interface LocationSettingsProps {
  onIntervalChange?: (interval: number) => void;
  currentInterval?: number;
}

export default function LocationSettings({ onIntervalChange, currentInterval = 60 }: LocationSettingsProps) {
  const [refreshInterval, setRefreshInterval] = useState<number>(currentInterval);
  const [dataUsageMode, setDataUsageMode] = useState<'low' | 'normal' | 'high'>('normal');
  const [isOpen, setIsOpen] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedInterval = localStorage.getItem('locationRefreshInterval');
    const savedDataMode = localStorage.getItem('locationDataUsageMode');
    
    if (savedInterval) {
      setRefreshInterval(parseInt(savedInterval));
    }
    if (savedDataMode) {
      setDataUsageMode(savedDataMode as 'low' | 'normal' | 'high');
    }
  }, []);

  const handleSave = () => {
    // Save to localStorage
    localStorage.setItem('locationRefreshInterval', refreshInterval.toString());
    localStorage.setItem('locationDataUsageMode', dataUsageMode);
    
    // Notify parent component
    if (onIntervalChange) {
      onIntervalChange(refreshInterval);
    }
    
    setIsOpen(false);
    
    // Show confirmation
    console.log(`Location settings saved: ${refreshInterval}s interval, ${dataUsageMode} data usage`);
  };

  const handleReset = () => {
    setRefreshInterval(60); // Default 1 minute
    setDataUsageMode('normal');
  };

  const getDataUsageDescription = () => {
    switch (dataUsageMode) {
      case 'low':
        return 'Minimal location checks (5min), low accuracy';
      case 'normal':
        return 'Balanced location checks (1min), standard accuracy';
      case 'high':
        return 'Frequent location checks (30s), high accuracy';
      default:
        return 'Standard location tracking';
    }
  };

  const getRecommendedInterval = () => {
    switch (dataUsageMode) {
      case 'low':
        return 300; // 5 minutes
      case 'normal':
        return 60; // 1 minute
      case 'high':
        return 30; // 30 seconds
      default:
        return 60;
    }
  };

  const handleDataModeChange = (mode: 'low' | 'normal' | 'high') => {
    setDataUsageMode(mode);
    setRefreshInterval(getRecommendedInterval());
  };

  return (
    <div>
        <div className="flex items-center gap-3 mb-6">
          <MapPin className="w-6 h-6 text-blue-400" />
          <h2 className="text-xl font-semibold text-white">Location Settings</h2>
        </div>

        {/* Data Usage Mode */}
        <div className="mb-6">
          <h3 className="text-white font-medium mb-3">Data Usage Mode</h3>
          <div className="space-y-2">
            {['low', 'normal', 'high'].map((mode) => (
              <label key={mode} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="dataMode"
                  value={mode}
                  checked={dataUsageMode === mode}
                  onChange={() => handleDataModeChange(mode as 'low' | 'normal' | 'high')}
                  className="w-4 h-4"
                />
                <div>
                  <div className="text-white capitalize">{mode} Data Usage</div>
                  <div className="text-xs text-gray-400">
                    {mode === 'low' && 'Checks every 5 minutes, saves mobile data'}
                    {mode === 'normal' && 'Checks every 1 minute, balanced usage'}
                    {mode === 'high' && 'Checks every 30 seconds, more accurate'}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Custom Interval */}
        <div className="mb-6">
          <h3 className="text-white font-medium mb-3">Custom Refresh Interval</h3>
          <div className="flex items-center gap-2 mb-2">
            <input
              type="range"
              min="15"
              max="600"
              step="15"
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
              className="flex-1"
            />
            <span className="text-white font-medium w-16">
              {refreshInterval < 60 ? `${refreshInterval}s` : `${Math.round(refreshInterval / 60)}m`}
            </span>
          </div>
          <div className="text-xs text-gray-400">
            {getDataUsageDescription()}
          </div>
        </div>

        {/* Current Settings Display */}
        <div className="bg-gray-800 rounded-lg p-3 mb-6">
          <div className="text-xs text-gray-400 mb-1">Current Settings:</div>
          <div className="text-white text-sm">
            Refresh: {refreshInterval < 60 ? `${refreshInterval} seconds` : `${Math.round(refreshInterval / 60)} minute(s)`}
          </div>
          <div className="text-white text-sm">
            Mode: {dataUsageMode.charAt(0).toUpperCase() + dataUsageMode.slice(1)} data usage
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-500"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <button
            onClick={() => {
              setIsOpen(false);
              // Notify parent to close if it's controlling the modal
              if (window.location.pathname.includes('/mobile')) {
                window.dispatchEvent(new CustomEvent('closeLocationSettings'));
              }
            }}
            className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg text-sm hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-500"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
        </div>
    </div>
  );
}