import React, { useState, useRef, useCallback } from 'react';
import {
  Upload, FileCode, CheckCircle2, Sparkles,
  ArrowRight, RefreshCw, X, Check, AlertCircle
} from 'lucide-react';

export const CadOnboardingModal = ({
  isOpen = false,
  onClose,
  language = 'ar',
  onCadParsed,
  onSkip
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('idle'); // 'idle' | 'uploading' | 'parsing' | 'done' | 'error'
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeFileName, setActiveFileName] = useState('');
  const [extractedInfo, setExtractedInfo] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileUpload = useCallback(async (file) => {
    if (!file) return;
    const nameLower = file.name.toLowerCase();

    if (!nameLower.endsWith('.dwg') && !nameLower.endsWith('.dxf') && !nameLower.endsWith('.ifc')) {
      setErrorMessage(language === 'ar' ? 'يرجى رفع ملف بصيغة DWG أو DXF أو IFC' : 'Please upload a DWG, DXF, or IFC file');
      setUploadStatus('error');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setErrorMessage(language === 'ar' ? 'حجم الملف يتجاوز 50 ميجابايت' : 'File size exceeds 50MB limit');
      setUploadStatus('error');
      return;
    }

    setActiveFileName(file.name);
    setUploadStatus('uploading');
    setUploadProgress(25);
    setErrorMessage('');

    try {
      const formData = new FormData();
      formData.append('dwgFile', file);
      formData.append('anchorLat', '24.4686');
      formData.append('anchorLng', '39.6120');

      setUploadProgress(60);
      setUploadStatus('parsing');

      const response = await fetch('/api/parse-dwg', {
        method: 'POST',
        body: formData
      });

      setUploadProgress(90);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to parse CAD blueprint');
      }

      setUploadProgress(100);
      setExtractedInfo(data.extractedInfo);
      setParsedData(data);
      setUploadStatus('done');
    } catch (err) {
      console.error('[CAD Onboarding] Error:', err);
      setErrorMessage(err.message || 'Failed to parse file');
      setUploadStatus('error');
    }
  }, [language]);

  const handleConfirmAndProceed = () => {
    if (onCadParsed && (extractedInfo || parsedData)) {
      onCadParsed(extractedInfo, parsedData, activeFileName);
    }
    if (onClose) onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div
        className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-slate-200 overflow-hidden animate-fade-in flex flex-col my-auto max-h-[90vh]"
        dir={language === 'ar' ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-5 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-primary/20 border border-brand-primary/40 flex items-center justify-center text-brand-gold shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold flex items-center gap-2">
                <span>{language === 'ar' ? 'استيراد المخطط الهندسي (CAD-First Ingestion)' : 'Upload CAD Site Plan (DWG/DXF/IFC)'}</span>
                <span className="text-[10px] bg-brand-primary/30 text-brand-gold px-2 py-0.5 rounded-full border border-brand-primary/40 font-mono">
                  AutoCAD / Civil 3D
                </span>
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                {language === 'ar'
                  ? 'قم برفع المخطط لاستخراج الأبعاد والإحداثيات والحارات تلقائياً لكافة مراحل التخطيط'
                  : 'Ingest CAD plan to auto-extract dimensions, coordinates, lanes, and safety zones across all phases'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {/* Main Dropzone Area */}
          {uploadStatus !== 'done' && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files[0];
                if (file) handleFileUpload(file);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
                dragOver
                  ? 'border-brand-primary bg-brand-primary/5 scale-[1.01] shadow-lg'
                  : 'border-slate-300 hover:border-brand-primary hover:bg-slate-50/80 bg-slate-50/40'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".dwg,.dxf,.ifc"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />

              <div className="flex flex-col items-center justify-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-brand-primary/10 border border-brand-primary/30 flex items-center justify-center text-brand-primary group-hover:scale-110 transition-transform">
                  <FileCode className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    {language === 'ar' ? 'اسحب وأفلت مخطط الأوتوكاد هنا أو انقر للاختيار' : 'Drag & drop CAD site plan here, or browse'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {language === 'ar' ? 'يدعم ملفات DWG و DXF و IFC (حتى 50 ميجابايت)' : 'Supports DWG, DXF, and IFC format (up to 50MB)'}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-600 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-xs">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>{language === 'ar' ? 'استخراج ذكي لـ 70+ حقل بواسطة Tahcom AI' : 'Instant Tahcom AI extraction of 70+ planning parameters'}</span>
                </div>
              </div>

              {/* Uploading Progress Bar */}
              {(uploadStatus === 'uploading' || uploadStatus === 'parsing') && (
                <div className="mt-6 space-y-2 max-w-md mx-auto">
                  <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-brand-primary" />
                      {uploadStatus === 'uploading'
                        ? (language === 'ar' ? 'جاري رفع المخطط...' : 'Uploading CAD...')
                        : (language === 'ar' ? 'جاري التحليل واستخراج الطبقات والمقاسات...' : 'Parsing vector layers & MOT geometry...')}
                    </span>
                    <span className="font-mono">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-brand-primary h-full transition-all duration-300 rounded-full"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Error Display */}
              {uploadStatus === 'error' && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-bold flex items-center justify-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>
          )}

          {/* Success Extraction Preview Card */}
          {uploadStatus === 'done' && extractedInfo && (
            <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-white p-5 rounded-2xl border border-emerald-200 shadow-sm space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-emerald-200/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold">
                    <Check className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-emerald-950 text-sm">
                      {language === 'ar' ? 'تم استخراج بيانات المخطط الهندسي بنجاح!' : 'CAD Data Extracted Successfully!'}
                    </h4>
                    <p className="text-xs text-emerald-800 font-mono mt-0.5">{activeFileName}</p>
                  </div>
                </div>
                <span className="bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-xs">
                  {language === 'ar' ? 'جاهز للتطبيق' : 'Ready to Apply'}
                </span>
              </div>

              {/* Key Extracted Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-white/90 p-3 rounded-xl border border-emerald-200/60 shadow-xs">
                  <span className="text-slate-500 font-semibold block text-[10px] uppercase">
                    {language === 'ar' ? 'اسم الشارع والموقع' : 'Corridor Name'}
                  </span>
                  <span className="font-bold text-slate-800 mt-1 block truncate" title={extractedInfo.streetNameAr || extractedInfo.streetNameEn}>
                    {language === 'ar' ? (extractedInfo.streetNameAr || 'طريق رئيسي') : (extractedInfo.streetNameEn || 'Main Corridor')}
                  </span>
                </div>

                <div className="bg-white/90 p-3 rounded-xl border border-emerald-200/60 shadow-xs">
                  <span className="text-slate-500 font-semibold block text-[10px] uppercase">
                    {language === 'ar' ? 'إجمالي طول التحويلة' : 'Total Detour Length'}
                  </span>
                  <span className="font-bold text-emerald-700 mt-1 block font-mono text-sm">
                    {extractedInfo.dimensions?.totalDetourLengthM || 290} م
                  </span>
                </div>

                <div className="bg-white/90 p-3 rounded-xl border border-emerald-200/60 shadow-xs">
                  <span className="text-slate-500 font-semibold block text-[10px] uppercase">
                    {language === 'ar' ? 'الحارات المرورية' : 'Traffic Lanes'}
                  </span>
                  <span className="font-bold text-slate-800 mt-1 block">
                    {extractedInfo.dimensions?.activeLanesCount || 2} نشطة / {extractedInfo.dimensions?.totalLanesCount || 3} إجمالي
                  </span>
                </div>

                <div className="bg-white/90 p-3 rounded-xl border border-emerald-200/60 shadow-xs">
                  <span className="text-slate-500 font-semibold block text-[10px] uppercase">
                    {language === 'ar' ? 'حد السرعة التصميمي' : 'Design Speed Limit'}
                  </span>
                  <span className="font-bold text-amber-600 mt-1 block font-mono text-sm">
                    {extractedInfo.speedLimit || 50} كم/س
                  </span>
                </div>
              </div>

              {/* Re-upload Option */}
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => { setUploadStatus('idle'); setExtractedInfo(null); }}
                  className="text-xs text-slate-500 hover:text-slate-800 underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>{language === 'ar' ? 'اختيار مخطط آخر' : 'Choose another CAD file'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => {
              if (onSkip) onSkip();
              if (onClose) onClose();
            }}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
          >
            {language === 'ar' ? 'تخطي والاستمرار يدوياً' : 'Skip & Enter Manually'}
          </button>

          <button
            type="button"
            disabled={uploadStatus !== 'done'}
            onClick={handleConfirmAndProceed}
            className={`px-6 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition shadow-md ${
              uploadStatus === 'done'
                ? 'bg-brand-primary hover:bg-brand-gold text-slate-950 cursor-pointer shadow-brand-primary/20'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          >
            <span>{language === 'ar' ? 'تأكيد واستيراد البيانات لكافة المراحل' : 'Apply & Populate All Phases'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CadOnboardingModal;
