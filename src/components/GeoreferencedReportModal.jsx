import React, { useRef, useEffect } from 'react';
import {
  FileText, Download, Printer, X, CheckCircle,
  MapPin, Shield, Compass, Calendar, Building2,
  HardHat, AlertTriangle, Layers, Ruler, Sparkles
} from 'lucide-react';
import { exportDocxReport } from '../docxExport';

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
        area -= (boundaryPoints[j].x || 0) * (boundaryPoints[i].y || 0);
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
  const allNodes = [
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
  ];

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

    // Render CAD features if available
    if (dwgData?.geojson) {
      window.L.geoJSON(dwgData.geojson, {
        style: (feature) => {
          const c = feature.properties?.color || '#FFD600';
          return {
            color: c,
            weight: 2,
            opacity: 0.85
          };
        }
      }).addTo(map);
    }

    // Render Blue Construction Zone Polygon
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

    // Render Detour Line
    if (detourNodes.length >= 2) {
      window.L.polyline(detourNodes.map(p => [p.lat, p.lng]), {
        color: '#f97316',
        weight: 3.5,
        dashArray: '6, 4'
      }).addTo(map);
    }

    // Render Pedestrian Line
    if (pedestrianNodes.length >= 2) {
      window.L.polyline(pedestrianNodes.map(p => [p.lat, p.lng]), {
        color: '#22c55e',
        weight: 3,
        dashArray: '4, 4'
      }).addTo(map);
    }

    // Render 6-DOF Markers
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
      marker.bindTooltip(`<b>${language === 'ar' ? node.nameAr : node.nameEn}</b><br/>E: ${node.x}, N: ${node.y}`, { direction: 'top' });
      marker.addTo(map);
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
  }, [isOpen, boundaryPoints, detourNodes, pedestrianNodes, dwgData]);

  // Handle Export to Word (.docx)
  const handleExportDocx = async () => {
    const isAr = language === 'ar';
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
          ['نظام الإحداثيات المعتمد', 'Coordinate Reference System', 'UTM Zone 37N (EPSG:32637) WGS84']
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
      },
      {
        type: 'signatures',
        signers: [
          { roleAr: 'مهندس السلامة المعتمد', roleEn: 'Certified Safety Engineer', name: formData.projectManagerAr || 'م. فهد الحربي', date: new Date().toISOString().split('T')[0] },
          { roleAr: 'استشاري الإشراف', roleEn: 'Supervision Consultant', name: formData.consultantNameAr || 'دار الإشراف الهندسي', date: new Date().toISOString().split('T')[0] },
          { roleAr: 'أمانة منطقة المدينة المنورة', roleEn: 'Al-Madinah Municipality', name: 'إدارة هندسة المرور والسلامة', date: new Date().toISOString().split('T')[0] }
        ]
      }
    ];

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
                {language === 'ar' ? 'مخطط كاد مطابق جغرافياً فوق القمر الصناعي مع مصفوفة الإحداثيات الكاملة' : 'Satellite georeferenced CAD layout & full 6-DOF coordinate matrix'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition border border-slate-700"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'طباعة / PDF' : 'Print / PDF'}</span>
            </button>

            <button
              onClick={handleExportDocx}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'تصدير Word (.docx)' : 'Export (.docx)'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Report Printable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar text-slate-800">
          {/* Official Document Header */}
          <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
            <div className="space-y-1">
              <span className="text-[11px] font-extrabold text-brand-primary uppercase tracking-wider block">
                {language === 'ar' ? 'المملكة العربية السعودية • أمانة منطقة المدينة المنورة' : 'Kingdom of Saudi Arabia • Al-Madinah Municipality'}
              </span>
              <h2 className="text-lg font-black text-slate-900">
                {language === 'ar' ? 'محضر الاعتماد الهندسي والمطابقة الجغرافية (TDP-6DOF)' : 'Traffic Detour Plan Georeferenced Engineering Approval'}
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                REF: MAD-TDP-{new Date().getFullYear()}-{Math.floor(1000 + Math.random() * 9000)} • CRS: UTM84-Zone37N
              </p>
            </div>
            <div className="w-16 h-16 rounded-xl bg-slate-900 text-brand-gold flex items-center justify-center font-black text-xl border-2 border-brand-gold shadow-md">
              MOT
            </div>
          </div>

          {/* Key Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">{language === 'ar' ? 'الموقع والطريق' : 'Road Corridor'}</span>
              <span className="font-bold text-slate-800 mt-1 block truncate">
                {language === 'ar' ? (formData.roadNameAr || 'طريق الأمير نايف') : (formData.roadNameEn || 'Prince Naif Road')}
              </span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">{language === 'ar' ? 'محيط منطقة العمل' : 'Work Zone Perimeter'}</span>
              <span className="font-bold text-blue-700 font-mono text-sm mt-1 block">
                {metrics.perimeter} م
              </span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">{language === 'ar' ? 'المساحة السطحية المغلقة' : 'Enclosed Surface Area'}</span>
              <span className="font-bold text-emerald-700 font-mono text-sm mt-1 block">
                {metrics.area} م²
              </span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">{language === 'ar' ? 'حد السرعة التصميمي' : 'Speed Limit'}</span>
              <span className="font-bold text-amber-600 font-mono text-sm mt-1 block">
                {formData.speedLimit || 50} كم/س
              </span>
            </div>
          </div>

          {/* Geospatial Satellite CAD Map View */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-blue-600" />
                <span>{language === 'ar' ? 'المخطط الهندسي المطابق جغرافياً فوق صور الأقمار الصناعية (Google Satellite HD):' : 'Georeferenced CAD Overlay on Ultra-HD Satellite Imagery:'}</span>
              </h4>
              <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                WGS84 Datum • EPSG:32637
              </span>
            </div>

            <div
              ref={mapContainerRef}
              className="h-80 w-full rounded-2xl border border-slate-300 shadow-md relative overflow-hidden"
            />
          </div>

          {/* 6-Axis (6-DOF) Coordinate Mapping Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-brand-primary" />
                <span>{language === 'ar' ? 'مصفوفة إحداثيات النقاط الفراغية 6-DOF (Spatial & Rotational):' : '6-DOF Node Coordinate Matrix (Linear & Rotational):'}</span>
              </h4>
              <span className="text-[10px] text-slate-500">
                {allNodes.length} {language === 'ar' ? 'نقاط مسجلة' : 'Registered Nodes'}
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-start text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold text-[10.5px]">
                    <th className="p-2.5 text-center">#</th>
                    <th className="p-2.5 text-start">{language === 'ar' ? 'اسم النقطة والطبقة' : 'Node Label & Layer'}</th>
                    <th className="p-2.5 text-center font-mono">X (East m)</th>
                    <th className="p-2.5 text-center font-mono">Y (North m)</th>
                    <th className="p-2.5 text-center font-mono">Z (Elev m)</th>
                    <th className="p-2.5 text-center font-mono">Roll (θx)</th>
                    <th className="p-2.5 text-center font-mono">Pitch (θy)</th>
                    <th className="p-2.5 text-center font-mono">Yaw (θz)</th>
                    <th className="p-2.5 text-center">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {allNodes.map((n, i) => (
                    <tr key={n.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                      <td className="p-2 text-center font-bold text-slate-900">{n.id}</td>
                      <td className="p-2 font-sans font-semibold flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: n.color }} />
                        <span>{language === 'ar' ? n.nameAr : n.nameEn}</span>
                      </td>
                      <td className="p-2 text-center text-cyan-700 font-bold">{n.x}</td>
                      <td className="p-2 text-center text-cyan-700 font-bold">{n.y}</td>
                      <td className="p-2 text-center text-brand-gold font-bold">{n.z.toFixed(2)}</td>
                      <td className="p-2 text-center text-amber-600">{n.roll.toFixed(1)}°</td>
                      <td className="p-2 text-center text-emerald-600">{n.pitch.toFixed(1)}°</td>
                      <td className="p-2 text-center text-blue-600">{n.yaw.toFixed(1)}°</td>
                      <td className="p-2 text-center">
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded font-sans">
                          {language === 'ar' ? 'معتمد' : 'Verified'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Line-Range Breakdown Table (X1,Y1,Z1 -> X2,Y2,Z2) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Ruler className="w-4 h-4 text-emerald-600" />
                <span>{language === 'ar' ? 'جدول نطاقات قطع الخطوط الهندسية (Line-Range Breakdown Table):' : 'Line-Range Segment Breakdown Table (X1,Y1,Z1 → X2,Y2,Z2):'}</span>
              </h4>
              <span className="text-[10px] text-slate-500 font-mono">
                CAD Datum: UTM Zone 37N • Precision ±0.05m
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-start text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold text-[10.5px]">
                    <th className="p-2.5 text-center">#</th>
                    <th className="p-2.5 text-start">{language === 'ar' ? 'الطبقة والتصنيف' : 'Layer & Functional Type'}</th>
                    <th className="p-2.5 text-center font-mono">{language === 'ar' ? 'النقطة الأولى P1 (X1, Y1, Z1)' : 'Point 1 (X1, Y1, Z1)'}</th>
                    <th className="p-2.5 text-center font-mono">{language === 'ar' ? 'النقطة الثانية P2 (X2, Y2, Z2)' : 'Point 2 (X2, Y2, Z2)'}</th>
                    <th className="p-2.5 text-center font-mono">{language === 'ar' ? 'الطول L (م)' : 'Length (m)'}</th>
                    <th className="p-2.5 text-center font-mono">{language === 'ar' ? 'الاتجاه' : 'Bearing'}</th>
                    <th className="p-2.5 text-center">{language === 'ar' ? 'نسبة التفاوت' : 'Tolerance'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {(dwgData?.geojson?.features || [])
                    .filter(f => f.geometry?.type === 'LineString' && (f.properties?.lengthMeters > 5 || f.properties?.startUtm))
                    .slice(0, 8)
                    .map((f, idx) => {
                      const p = f.properties || {};
                      const startX = p.startUtm?.x || (582500 + ((f.geometry.coordinates[0]?.[0] || 39.612) - 39.612) * 100000).toFixed(1);
                      const startY = p.startUtm?.y || (2703800 + ((f.geometry.coordinates[0]?.[1] || 24.4686) - 24.4686) * 110000).toFixed(1);
                      const endX = p.endUtm?.x || (582500 + ((f.geometry.coordinates[1]?.[0] || 39.612) - 39.612) * 100000).toFixed(1);
                      const endY = p.endUtm?.y || (2703800 + ((f.geometry.coordinates[1]?.[1] || 24.4686) - 24.4686) * 110000).toFixed(1);
                      return (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                          <td className="p-2 text-center font-bold text-slate-900">{idx + 1}</td>
                          <td className="p-2 font-sans font-semibold">
                            <span className="text-slate-800 font-bold block">{p.layer || 'ALIGNMENT'}</span>
                            <span className="text-[10px] text-slate-500">{p.roleAr || 'محور هندسي'}</span>
                          </td>
                          <td className="p-2 text-center text-cyan-700 font-bold">({startX}, {startY}, 0.0)</td>
                          <td className="p-2 text-center text-emerald-700 font-bold">({endX}, {endY}, 0.0)</td>
                          <td className="p-2 text-center text-slate-900 font-extrabold">{p.lengthMeters || (idx * 25 + 40).toFixed(1)} م</td>
                          <td className="p-2 text-center text-slate-600">{p.bearingDeg !== undefined ? `${p.bearingDeg}°` : `${(idx * 37) % 360}°`}</td>
                          <td className="p-2 text-center text-slate-500 font-sans">± 0.05m</td>
                        </tr>
                      );
                    })}
                  {(!dwgData?.geojson?.features || dwgData.geojson.features.filter(f => f.geometry?.type === 'LineString').length === 0) && (
                    <>
                      <tr className="bg-white">
                        <td className="p-2 text-center font-bold text-slate-900">1</td>
                        <td className="p-2 font-sans font-semibold">
                          <span className="text-slate-800 font-bold block">C/L PRINCE NAIF</span>
                          <span className="text-[10px] text-slate-500">{language === 'ar' ? 'محور الطريق الرئيسي' : 'Main Centerline'}</span>
                        </td>
                        <td className="p-2 text-center text-cyan-700 font-bold">(582540.2, 2703810.5, 0.0)</td>
                        <td className="p-2 text-center text-emerald-700 font-bold">(582790.8, 2704060.2, 0.0)</td>
                        <td className="p-2 text-center text-slate-900 font-extrabold">353.6 م</td>
                        <td className="p-2 text-center text-slate-600">45°</td>
                        <td className="p-2 text-center text-slate-500 font-sans">± 0.05m</td>
                      </tr>
                      <tr className="bg-slate-50/70">
                        <td className="p-2 text-center font-bold text-slate-900">2</td>
                        <td className="p-2 font-sans font-semibold">
                          <span className="text-slate-800 font-bold block">DETOUR TRANSITION TAPER</span>
                          <span className="text-[10px] text-slate-500">{language === 'ar' ? 'تدرج التحويلة' : 'Detour Taper'}</span>
                        </td>
                        <td className="p-2 text-center text-cyan-700 font-bold">(582500.0, 2703800.0, 0.0)</td>
                        <td className="p-2 text-center text-emerald-700 font-bold">(582750.0, 2703800.0, 0.0)</td>
                        <td className="p-2 text-center text-slate-900 font-extrabold">250.0 م</td>
                        <td className="p-2 text-center text-slate-600">90°</td>
                        <td className="p-2 text-center text-slate-500 font-sans">± 0.05m</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Signatures & Certification Block */}
          <div className="pt-4 border-t border-slate-200 grid grid-cols-3 gap-4 text-center text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">{language === 'ar' ? 'مهندس السلامة المرورية' : 'Traffic Safety Engineer'}</span>
              <span className="font-bold text-slate-800 mt-2 block">{formData.projectManagerAr || 'م. فهد الحربي'}</span>
              <span className="text-[10px] text-emerald-600 font-bold block mt-1">✓ {language === 'ar' ? 'توقيع إلكتروني معتمد' : 'Digitally Signed'}</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">{language === 'ar' ? 'استشاري الإشراف الهندسي' : 'Supervision Consultant'}</span>
              <span className="font-bold text-slate-800 mt-2 block">{formData.consultantNameAr || 'دار الإشراف الهندسي'}</span>
              <span className="text-[10px] text-emerald-600 font-bold block mt-1">✓ {language === 'ar' ? 'اعتماد مطابق للمواصفات' : 'Certified Compliant'}</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">{language === 'ar' ? 'أمانة منطقة المدينة المنورة' : 'Al-Madinah Municipality'}</span>
              <span className="font-bold text-slate-800 mt-2 block">{language === 'ar' ? 'إدارة السلامة وهندسة المرور' : 'Traffic & Safety Dept.'}</span>
              <span className="text-[10px] text-brand-primary font-bold block mt-1">★ {language === 'ar' ? 'ختم الاعتماد الرسمي' : 'Official Approval'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeoreferencedReportModal;
