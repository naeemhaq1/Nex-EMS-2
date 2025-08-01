import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import MobileAdminDualNavigation from '@/components/mobile/MobileAdminDualNavigation';
import { 
  MapPin, 
  Users, 
  Filter, 
  ArrowLeft,
  UserCheck,
  UserX,
  Clock,
  Smartphone,
  Wifi,
  WifiOff,
  Navigation2
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmployeeLocation {
  id: string;
  name: string;
  employeeCode: string;
  department: string;
  designation: string;
  latitude: number;
  longitude: number;
  lastUpdate: string;
  status: 'online' | 'offline';
  accuracy: number;
  batteryLevel?: number;
}

declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

export default function MobileAdminMap() {
  const [, navigate] = useLocation();
  const [map, setMap] = useState<any>(null);
  const [markers, setMarkers] = useState<any[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'online' | 'offline'>('all');
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Fetch employee locations
  const { data: locations, isLoading } = useQuery<EmployeeLocation[]>({
    queryKey: ['/api/admin/employee-locations'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const handleBack = () => {
    navigate('/mobile/admin/dashboard');
  };

  // Initialize Google Maps
  useEffect(() => {
    const initializeMap = () => {
      console.log('Attempting to initialize map...');
      
      if (!window.google?.maps?.Map) {
        console.log('Google Maps API not fully loaded yet');
        setMapError('Google Maps API not fully loaded. Please wait...');
        return;
      }

      try {
        const mapElement = document.getElementById('employee-map');
        if (!mapElement) {
          console.log('Map element not found');
          return;
        }

        console.log('Creating map instance...');
        const mapInstance = new window.google.maps.Map(mapElement, {
          center: { lat: 31.5204, lng: 74.3587 }, // Lahore, Pakistan
          zoom: 12,
          styles: [
            {
              featureType: 'all',
              stylers: [{ saturation: -80 }]
            },
            {
              featureType: 'road.arterial',
              elementType: 'geometry',
              stylers: [{ hue: '#00ffee' }, { saturation: 50 }]
            }
          ]
        });

        console.log('Map created successfully');
        setMap(mapInstance);
        setIsMapLoaded(true);
        setMapError(null);
      } catch (error) {
        console.error('Map initialization error:', error);
        setMapError(`Failed to initialize map: ${error.message}`);
      }
    };

    const loadGoogleMaps = () => {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      console.log('Google Maps API key available:', !!apiKey);
      
      if (!apiKey) {
        setMapError('Google Maps API key not configured. Please set VITE_GOOGLE_MAPS_API_KEY.');
        return;
      }

      // Check if script already exists
      const existingScript = document.querySelector(`script[src*="maps.googleapis.com"]`);
      if (existingScript) {
        console.log('Google Maps script already exists, waiting for load...');
        // Wait a bit more for the API to be fully loaded
        setTimeout(() => {
          if (window.google?.maps?.Map) {
            initializeMap();
          } else {
            setMapError('Google Maps API failed to load completely.');
          }
        }, 2000);
        return;
      }

      console.log('Loading Google Maps script...');
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        console.log('Google Maps script loaded, initializing...');
        // Add a small delay to ensure the API is fully ready
        setTimeout(initializeMap, 1000);
      };
      script.onerror = (error) => {
        console.error('Failed to load Google Maps script:', error);
        setMapError('Failed to load Google Maps API. Please check your internet connection.');
      };
      document.head.appendChild(script);
    };

    // Check if Google Maps is already available
    if (window.google?.maps?.Map) {
      console.log('Google Maps already available');
      initializeMap();
    } else {
      loadGoogleMaps();
    }
  }, []);

  // Update markers when locations change
  useEffect(() => {
    if (!map || !locations || !window.google) return;

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));
    setMarkers([]);

    const newMarkers: any[] = [];
    const bounds = new window.google.maps.LatLngBounds();

    locations
      .filter(location => selectedStatus === 'all' || location.status === selectedStatus)
      .forEach((location) => {
        const position = { lat: location.latitude, lng: location.longitude };
        
        // Create custom icon based on status
        const icon = {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: location.status === 'online' ? '#10B981' : '#EF4444',
          fillOpacity: 0.8,
          strokeColor: '#FFFFFF',
          strokeWeight: 2
        };

        const marker = new window.google.maps.Marker({
          position,
          map,
          icon,
          title: `${location.name} (${location.employeeCode})`
        });

        // Create info window
        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="color: #1f2937; font-family: system-ui; padding: 8px; min-width: 200px;">
              <div style="display: flex; align-items: center; margin-bottom: 8px;">
                <div style="width: 12px; height: 12px; border-radius: 50%; background-color: ${location.status === 'online' ? '#10B981' : '#EF4444'}; margin-right: 8px;"></div>
                <strong style="font-size: 14px;">${location.name}</strong>
              </div>
              <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">
                ID: ${location.employeeCode} • ${location.department}
              </div>
              <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">
                ${location.designation}
              </div>
              <div style="font-size: 11px; color: #9ca3af;">
                Last update: ${new Date(location.lastUpdate).toLocaleString()}
              </div>
              <div style="font-size: 11px; color: #9ca3af;">
                Accuracy: ${location.accuracy}m
              </div>
              ${location.batteryLevel ? `<div style="font-size: 11px; color: #9ca3af;">Battery: ${location.batteryLevel}%</div>` : ''}
            </div>
          `
        });

        marker.addListener('click', () => {
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
        map.setZoom(15);
      }
    }
  }, [map, locations, selectedStatus]);

  const filteredLocations = locations?.filter(location => 
    selectedStatus === 'all' || location.status === selectedStatus
  ) || [];

  const onlineCount = locations?.filter(l => l.status === 'online').length || 0;
  const offlineCount = locations?.filter(l => l.status === 'offline').length || 0;

  if (isLoading) {
    return (
      <div className="h-screen bg-[#1A1B3E] flex items-center justify-center">
        <div className="text-center">
          <MapPin className="w-8 h-8 text-blue-500 animate-pulse mx-auto mb-4" />
          <p className="text-gray-400">Loading employee locations...</p>
        </div>
      </div>
    );
  }

  if (mapError) {
    return (
      <div className="h-screen bg-[#1A1B3E] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#2A2B5E] border-b border-gray-700 p-4 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="text-gray-400 hover:text-white p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center">
                <MapPin className="w-6 h-6 mr-2 text-red-400" />
                Employee Map
              </h1>
              <p className="text-gray-400 text-sm">Location tracking unavailable</p>
            </div>
          </div>
        </div>

        {/* Error Content */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center bg-[#2A2B5E] rounded-lg p-6 max-w-sm">
            <WifiOff className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-white font-medium mb-2">Map Unavailable</h3>
            <p className="text-gray-400 text-sm mb-4">{mapError}</p>
            <Button
              onClick={() => navigate('/mobile/admin/employees')}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Users className="w-4 h-4 mr-2" />
              View Employee Directory
            </Button>
          </div>
        </div>

        {/* Bottom Navigation */}
        <MobileAdminDualNavigation currentPage="map" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#1A1B3E] flex flex-col overflow-hidden">
      {/* Compact Header */}
      <div className="bg-[#2A2B5E] border-b border-gray-700 p-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="text-gray-400 hover:text-white p-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-white flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-blue-400" />
                Employee Map
              </h1>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-1.5 rounded-lg transition-colors ${showFilters ? 'bg-blue-500' : 'bg-gray-600 hover:bg-gray-500'}`}
            >
              <Filter className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-2 bg-[#1A1B3E] rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <span className="text-white text-sm font-medium">Status:</span>
              <div className="flex space-x-2">
                {['all', 'online', 'offline'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setSelectedStatus(status as any)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      selectedStatus === status
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                    }`}
                  >
                    {status === 'all' ? 'All' : status === 'online' ? 'Online' : 'Offline'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="bg-[#1A1B3E] px-4 py-2 border-b border-gray-700 flex-shrink-0">
        <div className="flex justify-around">
          <div className="text-center">
            <div className="flex items-center justify-center text-green-400">
              <Wifi className="w-4 h-4 mr-1" />
              <span className="text-sm font-bold">{onlineCount}</span>
            </div>
            <p className="text-xs text-gray-400">Online</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center text-red-400">
              <WifiOff className="w-4 h-4 mr-1" />
              <span className="text-sm font-bold">{offlineCount}</span>
            </div>
            <p className="text-xs text-gray-400">Offline</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center text-blue-400">
              <Users className="w-4 h-4 mr-1" />
              <span className="text-sm font-bold">{filteredLocations.length}</span>
            </div>
            <p className="text-xs text-gray-400">Showing</p>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        <div id="employee-map" className="w-full h-full" />
        
        {!isMapLoaded && !mapError && (
          <div className="absolute inset-0 bg-[#1A1B3E] flex items-center justify-center">
            <div className="text-center">
              <Navigation2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Initializing map...</p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <MobileAdminDualNavigation currentPage="map" />
    </div>
  );
}