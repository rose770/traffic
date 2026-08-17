import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Upload, Layers, Eye, EyeOff, Trash2, RotateCcw, MapPin,
  AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Move,
  X, GripVertical, Loader2, Image as ImageIcon, Sliders, Info,
  Compass, Sparkles, Zap, Maximize2, Type, Ruler, Tag, ShieldAlert,
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, RotateCw, Target, RefreshCw,
  Lock, Unlock, Globe, Satellite
} from 'lucide-react';
import { geocodingService } from './services/geocodingService';
import {
  parseGeoTiffFile,
  autoFetchStreetGeoTiff,
  CRS_DEFINITIONS
} from './services/geoTiffService';
import html2canvas from 'html2canvas';

// ══════════════════════════════════════════════════════════════════════
// High-Definition Basemap Configurations (Ultra-HD Satellite)
// ══════════════════════════════════════════════════════════════════════
const BASEMAP_PRESETS = {
  google_satellite: {
    nameAr: 'أقمار صناعية فائقة الوضوح (Google Satellite HD)',
    nameEn: 'Google Satellite HD',
    url: 'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    maxZoom: 22,
    maxNativeZoom: 20
  },
  esri_clarity: {
    nameAr: 'صور جوية واضحة (Esri World Imagery)',
    nameEn: 'Esri World Imagery',
    url: 'https://server.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    subdomains: [],
    maxZoom: 22,
    maxNativeZoom: 19
  },
  osm_carto: {
    nameAr: 'خريطة شوارع داكنة (Carto Dark)',
    nameEn: 'CartoDB Dark Matter',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    subdomains: ['a', 'b', 'c', 'd'],
    maxZoom: 20,
    maxNativeZoom: 19
  }
};

// ══════════════════════════════════════════════════════════════════════
// Saudi MOT Traffic Engineering Palette (Traffic Signs & Barriers)
// ══════════════════════════════════════════════════════════════════════
const TRAFFIC_ELEMENTS = {
  warning: {
    titleAr: 'لوحات التحذير',
    titleEn: 'Warning Signs',
    color: '#EAB308',
    items: [
      { id: 'road_work_ahead', labelAr: 'أعمال طريق أمامك', labelEn: 'Road Work Ahead', icon: '🚧', size: [32, 32] },
      { id: 'speed_limit_40', labelAr: 'سرعة ٤٠', labelEn: 'Speed Limit 40', icon: '㊵', size: [28, 28] },
      { id: 'speed_limit_60', labelAr: 'سرعة ٦٠', labelEn: 'Speed Limit 60', icon: '㊷', size: [28, 28] },
      { id: 'speed_limit_80', labelAr: 'سرعة ٨٠', labelEn: 'Speed Limit 80', icon: '㊹', size: [28, 28] },
      { id: 'lane_closed', labelAr: 'حارة مغلقة', labelEn: 'Lane Closed', icon: '⛔', size: [28, 28] },
      { id: 'road_narrows', labelAr: 'الطريق يضيق', labelEn: 'Road Narrows', icon: '⚠️', size: [28, 28] },
      { id: 'two_way_traffic', labelAr: 'حركة مرور ثنائية', labelEn: 'Two-Way Traffic', icon: '↕️', size: [28, 28] },
    ]
  },
  barriers: {
    titleAr: 'الحواجز والمخروطات',
    titleEn: 'Barriers & Cones',
    color: '#F97316',
    items: [
      { id: 'concrete_barrier', labelAr: 'صب خرساني', labelEn: 'Concrete Barrier', icon: '🧱', size: [36, 18] },
      { id: 'water_barrier', labelAr: 'حاجز مائي', labelEn: 'Water-Filled Barrier', icon: '🔵', size: [36, 18] },
      { id: 'traffic_cone', labelAr: 'مخروط مروري', labelEn: 'Traffic Cone', icon: '🔶', size: [20, 20] },
      { id: 'channelizer', labelAr: 'مُوجِّه مروري', labelEn: 'Channelizer', icon: '🔸', size: [16, 32] },
      { id: 'delineator', labelAr: 'عاكس توجيه', labelEn: 'Delineator Post', icon: '🪧', size: [14, 32] },
      { id: 'steel_guardrail', labelAr: 'حاجز حديدي', labelEn: 'Steel Guardrail', icon: '🛡️', size: [40, 14] },
    ]
  },
  guidance: {
    titleAr: 'لوحات التوجيه',
    titleEn: 'Guidance Signs',
    color: '#22C55E',
    items: [
      { id: 'detour_arrow_right', labelAr: 'سهم تحويلة يمين', labelEn: 'Detour Arrow (Right)', icon: '➡️', size: [32, 28] },
      { id: 'detour_arrow_left', labelAr: 'سهم تحويلة يسار', labelEn: 'Detour Arrow (Left)', icon: '⬅️', size: [32, 28] },
      { id: 'flashing_arrow_board', labelAr: 'لوحة أسهم وامضة', labelEn: 'Flashing Arrow Board', icon: '🔦', size: [40, 24] },
      { id: 'directional_sign', labelAr: 'لوحة اتجاهية', labelEn: 'Directional Sign', icon: '🪧', size: [36, 24] },
      { id: 'end_road_work', labelAr: 'نهاية أعمال الطريق', labelEn: 'End Road Work', icon: '🏁', size: [28, 28] },
    ]
  },
  safety: {
    titleAr: 'السلامة والمشاة',
    titleEn: 'Safety & Pedestrian',
    color: '#0EA5E9',
    items: [
      { id: 'pedestrian_crossing', labelAr: 'عبور مشاة', labelEn: 'Pedestrian Crossing', icon: '🚶', size: [28, 28] },
      { id: 'stop_slow_paddle', labelAr: 'قف / بطئ', labelEn: 'Stop/Slow Paddle', icon: '🛑', size: [28, 28] },
      { id: 'flagman', labelAr: 'مُنظم مرور', labelEn: 'Flagman Position', icon: '🧑‍🦺', size: [24, 32] },
      { id: 'temp_lighting', labelAr: 'إنارة مؤقتة', labelEn: 'Temporary Lighting', icon: '💡', size: [20, 32] },
      { id: 'crash_truck', labelAr: 'شاحنة حماية', labelEn: 'Crash Attenuator Truck', icon: '🚛', size: [40, 20] },
      { id: 'temp_signal', labelAr: 'إشارة مرورية مؤقتة', labelEn: 'Temp Traffic Signal', icon: '🚦', size: [20, 36] },
    ]
  }
};

