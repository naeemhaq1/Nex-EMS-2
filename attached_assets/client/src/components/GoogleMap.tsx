import React, { useEffect, useRef, useState } from 'react';

interface GoogleMapProps {
  center: { lat: number; lng: number };
  zoom: number;
  className?: string;
  onMapReady?: (map: any) => void;
}

declare global {
  interface Window {
    google: any;
  }
}

export default function GoogleMap({ center, zoom, className = "", onMapReady }: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      setError('Google Maps API key not configured');
      setIsLoading(false);
      return;
    }

    const initializeMap = () => {
      if (!mapRef.current) return;

      try {
        console.log('Attempting to initialize map...');
        console.log('Creating map instance...');
        
        const map = new window.google.maps.Map(mapRef.current, {
          center,
          zoom,
          mapTypeId: 'roadmap',
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

        console.log('Map created successfully');
        
        // Force a resize after a short delay to ensure proper rendering
        setTimeout(() => {
          window.google.maps.event.trigger(map, 'resize');
          map.setCenter(center);
        }, 100);

        setMapInstance(map);
        setIsLoading(false);
        setError(null);
        
        if (onMapReady) {
          onMapReady(map);
        }

        console.log('Google Maps initialized successfully');
      } catch (err) {
        console.error('Error creating map:', err);
        setError('Failed to create map');
        setIsLoading(false);
      }
    };

    const loadGoogleMaps = () => {
      if (window.google?.maps) {
        initializeMap();
        return;
      }

      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        existingScript.addEventListener('load', initializeMap);
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
      script.async = true;
      script.defer = true;
      script.onload = initializeMap;
      script.onerror = () => {
        setError('Failed to load Google Maps');
        setIsLoading(false);
      };
      
      document.head.appendChild(script);
    };

    loadGoogleMaps();
  }, [center.lat, center.lng, zoom, onMapReady]);

  if (error) {
    return (
      <div className={`${className} flex items-center justify-center bg-[#2A2B5E] text-white`}>
        <div className="text-center">
          <p className="text-red-400 mb-2">Map Error</p>
          <p className="text-sm text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`${className} flex items-center justify-center bg-[#2A2B5E] text-white`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-sm text-gray-400">Loading Google Maps...</p>
        </div>
      </div>
    );
  }

  return <div ref={mapRef} className={className} />;
}