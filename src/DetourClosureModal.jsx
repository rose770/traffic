import React, { useState } from 'react';
import { 
  FileCheck, 
  CheckSquare, 
  Trash2, 
  Camera, 
  ShieldCheck, 
  CheckCircle2, 
  X,
  Upload,
  UserCheck
} from 'lucide-react';

const DetourClosureModal = ({ isOpen, onClose, permit, language, onCompleteClosure }) => {
  const isAr = language === 'ar';
  
  const [checklist, setChecklist] = useState({
    barriers: false,
    signs: false,
    pavement: false,
    sidewalk: false,
    cleanup: false
  });

  const [photos, setPhotos] = useState([]);
  
  const [signatures, setSignatures] = useState({
    contractor: false,
    consultant: false,
    safetyDept: false,
    maintContractor: false,
    maintConsultant: false
  });

  if (!isOpen) return null;

  const handleCheck = (key) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSign = (key) => {
    setSignatures(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handlePhotoUpload = (e) => {
    // Mock photo upload
    const newPhotos = [...photos, { 
      id: Date.now(), 
      url: 'https://via.placeholder.com/150',
      timestamp: new Date().toLocaleTimeString()
    }];
    setPhotos(newPhotos);
  };

  const removePhoto = (id) => {
    setPhotos(photos.filter(p => p.id !== id));
  };

  const isAllChecked = Object.values(checklist).every(Boolean);
  const isAllSigned = Object.values(signatures).every(Boolean);
  const canSubmit = isAllChecked && isAllSigned && photos.length > 0;

  const checklistItems = [
    { key: 'barriers', en: '1. Complete removal of temporary concrete/plastic safety barriers', ar: '1. إزالة جميع الحواجز المؤقتة بالكامل' },
    { key: 'signs', en: '2. Removal of temporary advance warning signs, speed limit signs & arrow boards', ar: '2. إزالة اللوحات الإرشادية والسرعات المؤقتة' },
    { key: 'pavement', en: '3. Reinstatement of original pavement markings & asphalt restoration', ar: '3. إعادة طلاء الخطوط الأرضية وإصلاح طبقة الأسفلت' },
    { key: 'sidewalk', en: '4. Sidewalk & curb restoration, removal of temporary pedestrian bridges', ar: '4. إعادة الأرصفة والبردورات وجسور المشاة إلى وضعها الأصلي' },
    { key: 'cleanup', en: '5. Final site cleanup, debris removal, and clearance by Municipal Maintenance Dept', ar: '5. تنظيف الموقع وتسليمه لإدارة الصيانة' }
  ];

  const stakeholders = [
    { key: 'contractor', en: 'Contractor Representative', ar: 'مندوب المقاول' },
    { key: 'consultant', en: 'Supervising Consultant', ar: 'الاستشاري المشرف' },
    { key: 'safetyDept', en: 'Safety Department Delegate', ar: 'مندوب إدارة السلامة' },
    { key: 'maintContractor', en: 'Maintenance Contractor', ar: 'مقاول الصيانة' },
    { key: 'maintConsultant', en: 'Maintenance Consultant', ar: 'استشاري الصيانة' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="bg-slate-950 border border-slate-800 text-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl my-8 relative flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/20 p-2 rounded-lg">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {isAr ? 'محضر إغلاق تحويلة مرورية وتسليم الموقع' : 'Official Legal Document - Detour Closure & Handover Minutes'}
              </h2>
              <p className="text-sm text-slate-400">
                {isAr ? 'نموذج إغلاق تحويلة وإعادة الوضع الطبيعي (Form TDP-CL)' : 'Detour Site Closure & Restoration (Form TDP-CL)'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors bg-slate-900 rounded-lg p-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-8">
          
          {/* Permit Info summary */}
          {permit && (
            <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 flex gap-6 text-sm">
              <div>
                <span className="text-slate-400 block mb-1">{isAr ? 'رقم التصريح' : 'Permit ID'}</span>
                <span className="font-mono font-medium text-brand-gold">{permit.id || 'PERM-2024-001'}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">{isAr ? 'الموقع' : 'Location'}</span>
                <span className="font-medium">{permit.location || 'King Abdullah Road'}</span>
              </div>
            </div>
          )}

          {/* Checklist Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-slate-200">
              <CheckSquare className="w-5 h-5 text-brand-primary" />
              {isAr ? 'قائمة التحقق من استعادة الموقع (5 نقاط)' : '5-Point Restoration Verification Checklist'}
            </h3>
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-3">
              {checklistItems.map((item) => (
                <label key={item.key} className="flex items-start gap-3 cursor-pointer group">
                  <div className="mt-0.5 relative flex items-center justify-center">
                    <input 
                      type="checkbox"
                      className="peer sr-only"
                      checked={checklist[item.key]}
                      onChange={() => handleCheck(item.key)}
                    />
                    <div className="w-5 h-5 border-2 border-slate-600 rounded bg-slate-800 peer-checked:bg-emerald-500 peer-checked:border-emerald-500 transition-colors flex items-center justify-center">
                      <CheckCircle2 className={`w-3 h-3 text-white opacity-0 peer-checked:opacity-100`} />
                    </div>
                  </div>
                  <span className={`text-sm select-none transition-colors ${checklist[item.key] ? 'text-emerald-400 line-through decoration-emerald-400/30' : 'text-slate-300 group-hover:text-white'}`}>
                    {isAr ? item.ar : item.en}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Photo Documentation Intake */}
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-slate-200">
                <Camera className="w-5 h-5 text-brand-primary" />
                {isAr ? 'التوثيق الفوتوغرافي (قبل / بعد)' : 'Photo Documentation Intake (Before / After)'}
              </h3>
              <button 
                onClick={handlePhotoUpload}
                className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 border border-slate-700 transition-colors"
              >
                <Upload className="w-4 h-4" />
                {isAr ? 'رفع صورة' : 'Upload Photo'}
              </button>
            </div>
            
            {photos.length === 0 ? (
              <div className="bg-slate-900/50 border border-slate-800 border-dashed rounded-xl p-8 text-center text-slate-500 flex flex-col items-center justify-center">
                <Camera className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">{isAr ? 'لم يتم رفع صور بعد' : 'No photos uploaded yet'}</p>
                <p className="text-xs mt-1 text-slate-600">{isAr ? 'يرجى إرفاق صور للموقع بعد إعادة الوضع الطبيعي' : 'Please attach photos of the restored site'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {photos.map(photo => (
                  <div key={photo.id} className="relative group rounded-lg overflow-hidden border border-slate-700 bg-slate-800">
                    <img src={photo.url} alt="Site Photo" className="w-full h-32 object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                      <span className="text-[10px] text-slate-300 font-mono">{photo.timestamp}</span>
                    </div>
                    <button 
                      onClick={() => removePhoto(photo.id)}
                      className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500 text-white p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Multi-Party E-Signature Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-slate-200">
              <FileCheck className="w-5 h-5 text-brand-primary" />
              {isAr ? 'التوقيعات الإلكترونية (5 أطراف)' : 'Multi-Party E-Signature Section'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {stakeholders.map((party) => (
                <div 
                  key={party.key} 
                  onClick={() => handleSign(party.key)}
                  className={`relative p-4 rounded-xl border cursor-pointer transition-all ${
                    signatures[party.key] 
                    ? 'bg-emerald-900/20 border-emerald-500/50' 
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${signatures[party.key] ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${signatures[party.key] ? 'text-emerald-400' : 'text-slate-300'}`}>
                        {isAr ? party.ar : party.en}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {signatures[party.key] 
                          ? (isAr ? 'تم التوقيع إلكترونياً' : 'Digitally Signed') 
                          : (isAr ? 'انقر للتوقيع' : 'Click to sign')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 pt-5 mt-6 flex justify-end">
          <div className="flex gap-3 w-full sm:w-auto">
            <button 
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg text-sm font-medium border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors flex-1 sm:flex-none"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button 
              onClick={onCompleteClosure}
              disabled={!canSubmit}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all flex-1 sm:flex-none ${
                canSubmit 
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <FileCheck className="w-4 h-4" />
              {isAr ? 'إصدار محضر الإغلاق النهائي وأرشفة المعاملة' : 'Issue Final Closure Minutes & Archive Permit'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DetourClosureModal;
