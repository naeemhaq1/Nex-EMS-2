import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { 
  Server, 
  Activity, 
  Clock, 
  MessageSquare, 
  Database, 
  Shield,
  Zap,
  Bell,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Monitor,
  Settings,
  Archive,
  Wifi,
  Network,
  Eye
} from "lucide-react";

interface ServiceStatus {
  name: string;
  status: 'healthy' | 'unhealthy' | 'warning' | 'stopped';
  displayName: string;
  icon: any;
  description: string;
}

export function ServiceMonitor() {
  const [, setLocation] = useLocation();

  const { data: services, isLoading } = useQuery({
    queryKey: ["/api/admin/services"],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const handleClick = () => {
    setLocation("/services");
  };

  const getServiceList = (): ServiceStatus[] => {
    if (!services || !Array.isArray(services)) return [];
    
    // Service icon mapping
    const serviceIcons: Record<string, any> = {
      portManager: Monitor,
      attendanceProcessor: Database,
      threePollerSystem: Clock,
      watchdog: Shield,
      processMonitor: Eye,
      autoBackupService: Archive,
      systemAlerts: Bell,
      notificationService: Zap,
      whatsappMain: MessageSquare,
      whatsappChatbot: Activity,
      whatsappService: MessageSquare,
      whatsappMonitor: Activity,
      whatsappAPIMonitor: Network,
      whatsappDirectory: Database,
      whatsappDeliveryTracker: Wifi,
      whatsappAnnouncement: Bell
    };

    // Port mapping for each service
    const servicePorts: Record<string, string> = {
      portManager: 'Port 5000',
      attendanceProcessor: 'Port 5001',
      threePollerSystem: 'Port 5001',
      watchdog: 'Port 5001',
      processMonitor: 'Port 5001',
      autoBackupService: 'Port 5001',
      systemAlerts: 'Port 5001',
      notificationService: 'Port 5001',
      whatsappMain: 'Port 5000',
      whatsappChatbot: 'Port 5000',
      whatsappService: 'Port 5002',
      whatsappMonitor: 'Port 5002',
      whatsappAPIMonitor: 'Port 5002',
      whatsappDirectory: 'Port 5002',
      whatsappDeliveryTracker: 'Port 5002',
      whatsappAnnouncement: 'Port 5002'
    };

    return services.map(service => ({
      name: service.name,
      status: service.status === 'healthy' ? 'healthy' : 
              service.status === 'running' ? 'healthy' :
              service.status === 'stopped' ? 'unhealthy' : 'warning',
      displayName: service.displayName || service.name,
      icon: serviceIcons[service.name] || Settings,
      description: `${servicePorts[service.name] || `Port ${service.port || 'Unknown'}`} - ${service.description || 'Service'}`
    }));
  };

  const serviceList = getServiceList();
  const healthyCount = serviceList.filter(s => s.status === 'healthy').length;
  const totalCount = serviceList.length;
  const overallHealth = healthyCount === totalCount ? 'healthy' : healthyCount > totalCount / 2 ? 'warning' : 'unhealthy';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'unhealthy': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-3 w-3 text-green-400" />;
      case 'warning': return <AlertTriangle className="h-3 w-3 text-yellow-400" />;
      case 'unhealthy': return <XCircle className="h-3 w-3 text-red-400" />;
      default: return <XCircle className="h-3 w-3 text-gray-400" />;
    }
  };

  if (isLoading) {
    return (
      <Card className="border-slate-700 bg-[#2A2B5E] cursor-pointer hover:bg-[#2A2B5E]/80 transition-colors">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-white text-sm">
            <Server className="h-4 w-4 mr-2 text-blue-400" />
            Service Monitor
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-slate-400 text-sm">Loading service status...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className="border-slate-700 bg-[#2A2B5E] cursor-pointer hover:bg-[#2A2B5E]/80 transition-colors"
      onClick={handleClick}
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-white text-base">
          <span className="flex items-center">
            <Server className="h-5 w-5 mr-2 text-blue-400" />
            Service Monitor
          </span>
          <Badge 
            className={`text-xs px-2 py-1 ${
              overallHealth === 'healthy' 
                ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                : overallHealth === 'warning'
                ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                : 'bg-red-500/20 text-red-400 border-red-500/30'
            }`}
          >
            {healthyCount}/{totalCount} Active
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-600">
                <th className="text-left py-1 text-slate-400 font-medium">Service</th>
                <th className="text-center py-1 text-slate-400 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {serviceList.map((service, index) => (
                <tr key={service.name} className="border-b border-slate-700/50">
                  <td className="py-1">
                    <div className="flex items-center space-x-2">
                      <service.icon className="h-3 w-3 text-slate-400 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-slate-200 font-medium leading-tight">{service.displayName}</span>
                          {service.name.includes('whatsapp') && (
                            <Badge variant="outline" className="text-xs text-green-400 border-green-400/30 px-1 py-0 bg-green-400/10">
                              WA
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 leading-tight">{service.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-1 text-center">
                    <div className="flex items-center justify-center">
                      {getStatusIcon(service.status)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="mt-2 pt-2 border-t border-slate-600">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Click to manage services</span>
            <span className={`font-medium ${getStatusColor(overallHealth)}`}>
              {overallHealth.toUpperCase()}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}