import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Info, Clock, Activity, Shield, Star } from "lucide-react";

interface VersionInfo {
  version: string;
  name: string;
  codename: string;
  releaseDate: string;
  buildNumber: string;
  environment: string;
  features: string[];
  changelog: Array<{
    version: string;
    date: string;
    changes: string[];
  }>;
}

interface HealthInfo {
  status: string;
  version: string;
  name: string;
  uptime: number;
  uptimeFormatted: string;
  memory: {
    used: number;
    total: number;
  };
  timestamp: string;
}

export function VersionDisplay() {
  const { data: versionInfo } = useQuery<{ success: boolean; data: VersionInfo }>({
    queryKey: ['/api/version'],
    refetchInterval: 30000,
  });

  const { data: healthInfo } = useQuery<{ success: boolean; data: HealthInfo }>({
    queryKey: ['/api/health'],
    refetchInterval: 30000,
  });

  if (!versionInfo?.data || !healthInfo?.data) {
    return (
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            System Information
          </CardTitle>
          <CardDescription>Loading version and health information...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const version = versionInfo.data;
  const health = healthInfo.data;

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-600" />
            {version.name}
          </div>
          <Badge variant="outline" className="text-sm">
            v{version.version}
          </Badge>
        </CardTitle>
        <CardDescription>
          {version.codename} • Build {version.buildNumber} • {version.environment}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* System Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">System Status</span>
            </div>
            <Badge variant="outline" className="text-green-600 border-green-600">
              {health.status}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Uptime: {health.uptimeFormatted}</span>
            </div>
            <span>Memory: {health.memory.used}MB / {health.memory.total}MB</span>
          </div>
        </div>

        <Separator />

        {/* Release Information */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Release Information</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Version:</span>
              <span className="ml-2 font-mono">{version.version}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Release Date:</span>
              <span className="ml-2">{new Date(version.releaseDate).toLocaleDateString()}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Build:</span>
              <span className="ml-2 font-mono">{version.buildNumber}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Environment:</span>
              <span className="ml-2 capitalize">{version.environment}</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Feature List */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Star className="h-4 w-4" />
            Key Features
          </h4>
          <div className="flex flex-wrap gap-2">
            {version.features.map((feature, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {feature}
              </Badge>
            ))}
          </div>
        </div>

        {/* Latest Changelog */}
        {version.changelog && version.changelog.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Recent Changes</h4>
              <div className="space-y-3">
                {version.changelog.slice(0, 2).map((release, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        v{release.version}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(release.date).toLocaleDateString()}
                      </span>
                    </div>
                    <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                      {release.changes.slice(0, 3).map((change, changeIndex) => (
                        <li key={changeIndex} className="flex items-start gap-2">
                          <span className="text-purple-600 mt-1">•</span>
                          <span>{change}</span>
                        </li>
                      ))}
                      {release.changes.length > 3 && (
                        <li className="text-xs text-muted-foreground italic">
                          ...and {release.changes.length - 3} more changes
                        </li>
                      )}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground text-center">
            Last updated: {new Date(health.timestamp).toLocaleString()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function CompactVersionDisplay() {
  const { data: versionInfo } = useQuery<{ success: boolean; data: VersionInfo }>({
    queryKey: ['/api/version'],
    refetchInterval: 60000,
  });

  if (!versionInfo?.data) {
    return (
      <Badge variant="outline" className="text-xs">
        Loading...
      </Badge>
    );
  }

  const version = versionInfo.data;

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Badge variant="outline" className="text-xs">
        {version.name} v{version.version}
      </Badge>
      <span>•</span>
      <span>{version.codename}</span>
    </div>
  );
}