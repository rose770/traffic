/**
 * Road Network Spatial Indexing, Dynamic Hover Identification,
 * and Magnetic Geometric Snapping Engine for CAD Drawing Workflows.
 * 
 * Capabilities:
 * - Real-time Esri-indexed road metadata extraction (Name, Hierarchy, Route code).
 * - High-speed spatial indexing of road segments within the active viewport.
 * - Magnetic snapping to road centerlines, intersection vertices, and user-drawn points (10-15px tolerance).
 * - Interactive visual snap indicator crosshair and road selection highlighting.
 */

import * as turf from '@turf/turf';

export class RoadSnappingEngine {
  constructor(map, options = {}) {
    this.map = map;
    this.snapTolerancePx = options.snapTolerancePx || 14;
    this.snapEnabled = options.snapEnabled !== false;
    this.onRoadHover = options.onRoadHover || null;
    this.onRoadSelect = options.onRoadSelect || null;
    this.onSnapChange = options.onSnapChange || null;

    this.roadFeatures = [];
    this.activeRoad = null;
    this.userVertices = [];
    this.isLoading = false;
    this.lastHoveredRoad = null;

    // Visual guide layers
    this.highlightLayer = null;
    this.selectionLayer = null;
    this.snapIndicatorMarker = null;

    this.init();
  }

  init() {
    if (!this.map || !window.L) return;

    // Create a dedicated pane for snapping guides so they sit cleanly above drawings
    if (!this.map.getPane('snappingGuidePane')) {
      this.map.createPane('snappingGuidePane');
      this.map.getPane('snappingGuidePane').style.zIndex = '650';
      this.map.getPane('snappingGuidePane').style.pointerEvents = 'none';
    }

    // Debounced viewport fetch listener
    this.onMoveEnd = () => {
      clearTimeout(this.fetchTimer);
      this.fetchTimer = setTimeout(() => this.fetchViewportRoads(), 250);
    };

    this.map.on('moveend', this.onMoveEnd);
    this.fetchViewportRoads();
  }

  setSnapTolerance(px) {
    this.snapTolerancePx = Math.max(5, Math.min(30, px));
  }

  setSnapEnabled(enabled) {
    this.snapEnabled = !!enabled;
    if (!this.snapEnabled) {
      this.hideSnapIndicator();
    }
  }

  setUserVertices(nodes) {
    this.userVertices = (nodes || []).map(n => [n.lat, n.lng]);
  }

