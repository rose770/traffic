import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Upload, Layers, Eye, EyeOff, Trash2, RotateCcw, MapPin,
  AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Move,
  X, GripVertical, Loader2, Image as ImageIcon, Sliders, Info,
  Compass, Sparkles, Zap, Maximize2, Type, Ruler, Tag, ShieldAlert,
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, RotateCw, Target, RefreshCw,
  Lock, Unlock, Globe, Satellite, Navigation, CheckSquare, Square, Plus,
  FileCode, Copy, CornerDownRight, Check, Cpu
} from 'lucide-react';
import { SAUDI_CRS_PRESETS, detectSaudiCrs } from './utils/coordinateEngine';
import { SAUDI_COG_PRESETS } from './utils/cogTileService';
import { parseCadClientSide } from './utils/cadClientParser';

// ══════════════════════════════════════════════════════════════════════
// 1. Standardized Neutral & In-Browser Basemap Configurations
// ══════════════════════════════════════════════════════════════════════
const BASEMAP_PRESETS = {
  hybrid: {
    id: 'hybrid',
    nameAr: '🛰️ قمر صناعي هجين فائق الدقة (Google HD Hybrid - 15cm)',
    nameEn: 'Ultra-HD Hybrid Satellite (Google 15cm + Streets)',
    url: 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}&scale=2',
    subdomains: ['0', '1', '2', '3'],
    maxZoom: 22,
    maxNativeZoom: 20,
    tileSize: 512,
    zoomOffset: -1
  },
  esri_satellite: {
    id: 'esri_satellite',
    nameAr: '🌍 قمر صناعي عالي الوضوح (ESRI World Imagery HD - 30cm)',
    nameEn: 'ESRI World Imagery HD (Sub-Meter Clarity)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    subdomains: [],
    maxZoom: 22,
    maxNativeZoom: 19
  },
  satellite: {
    id: 'satellite',
    nameAr: '🛰️ قمر صناعي نقي (Google Satellite HD)',
    nameEn: 'Google Satellite Pure HD',
    url: 'https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}&scale=2',
    subdomains: ['0', '1', '2', '3'],
    maxZoom: 22,
    maxNativeZoom: 20,
    tileSize: 512,
    zoomOffset: -1
  },
  street: {
    id: 'street',
    nameAr: '🗺️ خريطة شوارع تخطيطية (Street Map View)',
    nameEn: 'Street Map View',
    url: 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&scale=2',
    subdomains: ['0', '1', '2', '3'],
    maxZoom: 22,
    maxNativeZoom: 20,
    tileSize: 512,
    zoomOffset: -1
  }
};

// ══════════════════════════════════════════════════════════════════════
// 2. Standardized Saudi MOT Functional Keymap Palette
// ══════════════════════════════════════════════════════════════════════
export const MOT_KEYMAP_GROUPS = {
  DETOUR_TAPER: {
    id: 'DETOUR_TAPER',
    color: '#EF4444',
    bgClass: 'bg-red-500/15',
    textClass: 'text-red-400',
    borderClass: 'border-red-500/40',
    titleAr: 'مسار وتدرج التحويلة',
    titleEn: 'Detour Transition Lines',
    descAr: 'حدود التدرج النشط، زاوية الاندماج، وخطوط حصر الإغلاق',
    descEn: 'Active taper boundary, merge angle, and closure limit line',
    icon: '🔴',
    defaultWeight: 3.5
  },
  SAFETY_BUFFER: {
    id: 'SAFETY_BUFFER',
    color: '#F59E0B',
    bgClass: 'bg-amber-500/15',
    textClass: 'text-amber-400',
    borderClass: 'border-amber-500/40',
    titleAr: 'أظرف الأمان والمناطق الفاصلة',
    titleEn: 'Safety & Buffer Envelopes',
    descAr: 'مساحات الأمان الطولية والعرضية الفاصلة بين منطقة العمل وحارات السير',
    descEn: 'Longitudinal and lateral clearance buffers separating work zones from active lanes',
    icon: '🟡',
    defaultWeight: 2.5,
    dashArray: '6, 4'
  },
  ROAD_BOUNDARY: {
    id: 'ROAD_BOUNDARY',
    color: '#06B6D4',
    bgClass: 'bg-cyan-500/15',
    textClass: 'text-cyan-400',
    borderClass: 'border-cyan-500/40',
    titleAr: 'حدود الطريق والتنظيم المعتمدة',
    titleEn: 'Planning & Road Limits',
    descAr: 'حدود الملكية المعتمدة وخطوط التنظيم وحرم الطريق',
    descEn: 'Approved municipal road limits and right-of-way corridor edges',
    icon: '🔵',
    defaultWeight: 2.2
  },
  CENTERLINE_AXIS: {
    id: 'CENTERLINE_AXIS',
    color: '#FFFFFF',
    bgClass: 'bg-slate-100/15',
    textClass: 'text-slate-100',
    borderClass: 'border-white/40',
    titleAr: 'محاور الطريق وخطوط المنتصف',
    titleEn: 'Centerlines & Baselines',
    descAr: 'محاور الرصف الإنشائية وخطوط المنتصف الصلبة والمتقطعة ومحاذاة الرفع',
    descEn: 'Solid/dashed road centerlines and survey alignments',
    icon: '⚪',
    defaultWeight: 2.2
  },
  PEDESTRIAN_ROUTE: {
    id: 'PEDESTRIAN_ROUTE',
    color: '#10B981',
    bgClass: 'bg-emerald-500/15',
    textClass: 'text-emerald-400',
    borderClass: 'border-emerald-500/40',
    titleAr: 'مسار وممشى المشاة المؤمّن',
    titleEn: 'Pedestrian Detour Route',
    descAr: 'مسار المشاة المخصص والمحمي بالصبات والمنحدرات',
    descEn: 'Dedicated barrier-protected pedestrian path and ramps',
    icon: '🟢',
    defaultWeight: 2.8
  },
  ANNOTATION_GUIDES: {
    id: 'ANNOTATION_GUIDES',
    color: '#8B5CF6',
    bgClass: 'bg-purple-500/15',
    textClass: 'text-purple-400',
    borderClass: 'border-purple-500/40',
    titleAr: 'الأبعاد وخطوط الإرشاد التوضيحية',
    titleEn: 'Explanatory Dimensions & Guides',
    descAr: 'خطوط امتداد الأبعاد، متجهات التوجيه (Leaders)، وعلامات المحطات',
    descEn: 'Dimension extension lines, leader vectors, offset markers, and stationing callouts',
    icon: '🟣',
    defaultWeight: 1.8,
    dashArray: '3, 3'
  }
};

// ══════════════════════════════════════════════════════════════════════
// 3. Comprehensive Saudi MOT & Madinah Municipality Signs Library
// ══════════════════════════════════════════════════════════════════════
export const SAUDI_MOT_ELEMENTS = {
  posters: {
    titleAr: 'لوحات تفاصيل الحواجز واللوحات الكبيرة',
    titleEn: 'Barrier Posters & Signboards',
    color: '#EF4444',
    items: [
      { id: 'concrete_njb_poster', labelAr: 'لوحة تفصيل حواجز خرسانية NJB مع إنارة ثلاثية', labelEn: 'Concrete NJB w/ Lights Poster', icon: '🧱', size: [115, 60] },
      { id: 'plastic_njb_poster', labelAr: 'لوحة تفصيل حواجز بلاستيكية NJB مع إنارة ثلاثية', labelEn: 'Plastic NJB w/ Lights Poster', icon: '🔴', size: [115, 60] },
      { id: 'road_work_ends_poster', labelAr: 'لوحة نهاية منطقة العمل (صفراء مضيئة)', labelEn: 'Road Work Ends Signboard', icon: '🚧', size: [105, 50] },
      { id: 'solar_vms_arrow_board', labelAr: 'لوحة أسهم وامضة شمسية على مقطورة (VMS Trailer)', labelEn: 'Solar Flashing Arrow Trailer', icon: '💡', size: [80, 50] },
      { id: 'crash_cushion_tma', labelAr: 'شاحنة امتصاص الصدمات وحماية العمال (TMA Truck)', labelEn: 'TMA Crash Cushion Truck', icon: '🚛', size: [90, 45] },
      { id: 'mobile_light_tower', labelAr: 'برج إنارة متحرك شمسية للتحويلة (Light Tower)', labelEn: 'Solar Mobile Light Tower', icon: '🗼', size: [60, 50] }
    ]
  },
  regulatory: {
    titleAr: 'اللوحات التنظيمية والسرعات المعتمدة',
    titleEn: 'Regulatory & Speed Signs',
    color: '#EAB308',
    items: [
      { id: 'stop_sign', labelAr: 'لوحة قف (STOP)', labelEn: 'STOP Sign', icon: '🛑', size: [36, 36] },
      { id: 'give_way', labelAr: 'لوحة أفسح الطريق (GIVE WAY)', labelEn: 'Yield / Give Way Sign', icon: '🔻', size: [36, 36] },
      { id: 'slow_sign', labelAr: 'لوحة تمهل (SLOW مع ومّاض علوي)', labelEn: 'SLOW Sign with Flashing Beacon', icon: '⚠️', size: [36, 42] },
      { id: 'speed_limit_30', labelAr: 'تحديد سرعة ٣٠ كم/س', labelEn: 'Speed Limit 30 km/h', icon: '㉚', size: [32, 32] },
      { id: 'speed_limit_40', labelAr: 'تحديد سرعة ٤٠ كم/س', labelEn: 'Speed Limit 40 km/h', icon: '㊵', size: [32, 32] },
      { id: 'speed_limit_50', labelAr: 'سرعة ٥٠ + مثلث تحذير إلزامي', labelEn: 'Speed Limit 50 + Warning', icon: '㊵', size: [52, 32] },
      { id: 'speed_limit_60', labelAr: 'تحديد سرعة ٦٠ كم/س', labelEn: 'Speed Limit 60 km/h', icon: '㊷', size: [32, 32] },
      { id: 'speed_limit_70', labelAr: 'تحديد سرعة ٧٠ كم/س', labelEn: 'Speed Limit 70 km/h', icon: '㊸', size: [32, 32] },
      { id: 'speed_limit_80', labelAr: 'تحديد سرعة ٨٠ كم/س', labelEn: 'Speed Limit 80 km/h', icon: '㊹', size: [32, 32] },
      { id: 'speed_limit_100', labelAr: 'تحديد سرعة ١٠٠ كم/س', labelEn: 'Speed Limit 100 km/h', icon: '💯', size: [32, 32] },
      { id: 'no_entry', labelAr: 'ممنوع الدخول (No Entry)', labelEn: 'No Entry Sign', icon: '⛔', size: [32, 32] },
      { id: 'no_overtaking', labelAr: 'ممنوع التجاوز (No Overtaking)', labelEn: 'No Overtaking Sign', icon: '🚫', size: [34, 34] },
    ]
  },
  warning: {
    titleAr: 'لوحات التحذير والتوجيه',
    titleEn: 'Warning & Guidance Signs',
    color: '#3B82F6',
    items: [
      { id: 'road_work_ahead', labelAr: 'أعمال طريق أمامك (Road Work Ahead)', labelEn: 'Road Work Ahead Sign', icon: '🚧', size: [38, 38] },
      { id: 'detour_ahead', labelAr: 'تحويلة أمامك (Detour Ahead)', labelEn: 'Detour Ahead Warning', icon: '⚠️', size: [38, 38] },
      { id: 'lane_closed_right', labelAr: 'إغلاق المسار الأيمن (Right Lane Closed)', labelEn: 'Right Lane Closed', icon: '⛔', size: [38, 38] },
      { id: 'lane_closed_left', labelAr: 'إغلاق المسار الأيسر (Left Lane Closed)', labelEn: 'Left Lane Closed', icon: '⛔', size: [38, 38] },
      { id: 'road_narrows', labelAr: 'الطريق يضيق أمامك (Road Narrows)', labelEn: 'Road Narrows Warning', icon: '⚠️', size: [36, 36] },
      { id: 'speed_hump', labelAr: 'مطب صناعي للتهدئة (Speed Hump)', labelEn: 'Speed Hump Ahead', icon: '〽️', size: [36, 36] },
      { id: 'two_way_traffic', labelAr: 'حركة سير بالاتجاهين (Two-Way)', labelEn: 'Two-Way Traffic', icon: '↕️', size: [36, 36] },
      { id: 'detour_split_arrow', labelAr: 'سهم توجيه التحويلة الإلزامي (↖️)', labelEn: 'Mandatory Detour Arrow', icon: '↖️', size: [34, 34] },
      { id: 'mandatory_right', labelAr: 'الزم اليمين إجباري (➡️)', labelEn: 'Keep Right Sign', icon: '➡️', size: [34, 34] },
      { id: 'mandatory_left', labelAr: 'الزم اليسار إجباري (⬅️)', labelEn: 'Keep Left Sign', icon: '⬅️', size: [34, 34] },
      { id: 'chevron_hazard', labelAr: 'شواخص أسهم عاكسة (Chevron ««)', labelEn: 'Chevron Alignment Marker', icon: '🔶', size: [36, 22] },
    ]
  },
  barriers: {
    titleAr: 'حواجز الأمان والأجهزة الذكية',
    titleEn: 'Safety Devices & Barricades',
    color: '#F97316',
    items: [
      { id: 'concrete_barrier', labelAr: 'صب خرساني نيوجيرسي منفرد (NJB)', labelEn: 'Single Concrete Barrier', icon: '🧱', size: [38, 20] },
      { id: 'water_barrier', labelAr: 'حاجز مائي بلاستيكي عازل', labelEn: 'Water-Filled Barrier', icon: '🔵', size: [38, 20] },
      { id: 'traffic_cone', labelAr: 'مخروط مروري مع شريط عاكس', labelEn: 'Reflective Traffic Cone', icon: '🔶', size: [22, 22] },
      { id: 'delineator_post', labelAr: 'عمود توجيه مرن عاكس (Delineator)', labelEn: 'Flexible Delineator Post', icon: '🪧', size: [16, 34] },
      { id: 'steel_guardrail', labelAr: 'حاجز حديدي واقي (W-Beam Guardrail)', labelEn: 'Steel Guardrail', icon: '🛡️', size: [42, 16] },
      { id: 'temp_traffic_signal', labelAr: 'إشارة ضوئية مؤقتة ذكية بالطاقة الشمسية', labelEn: 'Temporary Traffic Signal', icon: '🚦', size: [22, 40] },
      { id: 'flagman_post', labelAr: 'موقع رجل الراية وتنظيم السير (Flagman)', labelEn: 'Flagman Safety Station', icon: '🧑‍🦺', size: [28, 36] },
      { id: 'pedestrian_walkway_ramp', labelAr: 'ممر ومنحدر مشاة محمي (Pedestrian Ramp)', labelEn: 'Protected Pedestrian Ramp', icon: '🚶', size: [44, 24] }
    ]
  }
};

