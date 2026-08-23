import { fromUrl } from 'geotiff';

/**
 * Cloud Optimized GeoTIFF (COG) In-Browser Raster Streaming Service
 * Uses HTTP Range Requests to fetch only the required spatial window & resolution level
 */
export class CogTileService {
  constructor(cogUrl) {
    this.cogUrl = cogUrl;
    this.tiff = null;
    this.image = null;
    this.ready = false;
  }

  async init() {
    try {
      this.tiff = await fromUrl(this.cogUrl, {
        allowFullFile: false,
        cacheSize: 100
      });
      this.image = await this.tiff.getImage(0);
      this.ready = true;
      return true;
    } catch (e) {
      console.warn('[CogTileService] Failed to initialize COG from URL:', e);
      return false;
    }
  }

  /**
   * Fetch RGB raster window for given bounding box [minX, minY, maxX, maxY]
   */
  async readRgbWindow(bbox, width = 256, height = 256) {
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
      return canvas.toDataURL();
    } catch (e) {
      console.warn('[CogTileService] Error streaming COG window:', e);
      return null;
    }
  }
}

/**
 * Public Cloud COG Repositories (Free / Open Sentinel-2 & High-Res Overlays)
 */
export const SAUDI_COG_PRESETS = [
  {
    id: 'sentinel2_madinah',
    name: '🛰️ Sentinel-2 Cloud-Optimized GeoTIFF (Madinah Regional High-Res)',
    url: 'https://sentinel-cogs.s3.amazonaws.com/sentinel-s2-l2a-cogs/37/R/EN/2024/5/S2A_37REN_20240501_0_L2A/TCI.tif'
  },
  {
    id: 'sentinel2_riyadh',
    name: '🛰️ Sentinel-2 Cloud-Optimized GeoTIFF (Riyadh Regional High-Res)',
    url: 'https://sentinel-cogs.s3.amazonaws.com/sentinel-s2-l2a-cogs/38/R/KU/2024/5/S2A_38RKU_20240501_0_L2A/TCI.tif'
  }
];
