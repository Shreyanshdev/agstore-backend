// Using built-in fetch (Node.js 18+)

export class GoogleMapsService {
  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyBZkClivKdjixXbLHgYQlXzzR2IDxBx4VQ';
    this.baseUrl = 'https://maps.googleapis.com/maps/api';
    this.requestsPerSecond = 0;
    this.lastRequestTime = Date.now();

    // Validate API key format
    if (!this.apiKey || this.apiKey.length < 20) {
      console.error('❌ Invalid Google Maps API Key:', this.apiKey ? 'Too short' : 'Missing');
      console.error('⚠️ Using fallback geocoding - please set GOOGLE_MAPS_API_KEY environment variable');
    } else {
      console.log('✅ Google Maps API Key loaded successfully');
    }
  }

  // Rate limiting for Google Maps API (free tier limit: 40,000 requests per month)
  async checkRateLimit() {
    const now = Date.now();
    const timeDiff = now - this.lastRequestTime;

    // Reset counter every second
    if (timeDiff > 1000) {
      this.requestsPerSecond = 0;
      this.lastRequestTime = now;
    }

    // Limit to 10 requests per second (well under Google's limits)
    if (this.requestsPerSecond >= 10) {
      console.log('⏳ Rate limit reached, waiting...');
      await new Promise(resolve => setTimeout(resolve, 1000 - timeDiff));
      this.requestsPerSecond = 0;
    }

    this.requestsPerSecond++;
  }

  // Decode Google polyline format
  decodePolyline(encoded) {
    const poly = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;

    while (index < len) {
      let b, shift = 0, result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      poly.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5
      });
    }
    return poly;
  }

  // Get directions from Google Maps API
  async getDirections(origin, destination, options = {}) {
    try {
      if (!origin || !destination) {
        throw new Error('Origin and destination are required');
      }

      // Check rate limit before making request
      await this.checkRateLimit();

      const params = new URLSearchParams({
        origin: `${origin.latitude},${origin.longitude}`,
        destination: `${destination.latitude},${destination.longitude}`,
        mode: options.mode || 'driving',
        key: this.apiKey
      });

      if (options.traffic) {
        params.append('departure_time', 'now');
      }

      if (options.alternatives) {
        params.append('alternatives', 'true');
      }

      const url = `${this.baseUrl}/directions/json?${params.toString()}`;

      console.log('🗺️ Fetching directions from Google Maps API...');

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'MilkDeliveryApp/1.0'
        },
        // Add timeout to prevent hanging requests
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.status === 'OK' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const leg = route.legs[0];

        // Decode polyline to coordinates
        const coordinates = this.decodePolyline(route.overview_polyline.points);

        const routeData = {
          distance: leg.distance,
          duration: leg.duration,
          duration_in_traffic: leg.duration_in_traffic,
          coordinates: coordinates,
          steps: leg.steps,
          summary: route.summary,
          warnings: route.warnings || [],
          bounds: route.bounds,
          overviewPolyline: route.overview_polyline
        };

        console.log('✅ Directions fetched successfully:', {
          distance: routeData.distance?.text,
          duration: routeData.duration?.text,
          coordinates: routeData.coordinates?.length
        });

        return routeData;
      } else {
        console.warn('⚠️ Google Directions API error:', data.status, data.error_message);
        throw new Error(data.error_message || 'No routes found');
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('❌ Directions request timeout');
        throw new Error('Directions request timed out - please try again');
      }
      console.error('❌ Error fetching directions:', error);
      throw error;
    }
  }

  // Geocode address to coordinates
  async geocodeAddress(addressString) {
    try {
      if (!addressString || typeof addressString !== 'string') {
        throw new Error('Invalid address string provided');
      }

      // Check rate limit before making request
      await this.checkRateLimit();

      const encodedAddress = encodeURIComponent(addressString.trim());
      const url = `${this.baseUrl}/geocode/json?address=${encodedAddress}&key=${this.apiKey}`;

      console.log('🗺️ Geocoding address:', addressString);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'MilkDeliveryApp/1.0'
        },
        // Add timeout to prevent hanging requests
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        const coordinates = {
          latitude: parseFloat(location.lat.toFixed(6)),
          longitude: parseFloat(location.lng.toFixed(6))
        };

        console.log('✅ Geocoding successful:', coordinates);
        return coordinates;
      } else if (data.status === 'ZERO_RESULTS') {
        console.warn('⚠️ No geocoding results found for address');
        throw new Error('Address not found - please check the address format');
      } else if (data.status === 'OVER_QUERY_LIMIT') {
        console.error('❌ Google Maps API quota exceeded');
        throw new Error('Geocoding service temporarily unavailable - quota exceeded');
      } else if (data.status === 'REQUEST_DENIED') {
        console.error('❌ Google Maps API request denied - check API key');
        throw new Error('Geocoding service unavailable - API key issue');
      } else {
        console.warn('⚠️ Google Geocoding API error:', data.status, data.error_message);
        throw new Error(data.error_message || `Geocoding failed with status: ${data.status}`);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('❌ Geocoding request timeout');
        throw new Error('Geocoding request timed out - please try again');
      }
      console.error('❌ Error geocoding address:', error.message);
      throw error;
    }
  }

  // Reverse geocode coordinates to address
  async reverseGeocode(latitude, longitude) {
    try {
      if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
        throw new Error('Invalid coordinates provided');
      }

      // Validate coordinate ranges
      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        throw new Error('Coordinates out of valid range');
      }

      // Check rate limit before making request
      await this.checkRateLimit();

      const url = `${this.baseUrl}/geocode/json?latlng=${latitude.toFixed(6)},${longitude.toFixed(6)}&key=${this.apiKey}`;

      console.log('🗺️ Reverse geocoding coordinates:', { latitude, longitude });

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'MilkDeliveryApp/1.0'
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const address = data.results[0].formatted_address;

        console.log('✅ Reverse geocoding successful:', address);
        return {
          address: address,
          latitude: parseFloat(latitude.toFixed(6)),
          longitude: parseFloat(longitude.toFixed(6))
        };
      } else if (data.status === 'ZERO_RESULTS') {
        console.warn('⚠️ No reverse geocoding results found for coordinates');
        throw new Error('No address found for these coordinates');
      } else if (data.status === 'OVER_QUERY_LIMIT') {
        console.error('❌ Google Maps API quota exceeded');
        throw new Error('Reverse geocoding service temporarily unavailable - quota exceeded');
      } else if (data.status === 'REQUEST_DENIED') {
        console.error('❌ Google Maps API request denied - check API key');
        throw new Error('Reverse geocoding service unavailable - API key issue');
      } else {
        console.warn('⚠️ Google Reverse Geocoding API error:', data.status, data.error_message);
        throw new Error(data.error_message || `Reverse geocoding failed with status: ${data.status}`);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('❌ Reverse geocoding request timeout');
        throw new Error('Reverse geocoding request timed out - please try again');
      }
      console.error('❌ Error reverse geocoding:', error.message);
      throw error;
    }
  }
}

// Export singleton instance
export const googleMapsService = new GoogleMapsService();
