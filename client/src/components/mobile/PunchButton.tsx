import React, { useState } from 'react';
import { LogIn, LogOut, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { PlayfulLoader } from '@/components/ui/LoadingAnimations';

interface PunchButtonProps {
  type: 'in' | 'out';
  onPunch: () => Promise<void>;
  disabled?: boolean;
  isLoading?: boolean;
  lastPunchTime?: string;
  className?: string;
}

export default function PunchButton({ 
  type, 
  onPunch, 
  disabled = false, 
  isLoading = false,
  lastPunchTime,
  className = '' 
}: PunchButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handlePunch = async () => {
    if (disabled || isLoading || isProcessing) return;

    setIsProcessing(true);
    try {
      await onPunch();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error('Punch failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const isInButton = type === 'in';
  const Icon = isInButton ? LogIn : LogOut;
  
  const baseClasses = `
    flex flex-col items-center justify-center space-y-1 px-4 py-3 rounded-xl 
    transition-all duration-300 transform active:scale-95 mobile-scale-tap
    ${className}
  `;

  const colorClasses = isInButton
    ? 'bg-gradient-to-br from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 shadow-lg shadow-green-500/25'
    : 'bg-gradient-to-br from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 shadow-lg shadow-red-500/25';

  const disabledClasses = 'bg-gray-600 opacity-50 cursor-not-allowed';

  if (showSuccess) {
    return (
      <button className={`${baseClasses} bg-gradient-to-br from-blue-500 to-blue-600 animate-bounce`}>
        <CheckCircle className="w-6 h-6 text-white animate-pulse" />
        <span className="text-white font-medium text-sm">Success!</span>
        {lastPunchTime && (
          <span className="text-blue-100 text-xs animate-fade-in">
            {lastPunchTime}
          </span>
        )}
      </button>
    );
  }

  if (isProcessing || isLoading) {
    return (
      <button className={`${baseClasses} bg-gradient-to-br from-purple-500 to-purple-600 loading-btn`}>
        <div className="flex items-center space-x-2">
          <PlayfulLoader type="dots" color="purple" size="sm" />
        </div>
        <span className="text-white font-medium text-sm animate-pulse">
          {isInButton ? 'Punching In...' : 'Punching Out...'}
        </span>
        {lastPunchTime && (
          <span className="text-purple-100 text-xs">
            {lastPunchTime}
          </span>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handlePunch}
      disabled={disabled}
      className={`${baseClasses} ${disabled ? disabledClasses : colorClasses} hover:shadow-xl hover:scale-105`}
    >
      <Icon className={`w-6 h-6 text-white ${disabled ? '' : 'animate-float'}`} />
      <span className="text-white font-medium text-sm">
        Punch {isInButton ? 'In' : 'Out'}
      </span>
      {lastPunchTime && (
        <span className={`text-xs ${isInButton ? 'text-green-100' : 'text-red-100'} animate-fade-in`}>
          {lastPunchTime}
        </span>
      )}
    </button>
  );
}