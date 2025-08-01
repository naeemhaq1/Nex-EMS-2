import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, Loader2, TestTube } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface WhatsAppTestDialogProps {
  trigger?: React.ReactNode;
}

export function WhatsAppTestDialog({ trigger }: WhatsAppTestDialogProps) {
  const [phone, setPhone] = useState("923008463660");
  const [isOpen, setIsOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'connected' | 'failed'>('idle');
  const { toast } = useToast();

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/whatsapp/test', {
        method: 'GET'
      });
    },
    onSuccess: (data) => {
      setConnectionStatus(data.connected ? 'connected' : 'failed');
      toast({
        title: data.connected ? "Connection Successful" : "Connection Failed",
        description: data.error || "WhatsApp API is ready",
        variant: data.connected ? "default" : "destructive",
      });
    },
    onError: (error: any) => {
      setConnectionStatus('failed');
      toast({
        title: "Connection Test Failed",
        description: error.message || "Failed to test WhatsApp connection",
        variant: "destructive",
      });
    }
  });

  const sendTestMutation = useMutation({
    mutationFn: async (data: { to: string; message: string }) => {
      return apiRequest('/api/whatsapp/send', {
        method: 'POST',
        body: data
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Test Message Sent",
        description: "WhatsApp test message sent successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Send Test",
        description: error.message || "Failed to send WhatsApp test message",
        variant: "destructive",
      });
    }
  });

  const handleTestConnection = () => {
    setConnectionStatus('testing');
    testConnectionMutation.mutate();
  };

  const handleSendTest = () => {
    const cleanedPhone = phone.replace(/^\+/, '');
    sendTestMutation.mutate({
      to: cleanedPhone,
      message: "WhatsApp integration test from Nexlinx Smart EMS! The system is now ready to send attendance alerts and notifications. Please confirm receipt."
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <TestTube className="h-4 w-4 mr-2" />
            Test WhatsApp
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-500" />
            WhatsApp Integration Test
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Connection Status</Label>
            <div className="flex items-center gap-2">
              <Badge variant={
                connectionStatus === 'connected' ? 'default' : 
                connectionStatus === 'failed' ? 'destructive' : 
                'secondary'
              }>
                {connectionStatus === 'idle' ? 'Not Tested' :
                 connectionStatus === 'testing' ? 'Testing...' :
                 connectionStatus === 'connected' ? 'Connected' :
                 'Failed'}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestConnection}
                disabled={testConnectionMutation.isPending}
              >
                {testConnectionMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <TestTube className="h-4 w-4" />
                )}
                Test Connection
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Test Phone Number</Label>
            <Input
              id="phone"
              placeholder="923008463660"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={sendTestMutation.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label>API Configuration</Label>
            <div className="bg-gray-100 p-3 rounded-lg text-sm">
              <p><strong>Server:</strong> nex-wam.replit.app</p>
              <p><strong>API Key:</strong> gw_vwihn6nvjokbhl2yi88k7e</p>
              <p><strong>Prefix:</strong> [NEMS]</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSendTest}
              disabled={sendTestMutation.isPending || !phone.trim()}
              className="flex-1"
            >
              {sendTestMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send Test Message
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}