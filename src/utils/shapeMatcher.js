/**
 * Autonomous Shape Matching Algorithm (Robust 2D ICP)
 * Finds the optimal rotation and translation to align CAD points to OSM road points.
 */

// Convert lat/lng to approximate local cartesian coordinates (in pseudo-degrees/meters)
function toCartesian(points, centerLat) {
  const cosLat = Math.cos(centerLat * Math.PI / 180);
  return points.map(p => ({
    x: p.lng * cosLat,
    y: p.lat,
    original: p
  }));
}

// Convert local cartesian back to lat/lng
function toLatLng(cartesianPoints, centerLat) {
  const cosLat = Math.cos(centerLat * Math.PI / 180);
  return cartesianPoints.map(p => ({
    lat: p.y,
    lng: p.x / cosLat
  }));
}

function getCentroid(points) {
  if (points.length === 0) return { x: 0, y: 0 };
  let sumX = 0;
  let sumY = 0;
  points.forEach(p => {
    sumX += p.x;
    sumY += p.y;
  });
  return { x: sumX / points.length, y: sumY / points.length };
}

// Rotate a point around an origin
function rotatePoint(p, origin, angleRad) {
  const cosA = Math.cos(angleRad);
  const sinA = Math.sin(angleRad);
  const dx = p.x - origin.x;
  const dy = p.y - origin.y;
  return {
    x: origin.x + dx * cosA - dy * sinA,
    y: origin.y + dx * sinA + dy * cosA
  };
}

// Find nearest neighbor distance squared
function getNearestDistSq(p, targetPoints) {
  let minDistSq = Infinity;
  for (let i = 0; i < targetPoints.length; i++) {
    const tp = targetPoints[i];
    const dx = p.x - tp.x;
    const dy = p.y - tp.y;
    const distSq = dx * dx + dy * dy;
    if (distSq < minDistSq) minDistSq = distSq;
  }
  return minDistSq;
}

/**
 * Align source points (CAD) to target points (OSM).
 * @param {Array<{lat, lng}>} sourcePoints
 * @param {Array<{lat, lng}>} targetPoints
 * @returns {Object} { bestRotationDeg, dLat, dLng }
 */
export function alignShapes(sourcePoints, targetPoints) {
  if (!sourcePoints || sourcePoints.length === 0 || !targetPoints || targetPoints.length === 0) {
    return { bestRotationDeg: 0, dLat: 0, dLng: 0 };
  }

  // Subsample points to improve performance (max ~100 points each)
  const sampleRateSrc = Math.max(1, Math.floor(sourcePoints.length / 100));
  const sampleRateTgt = Math.max(1, Math.floor(targetPoints.length / 100));
  
  const srcSampled = sourcePoints.filter((_, i) => i % sampleRateSrc === 0);
  const tgtSampled = targetPoints.filter((_, i) => i % sampleRateTgt === 0);

  // 1. Convert to Cartesian
  const centerLat = targetPoints[0].lat;
  const srcCart = toCartesian(srcSampled, centerLat);
  const tgtCart = toCartesian(tgtSampled, centerLat);

  // 2. Centroid Alignment
  const srcCentroid = getCentroid(srcCart);
  const tgtCentroid = getCentroid(tgtCart);

  const dxInitial = tgtCentroid.x - srcCentroid.x;
  const dyInitial = tgtCentroid.y - srcCentroid.y;

  // Shift source to target centroid
  const srcCentered = srcCart.map(p => ({
    x: p.x + dxInitial,
    y: p.y + dyInitial
  }));
  const newSrcCentroid = getCentroid(srcCentered);

  // 3. Rotational Sweep (0 to 360 degrees)
  let bestError = Infinity;
  let bestAngleDeg = 0;

  for (let angleDeg = 0; angleDeg < 360; angleDeg += 2) {
    const angleRad = angleDeg * Math.PI / 180;
    
    let errorSum = 0;
    
    // Rotate and compute nearest neighbor distances
    for (let i = 0; i < srcCentered.length; i++) {
      const p = srcCentered[i];
      const rotatedP = rotatePoint(p, newSrcCentroid, angleRad);
      
      // Calculate squared distance to nearest target point
      errorSum += getNearestDistSq(rotatedP, tgtCart);
    }
    
    // Mean squared error
    const mse = errorSum / srcCentered.length;

    if (mse < bestError) {
      bestError = mse;
      bestAngleDeg = angleDeg;
    }
  }

  // 4. Convert final shifts back to Lat/Lng space
  // Note: we rotated around the new centroid, so the translation is simply dxInitial, dyInitial
  // But we need it in lat/lng offsets.
  const cosLat = Math.cos(centerLat * Math.PI / 180);
  const dLat = dyInitial;
  const dLng = dxInitial / cosLat;

  return {
    bestRotationDeg: bestAngleDeg,
    dLat,
    dLng
  };
}
