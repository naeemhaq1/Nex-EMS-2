import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { 
  MessageCircle, 
  Send, 
  Check, 
  CheckCheck,
  Clock,
  AlertCircle,
  RefreshCw,
  Phone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface DeliveryStatus {
  messageId?: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  checkmarkDisplay: {
    checkmarks: 'none' | 'single' | 'double';
    color: 'gray' | 'blue' | 'green';
    label: string;
  };
  timestamps?: {
    sent?: string;
    delivered?: string;
    read?: string;
  };
}

export const WhatsAppDeliveryTest: React.FC = () => {
  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const { toast } = useToast();

  // Send test message mutation
  const sendTestMessage = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/admin/whatsapp-delivery-test', {
        method: 'POST',
      });
    },
    onSuccess: (data) => {
      console.log('WhatsApp test response:', data);
      
      if (data && data.messageId) {
        setDeliveryStatus({
          messageId: data.messageId,
          status: 'sent',
          checkmarkDisplay: data.checkmarkInfo,
        });
        
        toast({
          title: "Test Message Sent",
          description: `Message ID: ${data.messageId}`,
        });

        // Start polling for status updates
        startPolling(data.messageId);
      } else {
        throw new Error('Invalid response: missing messageId');
      }
    },
    onError: (error: any) => {
      console.error('WhatsApp test error:', error);
      toast({
        title: "Test Failed",
        description: error.message || error.error || "Failed to send test message",
        variant: "destructive",
      });
    },
  });

  // Get delivery status mutation
  const getDeliveryStatus = useMutation({
    mutationFn: async (messageId: string) => {
      return apiRequest({ 
        url: `/api/admin/whatsapp-delivery-status/${messageId}` 
      });
    },
    onSuccess: (data) => {
      setDeliveryStatus({
        messageId: data.messageId,
        status: data.status,
        checkmarkDisplay: data.checkmarkDisplay,
        timestamps: data.formattedTimestamps,
      });
    },
  });

  const startPolling = (messageId: string) => {
    setIsPolling(true);
    let pollCount = 0;
    const maxPolls = 20; // Poll for 2 minutes (6s intervals)

    const pollInterval = setInterval(() => {
      pollCount++;
      getDeliveryStatus.mutate(messageId);

      // Stop polling after max attempts or when read
      if (pollCount >= maxPolls || deliveryStatus?.status === 'read') {
        clearInterval(pollInterval);
        setIsPolling(false);
      }
    }, 6000); // Poll every 6 seconds
  };

  const getStatusIcon = (status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed') => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-gray-400" />;
      case 'sent':
        return <Check className="w-5 h-5 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="w-5 h-5 text-gray-400" />;
      case 'read':
        return <CheckCheck className="w-5 h-5 text-blue-500" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'read':
        return 'text-blue-600';
      case 'delivered':
        return 'text-green-600';
      case 'sent':
        return 'text-gray-600';
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MessageCircle className="w-5 h-5 text-blue-500" />
          <span>WhatsApp Delivery Test</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Test Phone Number Display */}
        <div className="flex items-center space-x-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <Phone className="w-4 h-4 text-blue-600" />
          <span className="text-sm text-blue-700 dark:text-blue-300">
            Test Number: +92 300 846 3660
          </span>
        </div>

        {/* Send Test Button */}
        <Button
          onClick={() => sendTestMessage.mutate()}
          disabled={sendTestMessage.isPending || isPolling}
          className="w-full"
        >
          {sendTestMessage.isPending ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Sending Test...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Send Test Message
            </>
          )}
        </Button>

        {/* Delivery Status Display */}
        {deliveryStatus && (
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Delivery Status</span>
              {isPolling && (
                <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
              )}
            </div>

            {/* Status with Icon */}
            <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              {getStatusIcon(deliveryStatus.status)}
              <div>
                <div className={`font-medium ${getStatusColor(deliveryStatus.status)}`}>
                  {deliveryStatus.checkmarkDisplay.label}
                </div>
                <div className="text-sm text-gray-500">
                  {deliveryStatus.status.charAt(0).toUpperCase() + deliveryStatus.status.slice(1)}
                </div>
              </div>
            </div>

            {/* Message ID */}
            {deliveryStatus.messageId && (
              <div className="text-xs text-gray-500 font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded">
                ID: {deliveryStatus.messageId}
              </div>
            )}

            {/* Timestamps */}
            {deliveryStatus.timestamps && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Delivery Timeline:
                </div>
                {deliveryStatus.timestamps.sent && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Sent:</span>
                    <span className="text-gray-900 dark:text-white">
                      {deliveryStatus.timestamps.sent}
                    </span>
                  </div>
                )}
                {deliveryStatus.timestamps.delivered && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Delivered:</span>
                    <span className="text-green-600">
                      {deliveryStatus.timestamps.delivered}
                    </span>
                  </div>
                )}
                {deliveryStatus.timestamps.read && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Read:</span>
                    <span className="text-blue-600 font-medium">
                      {deliveryStatus.timestamps.read}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-gray-500 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="font-medium mb-1">Testing WhatsApp Delivery Status:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Sends real message to test number</li>
            <li>Tracks delivery status updates</li>
            <li>Shows authentic checkmarks like WhatsApp</li>
            <li>Displays precise timestamps</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};