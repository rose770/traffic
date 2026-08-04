import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, ClipboardCheck, CheckCircle2, Download, Printer } from 'lucide-react';
import FieldInspectionChecklist from './FieldInspectionChecklist';
import MandatoryImplementationChecklist from './MandatoryImplementationChecklist';
import { exportDocxReport } from './docxExport';

// Stage 3 of the official process: "تنفيذ والتحقق من الجاهزية" (Execute & Verify
// Readiness). Responsible per the source requirements document: المقاول/الاستشاري/
// إدارة السلامة (jointly). Opened from the Inspector's "Active Approved Work Zones"
// tab, AFTER Stage-2 approval and BEFORE the detour is treated as open/operating.
// Sequences the project's existing 3.4 (Field Inspection) and 3.4b (Mandatory
// Execution Sequencing) checklists into one signed readiness report, satisfying
// decision gate 3: "محضر الجاهزية قبل التشغيل".
const READINESS_ITEMS = [
  { key: 'paths', labelAr: 'المسارات: آمنة ومتصلة وخالية من العوائق', labelEn: 'Paths: safe, connected, obstacle-free' },
  { key: 'signs', labelAr: 'اللوحات: مكتملة ومتسلسلة ومقروءة', labelEn: 'Signs: complete, sequential, readable' },
  { key: 'barriers', labelAr: 'الحواجز: مثبتة ومستمرة وتؤمن منطقة العمل', labelEn: 'Barriers: fixed, continuous, securing the work zone' },
  { key: 'pedestrians', labelAr: 'المشاة: مسار آمن أو تحويلة واضحة عند الحاجة', labelEn: 'Pedestrians: safe path provided when needed' },
  { key: 'lighting', labelAr: 'الإضاءة: كفاية الرؤية الليلية حول منطقة العمل', labelEn: 'Lighting: sufficient night visibility' }
];

