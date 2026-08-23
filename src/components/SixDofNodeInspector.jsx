import React, { useState, useEffect } from 'react';
import {
  Compass, Move3d, Rotate3d, Layers, X, Check,
  ChevronDown, ChevronUp, MapPin, Sliders, Shield,
  ArrowUpRight, RefreshCw, Eye
} from 'lucide-react';

/**
 * 6-DOF Node Inspector & Coordinate Transformation Component
 * Supports:
 * - Linear: X (Easting / Local X), Y (Northing / Local Y), Z (Elevation / Depth in meters)
 * - Rotational: Roll (θx), Pitch (θy), Yaw (θz / Heading in degrees)
 */
export const SixDofNodeInspector = ({
  selectedNode = null,
  onNodeChange,
  onClose,
  language = 'ar',
  readOnly = false
}) => {
  const [nodeData, setNodeData] = useState({
    id: '',
    label: '',
    layer: 'construction',
    lat: 24.4686,
    lng: 39.6120,
    x: 582500,
    y: 2703800,
    z: 0.0,
    roll: 0.0,
    pitch: 0.0,
    yaw: 0.0
  });

  const [activeTab, setActiveTab] = useState('linear'); // 'linear' | 'rotational'

  useEffect(() => {
    if (selectedNode) {
      setNodeData({
        id: selectedNode.id || 'N1',
        label: selectedNode.label || selectedNode.id || 'Node',
        layer: selectedNode.layer || (selectedNode.id?.startsWith('C') ? 'construction' : selectedNode.id?.startsWith('D') ? 'detour' : 'pedestrian'),
        lat: Number(selectedNode.lat || 24.4686),
        lng: Number(selectedNode.lng || 39.6120),
        x: Number(selectedNode.x || Math.round(582500 + ((selectedNode.lng || 39.612) - 39.612) * 100000)),
        y: Number(selectedNode.y || Math.round(2703800 + ((selectedNode.lat || 24.4686) - 24.4686) * 110000)),
        z: Number(selectedNode.z || 0.0),
        roll: Number(selectedNode.roll || 0.0),
        pitch: Number(selectedNode.pitch || 0.0),
        yaw: Number(selectedNode.yaw || 0.0)
      });
    }
  }, [selectedNode]);

  if (!selectedNode) return null;

  const handleFieldChange = (field, val) => {
    const num = parseFloat(val);
    const updated = {
      ...nodeData,
      [field]: isNaN(num) ? 0 : num
    };

    // If X or Y changed, calculate corresponding Lat/Lng
    if (field === 'x') {
      updated.lng = Number((39.6120 + (num - 582500) / 100000).toFixed(6));
    }
    if (field === 'y') {
      updated.lat = Number((24.4686 + (num - 2703800) / 110000).toFixed(6));
    }

    // If Lat or Lng changed, calculate corresponding X/Y
    if (field === 'lat') {
      updated.y = Math.round(2703800 + (num - 24.4686) * 110000);
    }
    if (field === 'lng') {
      updated.x = Math.round(582500 + (num - 39.6120) * 100000);
    }

    setNodeData(updated);
    if (onNodeChange) onNodeChange(updated);
  };

  const getLayerBadge = (layer) => {
    switch (layer) {
      case 'construction':
        return { bg: 'bg-blue-600', text: 'text-blue-100', border: 'border-blue-400', labelAr: 'منطقة العمل (أزرق)', labelEn: 'Construction Zone (Blue)' };
      case 'detour':
        return { bg: 'bg-orange-600', text: 'text-orange-100', border: 'border-orange-400', labelAr: 'مسار التحويلة (برتقالي)', labelEn: 'Detour Route (Orange)' };
      case 'pedestrian':
        return { bg: 'bg-emerald-600', text: 'text-emerald-100', border: 'border-emerald-400', labelAr: 'ممر المشاة (أخضر)', labelEn: 'Pedestrian Path (Green)' };
      default:
        return { bg: 'bg-slate-700', text: 'text-slate-100', border: 'border-slate-500', labelAr: 'نقطة تحكم', labelEn: 'Control Node' };
    }
  };

  const badge = getLayerBadge(nodeData.layer);

  return (
    <div
      className="bg-slate-950/95 text-white p-4 rounded-2xl border border-slate-700 shadow-2xl backdrop-blur-xl w-full max-w-sm animate-fade-in text-xs space-y-3"
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 font-bold font-mono">
            {nodeData.id}
          </div>
          <div>
            <div className="font-bold flex items-center gap-1.5">
              <span>{language === 'ar' ? 'محدد إحداثيات 6-DOF' : '6-Axis 6-DOF Node Inspector'}</span>
              <span className={`text-[9px] px-2 py-0.2 rounded-full font-bold ${badge.bg} ${badge.text}`}>
                {language === 'ar' ? badge.labelAr : badge.labelEn}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
              {nodeData.lat.toFixed(5)}°N, {nodeData.lng.toFixed(5)}°E
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Mode Tabs */}
      <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 font-bold text-[10px]">
        <button
          type="button"
          onClick={() => setActiveTab('linear')}
          className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition ${
            activeTab === 'linear'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Move3d className="w-3.5 h-3.5" />
          <span>{language === 'ar' ? 'الموقع الفراغي (X, Y, Z)' : 'Linear (X, Y, Z)'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('rotational')}
          className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition ${
            activeTab === 'rotational'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Rotate3d className="w-3.5 h-3.5" />
          <span>{language === 'ar' ? 'التوجيه والدوران (Roll, Pitch, Yaw)' : 'Rotation (Roll, Pitch, Yaw)'}</span>
        </button>
      </div>

      {/* Tab 1: Linear Coordinates (X, Y, Z) */}
      {activeTab === 'linear' && (
        <div className="space-y-2.5 animate-fade-in">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                {language === 'ar' ? 'X (الشرق - م)' : 'X (Easting m)'}
              </label>
              <input
                type="number"
                disabled={readOnly}
                value={nodeData.x}
                onChange={(e) => handleFieldChange('x', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs font-mono text-cyan-300 font-bold focus:ring-1 focus:ring-blue-500 outline-hidden"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                {language === 'ar' ? 'Y (الشمال - م)' : 'Y (Northing m)'}
              </label>
              <input
                type="number"
                disabled={readOnly}
                value={nodeData.y}
                onChange={(e) => handleFieldChange('y', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs font-mono text-cyan-300 font-bold focus:ring-1 focus:ring-blue-500 outline-hidden"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">
                {language === 'ar' ? 'Z (المنسوب / العمق - م)' : 'Z (Elevation / Depth m)'}
              </label>
              <span className="text-[10px] font-mono text-brand-gold font-bold">{nodeData.z.toFixed(2)} م</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="-10.0"
                max="20.0"
                step="0.1"
                disabled={readOnly}
                value={nodeData.z}
                onChange={(e) => handleFieldChange('z', e.target.value)}
                className="flex-1 accent-brand-gold cursor-pointer"
              />
              <input
                type="number"
                step="0.1"
                disabled={readOnly}
                value={nodeData.z}
                onChange={(e) => handleFieldChange('z', e.target.value)}
                className="w-16 bg-slate-900 border border-slate-700 rounded-lg p-1 text-center font-mono text-[11px] text-brand-gold font-bold"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Rotational Coordinates (Roll, Pitch, Yaw) */}
      {activeTab === 'rotational' && (
        <div className="space-y-2.5 animate-fade-in">
          {/* Roll (θx) */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] font-bold text-slate-400">
                Roll (θx) — {language === 'ar' ? 'الميل العرضي' : 'Cross Slope'}
              </label>
              <span className="text-[10px] font-mono text-amber-400 font-bold">{nodeData.roll.toFixed(1)}°</span>
            </div>
            <input
              type="range"
              min="-45"
              max="45"
              step="0.5"
              disabled={readOnly}
              value={nodeData.roll}
              onChange={(e) => handleFieldChange('roll', e.target.value)}
              className="w-full accent-amber-400 cursor-pointer"
            />
          </div>

          {/* Pitch (θy) */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] font-bold text-slate-400">
                Pitch (θy) — {language === 'ar' ? 'الميل الطولي' : 'Longitudinal Grade'}
              </label>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">{nodeData.pitch.toFixed(1)}°</span>
            </div>
            <input
              type="range"
              min="-30"
              max="30"
              step="0.5"
              disabled={readOnly}
              value={nodeData.pitch}
              onChange={(e) => handleFieldChange('pitch', e.target.value)}
              className="w-full accent-emerald-400 cursor-pointer"
            />
          </div>

          {/* Yaw (θz) */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] font-bold text-slate-400">
                Yaw (θz) — {language === 'ar' ? 'زاوية التوجيه / الانحراف' : 'Heading / Azimuth'}
              </label>
              <span className="text-[10px] font-mono text-cyan-400 font-bold">{nodeData.yaw.toFixed(1)}°</span>
            </div>
            <input
              type="range"
              min="0"
              max="360"
              step="1"
              disabled={readOnly}
              value={nodeData.yaw}
              onChange={(e) => handleFieldChange('yaw', e.target.value)}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[9.5px] text-slate-400">
        <span className="flex items-center gap-1 font-mono">
          <Compass className="w-3 h-3 text-blue-400" />
          <span>UTM Zone 37N (EPSG:32637)</span>
        </span>
        <span className="text-emerald-400 font-bold font-mono">
          ✓ {language === 'ar' ? 'متزامن لحظياً' : 'Live Synced'}
        </span>
      </div>
    </div>
  );
};

export default SixDofNodeInspector;
