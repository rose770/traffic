import React, { useState } from 'react';
import { Shield, Signpost, Lightbulb, Truck, CheckCircle2, XCircle, MinusCircle, Clock } from 'lucide-react';

const FieldInspectionChecklist = ({ language, onComplete }) => {
  const isArabic = language === 'ar';
  
  const sections = [
    {
      id: 'barriers',
      titleEn: 'Section A: Barrier & Devices',
      titleAr: 'القسم أ: الحواجز والأجهزة',
      icon: <Shield className="w-5 h-5" />,
      items: [
        { id: 'f1', labelEn: 'Barriers correctly aligned and continuous', labelAr: 'الحواجز مصطفة ومتصلة بشكل صحيح' },
        { id: 'f2', labelEn: 'Barrier height meets minimum standard', labelAr: 'ارتفاع الحواجز يحقق الحد الأدنى' },
        { id: 'f3', labelEn: 'Channelizing cones/drums properly spaced', labelAr: 'الأقماع/البراميل موزعة بشكل سليم' },
        { id: 'f4', labelEn: 'Delineator reflectors clean and visible', labelAr: 'عاكسات التحديد نظيفة ومرئية' },
        { id: 'f5', labelEn: 'Impact attenuators in place at taper start', labelAr: 'ممتصات الصدمات في مواقعها' }
      ]
    },
    {
      id: 'signage',
      titleEn: 'Section B: Signage',
      titleAr: 'القسم ب: اللوحات',
      icon: <Signpost className="w-5 h-5" />,
      items: [
        { id: 'f6', labelEn: 'All warning signs upright and undamaged', labelAr: 'جميع اللوحات التحذيرية سليمة' },
        { id: 'f7', labelEn: 'Sign faces clean and reflective', labelAr: 'أوجه اللوحات نظيفة وعاكسة' },
        { id: 'f8', labelEn: 'Temporary speed limit signs correct', labelAr: 'لوحات السرعة المؤقتة صحيحة' },
        { id: 'f9', labelEn: 'Detour direction signs visible', labelAr: 'لوحات اتجاه التحويلة مرئية' },
        { id: 'f10', labelEn: 'Road closed signs at correct locations', labelAr: 'لوحات إغلاق الطريق في المواقع الصحيحة' }
      ]
    },
    {
      id: 'lighting',
      titleEn: 'Section C: Lighting & Visibility',
      titleAr: 'القسم ج: الإضاءة والرؤية',
      icon: <Lightbulb className="w-5 h-5" />,
      items: [
        { id: 'f11', labelEn: 'Flashing warning beacons operational', labelAr: 'إشارات التحذير الوامضة تعمل' },
        { id: 'f12', labelEn: 'Work zone lighting ≥ 150 lux', labelAr: 'إضاءة منطقة العمل ≥ ١٥٠ لوكس' },
        { id: 'f13', labelEn: 'Solar LED arrow boards functional', labelAr: 'لوحات الأسهم LED الشمسية تعمل' },
        { id: 'f14', labelEn: 'Retroreflective tape on all barriers', labelAr: 'شريط عاكس على جميع الحواجز' },
        { id: 'f15', labelEn: 'Night visibility test passed', labelAr: 'اختبار الرؤية الليلية ناجح' }
      ]
    },
    {
      id: 'operations',
      titleEn: 'Section D: Operations',
      titleAr: 'القسم د: العمليات',
      icon: <Truck className="w-5 h-5" />,
      items: [
        { id: 'f16', labelEn: 'Safety patrol vehicle present on site', labelAr: 'مركبة دورية السلامة موجودة بالموقع' },
        { id: 'f17', labelEn: 'Emergency contact numbers posted', labelAr: 'أرقام الطوارئ معلقة' },
        { id: 'f18', labelEn: 'First aid kit available', labelAr: 'حقيبة إسعافات أولية متوفرة' },
        { id: 'f19', labelEn: 'Workers wearing high-visibility vests', labelAr: 'العمال يرتدون سترات عاكسة' },
        { id: 'f20', labelEn: 'Excavation edges protected', labelAr: 'حواف الحفر مؤمنة' }
      ]
    }
  ];

  const [results, setResults] = useState({});
  const [inspectorName, setInspectorName] = useState('');

  const handleToggle = (id, status) => {
    const timestamp = new Date().toLocaleTimeString(isArabic ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' });
    setResults(prev => ({ 
      ...prev, 
      [id]: { status, timestamp } 
    }));
  };

  const handleComplete = () => {
    if (onComplete) {
      onComplete({ inspectorName, results });
    }
  };

  const totalItems = 20;
  const answeredItems = Object.keys(results).length;
  const isComplete = answeredItems === totalItems && inspectorName.trim().length > 0;

  return (
    <div className={`p-6 bg-slate-900 border border-slate-700 rounded-xl shadow-lg text-slate-100 ${isArabic ? 'text-right' : 'text-left'}`} dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white mb-2 font-['Inter',_'Noto_Sans_Arabic']">
            {isArabic ? 'قائمة الفحص الميداني والجاهزية' : 'Field Inspection & Readiness Checklist'}
          </h2>
          <p className="text-sm text-slate-400 font-['Inter',_'Noto_Sans_Arabic']">
            {isArabic ? 'يجب إكمال جميع بنود الفحص الميداني لتأكيد جاهزية الموقع' : 'All field inspection items must be completed to confirm site readiness'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            const timestamp = new Date().toLocaleTimeString(isArabic ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' });
            const all = {};
            sections.forEach(section => section.items.forEach(item => { all[item.id] = { status: 'pass', timestamp }; }));
            setResults(all);
          }}
          className="shrink-0 px-3 py-1.5 bg-brand-gold hover:bg-brand-gold-hover text-slate-950 text-xs font-bold rounded-lg transition"
        >
          {isArabic ? 'تحديد الكل (اجتياز)' : 'Select All (Pass)'}
        </button>
      </div>

      <div className="space-y-6">
        {sections.map(section => (
          <div key={section.id} className="bg-slate-800/80 border border-slate-700 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-4 text-brand-gold">
              {section.icon}
              <h3 className="font-semibold text-white font-['Inter',_'Noto_Sans_Arabic']">
                {isArabic ? section.titleAr : section.titleEn}
              </h3>
            </div>
            
            <div className="space-y-3">
              {section.items.map(item => (
                <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-slate-900 border border-slate-700 rounded-md gap-4">
                  <div className="flex flex-col">
                    <span className="text-sm text-slate-200 font-['Inter',_'Noto_Sans_Arabic']">
                      {isArabic ? item.labelAr : item.labelEn}
                    </span>
                    {results[item.id]?.timestamp && (
                      <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3" /> {results[item.id].timestamp}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0" dir="ltr">
                    <button 
                      onClick={() => handleToggle(item.id, 'pass')}
                      className={`flex items-center justify-center p-2 rounded transition-colors ${results[item.id]?.status === 'pass' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500 border border-slate-700 hover:bg-slate-700'}`}
                      title={isArabic ? 'اجتياز' : 'Pass'}
                    >
                      <CheckCircle2 className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleToggle(item.id, 'fail')}
                      className={`flex items-center justify-center p-2 rounded transition-colors ${results[item.id]?.status === 'fail' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-slate-800 text-slate-500 border border-slate-700 hover:bg-slate-700'}`}
                      title={isArabic ? 'فشل' : 'Fail'}
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleToggle(item.id, 'na')}
                      className={`flex items-center justify-center p-2 rounded transition-colors ${results[item.id]?.status === 'na' ? 'bg-slate-600/50 text-slate-300 border border-slate-500' : 'bg-slate-800 text-slate-500 border border-slate-700 hover:bg-slate-700'}`}
                      title={isArabic ? 'غير مطبق' : 'N/A'}
                    >
                      <MinusCircle className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 pt-6 border-t border-slate-700">
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2 font-['Inter',_'Noto_Sans_Arabic']">
            {isArabic ? 'اسم المفتش' : 'Inspector Name'}
          </label>
          <input 
            type="text" 
            value={inspectorName}
            onChange={(e) => setInspectorName(e.target.value)}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-white focus:outline-none focus:border-brand-primary"
            placeholder={isArabic ? 'أدخل اسم المفتش' : 'Enter inspector name'}
          />
        </div>

        <button 
          onClick={handleComplete}
          disabled={!isComplete}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors font-['Inter',_'Noto_Sans_Arabic'] ${isComplete ? 'bg-brand-primary text-white hover:bg-brand-primary/90' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
        >
          {isArabic ? 'إكمال الفحص' : 'Complete Inspection'}
        </button>
      </div>
    </div>
  );
};

export default FieldInspectionChecklist;
