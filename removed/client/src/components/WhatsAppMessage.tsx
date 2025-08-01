import React, { useState } from 'react';
import { Check, CheckCheck, Clock, AlertCircle, ChevronLeft } from 'lucide-react';

interface WhatsAppMessageProps {
  message: {
    id: string;
    messageId?: string;
    content: string;
    timestamp: string;
    status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
    isOutgoing: boolean;
    recipientName?: string;
    recipientPhone: string;
    deliveryDetails?: {
      sentAt?: string;
      deliveredAt?: string;
      readAt?: string;
      failedAt?: string;
      error?: string;
      deliveryAttempts?: number;
    };
  };
}

export const WhatsAppMessage: React.FC<WhatsAppMessageProps> = ({ message }) => {
  const [showDetails, setShowDetails] = useState(false);

  const getCheckmarkIcon = () => {
    switch (message.status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-gray-400" />;
      case 'sent':
        return <Check className="w-4 h-4 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="w-4 h-4 text-gray-400" />;
      case 'read':
        return <CheckCheck className="w-4 h-4 text-blue-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusLabel = () => {
    switch (message.status) {
      case 'pending':
        return 'Sending...';
      case 'sent':
        return 'Sent';
      case 'delivered':
        return 'Delivered';
      case 'read':
        return 'Read';
      case 'failed':
        return 'Failed';
      default:
        return 'Unknown';
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDateTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <>
      {/* Main Message Bubble */}
      <div
        className={`flex ${message.isOutgoing ? 'justify-end' : 'justify-start'} mb-2 group`}
        onTouchStart={(e) => {
          const startX = e.touches[0].clientX;
          const handleTouchMove = (moveEvent: TouchEvent) => {
            const currentX = moveEvent.touches[0].clientX;
            const diff = startX - currentX;
            if (diff > 50) { // Swipe left threshold
              setShowDetails(true);
              document.removeEventListener('touchmove', handleTouchMove);
            }
          };
          document.addEventListener('touchmove', handleTouchMove);
          document.addEventListener('touchend', () => {
            document.removeEventListener('touchmove', handleTouchMove);
          }, { once: true });
        }}
      >
        <div
          className={`max-w-xs px-4 py-2 rounded-2xl ${
            message.isOutgoing
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
          } shadow-sm`}
        >
          {/* Message Content */}
          <div className="whitespace-pre-wrap break-words">{message.content}</div>
          
          {/* Message Footer */}
          <div
            className={`flex items-center justify-end gap-1 mt-1 text-xs ${
              message.isOutgoing ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <span>{formatTime(message.timestamp)}</span>
            {message.isOutgoing && (
              <div className="flex items-center">
                {getCheckmarkIcon()}
              </div>
            )}
          </div>
        </div>

        {/* Swipe indicator for outgoing messages */}
        {message.isOutgoing && (
          <div className="opacity-0 group-hover:opacity-50 transition-opacity ml-2 flex items-center">
            <ChevronLeft className="w-4 h-4 text-gray-400" />
          </div>
        )}
      </div>

      {/* Delivery Details Panel */}
      {showDetails && message.isOutgoing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mx-4 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Message Details
              </h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                ×
              </button>
            </div>

            {/* Recipient Info */}
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-300">To:</div>
              <div className="font-medium text-gray-900 dark:text-white">
                {message.recipientName || message.recipientPhone}
              </div>
              {message.recipientName && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {message.recipientPhone}
                </div>
              )}
            </div>

            {/* Delivery Status Timeline */}
            <div className="space-y-3">
              <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Delivery Status
              </div>

              {/* Current Status */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                {getCheckmarkIcon()}
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {getStatusLabel()}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDateTime(message.timestamp)}
                  </div>
                </div>
              </div>

              {/* Detailed Timestamps */}
              {message.deliveryDetails && (
                <div className="space-y-2 text-sm">
                  {message.deliveryDetails.sentAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Sent:</span>
                      <span className="text-gray-900 dark:text-white">
                        {formatDateTime(message.deliveryDetails.sentAt)}
                      </span>
                    </div>
                  )}
                  {message.deliveryDetails.deliveredAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Delivered:</span>
                      <span className="text-gray-900 dark:text-white">
                        {formatDateTime(message.deliveryDetails.deliveredAt)}
                      </span>
                    </div>
                  )}
                  {message.deliveryDetails.readAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Read:</span>
                      <span className="text-blue-500 font-medium">
                        {formatDateTime(message.deliveryDetails.readAt)}
                      </span>
                    </div>
                  )}
                  {message.deliveryDetails.failedAt && (
                    <div className="flex justify-between">
                      <span className="text-red-600 dark:text-red-400">Failed:</span>
                      <span className="text-red-500">
                        {formatDateTime(message.deliveryDetails.failedAt)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Error Details */}
              {message.status === 'failed' && message.deliveryDetails?.error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="text-sm font-medium text-red-800 dark:text-red-400 mb-1">
                    Error Details:
                  </div>
                  <div className="text-sm text-red-700 dark:text-red-300">
                    {message.deliveryDetails.error}
                  </div>
                </div>
              )}

              {/* Message ID */}
              {message.messageId && (
                <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                  ID: {message.messageId}
                </div>
              )}
            </div>

            {/* Close Button */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowDetails(false)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};