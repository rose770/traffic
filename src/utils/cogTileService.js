import { fromUrl } from 'geotiff';
import { recordGisLog } from './esriTileService';

/**
 * Cloud Optimized GeoTIFF (COG) In-Browser Raster Streaming Service
 * Uses HTTP Range Requests to fetch only the required spatial window & resolution level.
 * Triggers telemetry audit logs on every raster window decode.
 */
export class CogTileService {
  constructor(cogUrl) {
    this.cogUrl = cogUrl;
    this.tiff = null;
    this.image = null;
    this.ready = false;
    this.bbox = null;
  }

  async init() {
    try {
      this.tiff = await fromUrl(this.cogUrl, {
        allowFullFile: false,
        cacheSize: 100
      });
      this.image = await this.tiff.getImage(0);
      try {
        this.bbox = this.image.getBoundingBox();
      } catch (e) {
        this.bbox = null;
      }
      this.ready = true;
      recordGisLog('INFO', `[geotiff.stream] Initialized Cloud-Optimized GeoTIFF stream from: ${this.cogUrl}`);
      return true;
    } catch (e) {
      console.warn('[CogTileService] Failed to initialize COG from URL:', e);
      recordGisLog('WARNING', `[geotiff.stream] Failed to initialize COG from URL: ${this.cogUrl} (${e.message})`);
      return false;
    }
  }

  /**
   * Fetch RGB raster window for given bounding box [minX, minY, maxX, maxY]
   */
  async readRgbWindow(bbox, width = 512, height = 512) {
    if (!this.ready || !this.image) {
      await this.init();
    }
    if (!this.image) return null;

    try {
      const rasters = await this.image.readRasters({
        bbox,
        width,
        height,
        resampleMethod: 'bilinear'
      });

      // Create an off-screen HTML canvas and render RGB bands
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      const imgData = ctx.createImageData(width, height);

      const rBand = rasters[0];
      const gBand = rasters[1] || rasters[0];
      const bBand = rasters[2] || rasters[0];

      for (let i = 0; i < width * height; i++) {
        imgData.data[i * 4] = rBand[i];
        imgData.data[i * 4 + 1] = gBand[i];
        imgData.data[i * 4 + 2] = bBand[i];
        imgData.data[i * 4 + 3] = 255;
      }

      ctx.putImageData(imgData, 0, 0);
      const dataUrl = canvas.toDataURL();

      // Trigger telemetry audit log on successful retrieval
      const bboxStr = Array.isArray(bbox) ? bbox.map(n => (typeof n === 'number' ? n.toFixed(5) : n)).join(', ') : 'viewport';
      recordGisLog(
        'INFO',
        `[geotiff.stream] Retrieved & decoded GeoTIFF raster window [${bboxStr}] (${width}x${height}px) for survey layer`
      );

      return dataUrl;
    } catch (e) {
      console.warn('[CogTileService] Error streaming COG window:', e);
      recordGisLog('WARNING', `[geotiff.stream] Error decoding COG window: ${e.message}`);
      return null;
    }
  }
}

/**
 * Public & Local Cloud COG Repositories
 */
export const SAUDI_COG_PRESETS = [
  {
    id: 'local_sample_survey',
    name: '🎯 Local Sub-Meter Survey GeoTIFF (Amanah Madinah Work Zone Grid)',
    url: '/api/geotiff/sample-survey.tif',
    minZoomThreshold: 16
  },
  {
    id: 'sentinel2_madinah',
    name: '🛰️ Sentinel-2 Cloud-Optimized GeoTIFF (Madinah Regional High-Res)',
    url: 'https://sentinel-cogs.s3.amazonaws.com/sentinel-s2-l2a-cogs/37/R/EN/2024/5/S2A_37REN_20240501_0_L2A/TCI.tif',
    minZoomThreshold: 15
  },
  {
    id: 'sentinel2_riyadh',
    name: '🛰️ Sentinel-2 Cloud-Optimized GeoTIFF (Riyadh Regional High-Res)',
    url: 'https://sentinel-cogs.s3.amazonaws.com/sentinel-s2-l2a-cogs/38/R/KU/2024/5/S2A_38RKU_20240501_0_L2A/TCI.tif',
    minZoomThreshold: 15
  }
];

