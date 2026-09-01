/**
 * Centralized ESRI Pure Satellite Tile Service Utility
 * 
 * Provides pure satellite imagery (World Imagery) without street names, shop labels, or POIs.
 * Supports ESRI API keys from the environment (VITE_ESRI_API_KEY or ESRI_API_KEY).
 */

export const getEsriSatelliteUrl = () => {
  let apiKey = '';
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      apiKey = import.meta.env.VITE_ESRI_API_KEY || import.meta.env.ESRI_API_KEY || '';
    }
  } catch (e) {
    // Ignore in non-standard environments
  }

  if (apiKey && typeof apiKey === 'string' && apiKey.trim().length > 0) {
    return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}?token=' + encodeURIComponent(apiKey.trim());
  }

  return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
};

export const ESRI_SATELLITE_CONFIG = {
  attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
  maxZoom: 22,
  maxNativeZoom: 19,
  subdomains: []
};
