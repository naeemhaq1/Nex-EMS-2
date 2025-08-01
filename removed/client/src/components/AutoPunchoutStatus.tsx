import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function AutoPunchoutStatus() {
  const { toast } = useToast();

  const { data: status, refetch } = useQuery({
    queryKey: ["/api/auto-punchout/status"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const handleTriggerManual = async () => {
    try {
      await apiRequest("POST", "/api/auto-punchout/trigger");
      toast({
        title: "Success",
        description: "Auto punch-out process triggered successfully",
      });
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to trigger auto punch-out process",
        variant: "destructive",
      });
    }
  };

  if (!status) {
    return (
      <Card className="border-slate-700 bg-[#2A2B5E]">
        <CardHeader>
          <CardTitle className="flex items-center text-white">
            <Clock className="h-5 w-5 mr-2 text-blue-400" />
            Auto Punch-out Service
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-slate-400">Loading service status...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-700 bg-[#2A2B5E]">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-white">
          <span className="flex items-center">
            <Clock className="h-5 w-5 mr-2 text-blue-400" />
            Auto Punch-out Service
          </span>
          <Badge 
            className={status.isRunning 
              ? "bg-green-500/20 text-green-400 border-green-500/30" 
              : "bg-red-500/20 text-red-400 border-red-500/30"
            }
          >
            {status.isRunning ? (
              <>
                <CheckCircle className="h-3 w-3 mr-1" />
                Running
              </>
            ) : (
              <>
                <AlertTriangle className="h-3 w-3 mr-1" />
                Stopped
              </>
            )}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-slate-400">Check Interval</div>
            <div className="text-white font-medium">
              {Math.round(status.checkInterval / 60000)} minutes
            </div>
          </div>
          <div>
            <div className="text-slate-400">Hours Threshold</div>
            <div className="text-white font-medium">
              {status.hoursThreshold} hours
            </div>
          </div>
          <div>
            <div className="text-slate-400">Payroll Hours</div>
            <div className="text-white font-medium">
              {status.payrollHours} hours
            </div>
          </div>
          <div>
            <div className="text-slate-400">Next Check</div>
            <div className="text-white font-medium">
              {status.nextCheck 
                ? new Date(status.nextCheck).toLocaleTimeString()
                : "N/A"
              }
            </div>
          </div>
        </div>
        
        <div className="pt-4 border-t border-slate-600">
          <Button 
            onClick={handleTriggerManual}
            variant="outline"
            size="sm"
            className="w-full border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Trigger Manual Check
          </Button>
          <p className="text-xs text-slate-400 mt-2 text-center">
            Manually trigger auto punch-out process for testing
          </p>
        </div>

        <div className="pt-2 text-xs text-slate-400">
          <div className="font-medium text-slate-300 mb-1">How it works:</div>
          <ul className="space-y-1">
            <li>• Monitors employees with punch-in but no punch-out</li>
            <li>• Auto punch-out after {status.hoursThreshold} hours</li>
            <li>• Records exactly {status.payrollHours} hours for payroll</li>
            <li>• Marked as "Terminated by System"</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}