
import React from 'react';

interface HorizontalSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

function HorizontalSpinner({ size = 'md', className = '' }: HorizontalSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6', 
    lg: 'h-8 w-8'
  };

  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${sizeClasses[size]}`}></div>
    </div>
  );
}

export { HorizontalSpinner };
export default HorizontalSpinner;
