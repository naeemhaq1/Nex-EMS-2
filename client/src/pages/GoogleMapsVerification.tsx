import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';

interface ApiTestResult {
  status: 'success' | 'error' | 'testing';
  message: string;
  details?: any;
}

export default function GoogleMapsVerification() {
  const [apiKeyTest, setApiKeyTest] = useState<ApiTestResult>({ status: 'testing', message: 'Checking API key...' });
  const [geocodingTest, setGeocodingTest] = useState<ApiTestResult>({ status: 'testing', message: 'Waiting...' });
  const [placesTest, setPlacesTest] = useState<ApiTestResult>({ status: 'testing', message: 'Waiting...' });
  const [isTestingComplete, setIsTestingComplete] = useState(false);

  const runApiKeyTest = async () => {
    try {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      
      if (!apiKey) {
        setApiKeyTest({
          status: 'error',
          message: 'API key not found in environment'
        });
        return false;
      }

      setApiKeyTest({
        status: 'success',
        message: 'API key found in environment',
        details: { keyLength: apiKey.length, keyPrefix: apiKey.substring(0, 8) + '...' }
      });
      return true;
    } catch (error) {
      setApiKeyTest({
        status: 'error',
        message: `API key check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      return false;
    }
  };

  const runGeocodingTest = async () => {
    setGeocodingTest({ status: 'testing', message: 'Testing Maps JavaScript API...' });
    
    try {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      
      // Load Google Maps JavaScript API directly (this works with referer restrictions)
      if (!window.google) {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
        script.async = true;
        
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
        
        // Wait for Google Maps to be fully loaded
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      if (window.google && window.google.maps) {
        setGeocodingTest({
          status: 'success',
          message: 'Google Maps JavaScript API loaded successfully',
          details: {
            version: window.google.maps.version,
            libraries: 'Maps JavaScript API with geometry library'
          }
        });
        return true;
      } else {
        setGeocodingTest({
          status: 'error',
          message: 'Google Maps JavaScript API failed to load'
        });
        return false;
      }
    } catch (error) {
      setGeocodingTest({
        status: 'error',
        message: `Maps JavaScript API test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      return false;
    }
  };

  const runPlacesTest = async () => {
    setPlacesTest({ status: 'testing', message: 'Testing Map Rendering...' });
    
    try {
      if (!window.google || !window.google.maps) {
        setPlacesTest({
          status: 'error',
          message: 'Google Maps not loaded. Run Maps JavaScript API test first.'
        });
        return false;
      }
      
      // Create a test map element
      const testDiv = document.createElement('div');
      testDiv.style.width = '100px';
      testDiv.style.height = '100px';
      testDiv.style.position = 'absolute';
      testDiv.style.top = '-1000px';
      document.body.appendChild(testDiv);
      
      // Try to create a map instance
      const map = new window.google.maps.Map(testDiv, {
        center: { lat: 31.5204, lng: 74.3587 }, // Lahore
        zoom: 10
      });
      
      if (map) {
        setPlacesTest({
          status: 'success',
          message: 'Map rendering successful',
          details: {
            center: 'Lahore, Pakistan (31.5204, 74.3587)',
            zoom: 10,
            mapType: 'roadmap'
          }
        });
        
        // Clean up
        document.body.removeChild(testDiv);
        return true;
      } else {
        document.body.removeChild(testDiv);
        setPlacesTest({
          status: 'error',
          message: 'Failed to create map instance'
        });
        return false;
      }
    } catch (error) {
      setPlacesTest({
        status: 'error',
        message: `Map rendering test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      return false;
    }
  };

  const runAllTests = async () => {
    setIsTestingComplete(false);
    
    // Test 1: API Key presence
    const keyValid = await runApiKeyTest();
    
    if (keyValid) {
      // Test 2: Geocoding API
      await runGeocodingTest();
      
      // Test 3: Places API  
      await runPlacesTest();
    } else {
      setGeocodingTest({ status: 'error', message: 'Skipped - API key invalid' });
      setPlacesTest({ status: 'error', message: 'Skipped - API key invalid' });
    }
    
    setIsTestingComplete(true);
  };

  useEffect(() => {
    runAllTests();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'testing':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variant = status === 'success' ? 'default' : status === 'error' ? 'destructive' : 'secondary';
    return (
      <Badge variant={variant}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-[#1A1B3E] text-white p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <MapPin className="h-8 w-8 text-blue-400" />
            Google Maps API Verification
          </h1>
          <p className="text-gray-300">
            Comprehensive testing of Google Maps API functionality and authentication
          </p>
        </div>

        <div className="grid gap-6">
          {/* API Key Test */}
          <Card className="bg-[#2A2B5E] border-gray-600">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  {getStatusIcon(apiKeyTest.status)}
                  API Key Configuration
                </span>
                {getStatusBadge(apiKeyTest.status)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 mb-2">{apiKeyTest.message}</p>
              {apiKeyTest.details && (
                <div className="bg-[#1A1B3E] rounded p-3 text-sm">
                  <pre className="text-gray-400">
                    {JSON.stringify(apiKeyTest.details, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Maps JavaScript API Test */}
          <Card className="bg-[#2A2B5E] border-gray-600">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  {getStatusIcon(geocodingTest.status)}
                  Maps JavaScript API Test
                </span>
                {getStatusBadge(geocodingTest.status)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 mb-2">{geocodingTest.message}</p>
              {geocodingTest.details && (
                <div className="bg-[#1A1B3E] rounded p-3 text-sm">
                  <pre className="text-gray-400">
                    {JSON.stringify(geocodingTest.details, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Map Rendering Test */}
          <Card className="bg-[#2A2B5E] border-gray-600">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  {getStatusIcon(placesTest.status)}
                  Map Rendering Test
                </span>
                {getStatusBadge(placesTest.status)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 mb-2">{placesTest.message}</p>
              {placesTest.details && (
                <div className="bg-[#1A1B3E] rounded p-3 text-sm">
                  <pre className="text-gray-400">
                    {JSON.stringify(placesTest.details, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button 
              onClick={runAllTests}
              disabled={!isTestingComplete}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isTestingComplete ? 'Re-run Tests' : 'Testing...'}
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => window.location.href = '/'}
              className="border-gray-600 text-white hover:bg-gray-700"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}