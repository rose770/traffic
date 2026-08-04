import React, { useState } from 'react';
import { 
  ClipboardCheck, ShieldAlert, CheckCircle2, AlertCircle, 
  XCircle, FileText, Send, X, Shield, Award 
} from 'lucide-react';

const ActiveDetourMonitoringModal = ({ isOpen, onClose, permit, language = 'ar', onSaveAudit }) => {
  if (!isOpen) return null;

  const isAr = language === 'ar';

  const [decision, setDecision] = useState('FULL_COMPLIANCE');
  const [domainScores, setDomainScores] = useState({
    signage: 'SATISFACTORY',
    barriers: 'SATISFACTORY',
    lighting: 'SATISFACTORY',
    cleanliness: 'SATISFACTORY'
  });
  const [domainNotes, setDomainNotes] = useState({
    signage: '',
    barriers: '',
    lighting: '',
    cleanliness: ''
  });
  const [generalNotes, setGeneralNotes] = useState('');
  const [inspectorName, setInspectorName] = useState('مفتش السلامة المرورية');
  const [badgeId, setBadgeId] = useState('INS-9042');

  const handleDomainScoreChange = (domain, score) => {
    setDomainScores(prev => ({ ...prev, [domain]: score }));
  };

  const handleDomainNotesChange = (domain, text) => {
    setDomainNotes(prev => ({ ...prev, [domain]: text }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const auditPayload = {
      permitId: permit?.id || 1,
      decision,
      domainScores,
      domainNotes,
      generalNotes,
      inspectorName,
      badgeId,
      timestamp: new Date().toISOString()
    };
    if (onSaveAudit) onSaveAudit(auditPayload);
    onClose();
  };

  const domainDefs = [
    {
      key: 'signage',
      titleAr: '١. اللوحات الإرشادية والتوجيه',
      titleEn: '1. Signage & Guidance',
      itemsAr: ['وضوح وثبات لوحات السرعة والتحذير المتقدم', 'مطابقة المواد العاكسة SASO للرؤية الليلية', 'عدم وجود لوحات مرورية دائمة متعارضة أو محجوبة'],
      itemsEn: ['Visibility and stability of advance warning and speed signs', 'SASO retroreflectivity compliance at night', 'No conflicting or obscured permanent signs']
    },
    {
      key: 'barriers',
      titleAr: '٢. الحواجز المرورية ومسار الحارات',
      titleEn: '2. Barriers & Lane Redirection',
      itemsAr: ['استقامة الحواجز الخرسانية/البلاستيكية وتماسك التوصيل', 'تعبئة الحواجز البلاستيكية بالماء/الرمل للوزن التشغيلي', 'تركيب مصدات امتصاص الصدمات في بداية التدرج'],
      itemsEn: ['Alignment and inter-locking continuity of safety barriers', 'Water/sand fill levels in plastic barriers', 'Crash cushions at transition taper starts']
    },
    {
      key: 'lighting',
      titleAr: '٣. السلامة الليلية وممرات المشاة',
      titleEn: '3. Night Safety & Pedestrian Routes',
      itemsAr: ['جاهزية أبراج الإضاءة وتحقيق شدة ١٥٠ لوكس', 'عمل إشارات التحذير الوامضة ولوحات الأسهم الشمسية', 'تأمين مسار مشاة مستمر بعرض ≥ ١٥٠ سم خالي من الحفر'],
      itemsEn: ['150 Lux lighting tower operation across work zone', 'Flashing warning beacons & LED solar arrow boards functional', 'Continuous pedestrian route ≥ 150cm clear of trenches']
    },
    {
      key: 'cleanliness',
      titleAr: '٤. النظافة والصيانة ودورية السلامة',
      titleEn: '4. Cleanliness, Maintenance & Safety Patrol',
      itemsAr: ['رفع الأتربة والمخلفات وتنسيق تشوين المواد', 'تواجد مركبة دورية السلامة المرورية في الموقع', 'تعليق أرقام الطوارئ والتجاوب السريع لإصلاح التلفيات'],
      itemsEn: ['Daily site cleanup, debris removal & material staging', 'Safety patrol vehicle active on site', 'Emergency contacts posted & immediate equipment repairs']
    }
  ];

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="bg-slate-900 border border-slate-700 text-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-6 relative my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isAr ? 'محضر التفتيش والمتابعة الدورية للتحويلة (نموذج TDP-FU)' : 'Periodic Detour Operational Audit (Form TDP-FU)'}
              </h3>
              <p className="text-xs text-slate-400">
                {isAr ? `تصريح رقم #${permit?.id || 1} — ${permit?.data?.projectNameAr || 'طريق الملك عبدالعزيز'}` : `Permit #${permit?.id || 1} — ${permit?.data?.projectNameEn || 'King Abdulaziz Rd'}`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* 4 Compliance Audit Domains */}
          <div className="space-y-4">
            {domainDefs.map((dom) => (
              <div key={dom.key} className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/60 pb-2.5">
                  <h4 className="text-xs font-bold text-brand-gold">{isAr ? dom.titleAr : dom.titleEn}</h4>
                  
                  {/* Score Selector */}
                  <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-lg border border-slate-700 text-[11px]">
                    <button
                      type="button"
                      onClick={() => handleDomainScoreChange(dom.key, 'SATISFACTORY')}
                      className={`px-2.5 py-1 rounded font-bold transition ${domainScores[dom.key] === 'SATISFACTORY' ? 'bg-emerald-500 text-white shadow-xs' : 'text-slate-400 hover:text-white'}`}
                    >
                      {isAr ? 'ممتاز (١٠٠٪)' : 'Satisfactory (100%)'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDomainScoreChange(dom.key, 'CONDITIONAL')}
                      className={`px-2.5 py-1 rounded font-bold transition ${domainScores[dom.key] === 'CONDITIONAL' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-400 hover:text-white'}`}
                    >
                      {isAr ? 'مقبول بشروط (٧٠٪)' : 'Conditional (70%)'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDomainScoreChange(dom.key, 'DEFICIENT')}
                      className={`px-2.5 py-1 rounded font-bold transition ${domainScores[dom.key] === 'DEFICIENT' ? 'bg-red-500 text-white shadow-xs' : 'text-slate-400 hover:text-white'}`}
                    >
                      {isAr ? 'غير مطابق (٠٪)' : 'Deficient (0%)'}
                    </button>
                  </div>
                </div>

                {/* Audit points list */}
                <ul className="text-[11px] text-slate-300 space-y-1 list-disc list-inside">
                  {(isAr ? dom.itemsAr : dom.itemsEn).map((it, idx) => (
                    <li key={idx}>{it}</li>
                  ))}
                </ul>

                <input
                  type="text"
                  placeholder={isAr ? 'أدخل ملاحظات مفتش الأمانة على هذا البند...' : 'Enter inspector findings for this domain...'}
                  value={domainNotes[dom.key]}
                  onChange={(e) => handleDomainNotesChange(dom.key, e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-brand-gold"
                />
              </div>
            ))}
          </div>

          {/* Overall Enforcement Decision */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <label className="block text-xs font-bold text-slate-300 uppercase">
              {isAr ? 'القرار التشغيلي النهائي لمفتش الأمانة:' : 'Inspector Operational Enforcement Decision:'}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setDecision('FULL_COMPLIANCE')}
                className={`p-3 rounded-xl border text-xs font-bold text-center transition flex flex-col items-center gap-1.5 ${decision === 'FULL_COMPLIANCE' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-md' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'}`}
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>{isAr ? 'مطابق بالكامل (استمرار التشغيل)' : 'Full Compliance (Continue)'}</span>
              </button>

              <button
                type="button"
                onClick={() => setDecision('CONDITIONAL_NOTICE')}
                className={`p-3 rounded-xl border text-xs font-bold text-center transition flex flex-col items-center gap-1.5 ${decision === 'CONDITIONAL_NOTICE' ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-md' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'}`}
              >
                <AlertCircle className="w-5 h-5" />
                <span>{isAr ? 'إشعار تصحيحي (مهلة ٤٨ ساعة)' : '48-Hour Correction Notice'}</span>
              </button>

              <button
                type="button"
                onClick={() => setDecision('HALT_OPERATIONS')}
                className={`p-3 rounded-xl border text-xs font-bold text-center transition flex flex-col items-center gap-1.5 ${decision === 'HALT_OPERATIONS' ? 'bg-red-500/20 border-red-500 text-red-400 shadow-md' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'}`}
              >
                <XCircle className="w-5 h-5" />
                <span>{isAr ? 'إيقاف التحويلة حتى التصحيح' : 'Halt Detour Operations'}</span>
              </button>
            </div>

            <textarea
              rows="2"
              placeholder={isAr ? 'أدخل التوصيات الإضافية أو قرارات الإيقاف إن وجدت...' : 'Enter overall inspector recommendations or penalty notes...'}
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              className="w-full mt-2 bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-brand-gold"
            />
          </div>

          {/* Inspector E-ID & Footer Submit */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-slate-800">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <input
                type="text"
                value={inspectorName}
                onChange={(e) => setInspectorName(e.target.value)}
                placeholder="اسم المفتش"
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
              />
              <input
                type="text"
                value={badgeId}
                onChange={(e) => setBadgeId(e.target.value)}
                placeholder="رقم الشارة"
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono w-28 text-center"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-800 transition"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold bg-brand-gold hover:bg-brand-gold/90 text-slate-950 flex items-center gap-2 transition shadow-lg shadow-brand-gold/20"
              >
                <Send className="w-4 h-4" />
                <span>{isAr ? 'حفظ وإصدار محضر التفتيش الدوري' : 'Save & Issue Periodic Audit Log'}</span>
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};

export default ActiveDetourMonitoringModal;
