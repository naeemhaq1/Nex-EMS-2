import React from 'react';
import { PlayfulLoader } from '@/components/ui/LoadingAnimations';
import { LucideIcon } from 'lucide-react';

interface LoadingCardProps {
  title?: string;
  subtitle?: string;
  icon?: LucideIcon;
  type?: 'card' | 'metric' | 'chart';
  color?: 'blue' | 'purple' | 'green' | 'orange' | 'pink';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function LoadingCard({
  title = 'Loading...',
  subtitle,
  icon: Icon,
  type = 'card',
  color = 'blue',
  size = 'md',
  className = ''
}: LoadingCardProps) {
  const sizeClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  };

  const colorGradients = {
    blue: 'from-blue-500/10 to-blue-600/10 border-blue-500/20',
    purple: 'from-purple-500/10 to-purple-600/10 border-purple-500/20',
    green: 'from-green-500/10 to-green-600/10 border-green-500/20',
    orange: 'from-orange-500/10 to-orange-600/10 border-orange-500/20',
    pink: 'from-pink-500/10 to-pink-600/10 border-pink-500/20'
  };

  if (type === 'metric') {
    return (
      <div className={`bg-[#2A2B5E] rounded-lg ${sizeClasses[size]} animate-pulse ${className}`}>
        <div className="flex items-center justify-between mb-3">
          {Icon && (
            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${colorGradients[color]} flex items-center justify-center animate-float`}>
              <Icon className={`w-4 h-4 text-${color}-400`} />
            </div>
          )}
          <PlayfulLoader type="dots" color={color} size="sm" />
        </div>
        <div className="space-y-2">
          <div className={`h-8 bg-${color}-500/20 rounded animate-pulse`}></div>
          <div className="h-4 bg-gray-600 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (type === 'chart') {
    return (
      <div className={`bg-[#2A2B5E] rounded-lg ${sizeClasses[size]} animate-scale-in ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            {Icon && <Icon className={`w-5 h-5 text-${color}-400 animate-wiggle`} />}
            <div className="h-5 bg-gray-600 rounded w-24 animate-pulse"></div>
          </div>
          <PlayfulLoader type="bars" color={color} size="sm" />
        </div>
        <div className="flex items-end space-x-2 h-32">
          {[...Array(7)].map((_, i) => (
            <div 
              key={i}
              className={`bg-${color}-500/30 rounded-t flex-1 animate-pulse`}
              style={{ 
                height: `${Math.random() * 80 + 20}%`,
                animationDelay: `${i * 150}ms`
              }}
            ></div>
          ))}
        </div>
      </div>
    );
  }

  // Default card type
  return (
    <div className={`bg-gradient-to-br ${colorGradients[color]} border rounded-lg ${sizeClasses[size]} animate-slide-up ${className}`}>
      <div className="flex items-center space-x-3 mb-3">
        {Icon && (
          <div className={`w-10 h-10 rounded-full bg-${color}-500/20 flex items-center justify-center animate-bounce`}>
            <Icon className={`w-5 h-5 text-${color}-400`} />
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-white font-medium">{title}</span>
            <PlayfulLoader type="dots" color={color} size="sm" />
          </div>
          {subtitle && (
            <p className="text-gray-300 text-xs animate-fade-in" style={{ animationDelay: '200ms' }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-600/50 rounded animate-pulse"></div>
        <div className="h-3 bg-gray-600/50 rounded w-5/6 animate-pulse" style={{ animationDelay: '100ms' }}></div>
        <div className="h-3 bg-gray-600/50 rounded w-4/6 animate-pulse" style={{ animationDelay: '200ms' }}></div>
      </div>
    </div>
  );
}