  async fetchViewportRoads() {
    if (!this.map || this.isLoading) return;
    const bounds = this.map.getBounds();
    const zoom = this.map.getZoom();

    // Only query road network when zoomed in enough for survey/alignment inspection (Z >= 14)
    if (zoom < 14) {
      this.roadFeatures = [];
      return;
    }

    this.isLoading = true;
    const minLat = bounds.getSouth();
    const minLng = bounds.getWest();
    const maxLat = bounds.getNorth();
    const maxLng = bounds.getEast();

    try {
      const url = `/api/roads/viewport?minLat=${minLat}&minLng=${minLng}&maxLat=${maxLat}&maxLng=${maxLng}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        this.roadFeatures = data.features || [];
      }
    } catch (err) {
      console.warn('[RoadSnappingEngine] Failed to fetch viewport roads:', err);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Evaluates pointer position for road hover (Stage 1 Identification) and magnetic snapping.
   */
  processPointerMove(latlng, containerPoint) {
    if (!this.map) return null;

    let nearestRoad = null;
    let minRoadPx = Infinity;
    let roadSnapCandidate = null;

    const ptGeo = turf.point([latlng.lng, latlng.lat]);

    // 1. Evaluate distance to all road features in viewport
    for (let i = 0; i < this.roadFeatures.length; i++) {
      const feat = this.roadFeatures[i];
      const geom = feat.geometry;
      if (!geom || !geom.coordinates || geom.coordinates.length < 2) continue;

      try {
        const lineGeo = turf.lineString(geom.coordinates);
        const snapped = turf.nearestPointOnLine(lineGeo, ptGeo);
        const sLng = snapped.geometry.coordinates[0];
        const sLat = snapped.geometry.coordinates[1];

        // Convert snapped geo point to container screen pixel point
        const snapScreenPt = this.map.latLngToContainerPoint([sLat, sLng]);
        const pxDist = Math.hypot(
          containerPoint.x - snapScreenPt.x,
          containerPoint.y - snapScreenPt.y
        );

        if (pxDist < minRoadPx) {
          minRoadPx = pxDist;
          nearestRoad = feat;
          roadSnapCandidate = {
            latlng: { lat: sLat, lng: sLng },
            pxDist,
            feature: feat,
            coordinates: geom.coordinates
          };
        }
      } catch {
        // Ignore geometry anomalies
      }
    }

    // 2. Stage 1: Road Hover Detection (hover radius ~25px)
    if (nearestRoad && minRoadPx <= 25) {
      if (this.lastHoveredRoad?.id !== nearestRoad.id) {
        this.lastHoveredRoad = nearestRoad;
        this.renderRoadHoverHighlight(nearestRoad);
        if (this.onRoadHover) {
          this.onRoadHover(nearestRoad.properties, latlng);
        }
      }
    } else {
      if (this.lastHoveredRoad) {
        this.lastHoveredRoad = null;
        this.clearRoadHoverHighlight();
        if (this.onRoadHover) {
          this.onRoadHover(null, latlng);
        }
      }
    }

    // 3. Magnetic Geometric Snapping (tolerance 10-15px)
    if (!this.snapEnabled) {
      this.hideSnapIndicator();
      return { snapped: false, latlng };
    }

    // A. Priority 1: Self-Snapping to User-Drawn Vertices
    for (const uCoord of this.userVertices) {
      const uScreen = this.map.latLngToContainerPoint(uCoord);
      const uPxDist = Math.hypot(containerPoint.x - uScreen.x, containerPoint.y - uScreen.y);
      if (uPxDist <= this.snapTolerancePx) {
        const snappedLatLng = { lat: uCoord[0], lng: uCoord[1] };
        this.showSnapIndicator(snappedLatLng, 'user_vertex');
        return {
          snapped: true,
          snapType: 'user_vertex',
          latlng: snappedLatLng,
          pxDist: uPxDist
        };
      }
    }

    // B. Priority 2: Snapping to Road Endpoints & Intersection Vertices
    if (roadSnapCandidate && roadSnapCandidate.coordinates) {
      for (const pt of roadSnapCandidate.coordinates) {
        const vScreen = this.map.latLngToContainerPoint([pt[1], pt[0]]);
        const vPxDist = Math.hypot(containerPoint.x - vScreen.x, containerPoint.y - vScreen.y);
        if (vPxDist <= this.snapTolerancePx) {
          const snappedLatLng = { lat: pt[1], lng: pt[0] };
          this.showSnapIndicator(snappedLatLng, 'road_vertex');
          return {
            snapped: true,
            snapType: 'road_vertex',
            latlng: snappedLatLng,
            pxDist: vPxDist,
            feature: roadSnapCandidate.feature,
            roadName: roadSnapCandidate.feature.properties.name
          };
        }
      }
    }

    // C. Priority 3: Snapping to Road Centerline
    if (roadSnapCandidate && roadSnapCandidate.pxDist <= this.snapTolerancePx) {
      this.showSnapIndicator(roadSnapCandidate.latlng, 'road_centerline');
      return {
        snapped: true,
        snapType: 'road_centerline',
        latlng: roadSnapCandidate.latlng,
        pxDist: roadSnapCandidate.pxDist,
        feature: roadSnapCandidate.feature,
        roadName: roadSnapCandidate.feature.properties.name
      };
    }

    this.hideSnapIndicator();
    return { snapped: false, latlng };
  }

  /**
   * Highlights road segment when hovered.
   */
  renderRoadHoverHighlight(feature) {
    if (!this.map || !window.L || this.activeRoad?.id === feature.id) return;
    this.clearRoadHoverHighlight();

    const latLngs = feature.geometry.coordinates.map(c => [c[1], c[0]]);
    this.highlightLayer = window.L.polyline(latLngs, {
      color: '#38BDF8',
      weight: 6,
      opacity: 0.6,
      lineCap: 'round',
      pane: 'cadVectorPane'
    }).addTo(this.map);
  }

  clearRoadHoverHighlight() {
    if (this.highlightLayer && this.map) {
      this.map.removeLayer(this.highlightLayer);
      this.highlightLayer = null;
    }
  }

  /**
   * Selects and locks a road as the active road reference (Stage 1 Active Road Selection).
   */
  selectRoad(feature) {
    this.activeRoad = feature;
    this.clearRoadHoverHighlight();

    if (!this.map || !window.L) return;
    if (this.selectionLayer) {
      this.map.removeLayer(this.selectionLayer);
      this.selectionLayer = null;
    }

    if (feature) {
      const latLngs = feature.geometry.coordinates.map(c => [c[1], c[0]]);
      this.selectionLayer = window.L.polyline(latLngs, {
        color: '#F59E0B', // Amber / Gold highlight
        weight: 8,
        opacity: 0.85,
        lineCap: 'round',
        pane: 'cadVectorPane'
      }).addTo(this.map);
    }

    if (this.onRoadSelect) {
      this.onRoadSelect(feature ? feature.properties : null);
    }
  }

  clearSelection() {
    this.activeRoad = null;
    if (this.selectionLayer && this.map) {
      this.map.removeLayer(this.selectionLayer);
      this.selectionLayer = null;
    }
    if (this.onRoadSelect) {
      this.onRoadSelect(null);
    }
  }

  /**
   * Displays magnetic snapping crosshair guide on Leaflet map.
   */
  showSnapIndicator(latlng, snapType) {
    if (!this.map || !window.L) return;

    let iconHtml = '';
    if (snapType === 'road_vertex') {
      iconHtml = `
        <div style="width: 24px; height: 24px; margin-left: -12px; margin-top: -12px; display: flex; align-items: center; justify-content: center;">
          <div style="width: 14px; height: 14px; border: 2.5px solid #38BDF8; background: #0284C7; transform: rotate(45deg); box-shadow: 0 0 10px #38BDF8;"></div>
        </div>
      `;
    } else if (snapType === 'road_centerline') {
      iconHtml = `
        <div style="width: 24px; height: 24px; margin-left: -12px; margin-top: -12px; display: flex; align-items: center; justify-content: center;">
          <div style="width: 16px; height: 16px; border: 2.5px solid #2DD4BF; border-radius: 50%; background: rgba(45, 212, 191, 0.4); box-shadow: 0 0 10px #2DD4BF; display: flex; align-items: center; justify-content: center;">
            <div style="width: 4px; height: 4px; background: white; border-radius: 50%;"></div>
          </div>
        </div>
      `;
    } else {
      // user_vertex
      iconHtml = `
        <div style="width: 24px; height: 24px; margin-left: -12px; margin-top: -12px; display: flex; align-items: center; justify-content: center;">
          <div style="width: 14px; height: 14px; border: 2.5px solid #F59E0B; background: #D97706; box-shadow: 0 0 10px #F59E0B;"></div>
        </div>
      `;
    }

    if (this.snapIndicatorMarker) {
      this.snapIndicatorMarker.setLatLng([latlng.lat, latlng.lng]);
      this.snapIndicatorMarker.setIcon(window.L.divIcon({
        className: 'snapping-guide-indicator',
        html: iconHtml,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      }));
    } else {
      this.snapIndicatorMarker = window.L.marker([latlng.lat, latlng.lng], {
        pane: 'snappingGuidePane',
        interactive: false,
        icon: window.L.divIcon({
          className: 'snapping-guide-indicator',
          html: iconHtml,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        })
      }).addTo(this.map);
    }
  }

  hideSnapIndicator() {
    if (this.snapIndicatorMarker && this.map) {
      this.map.removeLayer(this.snapIndicatorMarker);
      this.snapIndicatorMarker = null;
    }
  }

  destroy() {
    clearTimeout(this.fetchTimer);
    if (this.map) {
      if (this.onMoveEnd) this.map.off('moveend', this.onMoveEnd);
      this.clearRoadHoverHighlight();
      this.clearSelection();
      this.hideSnapIndicator();
    }
    this.roadFeatures = [];
    this.map = null;
  }
}

export default RoadSnappingEngine;
