import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, Loader2, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface WhatsAppDialogProps {
  trigger?: React.ReactNode;
  defaultPhone?: string;
  defaultName?: string;
  onSuccess?: () => void;
}

export function WhatsAppDialog({ trigger, defaultPhone = "", defaultName = "", onSuccess }: WhatsAppDialogProps) {
  const [phone, setPhone] = useState(defaultPhone);
  const [message, setMessage] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { to: string; message: string }) => {
      return apiRequest('/api/whatsapp/send', {
        method: 'POST',
        body: data
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Message Sent",
        description: "WhatsApp message sent successfully",
      });
      setMessage("");
      setIsOpen(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Send",
        description: error.message || "Failed to send WhatsApp message",
        variant: "destructive",
      });
    }
  });

  const handleSend = () => {
    if (!phone.trim()) {
      toast({
        title: "Phone Required",
        description: "Please enter a phone number",
        variant: "destructive",
      });
      return;
    }

    if (!message.trim()) {
      toast({
        title: "Message Required",
        description: "Please enter a message",
        variant: "destructive",
      });
      return;
    }

    // Remove + from phone number if present (server will handle formatting)
    const cleanedPhone = phone.replace(/^\+/, '');
    
    sendMessageMutation.mutate({
      to: cleanedPhone,
      message: message.trim()
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <MessageCircle className="h-4 w-4 mr-2" />
            WhatsApp
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-500" />
            Send WhatsApp Message
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              placeholder="+1234567890"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={sendMessageMutation.isPending}
            />
            <p className="text-sm text-gray-500">
              Include country code (e.g., +92 for Pakistan)
            </p>
          </div>

          {defaultName && (
            <div className="space-y-2">
              <Label>Employee</Label>
              <Badge variant="outline" className="w-fit">
                {defaultName}
              </Badge>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Enter your message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={sendMessageMutation.isPending}
              rows={4}
            />
            <p className="text-sm text-gray-500">
              All messages will be sent with [NEMS] prefix
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSend}
              disabled={sendMessageMutation.isPending || !phone.trim() || !message.trim()}
              className="flex-1"
            >
              {sendMessageMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send Message
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={sendMessageMutation.isPending}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}