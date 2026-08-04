import React, { useState, useEffect } from 'react';
import { X, FileSignature, Download, Printer, CheckCircle2 } from 'lucide-react';
import { exportDocxReport } from './docxExport';
import SignatureBlock, { SIGNER_ROLES } from './SignatureBlock';
import { getHijriAndDayName } from './hijriDate';

// Step 2 — مراجعة واعتماد التحويلة وإصدار التصاريح (Review & Approve, Issue Permits)
// Output: "محضر فتح تحويلة" — signed once the plan is approved and permits
// are issued, granting permission to open the detour. Uses the same 5-party
// SignatureBlock as Step 5's closure minutes (same signer roles on both
// official forms). The permit is only actually approved once every signer
// here has filled in a name and date — that's the real "اعتماد تصريح" gate.
const DetourOpeningMinutesForm = ({ isOpen, onClose, permit, language, onSave, onApprove }) => {
  const isArabic = language === 'ar';
  const [gregorianDate, setGregorianDate] = useState(new Date().toISOString().split('T')[0]);
  const [signatures, setSignatures] = useState({});

  const projectName = permit?.projectNameAr || permit?.projectNameEn || '';
  const contractor = permit?.contractingCompanyAr || permit?.contractingCompanyEn || '';
  const consultant = permit?.consultantNameAr || permit?.consultantNameEn || '';
  const roadName = permit ? (isArabic ? (permit.roadNameAr || permit.roadNameEn) : (permit.roadNameEn || permit.roadNameAr)) || '' : '';

  // Seed the Contractor/Consultant signer NAME fields from what the
  // contractor already typed in at submission — no manual re-typing.
  useEffect(() => {
    if (permit && isOpen) {
      setSignatures(prev => ({
        ...prev,
        contractor: { ...prev.contractor, name: prev.contractor?.name || contractor },
        consultant: { ...prev.consultant, name: prev.consultant?.name || consultant }
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permit?.id, isOpen]);

  if (!isOpen || !permit) return null;

  const allSigned = SIGNER_ROLES.every(role => signatures[role.key]?.name && signatures[role.key]?.date);
  const { hijriAr, hijriEn, dayNameAr, dayNameEn } = getHijriAndDayName(gregorianDate);
  const hijriDate = isArabic ? hijriAr : hijriEn;
  const dayName = isArabic ? dayNameAr : dayNameEn;

  const narrativeAr = `أنه في يوم ${dayNameAr || '............'}، الموافق ${hijriAr || '.... /.... /144'}هـ، تم الوقوف على التحويلة المرورية على طريق ${roadName || '............'}، والتي تنقل حركة السيارات من طريق ${roadName || '............'} بمشروع ${projectName || '............'}. وتبيَّن الالتزام بالمخططات والمواصفات المعتمدة، ولا مانع من فتح التحويلة اعتباراً من تاريخه. وعلى ذلك جرى التوقيع.`;
  const narrativeEn = `On ${dayNameEn || '_______'}, corresponding to ${hijriEn || '__/__/144'}H, the traffic detour on ${roadName || '_______'} road (project: ${projectName || '_______'}) was inspected. Compliance with the approved plans and specifications was confirmed, and there is no objection to opening the detour effective this date. Signed accordingly.`;

  const buildBlocks = () => [
    { type: 'fields', pairs: [
      ['اسم المشروع', 'Project Name', projectName],
      ['المقاول', 'Contractor', contractor],
      ['الاستشاري', 'Consultant', consultant],
      ['اسم الطريق', 'Road Name', roadName],
      ['التاريخ الهجري', 'Hijri Date', hijriDate],
      ['التاريخ الميلادي', 'Gregorian Date', gregorianDate]
    ]},
    { type: 'heading', textAr: 'محضر فتح تحويلة', textEn: 'Detour Opening Minutes' },
    { type: 'paragraph', textAr: narrativeAr, textEn: narrativeEn },
    { type: 'signatures', signers: Object.entries(signatures).map(([key, val]) => {
      const roleMap = { contractor: ['مندوب المقاول', 'Contractor Representative'], consultant: ['الاستشاري', 'Consultant'], safety_dept: ['مندوب إدارة السلامة', 'Safety Dept. Delegate'], maintenance_contractor: ['مقاول الصيانة', 'Maintenance Contractor'], maintenance_consultant: ['استشاري الصيانة', 'Maintenance Consultant'] };
      return { roleAr: roleMap[key]?.[0] || key, roleEn: roleMap[key]?.[1] || key, name: val?.name || '', date: val?.date || '' };
    })}
  ];

  const handleExportWord = () => {
    exportDocxReport({
      titleAr: 'محضر فتح تحويلة',
      titleEn: 'Detour Opening Minutes',
      blocks: buildBlocks(),
      fileName: `Opening_Minutes_${permit.id}`,
      isArabic
    });
  };

  const handleSave = () => {
    if (onSave) onSave({ permitId: permit.db_id || permit.id, dayName: dayNameAr, hijriDate: hijriAr, gregorianDate, roadName, signatures });
  };

  const handleApprove = () => {
    handleSave();
    if (onApprove) onApprove(permit.id);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden my-8 max-h-[92vh] overflow-y-auto" dir={isArabic ? 'rtl' : 'ltr'}>
        <div className="flex justify-between items-center p-5 border-b border-slate-200 sticky top-0 bg-white z-10">
          <h3 className="text-brand-text-dark font-extrabold text-sm flex items-center gap-2">
            <FileSignature className="w-5 h-5 text-brand-primary" />
            {isArabic ? 'محضر فتح تحويلة' : 'Detour Opening Minutes'}
          </h3>
          <button onClick={onClose} className="p-1.5 bg-slate-100 hover:bg-red-500 hover:text-white rounded-full transition"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-brand-light border border-slate-200 rounded-lg p-4 text-xs">
            <div><span className="font-bold text-brand-text-gray block">{isArabic ? 'اسم المشروع' : 'Project'}</span>{projectName || '—'}</div>
            <div><span className="font-bold text-brand-text-gray block">{isArabic ? 'المقاول' : 'Contractor'}</span>{contractor || '—'}</div>
            <div><span className="font-bold text-brand-text-gray block">{isArabic ? 'الاستشاري' : 'Consultant'}</span>{consultant || '—'}</div>
            <div><span className="font-bold text-brand-text-gray block">{isArabic ? 'اسم الطريق' : 'Road'}</span>{roadName || '—'}</div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div><label className="block text-[11px] font-bold text-brand-text-gray mb-1">{isArabic ? 'التاريخ الميلادي' : 'Gregorian Date'}</label>
              <input type="date" value={gregorianDate} onChange={e => setGregorianDate(e.target.value)} className="w-full border border-slate-200 rounded p-2 text-xs" /></div>
            <div><label className="block text-[11px] font-bold text-brand-text-gray mb-1">{isArabic ? 'اسم اليوم' : 'Day Name'}</label>
              <div className="w-full border border-slate-200 bg-slate-50 rounded p-2 text-xs text-brand-text-dark">{dayName || '—'}</div></div>
            <div><label className="block text-[11px] font-bold text-brand-text-gray mb-1">{isArabic ? 'التاريخ الهجري (أم القرى)' : 'Hijri Date (Umm al-Qura)'}</label>
              <div className="w-full border border-slate-200 bg-slate-50 rounded p-2 text-xs text-brand-text-dark">{hijriDate || '—'}</div></div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs leading-relaxed text-brand-text-dark">
            {isArabic ? narrativeAr : narrativeEn}
          </div>

          <SignatureBlock language={language} signatures={signatures} onChange={setSignatures} />

          {!allSigned && (
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-center">
              {isArabic
                ? 'يجب استكمال اسم وتاريخ جميع الموقعين الخمسة قبل اعتماد التصريح.'
                : 'All 5 signers need a name and date filled in before the permit can be approved.'}
            </p>
          )}

          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
            <button onClick={handleSave} className="flex-1 min-w-[140px] py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-white font-bold text-xs rounded-lg transition">
              {isArabic ? 'حفظ المحضر' : 'Save Minutes'}
            </button>
            <button onClick={handleExportWord} className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-brand-primary text-brand-primary hover:bg-brand-light font-bold text-xs rounded-lg transition">
              <Download className="w-3.5 h-3.5" /> {isArabic ? 'تصدير Word' : 'Export Word'}
            </button>
            <button onClick={() => window.print()} className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-slate-300 text-brand-text-dark hover:bg-slate-50 font-bold text-xs rounded-lg transition">
              <Printer className="w-3.5 h-3.5" /> {isArabic ? 'تصدير PDF (طباعة)' : 'Export PDF (Print)'}
            </button>
            {allSigned && (
              <button onClick={handleApprove} className="flex-1 min-w-[160px] flex items-center justify-center gap-1.5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-lg transition shadow">
                <CheckCircle2 className="w-4 h-4" /> {isArabic ? 'اعتماد تصريح' : 'Approve Permit'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetourOpeningMinutesForm;