// AutoCAD Standard Palette
const ACI_COLORS = {
  1: '#FF1744', 2: '#FFD600', 3: '#00E676', 4: '#00E5FF', 5: '#2979FF',
  6: '#FF00FF', 7: '#FFFFFF', 8: '#9E9E9E', 9: '#BDBDBD',
  30: '#FF9100', 40: '#FFC400', 50: '#AEEA00', 60: '#76FF03',
  250: '#FFFFFF', 251: '#EEEEEE', 252: '#CCCCCC', 253: '#AAAAAA',
};

// ══════════════════════════════════════════════════════════════════════
// Ultra-HD Satellite Construction Blueprint Viewer Component
// ══════════════════════════════════════════════════════════════════════
const DwgMapOverlay = ({
  language = 'ar',
  onPlacementsChange,
  anchorLat = 24.4686,
  anchorLng = 39.6120,
  roadName = ''
}) => {
  // ── State ──
  const [uploadStatus, setUploadStatus] = useState('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [dwgData, setDwgData] = useState(null);
  const [layerVisibility, setLayerVisibility] = useState({});
  const [placedElements, setPlacedElements] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [showPalette, setShowPalette] = useState(true);
  const [activePaletteCategory, setActivePaletteCategory] = useState('warning');
  const [showLayerPanel, setShowLayerPanel] = useState(true);
  const [fileName, setFileName] = useState('');
  const [cadLineWidth, setCadLineWidth] = useState(3.5);
  const [showCadText, setShowCadText] = useState(true);
  const [selectedFeatureInfo, setSelectedFeatureInfo] = useState(null);
  const [activeBasemap, setActiveBasemap] = useState('google_satellite');
  const [isLocked, setIsLocked] = useState(false);

  // ── Smart Alignment State (Offsets in meters & degrees) ──
  const [alignOffsetX, setAlignOffsetX] = useState(0); // East-West in meters
  const [alignOffsetY, setAlignOffsetY] = useState(0); // North-South in meters
  const [cadRotationDeg, setCadRotationDeg] = useState(0); // in degrees
  const [showAlignTools, setShowAlignTools] = useState(true);

  // ── Refs ──
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const baseTileLayerRef = useRef(null);
  const geoJsonLayerRef = useRef(null);
  const markersLayerRef = useRef(null);
  const dragHandleRef = useRef(null);
  const fileInputRef = useRef(null);

  const isMapActive = uploadStatus === 'done' || dwgData !== null;

  // ── Initialize Leaflet Map with Ultra-HD Satellite Rendering ──
  useEffect(() => {
    if (!window.L || !mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.invalidateSize();
      return;
    }

    const initTimer = setTimeout(() => {
      if (!mapContainerRef.current || mapInstanceRef.current) return;

      const initialCenter = [anchorLat, anchorLng];
      const map = window.L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: 18,
        zoomControl: true,
        attributionControl: false
      });

      map.createPane('cadVectorPane');
      map.getPane('cadVectorPane').style.zIndex = '500';

      map.createPane('cadMarkerPane');
      map.getPane('cadMarkerPane').style.zIndex = '600';

      map.createPane('trafficSignsPane');
      map.getPane('trafficSignsPane').style.zIndex = '700';

      // Ultra-HD Satellite Tiles
      const preset = BASEMAP_PRESETS[activeBasemap] || BASEMAP_PRESETS.google_satellite;
      baseTileLayerRef.current = window.L.tileLayer(preset.url, {
        maxZoom: preset.maxZoom,
        maxNativeZoom: preset.maxNativeZoom,
        subdomains: preset.subdomains
      }).addTo(map);

      mapInstanceRef.current = map;
      markersLayerRef.current = window.L.layerGroup({ pane: 'trafficSignsPane' }).addTo(map);

      map.invalidateSize();
      setTimeout(() => { if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize(); }, 200);
      setTimeout(() => { if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize(); }, 600);
    }, 100);

    return () => {
      clearTimeout(initTimer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [anchorLat, anchorLng, isMapActive]);

  // ── Switch Basemap ──
  const handleBasemapChange = (key) => {
    setActiveBasemap(key);
    if (!mapInstanceRef.current) return;
    if (baseTileLayerRef.current) {
      mapInstanceRef.current.removeLayer(baseTileLayerRef.current);
    }
    const preset = BASEMAP_PRESETS[key] || BASEMAP_PRESETS.google_satellite;
    baseTileLayerRef.current = window.L.tileLayer(preset.url, {
      maxZoom: preset.maxZoom,
      maxNativeZoom: preset.maxNativeZoom,
      subdomains: preset.subdomains
    }).addTo(mapInstanceRef.current);
  };

  // ── Smart Auto-Alignment Trigger ──
  const handleSmartAutoAlign = useCallback(() => {
    if (!dwgData) return;
    if (dwgData.autoAlignment?.hasControlPoints) {
      const { dLat, dLng, rotationDeg } = dwgData.autoAlignment;
      const originLat = dwgData.centerLatLng ? dwgData.centerLatLng[0] : anchorLat;
      const metersY = dLat * 110574.61;
      const metersX = dLng * (111320 * Math.cos(originLat * Math.PI / 180));

      if (Math.abs(metersX) < 100 && Math.abs(metersY) < 100) {
        setAlignOffsetX(Number(metersX.toFixed(2)));
        setAlignOffsetY(Number(metersY.toFixed(2)));
        setCadRotationDeg(rotationDeg || 0);
      }
    } else {
      setAlignOffsetX(0);
      setAlignOffsetY(0);
      setCadRotationDeg(0);
    }
  }, [dwgData, anchorLat]);

  // ── Render CAD Drawing with Exact AutoCAD Colors & Hatching ──
  useEffect(() => {
    if (!mapInstanceRef.current || !dwgData?.geojson) return;

    if (geoJsonLayerRef.current) {
      mapInstanceRef.current.removeLayer(geoJsonLayerRef.current);
    }
    if (dragHandleRef.current) {
      mapInstanceRef.current.removeLayer(dragHandleRef.current);
      dragHandleRef.current = null;
    }

    const geojson = dwgData.geojson;
    const originLat = dwgData.centerLatLng ? dwgData.centerLatLng[0] : anchorLat;
    const originLng = dwgData.centerLatLng ? dwgData.centerLatLng[1] : anchorLng;
    const cosLat = Math.cos(originLat * Math.PI / 180);

    const dLat = alignOffsetY / 110574.61;
    const dLng = alignOffsetX / (111320 * cosLat);
    const rotRad = (cadRotationDeg * Math.PI) / 180;

    const shiftCoords = (coords) => {
      if (!coords) return coords;
      if (typeof coords[0] === 'number') {
        let lng = coords[0] + dLng;
        let lat = coords[1] + dLat;

        if (rotRad !== 0) {
          const dx = (lng - originLng) * cosLat;
          const dy = lat - originLat;
          const cosR = Math.cos(rotRad);
          const sinR = Math.sin(rotRad);
          const newDx = dx * cosR - dy * sinR;
          const newDy = dx * sinR + dy * cosR;
          return [originLng + newDx / cosLat, originLat + newDy];
        }
        return [lng, lat];
      }
      return coords.map(shiftCoords);
    };

    const filteredGeojson = {
      ...geojson,
      features: geojson.features.filter(f => {
        const props = f.properties || {};
        const layerName = props.layer || '0';
        if (layerVisibility[layerName] === false) return false;
        if (!showCadText && props.text) return false;
        return true;
      }).map(f => ({
        ...f,
        geometry: {
          ...f.geometry,
          coordinates: shiftCoords(f.geometry.coordinates)
        }
      }))
    };

    const geoJsonLayer = window.L.geoJSON(filteredGeojson, {
      pane: 'cadVectorPane',
      style: (feature) => {
        const props = feature.properties || {};
        const isPoly = feature.geometry?.type === 'Polygon';

        // Exact AutoCAD Colors
        let strokeColor = props.color || '#FFFFFF';
        let weight = cadLineWidth;
        let opacity = 1.0;
        let dashArray = null;
        let fillColor = 'transparent';
        let fillOpacity = 0;

        if (props.colorIndex === 1 || props.color === '#FF0000' || props.color === '#FF1744') {
          strokeColor = '#FF1744'; // Red Boundary Taper Line
          weight = cadLineWidth * 1.25;
        } else if (props.colorIndex === 2 || props.color === '#FFFF00' || props.color === '#FFD600') {
          strokeColor = '#FFD600'; // Yellow Lane Divider
          weight = cadLineWidth * 1.1;
        } else if (props.colorIndex === 5) {
          strokeColor = '#2979FF'; // Blue Coordinate & Dimension Leader Lines
          weight = 2;
        } else if (props.colorIndex === 7 || !props.colorIndex) {
          strokeColor = '#FFFFFF'; // White Dimension & Extension Lines
          weight = 1.8;
          opacity = 0.9;
        }

        if (props.layer === 'تنظيم') {
          strokeColor = '#00E5FF'; // Cyan Regulatory Line
          dashArray = '6, 6';
          weight = cadLineWidth * 1.2;
        }

        // Work Zone Hatch Box (Entity 35 in DWG)
        if (props.isWorkZoneHatch || (isPoly && props.vertexCount === 4 && props.lengthMeters < 50)) {
          strokeColor = '#FFFFFF';
          weight = 2.5;
          fillColor = '#0f172a'; // Clean dark hatched work obstruction box
          fillOpacity = 0.8;
          dashArray = '3, 3';
        } else if (props.isSolid) {
          fillColor = props.fillColor || strokeColor;
          fillOpacity = 0.9;
        }

        return {
          color: strokeColor,
          weight,
          opacity,
          fillColor,
          fillOpacity,
          dashArray,
          lineCap: 'round',
          lineJoin: 'round'
        };
      },
      pointToLayer: (feature, latlng) => {
        const props = feature.properties || {};

        if (props.text) {
          const rot = (props.rotationDeg || 0) + cadRotationDeg;
          const isCoord = props.tagType === 'coordinate' || props.text.startsWith('E:') || props.text.startsWith('N:');
          const isSection = props.text === 'A';
          const isZoneOrDist = props.colorIndex === 40 || props.text.includes('M') || props.text.includes('المنطقة') || props.text.includes('منطقة');

          let textCol = '#FFD600'; // Authentic AutoCAD Yellow
          let fontSz = '12px';
          let fontWt = '800';
          let bgStyle = 'background: rgba(15, 23, 42, 0.65); border: 1px solid rgba(255, 214, 0, 0.4);';

          if (isCoord) {
            textCol = '#38BDF8'; // Authentic AutoCAD Blue
            fontSz = '11.5px';
            fontWt = '800';
            bgStyle = 'background: rgba(15, 23, 42, 0.75); border: 1px solid rgba(56, 189, 248, 0.5);';
          } else if (isSection) {
            textCol = '#FFFFFF'; // Authentic AutoCAD White
            fontSz = '13px';
            fontWt = '900';
            bgStyle = 'background: transparent; border: none;';
          }

          return window.L.marker(latlng, {
            pane: 'cadMarkerPane',
            icon: window.L.divIcon({
              className: 'cad-rotated-text',
              html: `<div style="
                color: ${textCol};
                font-family: 'Consolas', monospace, sans-serif;
                font-size: ${fontSz};
                font-weight: ${fontWt};
                white-space: nowrap;
                transform: rotate(${-rot}deg);
                transform-origin: center;
                text-shadow: 0 0 4px #000, 0 0 8px #000, 0 1px 2px #000;
                padding: 1px 5px;
                border-radius: 4px;
                ${bgStyle}
                display: inline-block;
                pointer-events: auto;
              ">
                ${props.text}
              </div>`,
              iconSize: [140, 20],
              iconAnchor: [70, 10]
            })
          });
        }

        return window.L.circleMarker(latlng, {
          pane: 'cadVectorPane',
          radius: 3,
          color: props.color || '#FFD600',
          weight: 1.5,
          fillOpacity: 0.9,
          fillColor: '#FFFFFF'
        });
      },
      onEachFeature: (feature, layer) => {
        const props = feature.properties || {};
        const roleText = props.roleAr || (language === 'ar' ? 'عنصر مخطط هندسي' : 'CAD Engineering Element');

        const tooltipHtml = `
          <div style="font-family: sans-serif; font-size: 11px; padding: 2px; direction: ${language === 'ar' ? 'rtl' : 'ltr'};">
            <div style="font-weight: bold; color: #0284c7; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">
              <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${props.color || '#FFD600'}"></span>
              ${roleText}
            </div>
            <div><b>الطبقة:</b> <span style="font-family:monospace">${props.layer}</span></div>
            <div><b>النوع:</b> ${props.type}</div>
            ${props.lengthMeters ? `<div style="color: #16a34a; font-weight:bold;"><b>الطول:</b> ${props.lengthMeters} م</div>` : ''}
            ${props.bearingDeg !== undefined ? `<div><b>الاتجاه:</b> ${props.bearingDeg}°</div>` : ''}
            ${props.text ? `<div style="color:#d97706"><b>النص:</b> ${props.text}</div>` : ''}
          </div>
        `;

        layer.bindTooltip(tooltipHtml, { sticky: true, className: 'cad-rich-tooltip' });

        layer.on('click', () => {
          setSelectedFeatureInfo({
            layer: props.layer,
            type: props.type,
            roleAr: props.roleAr,
            roleEn: props.roleEn,
            color: props.color,
            lengthMeters: props.lengthMeters,
            bearingDeg: props.bearingDeg,
            text: props.text,
            startUtm: props.startUtm,
            endUtm: props.endUtm
          });
        });
      }
    });

    geoJsonLayer.addTo(mapInstanceRef.current);
    geoJsonLayerRef.current = geoJsonLayer;

    // Interactive Drag Handle to reposition entire CAD drawing directly on the map
    if (!isLocked) {
      try {
        const bounds = geoJsonLayer.getBounds();
        if (bounds.isValid()) {
          const center = bounds.getCenter();
          const dragHandle = window.L.marker(center, {
            draggable: true,
            pane: 'cadMarkerPane',
            icon: window.L.divIcon({
              className: 'cad-center-drag-handle',
              html: `<div style="
                background: linear-gradient(135deg, #0284c7, #0369a1);
                color: white;
                border-radius: 50%;
                width: 36px;
                height: 36px;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 15px rgba(0,0,0,0.6), 0 0 10px #38bdf8;
                cursor: grab;
                font-size: 18px;
                border: 3px solid white;
                user-select: none;
              " title="${language === 'ar' ? 'اسحب من هنا لتحريك ومطابقة المخطط على الشارع مباشرة' : 'Drag to align CAD drawing onto road'}">
                ✥
              </div>`,
              iconSize: [36, 36],
              iconAnchor: [18, 18]
            }),
            zIndexOffset: 2000
          });

          let dragStartLatLng = null;

          dragHandle.on('dragstart', (e) => {
            dragStartLatLng = e.target.getLatLng();
            e.target.getElement().style.cursor = 'grabbing';
          });

          dragHandle.on('dragend', (e) => {
            e.target.getElement().style.cursor = 'grab';
            const newPos = e.target.getLatLng();
            if (dragStartLatLng) {
              const deltaLat = newPos.lat - dragStartLatLng.lat;
              const deltaLng = newPos.lng - dragStartLatLng.lng;
              const shiftMetersY = deltaLat * 110574.61;
              const shiftMetersX = deltaLng * (111320 * cosLat);

              setAlignOffsetX(prev => Number((prev + shiftMetersX).toFixed(2)));
              setAlignOffsetY(prev => Number((prev + shiftMetersY).toFixed(2)));
            }
          });

          dragHandle.addTo(mapInstanceRef.current);
          dragHandleRef.current = dragHandle;
        }
      } catch (e) {
        console.warn('Could not add drag handle:', e);
      }
    }
  }, [dwgData, layerVisibility, alignOffsetX, alignOffsetY, cadRotationDeg, cadLineWidth, showCadText, isLocked, anchorLat, anchorLng, language]);

  // ── Render Placed Traffic Elements ──
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();

    placedElements.forEach((el, idx) => {
      const cat = Object.values(TRAFFIC_ELEMENTS).find(c => c.items.some(i => i.id === el.type));
      const itemDef = cat?.items.find(i => i.id === el.type) || { icon: '📍', size: [24, 24], labelAr: el.type, labelEn: el.type };

      const marker = window.L.marker([el.lat, el.lng], {
        draggable: true,
        pane: 'trafficSignsPane',
        icon: window.L.divIcon({
          className: 'traffic-element-marker',
          html: `<div style="
            transform: rotate(${el.rotation || 0}deg);
            width:${itemDef.size[0]}px;
            height:${itemDef.size[1]}px;
            display:flex;
            align-items:center;
            justify-content:center;
            font-size:${Math.min(itemDef.size[0], itemDef.size[1]) - 4}px;
            filter: drop-shadow(0 2px 5px rgba(0,0,0,0.6));
            cursor: grab;
            text-align:center;
            position:relative;
          " title="${language === 'ar' ? itemDef.labelAr : itemDef.labelEn}">
            ${itemDef.icon}
            <div style="position:absolute;bottom:-14px;left:50%;transform:translateX(-50%);font-size:8px;background:rgba(0,0,0,0.85);color:white;padding:1px 4px;border-radius:3px;white-space:nowrap">${language === 'ar' ? itemDef.labelAr : itemDef.labelEn}</div>
          </div>`,
          iconSize: [itemDef.size[0], itemDef.size[1] + 16],
          iconAnchor: [itemDef.size[0] / 2, itemDef.size[1] / 2]
        })
      });

      marker.on('dragend', (e) => {
        const { lat, lng } = e.target.getLatLng();
        setPlacedElements(prev => {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], lat, lng };
          return updated;
        });
      });

      marker.on('click', () => {
        setPlacedElements(prev => {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], rotation: ((updated[idx].rotation || 0) + 45) % 360 };
          return updated;
        });
      });

      marker.on('contextmenu', (e) => {
        window.L.DomEvent.stopPropagation(e);
        setPlacedElements(prev => prev.filter((_, i) => i !== idx));
      });

      markersLayerRef.current.addLayer(marker);
    });

    if (onPlacementsChange) onPlacementsChange(placedElements);
  }, [placedElements, language]);

  // ── DWG File Upload Handler ──
  const handleFileUpload = useCallback(async (file) => {
    if (!file) return;
    const nameLower = file.name.toLowerCase();

    if (!nameLower.endsWith('.dwg') && !nameLower.endsWith('.dxf')) {
      setErrorMessage(language === 'ar' ? 'يرجى رفع ملف DWG أو DXF' : 'Please upload a DWG or DXF file');
      setUploadStatus('error');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setErrorMessage(language === 'ar' ? 'حجم الملف يتجاوز 50 ميجابايت' : 'File size exceeds 50MB limit');
      setUploadStatus('error');
      return;
    }

    setFileName(file.name);
    setUploadStatus('uploading');
    setUploadProgress(0);
    setErrorMessage('');

    try {
      const formData = new FormData();
      formData.append('dwgFile', file);
      formData.append('anchorLat', anchorLat.toString());
      formData.append('anchorLng', anchorLng.toString());

      setUploadProgress(30);
      setUploadStatus('parsing');

      const response = await fetch('/api/parse-dwg', {
        method: 'POST',
        body: formData
      });

      setUploadProgress(80);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Parsing failed');
      }

      setUploadProgress(100);
      setDwgData(data);

      const visibility = {};
      (data.layers || []).forEach(l => { visibility[l.name] = l.visible !== false; });
      setLayerVisibility(visibility);

      // Auto-apply smart alignment if control points were detected
      if (data.autoAlignment?.hasControlPoints) {
        const { dLat, dLng, rotationDeg } = data.autoAlignment;
        const originLat = data.centerLatLng ? data.centerLatLng[0] : anchorLat;
        const metersY = dLat * 110574.61;
        const metersX = dLng * (111320 * Math.cos(originLat * Math.PI / 180));
        if (Math.abs(metersX) < 100 && Math.abs(metersY) < 100) {
          setAlignOffsetX(Number(metersX.toFixed(2)));
          setAlignOffsetY(Number(metersY.toFixed(2)));
          setCadRotationDeg(rotationDeg || 0);
        } else {
          setAlignOffsetX(0);
          setAlignOffsetY(0);
          setCadRotationDeg(0);
        }
      } else {
        setAlignOffsetX(0);
        setAlignOffsetY(0);
        setCadRotationDeg(0);
      }

      setUploadStatus('done');

      // Auto-zoom to CAD drawing bounds
      if (data.gpsBounds && mapInstanceRef.current) {
        mapInstanceRef.current.fitBounds(data.gpsBounds, { padding: [60, 60], maxZoom: 19 });
      }
    } catch (err) {
      console.error('[DWG] Upload error:', err);
      setErrorMessage(err.message || 'Failed to parse file');
      setUploadStatus('error');
    }
  }, [language, anchorLat, anchorLng]);

  // ── Drag & Drop Handlers ──
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const handleFileInput = useCallback((e) => {
    const file = e.target.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const handleAddElement = useCallback((elementId) => {
    if (!mapInstanceRef.current) return;
    const center = mapInstanceRef.current.getCenter();
    const offset = () => (Math.random() - 0.5) * 0.001;
    const newElement = {
      id: `el_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: elementId,
      lat: center.lat + offset(),
      lng: center.lng + offset(),
      rotation: 0
    };
    setPlacedElements(prev => [...prev, newElement]);
  }, []);

  // ── Reset Everything ──
  const handleReset = useCallback(() => {
    setUploadStatus('idle');
    setDwgData(null);
    setLayerVisibility({});
    setPlacedElements([]);
    setSelectedFeatureInfo(null);
    setFileName('');
    setErrorMessage('');
    setAlignOffsetX(0);
    setAlignOffsetY(0);
    setCadRotationDeg(0);
    if (geoJsonLayerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(geoJsonLayerRef.current);
      geoJsonLayerRef.current = null;
    }
    if (markersLayerRef.current) markersLayerRef.current.clearLayers();
    if (dragHandleRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(dragHandleRef.current);
      dragHandleRef.current = null;
    }
    if (mapInstanceRef.current) mapInstanceRef.current.setView([anchorLat, anchorLng], 18);
  }, [anchorLat, anchorLng]);

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-4">
      {/* ── Drop Zone (shown when idle) ── */}
      {!isMapActive && uploadStatus === 'idle' && (
        <div
          className={`border-2 border-dashed rounded-2xl p-8 text-center relative cursor-pointer transition-all duration-300 ${
            dragOver
              ? 'border-brand-primary bg-brand-primary/5 scale-[1.01] shadow-lg shadow-brand-primary/20'
              : 'border-slate-300 hover:border-brand-primary/60 bg-slate-50 hover:bg-slate-100/50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".dwg,.dxf"
            onChange={handleFileInput}
            className="hidden"
          />
          <div className={`transition-transform duration-300 ${dragOver ? 'scale-110' : ''}`}>
            <div className="flex justify-center gap-3 mb-3">
              <Upload className={`h-10 w-10 transition-colors ${dragOver ? 'text-brand-primary' : 'text-blue-600'}`} />
              <ImageIcon className={`h-10 w-10 transition-colors ${dragOver ? 'text-brand-primary' : 'text-emerald-500'}`} />
            </div>
            <p className="text-sm font-bold text-slate-800">
              {language === 'ar'
                ? 'اسحب وأفلت مخطط DWG أو DXF هنا'
                : 'Drag & Drop DWG CAD file here'}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {language === 'ar'
                ? '⚡ صور فضائية فائقة الدقة (Google Satellite HD) مع ألوان ونصوص ومحاذاة AutoCAD المعتمدة'
                : '⚡ Ultra-HD Satellite imagery with authentic AutoCAD colors, texts & alignment'}
            </p>
          </div>
        </div>
      )}

      {/* ── Progress Indicator ── */}
      {(uploadStatus === 'uploading' || uploadStatus === 'parsing') && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center space-y-3 shadow-sm">
          <div className="animate-spin h-10 w-10 border-4 border-brand-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-sm font-bold text-slate-700">
            {uploadStatus === 'uploading'
              ? (language === 'ar' ? `جاري رفع ${fileName}...` : `Uploading ${fileName}...`)
              : (language === 'ar' ? 'جاري استيراد الألوان والنصوص وحساب المطابقة المساحية...' : 'Importing AutoCAD colors, texts & auto-aligning...')}
          </p>
          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 via-emerald-500 to-brand-gold rounded-full transition-all duration-500"
              style={{ width: `${uploadProgress || 75}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Error State ── */}
      {uploadStatus === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-bold text-sm">
              {language === 'ar' ? 'خطأ في تحليل الملف' : 'File Parsing Error'}
            </span>
          </div>
          <p className="text-xs text-red-600">{errorMessage}</p>
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs font-bold text-red-700 hover:text-red-800 transition"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {language === 'ar' ? 'إعادة المحاولة' : 'Try Again'}
          </button>
        </div>
      )}

      {/* ── Active Construction Site Map View ── */}
      {isMapActive && (
        <div className="space-y-3">
          {/* Top Control Toolbar */}
          <div className="bg-slate-900 text-white rounded-xl p-3 text-xs space-y-2.5 shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
              <div className="flex flex-wrap items-center gap-2">
                <Compass className="h-4 w-4 text-brand-gold" />
                <span className="font-bold text-sm text-brand-gold">
                  {language === 'ar' ? 'خريطة الأقمار الصناعية ومخطط التحويلات المرورية' : 'Satellite HD & CAD Construction Map'}
                </span>
                {dwgData && (
                  <span className="bg-blue-900/80 text-blue-300 border border-blue-700/60 px-2 py-0.5 rounded text-[10px] font-bold">
                    📐 {dwgData.fileName} ({dwgData.totalFeatures} {language === 'ar' ? 'عنصر' : 'features'})
                  </span>
                )}
              </div>

              {/* Action Buttons & Basemap Selector */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
                  <Satellite className="h-3.5 w-3.5 text-brand-gold" />
                  <select
                    value={activeBasemap}
                    onChange={(e) => handleBasemapChange(e.target.value)}
                    className="bg-slate-900 text-slate-200 font-bold text-[10px] rounded px-1.5 py-0.5 focus:outline-none cursor-pointer"
                  >
                    <option value="google_satellite">🛰️ Google Satellite HD (فائق الوضوح)</option>
                    <option value="esri_clarity">🌍 Esri World Imagery (صور جوية)</option>
                    <option value="osm_carto">🗺️ CartoDB Dark (خريطة داكنة)</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-blue-700 hover:bg-blue-600 text-white px-2.5 py-1 rounded text-[10px] font-bold transition shadow"
                >
                  {language === 'ar' ? 'تغيير DWG' : 'Change DWG'}
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  className="text-red-400 hover:text-red-300 font-bold text-[10px] flex items-center gap-1 px-2 py-1 bg-red-950/40 border border-red-800/40 rounded transition"
                >
                  <Trash2 className="h-3 w-3" />
                  {language === 'ar' ? 'إعادة ضبط' : 'Reset'}
                </button>
              </div>
            </div>

            {/* Controls Row: Auto-Align, Lock, Text Toggle, Width */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-[10.5px]">
              <div className="flex flex-wrap items-center gap-2">
                {/* 🎯 SMART AUTO-ALIGN BUTTON */}
                <button
                  type="button"
                  onClick={handleSmartAutoAlign}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-3 py-1 rounded-lg font-bold shadow transition transform active:scale-95"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                  <span>{language === 'ar' ? 'المحاذاة الذكية التلقائية' : 'Smart Auto-Align'}</span>
                </button>

                {/* Lock/Unlock Drag Handle */}
                <button
                  type="button"
                  onClick={() => setIsLocked(!isLocked)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold transition border ${
                    isLocked ? 'bg-amber-950/80 border-amber-500 text-amber-300' : 'bg-blue-950/80 border-blue-500 text-blue-300'
                  }`}
                  title={isLocked ? 'المخطط مثبت - انقر لفك التثبيت والتحريك' : 'المخطط قابل للتحريك بالسحب'}
                >
                  {isLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                  <span>{isLocked ? (language === 'ar' ? 'المخطط مقفل' : 'Locked') : (language === 'ar' ? 'السحب مفعّل ✥' : 'Drag Active ✥')}</span>
                </button>

                {/* Fine-Tuning Tools Toggle */}
                <button
                  type="button"
                  onClick={() => setShowAlignTools(!showAlignTools)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold transition border ${
                    showAlignTools
                      ? 'bg-blue-900/90 border-blue-500 text-blue-200'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Sliders className="h-3 w-3 text-brand-gold" />
                  <span>{language === 'ar' ? 'لوحة التدوير والإزاحة' : 'Nudge & Rotate'}</span>
                </button>

                {/* CAD Text Toggle */}
                <button
                  type="button"
                  onClick={() => setShowCadText(!showCadText)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold transition border ${
                    showCadText
                      ? 'bg-amber-950/70 border-amber-500/60 text-amber-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  <Type className="h-3 w-3" />
                  {showCadText ? 'نصوص CAD: مفعّلة' : 'نصوص CAD: مخفية'}
                </button>

                {/* CAD Line Thickness Selector */}
                <div className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded border border-slate-700 text-[10px]">
                  <span className="text-slate-400">{language === 'ar' ? 'سُمك الخط:' : 'Width:'}</span>
                  <select
                    value={cadLineWidth}
                    onChange={(e) => setCadLineWidth(parseFloat(e.target.value))}
                    className="bg-slate-900 text-blue-300 font-bold text-[10px] rounded px-1.5 py-0.5 focus:outline-none cursor-pointer"
                  >
                    <option value="2">2px (عادي)</option>
                    <option value="3.5">3.5px (واضح - AutoCAD)</option>
                    <option value="5">5px (عريض جداً)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ── EXPANDABLE FINE-ALIGNMENT TOOLS PANEL ── */}
            {showAlignTools && (
              <div className="bg-slate-950/95 border border-slate-700 rounded-lg p-2.5 space-y-2 animate-in fade-in duration-150 text-[11px]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {/* Nudge Direction Buttons */}
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-bold">{language === 'ar' ? 'الإزاحة الدقيقة (متر):' : 'Fine Nudge (m):'}</span>
                    <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setAlignOffsetY(prev => prev + 1)}
                        className="p-1 hover:bg-slate-800 rounded text-slate-200"
                        title="تحريك شمال (+1m)"
                      >
                        <ArrowUp className="h-3.5 w-3.5 text-blue-400" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setAlignOffsetY(prev => prev - 1)}
                        className="p-1 hover:bg-slate-800 rounded text-slate-200"
                        title="تحريك جنوب (-1m)"
                      >
                        <ArrowDown className="h-3.5 w-3.5 text-blue-400" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setAlignOffsetX(prev => prev - 1)}
                        className="p-1 hover:bg-slate-800 rounded text-slate-200"
                        title="تحريك غرب (-1m)"
                      >
                        <ArrowLeft className="h-3.5 w-3.5 text-blue-400" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setAlignOffsetX(prev => prev + 1)}
                        className="p-1 hover:bg-slate-800 rounded text-slate-200"
                        title="تحريك شرق (+1m)"
                      >
                        <ArrowRight className="h-3.5 w-3.5 text-blue-400" />
                      </button>
                    </div>
                    <span className="font-mono text-emerald-400 text-[10.5px]">
                      ΔX: {alignOffsetX >= 0 ? `+${alignOffsetX}` : alignOffsetX}m | ΔY: {alignOffsetY >= 0 ? `+${alignOffsetY}` : alignOffsetY}m
                    </span>
                  </div>

                  {/* Rotation Slider */}
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-bold">{language === 'ar' ? 'زاوية التدوير:' : 'Rotation Angle:'}</span>
                    <input
                      type="range"
                      min="-45"
                      max="45"
                      step="0.2"
                      value={cadRotationDeg}
                      onChange={(e) => setCadRotationDeg(parseFloat(e.target.value))}
                      className="w-28 accent-brand-gold cursor-pointer h-1.5"
                    />
                    <span className="font-mono text-brand-gold text-[11px] w-14 text-left font-bold">
                      {cadRotationDeg >= 0 ? `+${cadRotationDeg.toFixed(1)}` : cadRotationDeg.toFixed(1)}°
                    </span>
                  </div>

                  {/* Reset Alignment */}
                  <button
                    type="button"
                    onClick={() => { setAlignOffsetX(0); setAlignOffsetY(0); setCadRotationDeg(0); }}
                    className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white px-2 py-1 bg-slate-900 border border-slate-800 rounded"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>{language === 'ar' ? 'تصفير الإزاحة' : 'Reset Offset'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ─ Main Map Container (Ultra-HD Satellite View) ─ */}
          <div className="relative rounded-xl overflow-hidden border border-slate-300 shadow-lg" style={{ height: '560px' }}>
            <div ref={mapContainerRef} className="absolute inset-0 z-0" />

            {/* Instruction Badge */}
            {!isLocked && (
              <div className="absolute top-3 left-3 z-10 bg-slate-950/85 text-blue-300 px-3 py-1.5 rounded-xl text-[10.5px] font-bold backdrop-blur-md border border-blue-500/40 shadow-lg flex items-center gap-1.5 animate-pulse">
                <span>✥</span>
                <span>{language === 'ar' ? 'اسحب المقبض الدائري الأزرق لتحريك ومطابقة المخطط على الشارع' : 'Drag the blue center handle to align CAD with street'}</span>
              </div>
            )}

            {/* Status Badges */}
            <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5 items-end">
              <div className="bg-slate-950/85 text-emerald-400 px-2.5 py-1 rounded-lg text-[9.5px] font-bold backdrop-blur-md border border-emerald-500/30 shadow">
                🛰️ Ultra-HD Satellite (Zoom 18-22)
              </div>
              {dwgData && (
                <div className="bg-slate-950/85 text-blue-300 px-2.5 py-1 rounded-lg text-[9.5px] font-bold backdrop-blur-md border border-blue-500/30 shadow">
                  📐 AutoCAD Blueprint ({dwgData.totalFeatures} features)
                </div>
              )}
            </div>

            {/* Selected Feature Info Floating Card */}
            {selectedFeatureInfo && (
              <div className="absolute bottom-4 left-4 z-20 bg-slate-950/90 backdrop-blur-md text-white border border-slate-700 rounded-xl p-3.5 max-w-sm shadow-2xl space-y-2 animate-in fade-in zoom-in duration-150">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedFeatureInfo.color || '#FFD600' }}></span>
                    <span className="font-bold text-xs text-brand-gold">
                      {selectedFeatureInfo.roleAr || 'عنصر هندسي'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFeatureInfo(null)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                  <div>
                    <span className="text-slate-400">{language === 'ar' ? 'الطبقة:' : 'Layer:'}</span>{' '}
                    <span className="font-mono text-white">{selectedFeatureInfo.layer}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">{language === 'ar' ? 'النوع:' : 'Type:'}</span>{' '}
                    <span className="font-mono text-white">{selectedFeatureInfo.type}</span>
                  </div>
                  {selectedFeatureInfo.lengthMeters && (
                    <div className="col-span-2 text-emerald-400 font-bold flex items-center gap-1">
                      <Ruler className="h-3 w-3" />
                      <span>{language === 'ar' ? `الطول الهندسي: ${selectedFeatureInfo.lengthMeters} متر` : `Length: ${selectedFeatureInfo.lengthMeters} m`}</span>
                    </div>
                  )}
                  {selectedFeatureInfo.bearingDeg !== undefined && (
                    <div>
                      <span className="text-slate-400">{language === 'ar' ? 'الاتجاه:' : 'Bearing:'}</span>{' '}
                      <span className="font-mono text-white">{selectedFeatureInfo.bearingDeg}°</span>
                    </div>
                  )}
                  {selectedFeatureInfo.text && (
                    <div className="col-span-2 text-amber-300 font-semibold bg-slate-900 p-1.5 rounded">
                      <span>{selectedFeatureInfo.text}</span>
                    </div>
                  )}
                </div>

                {selectedFeatureInfo.startUtm && (
                  <div className="text-[9.5px] font-mono text-slate-400 border-t border-slate-800 pt-1.5">
                    UTM 37N: E {selectedFeatureInfo.startUtm.x}, N {selectedFeatureInfo.startUtm.y}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ─ Bottom Panels: CAD Layers & Traffic Palette ─ */}
          <div className="flex flex-col md:flex-row gap-3">
            {/* CAD Layer Control Panel */}
            {dwgData && (
              <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => setShowLayerPanel(!showLayerPanel)}
                  className="w-full flex items-center justify-between p-3 bg-slate-900 text-white text-[11px] font-bold"
                >
                  <span className="flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-brand-gold" />
                    {language === 'ar' ? `طبقات المخطط (${dwgData.layers?.length || 0})` : `CAD Layers (${dwgData.layers?.length || 0})`}
                  </span>
                  {showLayerPanel ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
                {showLayerPanel && (
                  <div className="p-2 max-h-[220px] overflow-y-auto space-y-1 custom-scrollbar">
                    {(dwgData.layers || []).map(layer => (
                      <button
                        key={layer.name}
                        type="button"
                        onClick={() => setLayerVisibility(prev => ({ ...prev, [layer.name]: !prev[layer.name] }))}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[10.5px] font-medium transition ${
                          layerVisibility[layer.name] !== false
                            ? 'bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200'
                            : 'bg-slate-100 text-slate-400 line-through border border-transparent'
                        }`}
                      >
                        {layerVisibility[layer.name] !== false
                          ? <Eye className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          : <EyeOff className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                        <span
                          className="w-3 h-3 rounded-full border border-slate-300 shrink-0"
                          style={{ backgroundColor: ACI_COLORS[layer.color] || '#AAAAAA' }}
                        />
                        <span className="truncate text-left font-mono text-[10px]">{layer.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Saudi MOT Traffic Engineering Palette */}
            <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
              <button
                type="button"
                onClick={() => setShowPalette(!showPalette)}
                className="w-full flex items-center justify-between p-3 bg-slate-900 text-white text-[11px] font-bold shrink-0"
              >
                <span className="flex items-center gap-1.5">
                  <GripVertical className="h-4 w-4 text-brand-gold" />
                  {language === 'ar' ? 'عناصر التحكم المروري واللوحات (MOT)' : 'Saudi MOT Traffic Signs & Safety Elements'}
                </span>
                {showPalette ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>

              {showPalette && (
                <div className="flex flex-col flex-1 overflow-hidden">
                  <div className="flex border-b border-slate-200 bg-slate-50 shrink-0">
                    {Object.entries(TRAFFIC_ELEMENTS).map(([key, cat]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setActivePaletteCategory(key)}
                        className={`flex-1 py-2 text-[10px] font-bold transition border-b-2 ${
                          activePaletteCategory === key
                            ? 'border-current text-slate-900 bg-white shadow-sm'
                            : 'border-transparent text-slate-400 hover:text-slate-600'
                        }`}
                        style={activePaletteCategory === key ? { color: cat.color } : {}}
                        title={language === 'ar' ? cat.titleAr : cat.titleEn}
                      >
                        {cat.items[0]?.icon}
                      </button>
                    ))}
                  </div>

                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-700 bg-slate-50 border-b border-slate-100 shrink-0"
                       style={{ color: TRAFFIC_ELEMENTS[activePaletteCategory]?.color }}>
                    {language === 'ar'
                      ? TRAFFIC_ELEMENTS[activePaletteCategory]?.titleAr
                      : TRAFFIC_ELEMENTS[activePaletteCategory]?.titleEn}
                  </div>

                  <div className="p-2 overflow-y-auto max-h-[170px] custom-scrollbar">
                    <div className="grid grid-cols-2 gap-1.5">
                      {TRAFFIC_ELEMENTS[activePaletteCategory]?.items.map(item => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleAddElement(item.id)}
                          className="flex flex-col items-center gap-1 p-2 rounded-xl border border-slate-200 hover:border-brand-primary hover:bg-brand-primary/5 transition text-center group cursor-grab active:cursor-grabbing shadow-xs"
                          title={language === 'ar' ? item.labelAr : item.labelEn}
                        >
                          <span className="text-xl group-hover:scale-115 transition-transform">{item.icon}</span>
                          <span className="text-[9px] font-medium text-slate-700 leading-tight">
                            {language === 'ar' ? item.labelAr : item.labelEn}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-2 bg-slate-50 border-t border-slate-200 text-[8.5px] text-slate-500 shrink-0 space-y-0.5">
                    <p>🖱️ {language === 'ar' ? 'انقر لإضافة العنصر على مركز الخريطة' : 'Click to add at map center'}</p>
                    <p>✋ {language === 'ar' ? 'اسحب العنصر لتحديد موقعه الدقيق' : 'Drag element to position'}</p>
                    <p>🔄 {language === 'ar' ? 'انقر على العنصر للتدوير 45 درجة' : 'Click placed element to rotate'}</p>
                    <p>🗑️ {language === 'ar' ? 'انقر بالزر الأيمن للحذف' : 'Right-click to delete'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ─ Placed Elements Summary ─ */}
          {placedElements.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800">
                  {language === 'ar' ? `العناصر المرورية الموضوعة (${placedElements.length})` : `Placed Traffic Elements (${placedElements.length})`}
                </span>
                <button
                  type="button"
                  onClick={() => setPlacedElements([])}
                  className="text-[10px] text-red-600 hover:text-red-700 font-bold flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" />
                  {language === 'ar' ? 'مسح الكل' : 'Clear All'}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {placedElements.map((el, idx) => {
                  const cat = Object.values(TRAFFIC_ELEMENTS).find(c => c.items.some(i => i.id === el.type));
                  const item = cat?.items.find(i => i.id === el.type);
                  return (
                    <div key={el.id} className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-[10px] shadow-xs group">
                      <span>{item?.icon}</span>
                      <span className="font-medium text-slate-700">{language === 'ar' ? item?.labelAr : item?.labelEn}</span>
                      <span className="text-[9px] text-slate-400 font-mono">({el.rotation || 0}°)</span>
                      <button
                        type="button"
                        onClick={() => setPlacedElements(prev => prev.filter((_, i) => i !== idx))}
                        className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition ml-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DwgMapOverlay;
