import React from 'react';
import { Loader2, Clock, Users, TrendingUp, Activity, Zap, Heart, Star } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'purple' | 'green' | 'orange' | 'pink';
  variant?: 'default' | 'pulse' | 'bounce' | 'fade' | 'scale' | 'float';
}

export function LoadingSpinner({ 
  size = 'md', 
  color = 'blue', 
  variant = 'default' 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  const colorClasses = {
    blue: 'text-blue-500',
    purple: 'text-purple-500',
    green: 'text-green-500',
    orange: 'text-orange-500',
    pink: 'text-pink-500'
  };

  const animationClasses = {
    default: 'animate-spin',
    pulse: 'animate-pulse',
    bounce: 'animate-bounce',
    fade: 'animate-pulse',
    scale: 'animate-ping',
    float: 'animate-bounce'
  };

  return (
    <Loader2 
      className={`${sizeClasses[size]} ${colorClasses[color]} ${animationClasses[variant]}`} 
    />
  );
}

interface PlayfulLoaderProps {
  type?: 'dots' | 'bars' | 'circles' | 'squares' | 'hearts' | 'stars';
  color?: 'blue' | 'purple' | 'green' | 'orange' | 'pink';
  size?: 'sm' | 'md' | 'lg';
}

export function PlayfulLoader({ 
  type = 'dots', 
  color = 'blue', 
  size = 'md' 
}: PlayfulLoaderProps) {
  const colorClasses = {
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    green: 'bg-green-500',
    orange: 'bg-orange-500',
    pink: 'bg-pink-500'
  };

  const sizeClasses = {
    sm: { dot: 'w-2 h-2', bar: 'w-1 h-4', container: 'space-x-1' },
    md: { dot: 'w-3 h-3', bar: 'w-1.5 h-6', container: 'space-x-1.5' },
    lg: { dot: 'w-4 h-4', bar: 'w-2 h-8', container: 'space-x-2' }
  };

  if (type === 'dots') {
    return (
      <div className={`flex items-center ${sizeClasses[size].container}`}>
        <div 
          className={`${sizeClasses[size].dot} ${colorClasses[color]} rounded-full animate-bounce`}
          style={{ animationDelay: '0ms' }}
        ></div>
        <div 
          className={`${sizeClasses[size].dot} ${colorClasses[color]} rounded-full animate-bounce`}
          style={{ animationDelay: '150ms' }}
        ></div>
        <div 
          className={`${sizeClasses[size].dot} ${colorClasses[color]} rounded-full animate-bounce`}
          style={{ animationDelay: '300ms' }}
        ></div>
      </div>
    );
  }

  if (type === 'bars') {
    return (
      <div className={`flex items-end ${sizeClasses[size].container}`}>
        <div 
          className={`${sizeClasses[size].bar} ${colorClasses[color]} rounded-t animate-pulse`}
          style={{ animationDelay: '0ms' }}
        ></div>
        <div 
          className={`${sizeClasses[size].bar} ${colorClasses[color]} rounded-t animate-pulse`}
          style={{ animationDelay: '200ms' }}
        ></div>
        <div 
          className={`${sizeClasses[size].bar} ${colorClasses[color]} rounded-t animate-pulse`}
          style={{ animationDelay: '400ms' }}
        ></div>
        <div 
          className={`${sizeClasses[size].bar} ${colorClasses[color]} rounded-t animate-pulse`}
          style={{ animationDelay: '600ms' }}
        ></div>
      </div>
    );
  }

  if (type === 'circles') {
    return (
      <div className="relative w-10 h-10">
        <div className={`absolute inset-0 rounded-full border-2 border-t-${color}-500 border-r-transparent border-b-transparent border-l-transparent animate-spin`}></div>
        <div className={`absolute inset-1 rounded-full border-2 border-t-transparent border-r-${color}-400 border-b-transparent border-l-transparent animate-spin`} style={{ animationDirection: 'reverse', animationDelay: '150ms' }}></div>
        <div className={`absolute inset-2 rounded-full border-2 border-t-transparent border-r-transparent border-b-${color}-300 border-l-transparent animate-spin`} style={{ animationDelay: '300ms' }}></div>
      </div>
    );
  }

  if (type === 'hearts') {
    return (
      <div className={`flex items-center ${sizeClasses[size].container}`}>
        <Heart 
          className={`${sizeClasses[size].dot} text-pink-500 fill-pink-500 animate-pulse`}
          style={{ animationDelay: '0ms' }}
        />
        <Heart 
          className={`${sizeClasses[size].dot} text-pink-400 fill-pink-400 animate-pulse`}
          style={{ animationDelay: '200ms' }}
        />
        <Heart 
          className={`${sizeClasses[size].dot} text-pink-300 fill-pink-300 animate-pulse`}
          style={{ animationDelay: '400ms' }}
        />
      </div>
    );
  }

  if (type === 'stars') {
    return (
      <div className={`flex items-center ${sizeClasses[size].container}`}>
        <Star 
          className={`${sizeClasses[size].dot} text-yellow-500 fill-yellow-500 animate-bounce`}
          style={{ animationDelay: '0ms' }}
        />
        <Star 
          className={`${sizeClasses[size].dot} text-yellow-400 fill-yellow-400 animate-bounce`}
          style={{ animationDelay: '150ms' }}
        />
        <Star 
          className={`${sizeClasses[size].dot} text-yellow-300 fill-yellow-300 animate-bounce`}
          style={{ animationDelay: '300ms' }}
        />
      </div>
    );
  }

  // Default squares
  return (
    <div className={`flex items-center ${sizeClasses[size].container}`}>
      <div 
        className={`${sizeClasses[size].dot} ${colorClasses[color]} rounded animate-ping`}
        style={{ animationDelay: '0ms' }}
      ></div>
      <div 
        className={`${sizeClasses[size].dot} ${colorClasses[color]} rounded animate-ping`}
        style={{ animationDelay: '200ms' }}
      ></div>
      <div 
        className={`${sizeClasses[size].dot} ${colorClasses[color]} rounded animate-ping`}
        style={{ animationDelay: '400ms' }}
      ></div>
    </div>
  );
}

interface FullScreenLoaderProps {
  message?: string;
  type?: 'default' | 'dashboard' | 'analytics' | 'attendance' | 'data';
  showProgress?: boolean;
  progress?: number;
}

export function FullScreenLoader({ 
  message = 'Loading...', 
  type = 'default',
  showProgress = false,
  progress = 0
}: FullScreenLoaderProps) {
  const getThemeConfig = (type: string) => {
    switch (type) {
      case 'dashboard':
        return {
          icon: <Activity className="w-8 h-8" />,
          gradient: 'from-blue-600 to-purple-600',
          color: 'blue',
          title: 'Loading Dashboard'
        };
      case 'analytics':
        return {
          icon: <TrendingUp className="w-8 h-8" />,
          gradient: 'from-purple-600 to-pink-600',
          color: 'purple',
          title: 'Analyzing Data'
        };
      case 'attendance':
        return {
          icon: <Clock className="w-8 h-8" />,
          gradient: 'from-green-600 to-blue-600',
          color: 'green',
          title: 'Loading Attendance'
        };
      case 'data':
        return {
          icon: <Users className="w-8 h-8" />,
          gradient: 'from-orange-600 to-red-600',
          color: 'orange',
          title: 'Processing Data'
        };
      default:
        return {
          icon: <Zap className="w-8 h-8" />,
          gradient: 'from-indigo-600 to-purple-600',
          color: 'blue',
          title: 'Loading'
        };
    }
  };

  const config = getThemeConfig(type);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#1A1B3E] to-[#2A2B5E] flex items-center justify-center z-50">
      <div className="text-center">
        {/* Animated Logo/Icon */}
        <div className="mb-8">
          <div className={`w-20 h-20 mx-auto rounded-full bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-2xl animate-pulse`}>
            <div className="text-white animate-bounce">
              {config.icon}
            </div>
          </div>
        </div>

        {/* Main Loading Animation */}
        <div className="mb-6">
          <PlayfulLoader type="circles" color={config.color as any} size="lg" />
        </div>

        {/* Title and Message */}
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-white mb-2 animate-fade-in">
            {config.title}
          </h2>
          <p className="text-gray-300 text-sm animate-fade-in" style={{ animationDelay: '200ms' }}>
            {message}
          </p>
        </div>

        {/* Progress Bar */}
        {showProgress && (
          <div className="w-64 mx-auto mb-4">
            <div className="bg-gray-700 rounded-full h-2 overflow-hidden">
              <div 
                className={`h-full bg-gradient-to-r ${config.gradient} transition-all duration-500 ease-out`}
                style={{ width: `${Math.min(progress, 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-400 mt-2">{Math.round(progress)}% complete</p>
          </div>
        )}

        {/* Secondary Animation */}
        <div className="flex justify-center">
          <PlayfulLoader type="dots" color={config.color as any} size="sm" />
        </div>
      </div>
    </div>
  );
}

interface InlineLoaderProps {
  message?: string;
  type?: 'dots' | 'bars' | 'spinner';
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'purple' | 'green' | 'orange' | 'pink';
  className?: string;
}

export function InlineLoader({ 
  message = 'Loading...', 
  type = 'dots',
  size = 'md',
  color = 'blue',
  className = ''
}: InlineLoaderProps) {
  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {type === 'spinner' ? (
        <LoadingSpinner size={size} color={color} variant="default" />
      ) : (
        <PlayfulLoader type={type} size={size} color={color} />
      )}
      <span className="text-gray-300 text-sm">{message}</span>
    </div>
  );
}

// Card Loading Skeleton
export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-[#2A2B5E] rounded-lg p-4 animate-pulse ${className}`}>
      <div className="flex items-center space-x-3 mb-3">
        <div className="w-8 h-8 bg-gray-600 rounded-full"></div>
        <div className="flex-1">
          <div className="h-4 bg-gray-600 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-700 rounded"></div>
        <div className="h-3 bg-gray-700 rounded w-5/6"></div>
        <div className="h-3 bg-gray-700 rounded w-4/6"></div>
      </div>
    </div>
  );
}

// Chart Loading Skeleton
export function ChartSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-[#2A2B5E] rounded-lg p-4 animate-pulse ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="h-5 bg-gray-600 rounded w-1/3"></div>
        <div className="h-4 bg-gray-700 rounded w-16"></div>
      </div>
      <div className="flex items-end space-x-2 h-32">
        {[...Array(7)].map((_, i) => (
          <div 
            key={i}
            className="bg-gray-600 rounded-t flex-1 animate-pulse"
            style={{ 
              height: `${Math.random() * 80 + 20}%`,
              animationDelay: `${i * 100}ms`
            }}
          ></div>
        ))}
      </div>
    </div>
  );
}