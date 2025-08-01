import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  INITIAL_COMPONENT_VERSIONS,
  VERSION_HISTORY,
  SYSTEM_VERSION,
  BUILD_NUMBER,
  RELEASE_DATE,
  getComponentsByCategory,
  getVersionHistory,
  type ComponentVersion,
  type VersionHistory as VersionHistoryType
} from '@shared/versioning';
import {
  Package,
  Clock,
  GitBranch,
  Smartphone,
  Shield,
  MessageCircle,
  BarChart3,
  Database,
  Calendar,
  ChevronRight,
  Info,
  History,
  Tag,
  Users,
  Activity
} from 'lucide-react';

interface VersionHistoryProps {
  trigger?: React.ReactNode;
}

const getCategoryIcon = (category: ComponentVersion['category']) => {
  switch (category) {
    case 'dashboard': return <BarChart3 className="w-4 h-4" />;
    case 'service': return <Activity className="w-4 h-4" />;
    case 'whatsapp': return <MessageCircle className="w-4 h-4" />;
    case 'mobile': return <Smartphone className="w-4 h-4" />;
    case 'admin': return <Shield className="w-4 h-4" />;
    case 'core': return <Database className="w-4 h-4" />;
    default: return <Package className="w-4 h-4" />;
  }
};

const getStatusColor = (status: ComponentVersion['status']) => {
  switch (status) {
    case 'stable': return 'bg-green-500';
    case 'beta': return 'bg-yellow-500';
    case 'alpha': return 'bg-orange-500';
    case 'deprecated': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
};

const ComponentCard: React.FC<{ component: ComponentVersion }> = ({ component }) => {
  const [showHistory, setShowHistory] = useState(false);
  const history = getVersionHistory(component.id);

  return (
    <Card className="bg-[#2A2B5E] border-gray-700 hover:bg-[#3A3B6E] transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getCategoryIcon(component.category)}
            <CardTitle className="text-white text-sm">{component.name}</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={`text-white text-xs ${getStatusColor(component.status)}`}>
              {component.status}
            </Badge>
            <Badge variant="outline" className="text-xs text-gray-300">
              v{component.version}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-gray-300 text-xs mb-3">{component.description}</p>
        
        <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
          <div className="flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>{component.lastUpdated.toLocaleDateString()}</span>
          </div>
          {history.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className="text-blue-400 hover:text-blue-300 p-1 h-auto"
            >
              <History className="w-3 h-3 mr-1" />
              History ({history.length})
            </Button>
          )}
        </div>

        {component.changes && component.changes.length > 0 && (
          <div className="mb-2">
            <div className="text-xs text-green-400 font-medium mb-1">Latest Changes:</div>
            <ul className="text-xs text-gray-300 space-y-1">
              {component.changes.slice(0, 2).map((change, index) => (
                <li key={index} className="flex items-start space-x-1">
                  <span className="text-green-400 mt-0.5">•</span>
                  <span>{change}</span>
                </li>
              ))}
              {component.changes.length > 2 && (
                <li className="text-gray-400">+ {component.changes.length - 2} more...</li>
              )}
            </ul>
          </div>
        )}

        {component.dependencies && component.dependencies.length > 0 && (
          <div className="mt-2">
            <div className="text-xs text-blue-400 font-medium mb-1">Dependencies:</div>
            <div className="flex flex-wrap gap-1">
              {component.dependencies.slice(0, 3).map((dep, index) => (
                <Badge key={index} variant="outline" className="text-xs text-blue-300 border-blue-500">
                  {dep}
                </Badge>
              ))}
              {component.dependencies.length > 3 && (
                <Badge variant="outline" className="text-xs text-gray-400">
                  +{component.dependencies.length - 3}
                </Badge>
              )}
            </div>
          </div>
        )}

        {showHistory && history.length > 1 && (
          <div className="mt-3 pt-3 border-t border-gray-600">
            <div className="text-xs text-yellow-400 font-medium mb-2">Version History:</div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {history.slice(1).map((version, index) => (
                <div key={index} className="text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white font-medium">v{version.version}</span>
                    <span className="text-gray-400">{version.releaseDate.toLocaleDateString()}</span>
                  </div>
                  {version.changes.length > 0 && (
                    <ul className="text-gray-300 space-y-1 ml-2">
                      {version.changes.slice(0, 2).map((change, changeIndex) => (
                        <li key={changeIndex} className="flex items-start space-x-1">
                          <span className="text-blue-400 mt-0.5">•</span>
                          <span>{change}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const VersionHistory: React.FC<VersionHistoryProps> = ({ trigger }) => {
  const dashboardComponents = getComponentsByCategory('dashboard');
  const serviceComponents = getComponentsByCategory('service');
  const whatsappComponents = getComponentsByCategory('whatsapp');
  const mobileComponents = getComponentsByCategory('mobile');
  const adminComponents = getComponentsByCategory('admin');
  const coreComponents = getComponentsByCategory('core');

  const SystemOverview = () => (
    <Card className="bg-gradient-to-r from-[#1A1B3E] to-[#2A2B5E] border-gray-700 mb-6">
      <CardHeader>
        <CardTitle className="text-white flex items-center space-x-2">
          <Package className="w-5 h-5" />
          <span>NEXLINX System Overview</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">v{SYSTEM_VERSION}</div>
            <div className="text-sm text-gray-300">System Version</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{BUILD_NUMBER}</div>
            <div className="text-sm text-gray-300">Build Number</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">{INITIAL_COMPONENT_VERSIONS.length}</div>
            <div className="text-sm text-gray-300">Components</div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-600">
          <div className="text-sm text-gray-300 mb-2">
            <strong>Latest Release:</strong> {RELEASE_DATE.toLocaleDateString()}
          </div>
          <div className="text-sm text-gray-300">
            <strong>Architecture:</strong> Three-tier distributed system with cross-platform mobile support
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const CategoryTab = ({ components, title }: { components: ComponentVersion[], title: string }) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <Badge variant="outline" className="text-gray-300">
          {components.length} components
        </Badge>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {components.map((component) => (
          <ComponentCard key={component.id} component={component} />
        ))}
      </div>
    </div>
  );

  const content = (
    <div className="min-h-screen bg-[#1A1B3E] text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">System Version History</h1>
          <p className="text-gray-300">Track component versions, updates, and system changes</p>
        </div>

        <SystemOverview />

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-7 bg-[#2A2B5E]">
            <TabsTrigger value="all" className="text-white">All</TabsTrigger>
            <TabsTrigger value="dashboards" className="text-white">Dashboards</TabsTrigger>
            <TabsTrigger value="services" className="text-white">Services</TabsTrigger>
            <TabsTrigger value="whatsapp" className="text-white">WhatsApp</TabsTrigger>
            <TabsTrigger value="mobile" className="text-white">Mobile</TabsTrigger>
            <TabsTrigger value="admin" className="text-white">Admin</TabsTrigger>
            <TabsTrigger value="core" className="text-white">Core</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-6">
            <div className="space-y-8">
              <CategoryTab components={coreComponents} title="Core Components" />
              <CategoryTab components={dashboardComponents} title="Dashboard Components" />
              <CategoryTab components={serviceComponents} title="Service Components" />
              <CategoryTab components={whatsappComponents} title="WhatsApp Components" />
              <CategoryTab components={mobileComponents} title="Mobile Components" />
              <CategoryTab components={adminComponents} title="Admin Components" />
            </div>
          </TabsContent>
          
          <TabsContent value="dashboards" className="mt-6">
            <CategoryTab components={dashboardComponents} title="Dashboard Components" />
          </TabsContent>
          
          <TabsContent value="services" className="mt-6">
            <CategoryTab components={serviceComponents} title="Service Components" />
          </TabsContent>
          
          <TabsContent value="whatsapp" className="mt-6">
            <CategoryTab components={whatsappComponents} title="WhatsApp Components" />
          </TabsContent>
          
          <TabsContent value="mobile" className="mt-6">
            <CategoryTab components={mobileComponents} title="Mobile Components" />
          </TabsContent>
          
          <TabsContent value="admin" className="mt-6">
            <CategoryTab components={adminComponents} title="Admin Components" />
          </TabsContent>
          
          <TabsContent value="core" className="mt-6">
            <CategoryTab components={coreComponents} title="Core Components" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );

  if (trigger) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto bg-[#1A1B3E] border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">System Version History</DialogTitle>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  return content;
};

export default VersionHistory;