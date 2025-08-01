import { useState } from 'react';
import { googleMapsService } from '@/services/googleMapsService';

export default function GoogleMapsTest() {
  const [status, setStatus] = useState<string>('Ready to test');
  const [location, setLocation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const testGoogleMaps = async () => {
    setLoading(true);
    setError(null);
    setStatus('Testing Google Maps API...');

    try {
      // Test Google Maps service
      const locationInfo = await googleMapsService.getCurrentLocationWithAddress();
      setLocation(locationInfo);
      setStatus('✅ Google Maps API working successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStatus('❌ Google Maps API failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#1A1B3E] min-h-screen text-white p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Google Maps API Test</h1>
        
        <div className="space-y-4">
          <div className="bg-[#2A2B5E] rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-2">Status</h2>
            <p className="text-gray-300">{status}</p>
          </div>

          <button
            onClick={testGoogleMaps}
            disabled={loading}
            className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors"
          >
            {loading ? 'Testing...' : 'Test Google Maps API'}
          </button>

          {error && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
              <h3 className="font-semibold text-red-400 mb-2">Error</h3>
              <p className="text-red-300">{error}</p>
            </div>
          )}

          {location && (
            <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
              <h3 className="font-semibold text-green-400 mb-2">Location Data</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-400">Coordinates:</span>
                  <span className="ml-2 text-white">
                    {location.coordinates.latitude.toFixed(6)}, {location.coordinates.longitude.toFixed(6)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Accuracy:</span>
                  <span className="ml-2 text-white">{location.coordinates.accuracy}m</span>
                </div>
                <div>
                  <span className="text-gray-400">Address:</span>
                  <span className="ml-2 text-white">{location.address.formatted}</span>
                </div>
                <div>
                  <span className="text-gray-400">City:</span>
                  <span className="ml-2 text-white">{location.address.city}</span>
                </div>
                <div>
                  <span className="text-gray-400">State:</span>
                  <span className="ml-2 text-white">{location.address.state}</span>
                </div>
                <div>
                  <span className="text-gray-400">Country:</span>
                  <span className="ml-2 text-white">{location.address.country}</span>
                </div>
                <div>
                  <span className="text-gray-400">Location Type:</span>
                  <span className="ml-2 text-white">{location.locationType}</span>
                </div>
                {location.placeId && (
                  <div>
                    <span className="text-gray-400">Place ID:</span>
                    <span className="ml-2 text-white text-xs">{location.placeId}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}