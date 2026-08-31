import React, { useRef, useEffect, useMemo } from 'react';
import {
  FileText, Download, Printer, X, CheckCircle,
  MapPin, Shield, Compass, Calendar, Building2,
  HardHat, AlertTriangle, Layers, Ruler, Sparkles,
  TrafficCone, Zap, Award, CheckCircle2
} from 'lucide-react';
import { exportDocxReport } from '../docxExport';

// ── Rich SVG/HTML Renderer for Saudi MOT Signs & Barrier Posters in Report ──
export const renderReportMotItemHtml = (type, rotation = 0, isAr = true) => {
  const rotStyle = `transform: rotate(${rotation}deg); transform-origin: center;`;

  switch (type) {
    case 'concrete_njb_poster':
      return `
        <div style="${rotStyle} display:flex; flex-direction:column; align-items:center; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));">
          <div style="background:#dc2626; color:white; font-family:system-ui,sans-serif; font-size:6px; font-weight:800; padding:1px 3px; border-radius:2px; white-space:nowrap; border:0.5px solid #991b1b; margin-bottom:1px;">
            CONCRETE NJB
          </div>
          <svg width="44" height="22" viewBox="0 0 84 48">
            <polygon points="12,42 72,42 62,18 22,18" fill="#94a3b8" stroke="#475569" stroke-width="1.5" />
            <rect x="36" y="18" width="12" height="24" fill="#ef4444" stroke="#b91c1c" stroke-width="1" />
            <rect x="8" y="42" width="68" height="5" fill="#475569" rx="1.5" />
            <circle cx="26" cy="11" r="4.5" fill="#facc15" stroke="#ca8a04" stroke-width="1" />
            <circle cx="58" cy="11" r="4.5" fill="#facc15" stroke="#ca8a04" stroke-width="1" />
          </svg>
        </div>
      `;

    case 'plastic_njb_poster':
      return `
        <div style="${rotStyle} display:flex; flex-direction:column; align-items:center; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));">
          <div style="background:#dc2626; color:white; font-family:system-ui,sans-serif; font-size:6px; font-weight:800; padding:1px 3px; border-radius:2px; white-space:nowrap; border:0.5px solid #991b1b; margin-bottom:1px;">
            PLASTIC NJB
          </div>
          <svg width="44" height="22" viewBox="0 0 84 48">
            <path d="M 8 42 L 14 18 L 32 18 L 36 42 Z" fill="#ef4444" stroke="#b91c1c" stroke-width="1.5" />
            <path d="M 32 42 L 38 18 L 56 18 L 60 42 Z" fill="#2563eb" stroke="#1d4ed8" stroke-width="1.5" />
            <path d="M 56 42 L 62 18 L 76 18 L 78 42 Z" fill="#ef4444" stroke="#b91c1c" stroke-width="1.5" />
            <circle cx="22" cy="11" r="4.5" fill="#facc15" stroke="#ca8a04" stroke-width="1" />
            <circle cx="68" cy="11" r="4.5" fill="#facc15" stroke="#ca8a04" stroke-width="1" />
          </svg>
        </div>
      `;

    case 'road_work_ends_poster':
      return `
        <div style="${rotStyle} position:relative; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));">
          <div style="background:#fef08a; border:1.5px solid #ca8a04; border-radius:3px; padding:2px 4px; text-align:center; color:#713f12; font-weight:900; font-size:7px;">
            <div>نهاية العمل</div>
            <div style="font-size:5.5px; border-top:0.5px solid #ca8a04; margin-top:1px;">END WORK</div>
          </div>
        </div>
      `;

    case 'solar_vms_arrow_board':
      return `
        <div style="${rotStyle} background:#0f172a; border:1.5px solid #eab308; border-radius:3px; padding:2px 4px; text-align:center; box-shadow:0 2px 4px rgba(0,0,0,0.5);">
          <div style="color:#facc15; font-size:9px; font-weight:bold; letter-spacing:1px;">▶▶</div>
          <div style="color:#ffffff; font-size:6px; font-weight:bold;">تحويلة</div>
        </div>
      `;

    case 'crash_cushion_tma':
      return `
        <div style="${rotStyle} background:#b45309; border:1.5px solid #fbbf24; border-radius:3px; padding:2px 4px; color:white; font-size:6px; font-weight:bold; text-align:center; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));">
          🚛 TMA CUSHION
        </div>
      `;

    case 'mobile_light_tower':
      return `
        <div style="${rotStyle} background:#0369a1; border:1.5px solid #38bdf8; border-radius:50%; width:20px; height:20px; display:flex; align-items:center; justify-content:center; color:white; font-size:10px; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));">
          🗼
        </div>
      `;

    case 'stop_sign':
      return `
        <div style="${rotStyle} filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));">
          <svg width="22" height="22" viewBox="0 0 40 40">
            <polygon points="12,2 28,2 38,12 38,28 28,38 12,38 2,28 2,12" fill="#dc2626" stroke="#ffffff" stroke-width="2.5" />
            <text x="20" y="25" text-anchor="middle" fill="#ffffff" font-weight="900" font-size="11" font-family="system-ui, Arial, sans-serif">STOP</text>
          </svg>
        </div>
      `;

    case 'give_way':
      return `
        <div style="${rotStyle} filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));">
          <svg width="22" height="22" viewBox="0 0 40 40">
            <polygon points="20,38 2,4 38,4" fill="#ffffff" stroke="#dc2626" stroke-width="4" />
          </svg>
        </div>
      `;

    case 'slow_sign':
      return `
        <div style="${rotStyle} width:20px; height:20px; border-radius:50%; background:#f59e0b; border:1.5px solid white; display:flex; align-items:center; justify-content:center; color:#000; font-weight:900; font-size:7px; box-shadow:0 2px 4px rgba(0,0,0,0.5);">
          SLOW
        </div>
      `;

    case 'speed_limit_30':
    case 'speed_limit_40':
    case 'speed_limit_50':
    case 'speed_limit_60':
    case 'speed_limit_70':
    case 'speed_limit_80':
    case 'speed_limit_100': {
      const num = type.replace('speed_limit_', '');
      return `
        <div style="${rotStyle} width:20px; height:20px; border-radius:50%; background:#ffffff; border:2px solid #dc2626; display:flex; align-items:center; justify-content:center; color:#000; font-weight:900; font-size:8px; box-shadow:0 2px 4px rgba(0,0,0,0.5);">
          ${num}
        </div>
      `;
    }

    case 'no_entry':
      return `
        <div style="${rotStyle} width:20px; height:20px; border-radius:50%; background:#dc2626; border:1.5px solid white; display:flex; align-items:center; justify-content:center; color:white; font-weight:bold; font-size:11px; box-shadow:0 2px 4px rgba(0,0,0,0.5);">
          ⛔
        </div>
      `;

    case 'detour_split_arrow':
    case 'mandatory_right':
    case 'mandatory_left':
      return `
        <div style="${rotStyle} width:20px; height:20px; border-radius:50%; background:#2563eb; border:1.5px solid white; display:flex; align-items:center; justify-content:center; color:white; font-size:10px; box-shadow:0 2px 4px rgba(0,0,0,0.5);">
          ${type === 'mandatory_right' ? '➡️' : type === 'mandatory_left' ? '⬅️' : '↖️'}
        </div>
      `;

    case 'road_work_ahead':
    case 'detour_ahead':
      return `
        <div style="${rotStyle} width:20px; height:20px; transform:rotate(45deg); background:#facc15; border:1.5px solid #000; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 4px rgba(0,0,0,0.5);">
          <span style="transform:rotate(-45deg); font-size:10px;">🚧</span>
        </div>
      `;

    case 'concrete_barrier':
      return `<div style="${rotStyle} background:#64748b; border:1px solid #fff; color:#fff; font-size:6px; font-weight:bold; padding:1px 3px; border-radius:2px;">NJB</div>`;

    case 'water_barrier':
      return `<div style="${rotStyle} background:#ef4444; border:1px solid #fff; color:#fff; font-size:6px; font-weight:bold; padding:1px 3px; border-radius:2px;">PLASTIC</div>`;

    case 'traffic_cone':
      return `<div style="${rotStyle} font-size:12px; filter:drop-shadow(0 2px 3px rgba(0,0,0,0.5));">🔶</div>`;

    default:
      return `
        <div style="${rotStyle} width:18px; height:18px; border-radius:50%; background:#ef4444; border:1.5px solid #fff; display:flex; align-items:center; justify-content:center; color:#fff; font-size:8px; font-weight:bold; box-shadow:0 2px 4px rgba(0,0,0,0.5);">
          ⚠️
        </div>
      `;
  }
};

