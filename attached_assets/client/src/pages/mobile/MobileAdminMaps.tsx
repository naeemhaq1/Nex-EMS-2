import React, { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Wrapper } from '@googlemaps/react-wrapper';
import MobileAdminDualNavigation from '@/components/mobile/MobileAdminDualNavigation';
import { 
  Map, 
  MapPin, 
  Users, 
  Clock, 
  Filter,
  Search,
  X,
  Navigation,
  Target,
  Activity,
  Eye,
  EyeOff,
  RefreshCw,
  Settings,
  Layers,
  Zap,
  AlertCircle,
  Home
} from 'lucide-react';

interface EmployeeLocation {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  department: string;
  currentLocation: {
    latitude: number;
    longitude: number;
    address: string;
    accuracy: number;
    timestamp: string;
  };
  workLocation: {
    name: string;
    latitude: number;
    longitude: number;
    radius: number;
  };
  status: 'in_office' | 'remote' | 'field' | 'offline';
  lastSeen: string;
  punchStatus: 'in' | 'out' | 'none';
}

interface LocationZone {
  id: string;
  name: string;
  type: 'office' | 'client_site' | 'restricted';
  latitude: number;
  longitude: number;
  radius: number;
  employeeCount: number;
  color: string;
}

// Google Maps component
function GoogleMapComponent({ employees, zones, selectedEmployee, onEmployeeSelect, mapType }: {
  employees: EmployeeLocation[];
  zones: LocationZone[];
  selectedEmployee: string | null;
  onEmployeeSelect: (id: string) => void;
  mapType: 'satellite' | 'roadmap' | 'hybrid';
}) {
  const mapRef = React.useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);

  useEffect(() => {
    if (!mapRef.current) return;

    const mapInstance = new google.maps.Map(mapRef.current, {
      center: { lat: 31.5204, lng: 74.3587 }, // Lahore center
      zoom: 12,
      mapTypeId: mapType,
      styles: [
        {
          featureType: 'all',
          elementType: 'geometry.fill',
          stylers: [{ color: '#1a1b3e' }]
        },
        {
          featureType: 'all',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#ffffff' }]
        }
      ]
    });

    setMap(mapInstance);
  }, [mapType]);

  useEffect(() => {
    if (!map) return;

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));
    
    // Create new markers for employees
    const newMarkers = employees.map((employee) => {
      const marker = new google.maps.Marker({
        position: {
          lat: employee.currentLocation.latitude,
          lng: employee.currentLocation.longitude
        },
        map: map,
        title: `${employee.firstName} ${employee.lastName}`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: employee.status === 'in_office' ? '#10B981' : employee.status === 'remote' ? '#3B82F6' : '#F59E0B',
          fillOpacity: 1,
          strokeWeight: 2,
          strokeColor: '#ffffff'
        }
      });

      marker.addListener('click', () => {
        onEmployeeSelect(employee.id);
      });

      return marker;
    });

    setMarkers(newMarkers);
  }, [map, employees, onEmployeeSelect]);

  return <div ref={mapRef} className="w-full h-full rounded-lg" />;
}

