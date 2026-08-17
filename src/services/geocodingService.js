/**
 * Geocoding Service
 * Abstraction layer to allow easily swapping out Geocoding API providers.
 */

// ── Nominatim Provider (OpenStreetMap) ──
class NominatimProvider {
  constructor() {
    this.baseUrl = 'https://nominatim.openstreetmap.org/search';
    this.cache = new Map();
    this.lastRequestTime = 0;
  }

  /**
   * Search for an address/road.
   * Enforces 1 request per second to adhere to Nominatim's usage policy.
   */
  async search(query, options = {}) {
    if (!query || query.trim().length < 2) return [];

    const { bounded = true, viewbox = '39.4,24.3,39.8,24.6' } = options; // Default Madinah viewbox

    const url = new URL(this.baseUrl);
    url.searchParams.append('q', query);
    url.searchParams.append('format', 'json');
    url.searchParams.append('addressdetails', '1');
    url.searchParams.append('limit', '5');
    
    if (bounded && viewbox) {
      url.searchParams.append('viewbox', viewbox);
      url.searchParams.append('bounded', '1');
    }

    const urlString = url.toString();

    // Check cache
    if (this.cache.has(urlString)) {
      return this.cache.get(urlString);
    }

    // Rate limiting: wait if less than 1000ms since last request
    const now = Date.now();
    const timeSinceLast = now - this.lastRequestTime;
    if (timeSinceLast < 1000) {
      await new Promise(resolve => setTimeout(resolve, 1000 - timeSinceLast));
    }
    
    this.lastRequestTime = Date.now();

    try {
      const response = await fetch(urlString, {
        headers: {
          // Required by Nominatim Terms of Use
          'User-Agent': 'AmanahMadinahConstructionPlanning/1.0',
          'Accept-Language': 'ar,en;q=0.9'
        }
      });
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data = await response.json();
      
      // Standardize output format
      const results = data.map(item => ({
        id: item.place_id,
        name: item.name || item.display_name.split(',')[0],
        displayName: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        type: item.type,
        raw: item
      }));

      this.cache.set(urlString, results);
      return results;
    } catch (error) {
      console.error('Geocoding error:', error);
      return [];
    }
  }
}

// ── Service Wrapper ──
class GeocodingService {
  constructor() {
    // Currently hardcoded to Nominatim. 
    // In the future, this can be switched based on env vars (e.g., GoogleMapsProvider, MapboxProvider)
    this.provider = new NominatimProvider();
  }

  async searchRoads(query, options = {}) {
    // Default to searching within Madinah bounding box
    return this.provider.search(query, {
      viewbox: '39.4,24.3,39.8,24.6', // Madinah approximate bounding box [minLng, minLat, maxLng, maxLat]
      bounded: true,
      ...options
    });
  }

  /**
   * Fetch the actual geometry (points) of a road using Overpass API
   * @param {string} roadName 
   * @returns {Promise<Array<{lat, lng}>>} Array of coordinates forming the road
   */
  async fetchRoadGeometry(roadName) {
    if (!roadName) return [];
    try {
      // Overpass QL query: Find ways with highway tag and matching name in Madinah
      const query = `
        [out:json];
        area[name="المدينة المنورة"]->.searchArea;
        way[highway](area.searchArea)[name~"${roadName}"];
        out geom;
      `;
      const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Overpass API error: ${response.status}`);
      const data = await response.json();
      
      const points = [];
      if (data && data.elements) {
        data.elements.forEach(el => {
          if (el.type === 'way' && el.geometry) {
            el.geometry.forEach(node => {
              points.push({ lat: node.lat, lng: node.lon });
            });
          }
        });
      }
      return points;
    } catch (e) {
      console.error('Error fetching road geometry:', e);
      return [];
    }
  }
}

export const geocodingService = new GeocodingService();
