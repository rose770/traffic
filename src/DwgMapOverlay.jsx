import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Upload, Layers, Eye, EyeOff, Trash2, RotateCcw, MapPin,
  AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Move,
  X, GripVertical, Loader2, Image as ImageIcon, Sliders, Info,
  Compass, Sparkles, Zap, Maximize2, Minimize2, Type, Ruler, Tag, ShieldAlert,
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, RotateCw, Target, RefreshCw,
  Lock, Unlock, Globe, Satellite, Navigation, CheckSquare, Square, Plus,
  FileCode, Copy, CornerDownRight, Check, Cpu, Undo2, Redo2,
  Edit3, Award, PenTool, DownloadCloud, FileCheck
} from 'lucide-react';
import { SAUDI_CRS_PRESETS, detectSaudiCrs } from './utils/coordinateEngine';
import { SAUDI_COG_PRESETS } from './utils/cogTileService';
import { parseCadClientSide } from './utils/cadClientParser';
import { getEsriSatelliteUrl, ESRI_SATELLITE_CONFIG, createEsriTileLayer } from './utils/esriTileService';
import { evaluateMotBarrierRule } from './trafficStandards';

// ══════════════════════════════════════════════════════════════════════
// 1. Standardized Neutral & In-Browser Basemap Configurations (ESRI Pure Satellite)
// ══════════════════════════════════════════════════════════════════════
const BASEMAP_PRESETS = {
  esri_satellite: {
    id: 'esri_satellite',
    nameAr: '🌍 قمر صناعي نقي عالي الدقة (ESRI World Imagery HD)',
    nameEn: 'ESRI World Imagery HD (Pure Satellite)',
    get url() { return getEsriSatelliteUrl(); },
    subdomains: ESRI_SATELLITE_CONFIG.subdomains,
    maxZoom: ESRI_SATELLITE_CONFIG.maxZoom,
    maxNativeZoom: ESRI_SATELLITE_CONFIG.maxNativeZoom
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
      { id: 'concrete_njb_poster', labelAr: 'لوحة تفصيل حواجز خرسانية NJB مع إنارة ثلاثية', labelEn: 'Concrete NJB w/ Lights Poster', icon: '🧱', size: [64, 34] },
      { id: 'plastic_njb_poster', labelAr: 'لوحة تفصيل حواجز بلاستيكية NJB مع إنارة ثلاثية', labelEn: 'Plastic NJB w/ Lights Poster', icon: '🔴', size: [64, 34] },
      { id: 'road_work_ends_poster', labelAr: 'لوحة نهاية منطقة العمل (صفراء مضيئة)', labelEn: 'Road Work Ends Signboard', icon: '🚧', size: [54, 28] },
      { id: 'solar_vms_arrow_board', labelAr: 'لوحة أسهم وامضة شمسية على مقطورة (VMS Trailer)', labelEn: 'Solar Flashing Arrow Trailer', icon: '💡', size: [44, 26] },
      { id: 'crash_cushion_tma', labelAr: 'شاحنة امتصاص الصدمات وحماية العمال (TMA Truck)', labelEn: 'TMA Crash Cushion Truck', icon: '🚛', size: [46, 24] },
      { id: 'mobile_light_tower', labelAr: 'برج إنارة متحرك شمسية للتحويلة (Light Tower)', labelEn: 'Solar Mobile Light Tower', icon: '🗼', size: [30, 26] }
    ]
  },
  regulatory: {
    titleAr: 'اللوحات التنظيمية والسرعات المعتمدة',
    titleEn: 'Regulatory & Speed Signs',
    color: '#EAB308',
    items: [
      { id: 'stop_sign', labelAr: 'لوحة قف (STOP)', labelEn: 'STOP Sign', icon: '🛑', size: [24, 24] },
      { id: 'give_way', labelAr: 'لوحة أفسح الطريق (GIVE WAY)', labelEn: 'Yield / Give Way Sign', icon: '🔻', size: [24, 24] },
      { id: 'slow_sign', labelAr: 'لوحة تمهل (SLOW مع ومّاض علوي)', labelEn: 'SLOW Sign with Flashing Beacon', icon: '⚠️', size: [24, 28] },
      { id: 'speed_limit_30', labelAr: 'تحديد سرعة ٣٠ كم/س', labelEn: 'Speed Limit 30 km/h', icon: '㉚', size: [22, 22] },
      { id: 'speed_limit_40', labelAr: 'تحديد سرعة ٤٠ كم/س', labelEn: 'Speed Limit 40 km/h', icon: '㊵', size: [22, 22] },
      { id: 'speed_limit_50', labelAr: 'سرعة ٥٠ + مثلث تحذير إلزامي', labelEn: 'Speed Limit 50 + Warning', icon: '㊵', size: [36, 22] },
      { id: 'speed_limit_60', labelAr: 'تحديد سرعة ٦٠ كم/س', labelEn: 'Speed Limit 60 km/h', icon: '㊷', size: [22, 22] },
      { id: 'speed_limit_70', labelAr: 'تحديد سرعة ٧٠ كم/س', labelEn: 'Speed Limit 70 km/h', icon: '㊸', size: [22, 22] },
      { id: 'speed_limit_80', labelAr: 'تحديد سرعة ٨٠ كم/س', labelEn: 'Speed Limit 80 km/h', icon: '㊹', size: [22, 22] },
      { id: 'speed_limit_100', labelAr: 'تحديد سرعة ١٠٠ كم/س', labelEn: 'Speed Limit 100 km/h', icon: '💯', size: [22, 22] },
      { id: 'no_entry', labelAr: 'ممنوع الدخول (No Entry)', labelEn: 'No Entry Sign', icon: '⛔', size: [22, 22] },
      { id: 'no_overtaking', labelAr: 'ممنوع التجاوز (No Overtaking)', labelEn: 'No Overtaking Sign', icon: '🚫', size: [22, 22] },
    ]
  },
  warning: {
    titleAr: 'لوحات التحذير والتوجيه',
    titleEn: 'Warning & Guidance Signs',
    color: '#3B82F6',
    items: [
      { id: 'road_work_ahead', labelAr: 'أعمال طريق أمامك (Road Work Ahead)', labelEn: 'Road Work Ahead Sign', icon: '🚧', size: [24, 24] },
      { id: 'detour_ahead', labelAr: 'تحويلة أمامك (Detour Ahead)', labelEn: 'Detour Ahead Warning', icon: '⚠️', size: [24, 24] },
      { id: 'lane_closed_right', labelAr: 'إغلاق المسار الأيمن (Right Lane Closed)', labelEn: 'Right Lane Closed', icon: '⛔', size: [24, 24] },
      { id: 'lane_closed_left', labelAr: 'إغلاق المسار الأيسر (Left Lane Closed)', labelEn: 'Left Lane Closed', icon: '⛔', size: [24, 24] },
      { id: 'road_narrows', labelAr: 'الطريق يضيق أمامك (Road Narrows)', labelEn: 'Road Narrows Warning', icon: '⚠️', size: [24, 24] },
      { id: 'speed_hump', labelAr: 'مطب صناعي للتهدئة (Speed Hump)', labelEn: 'Speed Hump Ahead', icon: '〽️', size: [24, 24] },
      { id: 'two_way_traffic', labelAr: 'حركة سير بالاتجاهين (Two-Way)', labelEn: 'Two-Way Traffic', icon: '↕️', size: [24, 24] },
      { id: 'detour_split_arrow', labelAr: 'سهم توجيه التحويلة الإلزامي (↖️)', labelEn: 'Mandatory Detour Arrow', icon: '↖️', size: [22, 22] },
      { id: 'mandatory_right', labelAr: 'الزم اليمين إجباري (➡️)', labelEn: 'Keep Right Sign', icon: '➡️', size: [22, 22] },
      { id: 'mandatory_left', labelAr: 'الزم اليسار إجباري (⬅️)', labelEn: 'Keep Left Sign', icon: '⬅️', size: [22, 22] },
      { id: 'chevron_hazard', labelAr: 'شواخص أسهم عاكسة (Chevron ««)', labelEn: 'Chevron Alignment Marker', icon: '🔶', size: [24, 16] },
    ]
  },
  barriers: {
    titleAr: 'حواجز الأمان والأجهزة الذكية',
    titleEn: 'Safety Devices & Barricades',
    color: '#F97316',
    items: [
      { id: 'concrete_barrier', labelAr: 'صب خرساني نيوجيرسي منفرد (NJB)', labelEn: 'Single Concrete Barrier', icon: '🧱', size: [24, 14] },
      { id: 'water_barrier', labelAr: 'حاجز مائي بلاستيكي عازل', labelEn: 'Water-Filled Barrier', icon: '🔵', size: [24, 14] },
      { id: 'traffic_cone', labelAr: 'مخروط مروري مع شريط عاكس', labelEn: 'Reflective Traffic Cone', icon: '🔶', size: [18, 18] },
      { id: 'delineator_post', labelAr: 'عمود توجيه مرن عاكس (Delineator)', labelEn: 'Flexible Delineator Post', icon: '🪧', size: [12, 24] },
      { id: 'steel_guardrail', labelAr: 'حاجز حديدي واقي (W-Beam Guardrail)', labelEn: 'Steel Guardrail', icon: '🛡️', size: [28, 12] },
      { id: 'temp_traffic_signal', labelAr: 'إشارة ضوئية مؤقتة ذكية بالطاقة الشمسية', labelEn: 'Temporary Traffic Signal', icon: '🚦', size: [16, 28] },
      { id: 'flagman_post', labelAr: 'موقع رجل الراية وتنظيم السير (Flagman)', labelEn: 'Flagman Safety Station', icon: '🧑‍🦺', size: [20, 24] },
      { id: 'pedestrian_walkway_ramp', labelAr: 'ممر ومنحدر مشاة محمي (Pedestrian Ramp)', labelEn: 'Protected Pedestrian Ramp', icon: '🚶', size: [30, 18] }
    ]
  }
};

// ── Rich SVG/HTML Renderer for Saudi MOT Signs & Barrier Posters ──
const renderMotItemHtml = (type, rotation = 0, isAr = true) => {
  const rotStyle = `transform: rotate(${rotation}deg); transform-origin: center;`;

  switch (type) {
    case 'concrete_njb_poster':
      return `
        <div style="${rotStyle} display:flex; flex-direction:column; align-items:center; filter:drop-shadow(0 3px 6px rgba(0,0,0,0.6)); cursor:move; user-select:none;">
          <div style="background:#dc2626; color:white; font-family:system-ui,sans-serif; font-size:7px; font-weight:800; padding:1px 3px; border-radius:2px; white-space:nowrap; border:0.5px solid #991b1b; letter-spacing:0.1px; margin-bottom:1px;">
            CONCRETE NJB
          </div>
          <svg width="52" height="26" viewBox="0 0 84 48">
            <polygon points="12,42 72,42 62,18 22,18" fill="#94a3b8" stroke="#475569" stroke-width="1.5" />
            <rect x="36" y="18" width="12" height="24" fill="#ef4444" stroke="#b91c1c" stroke-width="1" />
            <rect x="8" y="42" width="68" height="5" fill="#475569" rx="1.5" />
            <path d="M 26 13 Q 42 20 58 13" fill="none" stroke="#22c55e" stroke-width="2" />
            <circle cx="26" cy="11" r="4.5" fill="#facc15" stroke="#ca8a04" stroke-width="1" />
            <circle cx="58" cy="11" r="4.5" fill="#facc15" stroke="#ca8a04" stroke-width="1" />
          </svg>
        </div>
      `;

    case 'plastic_njb_poster':
      return `
        <div style="${rotStyle} display:flex; flex-direction:column; align-items:center; filter:drop-shadow(0 3px 6px rgba(0,0,0,0.6)); cursor:move; user-select:none;">
          <div style="background:#dc2626; color:white; font-family:system-ui,sans-serif; font-size:7px; font-weight:800; padding:1px 3px; border-radius:2px; white-space:nowrap; border:0.5px solid #991b1b; letter-spacing:0.1px; margin-bottom:1px;">
            PLASTIC NJB
          </div>
          <svg width="52" height="26" viewBox="0 0 84 48">
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
        <div style="${rotStyle} position:relative; filter:drop-shadow(0 3px 6px rgba(0,0,0,0.6)); cursor:move; user-select:none;">
          <div style="background:#fef08a; border:1.5px solid #ca8a04; border-radius:3px; padding:2px 5px; text-align:center; color:#713f12; font-weight:900; font-size:7.5px; box-shadow:0 2px 6px rgba(0,0,0,0.4);">
            <div>نهاية العمل</div>
            <div style="font-size:6.5px; border-top:0.5px solid #ca8a04; margin-top:1px;">END WORK</div>
          </div>
        </div>
      `;

    case 'solar_vms_arrow_board':
      return `
        <div style="${rotStyle} background:#0f172a; border:1.5px solid #eab308; border-radius:4px; padding:2px 5px; text-align:center; box-shadow:0 3px 6px rgba(0,0,0,0.6); cursor:move;">
          <div style="color:#facc15; font-size:10px; font-weight:bold; letter-spacing:1px; line-height:1;">▶▶</div>
          <div style="color:#ffffff; font-size:6.5px; font-weight:bold; margin-top:1px;">تحويلة</div>
        </div>
      `;

    case 'stop_sign':
      return `
        <div style="${rotStyle} filter:drop-shadow(0 2px 5px rgba(0,0,0,0.6)); cursor:move;">
          <svg width="24" height="24" viewBox="0 0 40 40">
            <polygon points="12,2 28,2 38,12 38,28 28,38 12,38 2,28 2,12" fill="#dc2626" stroke="#ffffff" stroke-width="2.5" />
            <text x="20" y="25" text-anchor="middle" fill="#ffffff" font-weight="900" font-size="12" font-family="system-ui, Arial, sans-serif">STOP</text>
          </svg>
        </div>
      `;

    case 'give_way':
      return `
        <div style="${rotStyle} filter:drop-shadow(0 2px 5px rgba(0,0,0,0.6)); cursor:move;">
          <svg width="24" height="24" viewBox="0 0 40 40">
            <polygon points="20,38 2,4 38,4" fill="#ffffff" stroke="#dc2626" stroke-width="4" />
          </svg>
        </div>
      `;

    case 'slow_sign':
      return `
        <div style="${rotStyle} display:flex; flex-direction:column; align-items:center; filter:drop-shadow(0 2px 5px rgba(0,0,0,0.6)); cursor:move;">
          <div style="width:22px; height:22px; border-radius:50%; background:#f59e0b; border:1.5px solid white; display:flex; align-items:center; justify-content:center; color:#000; font-weight:900; font-size:7.5px; box-shadow:0 1px 4px rgba(0,0,0,0.4);">
            SLOW
          </div>
        </div>
      `;

    case 'speed_limit_50':
      return `
        <div style="${rotStyle} display:flex; align-items:center; gap:2px; filter:drop-shadow(0 2px 5px rgba(0,0,0,0.6)); cursor:move;">
          <svg width="16" height="16" viewBox="0 0 24 24">
            <polygon points="12,2 22,20 2,20" fill="#facc15" stroke="#dc2626" stroke-width="2" />
            <text x="12" y="17" text-anchor="middle" font-weight="bold" font-size="12" fill="#000">!</text>
          </svg>
          <div style="width:20px; height:20px; border-radius:50%; background:#ffffff; border:2px solid #dc2626; display:flex; align-items:center; justify-content:center; color:#000; font-weight:900; font-size:9px;">
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
        <div style="${rotStyle} width:22px; height:22px; border-radius:50%; background:#ffffff; border:2px solid #dc2626; display:flex; align-items:center; justify-content:center; color:#000; font-weight:900; font-size:9.5px; filter:drop-shadow(0 2px 5px rgba(0,0,0,0.6)); cursor:move;">
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
        <div style="${rotStyle} filter:drop-shadow(0 2px 5px rgba(0,0,0,0.6)); cursor:move;">
          <svg width="24" height="24" viewBox="0 0 40 40">
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
        <div style="${rotStyle} width:22px; height:22px; border-radius:50%; background:#2563eb; border:1.5px solid white; display:flex; align-items:center; justify-content:center; color:white; font-weight:bold; font-size:12px; filter:drop-shadow(0 2px 5px rgba(0,0,0,0.6)); cursor:move;">
          ${arr}
        </div>
      `;
    }

    case 'chevron_hazard':
      return `
        <div style="${rotStyle} background:white; border:1.5px solid #dc2626; padding:1px 3px; border-radius:2px; display:flex; gap:1px; filter:drop-shadow(0 2px 5px rgba(0,0,0,0.6)); cursor:move;">
          <span style="color:#dc2626; font-weight:900; font-size:9px; font-family:monospace;">««</span>
        </div>
      `;

    case 'concrete_barrier':
      return `
        <div style="${rotStyle} width:24px; height:14px; background:#94a3b8; border:1px solid #475569; border-radius:2px; display:flex; align-items:center; justify-content:center; filter:drop-shadow(0 1px 4px rgba(0,0,0,0.5)); cursor:move;">
          <span style="font-size:9px;">🧱</span>
        </div>
      `;

    case 'water_barrier':
      return `
        <div style="${rotStyle} width:24px; height:14px; background:#2563eb; border:1px solid #1d4ed8; border-radius:2px; display:flex; align-items:center; justify-content:center; filter:drop-shadow(0 1px 4px rgba(0,0,0,0.5)); cursor:move;">
          <span style="font-size:9px;">🔵</span>
        </div>
      `;

    case 'traffic_cone':
      return `
        <div style="${rotStyle} width:18px; height:18px; display:flex; align-items:center; justify-content:center; filter:drop-shadow(0 1px 4px rgba(0,0,0,0.5)); cursor:move;">
          <span style="font-size:14px;">🔶</span>
        </div>
      `;

    default:
      return `
        <div style="${rotStyle} background:rgba(15,23,42,0.9); color:white; border:1px solid #38bdf8; padding:1px 4px; border-radius:3px; font-size:9px; font-weight:bold; cursor:move; filter:drop-shadow(0 2px 5px rgba(0,0,0,0.5));">
          📍 ${type}
        </div>
      `;
  }
};

