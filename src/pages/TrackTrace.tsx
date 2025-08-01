import React, { useState, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  MapPin, 
  Search, 
  Users, 
  Clock, 
  Navigation, 
  Activity,
  RefreshCw,
  Eye,
  EyeOff,
  AlertCircle,
  AlertTriangle,
  Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import GoogleMap from '@/components/GoogleMap';

interface EmployeeLocation {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  department: string;
  designation: string;
  currentLocation: {
    latitude: number;
    longitude: number;
    address: string;
    accuracy: number;
    timestamp: string;
  };
  status: 'online' | 'offline' | 'busy' | 'away';
  shiftStatus: 'on_shift' | 'off_shift' | 'break';
  speed: number;
  locationSince: string;
  employeeStatus: string;
  lastSeen: string;
}

export default function TrackTrace() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showOfflineUsers, setShowOfflineUsers] = useState(true);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid'>('roadmap');

  // Fetch employee locations
  const { data: locations = [], isLoading, refetch } = useQuery<EmployeeLocation[]>({
    queryKey: ['/api/admin/employee-locations'],
    refetchInterval: 30000,
  });

  // Get unique departments for filter
  const departments = Array.from(new Set(locations.map(loc => loc.department))).sort();

  // Filter locations based on search and filters
  const filteredLocations = locations.filter(location => {
    const matchesSearch = searchTerm === '' || 
      location.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      location.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      location.employeeCode.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = selectedDepartment === 'all' || location.department === selectedDepartment;
    const matchesStatus = selectedStatus === 'all' || location.status === selectedStatus;
    const matchesOfflineFilter = showOfflineUsers || location.status !== 'offline';

    return matchesSearch && matchesDepartment && matchesStatus && matchesOfflineFilter;
  });

  // Handle map ready callback
  const handleMapReady = useCallback((map: any) => {
    setMapInstance(map);
    console.log('Track & Trace map ready');
    
    // Add markers for filtered locations
    filteredLocations.forEach((location) => {
      if (location.currentLocation) {
        new window.google.maps.Marker({
          position: {
            lat: location.currentLocation.latitude,
            lng: location.currentLocation.longitude
          },
          map: map,
          title: `${location.firstName} ${location.lastName}`,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="24" height="24" viewBox="0 0 24 24" fill="${location.status === 'online' ? '#10B981' : '#6B7280'}" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
            `),
            scaledSize: new window.google.maps.Size(24, 24)
          }
        });
      }
    });
  }, [filteredLocations]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1A1B3E] flex items-center justify-center">
        <div className="text-center">
          <MapPin className="w-8 h-8 text-blue-500 animate-pulse mx-auto mb-4" />
          <p className="text-gray-400">Loading employee locations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1B3E] text-white p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="bg-[#2A2B5E] p-3 rounded-lg">
              <Navigation className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Track & Trace</h1>
              <p className="text-gray-400">Monitor employee locations and workforce distribution</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => refetch()}
              variant="outline"
              size="sm"
              className="border-gray-600 hover:bg-[#2A2B5E]"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-[#2A2B5E] border-gray-600 text-white placeholder-gray-400"
            />
          </div>

          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="bg-[#2A2B5E] border-gray-600 text-white">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="bg-[#2A2B5E] border-gray-600 text-white">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="busy">Busy</SelectItem>
              <SelectItem value="away">Away</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
            </SelectContent>
          </Select>

          <Select value={mapType} onValueChange={(value: 'roadmap' | 'satellite' | 'hybrid') => setMapType(value)}>
            <SelectTrigger className="bg-[#2A2B5E] border-gray-600 text-white">
              <SelectValue placeholder="Map Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="roadmap">Street</SelectItem>
              <SelectItem value="satellite">Satellite</SelectItem>
              <SelectItem value="hybrid">Hybrid</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={() => setShowOfflineUsers(!showOfflineUsers)}
            variant="outline"
            size="sm"
            className={`border-gray-600 ${showOfflineUsers ? 'bg-blue-600 hover:bg-blue-700' : 'hover:bg-[#2A2B5E]'}`}
          >
            {showOfflineUsers ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
            Offline Users
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#2A2B5E] rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Locations</p>
                <p className="text-xl font-semibold">{filteredLocations.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          
          <div className="bg-[#2A2B5E] rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Online</p>
                <p className="text-xl font-semibold text-green-400">
                  {filteredLocations.filter(l => l.status === 'online').length}
                </p>
              </div>
              <Activity className="w-8 h-8 text-green-400" />
            </div>
          </div>
          
          <div className="bg-[#2A2B5E] rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">On Shift</p>
                <p className="text-xl font-semibold text-blue-400">
                  {filteredLocations.filter(l => l.shiftStatus === 'on_shift').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          
          <div className="bg-[#2A2B5E] rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Departments</p>
                <p className="text-xl font-semibold text-purple-400">{departments.length}</p>
              </div>
              <Building2 className="w-8 h-8 text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Google Maps */}
      <div className="bg-[#2A2B5E] rounded-lg border border-gray-700 overflow-hidden" style={{ height: 'calc(100vh - 400px)', minHeight: '600px' }}>
        <GoogleMap
          center={{ lat: 31.5204, lng: 74.3587 }} // Lahore, Pakistan
          zoom={12}
          className="w-full h-full"
          onMapReady={handleMapReady}
        />
        
        {/* Map Controls Overlay */}
        <div className="absolute top-4 left-4 bg-[#1A1B3E]/90 rounded-lg p-3 backdrop-blur-sm">
          <div className="flex items-center space-x-2 text-sm">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-gray-300">Live Tracking Active</span>
          </div>
        </div>

        <div className="absolute top-4 right-4 bg-[#1A1B3E]/90 rounded-lg p-3 backdrop-blur-sm">
          <div className="text-sm text-gray-300">
            Lahore HQ: 31.5204°N, 74.3587°E
          </div>
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-[#1A1B3E]/90 rounded-lg p-3 backdrop-blur-sm">
          <div className="space-y-2 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-gray-300">Online Employee</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
              <span className="text-gray-300">Offline Employee</span>
            </div>
          </div>
        </div>

        {/* No locations overlay */}
        {filteredLocations.length === 0 && (
          <div className="absolute top-16 left-4 right-4 bg-[#1A1B3E] border border-gray-600 rounded-lg p-3 z-20">
            <div className="flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-sm font-medium text-white">No Active Employee Locations</p>
                <p className="text-xs text-gray-400">Location tracking requires mobile app GPS integration</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}