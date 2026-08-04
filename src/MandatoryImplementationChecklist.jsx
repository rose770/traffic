import React, { useState } from 'react';
import { ListChecks, CheckCircle2, XCircle, MinusCircle, Info } from 'lucide-react';
import { MANDATORY_IMPLEMENTATION_REQUIREMENTS } from './trafficStandards';

// This checklist covers EXECUTION SEQUENCING requirements
// ("متطلبات تنفيذ خطة تحويل الحركة المرورية في مناطق العمل") — i.e. how the
// diversion must be rolled out/operated/torn down in the correct order and
// with the correct supporting logistics (staffing, gates, timing).
//
// It is intentionally separate from FieldInspectionChecklist.jsx, which
// covers physical READINESS of installed devices (barriers/signs/lighting)
// at a point in time, not the sequencing/process rules themselves.

const MandatoryImplementationChecklist = ({ language = 'ar', onComplete }) => {
  const isAr = language === 'ar';
  const [results, setResults] = useState({});

  const handleToggle = (id, status) => {
    setResults(prev => ({ ...prev, [id]: status }));
  };

  const totalItems = MANDATORY_IMPLEMENTATION_REQUIREMENTS.length;
  const answeredItems = Object.keys(results).length;
  const passedItems = Object.values(results).filter(s => s === 'pass').length;
  const progressPercent = Math.round((passedItems / totalItems) * 100);
  const isComplete = answeredItems === totalItems;

  const handleComplete = () => {
    if (onComplete) onComplete({ results });
  };

  return (
    <div className={`p-6 bg-slate-900 border border-slate-700 rounded-xl shadow-lg text-slate-100 ${isAr ? 'text-right' : 'text-left'}`} dir={isAr ? 'rtl' : 'ltr'}>
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
            <ListChecks className="w-6 h-6 text-brand-gold" />
            {isAr ? 'متطلبات تنفيذ خطة تحويل الحركة المرورية (20 بنداً)' : '20 Mandatory Implementation Requirements'}
          </h2>
          <p className="text-sm text-slate-400">
            {isAr
              ? 'يغطي هذا النموذج تسلسل تنفيذ التحويلة ميدانياً (المراحل، الجدولة، اللوجستيات) — مختلف عن قائمة فحص الجاهزية.'
              : 'Covers on-site execution sequencing (phasing, scheduling, logistics) — distinct from the field readiness checklist.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              const all = {};
              MANDATORY_IMPLEMENTATION_REQUIREMENTS.forEach(item => { all[item.id] = 'pass'; });
              setResults(all);
            }}
            className="shrink-0 px-3 py-1.5 bg-brand-gold hover:bg-brand-gold-hover text-slate-950 text-xs font-bold rounded-lg transition"
          >
            {isAr ? 'تحديد الكل (مطبق)' : 'Select All (Done)'}
          </button>
          <div className="bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl min-w-[180px]">
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>{isAr ? 'التقدم' : 'Progress'}</span>
              <span className="font-bold text-white">{passedItems}/{totalItems}</span>
            </div>
            <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
              <div className="h-full bg-brand-primary rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4 bg-brand-primary/10 border border-brand-primary/30 rounded-lg p-3 text-xs text-brand-primary flex items-start gap-2">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          {isAr
            ? 'الهدف: ضمان سلامة الحركة المرورية ومستخدمي الطريق أثناء تنفيذ الأعمال.'
            : 'Goal: ensure the safety of traffic flow and road users during execution of works.'}
        </span>
      </div>

      <div className="space-y-2.5">
        {MANDATORY_IMPLEMENTATION_REQUIREMENTS.map(item => (
          <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-slate-800/80 border border-slate-700 rounded-lg gap-3">
            <div className="flex items-start gap-3 flex-1">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-900 border border-slate-600 flex items-center justify-center text-xs font-bold text-slate-400">
                {item.id}
              </span>
              <p className="text-sm text-slate-200 leading-relaxed mt-0.5">{isAr ? item.ar : item.en}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0" dir="ltr">
              <button
                onClick={() => handleToggle(item.id, 'pass')}
                className={`p-1.5 rounded transition-colors ${results[item.id] === 'pass' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-900 text-slate-500 border border-slate-700 hover:bg-slate-700'}`}
                title={isAr ? 'مطبق' : 'Done'}
              >
                <CheckCircle2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleToggle(item.id, 'fail')}
                className={`p-1.5 rounded transition-colors ${results[item.id] === 'fail' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-slate-900 text-slate-500 border border-slate-700 hover:bg-slate-700'}`}
                title={isAr ? 'غير مطبق' : 'Not done'}
              >
                <XCircle className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleToggle(item.id, 'na')}
                className={`p-1.5 rounded transition-colors ${results[item.id] === 'na' ? 'bg-slate-600/50 text-slate-300 border border-slate-500' : 'bg-slate-900 text-slate-500 border border-slate-700 hover:bg-slate-700'}`}
                title={isAr ? 'غير منطبق' : 'N/A'}
              >
                <MinusCircle className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-slate-700">
        <button
          onClick={handleComplete}
          disabled={!isComplete}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${isComplete ? 'bg-brand-primary text-white hover:bg-brand-primary/90' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
        >
          {isAr ? 'اعتماد قائمة التنفيذ' : 'Confirm Implementation Checklist'}
        </button>
      </div>
    </div>
  );
};

export default MandatoryImplementationChecklist;