// Helper: Detect if a CAD feature represents a Traffic Sign (STOP sign, speed sign, etc.)
export const isSignFeature = (feature) => {
  if (!feature) return false;
  const p = feature.properties || {};
  if (p.isTrafficSign || p.motType) return true;

  const layer = (p.layer || '').toUpperCase();
  const text = (p.text || '').toUpperCase().trim();

  // 1. Explicit sign layers or text
  if (
    layer.includes('SIGN') || layer.includes('STOP') || layer.includes('TRAFFIC') ||
    layer.includes('SHAKH') || layer.includes('لوح') || layer.includes('شاخص')
  ) {
    return true;
  }
  if (text.includes('STOP') || text === 'قف' || text.includes('SLOW') || text === 'تمهل') {
    return true;
  }

  // 2. Geometric STOP sign check: Octagon polygon/polyline with 8-12 vertices and diameter <= 3.5m
  let rawCoords = null;
  if (feature.geometry?.type === 'Polygon') {
    rawCoords = feature.geometry.coordinates?.[0];
  } else if (feature.geometry?.type === 'LineString') {
    rawCoords = feature.geometry.coordinates;
  }
  if (rawCoords && rawCoords.length >= 8 && rawCoords.length <= 12) {
    let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
    rawCoords.forEach(c => {
      if (c[0] < minLng) minLng = c[0];
      if (c[0] > maxLng) maxLng = c[0];
      if (c[1] < minLat) minLat = c[1];
      if (c[1] > maxLat) maxLat = c[1];
    });
    const spanMetersX = (maxLng - minLng) * 111320;
    const spanMetersY = (maxLat - minLat) * 110574;
    const maxDim = Math.max(spanMetersX, spanMetersY);
    // Closed or nearly-closed octagon between 0.3m and 3.5m across
    if (maxDim >= 0.3 && maxDim <= 3.5) {
      return true;
    }
  }

  return false;
};

// Helper: Classify a CAD GeoJSON feature into one of the 6 MOT functional groups
const getFeatureFunctionalType = (feature) => {
  const p = feature.properties || {};
  if (p.functionalType && MOT_KEYMAP_GROUPS[p.functionalType]) {
    return p.functionalType;
  }

  // Signs are NOT road lines
  if (isSignFeature(feature)) {
    return 'ANNOTATION_GUIDES';
  }

  const layer = (p.layer || '').toUpperCase();
  const text = (p.text || '').toUpperCase();
  const cIdx = p.colorIndex;
  const col = (p.color || '').toUpperCase();

  // 1. DETOUR_TAPER (Red lines, taper tapers, and transition texts like "180 M", "50 M", "المنطقة الانتقالية")
  if (
    cIdx === 1 || col === '#FF1744' || col === '#FF0000' || col === '#EF4444' ||
    layer.includes('DETOUR') || layer.includes('TAPER') || layer.includes('CLOSURE') ||
    text.includes('TRANSITION') || text.includes('انتقالية') || text.includes('تحويلة') ||
    text.includes('180 M') || text.includes('50 M')
  ) {
    return 'DETOUR_TAPER';
  }

  // 2. SAFETY_BUFFER (Yellow work lines, safety buffer, and work zone texts like "منطقة العمل", "المنطقة الفاصلة", "60 M", "20 M", "30 M")
  if (
    cIdx === 2 || cIdx === 40 || col === '#FFD600' || col === '#FFFF00' || col === '#F59E0B' ||
    p.isWorkZoneHatch || layer.includes('BUFFER') || layer.includes('SAFTY') ||
    layer.includes('SAFETY') || layer.includes('WORK') || layer.includes('HATCH') ||
    layer === '32' || layer === '1' || text.includes('BUFFER') || text.includes('فاصلة') ||
    text.includes('WORK') || text.includes('عمل') ||
    text.includes('60 M') || text.includes('20 M') || text.includes('30 M')
  ) {
    return 'SAFETY_BUFFER';
  }

  // 3. ROAD_BOUNDARY
  if (
    cIdx === 4 || col === '#00E5FF' || col === '#06B6D4' ||
    layer.includes('تنظيم') || layer.includes('ROAD') || layer.includes('LIMIT') ||
    layer.includes('BOUNDARY') || layer.includes('ROW') || layer.includes('R-O-W') ||
    layer.includes('CURB') || layer.includes('EDGE') || layer.includes('CORRIDOR')
  ) {
    return 'ROAD_BOUNDARY';
  }

  // 4. PEDESTRIAN_ROUTE
  if (
    layer.includes('PED') || layer.includes('SIDEWALK') || layer.includes('WALK') ||
    layer.includes('FOOTPATH') || layer.includes('RAMP') || text.includes('PEDESTRIAN') ||
    text.includes('مشاة') || cIdx === 3 || col === '#00E676' || col === '#10B981'
  ) {
    return 'PEDESTRIAN_ROUTE';
  }

  // 5. ANNOTATION_GUIDES
  if (
    p.isDimensionLine || p.isLeaderLine || p.tagType === 'dimension' ||
    layer.includes('DIM') || layer.includes('LEADER') || layer.includes('ANNO') ||
    layer.includes('STALBL') || layer.includes('DEFPOINTS') || layer.includes('NOTE') ||
    p.tagType === 'coordinate' || text.startsWith('N:') || text.startsWith('E:')
  ) {
    return 'ANNOTATION_GUIDES';
  }

  // 6. CENTERLINE_AXIS
  return 'CENTERLINE_AXIS';
};

