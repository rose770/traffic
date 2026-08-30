import React, { useState } from 'react';
import { X, BookOpen, ArrowRight, Shield, FileText, FileSignature, ShieldCheck, ClipboardCheck, FileCheck, Wrench, Activity, Trash2, Building2, Globe } from 'lucide-react';
import TrafficReferenceGuide from './TrafficReferenceGuide';

// The 5 official stages, straight from the source requirements document
// (مراحل اعتماد وتنفيذ التحويلات المرورية). Shown once after login so
// contractors and inspectors both see the whole lifecycle before diving
// into their specific screen. Each stage is clickable and expands into
// that stage's real pipeline + relevant action, based on the official
// step-by-step process pages (الخطوة 1-5).
//
// `id` is the REAL official step number (1-5) and drives both the badge
// shown and the role-based filtering below — it does NOT shift when a
// stage is hidden for a given role.
const STAGES = [
  {
    id: 1,
    icon: FileText,
    titleAr: 'إعداد ورفع الطلب',
    titleEn: 'Prepare & Submit Request',
    ownerAr: 'المقاول / الاستشاري',
    ownerEn: 'Contractor / Consultant',
    outputAr: 'طلب مكتمل ومستوفٍ للاشتراطات',
    outputEn: 'Complete, compliant request',
    pipelineAr: ['إعداد خطة التحويلة', 'دراسة الحركة المرورية', 'إعداد المخططات CAD/PDF', 'مراجعة فنية قبل الرفع', 'استكمال المستندات والرفع'],
    pipelineEn: ['Prepare detour plan', 'Traffic study', 'Prepare CAD/PDF plans', 'Technical self-review', 'Complete docs & submit'],
    actionType: 'submit',
    inspectorTab: null // not relevant to inspectors — this stage is hidden for that role
  },
  {
    id: 2,
    icon: Shield,
    titleAr: 'مراجعة واعتماد خطة التحكم المروري',
    titleEn: 'Review & Approve Traffic Control Plan',
    ownerAr: 'إدارة السلامة المرورية / الجهات المختصة',
    ownerEn: 'Traffic Safety Mgmt / Competent Authorities',
    outputAr: 'تحويلة معتمدة وتصاريح صادرة',
    outputEn: 'Approved detour + issued permits',
    pipelineAr: ['استلام الطلب', 'مراجعة فنية', 'استكمال ملاحظات', 'تنسيق مروري/خدمي', 'معاينة موقع', 'إصدار الموافقة'],
    pipelineEn: ['Receive request', 'Technical review', 'Resolve comments', 'Traffic/utility coordination', 'Site inspection', 'Issue approval'],
    actionType: 'review',
    inspectorTab: 'inbox'
  },
  {
    id: 3,
    icon: Wrench,
    titleAr: 'تنفيذ والتحقق من الجاهزية',
    titleEn: 'Execute & Verify Readiness',
    ownerAr: 'المقاول / الاستشاري / إدارة السلامة',
    ownerEn: 'Contractor / Consultant / Safety Mgmt (joint)',
    outputAr: 'تحويلة منفذة وجاهزة للتشغيل',
    outputEn: 'Executed detour, ready to operate',
    pipelineAr: ['إصدار تصريح بدء التنفيذ', 'تركيب اللوحات والحواجز', 'معاينة الاستشاري للموقع', 'التحقق من المطابقة ليلاً ونهاراً', 'محضر جاهزية موقّع'],
    pipelineEn: ['Issue start-of-execution permit', 'Install signs & barriers', "Consultant's site inspection", 'Day/night compliance check', 'Signed readiness report'],
    checklistAr: ['المسارات: آمنة ومتصلة وخالية من العوائق', 'اللوحات: مكتملة ومتسلسلة ومقروءة', 'الحواجز: مثبتة ومستمرة وتؤمن منطقة العمل', 'المشاة: مسار آمن أو تحويلة واضحة عند الحاجة', 'الإضاءة: كفاية الرؤية الليلية حول منطقة العمل'],
    checklistEn: ['Paths: safe, connected, obstacle-free', 'Signs: complete, sequential, readable', 'Barriers: fixed, continuous, securing the work zone', 'Pedestrians: safe path provided when needed', 'Lighting: sufficient night visibility'],
    actionType: 'readiness',
    inspectorTab: 'active_approved',
    zoneFilter: 'readiness'
  },
  {
    id: 4,
    icon: Activity,
    titleAr: 'تشغيل ومتابعة الأداء',
    titleEn: 'Operate & Monitor Performance',
    ownerAr: 'المقاول / الاستشاري / إدارة السلامة',
    ownerEn: 'Contractor / Consultant / Safety Mgmt (joint)',
    outputAr: 'تقارير متابعة دورية',
    outputEn: 'Periodic monitoring reports',
    pipelineAr: ['فتح التحويلة', 'مراقبة الحركة', 'رصد البلاغات', 'الصيانة الدورية', 'تحديث السلامة', 'تقرير دوري'],
    pipelineEn: ['Open the detour', 'Monitor traffic', 'Log reports', 'Periodic maintenance', 'Safety updates', 'Periodic report'],
    actionType: 'monitor',
    inspectorTab: 'active_approved',
    zoneFilter: 'monitoring'
  },
  {
    id: 5,
    icon: Trash2,
    titleAr: 'إزالة وإغلاق التحويلة',
    titleEn: 'Remove & Close the Detour',
    ownerAr: 'المقاول / الاستشاري / إدارة السلامة',
    ownerEn: 'Contractor / Consultant / Safety Mgmt (joint)',
    outputAr: 'محضر إغلاق وإعادة الوضع الطبيعي',
    outputEn: 'Closure & restoration report',
    pipelineAr: ['قبل الإزالة: التحقق من انتهاء الحاجة والموافقة', 'أثناء الإزالة: إزالة العناصر وإعادة الوضع الطبيعي', 'بعد الإزالة: توثيق الحالة النهائية ومحضر الإغلاق'],
    pipelineEn: ['Before: confirm no longer needed + get approval', 'During: remove elements, restore road', 'After: document final state, issue closure report'],
    actionType: 'closure',
    inspectorTab: 'active_approved',
    zoneFilter: 'closure'
  }
];

