/**
 * Google Maps Service for Enhanced Location Features
 * Provides reverse geocoding, location validation, and address resolution
 */

export interface AddressComponents {
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  formatted: string;
}

export interface LocationInfo {
  coordinates: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  address: AddressComponents;
  placeId?: string;
  locationType: 'ROOFTOP' | 'RANGE_INTERPOLATED' | 'GEOMETRIC_CENTER' | 'APPROXIMATE';
}

class GoogleMapsService {
  private apiKey: string;
  private isLoaded = false;

  constructor() {
    this.apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('Google Maps API key not found. Location services will use basic geolocation only.');
    }
  }

  /**
   * Initialize Google Maps API
   */
  async initialize(): Promise<void> {
    if (this.isLoaded) return;
    
    if (!this.apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    return new Promise((resolve, reject) => {
      if ((window as any).google) {
        this.isLoaded = true;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${this.apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        this.isLoaded = true;
        resolve();
      };
      
      script.onerror = () => {
        reject(new Error('Failed to load Google Maps API'));
      };
      
      document.head.appendChild(script);
    });
  }

  /**
   * Convert GPS coordinates to human-readable address
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<LocationInfo> {
    await this.initialize();
    
    const geocoder = new window.google.maps.Geocoder();
    const latLng = new window.google.maps.LatLng(latitude, longitude);
    
    return new Promise((resolve, reject) => {
      geocoder.geocode({ location: latLng }, (results: any, status: any) => {
        if (status === 'OK' && results && results[0]) {
          const result = results[0];
          const addressComponents = this.parseAddressComponents(result.address_components);
          
          resolve({
            coordinates: { latitude, longitude, accuracy: 0 },
            address: {
              ...addressComponents,
              formatted: result.formatted_address
            },
            placeId: result.place_id,
            locationType: result.geometry.location_type as any
          });
        } else {
          reject(new Error(`Geocoding failed: ${status}`));
        }
      });
    });
  }

  /**
   * Get current location with enhanced accuracy using Google Maps
   */
  async getCurrentLocationWithAddress(): Promise<LocationInfo> {
    const position = await this.getCurrentPosition();
    
    try {
      const locationInfo = await this.reverseGeocode(
        position.coords.latitude,
        position.coords.longitude
      );
      
      return {
        ...locationInfo,
        coordinates: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        }
      };
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      
      // Fallback to basic location without address
      return {
        coordinates: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        },
        address: {
          street: '',
          city: '',
          state: '',
          country: '',
          postalCode: '',
          formatted: 'Address unavailable'
        },
        locationType: 'APPROXIMATE'
      };
    }
  }

  /**
   * Calculate distance between two coordinates
   */
  calculateDistance(
    lat1: number, 
    lon1: number, 
    lat2: number, 
    lon2: number
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  }

  /**
   * Validate if location is within acceptable range of known locations
   */
  validateLocationProximity(
    currentLat: number,
    currentLon: number,
    knownLocations: Array<{lat: number, lon: number, name: string, maxDistance: number}>
  ): {
    isValid: boolean;
    nearestLocation?: string;
    distance?: number;
    violations: string[];
  } {
    const violations: string[] = [];
    let nearestLocation: string | undefined;
    let minDistance = Infinity;
    let isValid = false;

    for (const location of knownLocations) {
      const distance = this.calculateDistance(
        currentLat, currentLon,
        location.lat, location.lon
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestLocation = location.name;
      }

      if (distance <= location.maxDistance) {
        isValid = true;
      }
    }

    if (!isValid && nearestLocation) {
      violations.push(`Too far from ${nearestLocation} (${Math.round(minDistance)}m away)`);
    }

    return {
      isValid,
      nearestLocation,
      distance: minDistance,
      violations
    };
  }

  /**
   * Get current position using navigator.geolocation
   */
  private getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000
        }
      );
    });
  }

  /**
   * Parse Google Maps address components
   */
  private parseAddressComponents(components: any[]): Omit<AddressComponents, 'formatted'> {
    const result = {
      street: '',
      city: '',
      state: '',
      country: '',
      postalCode: ''
    };

    for (const component of components) {
      const types = component.types;
      
      if (types.includes('street_number') || types.includes('route')) {
        result.street += component.long_name + ' ';
      }
      
      if (types.includes('locality') || types.includes('administrative_area_level_3')) {
        result.city = component.long_name;
      }
      
      if (types.includes('administrative_area_level_1')) {
        result.state = component.long_name;
      }
      
      if (types.includes('country')) {
        result.country = component.long_name;
      }
      
      if (types.includes('postal_code')) {
        result.postalCode = component.long_name;
      }
    }

    result.street = result.street.trim();
    
    return result;
  }
}

export const googleMapsService = new GoogleMapsService();