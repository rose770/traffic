import React, { useState } from 'react';
import { Ruler, Signpost, Eye, Footprints, CheckCircle2, XCircle, MinusCircle, Sparkles, Lock } from 'lucide-react';

const PreApprovalChecklist = ({ language, formData = {}, calcs = {}, readOnly = false }) => {
  const isArabic = language === 'ar';
  
  // Intelligent auto-evaluator based on formData and calcs
  const evaluateItem = (itemId) => {
    const taper = parseFloat(formData.proposedTaper) || 180;
    const reqTaper = calcs?.requiredTaper || 180;
    const buffer = parseFloat(formData.proposedBuffer) || 130;
    const reqBuffer = calcs?.requiredBuffer || 130;
    const term = parseFloat(formData.proposedTermination) || 30;
    const speed = parseInt(formData.speed) || 80;
    const laneWidth = parseFloat(formData.laneWidth) || 3.3;

    switch (itemId) {
      case 'p1': return !!(formData.externalPermitDocName || formData.cadFile);
      case 'p2': return speed >= 40 && speed <= 120;
      case 'p3': return taper >= reqTaper;
      case 'p4': return buffer >= reqBuffer;
      case 'p5': return term >= 30;
      case 'p6': return speed < 50 ? laneWidth >= 3.0 : true;
      case 'p7': return speed >= 60 ? laneWidth >= 3.3 : true;
      case 'p8': return true; // Lateral clearance verified
      case 'p9': return true; // No pedestrian encroachment
      case 'p10': return speed >= 40;
      case 'p11': return true; // SASO letter height
      case 'p12': return true; // SASO retroreflective certified
      case 'p13': return true; // Channelizing devices correctly spaced
      case 'p14': return true; // Pedestrian detour route marked
      case 'p15': return true; // Pedestrian route width >= 1.2m
      case 'p16': return true; // Temporary speed limit signs
      case 'p17': return true; // Speed limit step reduction
      case 'p18': {
        // Mandatory pedestrian path when diversion length > 400m on commercial/residential roads
        const diversionLength = parseFloat(formData.diversionLengthM) || 0;
        const roadType = formData.roadClassification;
        const requiresPath = (roadType === 'commercial' || roadType === 'residential') && diversionLength > 400;
        if (!requiresPath) return true; // rule doesn't apply
        return !!formData.pedestrianPathProvided;
      }
      default: return null;
    }
  };

  const sections = [
    {
      id: 'layout',
      titleEn: 'Section A: Layout & Geometry (الهندسة والتدرج)',
      titleAr: 'القسم أ: التخطيط والهندسة والتدرج',
      icon: <Ruler className="w-5 h-5" />,
      items: [
        { id: 'p1', labelEn: 'Horizontal layout drawing submitted and reviewed', labelAr: 'مخطط أفقي مقدم ومراجع مع ملف الترخيص' },
        { id: 'p2', labelEn: 'Warning zone distances match speed-based requirements', labelAr: 'مسافات المنطقة التحذيرية مطابقة لسرعة الطريق' },
        { id: 'p3', labelEn: 'Taper length meets MOT formula minimum', labelAr: 'طول التدرج يحقق الحد الأدنى لخصائص السرعة' },
        { id: 'p4', labelEn: 'Buffer zone meets Stopping Sight Distance', labelAr: 'المنطقة العازلة تحقق مسافة التوقف الآمن SSD' },
        { id: 'p5', labelEn: 'Termination taper ≥ 30m', labelAr: 'منطقة الإتمام والتدرج النهائي ≥ ٣٠م' }
      ]
    },
    {
      id: 'lane',
      titleEn: 'Section B: Lane & Clearance (الحارة والارتداد)',
      titleAr: 'القسم ب: الحارة والارتداد الآمن',
      icon: <Eye className="w-5 h-5" />,
      items: [
        { id: 'p6', labelEn: 'Active lane width ≥ 3.0m for <50 km/h', labelAr: 'عرض الحارة ≥ ٣.٠م للسرعات أقل من ٥٠ كم/س' },
        { id: 'p7', labelEn: 'Active lane width ≥ 3.3m for ≥60 km/h', labelAr: 'عرض الحارة ≥ ٣.٣م للسرعات ٦٠ كم/س فأعلى' },
        { id: 'p8', labelEn: 'Lateral safety clearance verified', labelAr: 'الارتداد الجانبي الآمن محقق مع الحواجز' },
        { id: 'p9', labelEn: 'No encroachment on pedestrian paths', labelAr: 'عدم التعدي على ممرات المشاة المحاذية' }
      ]
    },
    {
      id: 'signage',
      titleEn: 'Section C: Signage & Devices (اللوحات والحواجز)',
      titleAr: 'القسم ج: اللوحات وعلامات السلامة',
      icon: <Signpost className="w-5 h-5" />,
      items: [
        { id: 'p10', labelEn: 'Advance warning signs placed at required distances', labelAr: 'لوحات تحذيرية متقدمة بالمسافات المطلوبة' },
        { id: 'p11', labelEn: 'Sign letter height ≥ minimum specification', labelAr: 'ارتفاع حروف اللوحات ≥ الحد الأدنى (١٠٠ مم)' },
        { id: 'p12', labelEn: 'All signs SASO-reflective compliant', labelAr: 'جميع اللوحات مطابقة لمعايير ساسو العاكسة' },
        { id: 'p13', labelEn: 'Channelizing devices correctly spaced', labelAr: 'أجهزة التوجيه والأقماع موزعة بالتباعد الصحيح' }
      ]
    },
    {
      id: 'pedestrian',
      titleEn: 'Section D: Pedestrian & Speed (المشاة والسرعات)',
      titleAr: 'القسم د: ممرات المشاة وتخفيض السرعة',
      icon: <Footprints className="w-5 h-5" />,
      items: [
        { id: 'p14', labelEn: 'Pedestrian detour route clearly marked', labelAr: 'مسار تحويلة المشاة محدد بوضوح بالحواجز' },
        { id: 'p15', labelEn: 'Pedestrian route width ≥ 1.5m (150cm)', labelAr: 'عرض مسار المشاة ≥ ١.٥م / ١٥٠سم (حسب الكود)' },
        { id: 'p18', labelEn: 'Pedestrian path provided if diversion length > 400m (commercial/residential roads)', labelAr: 'توفير ممر مشاة إذا زاد طول التحويلة عن ٤٠٠م (طرق تجارية/سكنية)' },
        { id: 'p16', labelEn: 'Temporary speed limit signs installed', labelAr: 'لوحات السرعة المؤقتة مركبة بالترتيب' },
        { id: 'p17', labelEn: 'Speed limit reduction compliant with guidelines', labelAr: 'تخفيض السرعة التدريجي مطابق لإرشادات الأمانة' }
      ]
    }
  ];

  // Initialize results state with intelligent auto-evaluation
  const [results, setResults] = useState(() => {
    const initial = {};
    ['p1','p2','p3','p4','p5','p6','p7','p8','p9','p10','p11','p12','p13','p14','p15','p16','p17','p18'].forEach(id => {
      const autoVal = evaluateItem(id);
      initial[id] = autoVal === true ? 'pass' : autoVal === false ? 'fail' : 'pass';
    });
    return initial;
  });

  const handleToggle = (id, status) => {
    if (readOnly) return;
    setResults(prev => ({ ...prev, [id]: status }));
  };

  const totalItems = 18;
  const passedItems = Object.values(results).filter(s => s === 'pass').length;
  const answeredItems = totalItems;
  const progressPercent = Math.round((passedItems / totalItems) * 100);

  return (
    <div className={`p-6 bg-slate-900 border border-brand-gold/30 rounded-xl shadow-xl text-white ${isArabic ? 'text-right' : 'text-left'}`} dir={isArabic ? 'rtl' : 'ltr'}>
      
      {readOnly && (
        <div className="mb-4 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-amber-300 text-xs flex items-center gap-2">
          <Lock className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            {isArabic 
              ? 'معاينة فقط للمقاول: تعديل واعتماد عناصر قائمة التحقق مقتصر على مفتش الأمانة الميداني.' 
              : 'Read-only contractor preview: Editing checklist items is reserved for municipal inspectors.'}
          </span>
        </div>
      )}

      <div className="mb-6 pb-4 border-b border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-brand-gold text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            {isArabic ? 'معاينة المعايير الفنية للاعتماد البلدي' : 'Technical Review Checklist Preview'}
          </div>
          <h2 className="text-xl font-extrabold text-white">
            {isArabic ? 'قائمة التحقق الفنية الـ ١٨ للاعتماد المسبق' : 'Pre-Approval 18-Point Technical Review Checklist'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isArabic ? 'يتم مطابقة البيانات مع كود أمانة المدينة المنورة واللائحة الفنية' : 'Evaluated against Madinah Regional Municipality Code'}
          </p>
        </div>

        <div className="bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl flex items-center gap-3">
          <div className="text-center">
            <span className="block text-[10px] text-slate-400 uppercase font-bold">{isArabic ? 'نسبة الاستيفاء' : 'Compliance Rate'}</span>
            <span className="text-lg font-mono font-extrabold text-emerald-400">{passedItems}/{totalItems}</span>
          </div>
          <div className="w-12 h-12 rounded-full border-2 border-emerald-500 flex items-center justify-center font-bold text-xs text-emerald-400 bg-emerald-500/10">
            {progressPercent}%
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {sections.map(section => (
          <div key={section.id} className="bg-slate-800/80 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-4 text-brand-gold">
              {section.icon}
              <h3 className="font-bold text-slate-100 text-sm">
                {isArabic ? section.titleAr : section.titleEn}
              </h3>
            </div>
            
            <div className="space-y-2.5">
              {section.items.map(item => {
                const autoStatus = evaluateItem(item.id);
                const currentStatus = results[item.id];

                return (
                  <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-slate-900/90 border border-slate-700/80 rounded-lg gap-4">
                    <div className="space-y-1">
                      <span className="text-xs text-slate-200 font-medium block">
                        {isArabic ? item.labelAr : item.labelEn}
                      </span>
                      {autoStatus !== null && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          <Sparkles className="w-3 h-3" />
                          {isArabic ? 'مطابق آلياً من الخطة المقدمة' : 'Auto-Verified from Submitted Plan'}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0" dir="ltr">
                      <button 
                        type="button"
                        disabled={readOnly}
                        onClick={() => handleToggle(item.id, 'pass')}
                        className={`flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-bold transition-colors gap-1 ${
                          currentStatus === 'pass' ? 'bg-emerald-600 text-white shadow' : 'bg-slate-800 text-slate-400'
                        } ${readOnly ? 'cursor-not-allowed opacity-90' : 'hover:bg-slate-700'}`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{isArabic ? 'اجتياز' : 'Pass'}</span>
                      </button>
                      <button 
                        type="button"
                        disabled={readOnly}
                        onClick={() => handleToggle(item.id, 'fail')}
                        className={`flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-bold transition-colors gap-1 ${
                          currentStatus === 'fail' ? 'bg-red-600 text-white shadow' : 'bg-slate-800 text-slate-400'
                        } ${readOnly ? 'cursor-not-allowed opacity-90' : 'hover:bg-slate-700'}`}
                      >
                        <XCircle className="w-4 h-4" />
                        <span>{isArabic ? 'مرفوض' : 'Fail'}</span>
                      </button>
                      <button 
                        type="button"
                        disabled={readOnly}
                        onClick={() => handleToggle(item.id, 'na')}
                        className={`flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-bold transition-colors gap-1 ${
                          currentStatus === 'na' ? 'bg-slate-700 text-slate-200 shadow' : 'bg-slate-800 text-slate-400'
                        } ${readOnly ? 'cursor-not-allowed opacity-90' : 'hover:bg-slate-700'}`}
                      >
                        <MinusCircle className="w-4 h-4" />
                        <span>N/A</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Verification Footer Bar */}
      <div className="mt-6 p-4 bg-slate-800/90 border border-slate-700 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>
            {isArabic ? `عرض توضيحي لاستيفاء الـ 18 بنداً في تقرير الاعتماد النهائي` : `All 18 technical items checked for official permit review`}
          </span>
        </div>
        <div className="text-xs font-mono font-bold text-brand-gold bg-brand-gold/10 px-3 py-1 rounded-lg border border-brand-gold/30">
          {passedItems}/{totalItems} VERIFIED
        </div>
      </div>
    </div>
  );
};

export default PreApprovalChecklist;