const ProcessHomeScreen = ({ language, onToggleLanguage, userRole, formData, calcs, pendingCount = 0, myPermits = [], onContinue, getDocumentAvailability, onOpenDocument }) => {
  const isArabic = language === 'ar';
  const [guideOpen, setGuideOpen] = useState(false);
  const [requestsOpen, setRequestsOpen] = useState(false);
  const [documentsOpen, setDocumentsOpen] = useState(false);

  // Step 1 (Prepare & Submit) is explicitly the contractor's job in the
  // source document — an inspector never performs it, so it's hidden
  // entirely rather than shown as a dead-end card. Conversely, Steps 2-5
  // are the reviewing authority's job — a contractor has nothing to click
  // into there, so only Step 1 is shown for that role.
  const visibleStages = STAGES.filter(s => s.id !== 1);

  // Contractor-facing status summary — since they only see Step 1's card,
  // this is how they know where their submissions actually stand in the
  // rest of the pipeline they can't click into themselves.
  const pendingReview = myPermits.filter(p => p.status !== 'Approved' && p.status !== 'Rejected' && p.status !== 'Resolved').length;
  const approvedCount = myPermits.filter(p => p.status === 'Approved').length;
  const rejectedCount = myPermits.filter(p => p.status === 'Rejected').length;

  return (
    <div className="min-h-screen bg-brand-light text-brand-text-dark py-10 px-4 sm:px-6 lg:px-8 font-sans" dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="max-w-5xl mx-auto bg-brand-light-card border border-brand-primary/10 rounded-2xl shadow-2xl overflow-hidden">

        <div className="bg-gradient-to-r from-brand-dark via-brand-primary to-brand-dark px-8 py-8 border-b-2 border-brand-gold/30">
          <div className="flex justify-end mb-4">
            <button
              onClick={onToggleLanguage}
              className="flex items-center gap-2 px-3 py-1.5 bg-brand-dark-hover/40 hover:bg-brand-dark-hover/70 border border-brand-gold/30 rounded-lg text-xs font-semibold text-brand-gold transition shadow"
            >
              <Globe className="h-3.5 w-3.5" />
              <span>{isArabic ? 'English' : 'العربية'}</span>
            </button>
          </div>
          <div className="flex items-center gap-2 text-brand-gold text-xs font-bold uppercase tracking-wider mb-1">
            <Building2 className="h-4 w-4" />
            {isArabic ? 'التحويلات المرورية — التخطيط، الاعتماد، التنفيذ، الإزالة' : 'Traffic Detours — Planning, Approval, Execution, Removal'}
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            {isArabic ? 'مراحل اعتماد وتنفيذ التحويلات المرورية' : 'The Traffic Detour Process'}
          </h1>
          <p className="text-brand-light/70 mt-2 text-sm max-w-2xl">
            {userRole === 'inspector'
              ? (isArabic ? 'اضغط على أي مرحلة لعرض تفاصيلها والانتقال إليها مباشرة.' : 'Click any stage to see its details and jump straight to it.')
              : (isArabic ? 'يمكنك مراجعة سجل طلباتك ومستنداتك أو الاطلاع على الدليل الفني قبل تقديم طلب جديد.' : 'Review your requests and documents, or check the guide before submitting a new request.')}
          </p>
        </div>

        <div className="p-6 sm:p-8 space-y-8">
          {userRole === 'inspector' && (
            <>
          <div className={`grid grid-cols-1 ${visibleStages.length >= 4 ? 'sm:grid-cols-2' : ''} ${visibleStages.length === 5 ? 'lg:grid-cols-5' : visibleStages.length === 4 ? 'lg:grid-cols-4' : 'max-w-xs mx-auto'} gap-4`}>
            {visibleStages.map((stage) => {
              const Icon = stage.icon;
              return (
                <button
                  key={stage.id}
                  onClick={() => onContinue(stage.inspectorTab, stage.zoneFilter)}
                  className="text-left bg-white border border-slate-200 hover:border-brand-primary/40 hover:shadow-md rounded-xl p-4 space-y-2 relative transition shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="w-7 h-7 rounded-full bg-brand-gold/15 text-brand-gold-hover font-extrabold text-xs flex items-center justify-center">
                      {stage.id}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {stage.id === 2 && userRole === 'inspector' && pendingCount > 0 && (
                        <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-extrabold rounded-full">{pendingCount}</span>
                      )}
                      <Icon className="w-5 h-5 text-brand-primary" />
                    </div>
                  </div>
                  <h3 className="font-bold text-sm leading-snug text-brand-text-dark">{isArabic ? stage.titleAr : stage.titleEn}</h3>
                  <p className="text-[10px] text-brand-text-gray uppercase font-bold tracking-wide">
                    {isArabic ? stage.ownerAr : stage.ownerEn}
                  </p>
                  <p className="text-[11px] text-brand-primary border-t border-slate-100 pt-2 font-semibold">
                    {isArabic ? stage.outputAr : stage.outputEn}
                  </p>
                </button>
              );
            })}
          </div>

            </>
          )}

          <div className={`grid grid-cols-1 ${userRole !== 'inspector' ? 'sm:grid-cols-3' : ''} gap-4`}>
            <button
              onClick={() => setGuideOpen(true)}
              className="flex items-center gap-3 bg-white hover:bg-brand-light border border-brand-gold/30 rounded-xl p-5 text-left transition shadow-sm"
            >
              <BookOpen className="w-8 h-8 text-brand-gold-hover shrink-0" />
              <div>
                <h4 className="font-bold text-sm text-brand-text-dark">{isArabic ? '📖 الدليل الفني' : '📖 Guide'}</h4>
                <p className="text-[11px] text-brand-text-gray">
                  {isArabic ? 'دليل المرجعية الفنية للتحويلات المرورية (تعريفات، جداول، مصفوفة الحواجز)' : 'Technical reference guide (definitions, sign tables, barrier matrix)'}
                </p>
              </div>
            </button>

            {userRole !== 'inspector' && (
              <button
                onClick={() => setRequestsOpen(true)}
                className="flex items-center gap-3 bg-white hover:bg-brand-light border border-brand-primary/30 rounded-xl p-5 text-left transition shadow-sm relative"
              >
                <FileText className="w-8 h-8 text-brand-primary shrink-0" />
                <div>
                  <h4 className="font-bold text-sm text-brand-text-dark">{isArabic ? '📋 سجل طلباتي' : '📋 My Requests'}</h4>
                  <p className="text-[11px] text-brand-text-gray">
                    {isArabic ? 'سجل طلبات الترخيص وحالتها وتوجيهات المفتش' : 'Your permit requests, status & inspector directives'}
                  </p>
                </div>
                {myPermits.some(p => p.status === 'Rejected' || (p.inspector_notes && p.inspector_notes.trim().length > 0)) && (
                  <span className="absolute top-3 right-3 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                  </span>
                )}
              </button>
            )}

            {userRole !== 'inspector' && (
              <button
                onClick={() => setDocumentsOpen(true)}
                className="flex items-center gap-3 bg-white hover:bg-brand-light border border-brand-primary/30 rounded-xl p-5 text-left transition shadow-sm"
              >
                <FileSignature className="w-8 h-8 text-brand-primary shrink-0" />
                <div>
                  <h4 className="font-bold text-sm text-brand-text-dark">{isArabic ? '📄 المستندات' : '📄 Documents'}</h4>
                  <p className="text-[11px] text-brand-text-gray">
                    {isArabic ? 'المستندات الرسمية الصادرة لجميع طلباتك' : 'Official documents issued for all your requests'}
                  </p>
                </div>
              </button>
            )}
          </div>

          <div className="flex justify-center pt-2">
            <button
              onClick={() => onContinue()}
              className="flex items-center gap-2 px-8 py-3 bg-brand-primary hover:bg-brand-primary-hover text-white font-bold text-sm rounded-xl shadow-lg transition"
            >
              <span>
                {isArabic
                  ? (userRole === 'inspector' ? 'المتابعة إلى لوحة المراجعة' : 'المتابعة إلى تقديم الطلب')
                  : (userRole === 'inspector' ? 'Continue to Review Console' : 'Continue to Submission')}
              </span>
              <ArrowRight className={`w-4 h-4 ${isArabic ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {guideOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-950 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden my-8 border border-brand-gold/30 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b border-slate-800 sticky top-0 bg-slate-950 z-10">
              <h3 className="text-white font-extrabold text-sm flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-brand-gold" />
                {isArabic ? 'الدليل الفني' : 'Technical Reference Guide'}
              </h3>
              <button onClick={() => setGuideOpen(false)} className="p-1.5 bg-slate-800 hover:bg-red-500 hover:text-white rounded-full transition text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              <TrafficReferenceGuide language={language} />
            </div>
          </div>
        </div>
      )}

      {requestsOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b border-slate-200 sticky top-0 bg-white z-10">
              <h3 className="text-brand-text-dark font-extrabold text-sm flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand-primary" />
                {isArabic ? 'سجل طلبات الترخيص والتوجيهات' : 'Permit Requests & Directives Log'}
              </h3>
              <button onClick={() => setRequestsOpen(false)} className="p-1.5 bg-slate-100 hover:bg-red-500 hover:text-white rounded-full transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-end">
                <span className="text-xs font-mono font-bold bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                  {myPermits.length} {isArabic ? 'طلبات' : 'permits'}
                </span>
              </div>

              {myPermits.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs">
                  {isArabic ? 'لا يوجد طلبات ترخيص مقدمة حالياً.' : 'No permit requests submitted yet.'}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                      <span className="block text-xl font-extrabold text-amber-700">{pendingReview}</span>
                      <span className="text-[10px] font-bold text-amber-800">{isArabic ? 'قيد المراجعة' : 'Under Review'}</span>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                      <span className="block text-xl font-extrabold text-emerald-700">{approvedCount}</span>
                      <span className="text-[10px] font-bold text-emerald-800">{isArabic ? 'معتمدة' : 'Approved'}</span>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                      <span className="block text-xl font-extrabold text-red-700">{rejectedCount}</span>
                      <span className="text-[10px] font-bold text-red-800">{isArabic ? 'مرفوضة للتعديل' : 'Rejected'}</span>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {myPermits.map(permit => (
                      <div key={permit.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span className="font-bold text-xs text-slate-900 truncate block">{isArabic ? permit.projectNameAr : permit.projectNameEn}</span>
                            <span className="text-[10px] font-mono text-slate-500">#{permit.id}</span>
                          </div>
                          <span className={`shrink-0 px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            permit.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                            permit.status === 'Rejected' ? 'bg-red-100 text-red-800 border border-red-300' :
                            permit.status === 'Resolved' ? 'bg-slate-200 text-slate-700 border border-slate-300' :
                            'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}>
                            {permit.status === 'Approved' ? (isArabic ? 'معتمد ونشط' : 'Approved') :
                             permit.status === 'Rejected' ? (isArabic ? 'مرفوض للتعديل' : 'Rejected') :
                             permit.status === 'Resolved' ? (isArabic ? 'مغلق' : 'Closed') :
                             (isArabic ? 'قيد المراجعة الفنية' : 'Under Review')}
                          </span>
                        </div>
                        {permit.inspector_notes && (
                          <p className="text-[11px] text-red-800 bg-red-50 border border-red-200 rounded p-2">{permit.inspector_notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {documentsOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b border-slate-200 sticky top-0 bg-white z-10">
              <h3 className="text-brand-text-dark font-extrabold text-sm flex items-center gap-2">
                <FileSignature className="w-5 h-5 text-brand-primary" />
                {isArabic ? 'المستندات الرسمية لجميع الطلبات' : 'Official Documents — All Requests'}
              </h3>
              <button onClick={() => setDocumentsOpen(false)} className="p-1.5 bg-slate-100 hover:bg-red-500 hover:text-white rounded-full transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-end">
                <span className="text-xs font-mono font-bold bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                  {getDocumentAvailability ? myPermits.filter(p => getDocumentAvailability(p).any).length : 0} {isArabic ? 'طلبات' : 'permits'}
                </span>
              </div>

              {!getDocumentAvailability || myPermits.filter(p => getDocumentAvailability(p).any).length === 0 ? (
                <div className="text-center py-8 text-xs text-brand-text-gray space-y-2">
                  <FileSignature className="w-8 h-8 text-slate-300 mx-auto" />
                  <p>{isArabic ? 'لا توجد مستندات مكتملة بعد — ستظهر هنا فور اعتماد أو تقديم أي محضر.' : 'No completed documents yet — they’ll appear here once any document is submitted.'}</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {myPermits.filter(p => getDocumentAvailability(p).any).map(permit => {
                    const docs = getDocumentAvailability(permit);
                    return (
                      <div key={permit.id} className="border border-slate-200 rounded-xl p-3 space-y-2 bg-slate-50">
                        <div>
                          <span className="font-mono text-slate-400 text-[10px] font-bold">#{permit.id}</span>
                          <h4 className="font-extrabold text-slate-900 text-xs">{isArabic ? permit.projectNameAr : permit.projectNameEn}</h4>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {docs.openingMinutes && (
                            <button
                              onClick={() => onOpenDocument && onOpenDocument('opening', permit)}
                              className="py-1.5 bg-brand-gold/10 hover:bg-brand-gold/20 text-brand-gold-hover font-bold text-[11px] rounded flex items-center justify-center gap-1 border border-brand-gold/20 transition"
                            >
                              <FileSignature className="w-3.5 h-3.5" />
                              <span>{isArabic ? 'محضر فتح تحويلة' : 'Opening Minutes'}</span>
                            </button>
                          )}
                          {docs.readinessReport && (
                            <button
                              onClick={() => onOpenDocument && onOpenDocument('readiness', permit)}
                              className="py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 font-bold text-[11px] rounded flex items-center justify-center gap-1 border border-emerald-500/20 transition"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>{isArabic ? 'محضر الجاهزية' : 'Readiness Report'}</span>
                            </button>
                          )}
                          {docs.monitoringReport && (
                            <button
                              onClick={() => onOpenDocument && onOpenDocument('monitoring', permit)}
                              className="py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 font-bold text-[11px] rounded flex items-center justify-center gap-1 border border-amber-500/20 transition"
                            >
                              <ClipboardCheck className="w-3.5 h-3.5" />
                              <span>{isArabic ? 'متابعة الأداء' : 'Monitoring Report'}</span>
                            </button>
                          )}
                          {docs.closureMinutes && (
                            <button
                              onClick={() => onOpenDocument && onOpenDocument('closure', permit)}
                              className="py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded flex items-center justify-center gap-1 border border-slate-300 transition"
                            >
                              <FileCheck className="w-3.5 h-3.5" />
                              <span>{isArabic ? 'محضر إغلاق التحويلة' : 'Closure Minutes'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProcessHomeScreen;
