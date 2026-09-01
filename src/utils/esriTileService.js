/**
 * Centralized ESRI Pure Satellite Tile Service Utility
 * 
 * Provides pure satellite imagery (World Imagery) without street names, shop labels, or POIs.
 * Supports ESRI API keys from the environment (VITE_ESRI_API_KEY or ESRI_API_KEY).
 * Automatically logs fallback occurrences to the central telemetry logs (/api/system/logs).
 */

const loggedMessages = new Set();

/**
 * Sends a GIS telemetry log to the backend central logger so it appears in /logs
 */
export const recordGisLog = async (level, message, details = null) => {
  const logKey = level + ':' + message;
  if (loggedMessages.has(logKey)) return;
  loggedMessages.add(logKey);

  console.log('[ESRI GIS Telemetry]', level, message, details || '');

  try {
    if (typeof fetch !== 'undefined') {
      await fetch('/api/system/logs/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level,
          module: 'gis.esri',
          message,
          details
        })
      });
    }
  } catch (e) {
    // Silently ignore telemetry transmission errors
  }
};

export const getEsriApiKey = () => {
  let apiKey = '';
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      apiKey = import.meta.env.VITE_ESRI_API_KEY || import.meta.env.ESRI_API_KEY || '';
    }
  } catch (e) {
    // Ignore in non-standard environments
  }
  return (apiKey && typeof apiKey === 'string') ? apiKey.trim() : '';
};

export const getEsriSatelliteUrl = () => {
  const apiKey = getEsriApiKey();

  if (apiKey) {
    recordGisLog(
      'INFO',
      'ESRI API key active. Authenticated World Imagery pure satellite service enabled.'
    );
    return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}?token=' + encodeURIComponent(apiKey);
  }

  // Fallback when no API key is provided
  recordGisLog(
    'WARNING',
    'Notice: No ESRI API key configured in .env. Fallback active: using public unauthenticated World Imagery pure satellite service.'
  );

  return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
};

export const ESRI_SATELLITE_CONFIG = {
  attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
  maxZoom: 22,
  maxNativeZoom: 19,
  subdomains: []
};

/**
 * Factory helper that creates a Leaflet tileLayer with automated fallback logging.
 * If the authenticated tile request fails (e.g. 401, 403, or invalid token),
 * it logs the fallback event to /logs and automatically switches to public unauthenticated tiles.
 */
export const createEsriTileLayer = (options = {}) => {
  if (typeof window === 'undefined' || !window.L) return null;

  const primaryUrl = getEsriSatelliteUrl();
  const fallbackUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
  const hasToken = primaryUrl.includes('?token=');

  const mergedOpts = {
    ...ESRI_SATELLITE_CONFIG,
    ...options
  };

  const layer = window.L.tileLayer(primaryUrl, mergedOpts);

  if (hasToken) {
    let hasLoggedFallback = false;
    layer.on('tileerror', (errorEvent) => {
      if (!hasLoggedFallback) {
        hasLoggedFallback = true;
        recordGisLog(
          'ERROR',
          'ESRI API key authentication failed or rejected (401/403/invalid token). Automatically switched to fallback public World Imagery satellite tiles.',
          { errorTileUrl: errorEvent?.tile?.src || '' }
        );
        // Switch layer to fallback public tile server
        if (typeof layer.setUrl === 'function') {
          layer.setUrl(fallbackUrl);
        }
      }
    });
  }

  return layer;
};
