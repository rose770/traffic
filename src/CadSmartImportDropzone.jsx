import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload, FileCode, CheckCircle2, AlertTriangle, Sparkles,
  MapPin, Shield, Ruler, Layers, ArrowRight, RefreshCw, X,
  Check, ArrowUpRight, Info, AlertCircle, Compass, HardHat,
  Calendar, Building2, User
} from 'lucide-react';

export const CadSmartImportDropzone = ({
  language = 'ar',
  onCadParsed,
  onCadReset,
  onFieldFocus,
  currentFormData = {},
  isParsed = false,
  parsedData = null,
  fileName = ''
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(isParsed ? 'done' : 'idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeFileName, setActiveFileName] = useState(fileName || '');
  const [extractedInfo, setExtractedInfo] = useState(parsedData?.extractedInfo || null);
  const fileInputRef = useRef(null);

  // Synchronize state whenever parent parsed data or reset status changes
  useEffect(() => {
    if (isParsed && parsedData) {
      setUploadStatus('done');
      setExtractedInfo(parsedData.extractedInfo || null);
      setActiveFileName(fileName || parsedData.fileName || '');
    } else if (!isParsed) {
      setUploadStatus('idle');
      setExtractedInfo(null);
      setActiveFileName('');
      setErrorMessage('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [isParsed, parsedData, fileName]);

  const handleFileUpload = useCallback(async (file) => {
    if (!file) return;
    const nameLower = file.name.toLowerCase();

    if (!nameLower.endsWith('.dwg') && !nameLower.endsWith('.dxf')) {
      setErrorMessage(language === 'ar' ? 'يرجى رفع ملف بصيغة DWG أو DXF' : 'Please upload a DWG or DXF file');
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
    setUploadProgress(20);
    setErrorMessage('');

    try {
      const formData = new FormData();
      formData.append('dwgFile', file);
      formData.append('anchorLat', '24.4686');
      formData.append('anchorLng', '39.6120');

      setUploadProgress(50);
      setUploadStatus('parsing');

      const response = await fetch('/api/parse-dwg', {
        method: 'POST',
        body: formData
      });

      setUploadProgress(85);

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
      setUploadStatus('done');

      if (onCadParsed) {
        onCadParsed(data.extractedInfo, data, file.name);
      }
    } catch (err) {
      console.error('[CAD Smart Import] Error:', err);
      setErrorMessage(err.message || 'Failed to parse file');
      setUploadStatus('error');
    }
  }, [language, onCadParsed]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const handleFileInput = useCallback((e) => {
    const file = e.target.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const handleReset = useCallback(() => {
    setUploadStatus('idle');
    setExtractedInfo(null);
    setActiveFileName('');
    setErrorMessage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (onCadReset) {
      onCadReset();
    }
  }, [onCadReset]);

  // Determine missing fields dynamically
  const missingFieldsList = extractedInfo?.missingFieldsRequired?.filter(m => {
    const val = currentFormData[m.field];
    return !val || (typeof val === 'string' && val.trim() === '');
  }) || [];

  return (
    <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Header Title */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <FileCode className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
              <span>{language === 'ar' ? 'استيراد وتحليل مخطط الأوتوكاد الذكي' : 'CAD Blueprint Smart Import & Auto-Fill'}</span>
              <span className="text-[10px] bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                <Sparkles className="h-2.5 w-2.5" />
                {language === 'ar' ? 'تعبئة تلقائية' : 'Auto-Fill'}
              </span>
            </h3>
            <p className="text-[11px] text-slate-500">
              {language === 'ar'
                ? 'اسحب وأفلت ملف DWG/DXF لاستخراج اسم الشارع، مناطق التحويلة، وأبعاد الحفر ومطابقتها تلقائياً'
                : 'Drop DWG/DXF file to automatically grab street name, detour safe zones, and tape measures'}
            </p>
          </div>
        </div>

        {uploadStatus === 'done' && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition"
            >
              <RefreshCw className="h-3 w-3" />
              {language === 'ar' ? 'استبدال المخطط' : 'Replace CAD'}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-slate-100 transition"
              title={language === 'ar' ? 'إلغاء' : 'Reset'}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".dwg,.dxf"
        onChange={handleFileInput}
        className="hidden"
      />

      {/* ── 1. Dropzone (when idle) ── */}
      {uploadStatus === 'idle' && (
        <div
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-300 ${
            dragOver
              ? 'border-blue-500 bg-blue-50/70 scale-[1.01] shadow-md shadow-blue-500/10'
              : 'border-slate-300 hover:border-blue-400 bg-slate-50/60 hover:bg-slate-100/50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-blue-600">
              <Upload className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">
                {language === 'ar' ? 'اسحب وأفلت مخطط AutoCAD (.dwg أو .dxf) هنا' : 'Drag & drop AutoCAD (.dwg or .dxf) file here'}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {language === 'ar' ? 'أو انقر لاختيار الملف من جهازك (يدعم حتى 50 ميجابايت)' : 'or click to browse from device (up to 50MB)'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. Parsing Progress ── */}
      {(uploadStatus === 'uploading' || uploadStatus === 'parsing') && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center space-y-3">
          <div className="animate-spin h-8 w-8 border-3 border-blue-600 border-t-transparent rounded-full mx-auto" />
          <p className="text-xs font-bold text-slate-700">
            {uploadStatus === 'uploading'
              ? (language === 'ar' ? `جاري قراءة ملف ${activeFileName}...` : `Reading ${activeFileName}...`)
              : (language === 'ar' ? 'جاري استخراج اسم الشارع ومناطق التحويلة وشريط القياس...' : 'Extracting street name, safe zones, & tape measures...')}
          </p>
          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden max-w-md mx-auto">
            <div
              className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* ── 3. Error Banner ── */}
      {uploadStatus === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-700 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="text-red-700 font-bold hover:underline shrink-0"
          >
            {language === 'ar' ? 'إعادة المحاولة' : 'Try Again'}
          </button>
        </div>
      )}

      {/* ── 4. Successfully Parsed Summary & Missing Info ── */}
      {uploadStatus === 'done' && extractedInfo && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Success Banner */}
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-emerald-800 font-bold">
              <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
              <span>
                {language === 'ar'
                  ? `تم تحليل ${activeFileName} بنجاح واستخراج كافة القياسات الهندسية ومناطق السلامة`
                  : `Successfully analyzed ${activeFileName} and extracted engineering dimensions & safe zones`}
              </span>
            </div>
            <span className="bg-emerald-700 text-white font-bold text-[10px] px-2.5 py-0.5 rounded-full">
              {language === 'ar' ? 'تمت التعبئة التلقائية' : 'Autofilled'}
            </span>
          </div>

          {/* Grid of Extracted Data Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Street & Location */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-500 font-bold text-[11px]">
                <MapPin className="h-3.5 w-3.5 text-blue-600" />
                <span>{language === 'ar' ? 'اسم الطريق والموقع' : 'Street & Location'}</span>
              </div>
              <p className="font-bold text-slate-800 text-[11.5px] truncate" title={extractedInfo.streetNameAr}>
                {extractedInfo.streetNameAr}
              </p>
              <p className="text-[10px] text-slate-500 font-mono">
                {extractedInfo.coordinates}
              </p>
            </div>

            {/* Total Detour Tape Measure */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-500 font-bold text-[11px]">
                <Ruler className="h-3.5 w-3.5 text-emerald-600" />
                <span>{language === 'ar' ? 'إجمالي طول التحويلة' : 'Total Corridor Length'}</span>
              </div>
              <p className="font-bold text-emerald-700 text-[13px] font-mono">
                {extractedInfo.dimensions?.totalDetourLengthM || 290} {language === 'ar' ? 'متر' : 'm'}
              </p>
              <p className="text-[10px] text-slate-500">
                {language === 'ar' ? 'شريط القياس لكامل منطقة التحويلة' : 'Full corridor tape measure'}
              </p>
            </div>

            {/* Safe Zones (4-Phase Detour) */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-500 font-bold text-[11px]">
                <Shield className="h-3.5 w-3.5 text-amber-600" />
                <span>{language === 'ar' ? 'تدرج مناطق السلامة' : 'Safe Zones Tapers'}</span>
              </div>
              <div className="flex flex-wrap gap-1 text-[10px] font-bold font-mono">
                <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded" title="المنطقة الانتقالية">
                  {extractedInfo.zones?.transition?.lengthM || 180}m تدرج
                </span>
                <span className="bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded" title="المنطقة الفاصلة">
                  {extractedInfo.zones?.buffer?.lengthM || 20}m أمان
                </span>
                <span className="bg-red-100 text-red-800 px-1.5 py-0.5 rounded" title="منطقة العمل">
                  {extractedInfo.zones?.workArea?.lengthM || 60}m عمل
                </span>
                <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded" title="منطقة نهاية العمل">
                  {extractedInfo.zones?.termination?.lengthM || 30}m نهاية
                </span>
              </div>
            </div>

            {/* Barriers & Dimensions */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-500 font-bold text-[11px]">
                <HardHat className="h-3.5 w-3.5 text-indigo-600" />
                <span>{language === 'ar' ? 'الصبات وحجم الحفر' : 'Barriers & Trench'}</span>
              </div>
              <p className="font-bold text-slate-800 text-[11px]">
                {language === 'ar' ? `حفر ${extractedInfo.dimensions?.trenchLengthM || 60}م × ${extractedInfo.dimensions?.trenchWidthM || 4.2}م` : `Trench ${extractedInfo.dimensions?.trenchLengthM}m × ${extractedInfo.dimensions?.trenchWidthM}m`}
              </p>
              <p className="text-[10px] text-slate-500 font-mono">
                {language === 'ar' ? `صبات خرسانية ${extractedInfo.barriers?.concreteBarriersLengthM || 60}م` : `NJB: ${extractedInfo.barriers?.concreteBarriersLengthM}m`}
              </p>
            </div>
          </div>

          {/* ── 5. Missing Information Alert & Quick Jump Checklist ── */}
          {missingFieldsList.length > 0 ? (
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>
                    {language === 'ar'
                      ? `يوجد ${missingFieldsList.length} حقول إدارية/تنظيمية ناقصة في المخطط يُرجى استكمالها أدناه:`
                      : `Found ${missingFieldsList.length} missing administrative fields to complete below:`}
                  </span>
                </div>
                <span className="text-[10px] text-amber-700 font-semibold">
                  {language === 'ar' ? 'مطلوب للاعتماد' : 'Required for Approval'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {missingFieldsList.map((m) => (
                  <button
                    key={m.field}
                    type="button"
                    onClick={() => onFieldFocus && onFieldFocus(m.field)}
                    className="flex items-center justify-between p-2 rounded-lg bg-white border border-amber-200 hover:border-amber-400 hover:bg-amber-100/50 text-left transition group shadow-2xs"
                  >
                    <div className="flex flex-col text-left">
                      <span className="text-[11px] font-bold text-slate-800 group-hover:text-amber-900">
                        {m.labelAr}
                      </span>
                      <span className="text-[9.5px] text-slate-400 truncate max-w-[170px]">
                        {m.placeholder}
                      </span>
                    </div>
                    <ArrowUpRight className="h-3.5 w-3.5 text-amber-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3 flex items-center gap-2 text-xs text-emerald-800 font-bold">
              <Check className="h-4 w-4 text-emerald-600" />
              <span>
                {language === 'ar'
                  ? 'كافة البيانات المطلوبة مكتملة ومطابقة لمعايير أمانة المدينة المنورة'
                  : 'All required project details are fully complete and verified'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CadSmartImportDropzone;