export const GeoreferencedReportModal = ({
  isOpen = false,
  onClose,
  language = 'ar',
  formData = {},
  boundaryPoints = [],
  detourNodes = [],
  pedestrianNodes = [],
  dwgData = null,
  placedElements = []
}) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const isAr = language === 'ar';

  // Compute blue construction zone geometry metrics
  const computeGeometryMetrics = () => {
    if (!boundaryPoints || boundaryPoints.length < 2) {
      return { perimeter: 0, area: 0, vertexCount: 0 };
    }

    let perimeter = 0;
    for (let i = 0; i < boundaryPoints.length; i++) {
      const next = (i + 1) % boundaryPoints.length;
      if (boundaryPoints.length === 2 && i === 1) break;
      const p1 = boundaryPoints[i];
      const p2 = boundaryPoints[next];
      const dx = (p2.x || 0) - (p1.x || 0);
      const dy = (p2.y || 0) - (p1.y || 0);
      perimeter += Math.hypot(dx, dy);
    }

    // Shoelace formula for polygon area
    let area = 0;
    if (boundaryPoints.length >= 3) {
      for (let i = 0; i < boundaryPoints.length; i++) {
        const j = (i + 1) % boundaryPoints.length;
        area += (boundaryPoints[i].x || 0) * (boundaryPoints[j].y || 0);
        area -= (boundaryPoints[i].x || 0) * (boundaryPoints[j].y || 0);
      }
      area = Math.abs(area) / 2;
    }

    return {
      perimeter: Number(perimeter.toFixed(1)),
      area: Number(area.toFixed(1)),
      vertexCount: boundaryPoints.length
    };
  };

  const metrics = computeGeometryMetrics();

  // Combine all active 6-DOF nodes for the report table
  const allNodes = useMemo(() => [
    ...boundaryPoints.map((p, idx) => ({
      id: `C${idx + 1}`,
      nameAr: `رأس منطقة العمل C${idx + 1}`,
      nameEn: `Construction Vertex C${idx + 1}`,
      layer: 'construction',
      color: '#0ea5e9',
      lat: p.lat || 24.4686,
      lng: p.lng || 39.6120,
      x: p.x || Math.round(582500 + ((p.lng || 39.6120) - 39.6120) * 100000),
      y: p.y || Math.round(2703800 + ((p.lat || 24.4686) - 24.4686) * 110000),
      z: p.z || 0.0,
      roll: p.roll || 0.0,
      pitch: p.pitch || 0.0,
      yaw: p.yaw || 0.0
    })),
    ...detourNodes.map((p, idx) => ({
      id: `D${idx + 1}`,
      nameAr: idx === 0 ? 'بداية مسار التحويلة (D1)' : 'نهاية مسار التحويلة (D2)',
      nameEn: idx === 0 ? 'Detour Route Start (D1)' : 'Detour Route End (D2)',
      layer: 'detour',
      color: '#f97316',
      lat: p.lat || 24.4686,
      lng: p.lng || 39.6120,
      x: p.x || Math.round(582500 + ((p.lng || 39.6120) - 39.6120) * 100000),
      y: p.y || Math.round(2703800 + ((p.lat || 24.4686) - 24.4686) * 110000),
      z: p.z || 0.0,
      roll: p.roll || 0.0,
      pitch: p.pitch || 0.0,
      yaw: p.yaw || 0.0
    })),
    ...pedestrianNodes.map((p, idx) => ({
      id: `P${idx + 1}`,
      nameAr: idx === 0 ? 'بداية ممر المشاة (P1)' : 'نهاية ممر المشاة (P2)',
      nameEn: idx === 0 ? 'Pedestrian Start (P1)' : 'Pedestrian End (P2)',
      layer: 'pedestrian',
      color: '#22c55e',
      lat: p.lat || 24.4686,
      lng: p.lng || 39.6120,
      x: p.x || Math.round(582500 + ((p.lng || 39.6120) - 39.6120) * 100000),
      y: p.y || Math.round(2703800 + ((p.lat || 24.4686) - 24.4686) * 110000),
      z: p.z || 0.0,
      roll: p.roll || 0.0,
      pitch: p.pitch || 0.0,
      yaw: p.yaw || 0.0
    }))
  ], [boundaryPoints, detourNodes, pedestrianNodes]);

  // Combine placed traffic safety devices
  const activePlacedElements = useMemo(() => {
    return placedElements && placedElements.length > 0
      ? placedElements
      : (formData.trafficPlacements || []);
  }, [placedElements, formData.trafficPlacements]);

  // Initialize Satellite Leaflet Map in Report View
  useEffect(() => {
    if (!isOpen || !window.L || !mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const centerLat = boundaryPoints[0]?.lat || detourNodes[0]?.lat || 24.5143;
    const centerLng = boundaryPoints[0]?.lng || detourNodes[0]?.lng || 39.7089;

    const map = window.L.map(mapContainerRef.current, {
      center: [centerLat, centerLng],
      zoom: 16,
      zoomControl: true,
      attributionControl: false
    });

    // High-Definition Google Satellite Layer
    window.L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    }).addTo(map);

    // 1. Render CAD Features with Strict Stage 2 Color Palette
    if (dwgData?.geojson) {
      window.L.geoJSON(dwgData.geojson, {
        style: (feature) => {
          const props = feature.properties || {};
          const layer = (props.layer || props.motGroup || '').toUpperCase();

          if (layer.includes('TAPER') || layer.includes('DETOUR') || props.color === '#EF4444') {
            return { color: '#EF4444', weight: 3.5, opacity: 0.95 };
          }
          if (layer.includes('BUFFER') || layer.includes('SAFETY') || props.color === '#F59E0B') {
            return { color: '#F59E0B', weight: 2.5, opacity: 0.9, dashArray: '6, 4' };
          }
          if (layer.includes('PEDESTRIAN') || layer.includes('WALK') || props.color === '#10B981') {
            return { color: '#10B981', weight: 2.8, opacity: 0.95, dashArray: '4, 4' };
          }
          if (layer.includes('ROAD') || layer.includes('BOUNDARY') || props.color === '#06B6D4') {
            return { color: '#06B6D4', weight: 2.2, opacity: 0.85 };
          }
          if (layer.includes('CENTERLINE') || layer.includes('AXIS')) {
            return { color: '#94A3B8', weight: 2.2, opacity: 0.85 };
          }
          return { color: props.color || '#0EA5E9', weight: 2, opacity: 0.85 };
        }
      }).addTo(map);
    }

    // 2. Render Blue Construction Zone Polygon (Stage 2 Color: #0ea5e9)
    if (boundaryPoints.length >= 2) {
      const polyCoords = boundaryPoints.map(p => [p.lat, p.lng]);
      window.L.polygon(polyCoords, {
        color: '#0ea5e9',
        weight: 3,
        fillColor: '#0ea5e9',
        fillOpacity: 0.35,
        dashArray: '4, 4'
      }).addTo(map);
    }

    // 3. Render Detour Route (Stage 2 Color: #f97316)
    if (detourNodes.length >= 2) {
      window.L.polyline(detourNodes.map(p => [p.lat, p.lng]), {
        color: '#f97316',
        weight: 3.5,
        dashArray: '6, 4'
      }).addTo(map);
    }

    // 4. Render Pedestrian Walkway (Stage 2 Color: #22c55e)
    if (pedestrianNodes.length >= 2) {
      window.L.polyline(pedestrianNodes.map(p => [p.lat, p.lng]), {
        color: '#22c55e',
        weight: 3,
        dashArray: '4, 4'
      }).addTo(map);
    }

    // 5. Render 6-DOF Control Node Markers
    allNodes.forEach((node) => {
      const marker = window.L.marker([node.lat, node.lng], {
        icon: window.L.divIcon({
          className: 'report-6dof-marker',
          html: `<div style="
            background: ${node.color};
            color: white;
            font-weight: 800;
            font-size: 10px;
            width: 22px;
            height: 22px;
            border-radius: 50%;
            border: 2px solid white;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 3px 8px rgba(0,0,0,0.5);
          ">${node.id}</div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11]
        })
      });
      marker.bindTooltip(`<b>${isAr ? node.nameAr : node.nameEn}</b><br/>E: ${node.x}, N: ${node.y}`, { direction: 'top' });
      marker.addTo(map);
    });

    // 6. Render All Placed Traffic & Safety Elements with Rich SVG/HTML
    activePlacedElements.forEach((el, idx) => {
      if (!el.lat || !el.lng) return;
      const elHtml = renderReportMotItemHtml(el.type, el.rotation || 0, isAr);
      const signMarker = window.L.marker([el.lat, el.lng], {
        icon: window.L.divIcon({
          className: 'report-placed-sign-marker',
          html: elHtml,
          iconSize: [36, 36],
          iconAnchor: [18, 18]
        })
      });

      const utmE = Math.round(582500 + (el.lng - 39.6120) * 100000);
      const utmN = Math.round(2703800 + (el.lat - 24.4686) * 110000);
      const signLabel = isAr ? (el.labelAr || el.type) : (el.labelEn || el.type);

      signMarker.bindTooltip(
        `<b>🛑 ${signLabel}</b><br/><span style="font-size:10px">E: ${utmE} m, N: ${utmN} m | θ: ${el.rotation || 0}°</span>`,
        { direction: 'top' }
      );
      signMarker.addTo(map);
    });

    mapInstanceRef.current = map;

    setTimeout(() => {
      if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
    }, 250);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen, boundaryPoints, detourNodes, pedestrianNodes, dwgData, activePlacedElements, allNodes, isAr]);

  // Handle Export to Word (.docx)
  const handleExportDocx = async () => {
    const titleAr = 'تقرير الاعتماد الهندسي والرفع الجغرافي للتحويلة المرورية (6-DOF Georeferenced Report)';
    const titleEn = 'Georeferenced Traffic Detour & 6-DOF Engineering Report';

    const blocks = [
      {
        type: 'heading',
        textAr: '١. البيانات الأساسية للمشروع والموقع',
        textEn: '1. Project & Location Metadata'
      },
      {
        type: 'fields',
        pairs: [
          ['اسم الطريق والموقع', 'Corridor Name', isAr ? formData.roadNameAr || 'طريق الأمير نايف' : formData.roadNameEn || 'Prince Naif Road'],
          ['الجهة المالكة', 'Client Authority', isAr ? formData.clientNameAr || 'أمانة منطقة المدينة المنورة' : 'Al-Madinah Municipality'],
          ['الشركة المنفذة', 'Contractor', isAr ? formData.contractingCompanyAr || 'شركة المقاولات المعتمدة' : 'Contracting Company'],
          ['إجمالي طول التحويلة', 'Total Detour Length', `${formData.diversionLengthM || 1032} م`],
          ['حد السرعة التصميمي', 'Design Speed Limit', `${formData.speedLimit || 50} كم/س`],
          ['نظام الإحداثيات المعتمد', 'Coordinate Reference System', 'UTM Zone 37N (EPSG:32637) WGS84'],
          ['حالة التوثيق الرقمي', 'Digital Signature Status', 'معتمد وموثق رقمياً عبر منصة تحكم (Verified by Tahcom Engine)']
        ]
      },
      {
        type: 'heading',
        textAr: '٢. قياسات ومساحة منطقة العمل الإنشائي (Blue Construction Zone)',
        textEn: '2. Blue Construction Zone Spatial Geometry'
      },
      {
        type: 'fields',
        pairs: [
          ['محيط منطقة الحفر والعمل', 'Perimeter Length', `${metrics.perimeter} متر`],
          ['المساحة السطحية المغلقة', 'Surface Area', `${metrics.area} م²`],
          ['عدد نقاط الرؤوس الهندسية', 'Vertex Node Count', `${metrics.vertexCount} نقاط (C1 - C${metrics.vertexCount})`]
        ]
      },
      {
        type: 'heading',
        textAr: '٣. جدول إحداثيات النقاط الفراغية 6-DOF (Linear & Rotational)',
        textEn: '3. 6-DOF Coordinate Transformation Table'
      },
      {
        type: 'table',
        headersAr: ['المعرف', 'الاسم والطبقة', 'X (الشرق)', 'Y (الشمال)', 'Z (المنسوب)', 'Roll (θx)', 'Pitch (θy)', 'Yaw (θz)'],
        headersEn: ['Node ID', 'Layer / Label', 'X (Easting)', 'Y (Northing)', 'Z (Elev)', 'Roll (θx)', 'Pitch (θy)', 'Yaw (θz)'],
        rows: allNodes.map(n => [
          n.id,
          isAr ? n.nameAr : n.nameEn,
          `${n.x} م`,
          `${n.y} م`,
          `${n.z.toFixed(2)} م`,
          `${n.roll.toFixed(1)}°`,
          `${n.pitch.toFixed(1)}°`,
          `${n.yaw.toFixed(1)}°`
        ])
      }
    ];

    // Add Placed Traffic Safety Elements Schedule if present
    if (activePlacedElements.length > 0) {
      blocks.push({
        type: 'heading',
        textAr: '٤. جدول عناصر ومعدات السلامة المرورية المعتمدة بالموقع (Placed Traffic Devices Schedule)',
        textEn: '4. Approved Traffic Safety Devices & Barriers Schedule'
      });

      blocks.push({
        type: 'table',
        headersAr: ['المعرف', 'نوع العنصر', 'الاسم / الوصف', 'X (الشرق)', 'Y (الشمال)', 'الزاوية (θ)', 'المعيار'],
        headersEn: ['Item ID', 'Category', 'Label / Description', 'X (Easting)', 'Y (Northing)', 'Heading (θ)', 'Standard'],
        rows: activePlacedElements.map((el, i) => {
          const utmE = Math.round(582500 + ((el.lng || 39.6120) - 39.6120) * 100000);
          const utmN = Math.round(2703800 + ((el.lat || 24.4686) - 24.4686) * 110000);
          return [
            `S${i + 1}`,
            el.category || (el.type.includes('poster') ? 'لوحة تفصيلية' : el.type.includes('speed') ? 'تنظيمي' : 'تحذيري'),
            isAr ? (el.labelAr || el.type) : (el.labelEn || el.type),
            `${utmE} م`,
            `${utmN} م`,
            `${el.rotation || 0}°`,
            'MOT 305 / SASO'
          ];
        })
      });
    }

    blocks.push({
      type: 'signatures',
      signers: [
        { roleAr: 'مهندس السلامة المعتمد', roleEn: 'Certified Safety Engineer', name: formData.projectManagerAr || 'م. فهد الحربي', date: new Date().toISOString().split('T')[0] },
        { roleAr: 'استشاري الإشراف', roleEn: 'Supervision Consultant', name: formData.consultantNameAr || 'دار الإشراف الهندسي', date: new Date().toISOString().split('T')[0] },
        { roleAr: 'أمانة منطقة المدينة المنورة', roleEn: 'Al-Madinah Municipality', name: 'إدارة هندسة المرور والسلامة', date: new Date().toISOString().split('T')[0] }
      ]
    });

    await exportDocxReport({
      titleAr,
      titleEn,
      blocks,
      fileName: `Georeferenced_Detour_Report_${new Date().toISOString().split('T')[0]}`,
      isArabic: isAr
    });
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto print:p-0 print:bg-white">
      <div
        className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl border border-slate-200 overflow-hidden animate-fade-in flex flex-col my-auto max-h-[92vh] print:max-h-none print:shadow-none print:border-none"
        dir={language === 'ar' ? 'rtl' : 'ltr'}
      >
        {/* Modal Top Bar */}
        <div className="bg-slate-900 p-4 text-white flex items-center justify-between border-b border-slate-800 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-primary/20 border border-brand-primary/40 flex items-center justify-center text-brand-gold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base flex items-center gap-2">
                <span>{language === 'ar' ? 'تقرير الاعتماد الجغرافي ونقاط 6-DOF للتحويلة المرورية' : 'Georeferenced 6-DOF Traffic Detour Report'}</span>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  MOT Standard
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                {language === 'ar' ? 'مخطط كاد مطابق جغرافياً فوق القمر الصناعي مع عناصر السلامة والمصفوفة الإحداثية' : 'Satellite georeferenced CAD layout with placed safety elements & 6-DOF coordinate matrix'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition border border-slate-700 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'طباعة / PDF' : 'Print / PDF'}</span>
            </button>

            <button
              onClick={handleExportDocx}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'تصدير Word (.docx)' : 'Export (.docx)'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">

          {/* Official Report Header */}
          <div className="border-b-2 border-slate-200 pb-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-brand-dark flex items-center justify-center text-brand-gold font-extrabold text-xl shadow-md border border-brand-primary/30">
                ط
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 leading-tight">
                  {language === 'ar' ? 'أمانة منطقة المدينة المنورة — الإدارة العامة لهندسة المرور والسلامة' : 'Al-Madinah Municipality — General Directorate of Traffic Engineering'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {language === 'ar' ? 'وثيقة المطابقة الهندسية ومصفوفة التحويل الفراغي 6-DOF (كود الطرق ٣٠٥)' : 'Engineering Compliance Certificate & 6-DOF Spatial Transformation Matrix (Code 305)'}
                </p>
              </div>
            </div>

            <div className="text-left rtl:text-right bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <div><span className="text-slate-500">{language === 'ar' ? 'تاريخ التقرير:' : 'Date:'}</span> <b className="font-mono text-slate-800">{new Date().toISOString().split('T')[0]}</b></div>
              <div><span className="text-slate-500">{language === 'ar' ? 'رقم المعاملة:' : 'Reference:'}</span> <b className="font-mono text-brand-primary">TDP-6DOF-2026-MAD</b></div>
              <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>{language === 'ar' ? 'موثق رقمياً بمنصة تحكم' : 'Digitally Signed by Tahcom'}</span>
              </div>
            </div>
          </div>

          {/* Project Metadata Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-slate-500 block mb-1">{language === 'ar' ? 'اسم الطريق:' : 'Corridor Name:'}</span>
              <b className="text-slate-900 text-sm truncate block">{formData.roadNameAr || formData.roadNameEn || 'طريق الأمير نايف'}</b>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-slate-500 block mb-1">{language === 'ar' ? 'الجهة المشرفة:' : 'Client:'}</span>
              <b className="text-slate-900 text-sm truncate block">{formData.clientNameAr || 'أمانة منطقة المدينة المنورة'}</b>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-slate-500 block mb-1">{language === 'ar' ? 'طول التحويلة:' : 'Detour Length:'}</span>
              <b className="text-brand-primary font-mono text-sm">{formData.diversionLengthM || 1032} متر</b>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-slate-500 block mb-1">{language === 'ar' ? 'السرعة القصوى:' : 'Speed Limit:'}</span>
              <b className="text-amber-600 font-mono text-sm">{formData.speedLimit || 50} كم/س</b>
            </div>
          </div>

          {/* Satellite Map Preview Canvas with Stage 2 Color Legend */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-brand-primary" />
                <span>{language === 'ar' ? 'الرفع الجغرافي والمسارات فوق القمر الصناعي عالي الدقة (HD Satellite Overlay)' : 'Satellite Georeferenced Layout'}</span>
              </h4>
              <span className="text-[11px] text-slate-500 font-mono">EPSG:32637 (UTM 37N) WGS84</span>
            </div>

            <div className="rounded-2xl overflow-hidden border border-slate-300 shadow-md relative">
              <div ref={mapContainerRef} className="h-96 w-full z-0 bg-slate-900" />
            </div>

            {/* Stage 2 Visual Color Scheme Legend */}
            <div className="bg-slate-900 text-white rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-[11px] shadow-sm">
              <span className="font-bold text-brand-gold flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span>{language === 'ar' ? 'دليل الألوان المعتمد (Stage 2 MOT Palette):' : 'Stage 2 MOT Palette Legend:'}</span>
              </span>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#0ea5e9]"></span><span>منطقة العمل (Blue)</span></span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#ef4444]"></span><span>مسار التحويلة والتدرج (Red)</span></span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#f59e0b]"></span><span>أظرف الأمان العازلة (Amber)</span></span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#10b981]"></span><span>ممشى المشاة المؤمّن (Green)</span></span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#06b6d4]"></span><span>حدود الطريق (Cyan)</span></span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#94a3b8]"></span><span>المحاور (Slate)</span></span>
              </div>
            </div>
          </div>

          {/* Construction Zone Spatial Metrics Banner */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black">
                C
              </div>
              <div>
                <b className="text-slate-900 text-sm block">{language === 'ar' ? 'منطقة العمل الإنشائي (Blue Construction Zone)' : 'Blue Construction Zone'}</b>
                <p className="text-slate-600 mt-0.5">{language === 'ar' ? 'محيط الحفر والعمل المعزول بالصبات الخرسانية' : 'Excavation perimeter protected by concrete NJB barriers'}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 font-mono">
              <div className="bg-white px-3 py-2 rounded-xl border border-blue-200">
                <span className="text-slate-500 text-[10px] block">{language === 'ar' ? 'المحيط الهندسي:' : 'Perimeter:'}</span>
                <b className="text-blue-700 text-sm">{metrics.perimeter} م</b>
              </div>
              <div className="bg-white px-3 py-2 rounded-xl border border-blue-200">
                <span className="text-slate-500 text-[10px] block">{language === 'ar' ? 'المساحة السطحية:' : 'Surface Area:'}</span>
                <b className="text-blue-700 text-sm">{metrics.area} م²</b>
              </div>
              <div className="bg-white px-3 py-2 rounded-xl border border-blue-200">
                <span className="text-slate-500 text-[10px] block">{language === 'ar' ? 'عدد الرؤوس:' : 'Vertices:'}</span>
                <b className="text-blue-700 text-sm">{metrics.vertexCount}</b>
              </div>
            </div>
          </div>

          {/* 6-DOF Linear & Rotational Coordinate Table */}
          <div className="space-y-2">
            <h4 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
              <Compass className="w-4 h-4 text-brand-primary" />
              <span>{language === 'ar' ? 'مصفوفة إحداثيات النقاط الفراغية 6-DOF (Linear & Rotational)' : '6-DOF Transformation Matrix'}</span>
            </h4>

            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-xs">
              <table className="w-full text-xs text-right rtl:text-right ltr:text-left">
                <thead className="bg-slate-900 text-white text-[11px]">
                  <tr>
                    <th className="p-2.5">{language === 'ar' ? 'المعرف' : 'Node ID'}</th>
                    <th className="p-2.5">{language === 'ar' ? 'الاسم والطبقة' : 'Layer / Description'}</th>
                    <th className="p-2.5 font-mono">X (Easting)</th>
                    <th className="p-2.5 font-mono">Y (Northing)</th>
                    <th className="p-2.5 font-mono">Z (Elev)</th>
                    <th className="p-2.5 font-mono">Roll (θx)</th>
                    <th className="p-2.5 font-mono">Pitch (θy)</th>
                    <th className="p-2.5 font-mono">Yaw (θz)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {allNodes.map((n) => (
                    <tr key={n.id} className="hover:bg-slate-50 font-mono">
                      <td className="p-2.5 font-bold">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-[10px]" style={{ backgroundColor: n.color }}>
                          {n.id}
                        </span>
                      </td>
                      <td className="p-2.5 font-sans font-semibold text-slate-800">{isAr ? n.nameAr : n.nameEn}</td>
                      <td className="p-2.5 text-slate-700">{n.x} م</td>
                      <td className="p-2.5 text-slate-700">{n.y} م</td>
                      <td className="p-2.5 text-slate-700">{n.z.toFixed(2)} م</td>
                      <td className="p-2.5 text-slate-600">{n.roll.toFixed(1)}°</td>
                      <td className="p-2.5 text-slate-600">{n.pitch.toFixed(1)}°</td>
                      <td className="p-2.5 text-brand-primary font-bold">{n.yaw.toFixed(1)}°</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Placed Traffic Safety Elements Schedule Table */}
          {activePlacedElements.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                <TrafficCone className="w-4 h-4 text-amber-500" />
                <span>{language === 'ar' ? `جدول عناصر ومعدات السلامة المرورية المعتمدة بالموقع (${activePlacedElements.length} شواخص/حواجز)` : `Approved Traffic Devices Schedule (${activePlacedElements.length} Items)`}</span>
              </h4>

              <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-xs">
                <table className="w-full text-xs text-right rtl:text-right ltr:text-left">
                  <thead className="bg-slate-800 text-white text-[11px]">
                    <tr>
                      <th className="p-2.5">{language === 'ar' ? 'المعرف' : 'ID'}</th>
                      <th className="p-2.5">{language === 'ar' ? 'الرمز' : 'Icon'}</th>
                      <th className="p-2.5">{language === 'ar' ? 'نوع الشاخصة / الحاجز' : 'Device Category & Type'}</th>
                      <th className="p-2.5 font-mono">X (Easting)</th>
                      <th className="p-2.5 font-mono">Y (Northing)</th>
                      <th className="p-2.5 font-mono">{language === 'ar' ? 'زاوية التوجيه (θ)' : 'Heading (θ)'}</th>
                      <th className="p-2.5">{language === 'ar' ? 'المعيار المعتمد' : 'Compliance Code'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {activePlacedElements.map((el, idx) => {
                      const utmE = Math.round(582500 + ((el.lng || 39.6120) - 39.6120) * 100000);
                      const utmN = Math.round(2703800 + ((el.lat || 24.4686) - 24.4686) * 110000);
                      const signLabel = isAr ? (el.labelAr || el.type) : (el.labelEn || el.type);

                      return (
                        <tr key={el.id || idx} className="hover:bg-slate-50">
                          <td className="p-2.5 font-mono font-bold text-slate-600">S{idx + 1}</td>
                          <td className="p-2.5 text-lg">{el.icon || '🛑'}</td>
                          <td className="p-2.5 font-bold text-slate-800">
                            <div>{signLabel}</div>
                            <span className="text-[10px] text-slate-500 font-mono font-normal">{el.type}</span>
                          </td>
                          <td className="p-2.5 font-mono text-slate-700">{utmE} م</td>
                          <td className="p-2.5 font-mono text-slate-700">{utmN} م</td>
                          <td className="p-2.5 font-mono text-brand-primary font-bold">{el.rotation || 0}°</td>
                          <td className="p-2.5">
                            <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">
                              MOT 305 / SASO
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tri-Party Signature Blocks */}
          <div className="pt-4 border-t-2 border-slate-200">
            <h4 className="font-extrabold text-xs text-slate-700 mb-3">{language === 'ar' ? 'الاعتمادات والتوقيعات الرسمية:' : 'Official Approvals & Signatures:'}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center space-y-2">
                <span className="text-slate-500 font-bold block">{language === 'ar' ? 'مهندس السلامة المعتمد' : 'Certified Safety Engineer'}</span>
                <b className="text-slate-900 block">{formData.projectManagerAr || 'م. فهد الحربي'}</b>
                <div className="h-10 border-b border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-[10px]">
                  {language === 'ar' ? 'التوقيع والختم' : 'Signature & Stamp'}
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center space-y-2">
                <span className="text-slate-500 font-bold block">{language === 'ar' ? 'استشاري الإشراف' : 'Supervision Consultant'}</span>
                <b className="text-slate-900 block">{formData.consultantNameAr || 'دار الإشراف الهندسي'}</b>
                <div className="h-10 border-b border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-[10px]">
                  {language === 'ar' ? 'التوقيع والختم' : 'Signature & Stamp'}
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center space-y-2">
                <span className="text-slate-500 font-bold block">{language === 'ar' ? 'أمانة منطقة المدينة المنورة' : 'Al-Madinah Municipality'}</span>
                <b className="text-slate-900 block">{language === 'ar' ? 'إدارة هندسة المرور والسلامة' : 'Traffic Engineering Dept.'}</b>
                <div className="h-10 border-b border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-[10px]">
                  {language === 'ar' ? 'الاعتماد النهائي والختم' : 'Final Approval & Stamp'}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default GeoreferencedReportModal;
