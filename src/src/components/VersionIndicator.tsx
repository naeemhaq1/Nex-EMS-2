import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  SYSTEM_VERSION,
  BUILD_NUMBER,
  RELEASE_DATE,
  getComponentVersion
} from '@shared/versioning';
import {
  Package,
  GitBranch,
  Calendar,
  Info
} from 'lucide-react';

interface VersionIndicatorProps {
  componentId?: string;
  showBuildNumber?: boolean;
  showReleaseDate?: boolean;
  compact?: boolean;
  onClick?: () => void;
  className?: string;
}

export const VersionIndicator: React.FC<VersionIndicatorProps> = ({
  componentId,
  showBuildNumber = false,
  showReleaseDate = false,
  compact = false,
  onClick,
  className = ''
}) => {
  const component = componentId ? getComponentVersion(componentId) : null;
  const version = component?.version || SYSTEM_VERSION;
  const lastUpdated = component?.lastUpdated || RELEASE_DATE;

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClick}
              className={`h-auto p-1 text-xs text-gray-400 hover:text-white ${className}`}
            >
              <Package className="w-3 h-3 mr-1" />
              v{version}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs">
              <div className="font-medium">
                {component?.name || 'NEXLINX System'} v{version}
              </div>
              <div className="text-gray-300">
                Build: {BUILD_NUMBER}
              </div>
              <div className="text-gray-300">
                Updated: {lastUpdated.toLocaleDateString()}
              </div>
              {onClick && (
                <div className="text-blue-400 mt-1">
                  Click for version history
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Badge 
        variant="outline" 
        className="text-gray-300 border-gray-500 cursor-pointer hover:border-gray-400"
        onClick={onClick}
      >
        <Package className="w-3 h-3 mr-1" />
        {component?.name ? `${component.name} v${version}` : `NEXLINX v${version}`}
      </Badge>
      
      {showBuildNumber && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="text-gray-400 border-gray-600">
                <GitBranch className="w-3 h-3 mr-1" />
                {BUILD_NUMBER}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs">Build Number</div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      
      {showReleaseDate && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="text-gray-400 border-gray-600">
                <Calendar className="w-3 h-3 mr-1" />
                {lastUpdated.toLocaleDateString()}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs">Last Updated</div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      
      {onClick && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClick}
                className="h-auto p-1 text-gray-400 hover:text-white"
              >
                <Info className="w-3 h-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs">View version history</div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
};

// Specialized version indicators for different contexts
export const NavbarVersionIndicator: React.FC<{ onClick?: () => void }> = ({ onClick }) => (
  <VersionIndicator
    compact
    onClick={onClick}
    className="ml-2"
  />
);

export const SidebarVersionIndicator: React.FC<{ onClick?: () => void }> = ({ onClick }) => (
  <VersionIndicator
    showBuildNumber
    showReleaseDate
    onClick={onClick}
    className="w-full justify-start"
  />
);

export const ComponentVersionIndicator: React.FC<{ 
  componentId: string; 
  onClick?: () => void;
  compact?: boolean;
}> = ({ componentId, onClick, compact = false }) => (
  <VersionIndicator
    componentId={componentId}
    compact={compact}
    onClick={onClick}
  />
);

export default VersionIndicator;