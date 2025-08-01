import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Settings, 
  Play, 
  Square, 
  RotateCcw, 
  Calculator,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  Zap,
  RefreshCw
} from "lucide-react";

interface ServiceStatus {
  name: string;
  status: 'running' | 'stopped' | 'error';
  description: string;
  lastRun?: string;
  nextRun?: string;
  processedRecords?: number;
  errors?: number;
  uptime?: string;
}

export default function Services() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [recalculationDays, setRecalculationDays] = useState("90");
  const [selectedService, setSelectedService] = useState<string | null>(null);

  // Fetch service statuses
  const { data: services, isLoading } = useQuery<ServiceStatus[]>({
    queryKey: ["/api/services/status"],
    refetchInterval: 5000,
  });

  // Service control mutations
  const startServiceMutation = useMutation({
    mutationFn: (serviceName: string) => 
      apiRequest("POST", `/api/services/${serviceName}/start`).then(res => res.json()),
    onSuccess: (data, serviceName) => {
      toast({
        title: "Service Started",
        description: `${serviceName} service has been started successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/services/status"] });
    },
    onError: (error: any, serviceName) => {
      toast({
        title: "Start Failed",
        description: `Failed to start ${serviceName} service: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const stopServiceMutation = useMutation({
    mutationFn: (serviceName: string) => 
      apiRequest("POST", `/api/services/${serviceName}/stop`).then(res => res.json()),
    onSuccess: (data, serviceName) => {
      toast({
        title: "Service Stopped",
        description: `${serviceName} service has been stopped successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/services/status"] });
    },
    onError: (error: any, serviceName) => {
      toast({
        title: "Stop Failed",
        description: `Failed to stop ${serviceName} service: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const restartServiceMutation = useMutation({
    mutationFn: (serviceName: string) => 
      apiRequest("POST", `/api/services/${serviceName}/restart`).then(res => res.json()),
    onSuccess: (data, serviceName) => {
      toast({
        title: "Service Restarted",
        description: `${serviceName} service has been restarted successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/services/status"] });
    },
    onError: (error: any, serviceName) => {
      toast({
        title: "Restart Failed",
        description: `Failed to restart ${serviceName} service: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const recalculateMutation = useMutation({
    mutationFn: (days: string) => 
      apiRequest("POST", `/api/services/recalculate?days=${days}`).then(res => res.json()),
    onSuccess: (data) => {
      toast({
        title: "Recalculation Started",
        description: `Recalculation for last ${recalculationDays} days has been initiated.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/services/status"] });
    },
    onError: (error: any) => {
      toast({
        title: "Recalculation Failed",
        description: `Failed to start recalculation: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const getServiceIcon = (serviceName: string) => {
    switch (serviceName.toLowerCase()) {
      case 'auto-punchout':
        return <Clock className="h-5 w-5" />;
      case 'lateearly-analysis':
        return <AlertTriangle className="h-5 w-5" />;
      case 'attendance-sync':
        return <Users className="h-5 w-5" />;
      case 'data-backup':
        return <Activity className="h-5 w-5" />;
      default:
        return <Zap className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'stopped':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'error':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <CheckCircle className="h-4 w-4" />;
      case 'stopped':
        return <Square className="h-4 w-4" />;
      case 'error':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Square className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6 min-h-screen bg-[#1A1B3E] p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">System Services</h1>
          <p className="text-slate-400 mt-1">Monitor and control system background services</p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={recalculationDays} onValueChange={setRecalculationDays}>
            <SelectTrigger className="w-32 bg-[#2A2B5E] border-slate-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30 Days</SelectItem>
              <SelectItem value="60">60 Days</SelectItem>
              <SelectItem value="90">90 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={() => recalculateMutation.mutate(recalculationDays)}
            disabled={recalculateMutation.isPending}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {recalculateMutation.isPending ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Calculator className="h-4 w-4 mr-2" />
            )}
            Recalculate
          </Button>
        </div>
      </div>

      <Alert className="border-blue-500/20 bg-blue-500/10">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-blue-200">
          Service management controls system background processes. Use caution when stopping critical services.
        </AlertDescription>
      </Alert>

      {/* Service Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full text-center py-8">
            <div className="text-slate-400">Loading services...</div>
          </div>
        ) : services?.length === 0 ? (
          <div className="col-span-full text-center py-8">
            <div className="text-slate-400">No services configured</div>
          </div>
        ) : (
          services?.map((service) => (
            <Card key={service.name} className="border-slate-700 bg-[#2A2B5E] hover:bg-[#2A2B5E]/80 transition-colors">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-white">
                  <div className="flex items-center space-x-3">
                    <div className="text-blue-400">
                      {getServiceIcon(service.name)}
                    </div>
                    <div>
                      <div className="font-semibold">{service.name}</div>
                      <div className="text-xs text-slate-400 font-normal">
                        {service.description}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${
                      service.status === 'running' ? 'bg-green-500 shadow-green-500/50 shadow-lg' :
                      service.status === 'error' ? 'bg-red-500 shadow-red-500/50 shadow-lg' :
                      'bg-gray-500 shadow-gray-500/50 shadow-lg'
                    }`}></div>
                    <Badge className={getStatusColor(service.status)}>
                      {getStatusIcon(service.status)}
                      <span className="ml-1 capitalize">{service.status}</span>
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Service Statistics */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-slate-400">Last Run</div>
                    <div className="text-white font-medium">
                      {service.lastRun || 'Never'}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400">Next Run</div>
                    <div className="text-white font-medium">
                      {service.nextRun || 'N/A'}
                    </div>
                  </div>
                  {service.processedRecords !== undefined && (
                    <div>
                      <div className="text-slate-400">Processed</div>
                      <div className="text-white font-medium">
                        {service.processedRecords.toLocaleString()}
                      </div>
                    </div>
                  )}
                  {service.errors !== undefined && (
                    <div>
                      <div className="text-slate-400">Errors</div>
                      <div className="text-white font-medium">
                        {service.errors}
                      </div>
                    </div>
                  )}
                  {service.uptime && (
                    <div className="col-span-2">
                      <div className="text-slate-400">Uptime</div>
                      <div className="text-white font-medium">
                        {service.uptime}
                      </div>
                    </div>
                  )}
                </div>

                {/* Service Controls */}
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    onClick={() => startServiceMutation.mutate(service.name)}
                    disabled={service.status === 'running' || startServiceMutation.isPending}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <Play className="h-3 w-3 mr-1" />
                    Start
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => stopServiceMutation.mutate(service.name)}
                    disabled={service.status === 'stopped' || stopServiceMutation.isPending}
                    variant="destructive"
                    className="flex-1"
                  >
                    <Square className="h-3 w-3 mr-1" />
                    Stop
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => restartServiceMutation.mutate(service.name)}
                    disabled={restartServiceMutation.isPending}
                    variant="outline"
                    className="flex-1 border-slate-600 hover:bg-slate-700"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Restart
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Service Logs */}
      <Card className="border-slate-700 bg-[#2A2B5E]">
        <CardHeader>
          <CardTitle className="flex items-center text-white">
            <Activity className="h-5 w-5 mr-2 text-blue-400" />
            Service Activity Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {/* This would be populated with real service logs */}
            <div className="text-sm text-slate-400 border-l-2 border-green-500 pl-3">
              <div className="text-green-400 font-medium">
                {new Date().toLocaleTimeString()} - Auto Punch-out Service
              </div>
              <div>Processed 15 attendance records, 3 employees auto-punched out</div>
            </div>
            <div className="text-sm text-slate-400 border-l-2 border-blue-500 pl-3">
              <div className="text-blue-400 font-medium">
                {new Date(Date.now() - 300000).toLocaleTimeString()} - LateEarly Analysis
              </div>
              <div>Analyzed 225 attendance records for timing patterns</div>
            </div>
            <div className="text-sm text-slate-400 border-l-2 border-purple-500 pl-3">
              <div className="text-purple-400 font-medium">
                {new Date(Date.now() - 600000).toLocaleTimeString()} - Data Backup Service
              </div>
              <div>Daily backup completed successfully (45.2MB)</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}