const FieldReadinessModal = ({ isOpen, onClose, permit, language, onCompleteReadiness }) => {
  const isArabic = language === 'ar';
  const [step, setStep] = useState('field'); // 'field' | 'sequencing' | 'done'
  const [fieldResults, setFieldResults] = useState(null);
  const [sequencingResults, setSequencingResults] = useState(null);
  const [readinessStatus, setReadinessStatus] = useState({});

  // Without this, reopening this modal for a permit that was already
  // approved (or reopening after a page refresh) always started back at
  // the blank field-inspection form \u2014 the checklist state lives only in
  // FieldInspectionChecklist/MandatoryImplementationChecklist's own local
  // state, which is never persisted or re-fetched. This at least stops
  // presenting an already-approved permit as if nothing had been done yet.
  useEffect(() => {
    if (isOpen && permit) {
      setStep(permit.readiness_status === 'verified' ? 'done' : 'field');
    }
  }, [isOpen, permit?.id, permit?.readiness_status]);

  if (!isOpen || !permit) return null;

  const handleFieldComplete = (data) => {
    setFieldResults(data);
    setStep('sequencing');
  };

  const handleSequencingComplete = (data) => {
    setSequencingResults(data);
    setStep('done');
  };

  const handleApproveReadiness = () => {
    const payload = {
      permitId: permit.db_id || permit.id,
      fieldInspection: fieldResults,
      executionSequencing: sequencingResults,
      completedAt: new Date().toISOString()
    };
    if (onCompleteReadiness) onCompleteReadiness(payload);
  };

  const handleExportWord = () => {
    exportDocxReport({
      titleAr: 'محضر جاهزية التحويلة قبل التشغيل',
      titleEn: 'Detour Readiness Report (Before Operation)',
      fileName: `Readiness_Report_${permit.id}`,
      isArabic,
      blocks: [
        { type: 'fields', pairs: [
          ['اسم المشروع', 'Project Name', permit.projectNameAr || permit.projectNameEn || ''],
          ['المقاول', 'Contractor', permit.contractingCompanyAr || permit.contractingCompanyEn || ''],
          ['الاستشاري', 'Consultant', permit.consultantNameAr || permit.consultantNameEn || ''],
          ['رقم التحويلة/التصريح', 'Permit No.', permit.id || '']
        ]},
        { type: 'heading', textAr: 'قائمة فحص الجاهزية المختصرة', textEn: 'Short Readiness Checklist' },
        { type: 'table',
          headersAr: ['البند', 'الحالة'],
          headersEn: ['Item', 'Status'],
          rows: READINESS_ITEMS.map(item => [isArabic ? item.labelAr : item.labelEn, readinessStatus[item.key] ? (isArabic ? '✓ مطابق' : '✓ OK') : (isArabic ? 'لم يُحدد' : 'Not marked')])
        },
        { type: 'paragraph',
          textAr: 'تم استيفاء التفتيش الميداني (٣.٤) ومتطلبات تسلسل التنفيذ (٣.٤ب)، ولا مانع من فتح التحويلة للحركة المرورية اعتباراً من تاريخه.',
          textEn: 'Field Inspection (3.4) and Execution Sequencing Requirements (3.4b) have been satisfied. There is no objection to opening the detour to traffic effective this date.'
        }
      ]
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-950 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden my-8 relative animate-fade-in max-h-[92vh] overflow-y-auto border border-brand-gold/30">
        <div className="flex justify-between items-center p-5 border-b border-slate-800 sticky top-0 bg-slate-950 z-10">
          <div className="flex items-center gap-2 text-white font-extrabold text-sm">
            <ShieldCheck className="w-5 h-5 text-brand-gold" />
            <span>
              {isArabic
                ? `التحقق من الجاهزية والتنفيذ — ${permit.projectNameAr || permit.projectNameEn} (${permit.id})`
                : `Execute & Verify Readiness — ${permit.projectNameEn || permit.projectNameAr} (${permit.id})`}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 bg-slate-800 hover:bg-red-500 hover:text-white rounded-full transition text-slate-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step tracker */}
        <div className="flex items-center gap-3 px-5 pt-4 text-xs font-bold">
          <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${step === 'field' ? 'bg-brand-gold/20 text-brand-gold' : 'bg-emerald-500/10 text-emerald-400'}`}>
            <ClipboardCheck className="w-3.5 h-3.5" /> {isArabic ? '١. التفتيش الميداني (٣.٤)' : '1. Field Inspection (3.4)'}
          </span>
          <span className="text-slate-600">→</span>
          <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${step === 'sequencing' ? 'bg-brand-gold/20 text-brand-gold' : step === 'done' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
            <ClipboardCheck className="w-3.5 h-3.5" /> {isArabic ? '٢. تسلسل التنفيذ (٣.٤ب)' : '2. Execution Sequencing (3.4b)'}
          </span>
          <span className="text-slate-600">→</span>
          <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${step === 'done' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
            <CheckCircle2 className="w-3.5 h-3.5" /> {isArabic ? '٣. محضر الجاهزية' : '3. Readiness Report'}
          </span>
        </div>

        <div className="p-5">
          {step === 'field' && (
            <FieldInspectionChecklist language={language} onComplete={handleFieldComplete} />
          )}
          {step === 'sequencing' && (
            <MandatoryImplementationChecklist language={language} onComplete={handleSequencingComplete} />
          )}
          {step === 'done' && (
            <div className="space-y-5">
              <div className="text-center space-y-2 pb-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h3 className="text-white font-extrabold text-base">
                  {isArabic ? 'الفحصان مكتملان \u2014 أكمل محضر الجاهزية أدناه' : 'Both checklists complete \u2014 finish the readiness report below'}
                </h3>
              </div>

              <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-brand-gold">
                    {isArabic ? 'قائمة فحص الجاهزية المختصرة' : 'Short Readiness Checklist'}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setReadinessStatus(Object.fromEntries(READINESS_ITEMS.map(item => [item.key, true])))}
                    className="text-[11px] font-bold text-brand-gold hover:text-brand-gold-hover underline transition"
                  >
                    {isArabic ? 'تحديد الكل' : 'Select All'}
                  </button>
                </div>
                {READINESS_ITEMS.map(item => (
                  <label key={item.key} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!readinessStatus[item.key]}
                      onChange={(e) => setReadinessStatus(prev => ({ ...prev, [item.key]: e.target.checked }))}
                      className="w-4 h-4"
                    />
                    {isArabic ? item.labelAr : item.labelEn}
                  </label>
                ))}
              </div>

              <p className="text-slate-400 text-xs text-center max-w-md mx-auto">
                {isArabic
                  ? 'راجع القائمة أعلاه ثم اضغط "اعتماد الجاهزية" لاستيفاء بوابة القرار الثالثة ونقل التحويلة إلى مرحلة المتابعة الدورية.'
                  : 'Review the checklist above, then click "Approve Readiness" to satisfy decision gate 3 and move this detour into the monitoring stage.'}
              </p>

              <div className="flex flex-wrap gap-2 justify-center pt-2 border-t border-slate-800">
                <button onClick={handleApproveReadiness} className="flex items-center justify-center gap-1.5 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition shadow order-first w-full sm:w-auto sm:order-none">
                  <CheckCircle2 className="w-4 h-4" /> {isArabic ? 'اعتماد الجاهزية' : 'Approve Readiness'}
                </button>
                <button onClick={handleExportWord} className="flex items-center gap-1.5 px-4 py-2 bg-brand-gold hover:bg-brand-gold-hover text-slate-950 text-xs font-bold rounded-lg transition">
                  <Download className="w-3.5 h-3.5" /> {isArabic ? 'تصدير Word' : 'Export Word'}
                </button>
                <button onClick={() => window.print()} className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition">
                  <Printer className="w-3.5 h-3.5" /> {isArabic ? 'تصدير PDF (طباعة)' : 'Export PDF (Print)'}
                </button>
                <button onClick={onClose} className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg transition">
                  {isArabic ? 'إغلاق بدون اعتماد' : 'Close without approving'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FieldReadinessModal;
