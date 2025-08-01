import { useState } from 'react';
import { googleMapsService } from '@/services/googleMapsService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export default function GoogleMapsTest() {
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [location, setLocation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testGoogleMaps = async () => {
    setStatus('testing');
    setError(null);
    setLocation(null);
    setLogs([]);
    
    addLog('Starting Google Maps API test...');

    try {
      // Check if API key is available
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        throw new Error('Google Maps API key not found in environment');
      }
      
      addLog('✅ Google Maps API key found');
      addLog('🌍 Requesting location permission...');

      // Test location service
      const locationInfo = await googleMapsService.getCurrentLocationWithAddress();
      
      addLog('✅ Location obtained successfully');
      addLog(`📍 Coordinates: ${locationInfo.coordinates.latitude}, ${locationInfo.coordinates.longitude}`);
      addLog(`📍 Accuracy: ${locationInfo.coordinates.accuracy}m`);
      addLog(`🏠 Address: ${locationInfo.address.formatted}`);
      
      setLocation(locationInfo);
      setStatus('success');
      addLog('🎉 Google Maps API test completed successfully!');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setStatus('error');
      addLog(`❌ Error: ${errorMessage}`);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'testing':
        return <AlertTriangle className="w-5 h-5 text-yellow-500 animate-pulse" />;
      default:
        return <MapPin className="w-5 h-5 text-blue-500" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'error':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'testing':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Card className="bg-[#2A2B5E] border-purple-500/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-white">
            {getStatusIcon()}
            <span>Google Maps API Test</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-300">API Status:</span>
            <Badge className={getStatusColor()}>
              {status === 'idle' ? 'Ready' : status === 'testing' ? 'Testing...' : status}
            </Badge>
          </div>

          <Button
            onClick={testGoogleMaps}
            disabled={status === 'testing'}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          >
            {status === 'testing' ? 'Testing Google Maps API...' : 'Test Google Maps API'}
          </Button>

          {error && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
              <h3 className="font-semibold text-red-400 mb-2">Error Details</h3>
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {location && (
            <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
              <h3 className="font-semibold text-green-400 mb-3">Location Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Coordinates:</span>
                  <div className="text-white font-mono">
                    {location.coordinates.latitude.toFixed(6)}, {location.coordinates.longitude.toFixed(6)}
                  </div>
                </div>
                <div>
                  <span className="text-gray-400">Accuracy:</span>
                  <div className="text-white">{location.coordinates.accuracy}m</div>
                </div>
                <div className="md:col-span-2">
                  <span className="text-gray-400">Address:</span>
                  <div className="text-white mt-1">{location.address.formatted}</div>
                </div>
                <div>
                  <span className="text-gray-400">City:</span>
                  <div className="text-white">{location.address.city || 'N/A'}</div>
                </div>
                <div>
                  <span className="text-gray-400">State:</span>
                  <div className="text-white">{location.address.state || 'N/A'}</div>
                </div>
                <div>
                  <span className="text-gray-400">Country:</span>
                  <div className="text-white">{location.address.country || 'N/A'}</div>
                </div>
                <div>
                  <span className="text-gray-400">Location Type:</span>
                  <div className="text-white">{location.locationType}</div>
                </div>
              </div>
            </div>
          )}

          {logs.length > 0 && (
            <div className="bg-[#1A1B3E] border border-purple-500/20 rounded-lg p-4">
              <h3 className="font-semibold text-purple-400 mb-3">Test Logs</h3>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {logs.map((log, index) => (
                  <div key={index} className="text-sm text-gray-300 font-mono">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}