// ── Rich SVG/HTML Renderer for Saudi MOT Signs & Barrier Posters ──
const renderMotItemHtml = (type, rotation = 0, isAr = true) => {
  const rotStyle = `transform: rotate(${rotation}deg); transform-origin: center;`;

  switch (type) {
    case 'concrete_njb_poster':
      return `
        <div style="${rotStyle} display:flex; flex-direction:column; align-items:center; filter:drop-shadow(0 5px 12px rgba(0,0,0,0.75)); cursor:move; user-select:none;">
          <div style="background:#dc2626; color:white; font-family:system-ui,sans-serif; font-size:9px; font-weight:900; padding:2px 6px; border-radius:3px; white-space:nowrap; border:1px solid #991b1b; letter-spacing:0.2px; margin-bottom:2px;">
            CONCRETE NJB NO GAP W/LIGHTS 3LINE
          </div>
          <svg width="84" height="46" viewBox="0 0 84 48">
            <polygon points="12,42 72,42 62,18 22,18" fill="#94a3b8" stroke="#475569" stroke-width="1.5" />
            <rect x="36" y="18" width="12" height="24" fill="#ef4444" stroke="#b91c1c" stroke-width="1" />
            <rect x="8" y="42" width="68" height="5" fill="#475569" rx="1.5" />
            <path d="M 26 13 Q 42 20 58 13" fill="none" stroke="#22c55e" stroke-width="2" />
            <circle cx="26" cy="11" r="4.5" fill="#facc15" stroke="#ca8a04" stroke-width="1" />
            <circle cx="58" cy="11" r="4.5" fill="#facc15" stroke="#ca8a04" stroke-width="1" />
            <circle cx="26" cy="11" r="6.5" fill="none" stroke="#fef08a" stroke-dasharray="2,2" />
            <circle cx="58" cy="11" r="6.5" fill="none" stroke="#fef08a" stroke-dasharray="2,2" />
          </svg>
        </div>
      `;

    case 'plastic_njb_poster':
      return `
        <div style="${rotStyle} display:flex; flex-direction:column; align-items:center; filter:drop-shadow(0 5px 12px rgba(0,0,0,0.75)); cursor:move; user-select:none;">
          <div style="background:#dc2626; color:white; font-family:system-ui,sans-serif; font-size:9px; font-weight:900; padding:2px 6px; border-radius:3px; white-space:nowrap; border:1px solid #991b1b; letter-spacing:0.2px; margin-bottom:2px;">
            PLASTIC NJB NO GAP W/LIGHTS 3LINE
          </div>
          <svg width="84" height="46" viewBox="0 0 84 48">
            <path d="M 8 42 L 14 18 L 32 18 L 36 42 Z" fill="#ef4444" stroke="#b91c1c" stroke-width="1.5" />
            <path d="M 32 42 L 38 18 L 56 18 L 60 42 Z" fill="#2563eb" stroke="#1d4ed8" stroke-width="1.5" />
            <path d="M 56 42 L 62 18 L 76 18 L 78 42 Z" fill="#ef4444" stroke="#b91c1c" stroke-width="1.5" />
            <path d="M 22 13 Q 44 20 68 13" fill="none" stroke="#22c55e" stroke-width="2" />
            <circle cx="22" cy="11" r="4.5" fill="#facc15" stroke="#ca8a04" stroke-width="1" />
            <circle cx="68" cy="11" r="4.5" fill="#facc15" stroke="#ca8a04" stroke-width="1" />
          </svg>
        </div>
      `;

    case 'road_work_ends_poster':
      return `
        <div style="${rotStyle} position:relative; filter:drop-shadow(0 5px 12px rgba(0,0,0,0.8)); cursor:move; user-select:none;">
          <div style="background:#fef08a; border:2px solid #ca8a04; border-radius:4px; padding:3px 8px; text-align:center; color:#713f12; font-weight:900; font-size:9.5px; transform:rotate(-12deg); box-shadow:0 3px 10px rgba(0,0,0,0.5);">
            <div>نهاية منطقة العمل</div>
            <div style="font-size:8px; letter-spacing:0.3px; border-top:1px solid #ca8a04; margin-top:2px; padding-top:1px;">ROAD WORK ENDS</div>
          </div>
          <div style="position:absolute; right:-12px; top:-2px; display:flex; flex-direction:column; gap:3px;">
            <span style="display:inline-block; width:9px; height:9px; border-radius:50%; background:#facc15; border:1px solid #eab308; box-shadow:0 0 8px #facc15;"></span>
            <span style="display:inline-block; width:9px; height:9px; border-radius:50%; background:#facc15; border:1px solid #eab308; box-shadow:0 0 8px #facc15;"></span>
          </div>
        </div>
      `;

    case 'solar_vms_arrow_board':
      return `
        <div style="${rotStyle} background:#0f172a; border:2px solid #eab308; border-radius:6px; padding:4px 8px; text-align:center; box-shadow:0 4px 10px rgba(0,0,0,0.8); cursor:move;">
          <div style="color:#facc15; font-size:14px; font-weight:bold; letter-spacing:2px;">▶▶▶</div>
          <div style="color:#ffffff; font-size:8px; font-weight:bold; margin-top:1px;">لوحة تحويل وامضة</div>
        </div>
      `;

    case 'stop_sign':
      return `
        <div style="${rotStyle} filter:drop-shadow(0 3px 8px rgba(0,0,0,0.7)); cursor:move;">
          <svg width="34" height="34" viewBox="0 0 40 40">
            <polygon points="12,2 28,2 38,12 38,28 28,38 12,38 2,28 2,12" fill="#dc2626" stroke="#ffffff" stroke-width="2.5" />
            <text x="20" y="25" text-anchor="middle" fill="#ffffff" font-weight="900" font-size="12" font-family="system-ui, Arial, sans-serif">STOP</text>
          </svg>
        </div>
      `;

    case 'give_way':
      return `
        <div style="${rotStyle} filter:drop-shadow(0 3px 8px rgba(0,0,0,0.7)); cursor:move;">
          <svg width="34" height="34" viewBox="0 0 40 40">
            <polygon points="20,38 2,4 38,4" fill="#ffffff" stroke="#dc2626" stroke-width="4" />
          </svg>
        </div>
      `;

    case 'slow_sign':
      return `
        <div style="${rotStyle} display:flex; flex-direction:column; align-items:center; filter:drop-shadow(0 3px 8px rgba(0,0,0,0.7)); cursor:move;">
          <span style="width:7px; height:7px; border-radius:50%; background:#facc15; box-shadow:0 0 6px #facc15; border:1px solid white; margin-bottom:-2px; z-index:2;"></span>
          <div style="width:28px; height:28px; border-radius:50%; background:#f59e0b; border:2px solid white; display:flex; align-items:center; justify-content:center; color:#000; font-weight:900; font-size:8.5px; box-shadow:0 2px 6px rgba(0,0,0,0.5);">
            SLOW
          </div>
        </div>
      `;

    case 'speed_limit_50':
      return `
        <div style="${rotStyle} display:flex; align-items:center; gap:2px; filter:drop-shadow(0 3px 8px rgba(0,0,0,0.7)); cursor:move;">
          <svg width="22" height="22" viewBox="0 0 24 24">
            <polygon points="12,2 22,20 2,20" fill="#facc15" stroke="#dc2626" stroke-width="2" />
            <text x="12" y="17" text-anchor="middle" font-weight="bold" font-size="12" fill="#000">!</text>
          </svg>
          <div style="width:26px; height:26px; border-radius:50%; background:#ffffff; border:2.5px solid #dc2626; display:flex; align-items:center; justify-content:center; color:#000; font-weight:900; font-size:11px;">
            50
          </div>
        </div>
      `;

    case 'speed_limit_30':
    case 'speed_limit_40':
    case 'speed_limit_60':
    case 'speed_limit_70':
    case 'speed_limit_80':
    case 'speed_limit_100': {
      const spd = type.replace('speed_limit_', '');
      return `
        <div style="${rotStyle} width:28px; height:28px; border-radius:50%; background:#ffffff; border:3px solid #dc2626; display:flex; align-items:center; justify-content:center; color:#000; font-weight:900; font-size:11px; filter:drop-shadow(0 3px 8px rgba(0,0,0,0.7)); cursor:move;">
          ${spd}
        </div>
      `;
    }

    case 'road_work_ahead':
    case 'detour_ahead':
    case 'road_narrows':
    case 'two_way_traffic': {
      const isDetour = type === 'detour_ahead';
      const isWork = type === 'road_work_ahead';
      return `
        <div style="${rotStyle} filter:drop-shadow(0 3px 8px rgba(0,0,0,0.7)); cursor:move;">
          <svg width="34" height="34" viewBox="0 0 40 40">
            <polygon points="20,2 38,20 20,38 2,20" fill="#facc15" stroke="#000000" stroke-width="2" />
            <text x="20" y="24" text-anchor="middle" font-size="14">${isWork ? '🚧' : (isDetour ? '⚠️' : '↕️')}</text>
          </svg>
        </div>
      `;
    }

    case 'detour_split_arrow':
    case 'mandatory_right':
    case 'mandatory_left': {
      const arr = type === 'mandatory_right' ? '➡️' : (type === 'mandatory_left' ? '⬅️' : '↖️');
      return `
        <div style="${rotStyle} width:30px; height:30px; border-radius:50%; background:#2563eb; border:2px solid white; display:flex; align-items:center; justify-content:center; color:white; font-weight:bold; font-size:15px; filter:drop-shadow(0 3px 8px rgba(0,0,0,0.7)); cursor:move;">
          ${arr}
        </div>
      `;
    }

    case 'chevron_hazard':
      return `
        <div style="${rotStyle} background:white; border:2px solid #dc2626; padding:1px 5px; border-radius:3px; display:flex; gap:1px; filter:drop-shadow(0 3px 8px rgba(0,0,0,0.7)); cursor:move;">
          <span style="color:#dc2626; font-weight:900; font-size:12px; font-family:monospace;">««</span>
        </div>
      `;

    case 'concrete_barrier':
      return `
        <div style="${rotStyle} width:34px; height:18px; background:#94a3b8; border:1.5px solid #475569; border-radius:2px; display:flex; align-items:center; justify-content:center; filter:drop-shadow(0 2px 6px rgba(0,0,0,0.6)); cursor:move;">
          <span style="font-size:11px;">🧱</span>
        </div>
      `;

    case 'traffic_cone':
      return `
        <div style="${rotStyle} width:22px; height:22px; display:flex; align-items:center; justify-content:center; filter:drop-shadow(0 2px 6px rgba(0,0,0,0.6)); cursor:move;">
          <span style="font-size:18px;">🔶</span>
        </div>
      `;

    default:
      return `
        <div style="${rotStyle} background:rgba(15,23,42,0.9); color:white; border:1.5px solid #38bdf8; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:bold; cursor:move; filter:drop-shadow(0 2px 6px rgba(0,0,0,0.6));">
          📍 ${type}
        </div>
      `;
  }
};

