/**
 * Trench Geometry, Buffering, and Snapping Engine for Amanah Madinah
 * Powered by Turf.js for precise metric planar calculations.
 */

import * as turf from '@turf/turf';

/**
 * Generates parallel trench boundary polygons and offset centerlines
 * based on alignment path, trench width (W), and lateral offset distance.
 *
 * @param {Array<[number, number]>} alignmentNodes - Array of [lat, lng]
 * @param {number} widthMeters - Trench width in meters (e.g. 0.60, 1.20)
 * @param {number} offsetMeters - Lateral offset from road centerline (meters)
 * @returns {{ boundaryPolygon: Array<[number, number]>, offsetCenterline: Array<[number, number]>, totalLengthMeters: number }}
 */
export function generateTrenchGeometry(alignmentNodes, widthMeters = 0.60, offsetMeters = 0.0) {
  if (!alignmentNodes || alignmentNodes.length < 2) {
    return {
      boundaryPolygon: [],
      offsetCenterline: alignmentNodes || [],
      totalLengthMeters: 0
    };
  }

  try {
    // Turf uses [longitude, latitude]
    const coords = alignmentNodes.map(p => [p[1], p[0]]);
    const line = turf.lineString(coords);

    // Compute total linear length in meters
    const lengthKm = turf.length(line, { units: 'kilometers' });
    const totalLengthMeters = Math.round(lengthKm * 1000 * 100) / 100;

    // Apply lateral offset if specified (units in kilometers for turf)
    let activeLine = line;
    if (Math.abs(offsetMeters) > 0.01) {
      try {
        activeLine = turf.lineOffset(line, offsetMeters / 1000, { units: 'kilometers' });
      } catch (offsetErr) {
        console.warn('[trenchGeometry] lineOffset error:', offsetErr);
        activeLine = line;
      }
    }

    // Extract offset centerline coordinates in [lat, lng]
    const offsetCenterline = activeLine.geometry.coordinates.map(pt => [pt[1], pt[0]]);

    // Generate trench boundary polygon (buffer width / 2 on both sides)
    const halfWidthKm = (Math.max(0.20, widthMeters) / 2) / 1000;
    const buffered = turf.buffer(activeLine, halfWidthKm, { units: 'kilometers', steps: 8 });

    let boundaryPolygon = [];
    if (buffered && buffered.geometry && buffered.geometry.coordinates) {
      // In a Polygon, coordinates[0] is the exterior ring
      const ring = buffered.geometry.type === 'MultiPolygon'
        ? buffered.geometry.coordinates[0][0]
        : buffered.geometry.coordinates[0];

      boundaryPolygon = ring.map(pt => [pt[1], pt[0]]);
    }

    return {
      boundaryPolygon,
      offsetCenterline,
      totalLengthMeters
    };
  } catch (err) {
    console.error('[trenchGeometry] Error generating trench geometry:', err);
    return {
      boundaryPolygon: [],
      offsetCenterline: alignmentNodes,
      totalLengthMeters: 0
    };
  }
}

/**
 * Geometric Snapping Engine
 * Tests mouse cursor position against candidate road centerlines, edges, and vertices.
 * Snaps to the closest geometry within tolerancePixels.
 *
 * @param {L.LatLng} mouseLatLng
 * @param {L.Map} map
 * @param {Array<{ name: string, type: string, coordinates: Array<[number, number]> }>} snapCandidates
 * @param {number} tolerancePixels
 * @returns {{ snapped: boolean, snapLatLng: L.LatLng|null, snapType: string|null, featureName: string|null }}
 */
export function findSnapTarget(mouseLatLng, map, snapCandidates = [], tolerancePixels = 14) {
  if (!map || !mouseLatLng || !snapCandidates || snapCandidates.length === 0) {
    return { snapped: false, snapLatLng: null, snapType: null, featureName: null };
  }

  const mousePt = map.latLngToContainerPoint(mouseLatLng);
  let bestCandidate = null;
  let minDistance = tolerancePixels;

  for (const feature of snapCandidates) {
    const coords = feature.coordinates;
    if (!coords || coords.length === 0) continue;

    // 1. Check Vertex Snapping
    for (let i = 0; i < coords.length; i++) {
      const vLatLng = window.L.latLng(coords[i][0], coords[i][1]);
      const vPt = map.latLngToContainerPoint(vLatLng);
      const dist = mousePt.distanceTo(vPt);

      if (dist < minDistance) {
        minDistance = dist;
        bestCandidate = {
          snapped: true,
          snapLatLng: vLatLng,
          snapType: 'vertex',
          featureName: feature.name || 'Road Vertex'
        };
      }
    }

    // 2. Check Edge Segment Snapping (Closest Point on Segment)
    if (coords.length >= 2) {
      for (let i = 0; i < coords.length - 1; i++) {
        const aLatLng = window.L.latLng(coords[i][0], coords[i][1]);
        const bLatLng = window.L.latLng(coords[i + 1][0], coords[i + 1][1]);
        const aPt = map.latLngToContainerPoint(aLatLng);
        const bPt = map.latLngToContainerPoint(bLatLng);

        const dx = bPt.x - aPt.x;
        const dy = bPt.y - aPt.y;
        const lenSq = dx * dx + dy * dy;

        if (lenSq > 0.0001) {
          // Project mouse point onto segment [A, B]
          let t = ((mousePt.x - aPt.x) * dx + (mousePt.y - aPt.y) * dy) / lenSq;
          t = Math.max(0, Math.min(1, t));

          const projPt = window.L.point(aPt.x + t * dx, aPt.y + t * dy);
          const dist = mousePt.distanceTo(projPt);

          if (dist < minDistance) {
            minDistance = dist;
            bestCandidate = {
              snapped: true,
              snapLatLng: map.containerPointToLatLng(projPt),
              snapType: t === 0 || t === 1 ? 'vertex' : 'edge',
              featureName: feature.name || 'Road Centerline'
            };
          }
        }
      }
    }
  }

  return bestCandidate || { snapped: false, snapLatLng: null, snapType: null, featureName: null };
}
