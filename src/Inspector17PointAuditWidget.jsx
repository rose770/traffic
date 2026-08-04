import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, XCircle, AlertTriangle, ShieldCheck, 
  FileCheck, Lock, Ruler, Signpost, Footprints, AlertCircle, ChevronDown, ChevronUp
} from 'lucide-react';

// Auto-evaluated items are 1, 2, 3, 4, 5, 6.
// Manual items are 7 to 17.

const Inspector17PointAuditWidget = ({ language = 'en', permitData = {}, onPassAll }) => {
  const isAr = language === 'ar';
  
  // State for manual items (null = pending, true = pass, false = fail)
  const [manualStatuses, setManualStatuses] = useState({
    7: null, 8: null, 9: null, 10: null, 11: null, 12: null, 
    13: null, 14: null, 15: null, 16: null, 17: null
  });

  const [expandedSections, setExpandedSections] = useState({
    0: true, 1: true, 2: true, 3: true
  });

  const toggleSection = (idx) => {
    setExpandedSections(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleManualCheck = (id, passed) => {
    setManualStatuses(prev => ({ ...prev, [id]: passed }));
  };

  // Mock auto-evaluation logic based on permitData
  const getAutoEvalStatus = (id) => {
    // In a real app, this would check permitData fields. 
    // Here we assume they pass if permitData exists, or simulate it.
    if (!permitData) return false;
    return true; // Simulate pass for auto-evaluated
  };

  const checklistSections = [
    {
      titleEn: 'Layout & Taper Geometry',
      titleAr: 'تخطيط وهندسة التحويلات',
      icon: <Ruler className="w-5 h-5 text-brand-gold" />,
      items: [
        { id: 1, auto: true, en: 'Transition Taper length (L) meets MOT formula minimum.', ar: 'طول منطقة التحول (L) يلبي الحد الأدنى لمعادلة وزارة النقل.' },
        { id: 2, auto: true, en: 'Longitudinal Buffer (SSD) satisfies speed stopping sight distance.', ar: 'المنطقة العازلة الطولية تحقق مسافة الرؤية للتوقف حسب السرعة.' },
        { id: 3, auto: true, en: 'Advanced Warning Zone sign distances (A, B, C, D) conform to speed lookup table.', ar: 'مسافات لوحات منطقة التحذير المسبق مطابقة لجدول السرعات.' },
        { id: 4, auto: true, en: 'Downstream Termination taper ≥ 30m.', ar: 'طول منطقة النهاية لا يقل عن 30 متر.' }
      ]
    },
    {
      titleEn: 'Barrier & Clearance Rules',
      titleAr: 'الحواجز وقواعد التباعد',
      icon: <Lock className="w-5 h-5 text-brand-gold" />,
      items: [
        { id: 5, auto: true, en: 'Mandatory barrier type enforced (Concrete vs Plastic vs Cones based on duration & depth).', ar: 'الالتزام بنوع الحاجز الإلزامي (خرساني، بلاستيكي، أقماع) بناءً على المدة والعمق.' },
        { id: 6, auto: true, en: 'Horizontal safety clearance within required bounds (0.6m-1.0m concrete, 2.5m plastic).', ar: 'منطقة الأمان الأفقية ضمن الحدود المطلوبة.' },
        { id: 7, auto: false, en: 'Crash Cushions / Impact Attenuators specified if speed ≥ 80 km/h.', ar: 'توفير وسائد امتصاص الصدمات إذا كانت السرعة ≥ 80 كم/س.' },
        { id: 8, auto: false, en: 'Barrier end terminal protection & reflection tape included.', ar: 'حماية نهايات الحواجز وتوفير الشريط العاكس.' }
      ]
    },
    {
      titleEn: 'Lane Width & Pedestrian Protection',
      titleAr: 'عرض المسار وحماية المشاة',
      icon: <Footprints className="w-5 h-5 text-brand-gold" />,
      items: [
        { id: 9, auto: false, en: 'Active lane width ≥ 3.0m (<50 km/h), ≥ 3.3m (≥ 60 km/h).', ar: 'عرض المسار الفعال مطابق لمتطلبات السرعة.' },
        { id: 10, auto: false, en: 'Pedestrian pathway continuous & width ≥ 1.5m (150cm).', ar: 'مسار المشاة مستمر وعرضه لا يقل عن 1.5 متر.' },
        { id: 11, auto: false, en: 'Accessible ramps provided at sidewalk curb cut-throughs.', ar: 'توفير منحدرات لذوي الإعاقة عند الأرصفة.' },
        { id: 12, auto: false, en: 'Protective handrails/fencing separating pedestrian channel from work zone.', ar: 'حواجز حماية تفصل مسار المشاة عن منطقة العمل.' },
        { id: 13, auto: false, en: 'Temporary steel trench plates rated for traffic load with flush milling depth ≥ 40cm bearing.', ar: 'ألواح التغطية المعدنية تتحمل الأحمال مع عمق تثبيت ≥ 40 سم.' }
      ]
    },
    {
      titleEn: 'Signage, Speed Steps & SASO Compliance',
      titleAr: 'اللوحات الإرشادية وتقليل السرعة ومطابقة ساسو',
      icon: <Signpost className="w-5 h-5 text-brand-gold" />,
      items: [
        { id: 14, auto: false, en: 'Gradual speed limit reduction steps (20 km/h per 250m).', ar: 'تقليل السرعة تدريجياً (20 كم/س لكل 250 متر).' },
        { id: 15, auto: false, en: 'Warning sign letter height meets minimum specification (≥ 100mm).', ar: 'ارتفاع أحرف اللوحات التحذيرية يطابق المواصفات.' },
        { id: 16, auto: false, en: 'Temporary signs clean, undamaged, and SASO retroreflective certified.', ar: 'اللوحات نظيفة وسليمة وعاكسة حسب مواصفات ساسو.' },
        { id: 17, auto: false, en: 'Side street & intersection advance warning signs posted.', ar: 'تركيب لوحات تحذيرية مسبقة للشوارع الجانبية والتقاطعات.' }
      ]
    }
  ];

  const totalItems = 17;
  let passedCount = 0;
  
  checklistSections.forEach(sec => {
    sec.items.forEach(item => {
      if (item.auto) {
        if (getAutoEvalStatus(item.id)) passedCount++;
      } else {
        if (manualStatuses[item.id] === true) passedCount++;
      }
    });
  });

  const allPassed = passedCount === totalItems;
  const progressPercent = Math.round((passedCount / totalItems) * 100);

  const getStatusBadge = (item) => {
    if (item.auto) {
      const passed = getAutoEvalStatus(item.id);
      if (passed) {
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            {isAr ? 'آلياً ✅' : 'Auto-Passed'}
          </span>
        );
      } else {
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-500/10 text-red-400 text-xs font-medium border border-red-500/20">
            <XCircle className="w-3.5 h-3.5" />
            {isAr ? 'مرفوض آلياً' : 'Auto-Failed'}
          </span>
        );
      }
    } else {
      const status = manualStatuses[item.id];
      if (status === true) {
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {isAr ? 'مقبول' : 'Passed'}
          </span>
        );
      } else if (status === false) {
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-500/10 text-red-400 text-xs font-medium border border-red-500/20">
            <XCircle className="w-3.5 h-3.5" />
            {isAr ? 'مرفوض' : 'Failed'}
          </span>
        );
      } else {
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 text-xs font-medium border border-amber-500/20">
            <AlertCircle className="w-3.5 h-3.5" />
            {isAr ? 'قيد المراجعة' : 'Pending'}
          </span>
        );
      }
    }
  };

  return (
    <div className={`bg-slate-900 border border-slate-700 rounded-xl p-5 text-slate-200 flex flex-col w-full ${isAr ? 'text-right' : 'text-left'}`} dir={isAr ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileCheck className="w-6 h-6 text-brand-primary" />
            {isAr ? 'المراجعة الفنية (17 نقطة إلزامية)' : '17-Point Technical Audit'}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {isAr ? 'مراجعة المفتش لاعتماد التحويلة المرورية' : 'Inspector pre-approval checklist for traffic diversion'}
          </p>
        </div>
        
        {/* Score Summary Bar */}
        <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 min-w-[250px]">
          <div className="flex justify-between items-end mb-2">
            <span className="text-xs font-medium text-slate-300">
              {isAr ? 'التقدم' : 'Progress'}
            </span>
            <span className="text-sm font-bold text-white">
              {passedCount} / {totalItems}
            </span>
          </div>
          <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${allPassed ? 'bg-emerald-500' : 'bg-brand-primary'}`}
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Checklist Sections */}
      <div className="space-y-4 mb-8">
        {checklistSections.map((section, idx) => (
          <div key={idx} className="bg-slate-800/80 rounded-lg border border-slate-700 overflow-hidden">
            <button 
              onClick={() => toggleSection(idx)}
              className="w-full flex items-center justify-between p-4 bg-slate-800 hover:bg-slate-700/80 transition-colors"
            >
              <div className="flex items-center gap-3">
                {section.icon}
                <span className="font-semibold text-sm text-white">
                  {isAr ? section.titleAr : section.titleEn}
                </span>
                <span className="bg-slate-900 text-slate-400 text-[11px] px-2 py-0.5 rounded-full border border-slate-700">
                  {section.items.length} {isAr ? 'عناصر' : 'items'}
                </span>
              </div>
              {expandedSections[idx] ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>
            
            {expandedSections[idx] && (
              <div className="p-4 border-t border-slate-700 divide-y divide-slate-700/50">
                {section.items.map((item) => (
                  <div key={item.id} className="py-3 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-900 border border-slate-600 flex items-center justify-center text-xs font-bold text-slate-400">
                        {item.id}
                      </span>
                      <p className="text-sm text-slate-300 mt-0.5 leading-relaxed">
                        {isAr ? item.ar : item.en}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-3 md:w-auto md:shrink-0 mt-2 md:mt-0 ml-9 md:ml-0">
                      {getStatusBadge(item)}
                      
                      {!item.auto && (
                        <div className="flex items-center bg-slate-900 rounded-md border border-slate-700 overflow-hidden">
                          <button
                            onClick={() => handleManualCheck(item.id, true)}
                            className={`p-1.5 hover:bg-emerald-500/20 transition-colors ${manualStatuses[item.id] === true ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400'}`}
                            title={isAr ? 'مقبول' : 'Pass'}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <div className="w-px h-4 bg-slate-700"></div>
                          <button
                            onClick={() => handleManualCheck(item.id, false)}
                            className={`p-1.5 hover:bg-red-500/20 transition-colors ${manualStatuses[item.id] === false ? 'bg-red-500/20 text-red-400' : 'text-slate-400'}`}
                            title={isAr ? 'مرفوض' : 'Fail'}
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer Action */}
      <div className="mt-auto pt-4 border-t border-slate-700 flex justify-end">
        <button
          disabled={!allPassed}
          onClick={() => {
            if (allPassed && onPassAll) {
              onPassAll();
            }
          }}
          className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            allPassed 
              ? 'bg-brand-primary hover:bg-brand-primary-hover text-white cursor-pointer shadow-lg shadow-brand-primary/20' 
              : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
          }`}
        >
          <ShieldCheck className="w-5 h-5" />
          {isAr ? 'إصدار الموافقة الفنية المبدئية' : 'Grant Technical Pre-Approval'}
        </button>
      </div>
    </div>
  );
};

export default Inspector17PointAuditWidget;