// Helper: Classify a CAD GeoJSON feature into one of the 6 MOT functional groups
const getFeatureFunctionalType = (feature) => {
  const p = feature.properties || {};
  if (p.functionalType && MOT_KEYMAP_GROUPS[p.functionalType]) {
    return p.functionalType;
  }
  const layer = (p.layer || '').toUpperCase();
  const text = (p.text || '').toUpperCase();
  const cIdx = p.colorIndex;
  const col = (p.color || '').toUpperCase();

  // 1. ANNOTATION_GUIDES
  if (
    p.isDimensionLine || p.isLeaderLine || p.tagType === 'dimension' ||
    layer.includes('DIM') || layer.includes('LEADER') || layer.includes('ANNO') ||
    layer.includes('STALBL') || layer.includes('DEFPOINTS') || layer.includes('NOTE') ||
    p.tagType === 'coordinate' || text.startsWith('N:') || text.startsWith('E:')
  ) {
    return 'ANNOTATION_GUIDES';
  }
  // 2. PEDESTRIAN_ROUTE
  if (
    layer.includes('PED') || layer.includes('SIDEWALK') || layer.includes('WALK') ||
    layer.includes('FOOTPATH') || layer.includes('RAMP') || text.includes('PEDESTRIAN') ||
    text.includes('مشاة') || cIdx === 3 || col === '#00E676' || col === '#10B981'
  ) {
    return 'PEDESTRIAN_ROUTE';
  }
  // 3. DETOUR_TAPER
  if (
    cIdx === 1 || col === '#FF1744' || col === '#FF0000' || col === '#EF4444' ||
    layer.includes('DETOUR') || layer.includes('TAPER') || layer.includes('CLOSURE') ||
    text.includes('TRANSITION') || text.includes('انتقالية') || text.includes('تحويلة')
  ) {
    return 'DETOUR_TAPER';
  }
  // 4. SAFETY_BUFFER
  if (
    cIdx === 2 || cIdx === 40 || col === '#FFD600' || col === '#FFFF00' || col === '#F59E0B' ||
    p.isWorkZoneHatch || layer.includes('BUFFER') || layer.includes('SAFTY') ||
    layer.includes('SAFETY') || layer.includes('WORK') || layer.includes('HATCH') ||
    layer === '32' || layer === '1' || text.includes('BUFFER') || text.includes('فاصلة') ||
    text.includes('WORK') || text.includes('عمل')
  ) {
    return 'SAFETY_BUFFER';
  }
  // 5. ROAD_BOUNDARY
  if (
    cIdx === 4 || col === '#00E5FF' || col === '#06B6D4' ||
    layer.includes('تنظيم') || layer.includes('ROAD') || layer.includes('LIMIT') ||
    layer.includes('BOUNDARY') || layer.includes('ROW') || layer.includes('R-O-W') ||
    layer.includes('CURB') || layer.includes('EDGE') || layer.includes('CORRIDOR')
  ) {
    return 'ROAD_BOUNDARY';
  }
  // 6. CENTERLINE_AXIS
  return 'CENTERLINE_AXIS';
};

