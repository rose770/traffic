import proj4 from 'proj4';

// ══════════════════════════════════════════════════════════════════════
// Saudi Arabian Spatial Reference Systems (SRS / Proj4 Definitions)
// ══════════════════════════════════════════════════════════════════════

// WGS84 UTM Zones covering the Kingdom of Saudi Arabia
proj4.defs('EPSG:32637', '+proj=utm +zone=37 +datum=WGS84 +units=m +no_defs'); // Western KSA: Madinah, Makkah, Jeddah, Tabuk
proj4.defs('EPSG:32638', '+proj=utm +zone=38 +datum=WGS84 +units=m +no_defs'); // Central KSA: Riyadh, Qassim, Hail, Asir, Najran
proj4.defs('EPSG:32639', '+proj=utm +zone=39 +datum=WGS84 +units=m +no_defs'); // Eastern KSA: Dammam, Khobar, Jubail, Al-Ahsa

// Ain el Abd 1970 Historical Datum (Saudi Municipal / Aramco legacy grids)
proj4.defs('EPSG:20487', '+proj=utm +zone=37 +ellps=intl +towgs84=-143,-236,7,0,0,0,0 +units=m +no_defs');
proj4.defs('EPSG:20488', '+proj=utm +zone=38 +ellps=intl +towgs84=-143,-236,7,0,0,0,0 +units=m +no_defs');
proj4.defs('EPSG:20489', '+proj=utm +zone=39 +ellps=intl +towgs84=-143,-236,7,0,0,0,0 +units=m +no_defs');

// Standard WGS84 Geodetic
proj4.defs('EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs');
// Web Mercator
proj4.defs('EPSG:3857', '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs');

export const SAUDI_CRS_PRESETS = [
  { id: 'EPSG:32637', name: 'WGS84 / UTM Zone 37N (المدينة المنورة، مكة، جدة، تبوك)', zone: 37, centralLng: 39.0 },
  { id: 'EPSG:32638', name: 'WGS84 / UTM Zone 38N (الرياض، القصيم، حائل، عسير)', zone: 38, centralLng: 45.0 },
  { id: 'EPSG:32639', name: 'WGS84 / UTM Zone 39N (المنطقة الشرقية، الدمام، الجبيل)', zone: 39, centralLng: 51.0 },
  { id: 'EPSG:20487', name: 'Ain el Abd 1970 / UTM Zone 37N (شبكة البلديات القديمة - غرب)', zone: 37, centralLng: 39.0 },
  { id: 'EPSG:20488', name: 'Ain el Abd 1970 / UTM Zone 38N (شبكة البلديات القديمة - وسط)', zone: 38, centralLng: 45.0 },
  { id: 'EPSG:20489', name: 'Ain el Abd 1970 / UTM Zone 39N (شبكة أرامكو / الشرقية القديمة)', zone: 39, centralLng: 51.0 }
];

/**
 * Automatically detect the optimal Saudi UTM projection zone based on anchor coordinates or CAD coordinates
 */
export function detectSaudiCrs(anchorLng = 39.6120, anchorLat = 24.4686, cadCoords = null) {
  // If coordinates look like raw UTM (X: 100,000 - 900,000, Y: 1,500,000 - 3,500,000)
  if (cadCoords && typeof cadCoords.x === 'number' && typeof cadCoords.y === 'number') {
    const { x, y } = cadCoords;
    if (x > 100000 && x < 900000 && y > 1500000 && y < 3500000) {
      // Use anchor longitude to pick 37N, 38N, or 39N
      if (anchorLng < 42.0) return 'EPSG:32637'; // Western KSA (Madinah = 39.6)
      if (anchorLng >= 42.0 && anchorLng <= 48.0) return 'EPSG:32638'; // Central KSA (Riyadh = 46.7)
      return 'EPSG:32639'; // Eastern KSA
    }
  }

  // Detect by anchor Longitude
  if (anchorLng < 42.0) return 'EPSG:32637';
  if (anchorLng >= 42.0 && anchorLng <= 48.0) return 'EPSG:32638';
  return 'EPSG:32639';
}

/**
 * Transform (Easting, Northing) from Saudi UTM or Local CAD Grid -> [lng, lat] in WGS84 (EPSG:4326)
 */
export function reprojectCadToWgs84(x, y, fromCrs = 'EPSG:32637', localOrigin = null) {
  if (typeof x !== 'number' || typeof y !== 'number' || isNaN(x) || isNaN(y)) {
    return [0, 0];
  }

  try {
    // 1. Direct UTM coordinates (Easting: ~500,000m, Northing: ~2,700,000m)
    if (x > 100000 && x < 900000 && y > 1500000 && y < 3500000) {
      const [lng, lat] = proj4(fromCrs, 'EPSG:4326', [x, y]);
      if (!isNaN(lng) && !isNaN(lat) && lat >= 15 && lat <= 33 && lng >= 34 && lng <= 56) {
        return [lng, lat];
      }
    }

    // 2. Relative CAD local coordinates with an Anchor / Base Station (Local Origin in WGS84)
    if (localOrigin && typeof localOrigin.lat === 'number' && typeof localOrigin.lng === 'number') {
      const originLat = localOrigin.lat;
      const originLng = localOrigin.lng;
      const cosLat = Math.cos(originLat * Math.PI / 180);

      // Metres offset from local origin
      const deltaLng = x / (111320 * cosLat);
      const deltaLat = y / 110574.61;

      return [originLng + deltaLng, originLat + deltaLat];
    }

    // Default fallback
    const [lng, lat] = proj4(fromCrs, 'EPSG:4326', [x, y]);
    return [lng, lat];
  } catch (e) {
    console.warn('[CoordinateEngine] Reprojection error:', e);
    return [0, 0];
  }
}

/**
 * Transform [lng, lat] from WGS84 -> (Easting, Northing) in Saudi UTM (EPSG:32637 / EPSG:32638 / etc.)
 */
export function reprojectWgs84ToCad(lng, lat, toCrs = 'EPSG:32637') {
  try {
    const [easting, northing] = proj4('EPSG:4326', toCrs, [lng, lat]);
    return { easting: Number(easting.toFixed(2)), northing: Number(northing.toFixed(2)) };
  } catch (e) {
    console.warn('[CoordinateEngine] Forward projection error:', e);
    return { easting: 0, northing: 0 };
  }
}
