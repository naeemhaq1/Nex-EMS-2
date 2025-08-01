import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Send, CheckCircle, XCircle, AlertCircle, Users, MessageSquare } from 'lucide-react';

interface BroadcastRecipient {
  phone: string;
  name: string;
}

interface DeliveryResult {
  success: boolean;
  messageId?: string;
  error?: string;
  errorCode?: string;
  recipientPhone: string;
  recipientName?: string;
}

interface BroadcastResult {
  success: boolean;
  totalRecipients: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  successfulContacts: DeliveryResult[];
  failedContacts: DeliveryResult[];
  summary: string;
  details: {
    message: string;
    validationErrors: number;
    apiErrors: number;
    rateLimit: string;
  };
}

interface WhatsAppBroadcastDialogProps {
  isOpen: boolean;
  onClose: () => void;
  recipients: BroadcastRecipient[];
  groupName: string;
}

export default function WhatsAppBroadcastDialog({
  isOpen,
  onClose,
  recipients,
  groupName
}: WhatsAppBroadcastDialogProps) {
  const [message, setMessage] = useState('');
  const [broadcastResult, setBroadcastResult] = useState<BroadcastResult | null>(null);
  const [showResults, setShowResults] = useState(false);
  const { toast } = useToast();

  const broadcastMutation = useMutation({
    mutationFn: async ({ recipients, message }: { recipients: BroadcastRecipient[]; message: string }) => {
      const response = await apiRequest('/api/whatsapp-management/broadcast-message', {
        method: 'POST',
        body: JSON.stringify({
          recipients,
          message,
          messageType: 'text'
        })
      });
      return response;
    },
    onSuccess: (result: BroadcastResult) => {
      setBroadcastResult(result);
      setShowResults(true);
      
      if (result.success) {
        toast({
          title: "Broadcast sent",
          description: result.summary,
        });
      } else {
        toast({
          title: "Broadcast failed",
          description: result.summary,
          variant: "destructive"
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send broadcast message",
        variant: "destructive"
      });
    }
  });

  const handleSendBroadcast = () => {
    if (!message.trim()) {
      toast({
        title: "Error",
        description: "Message cannot be empty",
        variant: "destructive"
      });
      return;
    }

    broadcastMutation.mutate({ recipients, message });
  };

  const handleClose = () => {
    setMessage('');
    setBroadcastResult(null);
    setShowResults(false);
    onClose();
  };

  if (showResults && broadcastResult) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="bg-[#1A1B3E] border-slate-600 text-white max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {broadcastResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              Broadcast Results - {groupName}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-[#2A2B5E] p-4 rounded-lg text-center">
                <Users className="h-6 w-6 mx-auto mb-2 text-slate-400" />
                <div className="text-xl font-semibold">{broadcastResult.totalRecipients}</div>
                <div className="text-xs text-slate-400">Total Recipients</div>
              </div>
              <div className="bg-green-900/20 p-4 rounded-lg text-center">
                <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-500" />
                <div className="text-xl font-semibold text-green-400">{broadcastResult.successfulDeliveries}</div>
                <div className="text-xs text-slate-400">Successful</div>
              </div>
              <div className="bg-red-900/20 p-4 rounded-lg text-center">
                <XCircle className="h-6 w-6 mx-auto mb-2 text-red-500" />
                <div className="text-xl font-semibold text-red-400">{broadcastResult.failedDeliveries}</div>
                <div className="text-xs text-slate-400">Failed</div>
              </div>
            </div>

            {/* Summary Message */}
            <div className="bg-[#2A2B5E] p-4 rounded-lg">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Summary
              </h3>
              <p className="text-sm text-slate-300">{broadcastResult.summary}</p>
              {broadcastResult.details && (
                <div className="mt-2 text-xs text-slate-400">
                  <div>Validation Errors: {broadcastResult.details.validationErrors}</div>
                  <div>API Errors: {broadcastResult.details.apiErrors}</div>
                  <div>{broadcastResult.details.rateLimit}</div>
                </div>
              )}
            </div>

            {/* Failed Contacts Details */}
            {broadcastResult.failedContacts.length > 0 && (
              <div className="bg-red-900/10 p-4 rounded-lg">
                <h3 className="font-semibold mb-3 text-red-400 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Failed Deliveries ({broadcastResult.failedContacts.length})
                </h3>
                <ScrollArea className="h-40">
                  <div className="space-y-2">
                    {broadcastResult.failedContacts.map((contact, index) => (
                      <div key={index} className="flex items-start justify-between p-2 bg-red-900/20 rounded text-sm">
                        <div>
                          <div className="font-medium">{contact.recipientName || 'Unknown'}</div>
                          <div className="text-xs text-slate-400">{contact.recipientPhone}</div>
                        </div>
                        <div className="text-right max-w-xs">
                          <Badge variant="destructive" className="text-xs mb-1">
                            {contact.errorCode || 'ERROR'}
                          </Badge>
                          <div className="text-xs text-red-400">{contact.error}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Successful Contacts */}
            {broadcastResult.successfulContacts.length > 0 && (
              <div className="bg-green-900/10 p-4 rounded-lg">
                <h3 className="font-semibold mb-3 text-green-400 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Successful Deliveries ({broadcastResult.successfulContacts.length})
                </h3>
                <ScrollArea className="h-32">
                  <div className="grid grid-cols-2 gap-2">
                    {broadcastResult.successfulContacts.map((contact, index) => (
                      <div key={index} className="p-2 bg-green-900/20 rounded text-sm">
                        <div className="font-medium">{contact.recipientName || 'Unknown'}</div>
                        <div className="text-xs text-slate-400">{contact.recipientPhone}</div>
                        {contact.messageId && (
                          <div className="text-xs text-green-400">ID: {contact.messageId.substring(0, 8)}...</div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleClose} className="flex-1">
                Close
              </Button>
              <Button 
                onClick={() => setShowResults(false)} 
                variant="outline" 
                className="flex-1"
              >
                Send Another
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-[#1A1B3E] border-slate-600 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Send Broadcast Message
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-[#2A2B5E] p-3 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
              <Users className="h-4 w-4" />
              Recipients: {recipients.length} contacts in {groupName}
            </div>
            <div className="text-xs text-slate-500 max-h-20 overflow-y-auto">
              {recipients.slice(0, 5).map(r => r.name).join(', ')}
              {recipients.length > 5 && ` and ${recipients.length - 5} more...`}
            </div>
          </div>

          <div>
            <Textarea
              placeholder="Type your message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="bg-[#2A2B5E] border-slate-600 text-white resize-none"
            />
            <div className="text-xs text-slate-500 mt-1">
              {message.length} characters
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleClose} variant="outline" className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleSendBroadcast}
              disabled={broadcastMutation.isPending || !message.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {broadcastMutation.isPending ? (
                <>Sending...</>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Broadcast
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}