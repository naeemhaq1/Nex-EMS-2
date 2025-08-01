import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  MapPin, 
  Search, 
  Filter, 
  Users, 
  Clock, 
  Navigation, 
  Activity,
  Target,
  RefreshCw,
  Layers,
  Eye,
  EyeOff,
  AlertCircle,
  Building2,
  Car,
  Timer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  speed: number; // km/h
  locationSince: string;
  employeeStatus: string; // Custom status set by employee
  lastSeen: string;
}

declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

export default function MapLocate() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [markers, setMarkers] = useState<any[]>([]);
  const [infoWindow, setInfoWindow] = useState<any>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showOfflineUsers, setShowOfflineUsers] = useState(true);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid'>('roadmap');

  // Fetch employee locations
  const { data: locations = [], isLoading, refetch } = useQuery<EmployeeLocation[]>({
    queryKey: ['/api/admin/employee-locations'],
    refetchInterval: 30000, // Refresh every 30 seconds
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

  // Initialize Google Maps
  useEffect(() => {
    const initializeMap = () => {
      if (!window.google) {
        setMapError('Google Maps API not available. Please configure VITE_GOOGLE_MAPS_API_KEY.');
        return;
      }

      try {
        if (!mapRef.current) return;

        const mapInstance = new window.google.maps.Map(mapRef.current, {
          center: { lat: 31.5204, lng: 74.3587 }, // Lahore, Pakistan
          zoom: 12,
          mapTypeId: mapType,
          styles: [
            {
              featureType: 'all',
              stylers: [{ saturation: -20 }]
            }
          ],
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
          zoomControl: true
        });

        // Create info window
        const infoWindowInstance = new window.google.maps.InfoWindow();
        setInfoWindow(infoWindowInstance);

        setMap(mapInstance);
        setIsMapLoaded(true);
        setMapError(null);
      } catch (error) {
        console.error('Map initialization error:', error);
        setMapError('Failed to initialize map. Please check Google Maps configuration.');
      }
    };

    // Load Google Maps script if not already loaded
    if (!window.google) {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        setMapError('Google Maps API key not configured. Please set VITE_GOOGLE_MAPS_API_KEY.');
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
      script.async = true;
      script.defer = true;
      script.onload = initializeMap;
      script.onerror = () => setMapError('Failed to load Google Maps API.');
      document.head.appendChild(script);
    } else {
      initializeMap();
    }
  }, [mapType]);

  // Update map type
  useEffect(() => {
    if (map && window.google) {
      map.setMapTypeId(mapType);
    }
  }, [map, mapType]);

  // Update markers when locations change
  useEffect(() => {
    if (!map || !window.google || !infoWindow) return;

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));
    setMarkers([]);

    if (filteredLocations.length === 0) return;

    const newMarkers: any[] = [];
    const bounds = new window.google.maps.LatLngBounds();

    filteredLocations.forEach((location) => {
      const position = { 
        lat: location.currentLocation.latitude, 
        lng: location.currentLocation.longitude 
      };
      
      // Create custom icon based on status and shift
      const getMarkerIcon = () => {
        let fillColor = '#6B7280'; // gray default
        if (location.status === 'online' && location.shiftStatus === 'on_shift') fillColor = '#10B981'; // green
        else if (location.status === 'online' && location.shiftStatus === 'off_shift') fillColor = '#3B82F6'; // blue
        else if (location.status === 'busy') fillColor = '#F59E0B'; // amber
        else if (location.status === 'away') fillColor = '#EF4444'; // red

        return {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: fillColor,
          fillOpacity: 0.9,
          strokeColor: '#FFFFFF',
          strokeWeight: 2
        };
      };

      const marker = new window.google.maps.Marker({
        position,
        map,
        icon: getMarkerIcon(),
        title: `${location.firstName} ${location.lastName}`,
        animation: location.status === 'online' ? window.google.maps.Animation.DROP : null
      });

      // Create info window content
      const infoContent = `
        <div style="font-family: system-ui; max-width: 300px; padding: 8px;">
          <div style="display: flex; align-items: center; margin-bottom: 12px;">
            <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(45deg, #3B82F6, #8B5CF6); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; margin-right: 12px;">
              ${location.firstName[0]}${location.lastName[0]}
            </div>
            <div>
              <div style="font-weight: 600; font-size: 16px; color: #1F2937;">
                ${location.firstName} ${location.lastName}
              </div>
              <div style="font-size: 12px; color: #6B7280;">
                ${location.employeeCode} • ${location.designation}
              </div>
            </div>
          </div>
          
          <div style="border-top: 1px solid #E5E7EB; padding-top: 8px; space-y: 4px;">
            <div style="display: flex; align-items: center; margin-bottom: 4px;">
              <span style="color: #6B7280; font-size: 12px; margin-right: 8px;">📍</span>
              <span style="font-size: 13px; color: #374151;">${location.currentLocation.address}</span>
            </div>
            
            <div style="display: flex; align-items: center; margin-bottom: 4px;">
              <span style="color: #6B7280; font-size: 12px; margin-right: 8px;">🏢</span>
              <span style="font-size: 13px; color: #374151;">${location.department}</span>
            </div>
            
            <div style="display: flex; align-items: center; margin-bottom: 4px;">
              <span style="color: #6B7280; font-size: 12px; margin-right: 8px;">🚗</span>
              <span style="font-size: 13px; color: #374151;">Speed: ${location.speed} km/h</span>
            </div>
            
            <div style="display: flex; align-items: center; margin-bottom: 4px;">
              <span style="color: #6B7280; font-size: 12px; margin-right: 8px;">⏰</span>
              <span style="font-size: 13px; color: #374151;">Location since: ${new Date(location.locationSince).toLocaleTimeString()}</span>
            </div>
            
            <div style="display: flex; align-items: center; margin-bottom: 4px;">
              <span style="color: #6B7280; font-size: 12px; margin-right: 8px;">💭</span>
              <span style="font-size: 13px; color: #374151;">Status: ${location.employeeStatus}</span>
            </div>
            
            <div style="display: flex; justify-content: space-between; margin-top: 8px; padding-top: 8px; border-top: 1px solid #E5E7EB;">
              <div style="display: flex; align-items: center;">
                <div style="width: 8px; height: 8px; border-radius: 50%; background-color: ${location.status === 'online' ? '#10B981' : '#EF4444'}; margin-right: 6px;"></div>
                <span style="font-size: 12px; color: #6B7280; text-transform: capitalize;">${location.status}</span>
              </div>
              <div style="display: flex; align-items: center;">
                <div style="width: 8px; height: 8px; border-radius: 50%; background-color: ${location.shiftStatus === 'on_shift' ? '#10B981' : '#6B7280'}; margin-right: 6px;"></div>
                <span style="font-size: 12px; color: #6B7280;">${location.shiftStatus === 'on_shift' ? 'On Shift' : 'Off Shift'}</span>
              </div>
            </div>
          </div>
        </div>
      `;

      marker.addListener('click', () => {
        infoWindow.setContent(infoContent);
        infoWindow.open(map, marker);
      });

      newMarkers.push(marker);
      bounds.extend(position);
    });

    setMarkers(newMarkers);

    // Fit map to show all markers
    if (newMarkers.length > 0) {
      map.fitBounds(bounds);
      if (newMarkers.length === 1) {
        map.setZoom(15); // Zoom in more for single marker
      }
    }
  }, [map, filteredLocations, infoWindow]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-500';
      case 'busy': return 'text-yellow-500';
      case 'away': return 'text-red-500';
      case 'offline': return 'text-gray-500';
      default: return 'text-gray-500';
    }
  };

  const getShiftColor = (shiftStatus: string) => {
    return shiftStatus === 'on_shift' ? 'text-green-500' : 'text-gray-500';
  };

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
              <MapPin className="w-6 h-6 text-white" />
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

      {/* Map Container - Maximized */}
      <div className="bg-[#2A2B5E] rounded-lg border border-gray-700 overflow-hidden" style={{ height: 'calc(100vh - 400px)', minHeight: '600px' }}>
        {mapError ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-4">
              <AlertCircle className="w-16 h-16 text-gray-600 mx-auto" />
              <div>
                <p className="text-gray-400 text-lg font-medium mb-2">Map Unavailable</p>
                <p className="text-gray-500 text-sm mb-4">{mapError}</p>
                <div className="text-left bg-[#1A1B3E] rounded-lg p-3 text-xs space-y-2">
                  <p className="text-gray-300">• Configure Google Maps API key</p>
                  <p className="text-gray-300">• Enable location tracking services</p>
                  <p className="text-gray-300">• Verify API permissions</p>
                </div>
              </div>
            </div>
          </div>
        ) : filteredLocations.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-4">
              <MapPin className="w-16 h-16 text-gray-600 mx-auto" />
              <div>
                <p className="text-gray-400 text-lg font-medium mb-2">No Employee Locations</p>
                <p className="text-gray-500 text-sm mb-4">
                  No employee location data available. Location tracking requires mobile app GPS integration.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div ref={mapRef} className="w-full h-full" />
        )}
      </div>
    </div>
  );
}