// ══════════════════════════════════════════════════════════════════════
// Main Component: DwgMapOverlay (Browser-Only Client-Side Engine)
// ══════════════════════════════════════════════════════════════════════
const DwgMapOverlay = ({
  language = 'ar',
  onPlacementsChange,
  anchorLat = 24.4686,
  anchorLng = 39.6120,
  roadName = '',
  preloadedDwgData = null
}) => {
  const isAr = language === 'ar';

  // ── State ──
  const [uploadStatus, setUploadStatus] = useState(preloadedDwgData ? 'done' : 'idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [parsingEngine, setParsingEngine] = useState('browser'); // 'browser' | 'server'
  const [errorMessage, setErrorMessage] = useState('');
  const [dwgData, setDwgData] = useState(preloadedDwgData || null);
  const [placedElements, setPlacedElements] = useState([]);
  const [selectedElementId, setSelectedElementId] = useState(null);
  const [fileName, setFileName] = useState(preloadedDwgData?.fileName || '');
  const [activeBasemap, setActiveBasemap] = useState('hybrid');
  const [isLocked, setIsLocked] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [selectedFeatureInfo, setSelectedFeatureInfo] = useState(null);

  // Multi-File CAD Overlays state
  const [additionalFiles, setAdditionalFiles] = useState([]);
  const [showFileManager, setShowFileManager] = useState(false);

  // Group Visibility state (all 6 MOT groups active by default)
  const [keymapVisibility, setKeymapVisibility] = useState({
    DETOUR_TAPER: true,
    SAFETY_BUFFER: true,
    ROAD_BOUNDARY: true,
    CENTERLINE_AXIS: true,
    PEDESTRIAN_ROUTE: true,
    ANNOTATION_GUIDES: true
  });

  // Precision Alignment & Orientation State
  const [alignOffsetX, setAlignOffsetX] = useState(0); // East-West in meters
  const [alignOffsetY, setAlignOffsetY] = useState(0); // North-South in meters
  const [cadRotationDeg, setCadRotationDeg] = useState(0); // in degrees
  const [showAlignTools, setShowAlignTools] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [activePaletteCategory, setActivePaletteCategory] = useState('posters');
  const [stepMeters, setStepMeters] = useState(1.0); // 0.1, 1.0, 5.0
  const [showWorkZoneCorridor, setShowWorkZoneCorridor] = useState(true);

  // ── Refs ──
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const baseTileLayerRef = useRef(null);
  const geoJsonLayerRef = useRef(null);
  const workZoneLayerRef = useRef(null);
  const additionalGeoJsonLayersRef = useRef({});
  const markersLayerRef = useRef(null);
  const dragHandleRef = useRef(null);
  const fileInputRef = useRef(null);
  const additionalFileInputRef = useRef(null);
  const workerRef = useRef(null);

  const isMapActive = uploadStatus === 'done' || dwgData !== null;

  // Sync preloaded DWG data when passed
  useEffect(() => {
    if (preloadedDwgData) {
      setDwgData(preloadedDwgData);
      setFileName(preloadedDwgData.fileName || 'CAD_Blueprint.dwg');
      setUploadStatus('done');

      if (preloadedDwgData.detectedMotSigns?.length > 0) {
        setPlacedElements(preloadedDwgData.detectedMotSigns);
      }

      if (preloadedDwgData.autoAlignment?.hasControlPoints) {
        const { dLat, dLng, rotationDeg } = preloadedDwgData.autoAlignment;
        const originLat = preloadedDwgData.centerLatLng ? preloadedDwgData.centerLatLng[0] : anchorLat;
        const metersY = dLat * 110574.61;
        const metersX = dLng * (111320 * Math.cos(originLat * Math.PI / 180));
        if (Math.abs(metersX) < 100 && Math.abs(metersY) < 100) {
          setAlignOffsetX(Number(metersX.toFixed(2)));
          setAlignOffsetY(Number(metersY.toFixed(2)));
          setCadRotationDeg(rotationDeg || 0);
        }
      }

      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
        if (preloadedDwgData.centerLatLng) {
          mapInstanceRef.current.setView(preloadedDwgData.centerLatLng, 18, { animate: true });
        }
      }
    }
  }, [preloadedDwgData, anchorLat]);

  // Compute live feature counts per functional group
  const featureCounts = useMemo(() => {
    const counts = {
      DETOUR_TAPER: 0,
      SAFETY_BUFFER: 0,
      ROAD_BOUNDARY: 0,
      CENTERLINE_AXIS: 0,
      PEDESTRIAN_ROUTE: 0,
      ANNOTATION_GUIDES: 0
    };
    if (dwgData?.geojson?.features) {
      dwgData.geojson.features.forEach(f => {
        const type = getFeatureFunctionalType(f);
        if (counts[type] !== undefined) counts[type]++;
      });
    }
    return counts;
  }, [dwgData]);

  // Master Toggle for All Annotations
  const allAnnotationsActive = keymapVisibility.ANNOTATION_GUIDES;
  const toggleAllAnnotations = () => {
    setKeymapVisibility(prev => ({
      ...prev,
      ANNOTATION_GUIDES: !prev.ANNOTATION_GUIDES
    }));
  };

  // Toggle single functional group
  const toggleGroupVisibility = (groupId) => {
    setKeymapVisibility(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  // ── 1. Initialize Leaflet / Map Canvas ──
  useEffect(() => {
    if (!window.L || !mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.invalidateSize();
      setMapReady(true);
      return;
    }

    const initTimer = setTimeout(() => {
      if (!mapContainerRef.current || mapInstanceRef.current) return;

      const initialCenter = dwgData?.centerLatLng || [anchorLat, anchorLng];
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

      const preset = BASEMAP_PRESETS[activeBasemap] || BASEMAP_PRESETS.hybrid;
      const tileOpts = {
        maxZoom: preset.maxZoom,
        maxNativeZoom: preset.maxNativeZoom,
        subdomains: preset.subdomains
      };
      if (preset.tileSize) { tileOpts.tileSize = preset.tileSize; }
      if (preset.zoomOffset !== undefined) { tileOpts.zoomOffset = preset.zoomOffset; }
      baseTileLayerRef.current = window.L.tileLayer(preset.url, tileOpts).addTo(map);

      mapInstanceRef.current = map;
      markersLayerRef.current = window.L.layerGroup({ pane: 'trafficSignsPane' }).addTo(map);
      setMapReady(true);

      map.invalidateSize();
      setTimeout(() => { if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize(); }, 150);
      setTimeout(() => { if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize(); }, 500);
    }, 50);

    return () => {
      clearTimeout(initTimer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        setMapReady(false);
      }
    };
  }, [anchorLat, anchorLng, isMapActive]);

  // ── 2. Switch Basemap (Neutral & COG) ──
  const handleBasemapChange = (key) => {
    setActiveBasemap(key);
    if (!mapInstanceRef.current) return;
    if (baseTileLayerRef.current) {
      mapInstanceRef.current.removeLayer(baseTileLayerRef.current);
    }
    const preset = BASEMAP_PRESETS[key] || BASEMAP_PRESETS.hybrid;
    const tileOpts = {
      maxZoom: preset.maxZoom,
      maxNativeZoom: preset.maxNativeZoom,
      subdomains: preset.subdomains
    };
    if (preset.tileSize) { tileOpts.tileSize = preset.tileSize; }
    if (preset.zoomOffset !== undefined) { tileOpts.zoomOffset = preset.zoomOffset; }
    baseTileLayerRef.current = window.L.tileLayer(preset.url, tileOpts).addTo(mapInstanceRef.current);
  };

  // ── 3. Smart Auto-Alignment Trigger ──
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

  // ── 4. Render CAD Drawing & Additional Files ──
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

    // Filter features based on interactive Keymap visibility
    const filteredGeojson = {
      ...geojson,
      features: geojson.features.filter(f => {
        const props = f.properties || {};

        // Hide raw CAD sign geometry if replaced by MOT markers
        if (props.layer?.toUpperCase().includes('SIGN') || props.keymapId === 'signage' || props.isTrafficSign) {
          return false;
        }

        const functionalType = getFeatureFunctionalType(f);
        if (keymapVisibility[functionalType] === false) {
          return false;
        }

        return true;
      }).map(f => {
        let geom = f.geometry;
        const p = f.properties || {};
        const fnType = getFeatureFunctionalType(f);

        // Prevent open CAD lines (detour tapers, baselines, leaders) from erroneously rendering as closed polygons
        if (geom?.type === 'Polygon' && (fnType === 'DETOUR_TAPER' || fnType === 'CENTERLINE_AXIS' || fnType === 'ANNOTATION_GUIDES' || p.isClosed === false)) {
          const ring = geom.coordinates?.[0] || [];
          const isIdenticalEnd = ring.length > 2 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1];
          const cleanCoords = (isIdenticalEnd && !p.isWorkZoneHatch && !p.isSolid)
            ? ring.slice(0, -1)
            : ring;
          geom = {
            type: 'LineString',
            coordinates: cleanCoords
          };
        }

        return {
          ...f,
          geometry: {
            ...geom,
            coordinates: shiftCoords(geom.coordinates)
          }
        };
      })
    };

    const geoJsonLayer = window.L.geoJSON(filteredGeojson, {
      pane: 'cadVectorPane',
      style: (feature) => {
        const functionalType = getFeatureFunctionalType(feature);
        const groupDef = MOT_KEYMAP_GROUPS[functionalType] || MOT_KEYMAP_GROUPS.CENTERLINE_AXIS;
        const props = feature.properties || {};

        let strokeColor = groupDef.color;
        let weight = groupDef.defaultWeight;
        let dashArray = groupDef.dashArray || null;
        let opacity = 0.95;
        let fillColor = 'transparent';
        let fillOpacity = 0;

        // White leader lines connecting callout boxes have sharp white stroke
        if (props.isLeaderLine || functionalType === 'CENTERLINE_AXIS') {
          strokeColor = '#FFFFFF';
          weight = 2.2;
          opacity = 1.0;
        } else if (functionalType === 'SAFETY_BUFFER' || props.isWorkZoneHatch) {
          fillColor = '#F59E0B';
          fillOpacity = 0.12;
        } else if (functionalType === 'ROAD_BOUNDARY') {
          fillColor = '#06B6D4';
          fillOpacity = 0.08;
        } else if (props.isSolid) {
          fillColor = strokeColor;
          fillOpacity = 0.35;
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
        const functionalType = getFeatureFunctionalType(feature);
        const groupDef = MOT_KEYMAP_GROUPS[functionalType] || MOT_KEYMAP_GROUPS.ANNOTATION_GUIDES;

        if (props.text) {
          const rawText = props.text.trim();
          const upperText = rawText.toUpperCase();
          const rot = (props.rotationDeg || 0) + cadRotationDeg;

          // 1. Stationing / Distance callout badges (180 M, 50 M, 20 M, 60 M, 30 M)
          const isStationDist = /\b\d+\s*M\b/i.test(rawText) || /\bM\s*\d+\b/i.test(rawText) ||
                                upperText.includes('المنطقة') || upperText.includes('منطقة') || upperText.includes('TRANSITION');

          // 2. Section cut indicators (A)
          const isSectionCut = rawText === 'A' || rawText === 'A-A';

          // 3. Coordinate cards (E: ..., N: ...)
          const isCoord = props.tagType === 'coordinate' || upperText.startsWith('E:') || upperText.startsWith('N:');

          if (isCoord) {
            return window.L.marker(latlng, {
              pane: 'cadMarkerPane',
              icon: window.L.divIcon({
                className: 'cad-coord-callout',
                html: `<div style="
                  color: #38bdf8;
                  font-family: 'Consolas', monospace, sans-serif;
                  font-size: 11.5px;
                  font-weight: 900;
                  white-space: nowrap;
                  transform: rotate(${-rot}deg);
                  transform-origin: center;
                  text-shadow: 0 0 5px #000;
                  padding: 3px 7px;
                  border-radius: 6px;
                  background: rgba(15, 23, 42, 0.90);
                  border: 1.5px solid #0284c7;
                  box-shadow: 0 4px 10px rgba(0,0,0,0.6);
                  display: inline-flex;
                  align-items: center;
                  gap: 4px;
                ">
                  <span>📍</span>
                  <span>${rawText}</span>
                </div>`,
                iconSize: [130, 24],
                iconAnchor: [65, 12]
              })
            });
          }

          if (isSectionCut) {
            return window.L.marker(latlng, {
              pane: 'cadMarkerPane',
              icon: window.L.divIcon({
                className: 'cad-section-marker',
                html: `<div style="
                  color: #ffffff;
                  font-family: system-ui, sans-serif;
                  font-size: 12px;
                  font-weight: 900;
                  transform: rotate(${-rot}deg);
                  transform-origin: center;
                  padding: 2px 7px;
                  border-radius: 4px;
                  background: #0f172a;
                  border: 2px solid #ffffff;
                  box-shadow: 0 3px 8px rgba(0,0,0,0.8);
                ">
                  [ ${rawText} ]
                </div>`,
                iconSize: [36, 22],
                iconAnchor: [18, 11]
              })
            });
          }

          if (isStationDist) {
            return window.L.marker(latlng, {
              pane: 'cadMarkerPane',
              icon: window.L.divIcon({
                className: 'cad-zone-station-badge',
                html: `<div style="
                  color: #fbbf24;
                  font-family: system-ui, sans-serif;
                  font-size: 11.5px;
                  font-weight: 800;
                  white-space: nowrap;
                  transform: rotate(${-rot}deg);
                  transform-origin: center;
                  text-shadow: 0 0 4px #000;
                  padding: 2px 6px;
                  border-radius: 5px;
                  background: rgba(15, 23, 42, 0.88);
                  border: 1.5px solid #f59e0b;
                  box-shadow: 0 3px 8px rgba(0,0,0,0.6);
                  display: inline-flex;
                  align-items: center;
                  gap: 4px;
                ">
                  <span style="font-size:10px;">📐</span>
                  <span>${rawText}</span>
                </div>`,
                iconSize: [140, 24],
                iconAnchor: [70, 12]
              })
            });
          }

          return window.L.marker(latlng, {
            pane: 'cadMarkerPane',
            icon: window.L.divIcon({
              className: 'cad-explanatory-annotation',
              html: `<div style="
                color: ${groupDef.color};
                font-family: 'Consolas', monospace, sans-serif;
                font-size: 11px;
                font-weight: 800;
                white-space: nowrap;
                transform: rotate(${-rot}deg);
                transform-origin: center;
                text-shadow: 0 0 4px #000;
                padding: 2px 6px;
                border-radius: 4px;
                background: rgba(15, 23, 42, 0.85);
                border: 1px solid ${groupDef.color}80;
                display: inline-flex;
                align-items: center;
                gap: 4px;
              ">
                <span style="font-size: 9px;">${groupDef.icon}</span>
                <span>${rawText}</span>
              </div>`,
              iconSize: [140, 22],
              iconAnchor: [70, 11]
            })
          });
        }

        return window.L.circleMarker(latlng, {
          pane: 'cadVectorPane',
          radius: 3.5,
          color: groupDef.color,
          weight: 1.5,
          fillOpacity: 0.9,
          fillColor: '#FFFFFF'
        });
      },
      onEachFeature: (feature, layer) => {
        const props = feature.properties || {};
        const functionalType = getFeatureFunctionalType(feature);
        const groupDef = MOT_KEYMAP_GROUPS[functionalType] || MOT_KEYMAP_GROUPS.CENTERLINE_AXIS;
        const roleText = isAr ? groupDef.titleAr : groupDef.titleEn;

        const tooltipHtml = `
          <div style="font-family: system-ui, sans-serif; font-size: 11px; padding: 5px; min-width: 220px; direction: ${isAr ? 'rtl' : 'ltr'};">
            <div style="font-weight: 800; color: ${groupDef.color}; border-bottom: 1px solid #334155; padding-bottom: 4px; margin-bottom: 5px; display: flex; align-items: center; justify-content: space-between;">
              <span style="display: flex; align-items: center; gap: 5px;">
                <span>${groupDef.icon}</span>
                <span>${roleText}</span>
              </span>
              <span style="font-size: 9px; font-family: monospace; background: #0f172a; color: #94a3b8; padding: 1px 4px; border-radius: 3px;">
                ${props.layer || '0'}
              </span>
            </div>
            <p style="font-size: 10px; color: #cbd5e1; margin-bottom: 4px;">${isAr ? groupDef.descAr : groupDef.descEn}</p>
            ${props.lengthMeters ? `<div style="color: #22c55e; font-weight:bold; font-size:10.5px;"><b>${isAr ? 'الطول الهندسي:' : 'Length:'}</b> ${props.lengthMeters} م</div>` : ''}
            ${props.text ? `<div style="color:#fbbf24; font-weight:bold; margin-top:2px;"><b>${isAr ? 'النص/البُعد:' : 'Text/Dim:'}</b> ${props.text}</div>` : ''}
          </div>
        `;

        layer.bindTooltip(tooltipHtml, { sticky: true, className: 'cad-rich-tooltip' });

        layer.on('click', () => {
          setSelectedFeatureInfo({
            layer: props.layer,
            type: feature.geometry?.type,
            functionalType,
            roleAr: groupDef.titleAr,
            roleEn: groupDef.titleEn,
            color: groupDef.color,
            lengthMeters: props.lengthMeters,
            bearingDeg: props.bearingDeg,
            text: props.text
          });
        });
      }
    });

    geoJsonLayer.addTo(mapInstanceRef.current);
    geoJsonLayerRef.current = geoJsonLayer;

    // Direct spatial drag handle
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
              " title="${isAr ? 'اسحب من هنا لتحريك ومطابقة المخطط على الشارع مباشرة' : 'Drag to align CAD drawing onto road'}">
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
  }, [mapReady, dwgData, keymapVisibility, alignOffsetX, alignOffsetY, cadRotationDeg, isLocked, anchorLat, anchorLng, isAr]);

  // ── 4b. Render Working Area Corridor & Zones Sketch Overlay (Following Actual Yellow CAD Line "منطقة عمل") ──
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (workZoneLayerRef.current) {
      mapInstanceRef.current.removeLayer(workZoneLayerRef.current);
      workZoneLayerRef.current = null;
    }

    if (!showWorkZoneCorridor || !dwgData) return;

    const layerGroup = window.L.layerGroup({ pane: 'cadMarkerPane' });
    const originLat = dwgData.centerLatLng ? dwgData.centerLatLng[0] : anchorLat;
    const originLng = dwgData.centerLatLng ? dwgData.centerLatLng[1] : anchorLng;
    const cosLat = Math.cos(originLat * Math.PI / 180);

    const dLat = alignOffsetY / 110574.61;
    const dLng = alignOffsetX / (111320 * cosLat);
    const rotRad = (cadRotationDeg * Math.PI) / 180;

    const transformPoint = (lat, lng) => {
      let curLng = lng + dLng;
      let curLat = lat + dLat;
      if (rotRad !== 0) {
        const dx = (curLng - originLng) * cosLat;
        const dy = curLat - originLat;
        const cosR = Math.cos(rotRad);
        const sinR = Math.sin(rotRad);
        const newDx = dx * cosR - dy * sinR;
        const newDy = dx * sinR + dy * cosR;
        return [originLat + newDy, originLng + newDx / cosLat];
      }
      return [curLat, curLng];
    };

    const mToLat = 1 / 110574.61;
    const mToLng = 1 / (111320 * cosLat);

    const allFeatures = dwgData.geojson?.features || [];

    // ── 1. Find the ACTUAL Yellow CAD Line ("منطقة عمل" / Work Zone) ──
    const yellowWorkFeatures = allFeatures.filter(f => {
      const p = f.properties || {};
      const col = (p.color || '').toUpperCase();
      const layer = (p.layer || '').toUpperCase();
      const isYellow = p.colorIndex === 2 || col === '#FFFF00' || col === '#FFD700' || col === '#FFD600';
      const isWorkLayer = layer.includes('عمل') || layer.includes('WORK') || layer.includes('TRENCH') || layer.includes('60');
      return (isYellow || isWorkLayer) && (f.geometry?.type === 'LineString' || f.geometry?.type === 'Polygon');
    });

    // ── 2. Find the ACTUAL Red CAD Taper Lines ("المنطقة الانتقالية" / Transition Zone) ──
    const redTaperFeatures = allFeatures.filter(f => {
      const p = f.properties || {};
      const col = (p.color || '').toUpperCase();
      const layer = (p.layer || '').toUpperCase();
      const isRed = p.colorIndex === 1 || col === '#FF0000' || col === '#EF4444' || col === '#DC2626';
      const isTaperLayer = layer.includes('انتقال') || layer.includes('TAPER') || layer.includes('DETOUR') || layer.includes('50') || layer.includes('180');
      return (isRed || isTaperLayer) && (f.geometry?.type === 'LineString' || f.geometry?.type === 'Polygon');
    });

    // ── 3. Render Shaded Corridor along the Actual Yellow Line ("منطقة عمل") ──
    if (yellowWorkFeatures.length > 0) {
      yellowWorkFeatures.forEach((feat, idx) => {
        const rawCoords = feat.geometry?.type === 'Polygon' ? feat.geometry.coordinates[0] : feat.geometry.coordinates;
        if (!rawCoords || rawCoords.length < 2) return;

        const shifted = rawCoords.map(c => transformPoint(c[1], c[0]));

        // Primary vivid yellow CAD line
        window.L.polyline(shifted, {
          color: '#FACC15',
          weight: 6,
          opacity: 1.0,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(layerGroup);

        // Highlighted trench corridor polygon around the yellow line (4.2m width)
        const corridorPolygon = [];
        const halfWidthMeters = 2.1;
        for (let i = 0; i < shifted.length - 1; i++) {
          const p1 = shifted[i];
          const p2 = shifted[i + 1];
          const dy = (p2[0] - p1[0]) * 110574.61;
          const dx = (p2[1] - p1[1]) * (111320 * cosLat);
          const len = Math.hypot(dx, dy) || 1;
          const nx = (-dy / len) * halfWidthMeters * mToLng;
          const ny = (dx / len) * halfWidthMeters * mToLat;

          if (i === 0) {
            corridorPolygon.push([p1[0] + ny, p1[1] + nx]);
          }
          corridorPolygon.push([p2[0] + ny, p2[1] + nx]);
        }
        for (let i = shifted.length - 1; i > 0; i--) {
          const p1 = shifted[i - 1];
          const p2 = shifted[i];
          const dy = (p2[0] - p1[0]) * 110574.61;
          const dx = (p2[1] - p1[1]) * (111320 * cosLat);
          const len = Math.hypot(dx, dy) || 1;
          const nx = (-dy / len) * halfWidthMeters * mToLng;
          const ny = (dx / len) * halfWidthMeters * mToLat;

          corridorPolygon.push([p2[0] - ny, p2[1] - nx]);
          if (i === 1) {
            corridorPolygon.push([p1[0] - ny, p1[1] - nx]);
          }
        }

        if (corridorPolygon.length >= 3) {
          window.L.polygon(corridorPolygon, {
            color: '#F59E0B',
            weight: 2.5,
            opacity: 0.95,
            fillColor: '#F59E0B',
            fillOpacity: 0.32,
            dashArray: '5, 5'
          }).addTo(layerGroup);
        }

        // Anchor Badge at Midpoint of the yellow line
        const midIdx = Math.floor(shifted.length / 2);
        const midPoint = shifted[midIdx];
        window.L.marker(midPoint, {
          icon: window.L.divIcon({
            className: 'zone-sketch-badge',
            html: `<div style="
              background: rgba(245, 158, 11, 0.95);
              color: #ffffff;
              font-family: system-ui, sans-serif;
              font-size: 11.5px;
              font-weight: 800;
              padding: 3px 8px;
              border-radius: 6px;
              border: 1.5px solid #ffffff;
              box-shadow: 0 4px 12px rgba(0,0,0,0.6);
              white-space: nowrap;
              display: inline-flex;
              align-items: center;
              gap: 4px;
            ">
              <span>🚧</span>
              <span>${isAr ? 'منطقة العمل (60M)' : 'Work Zone (60M)'}</span>
            </div>`,
            iconSize: [160, 24],
            iconAnchor: [80, 12]
          })
        }).addTo(layerGroup);
      });
    } else {
      // Fallback if CAD does not tag yellow color: generate aligned work corridor
      const wzPoints = [
        transformPoint(originLat + 10 * mToLat, originLng - 25 * mToLng),
        transformPoint(originLat + 45 * mToLat, originLng - 45 * mToLng),
        transformPoint(originLat + 50 * mToLat, originLng - 38 * mToLng),
        transformPoint(originLat + 15 * mToLat, originLng - 18 * mToLng)
      ];

      const workPoly = window.L.polygon(wzPoints, {
        color: '#F59E0B',
        weight: 3.5,
        opacity: 0.95,
        fillColor: '#F59E0B',
        fillOpacity: 0.28,
        dashArray: '6, 6'
      }).addTo(layerGroup);

      window.L.marker(workPoly.getBounds().getCenter(), {
        icon: window.L.divIcon({
          className: 'zone-sketch-badge',
          html: `<div style="
            background: rgba(245, 158, 11, 0.95);
            color: #ffffff;
            font-family: system-ui, sans-serif;
            font-size: 11px;
            font-weight: 800;
            padding: 3px 8px;
            border-radius: 6px;
            border: 1.5px solid #ffffff;
            box-shadow: 0 4px 12px rgba(0,0,0,0.6);
            white-space: nowrap;
            display: inline-flex;
            align-items: center;
            gap: 4px;
          ">
            <span>🚧</span>
            <span>${isAr ? 'منطقة العمل (60M)' : 'Work Zone (60M)'}</span>
          </div>`,
          iconSize: [160, 24],
          iconAnchor: [80, 12]
        })
      }).addTo(layerGroup);
    }

    // ── 4. Render Shaded Corridor along the Actual Red Lines ("المنطقة الانتقالية") ──
    if (redTaperFeatures.length > 0) {
      redTaperFeatures.forEach((feat) => {
        const rawCoords = feat.geometry?.type === 'Polygon' ? feat.geometry.coordinates[0] : feat.geometry.coordinates;
        if (!rawCoords || rawCoords.length < 2) return;

        const shifted = rawCoords.map(c => transformPoint(c[1], c[0]));

        window.L.polyline(shifted, {
          color: '#EF4444',
          weight: 4.5,
          opacity: 1.0,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(layerGroup);

        const midIdx = Math.floor(shifted.length / 2);
        window.L.marker(shifted[midIdx], {
          icon: window.L.divIcon({
            className: 'zone-sketch-badge',
            html: `<div style="
              background: rgba(239, 68, 68, 0.92);
              color: #ffffff;
              font-family: system-ui, sans-serif;
              font-size: 11px;
              font-weight: 800;
              padding: 3px 8px;
              border-radius: 6px;
              border: 1.5px solid #ffffff;
              box-shadow: 0 4px 12px rgba(0,0,0,0.6);
              white-space: nowrap;
              display: inline-flex;
              align-items: center;
              gap: 4px;
            ">
              <span>📐</span>
              <span>${isAr ? 'المنطقة الانتقالية (50M / 180M)' : 'Transition Zone (50M / 180M)'}</span>
            </div>`,
            iconSize: [180, 24],
            iconAnchor: [90, 12]
          })
        }).addTo(layerGroup);
      });
    }

    // ── 5. Concrete & Plastic NJB Annotation Callout Boxes ──
    const njb1Pos = transformPoint(originLat - 15 * mToLat, originLng - 40 * mToLng);
    window.L.marker(njb1Pos, {
      icon: window.L.divIcon({
        className: 'njb-callout-box',
        html: `<div style="
          background: #dc2626;
          color: #ffffff;
          font-family: system-ui, monospace, sans-serif;
          font-size: 10px;
          font-weight: 900;
          padding: 4px 7px;
          border-radius: 4px;
          border: 1.5px solid #ffffff;
          box-shadow: 0 4px 10px rgba(0,0,0,0.7);
          text-align: center;
          line-height: 1.2;
        ">
          CONCRETE NJB NO GAP<br/>W/LIGHTS 3LINE
        </div>`,
        iconSize: [140, 36],
        iconAnchor: [70, 18]
      })
    }).addTo(layerGroup);

    const njb2Pos = transformPoint(originLat + 5 * mToLat, originLng + 45 * mToLng);
    window.L.marker(njb2Pos, {
      icon: window.L.divIcon({
        className: 'njb-callout-box',
        html: `<div style="
          background: #dc2626;
          color: #ffffff;
          font-family: system-ui, monospace, sans-serif;
          font-size: 10px;
          font-weight: 900;
          padding: 4px 7px;
          border-radius: 4px;
          border: 1.5px solid #ffffff;
          box-shadow: 0 4px 10px rgba(0,0,0,0.7);
          text-align: center;
          line-height: 1.2;
        ">
          PLASTIC NJB NO GAP<br/>W/LIGHTS 3LINE
        </div>`,
        iconSize: [135, 36],
        iconAnchor: [67, 18]
      })
    }).addTo(layerGroup);

    layerGroup.addTo(mapInstanceRef.current);
    workZoneLayerRef.current = layerGroup;
  }, [mapReady, dwgData, showWorkZoneCorridor, alignOffsetX, alignOffsetY, cadRotationDeg, anchorLat, anchorLng, isAr]);

  // ── 5. Render Additional Files Overlays ──
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear previous additional layers
    Object.values(additionalGeoJsonLayersRef.current).forEach(layer => {
      if (layer && mapInstanceRef.current) mapInstanceRef.current.removeLayer(layer);
    });
    additionalGeoJsonLayersRef.current = {};

    additionalFiles.forEach((fileItem) => {
      if (!fileItem.visible || !fileItem.data?.geojson) return;

      const layer = window.L.geoJSON(fileItem.data.geojson, {
        pane: 'cadVectorPane',
        style: {
          color: fileItem.color || '#38bdf8',
          weight: 2,
          opacity: 0.85
        }
      });
      layer.addTo(mapInstanceRef.current);
      additionalGeoJsonLayersRef.current[fileItem.id] = layer;
    });
  }, [additionalFiles]);

  // ── 6. Render Moveable & Interactive Traffic Elements ──
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();

    placedElements.forEach((el, idx) => {
      let itemDef = null;
      for (const cat of Object.values(SAUDI_MOT_ELEMENTS)) {
        const found = cat.items.find(i => i.id === el.type);
        if (found) { itemDef = found; break; }
      }
      if (!itemDef) itemDef = { icon: '📍', size: [34, 34], labelAr: el.type, labelEn: el.type };

      const w = itemDef.size ? itemDef.size[0] : 34;
      const h = itemDef.size ? itemDef.size[1] : 34;
      const isSelected = selectedElementId === el.id;

      const marker = window.L.marker([el.lat, el.lng], {
        draggable: true,
        pane: 'trafficSignsPane',
        icon: window.L.divIcon({
          className: `traffic-element-marker ${isSelected ? 'sign-selected' : ''}`,
          html: `
            <div style="position:relative; cursor:grab;" title="${isAr ? itemDef.labelAr : itemDef.labelEn}">
              ${renderMotItemHtml(el.type, el.rotation || 0, isAr)}
              <div style="position:absolute; top:-6px; right:-6px; width:14px; height:14px; border-radius:50%; background:#2563eb; color:white; font-size:9px; font-weight:bold; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 4px rgba(0,0,0,0.5); opacity:0.85;">
                ✥
              </div>
            </div>
          `,
          iconSize: [w, h],
          iconAnchor: [w / 2, h / 2]
        })
      });

      marker.on('dragstart', (e) => {
        setSelectedElementId(el.id);
        if (e.target.getElement()) e.target.getElement().style.cursor = 'grabbing';
      });

      marker.on('dragend', (e) => {
        if (e.target.getElement()) e.target.getElement().style.cursor = 'grab';
        const { lat, lng } = e.target.getLatLng();
        setPlacedElements(prev => {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], lat, lng };
          return updated;
        });
      });

      marker.on('click', () => {
        setSelectedElementId(el.id);
        // Quick 45-degree rotation on click
        setPlacedElements(prev => {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], rotation: ((updated[idx].rotation || 0) + 45) % 360 };
          return updated;
        });
      });

      marker.on('contextmenu', (e) => {
        window.L.DomEvent.stopPropagation(e);
        setPlacedElements(prev => prev.filter((_, i) => i !== idx));
        if (selectedElementId === el.id) setSelectedElementId(null);
      });

      markersLayerRef.current.addLayer(marker);
    });

    if (onPlacementsChange) onPlacementsChange(placedElements);
  }, [placedElements, selectedElementId, isAr]);

  // ── 7. In-Browser Client-Side CAD Parser (0 Server Calls) ──
  const parseCadInBrowser = useCallback(async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const fileContent = event.target.result;
          const data = await parseCadClientSide(
            fileContent,
            file.name,
            anchorLat,
            anchorLng,
            null,
            (pct) => setUploadProgress(pct)
          );
          resolve(data);
        } catch (err) {
          reject(err);
        }
      };

      reader.onerror = (err) => reject(err);
      reader.readAsText(file);
    });
  }, [anchorLat, anchorLng]);

  // ── 8. Unified CAD File Upload Handler (Browser-First + Fallback) ──
  const handleFileUpload = useCallback(async (file) => {
    if (!file) return;
    const nameLower = file.name.toLowerCase();

    if (!nameLower.endsWith('.dwg') && !nameLower.endsWith('.dxf')) {
      setErrorMessage(isAr ? 'يرجى رفع ملف DWG أو DXF' : 'Please upload a DWG or DXF file');
      setUploadStatus('error');
      return;
    }

    setFileName(file.name);
    setUploadStatus('uploading');
    setUploadProgress(10);
    setErrorMessage('');

    try {
      let data = null;

      // 1. If DXF, run 100% Client-Side In-Browser Web Worker Parser
      if (nameLower.endsWith('.dxf')) {
        setParsingEngine('browser');
        setUploadStatus('parsing');
        data = await parseCadInBrowser(file);
      } else {
        // 2. Binary DWG: Process with Server / Fallback Parser
        setParsingEngine('server');
        setUploadProgress(35);
        setUploadStatus('parsing');

        const formData = new FormData();
        formData.append('dwgFile', file);
        formData.append('anchorLat', anchorLat.toString());
        formData.append('anchorLng', anchorLng.toString());

        const response = await fetch('/api/parse-dwg', {
          method: 'POST',
          body: formData
        });

        setUploadProgress(85);

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Server error: ${response.status}`);
        }

        data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Parsing failed');
        }
      }

      setUploadProgress(100);
      setDwgData(data);

      if (data.detectedMotSigns?.length > 0) {
        setPlacedElements(data.detectedMotSigns);
      }

      if (data.autoAlignment?.hasControlPoints) {
        const { dLat, dLng, rotationDeg } = data.autoAlignment;
        const originLat = data.centerLatLng ? data.centerLatLng[0] : anchorLat;
        const metersY = dLat * 110574.61;
        const metersX = dLng * (111320 * Math.cos(originLat * Math.PI / 180));
        if (Math.abs(metersX) < 100 && Math.abs(metersY) < 100) {
          setAlignOffsetX(Number(metersX.toFixed(2)));
          setAlignOffsetY(Number(metersY.toFixed(2)));
          setCadRotationDeg(rotationDeg || 0);
        }
      }

      setUploadStatus('done');
    } catch (err) {
      console.error('CAD Upload Error:', err);
      setErrorMessage(err.message || 'Error processing CAD file');
      setUploadStatus('error');
    }
  }, [anchorLat, anchorLng, parseCadInBrowser, isAr]);

  // ── 9. Upload Additional Overlay File Handler (In-Browser + Server) ──
  const handleAdditionalFileUpload = useCallback(async (file) => {
    if (!file) return;
    try {
      let data = null;
      if (file.name.toLowerCase().endsWith('.dxf')) {
        data = await parseCadInBrowser(file);
      } else {
        const formData = new FormData();
        formData.append('dwgFile', file);
        formData.append('anchorLat', anchorLat.toString());
        formData.append('anchorLng', anchorLng.toString());

        const response = await fetch('/api/parse-dwg', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) throw new Error('Failed to parse additional file');
        data = await response.json();
      }

      if (!data.success) throw new Error(data.error || 'Parsing failed');

      const colors = ['#38bdf8', '#a855f7', '#ec4899', '#f97316', '#22c55e'];
      const randomColor = colors[additionalFiles.length % colors.length];

      setAdditionalFiles(prev => [
        ...prev,
        {
          id: `file_${Date.now()}`,
          name: file.name,
          data,
          visible: true,
          color: randomColor
        }
      ]);
      setShowFileManager(true);
    } catch (err) {
      console.error('Additional file upload error:', err);
      alert(isAr ? `فشل تحميل الملف الإضافي: ${err.message}` : `Failed to upload additional file: ${err.message}`);
    }
  }, [anchorLat, anchorLng, parseCadInBrowser, additionalFiles, isAr]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) handleFileUpload(files[0]);
  }, [handleFileUpload]);

  const handleFileInput = useCallback((e) => {
    const files = e.target.files;
    if (files.length > 0) handleFileUpload(files[0]);
  }, [handleFileUpload]);

  const handleReset = useCallback(() => {
    setDwgData(null);
    setPlacedElements([]);
    setAdditionalFiles([]);
    setUploadStatus('idle');
    setFileName('');
    setAlignOffsetX(0);
    setAlignOffsetY(0);
    setCadRotationDeg(0);
    setSelectedFeatureInfo(null);
    setSelectedElementId(null);
  }, []);

  const handleAddElement = (typeId) => {
    if (!mapInstanceRef.current) return;
    const center = mapInstanceRef.current.getCenter();
    const newId = `elem_${Date.now()}`;
    setPlacedElements(prev => [
      ...prev,
      { id: newId, type: typeId, lat: center.lat, lng: center.lng, rotation: 0 }
    ]);
    setSelectedElementId(newId);
  };

  const selectedElement = placedElements.find(e => e.id === selectedElementId);

  return (
    <div className="space-y-4">
      {/* ── Empty State / Drag & Drop Dropzone ── */}
      {!isMapActive && (
        <div
          className="border-2 border-dashed border-slate-300 hover:border-brand-primary bg-slate-50 hover:bg-brand-primary/5 rounded-2xl p-8 text-center cursor-pointer transition-all shadow-xs"
          onDragOver={(e) => e.preventDefault()}
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
          <div className="flex justify-center gap-3 mb-3">
            <Upload className="h-10 w-10 text-brand-primary animate-bounce" />
          </div>
          <p className="text-sm font-bold text-slate-800">
            {isAr ? 'اسحب وأفلت مخطط CAD (DWG / DXF) هنا للتحليل المكاني' : 'Drag & Drop CAD (DWG / DXF) Blueprint here'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {isAr ? '⚡ معالجة فورية داخل المتصفح (Web Worker + Proj4) • يدعم UTM 37N-39N و GeoTIFF COG' : '⚡ 100% In-Browser Engine (Web Worker + Proj4) • Supports Saudi UTM & GeoTIFF COGs'}
          </p>
        </div>
      )}

      {/* ── Upload / Parsing Progress ── */}
      {(uploadStatus === 'uploading' || uploadStatus === 'parsing') && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center text-white space-y-3 shadow-lg">
          <div className="animate-spin h-10 w-10 border-4 border-brand-gold border-t-transparent rounded-full mx-auto" />
          <div className="space-y-1">
            <p className="text-sm font-bold text-slate-200">
              {uploadStatus === 'uploading'
                ? (isAr ? `جاري قراءة ${fileName}...` : `Reading ${fileName}...`)
                : (isAr ? 'معالجة المتجهات وتحويل إحداثيات UTM 37N داخل المتصفح (Web Worker)...' : 'Processing CAD vectors & Proj4 UTM transformation in Web Worker...')}
            </p>
            <span className="text-[10px] text-cyan-400 font-mono">
              ⚡ {parsingEngine === 'browser' ? 'Browser Web Worker Engine (0 Server Calls)' : 'Hybrid DXF/DWG Engine'}
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden max-w-md mx-auto">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-amber-400 to-emerald-400 rounded-full transition-all duration-500"
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
            <span className="font-bold text-sm">{isAr ? 'خطأ في تحليل المخطط' : 'File Parsing Error'}</span>
          </div>
          <p className="text-xs text-red-600">{errorMessage}</p>
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs font-bold text-red-700 hover:text-red-800 transition"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {isAr ? 'إعادة المحاولة' : 'Try Again'}
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          ACTIVE VIEWPORT: CONSOLIDATED SPLIT-VIEW ARCHITECTURE
      ══════════════════════════════════════════════════════════════════ */}
      {isMapActive && (
        <div className="space-y-3">
          {/* Hidden Additional File Input */}
          <input
            ref={additionalFileInputRef}
            type="file"
            accept=".dwg,.dxf"
            onChange={(e) => {
              if (e.target.files?.length) handleAdditionalFileUpload(e.target.files[0]);
            }}
            className="hidden"
          />

          {/* ── 1. Consolidated Top Control Toolbar ── */}
          <div className="bg-slate-950 text-white border border-slate-800 rounded-2xl p-3 shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              {/* Left Group: Neutral & COG Basemap Selector & Blueprint Info */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1 bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-800">
                  <Globe className="h-4 w-4 text-brand-gold" />
                  <select
                    value={activeBasemap}
                    onChange={(e) => handleBasemapChange(e.target.value)}
                    className="bg-transparent text-slate-200 font-bold text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="hybrid">{isAr ? '🛰️ قمر صناعي هجين فائق الدقة (Google HD Hybrid - 15cm)' : '🛰️ Ultra-HD Hybrid Satellite (15cm)'}</option>
                    <option value="esri_satellite">{isAr ? '🌍 قمر صناعي عالي الوضوح (ESRI World Imagery HD - 30cm)' : '🌍 ESRI World Imagery HD (30cm)'}</option>
                    <option value="satellite">{isAr ? '🛰️ قمر صناعي نقي (Google Satellite HD)' : '🛰️ Google Satellite HD'}</option>
                    <option value="street">{isAr ? '🗺️ خريطة شوارع تخطيطية (Street Map View)' : '🗺️ Street Map View'}</option>
                  </select>
                </div>

                {dwgData && (
                  <span className="bg-slate-900 text-cyan-300 border border-cyan-800/50 px-2.5 py-1 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5">
                    <span>📐 {dwgData.fileName}</span>
                    <span className="text-slate-500">•</span>
                    <span>{dwgData.totalFeatures || dwgData.geojson?.features?.length || 0} {isAr ? 'عنصر' : 'features'}</span>
                    <span className="text-emerald-400 text-[10px] bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-800/40">
                      ⚡ 4K Clarity
                    </span>
                  </span>
                )}

                {/* Additional Files Badge / Manager Toggle */}
                {additionalFiles.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowFileManager(!showFileManager)}
                    className="bg-purple-950/80 text-purple-300 border border-purple-800/60 px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-purple-900 transition"
                  >
                    <FileCode className="h-3.5 w-3.5" />
                    <span>{isAr ? `+${additionalFiles.length} ملفات إضافية` : `+${additionalFiles.length} Overlays`}</span>
                  </button>
                )}
              </div>

              {/* Right Group: Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* 🌟 HIGHLIGHT WORKING AREA & ZONES TOGGLE */}
                <button
                  type="button"
                  onClick={() => setShowWorkZoneCorridor(!showWorkZoneCorridor)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shadow transition active:scale-95 border ${
                    showWorkZoneCorridor
                      ? 'bg-gradient-to-r from-amber-600 to-red-600 text-white border-amber-400 ring-2 ring-amber-400/40'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border-slate-700'
                  }`}
                  title={isAr ? 'إبراز وتظليل نطاق منطقة العمل والتحويلة' : 'Toggle Work Zone & Transition Corridor Highlight'}
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                  <span>{isAr ? 'تظليل نطاق منطقة العمل ✨' : 'Highlight Work Zone ✨'}</span>
                </button>

                {/* ➕ ADD ADDITIONAL CAD FILE BUTTON */}
                <button
                  type="button"
                  onClick={() => additionalFileInputRef.current?.click()}
                  className="flex items-center gap-1.5 bg-purple-700 hover:bg-purple-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow transition active:scale-95"
                  title={isAr ? 'إضافة ملف أوتوكاد إضافي للتحويلة أو الخدمات' : 'Upload additional CAD overlay'}
                >
                  <Plus className="h-3.5 w-3.5 text-purple-200" />
                  <span>{isAr ? 'إضافة مخطط آخر' : 'Add CAD File'}</span>
                </button>

                {/* Snap to Site / Fly to Site */}
                <button
                  type="button"
                  onClick={() => {
                    if (!mapInstanceRef.current) return;
                    mapInstanceRef.current.invalidateSize();
                    if (geoJsonLayerRef.current) {
                      const bounds = geoJsonLayerRef.current.getBounds();
                      if (bounds && bounds.isValid()) {
                        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 18, animate: true });
                        return;
                      }
                    }
                    if (dwgData?.centerLatLng) {
                      mapInstanceRef.current.flyTo(dwgData.centerLatLng, 18, { animate: true });
                    }
                  }}
                  className="flex items-center gap-1.5 bg-blue-700 hover:bg-blue-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow transition active:scale-95"
                  title={isAr ? 'انتقال فوري لموقع مشروع التحويلة على الخريطة' : 'Fly directly to construction site'}
                >
                  <MapPin className="h-3.5 w-3.5 text-amber-300" />
                  <span>{isAr ? 'موقع المشروع 🎯' : 'Site Location 🎯'}</span>
                </button>

                {/* Smart Auto-Align Button */}
                <button
                  type="button"
                  onClick={handleSmartAutoAlign}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow transition active:scale-95"
                  title={isAr ? 'محاذاة تلقائية بنقاط الربط المساحية' : 'Snap to ground control points'}
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                  <span>{isAr ? 'محاذاة لمحور الشارع' : 'Snap to Street Axis'}</span>
                </button>

                {/* Fine Alignment Toolbar Toggle */}
                <button
                  type="button"
                  onClick={() => setShowAlignTools(!showAlignTools)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                    showAlignTools
                      ? 'bg-amber-600 text-white border-amber-400 ring-2 ring-amber-400/30'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border-slate-700'
                  }`}
                >
                  <Sliders className="h-3.5 w-3.5 text-brand-gold" />
                  <span>{isAr ? 'الإزاحة والتدوير' : 'Nudge & Rotate'}</span>
                </button>

                {/* Upload/Replace CAD */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold transition"
                >
                  {isAr ? 'استبدال الرئيسي' : 'Replace Main'}
                </button>

                {/* Reset */}
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-red-400 hover:text-red-300 font-bold text-xs flex items-center gap-1 px-2.5 py-1.5 bg-red-950/40 border border-red-800/40 rounded-xl transition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>{isAr ? 'إعادة ضبط' : 'Reset'}</span>
                </button>
              </div>
            </div>

            {/* ── Multi-File Manager Bar ── */}
            {showFileManager && additionalFiles.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-800 animate-in fade-in duration-150 flex items-center justify-between gap-3 flex-wrap text-xs">
                <span className="font-bold text-purple-300 flex items-center gap-1.5">
                  <FileCode className="h-4 w-4 text-purple-400" />
                  <span>{isAr ? 'الملفات والمخططات المدمجة (In-Browser Layers):' : 'Loaded Overlay Files:'}</span>
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  {additionalFiles.map((af, idx) => (
                    <div key={af.id} className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-xl text-xs">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: af.color }}></span>
                      <span className="font-mono text-slate-200 font-bold">{af.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setAdditionalFiles(prev => {
                            const updated = [...prev];
                            updated[idx].visible = !updated[idx].visible;
                            return updated;
                          });
                        }}
                        className="text-slate-400 hover:text-white ml-1"
                        title={af.visible ? 'إخفاء' : 'إظهار'}
                      >
                        {af.visible ? <Eye className="h-3.5 w-3.5 text-emerald-400" /> : <EyeOff className="h-3.5 w-3.5 text-slate-500" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdditionalFiles(prev => prev.filter((_, i) => i !== idx))}
                        className="text-slate-500 hover:text-red-400 ml-0.5 font-bold"
                        title="حذف الملف"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Fine-Alignment Floating Bar (Nudge D-Pad & Rotation Dial) ── */}
            {showAlignTools && (
              <div className="mt-3 pt-3 border-t border-slate-800 animate-in fade-in duration-150">
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                  {/* D-Pad Translation */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-slate-400 font-bold">{isAr ? 'الإزاحة الدقيقة:' : 'Fine Nudge:'}</span>
                    <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setAlignOffsetY(prev => Number((prev + stepMeters).toFixed(2)))}
                        className="p-1 hover:bg-slate-800 rounded text-slate-200"
                        title={isAr ? `شمال (+${stepMeters}م)` : `North (+${stepMeters}m)`}
                      >
                        <ArrowUp className="h-3.5 w-3.5 text-cyan-400" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setAlignOffsetY(prev => Number((prev - stepMeters).toFixed(2)))}
                        className="p-1 hover:bg-slate-800 rounded text-slate-200"
                        title={isAr ? `جنوب (-${stepMeters}م)` : `South (-${stepMeters}m)`}
                      >
                        <ArrowDown className="h-3.5 w-3.5 text-cyan-400" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setAlignOffsetX(prev => Number((prev - stepMeters).toFixed(2)))}
                        className="p-1 hover:bg-slate-800 rounded text-slate-200"
                        title={isAr ? `غرب (-${stepMeters}م)` : `West (-${stepMeters}m)`}
                      >
                        <ArrowLeft className="h-3.5 w-3.5 text-cyan-400" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setAlignOffsetX(prev => Number((prev + stepMeters).toFixed(2)))}
                        className="p-1 hover:bg-slate-800 rounded text-slate-200"
                        title={isAr ? `شرق (+${stepMeters}م)` : `East (+${stepMeters}m)`}
                      >
                        <ArrowRight className="h-3.5 w-3.5 text-cyan-400" />
                      </button>
                    </div>

                    {/* Step selector */}
                    <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-[10px]">
                      {[0.1, 1.0, 5.0].map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setStepMeters(s)}
                          className={`px-1.5 py-0.5 rounded font-mono font-bold transition ${
                            stepMeters === s ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          ±{s}m
                        </button>
                      ))}
                    </div>

                    <span className="font-mono text-emerald-400 font-bold text-[11px]">
                      ΔX: {alignOffsetX >= 0 ? `+${alignOffsetX}` : alignOffsetX}m • ΔY: {alignOffsetY >= 0 ? `+${alignOffsetY}` : alignOffsetY}m
                    </span>
                  </div>

                  {/* Rotation Dial Slider (-180 to +180) */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-slate-400 font-bold">{isAr ? 'زاوية التدوير:' : 'Rotation:'}</span>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      step="0.5"
                      value={cadRotationDeg}
                      onChange={(e) => setCadRotationDeg(parseFloat(e.target.value))}
                      className="w-32 accent-brand-gold cursor-pointer h-1.5"
                    />
                    <span className="font-mono text-brand-gold font-bold text-xs w-16 text-left">
                      {cadRotationDeg >= 0 ? `+${cadRotationDeg.toFixed(1)}` : cadRotationDeg.toFixed(1)}°
                    </span>

                    {/* Reset Rotation to True North */}
                    <button
                      type="button"
                      onClick={() => setCadRotationDeg(0)}
                      className="text-[10px] text-slate-400 hover:text-white px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg"
                      title={isAr ? 'إعادة ضبط لشمال الخريطة 0.0°' : 'Reset rotation to 0.0°'}
                    >
                      {isAr ? 'شمال (0.0°)' : 'Reset 0°'}
                    </button>
                  </div>

                  {/* Lock/Unlock Drag Handle */}
                  <button
                    type="button"
                    onClick={() => setIsLocked(!isLocked)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition border ${
                      isLocked ? 'bg-amber-950/80 border-amber-500 text-amber-300' : 'bg-blue-950/80 border-blue-500 text-blue-300'
                    }`}
                  >
                    {isLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                    <span>{isLocked ? (isAr ? 'المخطط مقفل' : 'Locked') : (isAr ? 'السحب مفعّل ✥' : 'Drag Active ✥')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              2. SPLIT-VIEW: MAP VIEWPORT (LEFT) + DOCKED KEYMAP & LAYERS (RIGHT)
          ══════════════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
            {/* ── MAP VIEWPORT (8 of 12 cols on desktop) ── */}
            <div className="lg:col-span-8 relative rounded-2xl overflow-hidden border border-slate-300 shadow-xl bg-slate-950" style={{ minHeight: '640px' }}>
              <div ref={mapContainerRef} className="absolute inset-0 z-0" />

              {/* Spatial Drag Handle Banner */}
              {!isLocked && (
                <div className="absolute top-3 left-3 z-10 bg-slate-950/85 text-blue-300 px-3 py-1.5 rounded-xl text-xs font-bold backdrop-blur-md border border-blue-500/40 shadow-lg flex items-center gap-1.5">
                  <span className="animate-pulse">✥</span>
                  <span>{isAr ? 'اسحب المقبض الأزرق لتحريك المخطط، واسحب أي لوحة لتغيير موقعها' : 'Drag blue handle to align CAD, drag any sign to move'}</span>
                </div>
              )}

              {/* Saudi MOT Sign & Poster Placement Toolbar Button on Canvas */}
              <div className="absolute top-3 right-3 z-10">
                <button
                  type="button"
                  onClick={() => setShowPalette(!showPalette)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold backdrop-blur-md border shadow-lg flex items-center gap-1.5 transition ${
                    showPalette
                      ? 'bg-amber-600 text-white border-amber-400 ring-2 ring-amber-400/40'
                      : 'bg-slate-950/90 hover:bg-slate-900 text-amber-300 border-amber-500/40'
                  }`}
                >
                  <GripVertical className="h-3.5 w-3.5 text-brand-gold" />
                  <span>{isAr ? 'دليل الشواخص واللوحات السعودية (MOT)' : 'Saudi MOT Signs Palette'}</span>
                </button>
              </div>

              {/* Selected Sign Quick-Action Control Bar on Map */}
              {selectedElement && (
                <div className="absolute bottom-4 right-4 z-20 bg-slate-950/95 backdrop-blur-md text-white border border-blue-500/80 rounded-2xl p-3 shadow-2xl space-y-2 animate-in fade-in duration-150 text-xs">
                  <div className="flex items-center justify-between gap-3 pb-1.5 border-b border-slate-800">
                    <span className="font-bold text-blue-300 flex items-center gap-1.5">
                      <span>✋</span>
                      <span>{isAr ? 'التحكم باللوحة المحددة (قابلة للسحب)' : 'Moveable Sign Active'}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedElementId(null)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPlacedElements(prev => prev.map(e => e.id === selectedElement.id ? { ...e, rotation: ((e.rotation || 0) + 45) % 360 } : e));
                      }}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 border border-slate-700"
                    >
                      <RotateCw className="h-3 w-3 text-brand-gold" />
                      <span>{isAr ? `تدوير (${selectedElement.rotation || 0}°)` : `Rotate (${selectedElement.rotation || 0}°)`}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const newLat = selectedElement.lat + 0.0001;
                        const newLng = selectedElement.lng + 0.0001;
                        setPlacedElements(prev => [...prev, { ...selectedElement, id: `elem_${Date.now()}`, lat: newLat, lng: newLng }]);
                      }}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 border border-slate-700"
                    >
                      <Copy className="h-3 w-3 text-cyan-400" />
                      <span>{isAr ? 'تكرار' : 'Duplicate'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPlacedElements(prev => prev.filter(e => e.id !== selectedElement.id));
                        setSelectedElementId(null);
                      }}
                      className="bg-red-950/80 hover:bg-red-900 text-red-300 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 border border-red-800/60"
                    >
                      <Trash2 className="h-3 w-3 text-red-400" />
                      <span>{isAr ? 'حذف' : 'Delete'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Floating MOT Traffic Signs & Barrier Posters Palette on Map */}
              {showPalette && (
                <div className="absolute top-12 right-3 z-20 bg-slate-950/95 backdrop-blur-md text-white border border-slate-700 rounded-2xl p-3 max-w-sm w-92 shadow-2xl space-y-2.5 animate-in fade-in zoom-in duration-150">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                    <span className="font-bold text-xs text-brand-gold flex items-center gap-1.5">
                      <span>🇸🇦</span>
                      <span>{isAr ? 'مكتبة الشواخص واللوحات السعودية المعتمدة' : 'Saudi MOT Signs & Safety Library'}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPalette(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Categories */}
                  <div className="flex border-b border-slate-800 bg-slate-900 rounded-lg p-1">
                    {Object.entries(SAUDI_MOT_ELEMENTS).map(([key, cat]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setActivePaletteCategory(key)}
                        className={`flex-1 py-1 text-[11px] font-bold rounded-md transition ${
                          activePaletteCategory === key
                            ? 'bg-slate-800 text-white shadow-xs'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                        style={activePaletteCategory === key ? { color: cat.color } : {}}
                      >
                        {cat.titleAr.split(' ')[0]}
                      </button>
                    ))}
                  </div>

                  {/* Items Grid */}
                  <div className="grid grid-cols-1 gap-1.5 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                    {SAUDI_MOT_ELEMENTS[activePaletteCategory]?.items.map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleAddElement(item.id)}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-brand-gold hover:bg-slate-850 transition text-right group"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xl group-hover:scale-115 transition-transform">{item.icon}</span>
                          <span className="text-xs font-semibold text-slate-200">{isAr ? item.labelAr : item.labelEn}</span>
                        </div>
                        <span className="text-[10px] bg-blue-900/60 text-blue-300 border border-blue-800/40 px-2 py-0.5 rounded font-mono font-bold">
                          + {isAr ? 'إضافة' : 'Add'}
                        </span>
                      </button>
                    ))}
                  </div>

                  <p className="text-[9.5px] text-slate-400 border-t border-slate-800 pt-1.5">
                    {isAr ? '🖱️ انقر لإضافة اللوحة، واسحبها على الخريطة لتحديد مكانها بدقة (انقر للتدوير 45°)' : 'Click to place sign, then drag freely on map (click sign to rotate)'}
                  </p>
                </div>
              )}

              {/* Selected Feature Info Drawer */}
              {selectedFeatureInfo && (
                <div className="absolute bottom-4 left-4 z-20 bg-slate-950/95 backdrop-blur-md text-white border border-slate-700 rounded-2xl p-4 max-w-sm shadow-2xl space-y-2 animate-in fade-in zoom-in duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: selectedFeatureInfo.color || '#FFD600' }}></span>
                      <span className="font-bold text-xs text-brand-gold">
                        {isAr ? selectedFeatureInfo.roleAr : selectedFeatureInfo.roleEn}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedFeatureInfo(null)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                    <div>
                      <span className="text-slate-400">{isAr ? 'الطبقة:' : 'Layer:'}</span>{' '}
                      <span className="font-mono text-white font-bold">{selectedFeatureInfo.layer}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">{isAr ? 'النوع:' : 'Type:'}</span>{' '}
                      <span className="font-mono text-white">{selectedFeatureInfo.type}</span>
                    </div>
                    {selectedFeatureInfo.lengthMeters && (
                      <div className="col-span-2 text-emerald-400 font-bold flex items-center gap-1">
                        <Ruler className="h-3.5 w-3.5" />
                        <span>{isAr ? `الطول الهندسي: ${selectedFeatureInfo.lengthMeters} متر` : `Length: ${selectedFeatureInfo.lengthMeters} m`}</span>
                      </div>
                    )}
                    {selectedFeatureInfo.text && (
                      <div className="col-span-2 text-amber-300 font-semibold bg-slate-900 p-2 rounded-xl border border-slate-800">
                        <span>{selectedFeatureInfo.text}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── DOCKED KEYMAP & LAYERS PANEL (4 of 12 cols on desktop) ── */}
            <div className="lg:col-span-4 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white shadow-xl flex flex-col justify-between space-y-4">
              <div className="space-y-3.5">
                {/* Header & Master Toggle */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <h3 className="font-bold text-sm text-brand-gold flex items-center gap-1.5">
                      <Layers className="h-4 w-4" />
                      <span>{isAr ? 'دليل ومفتاح طبقات المخطط' : 'Keymap & CAD Layers'}</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {isAr ? 'معايير أمانة المدينة المنورة وكود الطرق ٣٠٥' : 'MOT & Saudi Road Code 305 Standards'}
                    </p>
                  </div>

                  {/* Master Annotation Toggle */}
                  <button
                    type="button"
                    onClick={toggleAllAnnotations}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition flex items-center gap-1 ${
                      allAnnotationsActive
                        ? 'bg-purple-900/60 border-purple-500 text-purple-200'
                        : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}
                    title={isAr ? 'إظهار / إخفاء كافة نصوص الأبعاد والإرشادات' : 'Toggle all explanatory annotations'}
                  >
                    <Type className="h-3 w-3" />
                    <span>{allAnnotationsActive ? (isAr ? 'الأبعاد: ظاهرة' : 'Dims: ON') : (isAr ? 'الأبعاد: مخفية' : 'Dims: OFF')}</span>
                  </button>
                </div>

                {/* 6 MOT Functional Color Groups */}
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                  {Object.values(MOT_KEYMAP_GROUPS).map((group) => {
                    const isVisible = keymapVisibility[group.id] !== false;
                    const count = featureCounts[group.id] || 0;

                    return (
                      <div
                        key={group.id}
                        onClick={() => toggleGroupVisibility(group.id)}
                        className={`p-3 rounded-xl border text-xs cursor-pointer transition-all select-none ${
                          isVisible
                            ? `${group.bgClass} ${group.borderClass} shadow-xs`
                            : 'bg-slate-900/40 border-slate-800/40 opacity-40 hover:opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* Color Swatch */}
                            <span
                              className="w-4 h-4 rounded-full shrink-0 shadow-xs border border-white/30"
                              style={{ backgroundColor: group.color }}
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-100 text-xs truncate">
                                  {isAr ? group.titleAr : group.titleEn}
                                </span>
                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-md bg-slate-900 text-slate-300 border border-slate-700">
                                  {count}
                                </span>
                              </div>
                              <p className="text-[10.5px] text-slate-400 mt-1 line-clamp-2">
                                {isAr ? group.descAr : group.descEn}
                              </p>
                            </div>
                          </div>

                          {/* Eye Switch */}
                          <div className="shrink-0 ml-2">
                            {isVisible ? (
                              <Eye className="h-4 w-4 text-emerald-400" />
                            ) : (
                              <EyeOff className="h-4 w-4 text-slate-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Placed Elements Summary in Side Panel */}
              {placedElements.length > 0 && (
                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300 flex items-center gap-1">
                      <span>🛑</span>
                      <span>{isAr ? `اللوحات والشواخص الموضوعة (${placedElements.length})` : `Placed Elements (${placedElements.length})`}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setPlacedElements([]);
                        setSelectedElementId(null);
                      }}
                      className="text-[10px] text-red-400 hover:text-red-300 font-bold"
                    >
                      {isAr ? 'مسح الكل' : 'Clear'}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto custom-scrollbar">
                    {placedElements.map((el, idx) => (
                      <span
                        key={el.id}
                        onClick={() => setSelectedElementId(el.id)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] cursor-pointer transition border ${
                          selectedElementId === el.id
                            ? 'bg-blue-900/80 border-blue-500 text-blue-200 shadow-sm'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                        }`}
                      >
                        <span>{el.type}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPlacedElements(prev => prev.filter((_, i) => i !== idx));
                            if (selectedElementId === el.id) setSelectedElementId(null);
                          }}
                          className="text-slate-500 hover:text-red-400 ml-1 font-bold"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DwgMapOverlay;
