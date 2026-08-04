import React, { useState } from 'react';
import { X, BookOpen, CheckSquare, ArrowRight, Shield, FileText, Wrench, Activity, Trash2, ChevronDown, ChevronUp, Building2, Globe } from 'lucide-react';
import PreApprovalChecklist from './PreApprovalChecklist';
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

const ProcessHomeScreen = ({ language, onToggleLanguage, userRole, formData, calcs, pendingCount = 0, myPermits = [], onContinue }) => {
  const isArabic = language === 'ar';
  const [guideOpen, setGuideOpen] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [expandedStageId, setExpandedStageId] = useState(null);

  // Step 1 (Prepare & Submit) is explicitly the contractor's job in the
  // source document — an inspector never performs it, so it's hidden
  // entirely rather than shown as a dead-end card. Conversely, Steps 2-5
  // are the reviewing authority's job — a contractor has nothing to click
  // into there, so only Step 1 is shown for that role.
  const visibleStages = STAGES.filter(s => s.id !== 1);
  const activeStage = STAGES.find(s => s.id === expandedStageId);

  const toggleStage = (id) => setExpandedStageId(prev => (prev === id ? null : id));

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
              : (isArabic ? 'يمكنك مراجعة سجل طلباتك أو الاطلاع على الدليل والقائمة قبل تقديم طلب جديد.' : 'Review your request history, or check the guide and checklist before submitting a new request.')}
          </p>
        </div>

        <div className="p-6 sm:p-8 space-y-8">
          {userRole === 'inspector' && (
            <>
          <div className={`grid grid-cols-1 ${visibleStages.length >= 4 ? 'sm:grid-cols-2' : ''} ${visibleStages.length === 5 ? 'lg:grid-cols-5' : visibleStages.length === 4 ? 'lg:grid-cols-4' : 'max-w-xs mx-auto'} gap-4`}>
            {visibleStages.map((stage) => {
              const Icon = stage.icon;
              const isOpen = expandedStageId === stage.id;
              return (
                <button
                  key={stage.id}
                  onClick={() => toggleStage(stage.id)}
                  className={`text-left bg-white border rounded-xl p-4 space-y-2 relative transition shadow-sm ${isOpen ? 'border-brand-gold ring-1 ring-brand-gold' : 'border-slate-200 hover:border-brand-primary/40'}`}
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
                  <div className="flex justify-center pt-1">
                    {isOpen ? <ChevronUp className="w-4 h-4 text-brand-gold-hover" /> : <ChevronDown className="w-4 h-4 text-slate-300" />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* سجل طلبات الترخيص للمقاول — kept here on the Home Screen so the
              contractor can see all their submissions and status without
              needing the Steps 2-5 cards they can't act on anyway. */}
          {userRole !== 'inspector' && myPermits.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h2 className="font-extrabold text-brand-text-dark text-sm">
                  {isArabic ? 'سجل طلبات الترخيص والتوجيهات' : 'Permit Requests & Directives Log'}
                </h2>
                <span className="text-xs font-mono font-bold bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                  {myPermits.length} {isArabic ? 'طلبات' : 'permits'}
                </span>
              </div>

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

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
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
            </div>
          )}


          {activeStage && (
            <div className="bg-brand-light border border-brand-gold/30 rounded-xl p-6 space-y-5">
              <h3 className="font-extrabold text-base flex items-center gap-2 text-brand-text-dark">
                <span className="w-6 h-6 rounded-full bg-brand-gold text-white font-extrabold text-xs flex items-center justify-center">
                  {activeStage.id}
                </span>
                {isArabic ? activeStage.titleAr : activeStage.titleEn}
              </h3>

              <div className="flex flex-wrap items-center gap-2">
                {(isArabic ? activeStage.pipelineAr : activeStage.pipelineEn).map((step, idx, arr) => (
                  <React.Fragment key={idx}>
                    <span className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-[11px] font-semibold text-brand-text-dark shadow-sm">
                      {step}
                    </span>
                    {idx < arr.length - 1 && <ArrowRight className={`w-3.5 h-3.5 text-brand-primary/50 ${isArabic ? 'rotate-180' : ''}`} />}
                  </React.Fragment>
                ))}
              </div>

              {activeStage.checklistAr && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(isArabic ? activeStage.checklistAr : activeStage.checklistEn).map((item, idx) => (
                    <div key={idx} className="bg-white border border-slate-200 rounded-lg p-2.5 text-[11px] text-brand-text-gray shadow-sm">
                      {item}
                    </div>
                  ))}
                </div>
              )}

              {activeStage.actionType === 'submit' && (
                <button
                  onClick={() => onContinue()}
                  className="flex items-center gap-2 px-6 py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-white font-bold text-sm rounded-lg shadow transition"
                >
                  <span>{isArabic ? 'الانتقال إلى تقديم الطلب' : 'Go to Submission'}</span>
                  <ArrowRight className={`w-4 h-4 ${isArabic ? 'rotate-180' : ''}`} />
                </button>
              )}

              {activeStage.actionType === 'review' && (
                <div className="space-y-2">
                  {userRole === 'inspector' && (
                    <p className="text-xs text-brand-text-gray">
                      {isArabic ? `لديك حالياً ${pendingCount} طلباً بانتظار المراجعة والقرار.` : `You currently have ${pendingCount} request(s) awaiting review & decision.`}
                    </p>
                  )}
                  <button
                    onClick={() => onContinue(activeStage.inspectorTab, activeStage.zoneFilter)}
                    className="flex items-center gap-2 px-6 py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-white font-bold text-sm rounded-lg shadow transition"
                  >
                    <span>{isArabic ? 'الانتقال إلى المراجعة والقرار' : 'Go to Pending Review'}</span>
                    <ArrowRight className={`w-4 h-4 ${isArabic ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              )}

              {activeStage.actionType === 'readiness' && (
                <button
                  onClick={() => onContinue(activeStage.inspectorTab, activeStage.zoneFilter)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-white font-bold text-sm rounded-lg shadow transition"
                >
                  <span>{isArabic ? 'الانتقال إلى التحويلات المعتمدة النشطة' : 'Go to Active Approved Work Zones'}</span>
                  <ArrowRight className={`w-4 h-4 ${isArabic ? 'rotate-180' : ''}`} />
                </button>
              )}

              {activeStage.actionType === 'monitor' && (
                <button
                  onClick={() => onContinue(activeStage.inspectorTab, activeStage.zoneFilter)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-white font-bold text-sm rounded-lg shadow transition"
                >
                  <span>{isArabic ? 'الانتقال لمتابعة التقارير الدورية' : 'Go to Periodic Monitoring'}</span>
                  <ArrowRight className={`w-4 h-4 ${isArabic ? 'rotate-180' : ''}`} />
                </button>
              )}

              {activeStage.actionType === 'closure' && (
                <button
                  onClick={() => onContinue(activeStage.inspectorTab, activeStage.zoneFilter)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-white font-bold text-sm rounded-lg shadow transition"
                >
                  <span>{isArabic ? 'الانتقال إلى إغلاق التحويلة' : 'Go to Detour Closure'}</span>
                  <ArrowRight className={`w-4 h-4 ${isArabic ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>
          )}
            </>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            <button
              onClick={() => setChecklistOpen(true)}
              className="flex items-center gap-3 bg-white hover:bg-brand-light border border-brand-primary/30 rounded-xl p-5 text-left transition shadow-sm"
            >
              <CheckSquare className="w-8 h-8 text-brand-primary shrink-0" />
              <div>
                <h4 className="font-bold text-sm text-brand-text-dark">{isArabic ? '✅ قائمة التحقق' : '✅ Checklist'}</h4>
                <p className="text-[11px] text-brand-text-gray">
                  {isArabic ? 'معاينة قائمة التحقق المسبق الفنية (١٧ عنصراً) قبل التقديم' : 'Preview the 17-item pre-approval technical checklist before you submit'}
                </p>
              </div>
            </button>
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

      {checklistOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b border-slate-200 sticky top-0 bg-white z-10">
              <h3 className="text-brand-text-dark font-extrabold text-sm flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-brand-primary" />
                {isArabic ? 'قائمة التحقق المسبق الفنية (١٧ عنصراً)' : 'Pre-Approval Technical Checklist (17 Items)'}
              </h3>
              <button onClick={() => setChecklistOpen(false)} className="p-1.5 bg-slate-100 hover:bg-red-500 hover:text-white rounded-full transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-[11px] text-amber-800">
                {isArabic
                  ? 'هذه معاينة ذاتية فقط. المطابقة الفنية الملزمة تتم من قبل جهة المراجعة أثناء الخطوة ٢: مراجعة واعتماد التحويلة.'
                  : 'This is a self-preview only. The binding technical compliance check is performed by the reviewing authority during Step 2: Review & Approve.'}
              </div>
              <PreApprovalChecklist language={language} formData={formData} calcs={calcs} readOnly={userRole === 'contractor'} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProcessHomeScreen;
