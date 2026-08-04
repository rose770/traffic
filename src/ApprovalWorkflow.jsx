import React, { useState } from 'react';
import { CheckCircle2, Clock, XCircle, ChevronRight, FileText, ClipboardList, FileCheck, Shield, Lock, UserCheck, Edit3 } from 'lucide-react';

const ApprovalWorkflow = ({ language, permitId = 1, currentUserRole = 'contractor', approvalChain: initialChain, onApprove, onReject, readOnly = false }) => {
  const isAr = language === 'ar';
  const [notes, setNotes] = useState('');
  const [signerName, setSignerName] = useState('');

  // Default 5-party approval chain if not provided
  const defaultChain = [
    { role: 'contractor', labelAr: '١. مندوب المقاول', labelEn: '1. Contractor Representative', status: 'approved', signedBy: 'م. طارق الحربي', signedAt: new Date().toISOString().split('T')[0], notes: 'تم استيفاء معايير وتجهيز خطة التحويلة.' },
    { role: 'consultant', labelAr: '٢. الاستشاري المشرف', labelEn: '2. Supervising Consultant', status: 'approved', signedBy: 'د. عبدالمجيد الغامدي', signedAt: new Date().toISOString().split('T')[0], notes: 'تمت مراجعة الاعتبارات الهندسية وطول التدرج.' },
    { role: 'safety_dept', labelAr: '٣. مندوب إدارة السلامة', labelEn: '3. Safety Department Delegate', status: 'pending', signedBy: '', signedAt: '', notes: '' },
    { role: 'maintenance_contractor', labelAr: '٤. مقاول الصيانة', labelEn: '4. Maintenance Contractor', status: 'pending', signedBy: '', signedAt: '', notes: '' },
    { role: 'maintenance_consultant', labelAr: '٥. استشاري الصيانة', labelEn: '5. Maintenance Consultant', status: 'pending', signedBy: '', signedAt: '', notes: '' }
  ];

  const [chain, setChain] = useState(initialChain || defaultChain);
  const [simulatedRole, setSimulatedRole] = useState(currentUserRole || 'safety_dept');

  const currentPendingIndex = chain.findIndex(step => step.status === 'pending');
  const isAllApproved = chain.every(step => step.status === 'approved');
  const progress = Math.round((chain.filter(step => step.status === 'approved').length / chain.length) * 100);

  const activeStep = chain.find(s => s.role === simulatedRole) || chain[currentPendingIndex] || chain[0];

  const handleAction = (status) => {
    if (readOnly) return;
    const updatedChain = chain.map(step => {
      if (step.role === simulatedRole) {
        return {
          ...step,
          status,
          signedBy: signerName || (isAr ? 'م. فهد الزهراني' : 'Eng. Fahad Al-Zahrani'),
          signedAt: new Date().toISOString().split('T')[0],
          notes: notes || (status === 'approved' ? (isAr ? 'تم الاعتماد والتوقيع إلكترونياً.' : 'Approved electronically.') : (isAr ? 'مرفوض للتعديل' : 'Rejected for modification'))
        };
      }
      return step;
    });

    setChain(updatedChain);
    if (status === 'approved' && onApprove) onApprove(simulatedRole, notes);
    if (status === 'rejected' && onReject) onReject(simulatedRole, notes);
    setNotes('');
    setSignerName('');
  };

  const t = {
    title: isAr ? `دورة الاعتماد الإلكتروني الـ ٥ للأطراف المعنية` : `5-Party Stakeholder E-Approval Pipeline`,
    progress: isAr ? 'نسبة اكتمال التوقيعات' : 'E-Signature Progress',
    approve: isAr ? 'توقيع واعتماد الخطوة' : 'E-Sign & Approve Step',
    reject: isAr ? 'إعادة المعاملة للتعديل' : 'Reject & Return Step',
    notesPlaceholder: isAr ? 'أدخل ملاحظاتك وتوجيهاتك الرسمية هنا...' : 'Enter official directive / signature notes...',
    signerPlaceholder: isAr ? 'اسم ممثل الجهة المعتمد...' : 'Signer Representative Name...',
    approved: isAr ? 'معتمد' : 'Approved',
    pending: isAr ? 'قيد الانتظار' : 'Pending',
    rejected: isAr ? 'مرفوض' : 'Rejected',
    generateOpening: isAr ? 'محضر فتح تحويلة رسمي (محضر ٥ أطراف)' : 'Official Detour Opening Minutes',
    generatePeriodic: isAr ? 'تقرير متابعة دورية (نموذج TDP-FU)' : 'Periodic Inspection Log (TDP-FU)',
    generateClosure: isAr ? 'محضر إغلاق وإعادة الموقع (محضر TDP-CL)' : 'Detour Closure Minutes (TDP-CL)',
    documents: isAr ? 'المستندات والمحاضر الرسمية الصادرة:' : 'Official Issued Documents & Minutes:',
    by: isAr ? 'الموقع:' : 'Signed By:',
    date: isAr ? 'التاريخ:' : 'Date:',
    simulateRole: isAr ? 'محاكاة دور المراجع للأطراف الـ ٥ (اختر الجهة):' : 'Simulate Reviewing Stakeholder Role:'
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-red-400" />;
      default: return <Clock className="w-4 h-4 text-amber-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400';
      case 'rejected': return 'border-red-500/50 bg-red-500/10 text-red-400';
      default: return 'border-amber-500/50 bg-amber-500/10 text-amber-400';
    }
  };

  return (
    <div className={`w-full max-w-6xl mx-auto p-6 bg-slate-900 border border-brand-gold/30 rounded-xl shadow-2xl text-white ${isAr ? 'text-right' : 'text-left'}`} dir={isAr ? 'rtl' : 'ltr'}>
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <Shield className="w-7 h-7 text-brand-gold shrink-0" />
          <div>
            <h2 className="text-xl font-extrabold text-white">
              {t.title}
            </h2>
            <span className="text-xs text-slate-400">{isAr ? 'تصريح رقم #' + permitId + ' ' : 'Permit #' + permitId + ' '}</span>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl flex items-center gap-3 shrink-0">
          <div>
            <span className="block text-[10px] text-slate-400 uppercase font-bold">{t.progress}</span>
            <span className="text-sm font-mono font-extrabold text-emerald-400">{chain.filter(s => s.status === 'approved').length} / {chain.length} ({progress}%)</span>
          </div>
          <div className="w-10 h-10 rounded-full border-2 border-emerald-500 flex items-center justify-center font-bold text-xs text-emerald-400 bg-emerald-500/10">
            {progress}%
          </div>
        </div>
      </div>

      {readOnly ? (
        <div className="mb-6 bg-brand-primary/10 border border-brand-primary/30 rounded-xl p-3.5 text-xs text-brand-primary font-medium flex items-center gap-2">
          <Lock className="w-4 h-4 text-brand-primary shrink-0" />
          <span>
            {isAr 
              ? 'سجل تتبع التوقيعات الخماسي للمقاول: يتيح متابعة حالة اعتماد الاستشاري وإدارة السلامة والجهات المعنية فورياً. إدخال التوقيعات مقتصر على حسابات أصحاب الصلاحية.' 
              : 'Contractor 5-Party Signature Tracker: Provides real-time visibility into consultant and safety department approvals. Signature inputs are restricted to authorized stakeholder accounts.'}
          </span>
        </div>
      ) : (
        /* Role Simulator Switcher for Inspector/Admin mode */
        <div className="mb-6 bg-slate-800/90 border border-slate-700 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <label className="text-xs font-bold text-brand-gold uppercase flex items-center gap-1.5 shrink-0">
            <UserCheck className="w-4 h-4 text-brand-gold" />
            {t.simulateRole}
          </label>
          <div className="flex flex-wrap gap-2">
            {chain.map(step => (
              <button
                key={step.role}
                type="button"
                onClick={() => setSimulatedRole(step.role)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border ${
                  simulatedRole === step.role
                    ? 'bg-brand-primary text-white border-brand-primary shadow-md'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                <span>{isAr ? step.labelAr : step.labelEn}</span>
                {step.status === 'approved' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
          <div 
            className="h-full bg-gradient-to-r from-brand-gold via-amber-400 to-emerald-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Horizontal Pipeline of 5 Stakeholders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        {chain.map((step) => {
          const isSimulated = !readOnly && step.role === simulatedRole;
          const statusColors = getStatusColor(step.status);
          
          return (
            <div 
              key={step.role}
              onClick={() => !readOnly && setSimulatedRole(step.role)}
              className={`relative p-3.5 rounded-xl border-2 transition-all bg-slate-800/90 ${readOnly ? 'cursor-default' : 'cursor-pointer'} ${
                isSimulated 
                  ? 'border-brand-gold shadow-[0_0_15px_rgba(234,179,8,0.25)] transform -translate-y-1' 
                  : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              {isSimulated && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-gold text-slate-950 text-[10px] px-2 py-0.5 rounded-full font-extrabold uppercase shadow">
                  {isAr ? 'الجهة المحددة' : 'Active Role'}
                </div>
              )}
              
              <h3 className="text-white font-bold mb-2 mt-1 text-xs">{isAr ? step.labelAr : step.labelEn}</h3>
              
              <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold border ${statusColors} mb-2`}>
                {getStatusIcon(step.status)}
                <span>{step.status === 'approved' ? t.approved : step.status === 'rejected' ? t.rejected : t.pending}</span>
              </div>
              
              {step.signedBy ? (
                <div className="text-[11px] text-slate-300 space-y-0.5 border-t border-slate-700/80 pt-2 font-mono">
                  <p><span className="text-slate-400">{t.by}</span> <span className="font-bold text-white">{step.signedBy}</span></p>
                  <p><span className="text-slate-400">{t.date}</span> {step.signedAt}</p>
                </div>
              ) : (
                <div className="text-[10px] text-slate-400 italic border-t border-slate-700/80 pt-2">
                  {isAr ? 'في انتظار التوقيع' : 'Awaiting signature'}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action Card for Selected Stakeholder (Only shown if NOT readOnly) */}
      {!readOnly && (
        <div className="bg-slate-800/90 border border-brand-primary/40 rounded-xl p-5 mb-8 animate-fade-in shadow-xl">
          <div className="flex items-center justify-between mb-4 border-b border-slate-700 pb-3">
            <div className="flex items-center gap-2 text-brand-gold font-bold text-sm">
              <Edit3 className="w-4 h-4 text-brand-gold" />
              <span>{isAr ? `توقيع واعتماد: ${activeStep.labelAr}` : `Sign & Approve: ${activeStep.labelEn}`}</span>
            </div>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${getStatusColor(activeStep.status)}`}>
              {activeStep.status === 'approved' ? t.approved : activeStep.status === 'rejected' ? t.rejected : t.pending}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">{isAr ? 'اسم ممثل الجهة المعتمد:' : 'Representative Name:'}</label>
              <input
                type="text"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-xs focus:border-brand-gold outline-none"
                placeholder={t.signerPlaceholder}
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">{isAr ? 'الملاحظات والتوجيهات الرسمية:' : 'Directive Notes:'}</label>
              <input
                type="text"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-xs focus:border-brand-gold outline-none"
                placeholder={t.notesPlaceholder}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => handleAction('approved')}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-lg transition flex items-center justify-center gap-2 shadow text-xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{t.approve}</span>
            </button>
            <button
              type="button"
              onClick={() => handleAction('rejected')}
              className="flex-1 bg-slate-700 hover:bg-red-600 border border-slate-600 text-white font-bold py-2.5 px-4 rounded-lg transition flex items-center justify-center gap-2 shadow text-xs"
            >
              <XCircle className="w-4 h-4" />
              <span>{t.reject}</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default ApprovalWorkflow;
