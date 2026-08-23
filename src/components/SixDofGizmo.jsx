import React, { useState, useEffect } from 'react';
import {
  Compass, Move3d, Rotate3d, Layers, X, Check,
  ChevronDown, ChevronUp, MapPin, Sliders, Shield,
  ArrowUpRight, RefreshCw, Eye, Maximize2, Crosshair
} from 'lucide-react';

/**
 * Interactive 6-DOF Transform Gizmo & Inspector Component
 * Provides:
 * - Linear Translation: X, Y, Z (Spatial coordinates relative to CAD datum)
 * - Angular Orientation: Roll (θx), Pitch (θy), Yaw (θz) in degrees (-180° to +180°)
 * - Interactive 3D rotation rings and translation sliders
 * - Vertex snapping assistance
 */
export const SixDofGizmo = ({
  activeNode = null,
  onNodeUpdate,
  onClose,
  language = 'ar',
  readOnly = false,
  onSnapToNearestVertex = null
}) => {
  const [coords, setCoords] = useState({
    id: 'N1',
    label: 'Node 1',
    layer: 'construction',
    lat: 24.5143,
    lng: 39.7089,
    x: 582500,
    y: 2703800,
    z: 0.0,
    roll: 0.0,
    pitch: 0.0,
    yaw: 0.0
  });

  const [activeGizmoMode, setActiveGizmoMode] = useState('linear'); // 'linear' | 'rotational' | 'matrix'

  useEffect(() => {
    if (activeNode) {
      setCoords({
        id: activeNode.id || 'N1',
        label: activeNode.label || activeNode.id || 'Node',
        layer: activeNode.layer || (activeNode.id?.startsWith('C') ? 'construction' : activeNode.id?.startsWith('D') ? 'detour' : 'pedestrian'),
        lat: Number(activeNode.lat || 24.5143),
        lng: Number(activeNode.lng || 39.7089),
        x: Number(activeNode.x || Math.round(582500 + ((activeNode.lng || 39.7089) - 39.6120) * 100000)),
        y: Number(activeNode.y || Math.round(2703800 + ((activeNode.lat || 24.5143) - 24.4686) * 110000)),
        z: Number(activeNode.z || 0.0),
        roll: Number(activeNode.roll || 0.0),
        pitch: Number(activeNode.pitch || 0.0),
        yaw: Number(activeNode.yaw || 0.0),
        prefix: activeNode.prefix,
        index: activeNode.index
      });
    }
  }, [activeNode]);

  if (!activeNode) return null;

  const updateField = (field, val) => {
    const num = parseFloat(val);
    const updated = {
      ...coords,
      [field]: isNaN(num) ? 0 : num
    };

    if (field === 'x') {
      updated.lng = Number((39.6120 + (num - 582500) / 100000).toFixed(6));
    }
    if (field === 'y') {
      updated.lat = Number((24.4686 + (num - 2703800) / 110000).toFixed(6));
    }
    if (field === 'lat') {
      updated.y = Math.round(2703800 + (num - 24.4686) * 110000);
    }
    if (field === 'lng') {
      updated.x = Math.round(582500 + (num - 39.6120) * 100000);
    }

    setCoords(updated);
    if (onNodeUpdate) onNodeUpdate(updated);
  };

  const getLayerColor = (layer) => {
    switch (layer) {
      case 'construction': return { bg: 'bg-blue-600', text: 'text-blue-200', border: 'border-blue-400', nameAr: 'منطقة العمل (أزرق C)', nameEn: 'Construction Zone (Blue C)' };
      case 'detour': return { bg: 'bg-orange-600', text: 'text-orange-200', border: 'border-orange-400', nameAr: 'مسار التحويلة (برتقالي D)', nameEn: 'Detour Route (Orange D)' };
      case 'pedestrian': return { bg: 'bg-emerald-600', text: 'text-emerald-200', border: 'border-emerald-400', nameAr: 'ممر المشاة (أخضر P)', nameEn: 'Pedestrian Route (Green P)' };
      default: return { bg: 'bg-slate-700', text: 'text-slate-200', border: 'border-slate-500', nameAr: 'نقطة تحكم', nameEn: 'Control Node' };
    }
  };

  const layerMeta = getLayerColor(coords.layer);

  return (
    <div
      className="bg-slate-950/95 text-white p-4 rounded-2xl border border-slate-700 shadow-2xl backdrop-blur-xl w-80 sm:w-96 animate-fade-in text-xs space-y-3.5"
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Gizmo Top Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-extrabold font-mono text-sm shadow-md">
            {coords.id}
          </div>
          <div>
            <div className="font-extrabold flex items-center gap-1.5 text-xs sm:text-sm">
              <span>{language === 'ar' ? 'محرر ومحول 6-DOF' : '6-DOF Transform Gizmo'}</span>
              <span className={`text-[9px] px-2 py-0.2 rounded-full font-bold ${layerMeta.bg} ${layerMeta.text}`}>
                {language === 'ar' ? layerMeta.nameAr : layerMeta.nameEn}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
              Lat: {coords.lat.toFixed(5)}° • Lng: {coords.lng.toFixed(5)}°
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Mode Selector */}
      <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-[10px] font-bold">
        <button
          type="button"
          onClick={() => setActiveGizmoMode('linear')}
          className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition ${
            activeGizmoMode === 'linear' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Move3d className="w-3.5 h-3.5" />
          <span>{language === 'ar' ? 'إزاحة (X,Y,Z)' : 'Linear (XYZ)'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveGizmoMode('rotational')}
          className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition ${
            activeGizmoMode === 'rotational' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Rotate3d className="w-3.5 h-3.5" />
          <span>{language === 'ar' ? 'دوران (R,P,Y)' : 'Rotation'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveGizmoMode('matrix')}
          className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition ${
            activeGizmoMode === 'matrix' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Crosshair className="w-3.5 h-3.5" />
          <span>{language === 'ar' ? 'مصفوفة 6-DOF' : '6D Matrix'}</span>
        </button>
      </div>

      {/* ── Mode 1: Linear Translation (X, Y, Z) ── */}
      {activeGizmoMode === 'linear' && (
        <div className="space-y-3 animate-fade-in">
          {/* X & Y Easting/Northing */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] font-extrabold text-blue-400 uppercase block mb-1">
                {language === 'ar' ? 'X - الشرق (م)' : 'X - Easting (m)'}
              </span>
              <input
                type="number"
                disabled={readOnly}
                value={coords.x}
                onChange={(e) => updateField('x', e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 font-mono text-cyan-300 font-bold text-xs focus:ring-1 focus:ring-blue-500 outline-hidden"
              />
            </div>

            <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] font-extrabold text-blue-400 uppercase block mb-1">
                {language === 'ar' ? 'Y - الشمال (م)' : 'Y - Northing (m)'}
              </span>
              <input
                type="number"
                disabled={readOnly}
                value={coords.y}
                onChange={(e) => updateField('y', e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 font-mono text-cyan-300 font-bold text-xs focus:ring-1 focus:ring-blue-500 outline-hidden"
              />
            </div>
          </div>

          {/* Z Elevation Slider & Input */}
          <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-extrabold text-brand-gold uppercase">
                {language === 'ar' ? 'Z - المنسوب الفراغي / العمق (م)' : 'Z - Elevation / Depth (m)'}
              </span>
              <span className="font-mono text-brand-gold font-extrabold text-xs">{coords.z.toFixed(2)} م</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="-15.0"
                max="25.0"
                step="0.1"
                disabled={readOnly}
                value={coords.z}
                onChange={(e) => updateField('z', e.target.value)}
                className="flex-1 accent-brand-gold cursor-pointer"
              />
              <input
                type="number"
                step="0.1"
                disabled={readOnly}
                value={coords.z}
                onChange={(e) => updateField('z', e.target.value)}
                className="w-16 bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-center font-mono text-xs text-brand-gold font-bold"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Mode 2: Angular Orientation (Roll, Pitch, Yaw) ── */}
      {activeGizmoMode === 'rotational' && (
        <div className="space-y-3 animate-fade-in">
          {/* Roll (θx) Slider */}
          <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-extrabold text-amber-400">
                Roll (θx) — {language === 'ar' ? 'الميل العرضي' : 'Cross-Slope Angle'}
              </span>
              <span className="font-mono text-amber-400 font-bold">{coords.roll.toFixed(1)}°</span>
            </div>
            <input
              type="range"
              min="-180"
              max="180"
              step="1"
              disabled={readOnly}
              value={coords.roll}
              onChange={(e) => updateField('roll', e.target.value)}
              className="w-full accent-amber-400 cursor-pointer"
            />
          </div>

          {/* Pitch (θy) Slider */}
          <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-extrabold text-emerald-400">
                Pitch (θy) — {language === 'ar' ? 'الميل الطولي' : 'Longitudinal Grade'}
              </span>
              <span className="font-mono text-emerald-400 font-bold">{coords.pitch.toFixed(1)}°</span>
            </div>
            <input
              type="range"
              min="-180"
              max="180"
              step="1"
              disabled={readOnly}
              value={coords.pitch}
              onChange={(e) => updateField('pitch', e.target.value)}
              className="w-full accent-emerald-400 cursor-pointer"
            />
          </div>

          {/* Yaw (θz) Slider */}
          <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-extrabold text-cyan-400">
                Yaw (θz) — {language === 'ar' ? 'زاوية التوجيه / الانحراف' : 'Heading / Azimuth'}
              </span>
              <span className="font-mono text-cyan-400 font-bold">{coords.yaw.toFixed(1)}°</span>
            </div>
            <input
              type="range"
              min="-180"
              max="180"
              step="1"
              disabled={readOnly}
              value={coords.yaw}
              onChange={(e) => updateField('yaw', e.target.value)}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* ── Mode 3: 6D Matrix Full Ledger ── */}
      {activeGizmoMode === 'matrix' && (
        <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-2 animate-fade-in font-mono text-[10.5px]">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            {language === 'ar' ? 'مصفوفة التحويل الفراغي الكاملة 6-DOF:' : 'Full 6-DOF Spatial Transformation Vector:'}
          </div>
          <div className="grid grid-cols-3 gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800 text-center">
            <div>
              <span className="text-slate-500 text-[9px] block">X (East)</span>
              <span className="font-bold text-cyan-400">{coords.x}m</span>
            </div>
            <div>
              <span className="text-slate-500 text-[9px] block">Y (North)</span>
              <span className="font-bold text-cyan-400">{coords.y}m</span>
            </div>
            <div>
              <span className="text-slate-500 text-[9px] block">Z (Elev)</span>
              <span className="font-bold text-brand-gold">{coords.z.toFixed(2)}m</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800 text-center">
            <div>
              <span className="text-slate-500 text-[9px] block">Roll (θx)</span>
              <span className="font-bold text-amber-400">{coords.roll.toFixed(1)}°</span>
            </div>
            <div>
              <span className="text-slate-500 text-[9px] block">Pitch (θy)</span>
              <span className="font-bold text-emerald-400">{coords.pitch.toFixed(1)}°</span>
            </div>
            <div>
              <span className="text-slate-500 text-[9px] block">Yaw (θz)</span>
              <span className="font-bold text-blue-400">{coords.yaw.toFixed(1)}°</span>
            </div>
          </div>
        </div>
      )}

      {/* Snap to CAD Geometry Vertex Button */}
      {onSnapToNearestVertex && (
        <button
          type="button"
          onClick={() => onSnapToNearestVertex(coords)}
          className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-cyan-300 font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 transition text-[11px]"
        >
          <Crosshair className="w-3.5 h-3.5" />
          <span>{language === 'ar' ? 'محاذاة لأقرب رأس في مخطط CAD (Snap to Vertex)' : 'Snap to Nearest CAD Vertex'}</span>
        </button>
      )}

      {/* Footer Info */}
      <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[9.5px] text-slate-400">
        <span className="flex items-center gap-1 font-mono">
          <Compass className="w-3 h-3 text-blue-400" />
          <span>Datum: UTM Zone 37N</span>
        </span>
        <span className="text-emerald-400 font-bold font-mono">
          ✓ {language === 'ar' ? 'محدث ومتزامن' : 'Live Synced'}
        </span>
      </div>
    </div>
  );
};

export default SixDofGizmo;
