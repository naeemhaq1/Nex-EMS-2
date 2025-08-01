import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';

interface HorizontalSpinnerProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  suffix?: string;
  className?: string;
  disabled?: boolean;
}

export function HorizontalSpinner({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  suffix = '',
  className = '',
  disabled = false,
}: HorizontalSpinnerProps) {
  const [isPressed, setIsPressed] = useState<'left' | 'right' | null>(null);

  const handleDecrease = () => {
    if (value > min) {
      onChange(Math.max(min, value - step));
    }
  };

  const handleIncrease = () => {
    if (value < max) {
      onChange(Math.min(max, value + step));
    }
  };

  const handleTouchStart = (direction: 'left' | 'right') => {
    setIsPressed(direction);
  };

  const handleTouchEnd = () => {
    setIsPressed(null);
  };

  return (
    <div className={`flex items-center justify-between bg-[#2A2B5E] rounded-xl p-4 ${className}`}>
      {label && (
        <div className="text-sm font-medium text-white mb-1">{label}</div>
      )}

      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDecrease}
          onTouchStart={() => handleTouchStart('left')}
          onTouchEnd={handleTouchEnd}
          disabled={disabled || value <= min}
          className={`
            w-12 h-12 rounded-full bg-[#374151] hover:bg-[#4B5563] 
            disabled:opacity-50 disabled:cursor-not-allowed
            touch-manipulation select-none
            ${isPressed === 'left' ? 'scale-95 bg-[#4B5563]' : ''}
            transition-all duration-150
          `}
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </Button>

        <div className="flex-1 text-center">
          <div className="text-2xl font-bold text-white min-w-[80px]">
            {value}{suffix}
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleIncrease}
          onTouchStart={() => handleTouchStart('right')}
          onTouchEnd={handleTouchEnd}
          disabled={disabled || value >= max}
          className={`
            w-12 h-12 rounded-full bg-[#374151] hover:bg-[#4B5563] 
            disabled:opacity-50 disabled:cursor-not-allowed
            touch-manipulation select-none
            ${isPressed === 'right' ? 'scale-95 bg-[#4B5563]' : ''}
            transition-all duration-150
          `}
        >
          <ChevronRight className="w-5 h-5 text-white" />
        </Button>
      </div>
    </div>
  );
}

export default HorizontalSpinner;