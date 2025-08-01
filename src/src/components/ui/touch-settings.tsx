import React, { useState } from 'react';
import { Settings, ChevronRight, MoreVertical, Sun, Moon } from 'lucide-react';
import { Button } from './button';
import { Card, CardContent } from './card';
import { HorizontalSpinner } from './horizontal-spinner';

interface TouchSettingsProps {
  className?: string;
}

export function TouchSettings({ className = '' }: TouchSettingsProps) {
  const [brightness, setBrightness] = useState(80);
  const [volume, setVolume] = useState(60);
  const [refreshRate, setRefreshRate] = useState(5);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  const settingsItems = [
    {
      label: 'Brightness',
      value: brightness,
      onChange: setBrightness,
      min: 0,
      max: 100,
      step: 5,
      suffix: '%',
      icon: isDarkMode ? Moon : Sun,
    },
    {
      label: 'Auto Refresh',
      value: refreshRate,
      onChange: setRefreshRate,
      min: 1,
      max: 60,
      step: 1,
      suffix: 's',
      icon: Settings,
    },
    {
      label: 'Chart Updates',
      value: volume,
      onChange: setVolume,
      min: 0,
      max: 100,
      step: 10,
      suffix: '%',
      icon: MoreVertical,
    },
  ];

  return (
    <div className={`${className}`}>
      <Card className="bg-[#2A2B5E] border-[#374151]">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Quick Settings</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-white hover:bg-[#374151] touch-manipulation"
            >
              <ChevronRight className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            </Button>
          </div>

          {/* Quick Toggle */}
          <div className="flex items-center justify-between p-3 bg-[#374151] rounded-lg mb-3">
            <div className="flex items-center space-x-3">
              {isDarkMode ? <Moon className="w-5 h-5 text-white" /> : <Sun className="w-5 h-5 text-white" />}
              <span className="text-white font-medium">Dark Mode</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`
                w-12 h-6 rounded-full transition-all duration-200 touch-manipulation
                ${isDarkMode ? 'bg-purple-600' : 'bg-gray-400'}
              `}
            >
              <div className={`
                w-5 h-5 rounded-full bg-white transition-all duration-200
                ${isDarkMode ? 'translate-x-3' : '-translate-x-3'}
              `} />
            </Button>
          </div>

          {/* Expandable Settings */}
          {isExpanded && (
            <div className="space-y-3">
              {settingsItems.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <item.icon className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-300">{item.label}</span>
                  </div>
                  <HorizontalSpinner
                    value={item.value}
                    onChange={item.onChange}
                    min={item.min}
                    max={item.max}
                    step={item.step}
                    suffix={item.suffix}
                    className="bg-[#374151] rounded-lg"
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}