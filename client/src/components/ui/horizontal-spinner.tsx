
import React from 'react';

interface HorizontalSpinnerProps {
  className?: string;
}

function HorizontalSpinner({ className = '' }: HorizontalSpinnerProps) {
  return (
    <div className={`flex items-center justify-center space-x-1 ${className}`}>
      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
    </div>
  );
}

export default HorizontalSpinner;
export { HorizontalSpinner };