export default function MobileAdminMaps() {
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showOfflineUsers, setShowOfflineUsers] = useState(false);
  const [mapView, setMapView] = useState<'satellite' | 'roadmap' | 'hybrid'>('roadmap');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch employee locations
  const { data: employeeLocations = [], isLoading } = useQuery<EmployeeLocation[]>({
    queryKey: ['/api/admin/employee-locations'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch location zones
  const { data: locationZones = [] } = useQuery<LocationZone[]>({
    queryKey: ['/api/admin/location-zones'],
    refetchInterval: 60000, // Refresh every minute
  });

  // Check if we have actual location data
  const hasLocationData = employeeLocations.length > 0;
  const hasZoneData = locationZones.length > 0;

  // Filter employees (only if we have data)
  const filteredEmployees = hasLocationData ? employeeLocations.filter(employee => {
    const matchesSearch = employee.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.employeeCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = selectedDepartment === 'all' || employee.department === selectedDepartment;
    const matchesStatus = selectedStatus === 'all' || employee.status === selectedStatus;
    const matchesOffline = showOfflineUsers || employee.status !== 'offline';
    
    return matchesSearch && matchesDepartment && matchesStatus && matchesOffline;
  }) : [];

  // Get unique departments (only if we have data)
  const departments = hasLocationData ? [...new Set(employeeLocations.map(emp => emp.department))] : [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_office': return 'bg-green-500';
      case 'remote': return 'bg-blue-500';
      case 'field': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case 'in_office': return 'text-green-400';
      case 'remote': return 'text-blue-400';
      case 'field': return 'text-yellow-400';
      case 'offline': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const getPunchStatusIcon = (status: string) => {
    switch (status) {
      case 'in': return <Target className="w-3 h-3 text-green-400" />;
      case 'out': return <Navigation className="w-3 h-3 text-red-400" />;
      case 'none': return <Clock className="w-3 h-3 text-gray-400" />;
      default: return <Clock className="w-3 h-3 text-gray-400" />;
    }
  };

  const selectedEmployeeData = selectedEmployee && hasLocationData ? employeeLocations.find(emp => emp.id === selectedEmployee) : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1A1B3E] flex items-center justify-center">
        <div className="text-center">
          <Map className="w-8 h-8 text-blue-500 animate-pulse mx-auto mb-4" />
          <p className="text-gray-400">Loading location data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1B3E] text-white overflow-hidden">
      {/* Compact Header */}
      <div className="bg-[#1A1B3E] p-2 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-[#2A2B5E] p-1.5 rounded-lg">
              <Map className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-white text-lg font-semibold">Live Location Map</h1>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="bg-[#2A2B5E] hover:bg-[#3A3B6E] p-1.5 rounded-lg transition-colors"
            >
              <Filter className="w-4 h-4 text-white" />
            </button>
            <button
              onClick={() => setShowOfflineUsers(!showOfflineUsers)}
              className={`p-1.5 rounded-lg transition-colors ${
                showOfflineUsers ? 'bg-blue-600 hover:bg-blue-700' : 'bg-[#2A2B5E] hover:bg-[#3A3B6E]'
              }`}
            >
              {showOfflineUsers ? (
                <Eye className="w-4 h-4 text-white" />
              ) : (
                <EyeOff className="w-4 h-4 text-white" />
              )}
            </button>
          </div>
        </div>


      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-[#2A2B5E] border-b border-gray-700 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-medium">Filters</h3>
            <button
              onClick={() => setShowFilters(false)}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Search Employees</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by name or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#1A1B3E] border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Department</label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full bg-[#1A1B3E] border border-gray-600 rounded-lg p-2 text-white text-sm"
                >
                  <option value="all">All Departments</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full bg-[#1A1B3E] border border-gray-600 rounded-lg p-2 text-white text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="in_office">In Office</option>
                  <option value="remote">Remote</option>
                  <option value="field">Field</option>
                  <option value="offline">Offline</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Maximized Map View */}
      <div className="flex-1 overflow-y-auto pb-20">
        <div className="p-4">
          {/* Map View */}
          <div className="bg-[#2A2B5E] rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-medium">Live Map View</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setMapView('roadmap')}
                  className={`px-3 py-1 rounded text-xs ${
                    mapView === 'roadmap' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300'
                  }`}
                >
                  Street
                </button>
                <button
                  onClick={() => setMapView('satellite')}
                  className={`px-3 py-1 rounded text-xs ${
                    mapView === 'satellite' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300'
                  }`}
                >
                  Satellite
                </button>
                <button
                  onClick={() => setMapView('hybrid')}
                  className={`px-3 py-1 rounded text-xs ${
                    mapView === 'hybrid' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300'
                  }`}
                >
                  Hybrid
                </button>
                <RefreshCw className="w-4 h-4 text-blue-400" />
              </div>
            </div>
            
            {/* Google Maps - Maximized */}
            <div className="bg-[#1A1B3E] rounded-lg h-[75vh] border border-gray-600 overflow-hidden">
              {!hasLocationData ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <AlertCircle className="w-16 h-16 text-gray-600 mx-auto" />
                    <div>
                      <p className="text-gray-400 text-lg font-medium mb-2">Location Data Unavailable</p>
                      <p className="text-gray-500 text-sm mb-4">
                        No employee location data found. Location tracking requires:
                      </p>
                      <div className="text-left bg-[#2A2B5E] rounded-lg p-3 text-xs space-y-2">
                        <p className="text-gray-300">• Mobile app GPS integration</p>
                        <p className="text-gray-300">• Location services API configuration</p>
                        <p className="text-gray-300">• Employee location permission grants</p>
                      </div>
                    </div>
                    <button
                      onClick={() => window.location.href = '/mobile/admin/employees'}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      View Employee Directory
                    </button>
                  </div>
                </div>
              ) : !import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <Map className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">Google Maps API key required</p>
                    <p className="text-gray-500 text-xs mt-1">
                      Configure VITE_GOOGLE_MAPS_API_KEY to enable map view
                    </p>
                  </div>
                </div>
              ) : (
                <Wrapper apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
                  <GoogleMapComponent
                    employees={filteredEmployees}
                    zones={locationZones}
                    selectedEmployee={selectedEmployee}
                    onEmployeeSelect={setSelectedEmployee}
                    mapType={mapView}
                  />
                </Wrapper>
              )}
            </div>
          </div>



          {/* Employee List - Only show if we have location data */}
          {hasLocationData && (
            <div className="bg-[#2A2B5E] rounded-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-medium">Active Employees ({filteredEmployees.length})</h3>
                <Users className="w-4 h-4 text-blue-400" />
              </div>
              {filteredEmployees.length > 0 ? (
                <div className="space-y-3">
                  {filteredEmployees.map((employee) => (
                    <div
                      key={employee.id}
                      className="flex items-center justify-between p-3 bg-[#1A1B3E] rounded-lg border border-gray-700 cursor-pointer hover:bg-[#2A2B5E] transition-colors"
                      onClick={() => setSelectedEmployee(employee.id)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                            {employee.firstName[0]}{employee.lastName[0]}
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-medium">{employee.firstName} {employee.lastName}</p>
                          <p className="text-gray-400 text-sm">{employee.employeeCode} • {employee.department}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center space-x-2 mb-1">
                          {getPunchStatusIcon(employee.punchStatus)}
                          <div className={`w-2 h-2 ${getStatusColor(employee.status)} rounded-full`}></div>
                        </div>
                        <p className="text-gray-400 text-xs">{employee.lastSeen}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-400">No employees match current filters</p>
                  <p className="text-gray-500 text-sm">Adjust filters to see more results</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Employee Details Modal */}
      {selectedEmployee && selectedEmployeeData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1A1B3E] rounded-3xl w-full max-w-md max-h-[85vh] overflow-hidden animate-slide-up">
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold">
                      {selectedEmployeeData.firstName[0]}{selectedEmployeeData.lastName[0]}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-lg">
                      {selectedEmployeeData.firstName} {selectedEmployeeData.lastName}
                    </h3>
                    <p className="text-gray-400 text-sm">
                      {selectedEmployeeData.employeeCode} • {selectedEmployeeData.department}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedEmployee(null)}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>
            
            <div className="p-4 space-y-4 overflow-y-auto">
              {/* Current Location */}
              <div className="space-y-3">
                <h4 className="text-white font-medium">Current Location</h4>
                <div className="bg-[#2A2B5E] rounded-lg p-3 space-y-2">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-blue-400" />
                    <span className="text-white text-sm">{selectedEmployeeData.currentLocation.address}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-gray-400">Coordinates</p>
                      <p className="text-white">
                        {selectedEmployeeData.currentLocation.latitude.toFixed(6)}, {selectedEmployeeData.currentLocation.longitude.toFixed(6)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">Accuracy</p>
                      <p className="text-white">{selectedEmployeeData.currentLocation.accuracy}m</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="space-y-3">
                <h4 className="text-white font-medium">Status</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#2A2B5E] rounded-lg p-3">
                    <p className="text-gray-400 text-sm">Location Status</p>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 ${getStatusColor(selectedEmployeeData.status)} rounded-full`}></div>
                      <span className={`text-sm font-medium ${getStatusTextColor(selectedEmployeeData.status)}`}>
                        {selectedEmployeeData.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  <div className="bg-[#2A2B5E] rounded-lg p-3">
                    <p className="text-gray-400 text-sm">Punch Status</p>
                    <div className="flex items-center space-x-2">
                      {getPunchStatusIcon(selectedEmployeeData.punchStatus)}
                      <span className="text-white text-sm font-medium">
                        {selectedEmployeeData.punchStatus === 'none' ? 'Not Punched' : `Punched ${selectedEmployeeData.punchStatus}`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Work Location */}
              <div className="space-y-3">
                <h4 className="text-white font-medium">Assigned Work Location</h4>
                <div className="bg-[#2A2B5E] rounded-lg p-3">
                  <p className="text-white text-sm font-medium">{selectedEmployeeData.workLocation.name}</p>
                  <p className="text-gray-400 text-xs">
                    {selectedEmployeeData.workLocation.latitude.toFixed(6)}, {selectedEmployeeData.workLocation.longitude.toFixed(6)}
                  </p>
                  <p className="text-gray-400 text-xs">Radius: {selectedEmployeeData.workLocation.radius}m</p>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <h4 className="text-white font-medium">Actions</h4>
                <div className="grid grid-cols-2 gap-3">
                  <button className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors">
                    <Navigation className="w-4 h-4" />
                    <span className="text-sm">Navigate</span>
                  </button>
                  <button className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors">
                    <Activity className="w-4 h-4" />
                    <span className="text-sm">Track</span>
                  </button>
                  <button className="flex items-center justify-center space-x-2 bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded-lg transition-colors">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">Alert</span>
                  </button>
                  <button className="flex items-center justify-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition-colors">
                    <Settings className="w-4 h-4" />
                    <span className="text-sm">Settings</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Mobile Admin Navigation */}
      <MobileAdminDualNavigation currentPage="maps" />
    </div>
  );
}