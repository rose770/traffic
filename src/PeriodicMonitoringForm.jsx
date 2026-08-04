import React, { useState } from 'react';
import { X, ClipboardList, Download, Printer } from 'lucide-react';
import { exportDocxReport } from './docxExport';

// Step 4 — تشغيل التحويلة ومتابعة الأداء (Operate & Monitor Performance)
// Output per the source document: "تقرير متابعة تحويلة مرورية" (Form TDP-FU),
// filled by the consultant/inspector during each field visit while the
// detour is live. Responsible: المقاول / الاستشاري / إدارة السلامة المرورية.
const AXES = [
  { key: 'signs', labelAr: 'اللوحات والإرشادات', labelEn: 'Signs & Guidance', descAr: 'مواقع اللوحات والمسافات والبيئة المحيطة وخلوها من العوائق أو التلف.', descEn: 'Sign placement, distances, surroundings, free of obstruction or damage.' },
  { key: 'barriers', labelAr: 'الحواجز والمسارات', labelEn: 'Barriers & Paths', descAr: 'ثبات الحواجز وكفاية عرض المسار ووضوح الاستدقاق وعدم وجود نهايات خطرة أو تعارض.', descEn: 'Barrier stability, path width, clear tapering, no dangerous ends or conflicts.' },
  { key: 'lighting', labelAr: 'السلامة الليلية والمشاة', labelEn: 'Night Safety & Pedestrians', descAr: 'الإضاءة والوماضات والعواكس وتأمين مسارات المشاة والمداخل والمخارج الجانبية.', descEn: 'Lighting, flashers, reflectors, and securing pedestrian paths/side entries.' },
  { key: 'cleanliness', labelAr: 'النظافة والصيانة', labelEn: 'Cleanliness & Maintenance', descAr: 'إزالة المخلفات وصيانة العناصر التالفة فوراً ورصد الشكاوى أو الحوادث إن وجدت.', descEn: 'Debris removal, immediate repair of damaged elements, logging complaints/incidents.' }
];