// ══════════════════════════════════════════════════════════════════════
// Main Component: DwgMapOverlay (Browser-Only Client-Side Engine)
// ══════════════════════════════════════════════════════════════════════
// ── Precise Geodesic Distance & Real Coordinate Metric Helpers (WGS84) ──
export const calculateRealPolylineLengthMeters = (nodes) => {
  if (!nodes || nodes.length < 2) return 0;
  let totalMeters = 0;
  for (let i = 0; i < nodes.length - 1; i++) {
    const p1 = nodes[i];
    const p2 = nodes[i + 1];
    if (p1 && p2) {
      const lat1 = p1.lat !== undefined ? p1.lat : p1[0];
      const lng1 = p1.lng !== undefined ? p1.lng : p1[1];
      const lat2 = p2.lat !== undefined ? p2.lat : p2[0];
      const lng2 = p2.lng !== undefined ? p2.lng : p2[1];
      if (window.L && window.L.latLng) {
        totalMeters += window.L.latLng(lat1, lng1).distanceTo(window.L.latLng(lat2, lng2));
      } else {
        const R = 6378137;
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLng = ((lng2 - lng1) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        totalMeters += R * c;
      }
    }
  }
  return Math.round(totalMeters * 10) / 10;
};

export const calculateRealPlateDimensions = (nodes) => {
  if (!nodes || nodes.length < 4) return { widthM: 0, lengthM: 0, areaM2: 0 };
  const d = (p1, p2) => {
    if (window.L && window.L.latLng) {
      return window.L.latLng(p1.lat, p1.lng).distanceTo(window.L.latLng(p2.lat, p2.lng));
    }
    const R = 6378137;
    const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
    const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((p1.lat * Math.PI) / 180) *
        Math.cos((p2.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const edge01 = d(nodes[0], nodes[1]);
  const edge12 = d(nodes[1], nodes[2]);
  const edge23 = d(nodes[2], nodes[3]);
  const edge30 = d(nodes[3], nodes[0]);

  const dimA = (edge01 + edge23) / 2;
  const dimB = (edge12 + edge30) / 2;

  const widthM = Math.round(Math.min(dimA, dimB) * 10) / 10;
  const lengthM = Math.round(Math.max(dimA, dimB) * 10) / 10;
  const areaM2 = Math.round(widthM * lengthM * 10) / 10;

  return { widthM: Math.max(0.5, widthM), lengthM: Math.max(0.5, lengthM), areaM2 };
};

export const calculateRealPolygonMetrics = (nodes) => {
  if (!nodes || nodes.length < 3) return { perimeterM: 0, areaM2: 0 };
  let perimeter = 0;
  for (let i = 0; i < nodes.length; i++) {
    const nextIdx = (i + 1) % nodes.length;
    if (window.L && window.L.latLng) {
      perimeter += window.L.latLng(nodes[i].lat, nodes[i].lng).distanceTo(window.L.latLng(nodes[nextIdx].lat, nodes[nextIdx].lng));
    }
  }
  const originLat = nodes[0].lat;
  const originLng = nodes[0].lng;
  const metersPerDegreeLat = 111320;
  const metersPerDegreeLng = 111320 * Math.cos((originLat * Math.PI) / 180);

  let area = 0;
  for (let i = 0; i < nodes.length; i++) {
    const nextIdx = (i + 1) % nodes.length;
    const x1 = (nodes[i].lng - originLng) * metersPerDegreeLng;
    const y1 = (nodes[i].lat - originLat) * metersPerDegreeLat;
    const x2 = (nodes[nextIdx].lng - originLng) * metersPerDegreeLng;
    const y2 = (nodes[nextIdx].lat - originLat) * metersPerDegreeLat;
    area += x1 * y2 - x2 * y1;
  }
  return {
    perimeterM: Math.round(perimeter * 10) / 10,
    areaM2: Math.round(Math.abs(area / 2) * 10) / 10
  };
};

const DwgMapOverlay = ({
  language = 'ar',
  onPlacementsChange,
  anchorLat = 24.4686,
  anchorLng = 39.6120,
  roadName = '',
  preloadedDwgData = null,
  autoStartDirectDrawing = false,
  onCadParsed = null,
  onCadReset = null,
  workDurationHours = 0,
  excavationDepth = 0,
  speedLimit = 50,
  barriersList = [],
  onBarriersChange = null,
  onMapFeaturesExtracted = null,
  isPhaseActive = true
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
  const [activeBasemap, setActiveBasemap] = useState('esri_satellite');
  const [isLocked, setIsLocked] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [selectedFeatureInfo, setSelectedFeatureInfo] = useState(null);

  // Multi-File CAD Overlays state
  const [additionalFiles, setAdditionalFiles] = useState([]);
  const [showFileManager, setShowFileManager] = useState(false);

  // Group Visibility state (Planning limits, Centerlines, and Dimensions toggled OFF by default)
  const [keymapVisibility, setKeymapVisibility] = useState({
    DETOUR_TAPER: true,
    SAFETY_BUFFER: true,
    ROAD_BOUNDARY: false,
    CENTERLINE_AXIS: false,
    PEDESTRIAN_ROUTE: true,
    ANNOTATION_GUIDES: false
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
  const [showControlNodes, setShowControlNodes] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [selectedEditFeatureIdx, setSelectedEditFeatureIdx] = useState(null);
  const [showKeymapSidebar, setShowKeymapSidebar] = useState(false);
  const [sidebarTab, setSidebarTab] = useState('keymap'); // 'keymap' | 'drawing' | 'signs'

  // ── Multi-Layer Interactive Site Drawing State ──
  const [isMultiLayerDrawingMode, setIsMultiLayerDrawingMode] = useState(false);
  const [activeDrawingLayer, setActiveDrawingLayer] = useState('site'); // 'site' | 'transition' | 'barrier' | 'pedestrian' | 'plates' | 'labels'
  
  // Single active in-progress nodes
  const [drawnSiteNodes, setDrawnSiteNodes] = useState([]); // Yellow Polygon (Work Zone Site)
  const [drawnTransitionNodes, setDrawnTransitionNodes] = useState([]); // Red Polyline (Detour Transition Taper currently drawing)
  const [drawnBarrierNodes, setDrawnBarrierNodes] = useState([]); // Cyan Polyline (Barrier Wall currently drawing)
  const [selectedBarrierType, setSelectedBarrierType] = useState('concrete_njb'); // 'concrete_njb' | 'plastic_njb' | 'cones_series' | 'warning_lights_chain'
  const [drawnPedestrianNodes, setDrawnPedestrianNodes] = useState([]); // Green Polyline (Safe Pedestrian Route currently drawing)
  const [drawnPlateNodes, setDrawnPlateNodes] = useState([]); // Purple 4-corner Steel Trench Plate currently drawing
  const [customTextLabels, setCustomTextLabels] = useState([]); // Custom User Placed Text Annotations & Callouts
  const [newLabelText, setNewLabelText] = useState(''); // Text input for next placed label

  // Multiple Saved Features Collections
  const [savedDetours, setSavedDetours] = useState([]); // Multiple completed detour routes
  const [savedBarriers, setSavedBarriers] = useState([]); // Multiple completed barrier paths
  const [savedPedestrians, setSavedPedestrians] = useState([]); // Multiple completed pedestrian corridors
  const [savedPlates, setSavedPlates] = useState([]); // Multiple completed 4-node steel trench plates (Purple)
  const [selectedPlateType, setSelectedPlateType] = useState('steel_40t');
  const isDrawPanelOpen = Boolean(showKeymapSidebar && sidebarTab === 'drawing');
  const isDrawPanelOpenRef = useRef(isDrawPanelOpen);
  useEffect(() => {
    isDrawPanelOpenRef.current = isDrawPanelOpen;
    if (mapInstanceRef.current) {
      const container = mapInstanceRef.current.getContainer();
      if (container) {
        container.style.cursor = isDrawPanelOpen ? 'crosshair' : 'grab';
        if (!container.classList.contains('leaflet-container')) {
          container.classList.add('leaflet-container');
        }
      }
      mapInstanceRef.current.invalidateSize();
      const t1 = setTimeout(() => { if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize(); }, 60);
      const t2 = setTimeout(() => { if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize(); }, 200);
      const t3 = setTimeout(() => { if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize(); }, 350);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }
  }, [isDrawPanelOpen]); // 'steel_40t' | 'steel_25mm' | 'anti_skid' | 'pedestrian'
  const drawingLayerRef = useRef(null);

  // ── CAD Versioning & Watermarking State ──
  const [activeVersionType, setActiveVersionType] = useState('edited'); // 'original' | 'edited'
  const [originalDwgData, setOriginalDwgData] = useState(null);
  const [isWatermarking, setIsWatermarking] = useState(false);

  // ── History Stack for Revert & Forward (Undo / Redo) CAD Line Changes ──
  const [historyStack, setHistoryStack] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const dragSnapshotRef = useRef(null);

  // ── Refs ──
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const baseTileLayerRef = useRef(null);
  const geoJsonLayerRef = useRef(null);
  const workZoneLayerRef = useRef(null);
  const controlNodesLayerRef = useRef(null);
  const additionalGeoJsonLayersRef = useRef({});
  const markersLayerRef = useRef(null);
  const dragHandleRef = useRef(null);
  const fileInputRef = useRef(null);
  const additionalFileInputRef = useRef(null);
  const workerRef = useRef(null);

  const [isDirectDrawingActive, setIsDirectDrawingActive] = useState(false);
  const isMapActive = uploadStatus === 'done' || dwgData !== null || isDirectDrawingActive;
  const hasImportedCad = Boolean(
    dwgData && 
    fileName && 
    fileName !== 'Direct_Site_Plan.dxf' && 
    dwgData?.fileName !== 'Direct_Site_Plan.dxf' && 
    dwgData?.geojson?.features?.length > 0
  );

  // Direct Interactive Drawing Handler (Start with 0 Uploads)
  const handleStartDirectDrawing = useCallback(() => {
    setIsDirectDrawingActive(true);
    const initialGeojson = {
      type: 'FeatureCollection',
      features: []
    };
    const initialDwg = {
      fileName: 'Direct_Site_Plan.dxf',
      geojson: initialGeojson,
      centerLatLng: [anchorLat || 24.4686, anchorLng || 39.6120],
      totalFeatures: 0,
      detectedMotSigns: []
    };
    setDwgData(initialDwg);
    setUploadStatus('done');
    setIsMultiLayerDrawingMode(true);
    setActiveDrawingLayer('site');
    setDrawnSiteNodes([]);
    setDrawnTransitionNodes([]);
    setDrawnBarrierNodes([]);
    setDrawnPedestrianNodes([]);
    if (onCadParsed) {
      onCadParsed({ siteName: 'Direct Drawing Mode' }, initialDwg, 'Direct_Site_Plan.dxf');
    }
  }, [anchorLat, anchorLng, onCadParsed]);

  // Automatically open map in direct drawing mode if triggered from Stage 1 setup choice
  useEffect(() => {
    if (autoStartDirectDrawing && !isMapActive) {
      handleStartDirectDrawing();
    }
  }, [autoStartDirectDrawing, isMapActive, handleStartDirectDrawing]);

  // Auto-center map only initially on anchor coordinates
  const initialAnchorCenteredRef = useRef(false);
  useEffect(() => {
    if (!initialAnchorCenteredRef.current && mapInstanceRef.current && anchorLat && anchorLng) {
      initialAnchorCenteredRef.current = true;
      mapInstanceRef.current.setView([anchorLat, anchorLng], 18, { animate: false });
    }
  }, [anchorLat, anchorLng]);

  // Auto-resize Leaflet map smoothly when Keymap Sidebar is collapsed or expanded
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.invalidateSize();
      const t1 = setTimeout(() => { if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize(); }, 60);
      const t2 = setTimeout(() => { if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize(); }, 200);
      const t3 = setTimeout(() => { if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize(); }, 350);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }
  }, [showKeymapSidebar]);

  // Continuous ResizeObserver to prevent any black screen / unrendered areas on map container resize
  useEffect(() => {
    if (!mapContainerRef.current || !mapInstanceRef.current) return;
    const ro = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });
    ro.observe(mapContainerRef.current);
    return () => ro.disconnect();
  }, [mapReady]);

  // Initialize history stack when DWG data arrives
  useEffect(() => {
    if (dwgData?.geojson) {
      setHistoryStack(prev => {
        if (prev.length === 0) {
          return [JSON.parse(JSON.stringify(dwgData.geojson))];
        }
        return prev;
      });
      setHistoryIndex(prev => (prev === -1 ? 0 : prev));
    }
  }, [dwgData?.geojson]);

  // Revert to previous CAD geometry state
  const handleUndo = useCallback(() => {
    if (historyIndex > 0 && historyStack[historyIndex - 1]) {
      const prevGeojson = historyStack[historyIndex - 1];
      const newIdx = historyIndex - 1;
      setHistoryIndex(newIdx);
      setDwgData(current => current ? ({
        ...current,
        geojson: JSON.parse(JSON.stringify(prevGeojson))
      }) : null);
    }
  }, [historyIndex, historyStack]);

  // Forward to next CAD geometry state
  const handleRedo = useCallback(() => {
    if (historyIndex < historyStack.length - 1 && historyStack[historyIndex + 1]) {
      const nextGeojson = historyStack[historyIndex + 1];
      const newIdx = historyIndex + 1;
      setHistoryIndex(newIdx);
      setDwgData(current => current ? ({
        ...current,
        geojson: JSON.parse(JSON.stringify(nextGeojson))
      }) : null);
    }
  }, [historyIndex, historyStack]);

  // ── Persistent Refs for Stale-Closure Free Canvas Click Handling ──
  const activeDrawingLayerRef = useRef(activeDrawingLayer);
  const isMultiLayerDrawingModeRef = useRef(isMultiLayerDrawingMode);
  const selectedBarrierTypeRef = useRef(selectedBarrierType);
  const selectedPlateTypeRef = useRef(selectedPlateType);
  const newLabelTextRef = useRef(newLabelText);
  const anchorLatRef = useRef(anchorLat);
  const anchorLngRef = useRef(anchorLng);
  const isArRef = useRef(isAr);

  useEffect(() => { activeDrawingLayerRef.current = activeDrawingLayer; }, [activeDrawingLayer]);
  useEffect(() => { isMultiLayerDrawingModeRef.current = isMultiLayerDrawingMode; }, [isMultiLayerDrawingMode]);
  useEffect(() => { selectedBarrierTypeRef.current = selectedBarrierType; }, [selectedBarrierType]);
  useEffect(() => { selectedPlateTypeRef.current = selectedPlateType; }, [selectedPlateType]);
  useEffect(() => { newLabelTextRef.current = newLabelText; }, [newLabelText]);
  useEffect(() => { anchorLatRef.current = anchorLat; }, [anchorLat]);
  useEffect(() => { anchorLngRef.current = anchorLng; }, [anchorLng]);
  useEffect(() => { isArRef.current = isAr; }, [isAr]);

  // References to track stage switching without re-triggering during drawing
  const prevPhaseActiveRef = useRef(isPhaseActive);

  // ONLY snap to location when switching between stages and returning to the map!
  useEffect(() => {
    const justReturnedToStage = isPhaseActive && !prevPhaseActiveRef.current;
    prevPhaseActiveRef.current = isPhaseActive;

    if (justReturnedToStage && mapInstanceRef.current && window.L) {
      setTimeout(() => {
        if (!mapInstanceRef.current) return;
        mapInstanceRef.current.invalidateSize();

        // Snap to location of drawn zone
        const all = [
          ...drawnSiteNodes,
          ...drawnTransitionNodes,
          ...drawnBarrierNodes,
          ...drawnPedestrianNodes,
          ...drawnPlateNodes,
          ...savedDetours.flatMap(d => d.nodes || []),
          ...savedBarriers.flatMap(b => b.nodes || []),
          ...savedPedestrians.flatMap(p => p.nodes || []),
          ...savedPlates.flatMap(p => p.nodes || [])
        ];
        if (all.length > 0) {
          const lats = all.map(n => n.lat);
          const lngs = all.map(n => n.lng);
          const minLat = Math.min(...lats), maxLat = Math.max(...lats);
          const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
          if (minLat === maxLat && minLng === maxLng) {
            mapInstanceRef.current.setView([minLat, minLng], 18, { animate: false });
          } else {
            const bounds = window.L.latLngBounds([minLat, minLng], [maxLat, maxLng]);
            if (bounds.isValid()) {
              mapInstanceRef.current.fitBounds(bounds.pad(0.2), { maxZoom: 18, animate: false });
            }
          }
        }
      }, 150);
    }
  }, [isPhaseActive]);

  // ── Multi-Layer Interactive Map Click Listener (Instant First-Click Active) ──
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L || !mapReady) return;
    const map = mapInstanceRef.current;

    const handleCanvasClick = (e) => {
      // ONLY place nodes when the Draw Panel is OPEN and actively selected!
      if (!isDrawPanelOpenRef.current) return;
      const { lat, lng } = e.latlng;
      const curAnchorLat = anchorLatRef.current || 24.4686;
      const curAnchorLng = anchorLngRef.current || 39.6120;
      const utmX = Math.round(582500 + (lng - curAnchorLng) * 100000);
      const utmN = Math.round(2703800 + (lat - curAnchorLat) * 110000);

      const curLayer = activeDrawingLayerRef.current;

      if (curLayer === 'site') {
        setDrawnSiteNodes(prev => {
          const nextIdx = prev.length + 1;
          return [...prev, { id: `S${nextIdx}`, lat, lng, x: utmX, y: utmN }];
        });
      } else if (curLayer === 'transition') {
        setDrawnTransitionNodes(prev => {
          const nextIdx = prev.length + 1;
          return [...prev, { id: `T${nextIdx}`, lat, lng, x: utmX, y: utmN }];
        });
      } else if (curLayer === 'barrier') {
        setDrawnBarrierNodes(prev => {
          const nextIdx = prev.length + 1;
          return [...prev, { id: `B${nextIdx}`, lat, lng, x: utmX, y: utmN }];
        });
      } else if (curLayer === 'pedestrian') {
        setDrawnPedestrianNodes(prev => {
          const nextIdx = prev.length + 1;
          return [...prev, { id: `P${nextIdx}`, lat, lng, x: utmX, y: utmN }];
        });
      } else if (curLayer === 'plates') {
        // Collect up to 4 corner nodes, then allow user to drag/adjust before confirming
        setDrawnPlateNodes(prev => {
          if (prev.length >= 4) return prev;
          const nextIdx = prev.length + 1;
          return [...prev, { id: `PL${nextIdx}`, lat, lng, x: utmX, y: utmN }];
        });
      } else if (curLayer === 'labels') {
        const textToPlace = (newLabelTextRef.current || '').trim() || (isArRef.current ? 'تسمية' : 'Label');
        setCustomTextLabels(prev => [
          ...prev, 
          { 
            id: `LBL_${Date.now()}`, 
            text: textToPlace, 
            lat, 
            lng, 
            x: utmX, 
            y: utmN,
            color: '#38bdf8'
          }
        ]);
      }

// Map stays completely stable under cursor while placing nodes
    };

    map.on('click', handleCanvasClick);
    return () => {
      map.off('click', handleCanvasClick);
    };
  }, [mapReady]);

  // ── Auto-Extraction Sync to Stage 2.2 and Stage 3 ──
  useEffect(() => {
    if (!onMapFeaturesExtracted) return;

    const allBarriers = [
      ...savedBarriers,
      ...(drawnBarrierNodes.length >= 2 ? [{
        id: 'active_barrier',
        type: selectedBarrierType,
        name: isAr ? 'حاجز قيد الرسم' : 'Active Drawing Barrier',
        nodes: drawnBarrierNodes,
        lengthM: calculateRealPolylineLengthMeters(drawnBarrierNodes),
        clearanceM: selectedBarrierType.includes('concrete') ? 0.8 : 2.5
      }] : [])
    ];

    const allDetours = [
      ...savedDetours,
      ...(drawnTransitionNodes.length >= 2 ? [{
        id: 'active_detour',
        name: isAr ? 'مسار تحويلة قيد الرسم' : 'Active Detour',
        nodes: drawnTransitionNodes,
        lengthM: calculateRealPolylineLengthMeters(drawnTransitionNodes)
      }] : [])
    ];

    const allPedestrians = [
      ...savedPedestrians,
      ...(drawnPedestrianNodes.length >= 2 ? [{
        id: 'active_ped',
        name: isAr ? 'ممر مشاة قيد الرسم' : 'Active Pedestrian Path',
        nodes: drawnPedestrianNodes,
        lengthM: calculateRealPolylineLengthMeters(drawnPedestrianNodes)
      }] : [])
    ];

    const activePlateDims = drawnPlateNodes.length === 4 ? calculateRealPlateDimensions(drawnPlateNodes) : null;
    const allPlates = [
      ...savedPlates,
      ...(drawnPlateNodes.length === 4 ? [{
        id: 'active_plate',
        type: selectedPlateType,
        nodes: drawnPlateNodes,
        widthM: activePlateDims ? activePlateDims.widthM : 1.8,
        lengthM: activePlateDims ? activePlateDims.lengthM : 3.0,
        areaM2: activePlateDims ? activePlateDims.areaM2 : 5.4,
        thicknessMm: selectedPlateType === 'steel_40t' ? 30 : 25
      }] : [])
    ];

    const taperLen = allDetours.length > 0 ? allDetours[0].lengthM : (drawnTransitionNodes.length >= 2 ? calculateRealPolylineLengthMeters(drawnTransitionNodes) : 0);
    const siteMetrics = calculateRealPolygonMetrics(drawnSiteNodes);

    onMapFeaturesExtracted({
      barriers: allBarriers,
      detours: allDetours,
      pedestrians: allPedestrians,
      plates: allPlates,
      siteNodes: drawnSiteNodes,
      taperLengthM: taperLen,
      laneWidthM: 3.6,
      siteMetrics
    });
  }, [
    savedBarriers, drawnBarrierNodes,
    savedDetours, drawnTransitionNodes,
    savedPedestrians, drawnPedestrianNodes,
    savedPlates, drawnPlateNodes,
    drawnSiteNodes, selectedBarrierType
  ]);

  const handleSaveAndAddAnotherDetour = () => {
    if (drawnTransitionNodes.length < 2) return;
    const lenM = calculateRealPolylineLengthMeters(drawnTransitionNodes);
    const newD = {
      id: `detour_${Date.now()}`,
      name: isAr ? `مسار تحويلة ${savedDetours.length + 1}` : `Detour Corridor #${savedDetours.length + 1}`,
      nodes: [...drawnTransitionNodes],
      lengthM: lenM
    };
    setSavedDetours(prev => [...prev, newD]);
    setDrawnTransitionNodes([]);
  };

  const handleSaveAndAddAnotherBarrier = () => {
    if (drawnBarrierNodes.length < 2) return;
    const lenM = calculateRealPolylineLengthMeters(drawnBarrierNodes);
    const isConc = selectedBarrierType.includes('concrete');
    const newB = {
      id: `barrier_${Date.now()}`,
      type: selectedBarrierType,
      name: isAr ? (isConc ? `جدار خرساني مسلّح ${savedBarriers.length + 1}` : `حاجز بلاستيكي ${savedBarriers.length + 1}`) : `Barrier #${savedBarriers.length + 1}`,
      nodes: [...drawnBarrierNodes],
      lengthM: lenM,
      clearanceM: isConc ? 0.8 : 2.5
    };
    setSavedBarriers(prev => [...prev, newB]);
    setDrawnBarrierNodes([]);
  };

  // Confirm & Save 4-Node Steel Trench Plate with Real Coordinates
  const handleConfirmAndSavePlate = () => {
    if (drawnPlateNodes.length !== 4) return;
    const { widthM, lengthM, areaM2 } = calculateRealPlateDimensions(drawnPlateNodes);

    const plateTypeMeta = {
      steel_40t: { ar: 'لوح صلب ٤٠ طن (سمك ٣٠ ملم)', en: 'Heavy Steel Plate 40T (30mm)', thick: 30 },
      steel_25mm: { ar: 'لوح صلب ٢٠ طن (سمك ٢٥ ملم)', en: 'Steel Plate 20T (25mm)', thick: 25 },
      anti_skid: { ar: 'لوح منقوش مانع للانزلاق (سمك ٢٥ ملم)', en: 'Anti-Skid Plate (25mm)', thick: 25 },
      pedestrian: { ar: 'جسر مشاة حديدي مع درابزين (سمك ١٥ ملم)', en: 'Pedestrian Iron Bridge (15mm)', thick: 15 }
    };
    const meta = plateTypeMeta[selectedPlateType] || plateTypeMeta.steel_40t;

    const newPlate = {
      id: `plate_${Date.now()}`,
      type: selectedPlateType,
      name: isAr ? `${meta.ar} #${savedPlates.length + 1}` : `${meta.en} #${savedPlates.length + 1}`,
      nodes: [...drawnPlateNodes],
      widthM,
      lengthM,
      areaM2,
      thicknessMm: meta.thick,
      color: '#a855f7'
    };

    setSavedPlates(prev => [...prev, newPlate]);
    setDrawnPlateNodes([]);
  };

  const handleSaveAndAddAnotherPedestrian = () => {
    if (drawnPedestrianNodes.length < 2) return;
    const lenM = calculateRealPolylineLengthMeters(drawnPedestrianNodes);
    const newP = {
      id: `ped_${Date.now()}`,
      name: isAr ? `ممر مشاة آمن ${savedPedestrians.length + 1}` : `Pedestrian Path #${savedPedestrians.length + 1}`,
      nodes: [...drawnPedestrianNodes],
      lengthM: lenM
    };
    setSavedPedestrians(prev => [...prev, newP]);
    setDrawnPedestrianNodes([]);
  };

  // ── Render Multi-Layer Drawing (Yellow Site, Red Detour, Cyan Barrier, Green Pedestrian, Custom Labels) ──
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;

    if (drawingLayerRef.current) {
      mapInstanceRef.current.removeLayer(drawingLayerRef.current);
      drawingLayerRef.current = null;
    }

    const hasAnyDrawn = drawnSiteNodes.length > 0 || drawnTransitionNodes.length > 0 || drawnBarrierNodes.length > 0 || drawnPedestrianNodes.length > 0 || drawnPlateNodes.length > 0 || customTextLabels.length > 0 || savedBarriers.length > 0 || savedDetours.length > 0 || savedPedestrians.length > 0 || savedPlates.length > 0;
    if (!isMultiLayerDrawingMode && !hasAnyDrawn) return;

    const lg = window.L.layerGroup().addTo(mapInstanceRef.current);
    drawingLayerRef.current = lg;

    // Helper: Render Layer Nodes with Delete/Revert tooltips & drag handles
    const renderNodeMarkers = (nodes, setNodes, color, border, labelPrefix) => {
      nodes.forEach((node, idx) => {
        const marker = window.L.marker([node.lat, node.lng], {
          draggable: true,
          pane: 'cadMarkerPane',
          icon: window.L.divIcon({
            className: 'multi-layer-drawn-node-marker',
            html: `<div style="
              background: ${color};
              color: white;
              border: 2px solid ${border};
              border-radius: 50%;
              width: 26px;
              height: 26px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 900;
              font-size: 10px;
              box-shadow: 0 3px 8px rgba(0,0,0,0.6);
              cursor: grab;
            ">${node.id}</div>`,
            iconSize: [26, 26],
            iconAnchor: [13, 13]
          })
        });

        marker.on('dragend', (e) => {
          const { lat, lng } = e.target.getLatLng();
          setNodes(prev => {
            const u = [...prev];
            if (u[idx]) {
              u[idx] = {
                ...u[idx],
                lat,
                lng,
                x: Math.round(582500 + (lng - anchorLng) * 100000),
                y: Math.round(2703800 + (lat - anchorLat) * 110000)
              };
            }
            return u;
          });
        });

        const deleteBtnHtml = `
          <div style="font-family: system-ui, sans-serif; font-size: 11px; padding: 4px; direction: ${isAr ? 'rtl' : 'ltr'}; text-align: center;">
            <div style="font-weight:bold; color:#f8fafc; margin-bottom:4px;">${labelPrefix} ${node.id}</div>
            <div style="color:#94a3b8; font-size:9.5px; font-family:monospace; margin-bottom:6px;">E: ${node.x}م | N: ${node.y}م</div>
            <button id="del-node-${node.id}" style="background:#ef4444; color:white; border:none; border-radius:6px; padding:4px 8px; font-size:10.5px; font-weight:bold; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:3px; margin:0 auto; width:100%;">
              🗑️ ${isAr ? 'حذف هذه النقطة' : 'Delete Node'}
            </button>
          </div>
        `;
        marker.bindPopup(deleteBtnHtml);
        marker.on('popupopen', () => {
          const btn = document.getElementById(`del-node-${node.id}`);
          if (btn) {
            btn.onclick = (e) => {
              e.stopPropagation();
              setNodes(prev => prev.filter((_, i) => i !== idx).map((n, i) => ({ ...n, id: `${node.id[0]}${i + 1}` })));
              if (mapInstanceRef.current) mapInstanceRef.current.closePopup();
            };
          }
        });

        marker.addTo(lg);
      });
    };

    // ── Focused Layer Detection for Grabable Nodes ──
    // Grabable node handles are ONLY visible when the draw panel is active AND for the specific layer focused
    const isSiteFocused = isDrawPanelOpen && activeDrawingLayer === 'site';
    const isTransitionFocused = isDrawPanelOpen && activeDrawingLayer === 'transition';
    const isBarrierFocused = isDrawPanelOpen && activeDrawingLayer === 'barrier';
    const isPedestrianFocused = isDrawPanelOpen && activeDrawingLayer === 'pedestrian';
    const isPlatesFocused = isDrawPanelOpen && activeDrawingLayer === 'plates';
    const isLabelsFocused = isDrawPanelOpen && activeDrawingLayer === 'labels';

    // 1. Render Site Nodes (Yellow Polygon - ONE clean polygon)
    if (isSiteFocused && drawnSiteNodes.length > 0) {
      renderNodeMarkers(drawnSiteNodes, setDrawnSiteNodes, '#f59e0b', '#fef08a', isAr ? 'نقطة الموقع' : 'Site Node');
    }
    if (drawnSiteNodes.length >= 3) {
      window.L.polygon(drawnSiteNodes.map(n => [n.lat, n.lng]), {
        color: '#f59e0b',
        weight: 3,
        fillColor: '#f59e0b',
        fillOpacity: 0.28,
        dashArray: '5, 5'
      }).addTo(lg);
    } else if (drawnSiteNodes.length === 2) {
      window.L.polyline(drawnSiteNodes.map(n => [n.lat, n.lng]), {
        color: '#f59e0b',
        weight: 3,
        dashArray: '5, 5'
      }).addTo(lg);
    }

    // 2. Render Transition Nodes (Red Polyline)
    if (isTransitionFocused && drawnTransitionNodes.length > 0) {
      renderNodeMarkers(drawnTransitionNodes, setDrawnTransitionNodes, '#ef4444', '#fecaca', isAr ? 'نقطة التحويلة' : 'Detour Node');
    }
    if (drawnTransitionNodes.length >= 2) {
      window.L.polyline(drawnTransitionNodes.map(n => [n.lat, n.lng]), {
        color: '#ef4444',
        weight: 3.5,
        dashArray: '6, 4'
      }).addTo(lg);
    }

    // 3. Render Barrier Wall Nodes (Cyan / Slate Polyline with repeating pattern)
    if (isBarrierFocused && drawnBarrierNodes.length > 0) {
      renderNodeMarkers(drawnBarrierNodes, setDrawnBarrierNodes, '#06b6d4', '#cffafe', isAr ? 'نقطة جدار الحواجز' : 'Barrier Node');
    }
    if (drawnBarrierNodes.length >= 2) {
      window.L.polyline(drawnBarrierNodes.map(n => [n.lat, n.lng]), {
        color: '#06b6d4',
        weight: 4.5,
        dashArray: '8, 4'
      }).addTo(lg);
    }

    // 4. Render Pedestrian Nodes (Green Polyline - Optional)
    if (isPedestrianFocused && drawnPedestrianNodes.length > 0) {
      renderNodeMarkers(drawnPedestrianNodes, setDrawnPedestrianNodes, '#10b981', '#a7f3d0', isAr ? 'نقطة المشاة' : 'Pedestrian Node');
    }
    if (drawnPedestrianNodes.length >= 2) {
      window.L.polyline(drawnPedestrianNodes.map(n => [n.lat, n.lng]), {
        color: '#10b981',
        weight: 2.8,
        dashArray: '4, 4'
      }).addTo(lg);
    }

    // 2b. Render Saved Multiple Detours (Red Polyline series)
    savedDetours.forEach((detour, dIdx) => {
      if (detour.nodes && detour.nodes.length >= 2) {
        const poly = window.L.polyline(detour.nodes.map(n => [n.lat, n.lng]), {
          color: '#ef4444',
          weight: 4,
          dashArray: '6, 4'
        }).addTo(lg);
        poly.bindTooltip(`<b style="color:#ef4444">🚗 ${detour.name}</b><br/>${isAr ? `الطول: ${detour.lengthM}م` : `Length: ${detour.lengthM}m`}`, { permanent: false });
      }
    });

    // 3b. Render Saved Multiple Barriers (Cyan Polyline series)
    savedBarriers.forEach((barrier, bIdx) => {
      if (barrier.nodes && barrier.nodes.length >= 2) {
        const poly = window.L.polyline(barrier.nodes.map(n => [n.lat, n.lng]), {
          color: '#06b6d4',
          weight: 4.5,
          dashArray: '8, 4'
        }).addTo(lg);
        poly.bindTooltip(`<b style="color:#06b6d4">🧱 ${barrier.name || 'حاجز سلامة'}</b><br/>${isAr ? `النوع: ${barrier.type} | الطول: ${barrier.lengthM}م` : `Type: ${barrier.type} | Length: ${barrier.lengthM}m`}`, { permanent: false });
      }
    });

    // 4b. Render Saved Multiple Pedestrian Corridors (Green Polyline series)
    savedPedestrians.forEach((ped, pIdx) => {
      if (ped.nodes && ped.nodes.length >= 2) {
        const poly = window.L.polyline(ped.nodes.map(n => [n.lat, n.lng]), {
          color: '#10b981',
          weight: 3.5,
          dashArray: '4, 4'
        }).addTo(lg);
        poly.bindTooltip(`<b style="color:#10b981">🚶 ${ped.name}</b><br/>${isAr ? `الطول: ${ped.lengthM}م` : `Length: ${ped.lengthM}m`}`, { permanent: false });
      }
    });

    // 4c. Render Saved Multiple Trench Steel Plates (Purple 4-Node Polygons)
    savedPlates.forEach((plate, plIdx) => {
      if (plate.nodes && plate.nodes.length === 4) {
        const poly = window.L.polygon(plate.nodes.map(n => [n.lat, n.lng]), {
          color: '#a855f7',
          weight: 3,
          fillColor: '#a855f7',
          fillOpacity: 0.38,
          dashArray: '3, 3'
        }).addTo(lg);
        poly.bindTooltip(
          `<b style="color:#c084fc">🟣 ${plate.name}</b><br/>${isAr ? `المواصفة: صلب ٤٠ طن (سمك ٣٠ ملم)<br/>الأبعاد: ${plate.lengthM}م × ${plate.widthM}م` : `Spec: 40T Steel (30mm thickness)<br/>Dim: ${plate.lengthM}m x ${plate.widthM}m`}`,
          { permanent: false }
        );

        // Corner pins are ONLY rendered when Plates layer is focused!
        if (isPlatesFocused) {
          plate.nodes.forEach((node, nodeIdx) => {
            const cornerMk = window.L.marker([node.lat, node.lng], {
              pane: 'cadMarkerPane',
              icon: window.L.divIcon({
                className: 'plate-corner-node-marker',
                html: `<div style="background:#a855f7;color:white;border:1.5px solid #f3e8ff;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:9px;box-shadow:0 2px 6px rgba(0,0,0,0.6);">${node.id || `PL${nodeIdx+1}`}</div>`,
                iconSize: [22, 22],
                iconAnchor: [11, 11]
              })
            });
            cornerMk.bindPopup(`
              <div style="font-family:system-ui;font-size:11px;direction:${isAr?'rtl':'ltr'};text-align:center;">
                <div style="font-weight:bold;color:#c084fc;margin-bottom:4px;">🟣 ${plate.name}</div>
                <button id="del-plate-${plate.id}" style="background:#ef4444;color:white;border:none;border-radius:6px;padding:4px 8px;font-size:10px;font-weight:bold;cursor:pointer;width:100%;">
                  🗑️ ${isAr ? 'حذف هذا اللوح' : 'Delete Plate'}
                </button>
              </div>
            `);
            cornerMk.on('popupopen', () => {
              const btn = document.getElementById(`del-plate-${plate.id}`);
              if (btn) {
                btn.onclick = (e) => {
                  e.stopPropagation();
                  setSavedPlates(prev => prev.filter(p => p.id !== plate.id));
                  if (mapInstanceRef.current) mapInstanceRef.current.closePopup();
                };
              }
            });
            cornerMk.addTo(lg);
          });
        }
      }
    });

    // 4d. Render Active In-Progress Plate Nodes (Purple 1-4 nodes with draggable corner adjustments)
    if (drawnPlateNodes.length > 0) {
      if (isPlatesFocused) {
        renderNodeMarkers(drawnPlateNodes, setDrawnPlateNodes, '#a855f7', '#f3e8ff', isAr ? 'ركن اللوح' : 'Plate Corner');
      }
      if (drawnPlateNodes.length === 4) {
        const activePlatePoly = window.L.polygon(drawnPlateNodes.map(n => [n.lat, n.lng]), {
          color: '#a855f7',
          weight: 3.5,
          fillColor: '#a855f7',
          fillOpacity: 0.38
        }).addTo(lg);
        activePlatePoly.bindTooltip(
          isAr
            ? '<b style="color:#c084fc">🟣 لوح قيد التعديل (٤ أركان)</b><br/>اسحب أي ركن على الخريطة لتعديل الموضع، ثم اضغط على زر اعتماد اللوح في القائمة.'
            : '<b style="color:#c084fc">🟣 In-Progress Plate (4 Corners)</b><br/>Drag any corner on map to adjust, then click Confirm & Save.',
          { permanent: false }
        );
      } else if (drawnPlateNodes.length >= 2) {
        window.L.polyline(drawnPlateNodes.map(n => [n.lat, n.lng]), {
          color: '#a855f7',
          weight: 2.5,
          dashArray: '3, 3'
        }).addTo(lg);
      }
    }

    // 5. Render Custom Text Labels (Cyan / Gold Callouts)
    customTextLabels.forEach((lbl, idx) => {
      const labelIcon = window.L.divIcon({
        className: 'cad-custom-text-label',
        html: `<div style="
          background: rgba(15, 23, 42, 0.95);
          color: #38bdf8;
          border: 1.5px solid #0284c7;
          border-radius: 8px;
          padding: 3px 8px;
          font-weight: bold;
          font-size: 11px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.6);
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 4px;
          cursor: pointer;
        ">
          <span style="font-size: 12px;">🏷️</span>
          <span>${lbl.text}</span>
        </div>`,
        iconAnchor: [12, 12]
      });

      const labelMarker = window.L.marker([lbl.lat, lbl.lng], {
        draggable: isLabelsFocused,
        pane: 'cadMarkerPane',
        icon: labelIcon
      });

      labelMarker.on('dragend', (e) => {
        const { lat, lng } = e.target.getLatLng();
        setCustomTextLabels(prev => {
          const u = [...prev];
          if (u[idx]) {
            u[idx] = {
              ...u[idx],
              lat,
              lng,
              x: Math.round(582500 + (lng - anchorLng) * 100000),
              y: Math.round(2703800 + (lat - anchorLat) * 110000)
            };
          }
          return u;
        });
      });

      const popupContent = `
        <div style="font-family: system-ui, sans-serif; font-size: 11px; padding: 4px; direction: ${isAr ? 'rtl' : 'ltr'}; text-align: center;">
          <div style="font-weight:bold; color:#38bdf8; margin-bottom:3px;">🏷️ ${lbl.text}</div>
          <div style="color:#94a3b8; font-size:9.5px; font-family:monospace; margin-bottom:6px;">E: ${lbl.x}م | N: ${lbl.y}م</div>
          <button id="del-label-${lbl.id}" style="background:#ef4444; color:white; border:none; border-radius:6px; padding:4px 8px; font-size:10px; font-weight:bold; cursor:pointer; width:100%;">
            🗑️ ${isAr ? 'حذف التسمية' : 'Delete Label'}
          </button>
        </div>
      `;
      labelMarker.bindPopup(popupContent);
      labelMarker.on('popupopen', () => {
        const btn = document.getElementById(`del-label-${lbl.id}`);
        if (btn) {
          btn.onclick = (e) => {
            e.stopPropagation();
            setCustomTextLabels(prev => prev.filter(item => item.id !== lbl.id));
            if (mapInstanceRef.current) mapInstanceRef.current.closePopup();
          };
        }
      });

      labelMarker.addTo(lg);
    });
  }, [isMultiLayerDrawingMode, isDrawPanelOpen, activeDrawingLayer, drawnSiteNodes, drawnTransitionNodes, drawnBarrierNodes, drawnPedestrianNodes, drawnPlateNodes, savedDetours, savedBarriers, savedPedestrians, savedPlates, customTextLabels, anchorLat, anchorLng, isAr]);

  // Undo / Revert Last Placed Point on Active Drawing Layer
  const handleUndoLastPoint = () => {
    if (activeDrawingLayer === 'site') {
      setDrawnSiteNodes(prev => prev.slice(0, -1));
    } else if (activeDrawingLayer === 'transition') {
      setDrawnTransitionNodes(prev => prev.slice(0, -1));
    } else if (activeDrawingLayer === 'barrier') {
      setDrawnBarrierNodes(prev => prev.slice(0, -1));
    } else if (activeDrawingLayer === 'pedestrian') {
      setDrawnPedestrianNodes(prev => prev.slice(0, -1));
    }
  };

  // Clear All Points on Active Drawing Layer
  const handleClearActiveLayerPoints = () => {
    if (activeDrawingLayer === 'site') setDrawnSiteNodes([]);
    else if (activeDrawingLayer === 'transition') setDrawnTransitionNodes([]);
    else if (activeDrawingLayer === 'barrier') setDrawnBarrierNodes([]);
    else if (activeDrawingLayer === 'pedestrian') setDrawnPedestrianNodes([]);
  };

  // Convert Drawn Multi-Layer Geometry into Active CAD GeoJSON Features
  const handleCommitMultiLayerFeatures = () => {
    if (drawnSiteNodes.length < 3 && drawnTransitionNodes.length < 2 && drawnBarrierNodes.length < 2) {
      alert(isAr ? 'يرجى رسم حدود الموقع (٣ نقاط على الأقل) أو مسار التحويلة أو جدار الحواجز' : 'Please draw site boundary, detour transition, or barrier wall');
      return;
    }

    const newFeatures = [];

    // 1. Site Boundary (Yellow Polygon - exactly ONE clean polygon)
    if (drawnSiteNodes.length >= 3) {
      const siteCoords = [...drawnSiteNodes.map(n => [n.lng, n.lat]), [drawnSiteNodes[0].lng, drawnSiteNodes[0].lat]];
      newFeatures.push({
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [siteCoords] },
        properties: { layer: 'WORK_ZONE_BOUNDARY', motGroup: 'WORK_ZONE_BOUNDARY', color: '#F59E0B', lengthMeters: 120 }
      });
    }

    // 2. Detour Transition Line (Red Polyline)
    if (drawnTransitionNodes.length >= 2) {
      const transCoords = drawnTransitionNodes.map(n => [n.lng, n.lat]);
      newFeatures.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: transCoords },
        properties: { layer: 'DETOUR_TAPER', motGroup: 'DETOUR_TAPER', color: '#EF4444', lengthMeters: 140 }
      });
    }

    // 3. Continuous Barrier Wall Line (Cyan Polyline)
    if (drawnBarrierNodes.length >= 2) {
      const barrierCoords = drawnBarrierNodes.map(n => [n.lng, n.lat]);
      newFeatures.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: barrierCoords },
        properties: {
          layer: 'NJB_BARRIER_LINE',
          motGroup: 'SAFETY_BUFFER',
          color: '#06B6D4',
          barrierType: selectedBarrierType,
          lengthMeters: 120
        }
      });
    }

    // 4. Pedestrian Route (Green Polyline - Optional)
    if (drawnPedestrianNodes.length >= 2) {
      const pedCoords = drawnPedestrianNodes.map(n => [n.lng, n.lat]);
      newFeatures.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: pedCoords },
        properties: { layer: 'PEDESTRIAN_ROUTE', motGroup: 'PEDESTRIAN_ROUTE', color: '#10B981', lengthMeters: 80 }
      });
    }

    // 5. Custom Text Labels (Annotations & Stationing)
    if (customTextLabels && customTextLabels.length > 0) {
      customTextLabels.forEach(lbl => {
        newFeatures.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [lbl.lng, lbl.lat] },
          properties: {
            layer: 'ANNOTATIONS_AND_LABELS',
            motGroup: 'ANNOTATION_GUIDES',
            color: '#38BDF8',
            text: lbl.text,
            label: lbl.text,
            isAnnotationText: true
          }
        });
      });
    }

    const updatedGeojson = {
      type: 'FeatureCollection',
      features: [...(dwgData?.geojson?.features || []), ...newFeatures]
    };

    const firstNode = drawnSiteNodes[0] || drawnTransitionNodes[0] || drawnBarrierNodes[0] || { lat: anchorLat, lng: anchorLng };
    const newDwgData = {
      ...(dwgData || {}),
      geojson: updatedGeojson,
      centerLatLng: [firstNode.lat, firstNode.lng],
      fileName: dwgData?.fileName || 'Custom_Detour_Site.dxf'
    };

    setDwgData(newDwgData);
    setIsMultiLayerDrawingMode(false);
    if (onCadParsed) onCadParsed(newDwgData);
  };

  // Export AutoCAD DXF File (Opens centered on project with 100% CAD compatibility)
  const handleExportCadDxf = async () => {
    try {
      const res = await fetch('/api/cad/export-6node-dxf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodes: drawnSiteNodes,
          detourNodes: drawnTransitionNodes,
          pedestrianNodes: drawnPedestrianNodes,
          barrierNodes: drawnBarrierNodes,
          barrierType: selectedBarrierType,
          placedElements,
          labels: customTextLabels,
          projectName: roadName || 'Amanah Detour Site',
          lat: anchorLat,
          lng: anchorLng,
          editorUser: 'Amanah Certified Safety Engineer'
        })
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Amanah_Detour_Site_${Date.now()}.dxf`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error('Error exporting CAD DXF:', e);
    }
  };

  // Export Watermarked CAD with Official Digital Signature
  const handleExportWatermarkedCad = async () => {
    if (!dwgData?.geojson) {
      alert(isAr ? 'لا توجد بيانات كاد متاحة للتصدير' : 'No CAD data available for export');
      return;
    }
    setIsWatermarking(true);
    try {
      // Ensure any customTextLabels not yet committed are included in geojson export
      const exportGeojson = JSON.parse(JSON.stringify(dwgData.geojson));
      if (customTextLabels && customTextLabels.length > 0) {
        customTextLabels.forEach(lbl => {
          const alreadyExists = exportGeojson.features.some(
            f => f.properties?.text === lbl.text &&
                 Math.abs(f.geometry?.coordinates?.[0] - lbl.lng) < 0.00001 &&
                 Math.abs(f.geometry?.coordinates?.[1] - lbl.lat) < 0.00001
          );
          if (!alreadyExists) {
            exportGeojson.features.push({
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [lbl.lng, lbl.lat] },
              properties: {
                layer: 'ANNOTATIONS_AND_LABELS',
                motGroup: 'ANNOTATION_GUIDES',
                color: '#38BDF8',
                text: lbl.text,
                label: lbl.text,
                isAnnotationText: true
              }
            });
          }
        });
      }

      const res = await fetch('/api/cad/export-watermarked', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          geojson: exportGeojson,
          placedElements,
          labels: customTextLabels,
          projectName: roadName || 'Amanah Madinah Detour',
          lat: anchorLat,
          lng: anchorLng,
          editorUser: 'Authorized Safety Engineer'
        })
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Watermarked_Platform_CAD_${Date.now()}.dxf`;
        a.click();
        window.URL.revokeObjectURL(url);

        await fetch('/api/cad/save-version', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            versionType: 'edited',
            fileName: dwgData.fileName || 'Detour_Blueprint.dxf',
            geojson: dwgData.geojson,
            placedElements,
            editorNotes: 'Exported with official platform digital signature and watermark'
          })
        });
        alert(isAr ? 'تم تصدير وحفظ ملف الكاد الموثق رسمياً بنجاح!' : 'Certified AutoCAD blueprint exported and saved successfully!');
      }
    } catch (e) {
      console.error('Error exporting watermarked CAD:', e);
    } finally {
      setIsWatermarking(false);
    }
  };

  // Toggle between Original uploaded CAD and Platform Edited Version
  const handleToggleVersion = (type) => {
    setActiveVersionType(type);
    if (type === 'original' && originalDwgData) {
      setDwgData(JSON.parse(JSON.stringify(originalDwgData)));
    } else if (type === 'edited' && historyStack.length > 0) {
      const latest = historyStack[historyStack.length - 1];
      setDwgData(prev => prev ? ({ ...prev, geojson: JSON.parse(JSON.stringify(latest)) }) : null);
    }
  };

  // Sync preloaded DWG data when passed or reset
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
    } else {
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
      setShowControlNodes(false);
      setSelectedEditFeatureIdx(null);
    }
  }, [preloadedDwgData, anchorLat]);

  // Auto-extract sign markers (STOP signs, etc.) from CAD geometric entities & detected signs
  useEffect(() => {
    if (!dwgData) return;

    if (dwgData.detectedMotSigns?.length > 0) {
      setPlacedElements(prev => {
        const merged = [...dwgData.detectedMotSigns];
        prev.forEach(p => {
          if (!merged.some(m => Math.hypot(m.lat - p.lat, m.lng - p.lng) < 0.00005)) {
            merged.push(p);
          }
        });
        return merged;
      });
    }

    if (!dwgData.geojson?.features) return;
    const signFeatures = dwgData.geojson.features.filter(isSignFeature);
    if (signFeatures.length === 0) return;

    setPlacedElements(prev => {
      const existing = [...prev];
      signFeatures.forEach((sf, idx) => {
        let centroid = null;
        if (sf.geometry?.type === 'Point') {
          centroid = sf.geometry.coordinates;
        } else if (sf.geometry?.type === 'Polygon') {
          const ring = sf.geometry.coordinates[0] || [];
          if (ring.length > 0) {
            const avgLng = ring.reduce((sum, c) => sum + c[0], 0) / ring.length;
            const avgLat = ring.reduce((sum, c) => sum + c[1], 0) / ring.length;
            centroid = [avgLng, avgLat];
          }
        } else if (sf.geometry?.type === 'LineString') {
          const pts = sf.geometry.coordinates || [];
          if (pts.length > 0) {
            const avgLng = pts.reduce((sum, c) => sum + c[0], 0) / pts.length;
            const avgLat = pts.reduce((sum, c) => sum + c[1], 0) / pts.length;
            centroid = [avgLng, avgLat];
          }
        }

        if (centroid) {
          const [lng, lat] = centroid;
          const exists = existing.some(el => Math.hypot(el.lat - lat, el.lng - lng) < 0.00005);
          if (!exists) {
            const text = (sf.properties?.text || '').toUpperCase();
            let type = 'stop_sign';
            let labelAr = 'لوحة قف (STOP)';

            if (text.includes('SLOW') || text.includes('تمهل')) {
              type = 'slow_sign';
              labelAr = 'لوحة تمهل (SLOW)';
            } else if (text.includes('50')) {
              type = 'speed_limit_50';
              labelAr = 'تحديد سرعة ٥٠';
            }

            existing.push({
              id: `cad_sign_${Date.now()}_${idx}`,
              type,
              lat,
              lng,
              rotation: sf.properties?.rotationDeg || 0,
              labelAr
            });
          }
        }
      });
      return existing;
    });
  }, [dwgData?.geojson]);

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

      const preset = BASEMAP_PRESETS[activeBasemap] || BASEMAP_PRESETS.esri_satellite;
      const tileOpts = {
        maxZoom: preset.maxZoom,
        maxNativeZoom: preset.maxNativeZoom,
        subdomains: preset.subdomains
      };
      if (preset.tileSize) { tileOpts.tileSize = preset.tileSize; }
      baseTileLayerRef.current = createEsriTileLayer(tileOpts).addTo(map);

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
    const preset = BASEMAP_PRESETS[key] || BASEMAP_PRESETS.esri_satellite;
    const tileOpts = {
      maxZoom: preset.maxZoom,
      maxNativeZoom: preset.maxNativeZoom,
      subdomains: preset.subdomains
    };
    if (preset.tileSize) { tileOpts.tileSize = preset.tileSize; }
    if (preset.zoomOffset !== undefined) { tileOpts.zoomOffset = preset.zoomOffset; }
    baseTileLayerRef.current = createEsriTileLayer(tileOpts).addTo(mapInstanceRef.current);
  };

  // ── 3. Smart Auto-Alignment Trigger ──
  const handleSmartAutoAlign = useCallback(() => {
    if (hasImportedCad) {
      if (dwgData?.autoAlignment?.hasControlPoints) {
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
    } else {
      // ── SNAP DRAWN CONTROL NODES TO STREET AXIS (Drawing Mode) ──
      const centerLat = anchorLat || 24.4686;
      const centerLng = anchorLng || 39.6120;
      const cosLat = Math.cos(centerLat * Math.PI / 180);
      
      // Default street orientation angle for Madinah corridors (~40 degrees)
      const roadAngleRad = (40 * Math.PI) / 180;
      const halfLenM = 30; // 60m total length
      const halfWidthM = 6; // 12m width
      
      // Vector along road (length) and perpendicular (width)
      const dxL = (Math.cos(roadAngleRad) * halfLenM) / (111320 * cosLat);
      const dyL = (Math.sin(roadAngleRad) * halfLenM) / 110574.61;
      const dxW = (-Math.sin(roadAngleRad) * halfWidthM) / (111320 * cosLat);
      const dyW = (Math.cos(roadAngleRad) * halfWidthM) / 110574.61;

      const snappedS1 = { id: 'S1', lat: centerLat + dyL + dyW, lng: centerLng + dxL + dxW, x: Math.round(582500 + dxL * 100000), y: Math.round(2703800 + dyL * 110000) };
      const snappedS2 = { id: 'S2', lat: centerLat + dyL - dyW, lng: centerLng + dxL - dxW, x: Math.round(582500 + dxL * 100000), y: Math.round(2703800 + dyL * 110000) };
      const snappedS3 = { id: 'S3', lat: centerLat - dyL - dyW, lng: centerLng - dxL - dxW, x: Math.round(582500 - dxL * 100000), y: Math.round(2703800 - dyL * 110000) };
      const snappedS4 = { id: 'S4', lat: centerLat - dyL + dyW, lng: centerLng - dxL + dxW, x: Math.round(582500 - dxL * 100000), y: Math.round(2703800 - dyL * 110000) };

      setDrawnSiteNodes([snappedS1, snappedS2, snappedS3, snappedS4]);
      setShowControlNodes(true);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([centerLat, centerLng], 18, { animate: true });
      }
    }
  }, [hasImportedCad, dwgData, anchorLat, anchorLng]);

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

        // Hide raw CAD sign geometry if replaced by MOT markers (e.g. STOP signs, SLOW signs, etc.)
        if (
          isSignFeature(f) ||
          props.layer?.toUpperCase().includes('SIGN') ||
          props.keymapId === 'signage' ||
          props.isTrafficSign ||
          props.motType ||
          (props.isBlockChild && (isSignFeature(f) || props.colorIndex === 1 || props.colorIndex === 2)) ||
          (props.isShortLine && props.isBlockChild)
        ) {
          return false;
        }

        if (props.text) {
          if (!showLabels) return false;
          const functionalType = getFeatureFunctionalType(f);
          if (functionalType === 'SAFETY_BUFFER' && keymapVisibility.SAFETY_BUFFER === false) return false;
          if (functionalType === 'DETOUR_TAPER' && keymapVisibility.DETOUR_TAPER === false) return false;
          if (functionalType === 'ROAD_BOUNDARY' && keymapVisibility.ROAD_BOUNDARY === false) return false;
          if (functionalType === 'PEDESTRIAN_ROUTE' && keymapVisibility.PEDESTRIAN_ROUTE === false) return false;
          return true;
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
          // If labels are toggled off by the user, suppress text badges
          if (!showLabels) {
            return window.L.circleMarker(latlng, { radius: 0, opacity: 0, fillOpacity: 0 });
          }
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
                  font-size: 9.5px;
                  font-weight: 900;
                  white-space: nowrap;
                  line-height: 1.2;
                  transform: rotate(${-rot}deg);
                  transform-origin: center;
                  text-shadow: 0 0 4px #000;
                  padding: 2px 5px;
                  border-radius: 4px;
                  background: rgba(15, 23, 42, 0.92);
                  border: 1px solid #0284c7;
                  box-shadow: 0 2px 6px rgba(0,0,0,0.5);
                  display: inline-flex;
                  align-items: center;
                  gap: 3px;
                ">
                  <span>📍</span>
                  <span>${rawText}</span>
                </div>`,
                iconSize: [110, 20],
                iconAnchor: [55, 10]
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
                  font-size: 9.5px;
                  font-weight: 900;
                  line-height: 1.2;
                  transform: rotate(${-rot}deg);
                  transform-origin: center;
                  padding: 1.5px 5px;
                  border-radius: 3px;
                  background: #0f172a;
                  border: 1.5px solid #ffffff;
                  box-shadow: 0 2px 5px rgba(0,0,0,0.6);
                ">
                  [ ${rawText} ]
                </div>`,
                iconSize: [28, 18],
                iconAnchor: [14, 9]
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
                  font-size: 9px;
                  font-weight: 800;
                  white-space: nowrap;
                  line-height: 1.2;
                  transform: rotate(${-rot}deg);
                  transform-origin: center;
                  text-shadow: 0 0 3px #000;
                  padding: 1.5px 5px;
                  border-radius: 3px;
                  background: rgba(15, 23, 42, 0.90);
                  border: 1px solid #f59e0b;
                  box-shadow: 0 2px 6px rgba(0,0,0,0.5);
                  display: inline-flex;
                  align-items: center;
                  gap: 3px;
                ">
                  <span style="font-size:8px;">📐</span>
                  <span>${rawText}</span>
                </div>`,
                iconSize: [100, 18],
                iconAnchor: [50, 9]
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
                font-size: 9px;
                font-weight: 800;
                white-space: nowrap;
                line-height: 1.2;
                transform: rotate(${-rot}deg);
                transform-origin: center;
                text-shadow: 0 0 3px #000;
                padding: 1.5px 5px;
                border-radius: 3px;
                background: rgba(15, 23, 42, 0.88);
                border: 1px solid ${groupDef.color}80;
                display: inline-flex;
                align-items: center;
                gap: 3px;
              ">
                <span style="font-size: 8px;">${groupDef.icon}</span>
                <span>${rawText}</span>
              </div>`,
              iconSize: [110, 18],
              iconAnchor: [55, 9]
            })
          });
        }

        // Suppress empty/meaningless point markers so they don't leave stray dots
        return window.L.circleMarker(latlng, {
          pane: 'cadVectorPane',
          radius: 0,
          opacity: 0,
          fillOpacity: 0
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
  }, [mapReady, dwgData, keymapVisibility, showLabels, alignOffsetX, alignOffsetY, cadRotationDeg, isLocked, anchorLat, anchorLng, isAr]);

  // ── Helper: Classify lines for 6-Node Control Point Editing (RED, YELLOW, BLUE only; NEVER WHITE) ──
  const getLineTargetCategory = useCallback((feature) => {
    if (!feature || !feature.geometry) return null;
    const p = feature.properties || {};
    const functionalType = getFeatureFunctionalType(feature);
    const col = (p.color || '').toUpperCase();
    const layer = (p.layer || '').toUpperCase();
    const colorIndex = p.colorIndex;

    // ❌ EXCLUDE white lines, leaders, centerlines, annotations, and pedestrian routes
    if (p.isLeaderLine || functionalType === 'CENTERLINE_AXIS' || functionalType === 'ANNOTATION_GUIDES' || functionalType === 'PEDESTRIAN_ROUTE') {
      return null;
    }
    if (col === '#FFFFFF' || col === '#FFF' || col === '#F8FAFC' || col === '#E2E8F0' || col === '#CBD5E1' || col === '#94A3B8' || colorIndex === 7 || colorIndex === 256 || colorIndex === 8 || colorIndex === 9) {
      return null;
    }

    // 🔴 1. RED LINES (Detour taper / Transition zones)
    if (functionalType === 'DETOUR_TAPER' ||
        colorIndex === 1 || colorIndex === 10 || colorIndex === 200 || colorIndex === 240 ||
        col === '#EF4444' || col === '#FF0000' || col === '#DC2626' || col === '#B91C1C' ||
        layer.includes('TAPER') || layer.includes('DETOUR') || layer.includes('انتقال')) {
      return 'red';
    }

    // 🟡 2. YELLOW / AMBER LINES (Work Zone / Safety Buffer / Trench)
    if (functionalType === 'SAFETY_BUFFER' ||
        colorIndex === 2 || colorIndex === 40 || colorIndex === 50 ||
        col === '#FFFF00' || col === '#F59E0B' || col === '#FACC15' || col === '#EAB308' || col === '#FFD700' ||
        layer.includes('عمل') || layer.includes('WORK') || layer.includes('TRENCH') || layer.includes('BUFFER')) {
      return 'yellow';
    }

    // 🔵 3. BLUE / CYAN LINES (Road Boundary / Planning Limits)
    if (functionalType === 'ROAD_BOUNDARY' ||
        colorIndex === 4 || colorIndex === 5 || colorIndex === 130 || colorIndex === 140 || colorIndex === 150 ||
        col === '#06B6D4' || col === '#3B82F6' || col === '#0284C7' || col === '#00FFFF' || col === '#0000FF' ||
        layer.includes('BOUND') || layer.includes('ROAD') || layer.includes('REG') || layer.includes('تنظيم')) {
      return 'blue';
    }

    return null;
  }, []);

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

    // ── 1. Find the ACTUAL Yellow CAD Line ("منطقة عمل" / Work Zone) (Excluding signs) ──
    const yellowWorkFeatures = allFeatures.filter(f => {
      if (isSignFeature(f)) return false;
      const p = f.properties || {};
      const col = (p.color || '').toUpperCase();
      const layer = (p.layer || '').toUpperCase();
      const isYellow = p.colorIndex === 2 || col === '#FFFF00' || col === '#FFD700' || col === '#FFD600';
      const isWorkLayer = layer.includes('عمل') || layer.includes('WORK') || layer.includes('TRENCH') || layer.includes('60');
      return (isYellow || isWorkLayer) && (f.geometry?.type === 'LineString' || f.geometry?.type === 'Polygon');
    });

    // ── 2. Find the ACTUAL Red CAD Taper Lines ("المنطقة الانتقالية" / Transition Zone) (Excluding signs) ──
    const redTaperFeatures = allFeatures.filter(f => {
      if (isSignFeature(f)) return false;
      const p = f.properties || {};
      const col = (p.color || '').toUpperCase();
      const layer = (p.layer || '').toUpperCase();
      const isRed = p.colorIndex === 1 || col === '#FF0000' || col === '#EF4444' || col === '#DC2626';
      const isTaperLayer = layer.includes('انتقال') || layer.includes('TAPER') || layer.includes('DETOUR') || layer.includes('50') || layer.includes('180');
      return (isRed || isTaperLayer) && (f.geometry?.type === 'LineString' || f.geometry?.type === 'Polygon');
    });

    // ── 3. Render Shaded Corridor along the Actual Yellow Line ("منطقة عمل") without Self-Intersection ──
    if (keymapVisibility.SAFETY_BUFFER !== false && yellowWorkFeatures.length > 0) {
      let longestYellowMidPoint = null;
      let maxYellowPts = -1;

      yellowWorkFeatures.forEach((feat) => {
        const rawCoords = feat.geometry?.type === 'Polygon' ? feat.geometry.coordinates[0] : feat.geometry.coordinates;
        if (!rawCoords || rawCoords.length < 2) return;

        const shifted = rawCoords.map(c => transformPoint(c[1], c[0]));
        if (shifted.length > maxYellowPts) {
          maxYellowPts = shifted.length;
          longestYellowMidPoint = shifted[Math.floor(shifted.length / 2)];
        }

        // Primary vivid yellow CAD line
        window.L.polyline(shifted, {
          color: '#FACC15',
          weight: 6,
          opacity: 1.0,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(layerGroup);

        // Non-collapsing corridor polygon around the yellow line (4.2m width)
        const leftSide = [];
        const rightSide = [];
        const halfWidthMeters = 2.1;

        for (let i = 0; i < shifted.length - 1; i++) {
          const p1 = shifted[i];
          const p2 = shifted[i + 1];
          const dy = (p2[0] - p1[0]) * 110574.61;
          const dx = (p2[1] - p1[1]) * (111320 * cosLat);
          const len = Math.hypot(dx, dy);
          if (len < 0.2) continue;

          const nx = (-dy / len) * halfWidthMeters * mToLng;
          const ny = (dx / len) * halfWidthMeters * mToLat;

          if (i === 0) {
            leftSide.push([p1[0] + ny, p1[1] + nx]);
            rightSide.push([p1[0] - ny, p1[1] - nx]);
          }
          leftSide.push([p2[0] + ny, p2[1] + nx]);
          rightSide.push([p2[0] - ny, p2[1] - nx]);
        }

        if (leftSide.length >= 2 && rightSide.length >= 2) {
          const corridorPolygon = [...leftSide, ...rightSide.reverse()];
          window.L.polygon(corridorPolygon, {
            color: '#F59E0B',
            weight: 2.5,
            opacity: 0.95,
            fillColor: '#F59E0B',
            fillOpacity: 0.32,
            dashArray: '5, 5'
          }).addTo(layerGroup);
        }
      });

      // Place exactly ONE consolidated badge for the entire Work Zone (if showLabels is true)
      if (showLabels && longestYellowMidPoint) {
        window.L.marker(longestYellowMidPoint, {
          icon: window.L.divIcon({
            className: 'zone-sketch-badge',
            html: `<div style="
              background: rgba(245, 158, 11, 0.92);
              color: #ffffff;
              font-family: system-ui, sans-serif;
              font-size: 9.5px;
              font-weight: 800;
              padding: 2px 6px;
              border-radius: 4px;
              border: 1px solid #ffffff;
              box-shadow: 0 2px 8px rgba(0,0,0,0.5);
              white-space: nowrap;
              display: inline-flex;
              align-items: center;
              gap: 3px;
            ">
              <span>🚧</span>
              <span>${isAr ? 'منطقة العمل (60M)' : 'Work Zone (60M)'}</span>
            </div>`,
            iconSize: [115, 20],
            iconAnchor: [58, 10]
          })
        }).addTo(layerGroup);
      }
    }

    // ── 4. Render Shaded Corridor along the Actual Red Lines ("المنطقة الانتقالية") ──
    if (keymapVisibility.DETOUR_TAPER !== false && redTaperFeatures.length > 0) {
      let longestRedMidPoint = null;
      let maxRedPts = -1;

      redTaperFeatures.forEach((feat) => {
        const rawCoords = feat.geometry?.type === 'Polygon' ? feat.geometry.coordinates[0] : feat.geometry.coordinates;
        if (!rawCoords || rawCoords.length < 2) return;

        const shifted = rawCoords.map(c => transformPoint(c[1], c[0]));
        if (shifted.length > maxRedPts) {
          maxRedPts = shifted.length;
          longestRedMidPoint = shifted[Math.floor(shifted.length / 2)];
        }

        window.L.polyline(shifted, {
          color: '#EF4444',
          weight: 4.5,
          opacity: 1.0,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(layerGroup);
      });

      // Place exactly ONE consolidated badge for the entire Transition Zone (if showLabels is true)
      if (showLabels && longestRedMidPoint) {
        window.L.marker(longestRedMidPoint, {
          icon: window.L.divIcon({
            className: 'zone-sketch-badge',
            html: `<div style="
              background: rgba(239, 68, 68, 0.92);
              color: #ffffff;
              font-family: system-ui, sans-serif;
              font-size: 9.5px;
              font-weight: 800;
              padding: 2px 6px;
              border-radius: 4px;
              border: 1px solid #ffffff;
              box-shadow: 0 2px 8px rgba(0,0,0,0.5);
              white-space: nowrap;
              display: inline-flex;
              align-items: center;
              gap: 3px;
            ">
              <span>📐</span>
              <span>${isAr ? 'المنطقة الانتقالية (50M / 180M)' : 'Transition Zone (50M / 180M)'}</span>
            </div>`,
            iconSize: [125, 20],
            iconAnchor: [62, 10]
          })
        }).addTo(layerGroup);
      }
    }

    layerGroup.addTo(mapInstanceRef.current);
    workZoneLayerRef.current = layerGroup;
  }, [mapReady, dwgData, showWorkZoneCorridor, showLabels, keymapVisibility, alignOffsetX, alignOffsetY, cadRotationDeg, anchorLat, anchorLng, isAr]);

  // ── 4c. Render 6 Equidistant Draggable Control Nodes on RED, YELLOW, BLUE CAD Lines ONLY (No White Lines) ──
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clean up previous control nodes
    if (controlNodesLayerRef.current) {
      mapInstanceRef.current.removeLayer(controlNodesLayerRef.current);
      controlNodesLayerRef.current = null;
    }

    if (!showControlNodes || !dwgData?.geojson?.features) return;

    const nodesGroup = window.L.layerGroup();
    const originLat = dwgData.centerLatLng ? dwgData.centerLatLng[0] : anchorLat;
    const originLng = dwgData.centerLatLng ? dwgData.centerLatLng[1] : anchorLng;
    const cosLat = Math.cos(originLat * Math.PI / 180);
    const dLat = alignOffsetY / 110574.61;
    const dLng = alignOffsetX / (111320 * cosLat);
    const rotRad = (cadRotationDeg * Math.PI) / 180;

    // Shift [lng, lat] coord from raw CAD space to display space
    const shiftCoord = (c) => {
      let lng = c[0] + dLng;
      let lat = c[1] + dLat;
      if (rotRad !== 0) {
        const dx = (lng - originLng) * cosLat;
        const dy = lat - originLat;
        const cosR = Math.cos(rotRad);
        const sinR = Math.sin(rotRad);
        lng = originLng + (dx * cosR - dy * sinR) / cosLat;
        lat = originLat + dx * sinR + dy * cosR;
      }
      return [lng, lat];
    };

    // Cumulative arc-lengths in METERS along a [lng,lat][] array
    const computeArcLengths = (coords) => {
      const d = [0];
      for (let i = 1; i < coords.length; i++) {
        const dx = (coords[i][0] - coords[i - 1][0]) * (111320 * cosLat);
        const dy = (coords[i][1] - coords[i - 1][1]) * 110574.61;
        d.push(d[i - 1] + Math.hypot(dx, dy));
      }
      return d;
    };

    // Interpolate [lng, lat] at targetDist along polyline
    const interpolateAt = (coords, arcLen, targetDist) => {
      for (let i = 1; i < coords.length; i++) {
        if (arcLen[i] >= targetDist) {
          const segLen = arcLen[i] - arcLen[i - 1];
          const t = segLen > 0 ? (targetDist - arcLen[i - 1]) / segLen : 0;
          return {
            lng: coords[i - 1][0] + t * (coords[i][0] - coords[i - 1][0]),
            lat: coords[i - 1][1] + t * (coords[i][1] - coords[i - 1][1]),
            segIndex: i - 1,
            fraction: targetDist / (arcLen[arcLen.length - 1] || 1)
          };
        }
      }
      const last = coords[coords.length - 1];
      return { lng: last[0], lat: last[1], segIndex: coords.length - 2, fraction: 1 };
    };

    const NUM_NODES = 6;
    let nodeCount = 0;

    dwgData.geojson.features.forEach((feature, featureIdx) => {
      // 🎯 FILTER: ONLY Red, Yellow, and Blue lines get control nodes! (White lines are ignored)
      const targetCategory = getLineTargetCategory(feature);
      if (!targetCategory) return;

      const fnType = getFeatureFunctionalType(feature);
      if (keymapVisibility[fnType] === false) return; // ❌ HIDE nodes immediately when line is hidden in keymap!
      if (targetCategory === 'yellow' && keymapVisibility.SAFETY_BUFFER === false) return;
      if (targetCategory === 'red' && keymapVisibility.DETOUR_TAPER === false) return;
      if (targetCategory === 'blue' && keymapVisibility.ROAD_BOUNDARY === false) return;

      const p = feature.properties || {};
      if (isSignFeature(feature) || p.isBlockChild || p.isShortLine || p.isTrafficSign || p.motType) {
        return; // ❌ DO NOT attach nodes to signs, block children, or short lines!
      }

      const geom = feature.geometry;
      if (!geom) return;

      let rawCoords = null;
      if (geom.type === 'LineString') rawCoords = geom.coordinates;
      else if (geom.type === 'Polygon') rawCoords = geom.coordinates?.[0];
      if (!rawCoords || rawCoords.length < 2) return;

      // Apply alignment shift
      const shifted = rawCoords.map(c => shiftCoord(c));
      const arcLen = computeArcLengths(shifted);
      const totalLen = arcLen[arcLen.length - 1];
      if (totalLen < 5.0) return; // ❌ ONLY long lines (>= 5.0 meters) get control nodes! Skip short stubs and micro lines!

      // 6 evenly-spaced positions
      const nodes = [];
      if (shifted.length === NUM_NODES) {
        // Line has already been partitioned into exactly 6 nodes -> direct 1:1 mapping
        for (let n = 0; n < NUM_NODES; n++) {
          nodes.push({
            lng: shifted[n][0],
            lat: shifted[n][1],
            nodeIndex: n,
            fraction: n / (NUM_NODES - 1)
          });
        }
      } else {
        // First-time line: sample 6 equidistant points along the line
        for (let n = 0; n < NUM_NODES; n++) {
          const frac = n / (NUM_NODES - 1);
          nodes.push({ ...interpolateAt(shifted, arcLen, frac * totalLen), nodeIndex: n });
        }
      }

      // Draw nodes with color coded to category
      nodes.forEach((pos) => {
        const isEnd = pos.nodeIndex === 0 || pos.nodeIndex === NUM_NODES - 1;
        const size = isEnd ? 14 : 11;

        let bg = '#2563eb';
        let border = '#93c5fd';
        let glow = 'rgba(37,99,235,0.7)';

        if (targetCategory === 'red') {
          bg = isEnd ? '#ef4444' : '#f87171';
          border = isEnd ? '#fca5a5' : '#fecaca';
          glow = 'rgba(239,68,68,0.8)';
        } else if (targetCategory === 'yellow') {
          bg = isEnd ? '#eab308' : '#facc15';
          border = isEnd ? '#fef08a' : '#fef9c3';
          glow = 'rgba(234,179,8,0.8)';
        } else if (targetCategory === 'blue') {
          bg = isEnd ? '#0284c7' : '#38bdf8';
          border = isEnd ? '#bae6fd' : '#e0f2fe';
          glow = 'rgba(2,132,199,0.8)';
        }

        const marker = window.L.marker([pos.lat, pos.lng], {
          draggable: !isLocked,
          pane: 'cadMarkerPane',
          zIndexOffset: isEnd ? 3500 : 3000,
          icon: window.L.divIcon({
            className: 'cad-control-node-marker',
            html: `<div style="
              width:${size}px;
              height:${size}px;
              border-radius:50%;
              background:${bg};
              border:2.5px solid ${border};
              box-shadow:0 0 8px ${glow},0 2px 8px rgba(0,0,0,0.6);
              cursor:${isLocked ? 'not-allowed' : 'grab'};
              box-sizing:border-box;
            "></div>`,
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2]
          })
        });

        marker.on('click', () => {
          setSelectedEditFeatureIdx(prev => prev === featureIdx ? null : featureIdx);
        });

        if (!isLocked) {
          marker.on('dragstart', (e) => {
            if (e.target.getElement()) e.target.getElement().style.cursor = 'grabbing';
            setSelectedEditFeatureIdx(featureIdx);
            // Snapshot current state for Revert/Forward (Undo/Redo)
            dragSnapshotRef.current = JSON.parse(JSON.stringify(dwgData.geojson));
          });

          marker.on('dragend', (e) => {
            if (e.target.getElement()) e.target.getElement().style.cursor = 'grab';
            const { lat: newLat, lng: newLng } = e.target.getLatLng();

            // Reverse alignment shift to get raw CAD coord
            let rLng = newLng;
            let rLat = newLat;
            if (rotRad !== 0) {
              const dx = (rLng - originLng) * cosLat;
              const dy = rLat - originLat;
              const cosR = Math.cos(-rotRad);
              const sinR = Math.sin(-rotRad);
              rLng = originLng + (dx * cosR - dy * sinR) / cosLat;
              rLat = originLat + dx * sinR + dy * cosR;
            }
            rLng -= dLng;
            rLat -= dLat;

            // Push to Undo/Redo history stack
            if (dragSnapshotRef.current) {
              setHistoryStack(hist => {
                const trimmed = hist.slice(0, historyIndex + 1);
                return [...trimmed, dragSnapshotRef.current];
              });
              setHistoryIndex(idx => idx + 1);
              dragSnapshotRef.current = null;
            }

            setDwgData(prev => {
              if (!prev?.geojson?.features?.[featureIdx]) return prev;
              const next = JSON.parse(JSON.stringify(prev));
              const feat = next.geojson.features[featureIdx];
              let coords = feat.geometry.type === 'Polygon'
                ? feat.geometry.coordinates[0]
                : feat.geometry.coordinates;

              // If geometry does not yet have exactly NUM_NODES vertices, resample it cleanly
              if (coords.length !== NUM_NODES) {
                const al = computeArcLengths(coords);
                const total = al[al.length - 1] || 1;
                const resampled = [];
                for (let i = 0; i < NUM_NODES; i++) {
                  const pt = interpolateAt(coords, al, (i / (NUM_NODES - 1)) * total);
                  resampled.push([pt.lng, pt.lat]);
                }
                coords = resampled;
              }

              // Directly update the exact vertex corresponding to the dragged control node
              coords[pos.nodeIndex] = [rLng, rLat];

              if (feat.geometry.type === 'Polygon') feat.geometry.coordinates[0] = coords;
              else feat.geometry.coordinates = coords;
              return next;
            });
          });
        }

        marker.addTo(nodesGroup);
        nodeCount++;
      });
    });

    nodesGroup.addTo(mapInstanceRef.current);
    controlNodesLayerRef.current = nodesGroup;
  }, [mapReady, dwgData, showControlNodes, keymapVisibility, getLineTargetCategory, historyIndex, alignOffsetX, alignOffsetY, cadRotationDeg, isLocked, anchorLat, anchorLng, isAr]);

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
  }, [mapReady, placedElements, selectedElementId, isAr]);

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

      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
        if (data.centerLatLng) {
          mapInstanceRef.current.setView(data.centerLatLng, 18, { animate: true });
        }
      }

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

      if (onCadParsed) {
        onCadParsed(data.extractedInfo, data, file.name);
      }
    } catch (err) {
      console.error('CAD Upload Error:', err);
      setErrorMessage(err.message || 'Error processing CAD file');
      setUploadStatus('error');
    }
  }, [anchorLat, anchorLng, parseCadInBrowser, isAr, onCadParsed]);

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
    setShowControlNodes(false);
    setSelectedEditFeatureIdx(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (onCadReset) {
      onCadReset();
    }
  }, [onCadReset]);

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
      {/* ── Empty State / Dual Mode: Direct Interactive Drawing OR Blueprint Upload ── */}
      {!isMapActive && (
        <div className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".dwg,.dxf"
            onChange={handleFileInput}
            className="hidden"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Direct Interactive Site Drawing & Multi-Layer CAD Generator */}
            <div
              onClick={handleStartDirectDrawing}
              className="group bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/70 border-2 border-amber-500/40 hover:border-amber-400 rounded-2xl p-6 text-white text-center cursor-pointer transition-all shadow-lg hover:shadow-amber-500/20 hover:-translate-y-0.5 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center mx-auto text-amber-300 group-hover:scale-110 transition-transform">
                  <PenTool className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-200">
                    {isAr ? '✏️ التخطيط والرسم المباشر على الخريطة (بدون ملف)' : '✏️ Direct Interactive Site Drawing (No CAD Needed)'}
                  </h4>
                  <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                    {isAr
                      ? 'افتح الخريطة فوراً وارسم حدود الموقع (أصفر 🟡)، مسار التحويلة (أحمر 🔴)، وممر المشاة (أخضر 🟢)، مع إمكانية التراجع وحذف أي نقطة وتصدير كاد معتمد.'
                      : 'Open satellite map instantly to draw Site Boundary (Yellow 🟡), Detour Transition (Red 🔴), and Pedestrian Route (Green 🟢) with node-level undo & certified CAD export.'}
                  </p>
                </div>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-center gap-2 text-xs font-bold text-amber-400 group-hover:text-amber-200">
                <span>{isAr ? 'فتح الخريطة والبدء بالرسم المباشر ⚡' : 'Start Direct Drawing on Map ⚡'}</span>
                <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
              </div>
            </div>

            {/* 2. Drag & Drop Existing Blueprint Upload */}
            <div
              className="border-2 border-dashed border-slate-300 hover:border-brand-primary bg-slate-50 hover:bg-brand-primary/5 rounded-2xl p-6 text-center cursor-pointer transition-all shadow-xs flex flex-col justify-between"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 border border-brand-primary/30 flex items-center justify-center mx-auto text-brand-primary">
                  <Upload className="h-6 w-6 animate-bounce" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">
                    {isAr ? '📁 رفع واستيراد مخطط CAD (DWG / DXF)' : '📁 Upload CAD Blueprint (DWG / DXF)'}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                    {isAr
                      ? 'اسحب وأفلت مخطط أوتوكاد جاهز لتحليله داخل المتصفح، استخراج الحارات الإنشائية، والتحقق الجغرافي UTM 37N.'
                      : 'Drag & drop your AutoCAD file for in-browser Proj4 coordinate parsing and layer ingestion.'}
                  </p>
                </div>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-200 flex items-center justify-center gap-2 text-xs font-bold text-brand-primary">
                <span>{isAr ? 'تصفح ملفات الجهاز 📁' : 'Browse Local Files 📁'}</span>
              </div>
            </div>
          </div>
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
                    <option value="esri_satellite">{isAr ? '🌍 قمر صناعي نقي عالي الدقة (ESRI World Imagery)' : '🌍 ESRI World Imagery (Pure Satellite)'}</option>
                  </select>
                </div>

                {dwgData && (
                  <span className="bg-slate-900 text-cyan-300 border border-cyan-800/50 px-2.5 py-1 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5">
                    <span>📐 {dwgData.fileName}</span>
                    <span className="text-slate-500">•</span>
                    <span>{dwgData.totalFeatures || dwgData.geojson?.features?.length || 0} {isAr ? 'عنصر' : 'features'}</span>
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
                {/* 🛡️ EXPORT WATERMARKED SIGNED CAD BUTTON */}
                <button
                  type="button"
                  onClick={handleExportWatermarkedCad}
                  disabled={isWatermarking || !dwgData?.geojson}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow transition active:scale-95 border border-blue-500/40 cursor-pointer"
                  title={isAr ? 'تصدير مخطط كاد أوتوكاد مع ختم وتوقيع رقمي موثق' : 'Export certified AutoCAD blueprint with watermark'}
                >
                  <Award className="h-3.5 w-3.5 text-brand-gold" />
                  <span>{isAr ? (isWatermarking ? 'جاري التوثيق...' : 'تصدير كاد موثق 🛡️') : (isWatermarking ? 'Signing...' : 'Export Certified CAD 🛡️')}</span>
                </button>

                {/* CAD Version Selector Pill */}
                {originalDwgData && (
                  <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-xl p-1 text-xs">
                    <button
                      type="button"
                      onClick={() => handleToggleVersion('original')}
                      className={`px-2 py-0.5 rounded-lg text-[10.5px] font-bold transition ${
                        activeVersionType === 'original'
                          ? 'bg-slate-700 text-white shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {isAr ? 'النسخة الأصلية' : 'Original'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleVersion('edited')}
                      className={`px-2 py-0.5 rounded-lg text-[10.5px] font-bold transition ${
                        activeVersionType === 'edited'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {isAr ? 'نسخة المنصة المعدلة' : 'Edited (v1)'}
                    </button>
                  </div>
                )}

                {/* 🌟 HIGHLIGHT WORKING AREA & ZONES TOGGLE (Imported CAD Only) */}
                {hasImportedCad && (
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
                )}

                {/* 🏷️ TOGGLE LABELS & ZONE NAMES */}
                <button
                  type="button"
                  onClick={() => setShowLabels(!showLabels)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shadow transition active:scale-95 border ${
                    showLabels
                      ? 'bg-slate-800 text-cyan-300 border-cyan-500/50 ring-1 ring-cyan-500/30'
                      : 'bg-slate-950 text-slate-400 hover:bg-slate-900 border-slate-800'
                  }`}
                  title={isAr ? 'إخفاء أو إظهار أسماء المناطق والنصوص والتسميات على المخطط' : 'Toggle Zone Names & Text Labels on Map'}
                >
                  <Tag className="h-3.5 w-3.5 text-cyan-400" />
                  <span>{isAr ? (showLabels ? 'إخفاء التسميات 🏷️' : 'إظهار التسميات 🏷️') : (showLabels ? 'Hide Labels 🏷️' : 'Show Labels 🏷️')}</span>
                </button>

                {/* ↶ REVERT (UNDO) & ↷ FORWARD (REDO) BUTTONS */}
                <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-xl p-1 shadow">
                  <button
                    type="button"
                    onClick={handleUndo}
                    disabled={historyIndex <= 0}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition ${
                      historyIndex > 0
                        ? 'text-amber-400 hover:bg-slate-800 active:scale-95 cursor-pointer'
                        : 'text-slate-600 cursor-not-allowed opacity-40'
                    }`}
                    title={isAr ? 'تراجع عن آخر تعديل للخطوط (Ctrl+Z)' : 'Undo last line edit (Ctrl+Z)'}
                  >
                    <Undo2 className="h-3.5 w-3.5" />
                    <span>{isAr ? 'تراجع' : 'Undo'}</span>
                  </button>

                  <div className="w-[1px] h-3.5 bg-slate-700 mx-0.5" />

                  <button
                    type="button"
                    onClick={handleRedo}
                    disabled={historyIndex >= historyStack.length - 1}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition ${
                      historyIndex < historyStack.length - 1
                        ? 'text-amber-400 hover:bg-slate-800 active:scale-95 cursor-pointer'
                        : 'text-slate-600 cursor-not-allowed opacity-40'
                    }`}
                    title={isAr ? 'إعادة التعديل للأمام (Ctrl+Y)' : 'Redo edit forward (Ctrl+Y)'}
                  >
                    <Redo2 className="h-3.5 w-3.5" />
                    <span>{isAr ? 'إعادة' : 'Redo'}</span>
                  </button>
                </div>

                {/* Snap to Site / Fly to Site */}
                <button
                  type="button"
                  onClick={() => {
                    if (!mapInstanceRef.current) return;
                    mapInstanceRef.current.invalidateSize();
                    const targetLat = anchorLat || dwgData?.centerLatLng?.[0] || 24.4686;
                    const targetLng = anchorLng || dwgData?.centerLatLng?.[1] || 39.6120;
                    mapInstanceRef.current.flyTo([targetLat, targetLng], 18, { animate: true });
                  }}
                  className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold shadow transition active:scale-95 cursor-pointer"
                  title={isAr ? 'انتقال فوري لموقع مشروع التحويلة على الخريطة' : 'Fly directly to construction site'}
                >
                  <MapPin className="h-3.5 w-3.5 text-amber-300" />
                  <span>{isAr ? 'موقع المشروع 🎯' : 'Site Location 🎯'}</span>
                </button>

                {/* Smart Auto-Align Button (Snaps CAD if imported, or snaps drawn control nodes to street axis) */}
                <button
                  type="button"
                  onClick={handleSmartAutoAlign}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow transition active:scale-95 cursor-pointer"
                  title={isAr ? 'محاذاة تلقائية بنقاط الربط أو ضبط نقاط التحكم لمحور الشارع' : 'Snap to ground control points or street axis'}
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                  <span>{isAr ? 'محاذاة لمحور الشارع' : 'Snap to Street Axis'}</span>
                </button>

                {/* Fine Alignment Toolbar Toggle (Imported CAD Only) */}
                {hasImportedCad && (
                  <button
                    type="button"
                    onClick={() => setShowAlignTools(!showAlignTools)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                      showAlignTools
                        ? 'bg-amber-600 text-white border-amber-400 ring-2 ring-amber-400/30'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border-slate-700'
                    }`}
                  >
                    <Sliders className="h-3.5 w-3.5 text-brand-gold" />
                    <span>{isAr ? 'الإزاحة والتدوير' : 'Nudge & Rotate'}</span>
                  </button>
                )}

                {/* Reset */}
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-red-400 hover:text-red-300 font-bold text-xs flex items-center gap-1 px-2.5 py-1.5 bg-red-950/40 border border-red-800/40 rounded-xl transition cursor-pointer"
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
              2. SPLIT-VIEW: MAP VIEWPORT (LEFT) + UNIFIED RIGHT SIDEBAR
          ══════════════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
            {/* ── MAP VIEWPORT (8 of 12 cols when sidebar open, 12 of 12 when collapsed) ── */}
            <div className={`${showKeymapSidebar ? 'lg:col-span-8' : 'lg:col-span-12'} relative rounded-2xl overflow-hidden border border-slate-300 shadow-xl bg-slate-900`} style={{ minHeight: '640px', height: '640px' }}>
              <div
                ref={mapContainerRef}
                className="absolute inset-0 z-0 leaflet-container w-full h-full"
                style={{ cursor: isDrawPanelOpen ? 'crosshair' : 'grab', backgroundColor: '#0f172a' }}
              />

              {/* Floating Active Drawing Mode Banner */}
              {isDrawPanelOpen && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-slate-950/95 backdrop-blur-md border border-amber-500/60 text-amber-300 px-4 py-1.5 rounded-xl shadow-xl flex items-center gap-3 text-xs font-bold animate-fade-in pointer-events-auto">
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span>{isAr ? 'لوحة الرسم نشطة ✏️ (انقر على الخريطة لوضع النقاط)' : 'Draw Panel Active ✏️ (Click map to place nodes)'}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowKeymapSidebar(false);
                      setIsMultiLayerDrawingMode(false);
                    }}
                    className="ml-1 px-2.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[11px] transition cursor-pointer border border-slate-700"
                  >
                    {isAr ? 'إغلاق لوحة الرسم ✕' : 'Close Panel ✕'}
                  </button>
                </div>
              )}

              {/* Spatial Drag Handle Banner */}
              {!isLocked && !isMultiLayerDrawingMode && hasImportedCad && (
                <div className="absolute top-3 left-3 z-10 bg-slate-950/85 text-blue-300 px-3 py-1.5 rounded-xl text-xs font-bold backdrop-blur-md border border-blue-500/40 shadow-lg flex items-center gap-1.5">
                  <span className="animate-pulse">✥</span>
                  <span>{isAr ? 'اسحب المقبض الأزرق لتحريك المخطط، واسحب أي لوحة لتغيير موقعها' : 'Drag blue handle to align CAD, drag any sign to move'}</span>
                </div>
              )}

              {/* Top-Right In-Map Triggers (Keymap, Drawing, MOT Signs) */}
              <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSidebarTab('keymap');
                    setShowKeymapSidebar(prev => (showKeymapSidebar && sidebarTab === 'keymap' ? false : true));
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold backdrop-blur-md border shadow-lg flex items-center gap-1.5 transition cursor-pointer ${
                    showKeymapSidebar && sidebarTab === 'keymap'
                      ? 'bg-amber-600 text-white border-amber-400 ring-2 ring-amber-400/40'
                      : 'bg-slate-950/90 hover:bg-slate-900 text-amber-300 border-amber-500/40'
                  }`}
                  title={isAr ? 'إظهار لوحة دليل ومفتاح طبقات المخطط' : 'Keymap & CAD Layers'}
                >
                  <Layers className="h-3.5 w-3.5 text-brand-gold" />
                  <span>{isAr ? 'دليل الطبقات 📂' : 'Keymap & Layers 📂'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const willOpen = !(showKeymapSidebar && sidebarTab === 'drawing');
                    if (willOpen) {
                      setSidebarTab('drawing');
                      setShowKeymapSidebar(true);
                      setIsMultiLayerDrawingMode(true);
                      setActiveDrawingLayer('site');
                    } else {
                      setShowKeymapSidebar(false);
                      setIsMultiLayerDrawingMode(false);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold backdrop-blur-md border shadow-lg flex items-center gap-1.5 transition cursor-pointer ${
                    showKeymapSidebar && sidebarTab === 'drawing'
                      ? 'bg-amber-600 text-white border-amber-400 ring-2 ring-amber-400/40'
                      : 'bg-slate-950/90 hover:bg-slate-900 text-amber-300 border-amber-500/40'
                  }`}
                  title={isAr ? 'فتح لوحة الرسم الهندسي لوضع النقاط' : 'Open Draw Panel to place nodes'}
                >
                  <PenTool className="h-3.5 w-3.5 text-brand-gold" />
                  <span>{isAr ? 'أدوات الرسم ✏️' : 'CAD Drawing ✏️'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSidebarTab('signs');
                    setShowKeymapSidebar(prev => (showKeymapSidebar && sidebarTab === 'signs' ? false : true));
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold backdrop-blur-md border shadow-lg flex items-center gap-1.5 transition cursor-pointer ${
                    showKeymapSidebar && sidebarTab === 'signs'
                      ? 'bg-amber-600 text-white border-amber-400 ring-2 ring-amber-400/40'
                      : 'bg-slate-950/90 hover:bg-slate-900 text-amber-300 border-amber-500/40'
                  }`}
                  title={isAr ? 'دليل الشواخص واللوحات السعودية المعتمدة' : 'Saudi MOT Signs Palette'}
                >
                  <GripVertical className="h-3.5 w-3.5 text-brand-gold" />
                  <span>{isAr ? 'الشواخص المرورية (MOT) 🛑' : 'MOT Signs (MOT) 🛑'}</span>
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
                      className="text-slate-400 hover:text-white cursor-pointer"
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
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 border border-slate-700 cursor-pointer"
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
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 border border-slate-700 cursor-pointer"
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
                      className="bg-red-950/80 hover:bg-red-900 text-red-300 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 border border-red-800/60 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3 text-red-400" />
                      <span>{isAr ? 'حذف' : 'Delete'}</span>
                    </button>
                  </div>
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
                      className="text-slate-400 hover:text-white cursor-pointer"
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

            {/* ── UNIFIED RIGHT SIDEBAR (KEYMAP / DRAWING / MOT SIGNS) ── */}
            {showKeymapSidebar && (
              <div className="lg:col-span-4 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white shadow-xl flex flex-col justify-between space-y-4 animate-fade-in min-h-[640px] max-h-[640px] overflow-y-auto custom-scrollbar">
                <div className="space-y-3.5">
                  {/* Top Header: Tab Switchers & Collapse Button */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 gap-2">
                    <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 flex-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSidebarTab('keymap');
                          setIsMultiLayerDrawingMode(false);
                        }}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                          sidebarTab === 'keymap'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Layers className="h-3.5 w-3.5" />
                        <span>{isAr ? 'الطبقات' : 'Layers'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSidebarTab('drawing');
                          setIsMultiLayerDrawingMode(true);
                        }}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                          sidebarTab === 'drawing'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <PenTool className="h-3.5 w-3.5" />
                        <span>{isAr ? 'الرسم' : 'Drawing'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSidebarTab('signs');
                          setIsMultiLayerDrawingMode(false);
                        }}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                          sidebarTab === 'signs'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <GripVertical className="h-3.5 w-3.5" />
                        <span>{isAr ? 'الشواخص' : 'Signs'}</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowKeymapSidebar(false);
                        setIsMultiLayerDrawingMode(false);
                      }}
                      className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700 transition cursor-pointer"
                      title={isAr ? 'إغلاق اللوحة الجانبية وإيقاف الرسم' : 'Close Sidebar & Stop Drawing'}
                    >
                      <ChevronRight className="h-4 w-4 rtl:rotate-180 text-slate-300" />
                    </button>
                  </div>

                  {/* ── TAB 1: KEYMAP & CAD LAYERS ── */}
                  {sidebarTab === 'keymap' && (
                    <div className="space-y-3 animate-in fade-in duration-150">
                      <div>
                        <h4 className="font-bold text-xs text-brand-gold flex items-center gap-1.5">
                          <Layers className="h-3.5 w-3.5" />
                          <span>{isAr ? 'دليل ومفتاح طبقات المخطط (MOT 305)' : 'Keymap & CAD Layer Specifications'}</span>
                        </h4>
                        <p className="text-[10.5px] text-slate-400 mt-0.5">
                          {isAr ? 'انقر على أي طبقة لإظهارها أو إخفائها' : 'Click any layer to toggle visibility'}
                        </p>
                      </div>

                      <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1 custom-scrollbar">
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
                  )}

                  {/* ── TAB 2: CAD DRAWING TOOLS & CONTROL NODES ── */}
                  {sidebarTab === 'drawing' && (
                    <div className="space-y-3.5 animate-in fade-in duration-150 text-xs">
                      <div>
                        <h4 className="font-bold text-xs text-brand-gold flex items-center gap-1.5">
                          <PenTool className="h-3.5 w-3.5" />
                          <span>{isAr ? 'أدوات الرسم والتخطيط المتعدد' : 'Multi-Layer CAD Drawing Mode'}</span>
                        </h4>
                        <p className="text-[10.5px] text-slate-400 mt-0.5">
                          {isAr ? 'اختر الطبقة وانقر على الخريطة لتحديد النقاط' : 'Select layer and click map to place nodes'}
                        </p>
                      </div>

                      {/* 5 Drawing Layer Sub-Tabs */}
                      <div className="grid grid-cols-2 gap-1.5 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
                        {/* 1. Site */}
                        <button
                          type="button"
                          onClick={() => setActiveDrawingLayer('site')}
                          className={`p-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                            activeDrawingLayer === 'site'
                              ? 'bg-amber-500 text-slate-950 shadow-sm ring-2 ring-amber-400/50'
                              : 'text-amber-400 hover:bg-slate-800'
                          }`}
                        >
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0"></span>
                          <span className="truncate">{isAr ? `١. الموقع (${drawnSiteNodes.length}) 🟡` : `1. Site (${drawnSiteNodes.length}) 🟡`}</span>
                        </button>

                        {/* 2. Transition */}
                        <button
                          type="button"
                          onClick={() => setActiveDrawingLayer('transition')}
                          className={`p-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                            activeDrawingLayer === 'transition'
                              ? 'bg-red-500 text-white shadow-sm ring-2 ring-red-400/50'
                              : 'text-red-400 hover:bg-slate-800'
                          }`}
                        >
                          <span className="w-2.5 h-2.5 rounded-full bg-red-400 shrink-0"></span>
                          <span className="truncate">{isAr ? `٢. التحويلة (${savedDetours.length + (drawnTransitionNodes.length ? 1 : 0)}) 🔴` : `2. Detour (${savedDetours.length + (drawnTransitionNodes.length ? 1 : 0)}) 🔴`}</span>
                        </button>

                        {/* 3. Barrier */}
                        <button
                          type="button"
                          onClick={() => setActiveDrawingLayer('barrier')}
                          className={`p-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                            activeDrawingLayer === 'barrier'
                              ? 'bg-cyan-500 text-slate-950 shadow-sm ring-2 ring-cyan-400/50'
                              : 'text-cyan-400 hover:bg-slate-800'
                          }`}
                        >
                          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shrink-0"></span>
                          <span className="truncate">{isAr ? `٣. الحواجز (${savedBarriers.length + (drawnBarrierNodes.length ? 1 : 0)}) 🧱` : `3. Barrier (${savedBarriers.length + (drawnBarrierNodes.length ? 1 : 0)}) 🧱`}</span>
                        </button>

                        {/* 4. Pedestrian */}
                        <button
                          type="button"
                          onClick={() => setActiveDrawingLayer('pedestrian')}
                          className={`p-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                            activeDrawingLayer === 'pedestrian'
                              ? 'bg-emerald-500 text-slate-950 shadow-sm ring-2 ring-emerald-400/50'
                              : 'text-emerald-400 hover:bg-slate-800'
                          }`}
                        >
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0"></span>
                          <span className="truncate">{isAr ? `٤. المشاة (${savedPedestrians.length + (drawnPedestrianNodes.length ? 1 : 0)}) 🟢` : `4. Ped (${savedPedestrians.length + (drawnPedestrianNodes.length ? 1 : 0)}) 🟢`}</span>
                        </button>

                        {/* 5. Steel Trench Plates (Purple - 4 Nodes) */}
                        <button
                          type="button"
                          onClick={() => setActiveDrawingLayer('plates')}
                          className={`p-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                            activeDrawingLayer === 'plates'
                              ? 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-400/50'
                              : 'text-purple-400 hover:bg-slate-800'
                          }`}
                        >
                          <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shrink-0"></span>
                          <span className="truncate">{isAr ? `٥. ألواح التغطية (${savedPlates.length + (drawnPlateNodes.length ? 1 : 0)}) 🟣` : `5. Plates (${savedPlates.length + (drawnPlateNodes.length ? 1 : 0)}) 🟣`}</span>
                        </button>

                        {/* 6. Custom Text Labels */}
                        <button
                          type="button"
                          onClick={() => setActiveDrawingLayer('labels')}
                          className={`p-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                            activeDrawingLayer === 'labels'
                              ? 'bg-sky-500 text-slate-950 shadow-sm ring-2 ring-sky-400/50'
                              : 'text-sky-400 hover:bg-slate-800'
                          }`}
                        >
                          <Tag className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{isAr ? `٦. التسميات (${customTextLabels.length}) 🏷️` : `6. Labels (${customTextLabels.length}) 🏷️`}</span>
                        </button>
                      </div>

                      {/* Active Layer Guidance & Context Controls */}
                      <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-2">
                        {activeDrawingLayer === 'site' && (
                          <p className="text-amber-300 text-[11px] leading-relaxed">
                            {isAr
                              ? `🟡 انقر على الخريطة لتحديد أركان منطقة العمل (تم وضع ${drawnSiteNodes.length} نقاط - يتطلب ٣ على الأقل).`
                              : `🟡 Click on map to place work zone boundary polygon (${drawnSiteNodes.length} pts placed, min 3 required).`}
                          </p>
                        )}

                        {activeDrawingLayer === 'transition' && (
                          <div className="space-y-2">
                            <p className="text-red-300 text-[11px] leading-relaxed">
                              {isAr
                                ? `🔴 انقر على الخريطة لرسم خط مسار التحويلة والتدرج (${drawnTransitionNodes.length} نقاط قيد الرسم).`
                                : `🔴 Click on map to trace transition taper line (${drawnTransitionNodes.length} pts in progress).`}
                            </p>
                            {drawnTransitionNodes.length >= 2 && (
                              <div className="bg-red-950/40 border border-red-500/40 p-2 rounded-lg text-red-200 text-xs font-mono flex justify-between items-center">
                                <span>{isAr ? 'الطول الحقيقي للمسار (من الإحداثيات):' : 'Real Coordinate Distance:'}</span>
                                <span className="font-bold text-sm text-red-300">{calculateRealPolylineLengthMeters(drawnTransitionNodes)} م</span>
                              </div>
                            )}
                            {drawnTransitionNodes.length >= 2 && (
                              <button
                                type="button"
                                onClick={handleSaveAndAddAnotherDetour}
                                className="w-full py-1.5 px-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <span>+</span>
                                <span>{isAr ? 'حفظ هذا المسار وإضافة مسار تحويلة إضافي' : 'Save & Add Another Detour'}</span>
                              </button>
                            )}
                            {savedDetours.length > 0 && (
                              <div className="space-y-1 pt-1 border-t border-slate-800">
                                <span className="text-[10px] text-slate-400 font-bold block">{isAr ? 'مسارات التحويلة المحفوظة:' : 'Saved Detour Routes:'}</span>
                                {savedDetours.map((d, dIdx) => (
                                  <div key={d.id} className="flex items-center justify-between bg-slate-950 p-1.5 rounded text-[11px] border border-red-900/50">
                                    <span className="text-red-300 font-mono">🚗 {d.name} ({d.lengthM}م)</span>
                                    <button
                                      type="button"
                                      onClick={() => setSavedDetours(prev => prev.filter((_, i) => i !== dIdx))}
                                      className="text-red-400 hover:text-red-300 px-1 font-bold cursor-pointer"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {activeDrawingLayer === 'barrier' && (() => {
                          const barrierEval = evaluateMotBarrierRule(
                            { type: selectedBarrierType || 'concrete_njb', clearanceM: (selectedBarrierType && selectedBarrierType.includes('concrete')) ? 0.8 : 2.5 },
                            workDurationHours || 0,
                            excavationDepth || 0,
                            speedLimit || 50
                          ) || { isCompliant: true, reasonAr: '', reasonEn: '' };
                          return (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-cyan-300 font-bold text-[11px] block">
                                  {isAr ? '🧱 نوع الجدار / السلسلة المتكررة:' : 'Barrier Wall / Signage Series Type:'}
                                </span>
                                <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold border ${
                                  barrierEval.isCompliant 
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                                    : 'bg-red-500/20 text-red-300 border-red-500/40'
                                }`}>
                                  {barrierEval.isCompliant ? (isAr ? '✓ مطابق لكود الطرق ٣٠٥' : '✓ MOT 305') : (isAr ? '⚠️ مخالف لكود ٣٠٥' : '⚠️ NON-COMPLIANT')}
                                </span>
                              </div>

                              <select
                                value={selectedBarrierType}
                                onChange={(e) => setSelectedBarrierType(e.target.value)}
                                className="w-full bg-slate-950 text-cyan-300 border border-cyan-700/60 rounded-lg p-1.5 text-xs font-bold focus:outline-none"
                              >
                                <option value="concrete_njb">{isAr ? '🧱 صبات خرسانية مسلحة (NJB - 2m)' : '🧱 Concrete NJB Barrier Wall (2m)'}</option>
                                <option value="plastic_njb">{isAr ? '🚧 حواجز بلاستيكية مائية (1m)' : '🚧 Plastic Water Barriers (1m)'}</option>
                                <option value="cones_series">{isAr ? '🔶 سلسلة أقماع تحذيرية متكررة' : '🔶 Warning Cones Series'}</option>
                                <option value="warning_lights_chain">{isAr ? '💡 شريط إضاءة تحذيري متصل' : '💡 Warning Lights Chain'}</option>
                              </select>

                              {/* Live Evaluation Note */}
                              <div className={`p-2 rounded text-[10px] leading-relaxed border ${
                                barrierEval.isCompliant ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300' : 'bg-red-950/50 border-red-800/50 text-red-200'
                              }`}>
                                <span className="font-bold">{isAr ? (barrierEval.isCompliant ? '🛡️ المعيار الفني: ' : '⚠️ تنبيه كود ٣٠٥: ') : 'MOT Rule: '}</span>
                                <span>{isAr ? barrierEval.reasonAr : barrierEval.reasonEn}</span>
                              </div>

                              {/* Save & Add Another Barrier */}
                              {drawnBarrierNodes.length >= 2 && (
                                <div className="bg-cyan-950/40 border border-cyan-500/40 p-2 rounded-lg text-cyan-200 text-xs font-mono flex justify-between items-center">
                                  <span>{isAr ? 'الطول الحقيقي للجدار (من الإحداثيات):' : 'Real Coordinate Barrier Length:'}</span>
                                  <span className="font-bold text-sm text-cyan-300">{calculateRealPolylineLengthMeters(drawnBarrierNodes)} م</span>
                                </div>
                              )}
                              {drawnBarrierNodes.length >= 2 && (
                                <button
                                  type="button"
                                  onClick={handleSaveAndAddAnotherBarrier}
                                  className="w-full py-1.5 px-2.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 rounded-lg text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                                >
                                  <span>+</span>
                                  <span>{isAr ? 'حفظ هذا الحاجز وإضافة حاجز آخر' : 'Save & Add Another Barrier'}</span>
                                </button>
                              )}

                              {savedBarriers.length > 0 && (
                                <div className="space-y-1 pt-1 border-t border-slate-800">
                                  <span className="text-[10px] text-slate-400 font-bold block">{isAr ? 'الحواجز المحفوظة على المخطط:' : 'Saved Barriers on Map:'}</span>
                                  {savedBarriers.map((b, bIdx) => (
                                    <div key={b.id} className="flex items-center justify-between bg-slate-950 p-1.5 rounded text-[11px] border border-cyan-900/50">
                                      <span className="text-cyan-300 font-mono">🧱 {b.name} ({b.lengthM}م)</span>
                                      <button
                                        type="button"
                                        onClick={() => setSavedBarriers(prev => prev.filter((_, i) => i !== bIdx))}
                                        className="text-red-400 hover:text-red-300 px-1 font-bold cursor-pointer"
                                      >
                                        🗑️
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {activeDrawingLayer === 'pedestrian' && (
                          <div className="space-y-2">
                            <p className="text-emerald-300 text-[11px] leading-relaxed">
                              {isAr
                                ? `🟢 انقر على الخريطة لتحديد مسار ممر المشاة الآمن (${drawnPedestrianNodes.length} نقاط قيد الرسم).`
                                : `🟢 Click on map to draw safe pedestrian corridor (${drawnPedestrianNodes.length} pts in progress).`}
                            </p>
                            {drawnPedestrianNodes.length >= 2 && (
                              <div className="bg-emerald-950/40 border border-emerald-500/40 p-2 rounded-lg text-emerald-200 text-xs font-mono flex justify-between items-center">
                                <span>{isAr ? 'طول ممر المشاة الحقيقي:' : 'Real Coordinate Pedestrian Length:'}</span>
                                <span className="font-bold text-sm text-emerald-300">{calculateRealPolylineLengthMeters(drawnPedestrianNodes)} م</span>
                              </div>
                            )}
                            {drawnPedestrianNodes.length >= 2 && (
                              <button
                                type="button"
                                onClick={handleSaveAndAddAnotherPedestrian}
                                className="w-full py-1.5 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 rounded-lg text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <span>+</span>
                                <span>{isAr ? 'حفظ هذا الممر وإضافة ممر مشاة آخر' : 'Save & Add Another Pedestrian Corridor'}</span>
                              </button>
                            )}
                            {savedPedestrians.length > 0 && (
                              <div className="space-y-1 pt-1 border-t border-slate-800">
                                <span className="text-[10px] text-slate-400 font-bold block">{isAr ? 'ممرات المشاة المحفوظة:' : 'Saved Pedestrian Corridors:'}</span>
                                {savedPedestrians.map((p, pIdx) => (
                                  <div key={p.id} className="flex items-center justify-between bg-slate-950 p-1.5 rounded text-[11px] border border-emerald-900/50">
                                    <span className="text-emerald-300 font-mono">🚶 {p.name} ({p.lengthM}م)</span>
                                    <button
                                      type="button"
                                      onClick={() => setSavedPedestrians(prev => prev.filter((_, i) => i !== pIdx))}
                                      className="text-red-400 hover:text-red-300 px-1 font-bold cursor-pointer"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Plates (Purple 4-Nodes Steel Trench Plates with Adjustment & Type Selection) */}
                        {activeDrawingLayer === 'plates' && (() => {
                          const dims = calculateRealPlateDimensions(drawnPlateNodes);
                          const curW = dims.widthM;
                          const curL = dims.lengthM;

                          return (
                            <div className="space-y-2.5">
                              <div className="flex items-center justify-between">
                                <span className="text-purple-300 font-bold text-[11px] block">
                                  {isAr ? '🟣 نوع ومواصفات لوح التغطية المعدني:' : 'Steel Trench Plate Type & Spec:'}
                                </span>
                                <span className="text-[10px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-600/50 px-2 py-0.5 rounded">
                                  {drawnPlateNodes.length} / 4 {isAr ? 'أركان' : 'corners'}
                                </span>
                              </div>

                              {/* Plate Type Selection Dropdown */}
                              <select
                                value={selectedPlateType}
                                onChange={(e) => setSelectedPlateType(e.target.value)}
                                className="w-full bg-slate-950 text-purple-300 border border-purple-700/60 rounded-lg p-2 text-xs font-bold focus:outline-none"
                              >
                                <option value="steel_40t">{isAr ? '🛡️ صلب ٤٠ طن (سماكة ٣٠ ملم - كود ٣٠٥ لخنادق المركبات)' : '🛡️ Heavy 40T Steel (30mm - SRC 305 Vehicle Trenches)'}</option>
                                <option value="steel_25mm">{isAr ? '🚗 صلب ٢٠ طن (سماكة ٢٥ ملم - شوارع فرعية)' : '🚗 Secondary 20T Steel (25mm)'}</option>
                                <option value="anti_skid">{isAr ? '👣 صلب منقوش مانع للانزلاق (مركبات ومشاة)' : '👣 Anti-Skid Diamond Steel Plate'}</option>
                                <option value="pedestrian">{isAr ? '🚶 جسور مشاة حديدية مع درابزين حماية' : '🚶 Pedestrian Iron Bridge with Handrails'}</option>
                              </select>

                              {drawnPlateNodes.length < 4 ? (
                                <p className="text-purple-200 text-[11px] leading-relaxed bg-purple-950/50 border border-purple-800/60 p-2 rounded-lg">
                                  {isAr
                                    ? `🟣 انقر على الخريطة لتحديد الركن رقم (${drawnPlateNodes.length + 1}) من ٤ أركان للوح الصلب. بعد وضع الأركان الأربعة يمكنك سحب أي ركن لتعديله.`
                                    : `🟣 Click map to place corner (${drawnPlateNodes.length + 1}) of 4 for the steel plate. Once placed, you can drag any corner to adjust before confirming.`}
                                </p>
                              ) : (
                                <div className="space-y-2 bg-purple-950/70 border border-purple-500/70 p-2.5 rounded-xl text-white text-xs">
                                  <div className="flex items-center gap-1.5 text-purple-200 font-bold">
                                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                                    <span>{isAr ? 'اكتملت أركان اللوح (يمكنك سحب أي ركن على الخريطة لضبطه)' : '4 Corners Placed (Drag any node on map to fine-tune)'}</span>
                                  </div>
                                  <div className="text-[11px] font-mono text-purple-300 bg-purple-900/40 p-1.5 rounded flex justify-between">
                                    <span>{isAr ? `الأبعاد المحسوبة:` : 'Computed:'}</span>
                                    <span>{curL}م {isAr ? 'طول' : 'L'} × {curW}م {isAr ? 'عرض' : 'W'}</span>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={handleConfirmAndSavePlate}
                                    className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>{isAr ? '✓ اعتماد وحفظ لوح التغطية هذا (+ إضافة لوح آخر)' : '✓ Confirm & Save This Plate (+ Add Another)'}</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setDrawnPlateNodes([])}
                                    className="w-full py-1 text-[11px] bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
                                  >
                                    {isAr ? 'إلغاء أركان اللوح الحالي وإعادة الرسم' : 'Reset Plate Corners'}
                                  </button>
                                </div>
                              )}

                              {savedPlates.length > 0 && (
                                <div className="space-y-1.5 pt-1.5 border-t border-slate-800">
                                  <span className="text-[10px] text-slate-400 font-bold block">{isAr ? 'ألواح الصلب المعتمدة على الخريطة:' : 'Confirmed Plates on Map:'}</span>
                                  {savedPlates.map((pl, plIdx) => (
                                    <div key={pl.id} className="flex items-center justify-between bg-slate-950 p-2 rounded text-[11px] border border-purple-900/60 font-mono">
                                      <div>
                                        <span className="text-purple-300 font-bold block">🟣 {pl.name}</span>
                                        <span className="text-[9.5px] text-slate-400">{pl.lengthM}م × {pl.widthM}م • سمك {pl.thicknessMm} ملم</span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => setSavedPlates(prev => prev.filter((_, i) => i !== plIdx))}
                                        className="text-red-400 hover:text-red-300 px-1.5 py-0.5 rounded hover:bg-red-950 font-bold cursor-pointer text-xs"
                                        title={isAr ? 'حذف اللوح' : 'Delete Plate'}
                                      >
                                        🗑️
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {activeDrawingLayer === 'labels' && (
                          <div className="space-y-2">
                            <span className="text-sky-300 font-bold text-[11px] block">
                              {isAr ? '🏷️ أدخل نص التسمية ثم انقر على الخريطة لوضعها:' : '🏷️ Enter label text and click map to place:'}
                            </span>
                            <div className="flex gap-1.5">
                              <input
                                type="text"
                                value={newLabelText}
                                onChange={(e) => setNewLabelText(e.target.value)}
                                placeholder={isAr ? 'مثال: محطة STA 0+100 أو مسار طوارئ' : 'e.g. STA 0+100 or Emergency Route'}
                                className="flex-1 bg-slate-950 text-sky-200 border border-sky-600/50 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-sky-400"
                              />
                            </div>

                            {customTextLabels.length > 0 && (
                              <div className="pt-2 border-t border-slate-800 space-y-1">
                                <div className="flex items-center justify-between text-[10.5px]">
                                  <span className="font-bold text-slate-300">{isAr ? 'التسميات الموضوعة:' : 'Placed Labels:'}</span>
                                  <button
                                    type="button"
                                    onClick={() => setCustomTextLabels([])}
                                    className="text-red-400 hover:text-red-300 font-bold cursor-pointer"
                                  >
                                    {isAr ? 'مسح الكل' : 'Clear All'}
                                  </button>
                                </div>
                                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto custom-scrollbar">
                                  {customTextLabels.map((lbl) => (
                                    <span
                                      key={lbl.id}
                                      className="inline-flex items-center gap-1 bg-sky-950 border border-sky-700/60 text-sky-300 px-2 py-0.5 rounded text-[10px]"
                                    >
                                      <span>{lbl.text}</span>
                                      <button
                                        type="button"
                                        onClick={() => setCustomTextLabels(prev => prev.filter(item => item.id !== lbl.id))}
                                        className="text-slate-400 hover:text-red-400 ml-1 font-bold cursor-pointer"
                                      >
                                        ×
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Node Actions (Undo, Clear Layer) */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                          <button
                            type="button"
                            onClick={handleUndoLastPoint}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                          >
                            <Undo2 className="w-3 h-3" />
                            <span>{isAr ? 'تراجع عن نقطة' : 'Undo Point'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleClearActiveLayerPoints}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-red-400 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>{isAr ? 'مسح الطبقة' : 'Clear Layer'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Export CAD DXF Action (Commit CAD Removed per Specification) */}
                      <div className="space-y-2 pt-2 border-t border-slate-800">
                        <button
                          type="button"
                          onClick={handleExportCadDxf}
                          disabled={drawnSiteNodes.length < 3 && drawnTransitionNodes.length < 2 && savedDetours.length === 0 && savedBarriers.length === 0 && savedPlates.length === 0}
                          className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md hover:shadow-blue-500/25 cursor-pointer"
                        >
                          <DownloadCloud className="w-4 h-4" />
                          <span>{isAr ? 'تصدير مخطط أوتوكاد بصيغة (AutoCAD DXF 📐)' : 'Export CAD DXF Blueprint 📐'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── TAB 3: SAUDI MOT SIGNS PALETTE ── */}
                  {sidebarTab === 'signs' && (
                    <div className="space-y-3 animate-in fade-in duration-150 text-xs">
                      <div>
                        <h4 className="font-bold text-xs text-brand-gold flex items-center gap-1.5">
                          <GripVertical className="h-3.5 w-3.5" />
                          <span>{isAr ? 'مكتبة الشواخص واللوحات السعودية (MOT)' : 'Saudi MOT Signs & Safety Library'}</span>
                        </h4>
                        <p className="text-[10.5px] text-slate-400 mt-0.5">
                          {isAr ? 'انقر على اللوحة لإضافتها للخريطة واسحبها لتحديد مكانها' : 'Click to place sign, then drag freely on map'}
                        </p>
                      </div>

                      {/* Categories */}
                      <div className="flex border-b border-slate-800 bg-slate-900 rounded-lg p-1">
                        {Object.entries(SAUDI_MOT_ELEMENTS).map(([key, cat]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setActivePaletteCategory(key)}
                            className={`flex-1 py-1 text-[11px] font-bold rounded-md transition cursor-pointer ${
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
                      <div className="grid grid-cols-1 gap-1.5 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                        {SAUDI_MOT_ELEMENTS[activePaletteCategory]?.items.map(item => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleAddElement(item.id)}
                            className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-brand-gold hover:bg-slate-850 transition text-right group cursor-pointer"
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

                      {/* Placed Elements Summary */}
                      {placedElements.length > 0 && (
                        <div className="pt-3 border-t border-slate-800 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-300 flex items-center gap-1">
                              <span>🛑</span>
                              <span>{isAr ? `اللوحات الموضوعة (${placedElements.length})` : `Placed Elements (${placedElements.length})`}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setPlacedElements([]);
                                setSelectedElementId(null);
                              }}
                              className="text-[10px] text-red-400 hover:text-red-300 font-bold cursor-pointer"
                            >
                              {isAr ? 'مسح الكل' : 'Clear'}
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar">
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
                                  className="text-slate-500 hover:text-red-400 ml-1 font-bold cursor-pointer"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DwgMapOverlay;
