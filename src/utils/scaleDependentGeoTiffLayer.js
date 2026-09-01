import { CogTileService } from './cogTileService';
import { recordGisLog } from './esriTileService';

export const getMapScaleRatio = (zoom, lat = 24.4686) => {
  const earthCircumferenceMeters = 40075016.686;
  const metersPerPixel = (earthCircumferenceMeters * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom + 8);
  const scale = Math.round(metersPerPixel / 0.000264583);
  return '1:' + scale.toLocaleString();
};

export class ScaleDependentGeoTiffController {
  constructor(map, options = {}) {
    this.map = map;
    this.cogUrl = options.cogUrl || '/api/geotiff/sample-survey.tif';
    this.surveyBounds = options.surveyBounds || [
      [24.4665, 39.6095],
      [24.4705, 39.6145]
    ];
    this.minZoomThreshold = options.minZoomThreshold !== undefined ? options.minZoomThreshold : 16;
    this.opacity = options.opacity !== undefined ? options.opacity : 0.95;
    this.enabled = options.enabled !== undefined ? options.enabled : true;
    this.onStateChange = options.onStateChange || null;

    this.cogService = new CogTileService(this.cogUrl);
    this.rasterOverlay = null;
    this.debounceTimer = null;
    this.isRendering = false;
    this.cache = new Map();
    this.maxCacheEntries = 8;

    this.init();
  }

  init() {
    if (!this.map || !window.L) return;

    this.onMoveEnd = () => {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => this.evaluateScaleAndRender(), 180);
    };

    this.map.on('moveend', this.onMoveEnd);
    this.map.on('zoomend', this.onMoveEnd);

    this.evaluateScaleAndRender();
  }

  async evaluateScaleAndRender() {
    if (!this.map) return;

    const currentZoom = this.map.getZoom();
    const mapBounds = this.map.getBounds();
    const mapCenter = this.map.getCenter();
    const scaleRatio = getMapScaleRatio(currentZoom, mapCenter.lat);

    const isAboveThreshold = currentZoom >= this.minZoomThreshold;
    const intersects = this.checkIntersection(mapBounds);

    const statePayload = {
      enabled: this.enabled,
      currentZoom,
      minZoomThreshold: this.minZoomThreshold,
      scaleRatio,
      isAboveThreshold,
      intersects,
      active: this.enabled && isAboveThreshold && intersects,
      loading: this.isRendering
    };

    if (typeof this.onStateChange === 'function') {
      this.onStateChange(statePayload);
    }

    if (!this.enabled) {
      this.hideAll();
      return;
    }

    if (!isAboveThreshold) {
      if (this.rasterOverlay) {
        this.map.removeLayer(this.rasterOverlay);
        this.rasterOverlay = null;
      }
      return;
    }

    if (!intersects) {
      if (this.rasterOverlay) {
        this.map.removeLayer(this.rasterOverlay);
        this.rasterOverlay = null;
      }
      return;
    }

    await this.renderGeoTiffWindow(mapBounds);
  }

  checkIntersection(mapBounds) {
    const [sw, ne] = this.surveyBounds;
    const surveySouth = Math.min(sw[0], ne[0]);
    const surveyNorth = Math.max(sw[0], ne[0]);
    const surveyWest = Math.min(sw[1], ne[1]);
    const surveyEast = Math.max(sw[1], ne[1]);

    const mapSouth = mapBounds.getSouth();
    const mapNorth = mapBounds.getNorth();
    const mapWest = mapBounds.getWest();
    const mapEast = mapBounds.getEast();

    return !(
      mapNorth < surveySouth ||
      mapSouth > surveyNorth ||
      mapEast < surveyWest ||
      mapWest > surveyEast
    );
  }

  async renderGeoTiffWindow(mapBounds) {
    if (this.isRendering) return;
    this.isRendering = true;

    try {
      const [sw, ne] = this.surveyBounds;
      const surveySouth = Math.min(sw[0], ne[0]);
      const surveyNorth = Math.max(sw[0], ne[0]);
      const surveyWest = Math.min(sw[1], ne[1]);
      const surveyEast = Math.max(sw[1], ne[1]);

      const interSouth = Math.max(mapBounds.getSouth(), surveySouth);
      const interNorth = Math.min(mapBounds.getNorth(), surveyNorth);
      const interWest = Math.max(mapBounds.getWest(), surveyWest);
      const interEast = Math.min(mapBounds.getEast(), surveyEast);

      if (interNorth <= interSouth || interEast <= interWest) {
        this.isRendering = false;
        return;
      }

      const bboxKey = interWest.toFixed(4) + '_' + interSouth.toFixed(4) + '_' + interEast.toFixed(4) + '_' + interNorth.toFixed(4);

      let dataUrl = this.cache.get(bboxKey);

      if (!dataUrl) {
        const reqBbox = [interWest, interSouth, interEast, interNorth];
        dataUrl = await this.cogService.readRgbWindow(reqBbox, 1024, 1024);

        if (dataUrl) {
          if (this.cache.size >= this.maxCacheEntries) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
          }
          this.cache.set(bboxKey, dataUrl);
        }
      }

      if (dataUrl && this.map) {
        const renderBounds = [
          [interSouth, interWest],
          [interNorth, interEast]
        ];

        // Ensure dedicated pane exists directly above satellite basemap (zIndex: 200) and below CAD (zIndex: 500)
        if (!this.map.getPane('geoTiffPane')) {
          this.map.createPane('geoTiffPane');
          this.map.getPane('geoTiffPane').style.zIndex = '250';
        }

        if (this.rasterOverlay) {
          this.rasterOverlay.setBounds(renderBounds);
          this.rasterOverlay.setUrl(dataUrl);
          this.rasterOverlay.setOpacity(this.opacity);
        } else {
          this.rasterOverlay = window.L.imageOverlay(dataUrl, renderBounds, {
            opacity: this.opacity,
            interactive: false,
            pane: 'geoTiffPane'
          }).addTo(this.map);
        }
      }
    } catch (err) {
      console.warn('[ScaleDependentGeoTiffController] Error rendering GeoTIFF window:', err);
      recordGisLog('WARNING', '[geotiff.stream] Render failed: ' + err.message);
    } finally {
      this.isRendering = false;
    }
  }

  setOpacity(opacity) {
    this.opacity = Math.max(0, Math.min(1, opacity));
    if (this.rasterOverlay) {
      this.rasterOverlay.setOpacity(this.opacity);
    }
  }

  setMinZoomThreshold(zoom) {
    this.minZoomThreshold = zoom;
    this.evaluateScaleAndRender();
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    this.evaluateScaleAndRender();
  }

  setSurveyBounds(bounds) {
    this.surveyBounds = bounds;
    this.cache.clear();
    this.evaluateScaleAndRender();
  }

  hideAll() {
    if (this.rasterOverlay) {
      this.map.removeLayer(this.rasterOverlay);
      this.rasterOverlay = null;
    }
  }

  destroy() {
    clearTimeout(this.debounceTimer);
    if (this.map) {
      if (this.onMoveEnd) {
        this.map.off('moveend', this.onMoveEnd);
        this.map.off('zoomend', this.onMoveEnd);
      }
      if (this.rasterOverlay) {
        this.map.removeLayer(this.rasterOverlay);
        this.rasterOverlay = null;
      }
    }
    this.cache.clear();
    this.map = null;
  }
}

export default ScaleDependentGeoTiffController;
