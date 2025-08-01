import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Clock, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface TimezoneConfig {
  timezone: string;
  offset: number;
  displayName: string;
}

interface TimezoneSettingsResponse {
  current: TimezoneConfig;
  available: TimezoneConfig[];
}

export default function TimezoneSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTimezone, setSelectedTimezone] = useState<string>("");

  const { data: timezoneData, isLoading } = useQuery<TimezoneSettingsResponse>({
    queryKey: ["/api/timezone"],
    queryFn: async () => {
      const response = await fetch("/api/timezone");
      if (!response.ok) {
        throw new Error("Failed to fetch timezone settings");
      }
      return response.json();
    },
  });

  const updateTimezoneMutation = useMutation({
    mutationFn: async (newTimezone: TimezoneConfig) => {
      return apiRequest("/api/timezone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTimezone),
      });
    },
    onSuccess: () => {
      toast({
        title: "Timezone Updated",
        description: "System timezone has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/timezone"] });
      // Also refresh dashboard data to reflect timezone changes
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/yesterday-attendance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/activity"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update timezone",
        variant: "destructive",
      });
    },
  });

  const handleTimezoneChange = () => {
    if (!selectedTimezone || !timezoneData) return;

    const newTimezone = timezoneData.available.find(
      (tz) => tz.timezone === selectedTimezone
    );

    if (newTimezone) {
      updateTimezoneMutation.mutate(newTimezone);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Globe className="w-6 h-6" />
          <h1 className="text-2xl font-bold">Timezone Settings</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!timezoneData) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Globe className="w-6 h-6" />
          <h1 className="text-2xl font-bold">Timezone Settings</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">Failed to load timezone settings</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Globe className="w-6 h-6" />
        <h1 className="text-2xl font-bold">Timezone Settings</h1>
      </div>

      <div className="grid gap-6">
        {/* Current Timezone */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Current System Timezone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{timezoneData.current.timezone}</Badge>
                <span className="text-sm text-gray-600">
                  UTC{timezoneData.current.offset >= 0 ? "+" : ""}{timezoneData.current.offset}
                </span>
              </div>
              <p className="text-lg font-medium">{timezoneData.current.displayName}</p>
              <p className="text-sm text-gray-500">
                Current time: {new Date().toLocaleString("en-US", { timeZone: timezoneData.current.timezone })}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Change Timezone */}
        <Card>
          <CardHeader>
            <CardTitle>Change System Timezone</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label htmlFor="timezone-select" className="block text-sm font-medium mb-2">
                  Select New Timezone
                </label>
                <Select value={selectedTimezone} onValueChange={setSelectedTimezone}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a timezone..." />
                  </SelectTrigger>
                  <SelectContent>
                    {timezoneData.available.map((tz) => (
                      <SelectItem key={tz.timezone} value={tz.timezone}>
                        <div className="flex items-center gap-2">
                          <span>{tz.displayName}</span>
                          <Badge variant="secondary" className="text-xs">
                            UTC{tz.offset >= 0 ? "+" : ""}{tz.offset}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedTimezone && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Preview: {new Date().toLocaleString("en-US", { timeZone: selectedTimezone })}
                  </p>
                </div>
              )}

              <Button 
                onClick={handleTimezoneChange}
                disabled={!selectedTimezone || updateTimezoneMutation.isPending}
                className="w-full"
              >
                {updateTimezoneMutation.isPending ? "Updating..." : "Update Timezone"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Important Note */}
        <Card>
          <CardHeader>
            <CardTitle className="text-orange-600">Important Note</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Changing the system timezone will affect all timestamp displays throughout the application.
              All attendance records, reports, and analytics will be recalculated to display in the new timezone.
              This change is applied system-wide and affects all users.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}