const PeriodicMonitoringForm = ({ isOpen, onClose, permit, language, onSave }) => {
  const isArabic = language === 'ar';
  const [reportNo] = useState(`TDP-FU-${Math.floor(1000 + Math.random() * 9000)}`);
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
  const [visitTime, setVisitTime] = useState(new Date().toTimeString().slice(0, 5));
  const [direction, setDirection] = useState('');
  const [weather, setWeather] = useState('');
  const [decision, setDecision] = useState('continue'); // continue | conditional | halt
  const [axisResults, setAxisResults] = useState({});
  const [mainNotes, setMainNotes] = useState(['', '', '', '', '']);
  const [followUp, setFollowUp] = useState('');
  const [responsiblePerson, setResponsiblePerson] = useState('');
  const [closeDate, setCloseDate] = useState('');
  const [signers, setSigners] = useState({ contractor: '', consultant: '', safety_dept: '', owner_approval: '' });

  if (!isOpen || !permit) return null;

  const setAxis = (key, field, value) => setAxisResults(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [field]: value } }));
  const setNote = (i, value) => setMainNotes(prev => prev.map((n, idx) => (idx === i ? value : n)));

  const statusLabel = (s) => ({ full: isArabic ? 'مطابق' : 'Full', partial: isArabic ? 'جزئي' : 'Partial', none: isArabic ? 'غير مطابق' : 'Non-compliant' }[s] || '—');
  const decisionLabel = { continue: isArabic ? 'استمرار التشغيل' : 'Continue Operation', conditional: isArabic ? 'تشغيل مشروط' : 'Conditional Operation', halt: isArabic ? 'تعديل/إيقاف لحين المعالجة' : 'Halt/Modify Pending Correction' }[decision];

  const buildBlocks = () => [
    { type: 'fields', pairs: [
      ['رقم التقرير', 'Report No.', reportNo],
      ['اسم المشروع', 'Project Name', permit.projectNameAr || permit.projectNameEn || ''],
      ['المقاول', 'Contractor', permit.contractingCompanyAr || permit.contractingCompanyEn || ''],
      ['الاستشاري', 'Consultant', permit.consultantNameAr || permit.consultantNameEn || ''],
      ['رقم التحويلة/التصريح', 'Permit No.', permit.id || ''],
      ['تاريخ الزيارة', 'Visit Date', visitDate],
      ['الوقت', 'Time', visitTime],
      ['الموقع/الطريق', 'Location/Road', permit.locationAr || permit.locationEn || ''],
      ['اتجاه الحركة', 'Traffic Direction', direction],
      ['حالة الطقس/الرؤية', 'Weather/Visibility', weather],
      ['قرار الزيارة', 'Visit Decision', decisionLabel]
    ]},
    { type: 'table',
      headersAr: ['محور المتابعة', 'الحالة', 'الملاحظات/الإجراء المطلوب'],
      headersEn: ['Monitoring Axis', 'Status', 'Notes/Required Action'],
      rows: AXES.map(ax => [isArabic ? ax.labelAr : ax.labelEn, statusLabel(axisResults[ax.key]?.status), axisResults[ax.key]?.note || ''])
    },
    { type: 'heading', textAr: 'ملاحظات رئيسية', textEn: 'Main Notes' },
    { type: 'paragraph', textAr: mainNotes.filter(Boolean).map((n, i) => `${i + 1}. ${n}`).join('\n') || 'لا توجد ملاحظات.', textEn: mainNotes.filter(Boolean).map((n, i) => `${i + 1}. ${n}`).join('\n') || 'No notes.' },
    { type: 'fields', pairs: [
      ['المتابعة اللاحقة', 'Follow-up', followUp],
      ['المسؤول', 'Responsible', responsiblePerson],
      ['تاريخ الإغلاق', 'Closure Date', closeDate]
    ]},
    { type: 'signatures', signers: [
      { roleAr: 'ممثل المقاول', roleEn: 'Contractor Representative', name: signers.contractor, date: visitDate },
      { roleAr: 'الاستشاري المشرف', roleEn: 'Supervising Consultant', name: signers.consultant, date: visitDate },
      { roleAr: 'إدارة الصحة والسلامة المهنية', roleEn: 'Health & Safety Dept.', name: signers.safety_dept, date: visitDate },
      { roleAr: 'اعتماد الجهة المالكة', roleEn: 'Owning Authority Approval', name: signers.owner_approval, date: visitDate }
    ]}
  ];

  const handleExportWord = () => {
    exportDocxReport({
      titleAr: 'تقرير متابعة الأداء',
      titleEn: 'Performance Monitoring Report',
      blocks: buildBlocks(),
      fileName: `TDP-FU_${permit.id}`,
      isArabic
    });
  };

  const handleSave = () => {
    const payload = { permitId: permit.db_id || permit.id, reportNo, visitDate, visitTime, direction, weather, decision, axisResults, mainNotes, followUp, responsiblePerson, closeDate, signers };
    if (onSave) onSave(payload);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden my-8 max-h-[92vh] overflow-y-auto" dir={isArabic ? 'rtl' : 'ltr'}>
        <div className="flex justify-between items-center p-5 border-b border-slate-200 sticky top-0 bg-white z-10">
          <h3 className="text-brand-text-dark font-extrabold text-sm flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-brand-primary" />
            {isArabic ? `تقرير متابعة الأداء — ${reportNo}` : `Performance Monitoring Report — ${reportNo}`}
          </h3>
          <button onClick={onClose} className="p-1.5 bg-slate-100 hover:bg-red-500 hover:text-white rounded-full transition"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-brand-light border border-slate-200 rounded-lg p-4 text-xs">
            <div><span className="font-bold text-brand-text-gray block">{isArabic ? 'اسم المشروع' : 'Project'}</span>{permit.projectNameAr || permit.projectNameEn}</div>
            <div><span className="font-bold text-brand-text-gray block">{isArabic ? 'المقاول' : 'Contractor'}</span>{permit.contractingCompanyAr || permit.contractingCompanyEn || '—'}</div>
            <div><span className="font-bold text-brand-text-gray block">{isArabic ? 'الاستشاري' : 'Consultant'}</span>{permit.consultantNameAr || permit.consultantNameEn || '—'}</div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div><label className="block text-[11px] font-bold text-brand-text-gray mb-1">{isArabic ? 'تاريخ الزيارة' : 'Visit Date'}</label>
              <input type="date" value={visitDate} onChange={e => setVisitDate(e.target.value)} className="w-full border border-slate-200 rounded p-2 text-xs" /></div>
            <div><label className="block text-[11px] font-bold text-brand-text-gray mb-1">{isArabic ? 'الوقت' : 'Time'}</label>
              <input type="time" value={visitTime} onChange={e => setVisitTime(e.target.value)} className="w-full border border-slate-200 rounded p-2 text-xs" /></div>
            <div><label className="block text-[11px] font-bold text-brand-text-gray mb-1">{isArabic ? 'اتجاه الحركة' : 'Direction'}</label>
              <input type="text" value={direction} onChange={e => setDirection(e.target.value)} className="w-full border border-slate-200 rounded p-2 text-xs" /></div>
            <div><label className="block text-[11px] font-bold text-brand-text-gray mb-1">{isArabic ? 'حالة الطقس/الرؤية' : 'Weather/Visibility'}</label>
              <input type="text" value={weather} onChange={e => setWeather(e.target.value)} className="w-full border border-slate-200 rounded p-2 text-xs" /></div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-brand-text-gray mb-1.5">{isArabic ? 'قرار الزيارة' : 'Visit Decision'}</label>
            <div className="flex flex-wrap gap-2">
              {['continue', 'conditional', 'halt'].map(d => (
                <button key={d} onClick={() => setDecision(d)} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition ${decision === d ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white text-brand-text-gray border-slate-200'}`}>
                  {{ continue: isArabic ? 'استمرار التشغيل' : 'Continue', conditional: isArabic ? 'تشغيل مشروط' : 'Conditional', halt: isArabic ? 'تعديل/إيقاف' : 'Halt/Modify' }[d]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {AXES.map(ax => (
              <div key={ax.key} className="border border-slate-200 rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-xs text-brand-text-dark">{isArabic ? ax.labelAr : ax.labelEn}</p>
                    <p className="text-[11px] text-brand-text-gray">{isArabic ? ax.descAr : ax.descEn}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {['full', 'partial', 'none'].map(s => (
                      <button key={s} onClick={() => setAxis(ax.key, 'status', s)} className={`px-2 py-1 rounded text-[10px] font-bold border ${axisResults[ax.key]?.status === s ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white text-brand-text-gray border-slate-200'}`}>
                        {statusLabel(s)}
                      </button>
                    ))}
                  </div>
                </div>
                <input type="text" placeholder={isArabic ? 'الملاحظات/الإجراء المطلوب' : 'Notes / required action'} value={axisResults[ax.key]?.note || ''} onChange={e => setAxis(ax.key, 'note', e.target.value)} className="w-full border border-slate-200 rounded p-2 text-[11px]" />
              </div>
            ))}
          </div>

          <div>
            <label className="block text-[11px] font-bold text-brand-text-gray mb-1.5">{isArabic ? 'ملاحظات رئيسية' : 'Main Notes'}</label>
            <div className="space-y-1.5">
              {mainNotes.map((n, i) => (
                <input key={i} type="text" placeholder={`${i + 1}.`} value={n} onChange={e => setNote(i, e.target.value)} className="w-full border border-slate-200 rounded p-2 text-[11px]" />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div><label className="block text-[11px] font-bold text-brand-text-gray mb-1">{isArabic ? 'المتابعة اللاحقة' : 'Follow-up'}</label>
              <input type="text" value={followUp} onChange={e => setFollowUp(e.target.value)} placeholder={isArabic ? 'إعادة زيارة / صور إغلاق / محضر اعتماد / لا يلزم' : 'Revisit / photos / closure minutes / none'} className="w-full border border-slate-200 rounded p-2 text-xs" /></div>
            <div><label className="block text-[11px] font-bold text-brand-text-gray mb-1">{isArabic ? 'المسؤول' : 'Responsible'}</label>
              <input type="text" value={responsiblePerson} onChange={e => setResponsiblePerson(e.target.value)} className="w-full border border-slate-200 rounded p-2 text-xs" /></div>
            <div><label className="block text-[11px] font-bold text-brand-text-gray mb-1">{isArabic ? 'تاريخ الإغلاق' : 'Closure Date'}</label>
              <input type="date" value={closeDate} onChange={e => setCloseDate(e.target.value)} className="w-full border border-slate-200 rounded p-2 text-xs" /></div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-brand-light px-4 py-2.5 border-b border-slate-200">
              <h4 className="font-bold text-xs text-brand-text-dark">{isArabic ? 'التوقيعات' : 'Signatures'}</h4>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-100">
              {[
                { key: 'contractor', labelAr: 'ممثل المقاول', labelEn: 'Contractor Rep.' },
                { key: 'consultant', labelAr: 'الاستشاري المشرف', labelEn: 'Supervising Consultant' },
                { key: 'safety_dept', labelAr: 'إدارة الصحة والسلامة المهنية', labelEn: 'Health & Safety Dept.' },
                { key: 'owner_approval', labelAr: 'اعتماد الجهة المالكة', labelEn: 'Owner Approval' }
              ].map(s => (
                <div key={s.key} className="p-3 space-y-1.5">
                  <p className="text-[10px] font-bold text-brand-text-gray text-center leading-tight">{isArabic ? s.labelAr : s.labelEn}</p>
                  <input type="text" placeholder={isArabic ? 'الاسم' : 'Name'} value={signers[s.key]} onChange={e => setSigners(prev => ({ ...prev, [s.key]: e.target.value }))} className="w-full text-[11px] border border-slate-200 rounded p-1.5 text-center" />
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
            <button onClick={handleSave} className="flex-1 min-w-[140px] py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-white font-bold text-xs rounded-lg transition">
              {isArabic ? 'حفظ التقرير' : 'Save Report'}
            </button>
            <button onClick={handleExportWord} className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-brand-primary text-brand-primary hover:bg-brand-light font-bold text-xs rounded-lg transition">
              <Download className="w-3.5 h-3.5" /> {isArabic ? 'تصدير Word' : 'Export Word'}
            </button>
            <button onClick={() => window.print()} className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-slate-300 text-brand-text-dark hover:bg-slate-50 font-bold text-xs rounded-lg transition">
              <Printer className="w-3.5 h-3.5" /> {isArabic ? 'تصدير PDF (طباعة)' : 'Export PDF (Print)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PeriodicMonitoringForm;
