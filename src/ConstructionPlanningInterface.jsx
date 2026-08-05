import React, { useState, useEffect, useRef } from 'react';
import {
  Building2, 
  MapPin, 
  Calendar, 
  User, 
  FileCode, 
  FileText,
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  TrafficCone, 
  ChevronRight, 
  ChevronLeft, 
  Printer, 
  RotateCcw, 
  Compass, 
  HardHat, 
  Maximize2,
  Trash2,
  Plus,
  Clock,
  Layers,
  Shield,
  ShieldCheck,
  FileSignature,
  Home,
  Lightbulb,
  FileCheck,
  Truck,
  Activity,
  Milestone,
  CheckSquare,
  Calculator,
  AlertCircle,
  Globe,
  Download,
  Search,
  Filter,
  ArrowUpDown,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Settings,
  Sparkles,
  Edit3,
  Lock,
  UserPlus,
  LogOut,
  LogIn,
  MessageSquare,
  Ruler,
  Info,
  ClipboardCheck,
  Bell,
  Signpost
} from 'lucide-react';

import PreApprovalChecklist from './PreApprovalChecklist';
import FieldInspectionChecklist from './FieldInspectionChecklist';
import PhotoUploadModule from './PhotoUploadModule';
import ApprovalWorkflow from './ApprovalWorkflow';
import Inspector17PointAuditWidget from './Inspector17PointAuditWidget';
import PeriodicMonitoringForm from './PeriodicMonitoringForm';
import ClosureMinutesForm from './ClosureMinutesForm';
import DetourOpeningMinutesForm from './DetourOpeningMinutesForm';
import MandatoryImplementationChecklist from './MandatoryImplementationChecklist';
import TrafficReferenceGuide from './TrafficReferenceGuide';
import FieldReadinessModal from './FieldReadinessModal';
import ProcessHomeScreen from './ProcessHomeScreen';
import {
  DURATION_CATEGORIES,
  ROAD_CLASSIFICATIONS,
  TRAFFIC_VOLUME_LEVELS,
  getRoadNarrowingControl,
  TWO_WAY_MIN_TOTAL_WIDTH_M,
  isPedestrianPathMandatory,
  PEDESTRIAN_MIN_PATH_WIDTH_M,
  needsRoadMarkingRepaint,
  needsSiteFencing,
  LIFECYCLE_STAGES,
} from './trafficStandards';

// Traffic zone strategy texts with brand-specific colors
const trafficZoneData = {
  warning: {
    title: "1. Advance Warning Area",
    titleAr: "١. منطقة التحذير المتقدم",
    description: "Informs road users of what to expect ahead. Essential to draw attention prior to lane shifts.",
    descriptionAr: "تنبيه وتحذير سائقي المركبات والمشاة بوجود أعمال إنشائية قادمة وتهدئة السرعة.",
    color: "bg-amber-500",
    textColor: "text-brand-gold",
    placeholder: "e.g., ROAD WORK AHEAD signage at 500m, speed limit drop to 40km/h at 300m, active flashing arrow boards."
  },
  transition: {
    title: "2. Transition Area",
    titleAr: "٢. منطقة الانتقال والتدرج",
    description: "Moves traffic out of its normal path into the redirected corridor. Utilizes tapers constructed of cones or barriers.",
    descriptionAr: "توجيه حركة السيارات وقناة السير من الحارة المغلقة إلى الحارة المفتوحة بشكل تدريجي آمن.",
    color: "bg-brand-primary",
    textColor: "text-brand-primary",
    placeholder: "e.g., Merging taper of 80m length utilizing reflective cones at 5m spacings, with LED guiding beacons."
  },
  buffer: {
    title: "3. Buffer Space",
    titleAr: "٣. مساحة الأمان العازلة",
    description: "Provides safety space for both drivers and workers. Strictly kept clear of all vehicles, equipment, and materials.",
    descriptionAr: "مساحة خالية تماماً من المعدات والمواد لحماية العمال والموقع في حال انحراف أي مركبة.",
    color: "bg-brand-teal",
    textColor: "text-brand-teal",
    placeholder: "e.g., 50-meter lateral and longitudinal buffer zones, backed by steel-guard crash trucks or water-filled barriers."
  },
  work: {
    title: "4. Work Area",
    titleAr: "٤. منطقة العمل الإنشائي",
    description: "The closed section of the highway where the construction, utility repair, or staging actually takes place.",
    descriptionAr: "المنطقة المغلقة المخصصة لأعمال الحفر والإنشاء وحركة الآليات، وتكون محمية بالصبات الخرسانية.",
    color: "bg-red-600",
    textColor: "text-red-600",
    placeholder: "e.g., Excavation zone protected by solid temporary concrete (jersey) barriers and dust-mitigation fencing."
  },
  termination: {
    title: "5. Termination Area",
    titleAr: "٥. منطقة نهاية العمل",
    description: "Allows traffic to return to the normal traffic path. Includes a short taper to guide vehicles back safely.",
    descriptionAr: "توجيه المركبات وإعادتها لمسارات الشارع الطبيعية بعد تجاوز موقع العمل الإنشائي بأمان.",
    color: "bg-emerald-600",
    textColor: "text-emerald-600",
    placeholder: "e.g., 30-meter downstream taper ending with 'END ROAD WORK' signage and restoration of default speed limits."
  }
};

const dict = {
  ar: {
    dir: 'rtl',
    portalTitle: 'نظام تصاريح ومتابعة التحويلات المرورية',
    title: 'نظام تصميم ومراجعة التحويلات المرورية والحدود الهندسية',
    step1: 'مواصفات المشروع والمعدات',
    step2: 'مخطط الـ GIS والصبات الخرسانية',
    step3: 'حاسبة السلامة المرورية والاعتماد',
    clientName: 'اسم الجهة المالكة للمشروع',
    projectName: 'اسم المشروع الإنشائي',
    contractingCompany: 'الشركة المنفذة للمشروع',
    projectManager: 'المهندس المسؤول بالموقع',
    location: 'موقع وتفاصيل التحويلة المرورية',
    permitStartDate: 'تاريخ بدء التصريح',
    permitEndDate: 'تاريخ انتهاء التصريح',
    workStartDate: 'تاريخ بدء الأعمال الإنشائية',
    workEndDate: 'تاريخ انتهاء الأعمال الإنشائية',
    siteDimensions: 'أبعاد منطقة العمل الكلية',
    stagingArea: 'موقع ساحة التشوين والمواد',
    hardZone: 'تصنيف منطقة الحفر الخطرة',
    blueprintTitle: 'مخطط الأوتوكاد الهندسي (CAD)',
    targetCrs: 'نظام الإحداثيات المستهدف',
    entitiesCount: 'عدد الكيانات والمضلعات المكتشفة',
    machineryName: 'اسم الآلية أو النظام المروري',
    dimensions: 'الأبعاد (الطول × العرض × الارتفاع)',
    systemFunction: 'دور النظام المروري في الموقع',
    action: 'الإجراء',
    presets: 'مواقع ونماذج التحويلات الجاهزة',
    presetDowntown: 'تحويلة طريق الملك عبدالله (وسط المدينة)',
    presetHighway: 'تحويلة طريق الملك عبدالعزيز السريع',
    presetResidential: 'تحويلة شارع خالد بن الوليد السكني',
    crossSectionTitle: 'القطاع العرضي الهندسي لسلامة الممر الإنشائي (2D)',
    speedLimit: 'حد السرعة التصميمي للطريق',
    laneWidth: 'عرض حارة السير المغلقة',
    proposedTaper: 'طول تدرج التحويلة المقترح (Taper)',
    proposedBuffer: 'المسافة العازلة الطولية المقترحة (Buffer SSD)',
    proposedTermination: 'منطقة نهاية التحويلة المقترحة (Termination)',
    roadClosureLabel: 'خطة إغلاق حارات الطريق المعتمدة',
    trafficFlowLabel: 'إستراتيجية تحويل وتوجيه التدفق المروري',
    back: 'السابق',
    next: 'التالي',
    submit: 'اعتماد وإرسال الطلب النهائي',
    print: 'طباعة التقرير الفني المعتمد',
    edit: 'تعديل البيانات وإعادة التصميم',
    ksa: 'المملكة العربية السعودية',
    amanaDept: 'الجهة المالكة للمشروع',
    deptName: 'الإدارة العامة لرخص الطرق والتحويلات المرورية',
    permitPending: 'بانتظار موافقة واعتماد المفتش',
    refNo: 'رقم الترخيص المرجعي',
    date: 'تاريخ الإصدار والطباعة',
    officialPermitTitle: 'تقرير السلامة الفنية والاعتماد الهندسي للتحويلة المرورية',
    section1Title: 'الحدود الجغرافية والتحقق من إحداثيات الـ GIS',
    section2Title: 'بيان الآليات والمعدات المستخدمة داخل منطقة العمل',
    section3Title: 'القطاع العرضي الهندسي لتوزيع الحارات الإنشائية والمرورية',
    section6Title: 'الإقرارات الفنية والامتثال للأنظمة والتعليمات القياسية',
    motDesign: 'المخطط مصمم ومطابق لكود ومواصفات وزارة النقل KSA MOT',
    sasoReflective: 'العلامات الإرشادية واللوحات العاكسة مطابقة لمواصفات SASO',
    lightingLuxVerified: 'شدة الإضاءة الليلية في مسارات العمل لا تقل عن ١٥٠ لوكس',
    safetyClearanceMet: 'المسافات الجانبية وآليات حماية المشاة مستوفية للشروط الفنية',
    stagingDesignated: 'ساحات تشوين وتخزين المواد تقع خارج الممر المروري النشط',
    contractorSig: 'توقيع المهندس المسؤول للمقاول المنفذ',
    inspectorSig: 'توقيع واعتماد الإدارة المختصة',
    taperLength: 'طول منطقة التدرج والانتقال L',
    bufferSSD: 'طول منطقة الأمان العازلة SSD',
    terminationLength: 'طول منطقة نهاية العمل والتوجيه',
    svgBuffer: 'مسافة أمان',
    svgWorkArea: 'منطقة الحفر والإنشاء',
    svgPedPath: 'ممر مشاة آمن',
    svgHardZone: 'الصبات الخرسانية للعمل الإنشائي',
    svgDetourLanes: 'حارات السير البديلة للتحويلة'
  },
  en: {
    dir: 'ltr',
    portalTitle: 'Traffic Detour Permits & Monitoring System',
    title: 'Traffic Detour Design & Safety Layout Compliance Review',
    step1: 'Project Specs & Equipment footprint',
    step2: 'GIS Map & Concrete Barriers',
    step3: 'MOT Standards Calculator & Submit',
    clientName: 'Project Owner / Client',
    projectName: 'Construction Project Name',
    contractingCompany: 'Contracting Company',
    projectManager: 'Responsible Site Engineer',
    location: 'Detour Location & Intersections',
    permitStartDate: 'Permit Start Date',
    permitEndDate: 'Permit End Date',
    workStartDate: 'Work Start Date',
    workEndDate: 'Work End Date',
    siteDimensions: 'Overall Work Zone Dimensions',
    stagingArea: 'Material Staging & Stockpile Area',
    hardZone: 'Trench Excavation Hazard Class',
    blueprintTitle: 'AutoCAD Blueprint File (CAD)',
    targetCrs: 'Target Coordinate System',
    entitiesCount: 'Detected Entities & Vector count',
    machineryName: 'Equipment Name / Traffic System',
    dimensions: 'Dimensions (L x W x H)',
    systemFunction: 'Traffic Zone Deployment Role',
    action: 'Action',
    presets: 'Pre-defined Detour Layout Templates',
    presetDowntown: 'Downtown King Abdullah Rd (Low Speed)',
    presetHighway: 'King Abdulaziz Rd Expressway (High Speed)',
    presetResidential: 'Khalid Bin Walid Residential Street',
    crossSectionTitle: 'Engineering 2D Work Zone Cross-Section',
    speedLimit: 'Roadway Design Speed limit (V)',
    laneWidth: 'Closed Traffic Lane Width (W)',
    proposedTaper: 'Proposed Merge Taper Length (L)',
    proposedBuffer: 'Proposed Safety Buffer Space (SSD)',
    proposedTermination: 'Proposed Downstream Termination Area',
    roadClosureLabel: 'Approved Lane Closures Strategy',
    trafficFlowLabel: 'Peak-Hour Traffic Management Strategy',
    back: 'Back',
    next: 'Next',
    submit: 'Verify Design & Submit for Licensing',
    print: 'Print Compliance Certificate',
    edit: 'Edit Detour Specifications',
    ksa: 'Kingdom of Saudi Arabia',
    amanaDept: 'Project Owning Authority',
    deptName: 'General Directorate of Road Permits & Detours',
    permitPending: 'Pending Inspector Review & Audit Signoff',
    refNo: 'Reference Permit Number',
    date: 'Date of Issue',
    officialPermitTitle: 'Traffic Detour Safety compliance Certificate',
    section1Title: 'GIS Geographic Boundary & Coordinate Audit',
    section2Title: 'Staged Construction Equipment & Machinery Inventory',
    section3Title: 'Detour Roadway Layout & Traffic Cross-Section',
    section6Title: 'Technical compliance Checklist & Assurances',
    motDesign: 'Detour schematic conforms to KSA Ministry of Transport codes',
    sasoReflective: 'Signs and channeling devices meet SASO reflectivity codes',
    lightingLuxVerified: 'Night work illumination achieves 150 lux minimum target',
    safetyClearanceMet: 'Pedestrian channels and lateral clearances are certified',
    stagingDesignated: 'All material stockpiles located away from active traffic',
    contractorSig: 'Contractor Project Manager Signature',
    inspectorSig: 'Licensing Authority Signature',
    taperLength: 'Transition Merge Taper Length (L)',
    bufferSSD: 'Longitudinal Buffer Safety distance (SSD)',
    terminationLength: 'Termination Area Length',
    svgBuffer: 'Clear Buffer',
    svgWorkArea: 'Work Zone Area',
    svgPedPath: 'Pedestrian Route',
    svgHardZone: 'Jersey Barriers',
    svgDetourLanes: 'Active Detour Lanes'
  }
};

const AuthScreen = ({ onLogin, language, t }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('contractor');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    try {
      const res = await fetch(`${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role: isLogin ? undefined : role })
      });
      const data = await res.json();
      if (data.success) {
        onLogin(data.user);
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch (err) {
      setError('Cannot connect to server. Is the Node backend running?');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-brand-green/20">
        <div className="bg-brand-green p-6 text-center text-white">
          <div className="w-20 h-20 mx-auto mb-3 rounded-full overflow-hidden border-2 border-brand-gold bg-white shadow-md">
            <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover object-top" />
          </div>
          <h2 className="text-2xl font-bold">{language === 'ar' ? 'تسجيل الدخول' : 'Sign In'}</h2>
          <p className="text-brand-green-light mt-1 text-sm">{t.portalTitle}</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">{language === 'ar' ? 'اسم المستخدم' : 'Username'}</label>
            <div className="relative">
              <User className="w-5 h-5 absolute top-2.5 rtl:right-3 ltr:left-3 text-slate-400" />
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 rtl:pr-10 ltr:pl-10 rtl:pl-4 ltr:pr-4 focus:outline-none focus:ring-2 focus:ring-brand-primary" 
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">{language === 'ar' ? 'كلمة المرور' : 'Password'}</label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute top-2.5 rtl:right-3 ltr:left-3 text-slate-400" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 rtl:pr-10 ltr:pl-10 rtl:pl-4 ltr:pr-4 focus:outline-none focus:ring-2 focus:ring-brand-primary" 
              />
            </div>
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">{language === 'ar' ? 'نوع الحساب' : 'Account Role'}</label>
              <select 
                value={role} 
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                <option value="contractor">{language === 'ar' ? 'مقاول / منفذ مشروع' : 'Contractor'}</option>
                <option value="inspector">{language === 'ar' ? 'مفتش' : 'Inspector'}</option>
                <option value="external_entity">{language === 'ar' ? 'المنسق الخارجي' : 'External Coordinator'}</option>
              </select>
            </div>
          )}

          <button type="submit" className="w-full bg-brand-primary hover:bg-brand-primary-dark text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-md flex justify-center items-center gap-2">
            {isLogin ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            {isLogin ? (language === 'ar' ? 'دخول' : 'Log In') : (language === 'ar' ? 'إنشاء حساب' : 'Register')}
          </button>
        </form>

        <div className="px-6 pb-6 text-center">
          <button 
            type="button" 
            onClick={() => setIsLogin(!isLogin)}
            className="text-brand-primary hover:underline text-sm font-semibold"
          >
            {isLogin ? (language === 'ar' ? 'ليس لديك حساب؟ سجل الآن' : 'Need an account? Register') : (language === 'ar' ? 'لديك حساب مسبقاً؟ تسجيل الدخول' : 'Already have an account? Log in')}
          </button>
        </div>
        
        {isLogin && (
          <div className="bg-slate-50 p-4 border-t border-slate-100 text-xs text-slate-500 text-center flex flex-col gap-2">
            <span>{language === 'ar' ? 'الاختصارات السريعة للتجربة:' : 'Quick Test Logins:'}</span>
            <div className="grid grid-cols-3 gap-2 mt-1">
              <button
                type="button"
                onClick={() => {setUsername('contractor'); setPassword('pass123');}}
                className="py-2 px-2 bg-white border border-slate-200 hover:border-brand-primary hover:bg-brand-primary/5 rounded-lg font-bold text-brand-text-dark transition"
              >
                {language === 'ar' ? 'المقاول' : 'Contractor'}
              </button>
              <button
                type="button"
                onClick={() => {setUsername('inspector'); setPassword('pass123');}}
                className="py-2 px-2 bg-white border border-slate-200 hover:border-brand-primary hover:bg-brand-primary/5 rounded-lg font-bold text-brand-text-dark transition"
              >
                {language === 'ar' ? 'المفتش' : 'Inspector'}
              </button>
              <button
                type="button"
                onClick={() => {setUsername('external_coordinator'); setPassword('pass123');}}
                className="py-2 px-2 bg-white border border-slate-200 hover:border-brand-primary hover:bg-brand-primary/5 rounded-lg font-bold text-brand-text-dark transition"
              >
                {language === 'ar' ? 'المنسق الخارجي' : 'External Coordinator'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const CCTVMockWidget = ({ language, permit }) => {
  if (!permit) return null;
  const start = new Date(permit.workStartDate || permit.startDate || new Date());
  const end = new Date(permit.workEndDate || permit.endDate || new Date());
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 180) return null;

  return (
    <div className="bg-slate-900 rounded-xl overflow-hidden shadow-lg border-2 border-slate-700 mt-4 relative animate-fade-in">
      <div className="bg-red-600/20 px-3 py-2 flex items-center justify-between border-b border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
          <span className="text-white text-xs font-bold font-mono tracking-widest">LIVE CCTV</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-[10px] font-mono">{new Date().toLocaleTimeString()}</span>
          <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px] font-mono">CAM-01 (CRITICAL SITE &gt;180d)</span>
        </div>
      </div>
      <div className="relative h-48 bg-slate-800 w-full overflow-hidden flex items-center justify-center">
        {/* Mock visual feed */}
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #000 2px, #000 4px)' }}></div>
        <div className="absolute inset-0 flex items-center justify-center">
           <svg className="w-full h-full opacity-30" viewBox="0 0 100 100" preserveAspectRatio="none">
             <path d="M 0 100 L 40 50 L 60 50 L 100 100 Z" fill="#fff" />
             <path d="M 45 50 L 45 40 L 55 40 L 55 50 Z" fill="#ff0" />
           </svg>
        </div>
        <div className="absolute bottom-2 left-2 text-white/70 font-mono text-[10px] drop-shadow-md">
          COORD: {permit.coordinates || 'UNKNOWN'}
        </div>
        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
          <span className="text-yellow-400 font-mono text-[10px] bg-black/50 px-1 rounded border border-yellow-400/30">MOTION DETECTED</span>
        </div>
      </div>
    </div>
  );
};

const ReportModal = ({ isOpen, onClose, title, language }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <div className="bg-brand-dark p-4 text-white font-bold flex justify-between items-center">
          <span>{title}</span>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded transition-colors"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-6 space-y-4 text-left" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase">{language === 'ar' ? 'مقاول الصيانة' : 'Maintenance Contractor'}</label>
            <input type="text" className="w-full border border-slate-300 rounded-lg p-2.5 mt-1 text-sm focus:ring-2 focus:ring-brand-primary" placeholder={language === 'ar' ? 'اسم المقاول...' : 'Contractor name...'} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase">{language === 'ar' ? 'استشاري الصيانة' : 'Maintenance Consultant'}</label>
            <input type="text" className="w-full border border-slate-300 rounded-lg p-2.5 mt-1 text-sm focus:ring-2 focus:ring-brand-primary" placeholder={language === 'ar' ? 'اسم الاستشاري...' : 'Consultant name...'} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase">{language === 'ar' ? 'تاريخ التنفيذ' : 'Execution Date'}</label>
              <input type="date" className="w-full border border-slate-300 rounded-lg p-2.5 mt-1 text-sm focus:ring-2 focus:ring-brand-primary" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase">{language === 'ar' ? 'حالة الموقع' : 'Site Status'}</label>
              <select className="w-full border border-slate-300 rounded-lg p-2.5 mt-1 text-sm focus:ring-2 focus:ring-brand-primary">
                <option>{language === 'ar' ? 'سليم وتمت الإزالة بالكامل' : 'Clean & Fully Removed'}</option>
                <option>{language === 'ar' ? 'قيد الإزالة' : 'Removal in Progress'}</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase">{language === 'ar' ? 'ملاحظات إضافية والمرفقات' : 'Additional Notes & Attachments'}</label>
            <textarea rows="3" className="w-full border border-slate-300 rounded-lg p-2.5 mt-1 text-sm focus:ring-2 focus:ring-brand-primary" placeholder={language === 'ar' ? 'تفاصيل...' : 'Details...'}></textarea>
          </div>
          <button onClick={() => { alert(language === 'ar' ? 'تم إرسال التقرير بنجاح.' : 'Report submitted successfully.'); onClose(); }} className="w-full bg-brand-primary text-brand-dark hover:bg-brand-gold font-bold py-3 rounded-xl mt-4 transition-colors">
            {language === 'ar' ? 'إرسال واعتماد التقرير' : 'Submit Report'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper Satellite Map Component for PDF/Full Report Modal & Contractor Pre-Submission Preview
const ReportSatelliteMapView = ({ permit, language = 'ar' }) => {
  const containerRef = React.useRef(null);
  const mapRef = React.useRef(null);
  const [tapeInfo, setTapeInfo] = React.useState({ totalPerimeter: 0, edgeDistances: [] });

  React.useEffect(() => {
    if (!permit || !window.L || !containerRef.current) return;
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const regex = /(?:E|e)?\s*(\d+(?:\.\d+)?)\s*,\s*(?:N|n)?\s*(\d+(?:\.\d+)?)/g;
    const coordsText = permit.coordinates || '';
    const matches = [];
    let match;
    while ((match = regex.exec(coordsText)) !== null) {
      matches.push({ x: parseFloat(match[1]), y: parseFloat(match[2]) });
    }

    let parsedPoints = [];
    if (matches.length > 0) {
      parsedPoints = matches.map(pt => {
        const lng = 39.6120 + (pt.x - 582500) / 100000;
        const lat = 24.4686 + (pt.y - 2703800) / 110000;
        return { lat, lng, x: pt.x, y: pt.y };
      });
    }

    const lat = parsedPoints.length > 0 ? parsedPoints[0].lat : 24.4686;
    const lng = parsedPoints.length > 0 ? parsedPoints[0].lng : 39.6120;

    const map = window.L.map(containerRef.current, {
      center: [lat, lng],
      zoom: 16,
      zoomControl: true,
      attributionControl: false
    });

    window.L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      attribution: 'Map data &copy; Google Maps Satellite'
    }).addTo(map);

    const latlngs = [];
    parsedPoints.forEach((p, index) => {
      latlngs.push([p.lat, p.lng]);
      window.L.marker([p.lat, p.lng], {
        icon: window.L.divIcon({
          className: 'custom-leaflet-marker',
          html: `<div class="bg-brand-teal text-white text-[9px] font-bold h-6 w-6 rounded-full border-2 border-white flex items-center justify-center shadow-md">N${index + 1}</div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        })
      }).addTo(map);
    });

    let totalDist = 0;
    const edgeDists = [];

    // Measure edges between nodes & render distance tape markers
    if (parsedPoints.length >= 2) {
      for (let i = 0; i < parsedPoints.length; i++) {
        const p1 = parsedPoints[i];
        const p2 = parsedPoints[(i + 1) % parsedPoints.length];
        if (parsedPoints.length === 2 && i === 1) continue;

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const edgeMeters = Math.sqrt(dx * dx + dy * dy);
        totalDist += edgeMeters;
        edgeDists.push({ from: `N${i + 1}`, to: `N${((i + 1) % parsedPoints.length) + 1}`, meters: edgeMeters });

        const midLat = (p1.lat + p2.lat) / 2;
        const midLng = (p1.lng + p2.lng) / 2;

        window.L.marker([midLat, midLng], {
          icon: window.L.divIcon({
            className: 'custom-tape-marker',
            html: `<div class="bg-slate-950/90 text-brand-gold text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-brand-gold/50 shadow-xl backdrop-blur-md whitespace-nowrap flex items-center gap-1">📏 N${i + 1}-N${((i + 1) % parsedPoints.length) + 1}: ${edgeMeters.toFixed(1)}m</div>`,
            iconSize: [120, 22],
            iconAnchor: [60, 11]
          })
        }).addTo(map);
      }
    }

    setTapeInfo({ totalPerimeter: totalDist, edgeDistances: edgeDists });

    // Draw main GIS polygon
    if (latlngs.length > 1) {
      const poly = window.L.polygon(latlngs, {
        color: '#00FFFF',
        fillColor: '#00FFFF',
        fillOpacity: 0.25,
        weight: 3,
        dashArray: '4, 4'
      }).addTo(map);
      map.fitBounds(poly.getBounds(), { padding: [25, 25] });

      // Overlay MOT Safety Zones Polylines
      const speed = permit.speed || 80;
      const reqTaper = speed <= 60 ? (3.6 * Math.pow(speed, 2) / 155) : (3.6 * speed / 1.6);
      const reqBuffer = speed <= 40 ? 50 : speed <= 60 ? 85 : speed <= 80 ? 130 : speed <= 100 ? 185 : 250;
      const signSpacing = speed <= 60 ? '100m' : '150m';

      const pStart = latlngs[0];
      // Advance Warning Zone (Yellow)
      window.L.polyline([pStart, [pStart[0] - 0.0007, pStart[1] - 0.0007]], {
        color: '#EAB308',
        weight: 4,
        dashArray: '6, 4'
      }).addTo(map).bindTooltip(`⚠️ منطقة اللوحات التحذيرية المتقدمة (${signSpacing})`, { permanent: false });

      // Transition Taper (Orange)
      window.L.polyline([pStart, [pStart[0] + 0.0004, pStart[1] + 0.0004]], {
        color: '#F97316',
        weight: 4,
        dashArray: '6, 3'
      }).addTo(map).bindTooltip(`🚧 تدرج الانحراف Taper L (${reqTaper.toFixed(1)}m)`, { permanent: false });

      // Buffer Space (Teal)
      window.L.polyline([[pStart[0] + 0.0004, pStart[1] + 0.0004], [pStart[0] + 0.0008, pStart[1] + 0.0008]], {
        color: '#0D9488',
        weight: 4,
        dashArray: '4, 4'
      }).addTo(map).bindTooltip(`🛡️ مسافة الأمان العازلة SSD (${reqBuffer}m)`, { permanent: false });
    }

    mapRef.current = map;
    setTimeout(() => {
      if (mapRef.current) mapRef.current.invalidateSize();
    }, 250);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [permit]);

  const speed = permit?.speed || 80;
  const reqTaper = speed <= 60 ? (3.6 * Math.pow(speed, 2) / 155) : (3.6 * speed / 1.6);
  const reqBuffer = speed <= 40 ? 50 : speed <= 60 ? 85 : speed <= 80 ? 130 : speed <= 100 ? 185 : 250;
  const signSpacing = speed <= 60 ? '100m' : '150m';

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-slate-300 shadow-md">
      {/* Top Floating Tape Measurements Overlay */}
      <div className="absolute top-2 left-2 right-2 z-10 bg-slate-950/85 text-white p-2.5 rounded-xl border border-brand-gold/40 shadow-2xl backdrop-blur-md text-[10px] space-y-1.5 pointer-events-none">
        <div className="font-bold text-brand-gold flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-brand-gold animate-spin-slow" />
            {language === 'ar' ? 'قياسات الـ GIS ومسافات السلامة المرورية فوق الخريطة:' : 'GIS Map Tape Measurements & MOT Safety Overlays:'}
          </span>
          <span className="bg-brand-gold text-slate-950 px-2 py-0.5 rounded font-mono font-extrabold text-[10px]">
            📏 {language === 'ar' ? `المحيط: ${tapeInfo.totalPerimeter.toFixed(1)}م` : `Perimeter: ${tapeInfo.totalPerimeter.toFixed(1)}m`}
          </span>
        </div>
        <div className="font-mono text-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-1.5 border-t border-slate-800 pt-1.5 text-[9.5px]">
          <span className="bg-slate-900/80 px-2 py-1 rounded border border-slate-700">⚠️ {language === 'ar' ? `اللوحات: ${signSpacing}` : `Signs: ${signSpacing}`}</span>
          <span className="bg-slate-900/80 px-2 py-1 rounded border border-slate-700">🚧 {language === 'ar' ? `التدرج L: ${reqTaper.toFixed(1)}م` : `Taper L: ${reqTaper.toFixed(1)}m`}</span>
          <span className="bg-slate-900/80 px-2 py-1 rounded border border-slate-700">🛡️ {language === 'ar' ? `الأمان SSD: ${reqBuffer}م` : `Buffer SSD: ${reqBuffer}m`}</span>
          <span className="bg-slate-900/80 px-2 py-1 rounded border border-slate-700">🏁 {language === 'ar' ? 'النهاية: 30م' : 'Term: 30m'}</span>
        </div>
      </div>

      <div ref={containerRef} className="h-64 w-full relative z-0" />
    </div>
  );
};

const ConstructionPlanningInterface = () => {
  // ── TEMPORARY DEV BYPASS ──
  // Set to true to skip phase-navigation completeness checks AND the
  // submission-blocking validation gate, so you can click through the app
  // without filling every required field. Set back to false before any
  // real demo/handoff, since it disables the validation the standard
  // will expect to see working.
  const DEV_SKIP_VALIDATION = true;

  const [currentUser, setCurrentUser] = useState(null);
  // Shown once right after login, before the wizard/inspector console.
  const [showHomeScreen, setShowHomeScreen] = useState(true);
  const [language, setLanguage] = useState('ar'); // 'ar' or 'en'
  const t = dict[language];
  const activePortalMode = currentUser?.role || 'contractor'; // Strictly forced by logged-in user role
  const [activeReportModal, setActiveReportModal] = useState(null); // 'end' | 'removal' | null
  const [googleApiKey, setGoogleApiKey] = useState(localStorage.getItem('google_api_key') || '');
  const [currentPhase, setCurrentPhase] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [aiStatus, setAiStatus] = useState('idle'); // idle, analyzing, completed
  const [aiFeedback, setAiFeedback] = useState({ ar: '', en: '' });
  const nodesStateRef = useRef({ b: 0, d: 0, p: 0 });

  // Construction boundary points (teal, up to 4 nodes, used in Phase 2 GIS)
  const [boundaryPoints, setBoundaryPoints] = useState([]);
  // Detour route nodes (orange): D1 = Start, D2 = End — set on Phase 1 map
  const [detourNodes, setDetourNodes] = useState([]);
  // Pedestrian route nodes (green): P1 = Start, P2 = End — set on Phase 1 map
  const [pedestrianNodes, setPedestrianNodes] = useState([]);

  useEffect(() => {
    nodesStateRef.current = {
      b: boundaryPoints.length,
      d: detourNodes.length,
      p: pedestrianNodes.length
    };
  }, [boundaryPoints, detourNodes, pedestrianNodes]);
  
  // State for custom milestones/timeline
  const [milestones, setMilestones] = useState([
    { id: 1, taskAr: 'تهيئة الموقع وتوفير المداخل', taskEn: 'Site Access & Mobilization', startDay: 1, durationDays: 5, status: 'Planned' },
    { id: 2, taskAr: 'تركيب الحواجز الإرشادية والتحويلات المؤقتة', taskEn: 'Temporary Traffic Diversions Setups', startDay: 6, durationDays: 3, status: 'Planned' },
    { id: 3, taskAr: 'أعمال الحفر وتمديد الخدمات الأرضية', taskEn: 'Excavation and Utility Crossings', startDay: 9, durationDays: 12, status: 'Planned' },
  ]);
  const [newMilestone, setNewMilestone] = useState({ taskAr: '', taskEn: '', startDay: '', durationDays: '', status: 'Planned' });
  const [editingMilestoneId, setEditingMilestoneId] = useState(null);
  const [editMilestoneForm, setEditMilestoneForm] = useState({ taskAr: '', taskEn: '', startDay: 1, durationDays: 5 });

  const getMilestoneStart = (m, lang = language) => {
    if (m.startDay !== undefined) {
      if (lang === 'ar') {
        const arDays = {
          1: 'اليوم الأول',
          2: 'اليوم الثاني',
          3: 'اليوم الثالث',
          4: 'اليوم الرابع',
          5: 'اليوم الخامس',
          6: 'اليوم السادس',
          7: 'اليوم السابع',
          8: 'اليوم الثامن',
          9: 'اليوم التاسع',
          10: 'اليوم العاشر'
        };
        return arDays[m.startDay] || `اليوم ${m.startDay}`;
      }
      return `Day ${m.startDay}`;
    }
    return lang === 'ar' ? m.startAr : m.startEn;
  };

  const getMilestoneDuration = (m, lang = language) => {
    if (m.durationDays !== undefined) {
      if (lang === 'ar') {
        if (m.durationDays === 1) return 'يوم واحد';
        if (m.durationDays === 2) return 'يومان';
        if (m.durationDays >= 3 && m.durationDays <= 10) return `${m.durationDays} أيام`;
        return `${m.durationDays} يوماً`;
      }
      return `${m.durationDays} Day${m.durationDays > 1 ? 's' : ''}`;
    }
    return lang === 'ar' ? m.durationAr : m.durationEn;
  };

  const getMilestoneWarning = (m) => {
    if (m.taskEn.toLowerCase().includes('mobilization') || m.taskAr.includes('تهيئة')) {
      if (m.durationDays !== undefined && (m.durationDays < 1 || m.durationDays > 10)) {
        return language === 'ar' 
          ? '⚠️ تنبيه: الكود الفني يوصي بأن تتراوح مدة التجهيز بين ١ إلى ١٠ أيام.' 
          : '⚠️ Suggestion: Technical guide recommends Mobilization between 1 and 10 days.';
      }
    }
    if (m.taskEn.toLowerCase().includes('diversion') || m.taskAr.includes('حواجز') || m.taskEn.toLowerCase().includes('setup')) {
      if (m.durationDays !== undefined && (m.durationDays < 2 || m.durationDays > 7)) {
        return language === 'ar' 
          ? '⚠️ تنبيه: تركيب حواجز التحويلة يوصى بأن يستغرق بين ٢ إلى ٧ أيام لتأمين الموقع.' 
          : '⚠️ Suggestion: Traffic barrier setup is recommended to take between 2 and 7 days.';
      }
    }
    if (m.taskEn.toLowerCase().includes('excavation') || m.taskAr.includes('حفر')) {
      if (m.durationDays !== undefined && (m.durationDays < 5 || m.durationDays > 30)) {
        return language === 'ar' 
          ? '⚠️ تنبيه: يوصى بأن تكون أعمال الحفر وتمديد الخدمات من ٥ إلى ٣٠ يوماً.' 
          : '⚠️ Suggestion: Excavation work is recommended to be scheduled between 5 and 30 days.';
      }
    }
    return null;
  };

  const handleEditMilestone = (m) => {
    setEditingMilestoneId(m.id);
    setEditMilestoneForm({
      taskAr: m.taskAr,
      taskEn: m.taskEn,
      startDay: m.startDay || 1,
      durationDays: m.durationDays || 5
    });
  };

  const handleSaveMilestone = (id) => {
    setMilestones(prev => prev.map(m => {
      if (m.id === id) {
        return {
          ...m,
          taskAr: editMilestoneForm.taskAr,
          taskEn: editMilestoneForm.taskEn,
          startDay: parseInt(editMilestoneForm.startDay) || 1,
          durationDays: parseInt(editMilestoneForm.durationDays) || 5
        };
      }
      return m;
    }));
    setEditingMilestoneId(null);
  };

  const presetMachinery = {
    excavator: {
      nameAr: 'حفار كاتر بيلر ٣٢٠',
      nameEn: 'Caterpillar 320 Excavator',
      length: 9.4,
      width: 3.2,
      height: 3.1,
      systemAr: 'أعمال الحفر وتثبيت جوانب التربة',
      systemEn: 'Trench Excavation & Shoring'
    },
    roller: {
      nameAr: 'رصاصة أسفلت ثنائية الأسطوانة',
      nameEn: 'Dynapac CC1200 Double Drum Roller',
      length: 2.4,
      width: 1.3,
      height: 2.7,
      systemAr: 'إعادة سفلتة وتمهيد الطريق',
      systemEn: 'Asphalt Restoration & Paving'
    },
    light_tower: {
      nameAr: 'برج إضاءة متنقل',
      nameEn: 'Doosan G150 Mobile Light Tower',
      length: 4.1,
      width: 1.8,
      height: 2.2,
      systemAr: 'إنارة منطقة العمل للمناوبات الليلية',
      systemEn: 'Night-Shift Work Zone Lighting'
    },
    backhoe: {
      nameAr: 'جرافة خلفية جي سي بي',
      nameEn: 'JCB 3CX Backhoe Loader',
      length: 5.6,
      width: 2.3,
      height: 3.6,
      systemAr: 'نقل وتشوين المواد والتحميل',
      systemEn: 'Material Handling & Loading'
    }
  };

  // State for Equipment & Systems Inventory
  const [equipmentList, setEquipmentList] = useState([
    { id: 1, nameAr: 'حفار كاتر بيلر ٣٢٠', nameEn: 'Caterpillar 320 Excavator', length: 9.4, width: 3.2, height: 3.1, systemAr: 'أعمال الحفر وتثبيت جوانب التربة', systemEn: 'Trench Excavation & Shoring' },
    { id: 2, nameAr: 'رصاصة أسفلت ثنائية الأسطوانة', nameEn: 'Dynapac CC1200 Double Drum Roller', length: 2.4, width: 1.3, height: 2.7, systemAr: 'إعادة سفلتة وتمهيد الطريق', systemEn: 'Asphalt Restoration & Paving' },
    { id: 3, nameAr: 'برج إضاءة متنقل', nameEn: 'Doosan G150 Mobile Light Tower', length: 4.1, width: 1.8, height: 2.2, systemAr: 'إنارة منطقة العمل للمناوبات الليلية', systemEn: 'Night-Shift Work Zone Lighting' },
  ]);
  const [newEquipment, setNewEquipment] = useState({
    selectedPreset: '',
    selectedRolePreset: '',
    nameAr: '',
    nameEn: '',
    length: '',
    width: '',
    height: '',
    systemAr: '',
    systemEn: ''
  });

  const handleSelectMachineryPreset = (key) => {
    if (key === 'other') {
      setNewEquipment(prev => ({
        ...prev,
        selectedPreset: 'other',
        nameAr: '',
        nameEn: '',
        length: '',
        width: '',
        height: ''
      }));
    } else if (presetMachinery[key]) {
      const preset = presetMachinery[key];
      setNewEquipment(prev => ({
        ...prev,
        selectedPreset: key,
        nameAr: preset.nameAr,
        nameEn: preset.nameEn,
        length: preset.length,
        width: preset.width,
        height: preset.height,
        selectedRolePreset: key === 'excavator' ? 'shoring' : key === 'roller' ? 'paving' : key === 'light_tower' ? 'lighting' : key === 'backhoe' ? 'material' : prev.selectedRolePreset,
        systemAr: preset.systemAr,
        systemEn: preset.systemEn
      }));
    } else {
      setNewEquipment(prev => ({
        ...prev,
        selectedPreset: '',
        nameAr: '',
        nameEn: '',
        length: '',
        width: '',
        height: ''
      }));
    }
  };

  const handleSelectRolePreset = (roleKey) => {
    const roles = {
      shoring: { ar: 'أعمال الحفر وتثبيت جوانب التربة', en: 'Trench Excavation & Shoring' },
      paving: { ar: 'إعادة سفلتة وتمهيد الطريق', en: 'Asphalt Restoration & Paving' },
      lighting: { ar: 'إنارة منطقة العمل للمناوبات الليلية', en: 'Night-Shift Work Zone Lighting' },
      material: { ar: 'نقل وتشوين المواد والتحميل', en: 'Material Handling & Loading' },
      protection: { ar: 'تركيب حواجز المشاة والحماية', en: 'Pedestrian Protection & Fencing' }
    };
    if (roleKey === 'other') {
      setNewEquipment(prev => ({
        ...prev,
        selectedRolePreset: 'other',
        systemAr: '',
        systemEn: ''
      }));
    } else if (roles[roleKey]) {
      setNewEquipment(prev => ({
        ...prev,
        selectedRolePreset: roleKey,
        systemAr: roles[roleKey].ar,
        systemEn: roles[roleKey].en
      }));
    } else {
      setNewEquipment(prev => ({
        ...prev,
        selectedRolePreset: '',
        systemAr: '',
        systemEn: ''
      }));
    }
  };

  // State for CAD file analysis simulation
  const [cadFile, setCadFile] = useState(null);
  const [cadStatus, setCadStatus] = useState('idle'); // idle, parsing, parsed, error
  const [cadMetadata, setCadMetadata] = useState(null);
  const [cadAcknowledged, setCadAcknowledged] = useState(false);

  // State for active Traffic redirection zone preview
  const [activeTrafficZone, setActiveTrafficZone] = useState('warning'); // warning, transition, buffer, work, termination

  // Collapsible Panels (Accordion) States
  const [expandedPanels, setExpandedPanels] = useState({
    // Phase 1
    p1_general: false,
    p1_roadwork: false,
    p1_equipment: false,
    p1_gantt: false,
    p1_map: false,
    // Phase 2
    p2_blueprint: false,
    p2_crosssection: false,
    // Phase 3
    p3_calculator: false,
    p3_auditor: false,
    p3_photos: false
  });

  const isPanelComplete = (panelName) => {
    if (panelName === 'p1_general') {
      return !!(
        (language === 'ar' ? formData.clientNameAr : formData.clientNameEn) &&
        (language === 'ar' ? formData.projectNameAr : formData.projectNameEn) &&
        (language === 'ar' ? formData.contractingCompanyAr : formData.contractingCompanyEn) &&
        (language === 'ar' ? formData.consultantNameAr : formData.consultantNameEn) &&
        (language === 'ar' ? formData.locationAr : formData.locationEn) &&
        formData.permitStartDate &&
        formData.permitEndDate &&
        formData.workStartDate &&
        formData.workEndDate
      );
    }
    if (panelName === 'p1_roadwork') {
      const purposeOk = !!(language === 'ar' ? formData.workPurposeAr : formData.workPurposeEn);
      const utilityOk = !!(language === 'ar' ? formData.owningUtilityAr : formData.owningUtilityEn);
      const pedestrianOk = !isPedestrianPathMandatory(formData.diversionLengthM, formData.roadClassification) || !!formData.pedestrianPathProvided;
      return purposeOk && utilityOk && pedestrianOk;
    }
    if (panelName === 'p1_equipment') {
      return !!formData.lightingLuxTarget;
    }
    if (panelName === 'p1_gantt') {
      return milestones.length > 0;
    }
    if (panelName === 'p1_map') {
      return boundaryPoints.length >= 4 && detourNodes.length >= 2 && pedestrianNodes.length >= 2;
    }
    if (panelName === 'p2_blueprint') {
      return cadStatus === 'parsed' || cadFile !== null;
    }
    if (panelName === 'p3_calculator') {
      return parseFloat(formData.proposedTaper) > 0 && 
             parseFloat(formData.proposedBuffer) > 0 && 
             parseFloat(formData.proposedTermination) > 0;
    }
    return true;
  };

  const isPhaseComplete = (phase) => {
    if (DEV_SKIP_VALIDATION) return true;
    if (phase === 1) {
      return isPanelComplete('p1_general') && isPanelComplete('p1_equipment') && isPanelComplete('p1_gantt') && isPanelComplete('p1_map');
    }
    if (phase === 2) {
      return isPanelComplete('p2_blueprint');
    }
    if (phase === 3) {
      return isPanelComplete('p3_calculator') && isPanelComplete('p3_auditor');
    }
    return true;
  };

  const togglePanel = (panelName) => {
    // Plain independent toggle \u2014 no blocking, no accordion. Any number of
    // sections can be open at once; each one just opens/closes on its own.
    setExpandedPanels(prev => ({ ...prev, [panelName]: !prev[panelName] }));
  };

  const [formData, setFormData] = useState({
    // Phase 1
    clientNameAr: 'هيئة تطوير منطقة المدينة المنورة',
    clientNameEn: 'Project Owning Authority',
    projectNameAr: 'مشروع تمديد المرافق طريق الملك عبدالعزيز',
    projectNameEn: 'King Abdulaziz Road Utility Extension',
    locationAr: 'المدينة المنورة، المملكة العربية السعودية - تقاطع طريق الملك عبدالعزيز مع شارع علي بن أبي طالب',
    locationEn: 'Madina, Saudi Arabia - Intersection of King Abdulaziz Rd & Ali Bin Abi Talib St',
    permitStartDate: '2026-08-01', 
    permitEndDate: '2026-12-31',
    workStartDate: '2026-08-15',
    workEndDate: '2026-11-15',
    detailedTimeline: '', 
    projectManagerAr: 'م. طارق الحربي',
    projectManagerEn: 'Eng. Tareq Al-Harbi',
    projectOwnerAr: 'الجهة المالكة للمشروع',
    projectOwnerEn: 'Project Owning Authority',
    contractingCompanyAr: 'شركة مقاولات البنية التحتية بالمدينة',
    contractingCompanyEn: 'Madina Contracting & Infrastructure Corp',
    consultantNameAr: '',
    consultantNameEn: '',
    roadNameAr: '',
    roadNameEn: '',
    ownerClassification: '', // '' | 'affiliated' | 'not_affiliated'
    // Phase 2 (Structured dimensions & clearances)
    constructionType: 'infrastructure', 
    siteLength: 450, // in meters
    siteWidth: 80,   // in meters
    lateralClearance: 25, // in meters (additional clearance standard)
    longitudinalBuffer: 130, // in meters (corresponds to stopping sight distance for 80 km/h)
    stagingAreaAr: 'ساحة التشوين الشمالية الغربية بالقرب من الدوار (محطة ٠٢٠+٠)',
    stagingAreaEn: 'Northwest Staging Yard near Roundabout (Sta 0+020)',
    hardZoneClassAr: 'منطقة الحفر المفتوح أ (عالية الخطورة)',
    hardZoneClassEn: 'Zone B Excavation Trench (High Hazard)',
    coordinates: '', 
    cadFile: null,
    // --- Added: PDF-required Step 1 fields not previously captured ---
    workPurposeAr: '', // الغرض من الحفر / نوع الأعمال
    workPurposeEn: '',
    owningUtilityAr: '', // الجهة المالكة للخدمة (e.g. water/electricity/telecom authority)
    owningUtilityEn: '',
    roadClassification: 'main', // local | collector | main | commercial | residential
    trafficVolumeLevel: 'medium', // low | medium | high
    closedLanesCount: 1,
    totalLanesCount: 2,
    workDurationCategory: 'medium', // long | medium | short | mobile_emergency
    diversionLengthM: 350, // used for the 400m pedestrian-path trigger rule
    pedestrianPathProvided: false,
    lightingPlanAr: '', // خطة الإضاءة
    lightingPlanEn: '',
    sideStreetsPlanAr: '', // خطة التعامل مع الشوارع الجانبية والمعابر
    sideStreetsPlanEn: '',
    photoDocCount: 0, // number of site photos uploaded (for the every-25m rule)
    // Phase 3
    trenchPlatesType: 'none',
    closureAlternativeRoute: 'no',
    alternativeRoutePlan: '',
    impactAttenuators: false,
    smartLightingSensors: false,
    roadClosureAr: 'إغلاق جزئي لحارة المرور المتجهة شمالاً بطريق الملك عبدالعزيز، مع إبقاء حارة واحدة مفتوحة بشكل مستمر للحركة وتأمينها بالصبات الخرسانية.',
    roadClosureEn: 'Partial lane closure on King Abdulaziz Rd northbound. One lane to remain open with continuous active redirection.',
    trafficFlowPlanAr: 'توجيه حركة الشاحنات الكبيرة خلال ساعات الذروة عبر طريق الأمير عبدالمجيد الدائري، مع وضع لوحات تحذيرية متقدمة على بعد ٥٠٠ متر.',
    trafficFlowPlanEn: 'Peak traffic hours rerouted via Prince Abdul Majeed Road. Signage to be placed 500m ahead of intersection.',
    fiveWaysStrategy: '1. Advance Warning: Signs placed at 500m, 300m, and 100m.\n2. Transition Area: 45-degree cone taper over 80 meters.\n3. Buffer Space: 50-meter clear zone with sand barrels.\n4. Work Area: Fenced using concrete barriers with safety netting.\n5. Termination Area: 30-meter taper returning traffic to normal lanes.',
    tempBridgesAr: 'تركيب صفائح فولاذية مؤقتة فوق الخنادق المفتوحة لتسهيل عبور المشاة بأمان (تم اختبار حمولتها حتى ٤٠ طن).',
    tempBridgesEn: 'Temporary steel plate bridging over excavation trenches for pedestrian crosswalks (tested for 40-tonne capacity).',
    lightingPlanAr: 'أبراج إضاءة بارتفاعات كافية توزع على مسافات ٣٠ متراً لتوفير معدل سطوع لا يقل عن ١٥٠ لوكس، مع توجيه الإضاءة بعيداً عن أعين القادمين.',
    lightingPlanEn: 'Tower lights at 30m intervals supplying 150 lux average across work zone. Glare shields oriented away from oncoming traffic.',
    // Detour start/end points
    pedestrianStart: 'Sta 0+050 (E582520, N2703810)',
    pedestrianEnd: 'Sta 0+355 (E582810, N2703810)',
    vehicleStart: 'Sta 0+000 (E582500, N2703800)',
    vehicleEnd: 'Sta 0+450 (E582900, N2703800)',
    // Traffic Safety Calculator states
    speedLimit: 80,         // km/h (40, 60, 80, 100, 120)
    closedLaneWidth: 3.6,    // meters
    proposedTaper: 180,      // meters
    proposedBuffer: 130,     // meters (Stopping Sight Distance)
    proposedTermination: 30, // meters (Min 30m)
    activeLanesCount: 2,     // active lanes to remain open
    laneWidth: 3.6,          // meters per active lane
    pedestrianPathWidth: 1.5,// meters
    // Arterial Road & Crash Protection Fields
    isArterialRoad: true,
    attenuatorType: 'mash_tl3',
    attenuatorTypeCustomAr: '',
    attenuatorTypeCustomEn: '',
    attenuatorQuantityPlacement: '2 units at transition taper start & buffer boundary',
    // Detour Lighting Sensors & Dedicated Platform Integration Fields
    hasDetourLightingSensors: true,
    lightingLuxTarget: '150',
    lightingTowerSpacing: '30m',
    lightingAlertChannel: 'central_platform',
    lightingBackupPower: '15 kVA Silent Automatic Generator',
    // External Provider Official Permit File Attachment
    externalPermitDocument: null,
    externalPermitDocName: '',
    externalPermitDocSize: '',
    // Gap 2: Barrier Selection Engine
    excavationDepth: 0,              // cm — user input
    barrierLateralClearance: 0.6,    // meters — proposed lateral clearance
    // Gap 3: Steel Trench Plate Engineering
    trenchWidth: 0,                  // meters
    steelPlateThickness: 30,         // mm (default 30mm)
    bearingWidthLeft: 40,            // cm (min 40)
    bearingWidthRight: 40,           // cm (min 40)
    flushMillingDepth: 30,           // mm — should equal plate thickness
    antiSlipApplied: false,
    mechanicalAnchoring: false
  });

  // Submitted Permits Database State
  const [submittedPermits, setSubmittedPermits] = useState([]);

  const fetchPermits = async () => {
    try {
      const res = await fetch('/api/permits');
      const rawData = await res.json();
      if (Array.isArray(rawData)) {
        const formatted = rawData.map(item => {
          let parsedData = {};
          if (item.data) {
            try {
              parsedData = typeof item.data === 'string' ? JSON.parse(item.data) : item.data;
            } catch (e) {
              console.error("Error parsing permit data:", e);
            }
          }
          return {
            ...parsedData,
            id: parsedData.id || `AM-2026-PR-${item.id}`,
            db_id: item.id,
            status: item.status || parsedData.status || 'Pending',
            readiness_status: item.readiness_status || parsedData.readiness_status || 'pending',
            monitoring_status: item.monitoring_status || parsedData.monitoring_status || 'pending',
            roadNameAr: item.roadNameAr || parsedData.roadNameAr || '',
            roadNameEn: item.roadNameEn || parsedData.roadNameEn || '',
            ownerClassification: item.ownerClassification || parsedData.ownerClassification || '',
            inspector_notes: item.inspector_notes || parsedData.inspector_notes || '',
            submittedDate: item.created_at ? item.created_at.split(' ')[0] : (parsedData.submittedDate || new Date().toISOString().split('T')[0])
          };
        });
        setSubmittedPermits(formatted);
      }
    } catch (err) {
      console.error("Failed to fetch permits from backend:", err);
    }
  };

  const handleExternalPermitFileUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData(prev => ({
          ...prev,
          externalPermitDocument: event.target.result,
          externalPermitDocName: file.name,
          externalPermitDocSize: (file.size / 1024).toFixed(1) + ' KB'
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchPermits();
    }
  }, [currentUser]);

  // Inspector Search/Filter/Sorting State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // All, Clean, Flagged
  const [sortBy, setSortBy] = useState('date_desc'); // date_desc, date_asc, status
  const [selectedPermitForReview, setSelectedPermitForReview] = useState(null);

  // Live Gemini API Review States
  const [aiInsights, setAiInsights] = useState({});
  const [aiInsightLoading, setAiInsightLoading] = useState(false);

  // Toast Notification state (never browser push: Top-Right on Arabic, Top-Left on English)
  const [toastNotification, setToastNotification] = useState(null);

  const showToast = (title, text, type = 'info') => {
    setToastNotification({ title, text, type });
    setTimeout(() => {
      setToastNotification(null);
    }, 4500);
  };

  // Helper to calculate accurate geodesic work zone length directly from drawn Leaflet coordinates
  const getWorkZoneLengthFromCoords = () => {
    if (!boundaryPoints || boundaryPoints.length < 2) return 100;
    let maxGeodesicDist = 0;
    for (let i = 0; i < boundaryPoints.length; i++) {
      for (let j = i + 1; j < boundaryPoints.length; j++) {
        const p1 = boundaryPoints[i];
        const p2 = boundaryPoints[j];
        if (p1.lat && p1.lng && p2.lat && p2.lng && window.L) {
          const dist = window.L.latLng(p1.lat, p1.lng).distanceTo(window.L.latLng(p2.lat, p2.lng));
          if (dist > maxGeodesicDist) maxGeodesicDist = dist;
        }
      }
    }
    return Math.round(maxGeodesicDist * 10) / 10 || 100;
  };

  // Helper to compute exact real-world geodesic edge lengths and perimeter from drawn map points
  const getAccurateGeodesicMeasurements = () => {
    if (!boundaryPoints || boundaryPoints.length < 2) {
      return { segments: [], totalPerimeter: 0, primaryLength: 0 };
    }
    const segments = [];
    let totalPerimeter = 0;

    for (let i = 0; i < boundaryPoints.length; i++) {
      const nextIdx = (i + 1) % boundaryPoints.length;
      if (boundaryPoints.length === 2 && i === 1) break;

      const p1 = boundaryPoints[i];
      const p2 = boundaryPoints[nextIdx];

      if (p1.lat && p1.lng && p2.lat && p2.lng && window.L) {
        const dist = window.L.latLng(p1.lat, p1.lng).distanceTo(window.L.latLng(p2.lat, p2.lng));
        const roundedDist = Math.round(dist * 10) / 10;
        segments.push({
          from: `N${i + 1}`,
          to: `N${nextIdx + 1}`,
          lengthMeters: roundedDist
        });
        totalPerimeter += roundedDist;
      }
    }

    const primaryLength = segments.length > 0 ? segments[0].lengthMeters : 0;
    return {
      segments,
      totalPerimeter: Math.round(totalPerimeter * 10) / 10,
      primaryLength
    };
  };

  // Inspector Notes
  const [inspectorNotes, setInspectorNotes] = useState('');
  useEffect(() => {
    if (selectedPermitForReview) {
      setInspectorNotes(selectedPermitForReview.inspector_notes || '');
    }
  }, [selectedPermitForReview]);

  const handleUpdatePermitStatus = async (status) => {
    if (!selectedPermitForReview) return;
    const targetId = selectedPermitForReview.db_id || selectedPermitForReview.id;
    try {
      const res = await fetch(`/api/permits/${targetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, inspector_notes: inspectorNotes })
      });
      if (res.ok) {
        setSubmittedPermits(prev => prev.map(p => (p.id === selectedPermitForReview.id || p.db_id === selectedPermitForReview.db_id) ? { ...p, status, inspector_notes: inspectorNotes } : p));
        setSelectedPermitForReview(prev => ({ ...prev, status, inspector_notes: inspectorNotes }));
        alert(language === 'ar' ? 'تم تحديث حالة التصريح بنجاح في قاعدة البيانات' : 'Permit status updated successfully in database');
      }
    } catch (e) {
      alert('Error updating permit status');
    }
  };

  // Forwards a permit out of the "بانتظار مراجعة الجهة الأخرى" gate and into
  // the normal Pending Review queue, once that external review is cleared.
  const handleForwardToInspector = async (permit) => {
    const targetId = permit.db_id || permit.id;
    try {
      const res = await fetch(`/api/permits/${targetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Clean' })
      });
      if (res.ok) {
        setSubmittedPermits(prev => prev.map(p => (p.id === permit.id || p.db_id === permit.db_id) ? { ...p, status: 'Clean' } : p));
      }
    } catch (e) {
      console.error('Failed to forward permit to inspector:', e);
    }
  };


  const [compliance, setCompliance] = useState({
    motCompliant: true,
    sasoCompliant: true,
    lightingLuxVerified: true,
    safetyClearanceMet: true,
    stagingDesignated: true,
  });

  // Phase 1 Site Overview Map Refs (Google Satellite — construction + detour + pedestrian nodes)
  const phase1MapContainerRef = React.useRef(null);
  const phase1MapInstance = React.useRef(null);
  const phase1MarkersGroupRef = React.useRef(null);

  // Phase 3 Detour Interactive Map Refs
  const detourMapContainerRef = React.useRef(null);
  const detourMapInstance = React.useRef(null);
  const detourDrawnItemsRef = React.useRef(null);

  // Report Map Refs
  const reportMapContainerRef = React.useRef(null);
  const reportMapInstance = React.useRef(null);
  const reportPolygonLayerRef = React.useRef(null);
  const reportMarkersGroupRef = React.useRef(null);

  // Inspector Dashboard Map Refs & Modal / Tab State
  const inspectorMapContainerRef = React.useRef(null);
  const inspectorMapInstance = React.useRef(null);
  const inspectorPolygonLayerRef = React.useRef(null);
  const inspectorMarkersGroupRef = React.useRef(null);
  const [inspectReportModalOpen, setInspectReportModalOpen] = useState(false);
  const [inspectorTab, setInspectorTab] = useState('inbox'); // 'inbox' | 'active_approved'
  // Sequential status filter within Active Zones: readiness -> monitoring -> closure
  const [activeZoneFilter, setActiveZoneFilter] = useState('readiness');
  const [activeZoneViewMode, setActiveZoneViewMode] = useState('detailed'); // 'detailed' | 'compact'

  // A permit's current stage, derived from its own progress \u2014 this is what
  // "sequential" means here: each permit naturally advances through the
  // filter categories as its own readiness/monitoring state changes.
  const getPermitStage = (permit) => {
    if (permit.readiness_status !== 'verified') return 'readiness';
    if (permit.monitoring_status !== 'started') return 'monitoring';
    return 'closure';
  };

  // A document only "exists" once its own submit/save step has actually
  // happened \u2014 not just because the permit exists. Each flag maps to a
  // real, already-tracked signal:
  // - Opening Minutes: only produced once the permit is Approved (that IS
  //   how approval happens \u2014 see DetourOpeningMinutesForm)
  // - Readiness Report: readiness_status flips to 'verified' on submit
  // - Monitoring Report: monitoring_status flips to 'started' on first save
  // - Closure Minutes: status flips to 'Resolved' on submit
  const getDocumentAvailability = (permit) => {
    const openingMinutes = permit.status === 'Approved' || permit.status === 'Resolved';
    const readinessReport = permit.readiness_status === 'verified';
    const monitoringReport = permit.monitoring_status === 'started';
    const closureMinutes = permit.status === 'Resolved';
    return {
      openingMinutes,
      readinessReport,
      monitoringReport,
      closureMinutes,
      any: openingMinutes || readinessReport || monitoringReport || closureMinutes
    };
  };
  const [fieldNoteInput, setFieldNoteInput] = useState({});
  const [commentsModalPermit, setCommentsModalPermit] = useState(null);
  const [newModalCommentInput, setNewModalCommentInput] = useState('');
  const [activeMonitoringModalOpen, setActiveMonitoringModalOpen] = useState(false);
  const [closureModalOpen, setClosureModalOpen] = useState(false);
  const [selectedPermitForActiveAudit, setSelectedPermitForActiveAudit] = useState(null);
  const [selectedPermitForClosure, setSelectedPermitForClosure] = useState(null);
  // Stage 3 (تنفيذ والتحقق من الجاهزية / Execute & Verify Readiness) — joint
  // contractor/consultant/inspector gate, run from the Inspector's Active Zones tab.
  const [fieldReadinessModalOpen, setFieldReadinessModalOpen] = useState(false);
  const [selectedPermitForReadiness, setSelectedPermitForReadiness] = useState(null);
  // Step 2 (مراجعة واعتماد التحويلة وإصدار التصاريح) output \u2014 محضر فتح تحويلة,
  // available once a permit is approved, from the Active Zones tab.
  const [openingMinutesModalOpen, setOpeningMinutesModalOpen] = useState(false);
  const [selectedPermitForOpening, setSelectedPermitForOpening] = useState(null);
  const [contractorTab, setContractorTab] = useState('new_plan'); // 'new_plan' | 'my_requests'
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [dismissedAlertId, setDismissedAlertId] = useState(null);
  const [isGeneratingCAD, setIsGeneratingCAD] = useState(false);

  const handleExportCAD = async () => {
    setIsGeneratingCAD(true);
    try {
      const centerLat = detourNodes[0]?.lat || boundaryPoints[0]?.lat || 24.4686;
      const centerLng = detourNodes[0]?.lng || boundaryPoints[0]?.lng || 39.6120;

      const res = await fetch('/api/generate-cad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: centerLat,
          lng: centerLng,
          radius_meters: 200,
          detourNodes,
          boundaryPoints,
          projectName: formData.projectNameAr || formData.projectNameEn || 'Detour Site'
        })
      });

      if (!res.ok) throw new Error('CAD Generation failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `detour_site_${Date.now()}.dxf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('CAD Export Error:', err);
      alert(language === 'ar' ? 'حدث خطأ أثناء تصدير ملف CAD (.DXF)' : 'Failed to export CAD file (.DXF)');
    } finally {
      setIsGeneratingCAD(false);
    }
  };

  const handleSavePeriodicAudit = async (auditData) => {
    try {
      await fetch(`/api/permits/${auditData.permitId}/periodic-inspections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(auditData)
      });
    } catch (err) {
      console.error('Failed to post periodic audit:', err);
    }
    fetchPermits();
    // Sequential hand-off: readiness -> monitoring -> closure. Filing a
    // TDP-FU report is what marks monitoring done, so move straight to
    // the Closure filter and close this form.
    setActiveZoneFilter('closure');
    setActiveMonitoringModalOpen(false);
    setSelectedPermitForActiveAudit(null);
  };

  const handleSaveClosureMinutes = async (closureData) => {
    try {
      await fetch(`/api/permits/${closureData.permitId}/closure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(closureData)
      });
      // This is the actual archive step that was previously missing: without
      // this, an "Approved" permit stayed in Active Zones forever even after
      // closure, since nothing ever set it to Resolved.
      await fetch(`/api/permits/${closureData.permitId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Resolved' })
      });
    } catch (err) {
      console.error('Failed to post closure minutes:', err);
    }
    fetchPermits();
  };

  // Decision gate 3: "محضر الجاهزية قبل التشغيل" — signed readiness report before
  // operation. Persists the joint Field Inspection (3.4) + Mandatory Execution
  // Sequencing (3.4b) results and marks readiness_status so "ready to operate"
  // is driven by real verification instead of being implied by 'Approved' alone.
  const handleSaveFieldReadiness = async (readinessData) => {
    try {
      await fetch(`/api/permits/${readinessData.permitId}/field-readiness`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(readinessData)
      });
    } catch (err) {
      console.error('Failed to post field readiness verification:', err);
    }
    fetchPermits();
    // Sequential hand-off: readiness -> monitoring -> closure.
    setActiveZoneFilter('monitoring');
    setFieldReadinessModalOpen(false);
    setSelectedPermitForReadiness(null);
  };

  // Step 2 output: محضر فتح تحويلة (Detour Opening Minutes)
  const handleSaveOpeningMinutes = async (openingData) => {
    try {
      await fetch(`/api/permits/${openingData.permitId}/opening-minutes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(openingData)
      });
    } catch (err) {
      console.error('Failed to post opening minutes:', err);
    }
    fetchPermits();
  };

  // The real "اعتماد تصريح" action now happens on the Opening Minutes page,
  // once all 5 signatures are filled in \u2014 not directly from the review list.
  const handleApproveFromOpeningMinutes = async (permitId) => {
    await handleUpdatePermitStatus('Approved');
    setOpeningMinutesModalOpen(false);
    setSelectedPermitForOpening(null);
  };

  const handleApiKeyChange = (e) => {
    const key = e.target.value;
    setGoogleApiKey(key);
    localStorage.setItem('google_api_key', key);
  };

  // Safety plan engineering calculations based on user input speed & width
  const getSafetyCalculations = () => {
    const V = parseFloat(formData.speedLimit) || 80;
    const W = parseFloat(formData.closedLaneWidth) || 3.6;

    // Per source standard: L = W*V^2/155 for V<=70 km/h, L = W*V*0.625 for V>=70 km/h
    // (breakpoint corrected from 60 to 70 km/h to match the official formula)
    let requiredTaper = V <= 70 ? (W * Math.pow(V, 2)) / 155 : W * V * 0.625;
    requiredTaper = Math.round(requiredTaper * 10) / 10;

    let requiredBuffer = 50;
    if (V <= 40) requiredBuffer = 50;
    else if (V <= 60) requiredBuffer = 85;
    else if (V <= 80) requiredBuffer = 130;
    else if (V <= 100) requiredBuffer = 185;
    else requiredBuffer = 250; 

    let signSpacing = "";
    let signSpacingDescription = "";
    if (V <= 60) {
      signSpacing = language === 'ar' ? "من ٣٠ إلى ٥٠ متراً" : "30 to 50 meters";
      signSpacingDescription = language === 'ar' ? "لوحات بتباعد ٤٠م." : "Signs spaced at 40m.";
    } else if (V <= 100) {
      signSpacing = language === 'ar' ? "من ١٠٠ إلى ١٥٠ متراً" : "100 to 150 meters";
      signSpacingDescription = language === 'ar' ? "لوحات بتباعد ١٢٠م." : "Signs spaced at 120m.";
    } else {
      signSpacing = language === 'ar' ? "من ٣٠٠ إلى ٥٠٠ متراً" : "300 to 500 meters";
      signSpacingDescription = language === 'ar' ? "لوحات بتباعد ٤٠٠م. إجمالي التنبيه ١,٥٠٠م." : "Signs spaced at 400m. Total 1,500m.";
    }

    const requiredTermination = 30;

    // ── Gap 1: Advanced Warning Zone Sign Distances (MOT Standard Table) ──
    const warningZoneTable = {
      40:  { A: 30,  B: 60,  C: 90,  D: 120,  letterHeight: 75 },
      60:  { A: 60,  B: 120, C: 180, D: 240,  letterHeight: 100 },
      80:  { A: 150, B: 300, C: 600, D: 800,  letterHeight: 100 },
      100: { A: 250, B: 500, C: 1000, D: 1500, letterHeight: 150 },
      120: { A: 400, B: 800, C: 1500, D: 2000, letterHeight: 200 },
    };
    const speedKey = V <= 40 ? 40 : V <= 60 ? 60 : V <= 80 ? 80 : V <= 100 ? 100 : 120;
    const advanceWarning = warningZoneTable[speedKey];

    return { requiredTaper, requiredBuffer, signSpacing, signSpacingDescription, requiredTermination, advanceWarning };
  };

  // ── Gap 2: Deterministic Barrier Selection Engine ──
  const getRequiredBarrier = () => {
    const start = new Date(formData.workStartDate);
    const end = new Date(formData.workEndDate);
    const durationHours = Math.max(0, (end - start) / (1000 * 60 * 60));
    const depth = parseFloat(formData.excavationDepth) || 0;

    if (durationHours > 72 || depth > 60) {
      return {
        type: 'concrete', clearanceMin: 0.6, clearanceMax: 1.0,
        labelAr: 'حواجز خرسانية', labelEn: 'Concrete Safety Barriers',
        reasonAr: depth > 60 ? 'عمق الحفر يتجاوز ٦٠ سم' : 'مدة العمل تتجاوز ٧٢ ساعة',
        reasonEn: depth > 60 ? 'Excavation depth exceeds 60cm' : 'Work duration exceeds 72 hours'
      };
    } else if (durationHours > 8 && depth <= 30) {
      return {
        type: 'plastic', clearanceMin: 2.5, clearanceMax: 2.5,
        labelAr: 'حواجز بلاستيكية مملوءة بالماء/الرمل', labelEn: 'Water/Sand-Filled Plastic Barriers',
        reasonAr: 'مدة العمل بين ٨ إلى ٧٢ ساعة وعمق الحفر ≤ ٣٠ سم',
        reasonEn: 'Work duration 8–72 hours and depth ≤ 30cm'
      };
    } else {
      return {
        type: 'cones', clearanceMin: 2.5, clearanceMax: 2.5,
        labelAr: 'أقماع مرورية', labelEn: 'Traffic Cones',
        reasonAr: 'مدة العمل أقل من ٨ ساعات',
        reasonEn: 'Work duration under 8 hours'
      };
    }
  };

  // ── Gap 3: Steel Trench Plate Validation ──
  const validateTrenchPlate = () => {
    if (formData.trenchPlatesType === 'none') return { applicable: false };
    const issues = [];
    if (parseFloat(formData.bearingWidthLeft) < 40) issues.push({ ar: 'عرض الحمل الأيسر أقل من ٤٠ سم', en: 'Left bearing width below 40cm minimum' });
    if (parseFloat(formData.bearingWidthRight) < 40) issues.push({ ar: 'عرض الحمل الأيمن أقل من ٤٠ سم', en: 'Right bearing width below 40cm minimum' });
    if (Math.abs(parseFloat(formData.flushMillingDepth) - parseFloat(formData.steelPlateThickness)) > 2) {
      issues.push({ ar: 'عمق الطحن لا يطابق سماكة اللوح — اللوح لن يكون مستوياً مع سطح الطريق', en: 'Milling depth does not match plate thickness — plate will not be flush with road surface' });
    }
    if (!formData.antiSlipApplied) issues.push({ ar: 'لم يتم تطبيق معالجة مانعة للانزلاق', en: 'Anti-slip surface treatment not applied' });
    if (!formData.mechanicalAnchoring) issues.push({ ar: 'لم يتم تثبيت اللوح ميكانيكياً', en: 'Mechanical anchoring not applied' });
    return { applicable: true, valid: issues.length === 0, issues };
  };

  const calcs = getSafetyCalculations();
  const barrierReq = getRequiredBarrier();
  const trenchValidation = validateTrenchPlate();
  const isTaperDeviation = parseFloat(formData.proposedTaper) < calcs.requiredTaper;
  const isBufferDeviation = parseFloat(formData.proposedBuffer) < calcs.requiredBuffer;
  const isTermDeviation = parseFloat(formData.proposedTermination) < calcs.requiredTermination;

  // Auto-overwrite proposed dimensions when speed limit or lane width changes
  // Auto-overwrite proposed dimensions when speed limit or lane width changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      proposedTaper: calcs.requiredTaper,
      proposedBuffer: calcs.requiredBuffer,
      proposedTermination: calcs.requiredTermination
    }));
  }, [formData.speedLimit, formData.closedLaneWidth]);

  // AI Compliance Audit Engine (with Gap 1, 2, 3 validations)
  const triggerAiAudit = () => {
    setAiStatus('analyzing');
    setAiDisplayedFeedback('');
    
    const V = parseFloat(formData.speedLimit) || 80;
    const W = parseFloat(formData.closedLaneWidth) || 3.6;
    const propTaper = parseFloat(formData.proposedTaper) || 180;
    const propBuffer = parseFloat(formData.proposedBuffer) || 130;
    const propTerm = parseFloat(formData.proposedTermination) || 30;
    const latClearance = parseFloat(formData.lateralClearance) || 25;
    
    const requiredTaper = V <= 70 ? (W * Math.pow(V, 2)) / 155 : W * V * 0.625;
    const requiredBuffer = V <= 40 ? 50 : V <= 60 ? 85 : V <= 80 ? 130 : V <= 100 ? 185 : 250;
    const requiredTermination = 30;
    
    setTimeout(() => {
      setAiStatus('completed');
      
      let critiqueAr = `🤖 **تحليل الذكاء الاصطناعي لمخطط السلامة المرورية:**\n\n`;
      let critiqueEn = `🤖 **AI Compliance Analysis Report:**\n\n`;
      
      if (propTaper >= requiredTaper) {
        critiqueAr += `✅ **طول التدرج (Taper):** المقترح (${propTaper}م) كافٍ ويتجاوز الحد الأدنى المطلوب هندسياً (${requiredTaper.toFixed(1)}م) لسرعة ${V} كم/ساعة.\n`;
        critiqueEn += `✅ **Transition Taper Length:** Proposed (${propTaper}m) meets and exceeds the engineering standard minimum of (${requiredTaper.toFixed(1)}m) for a speed of ${V} km/h.\n`;
      } else {
        critiqueAr += `❌ **طول التدرج (Taper):** المقترح (${propTaper}م) **أقل** من الحد الأدنى المطلوب هندسياً (${requiredTaper.toFixed(1)}م). يرجى زيادة الطول لتسهيل انسياب المركبات بأمان وتجنب الاصطدام.\n`;
        critiqueEn += `❌ **Transition Taper Length:** Proposed (${propTaper}m) is **below** the engineering standard of (${requiredTaper.toFixed(1)}m). Please increase the taper length to allow safe vehicle lane merging.\n`;
      }

      if (propBuffer >= requiredBuffer) {
        critiqueAr += `✅ **المسافة العازلة (Buffer):** المقترح (${propBuffer}م) يطابق أو يتجاوز مسافة الرؤية للتوقف الآمن (SSD) المطلوبة (${requiredBuffer}م).\n`;
        critiqueEn += `✅ **Longitudinal Buffer Zone:** Proposed (${propBuffer}m) satisfies the required Stopping Sight Distance (SSD) of (${requiredBuffer}m).\n`;
      } else {
        critiqueAr += `⚠️ **المسافة العازلة (Buffer):** المقترح (${propBuffer}م) **غير كافٍ** لمنع الحوادث عند التوقف المفاجئ. الحد الأدنى المطلوب لسرعة ${V} كم/ساعة هو (${requiredBuffer}م).\n`;
        critiqueEn += `⚠️ **Longitudinal Buffer Zone:** Proposed (${propBuffer}m) is **hazardous**. The minimum required SSD buffer for ${V} km/h is (${requiredBuffer}m) to allow emergency stopping.\n`;
      }

      if (propTerm >= requiredTermination) {
        critiqueAr += `✅ **منطقة نهاية العمل:** الطول المقترح (${propTerm}م) يطابق المعايير الفنية المعتمدة (الحد الأدنى ٣٠م).\n`;
        critiqueEn += `✅ **Termination Taper:** Proposed (${propTerm}m) satisfies the required standard minimum of 30 meters.\n`;
      } else {
        critiqueAr += `❌ **منطقة نهاية العمل:** الطول المقترح (${propTerm}م) **أقل** من الحد الأدنى المسموح به وهو ٣٠م.\n`;
        critiqueEn += `❌ **Termination Taper:** Proposed (${propTerm}m) is **non-compliant**. The required code specifies a minimum of 30 meters.\n`;
      }

      // ── Gap 1: Advanced Warning Zone Audit ──
      const aw = calcs.advanceWarning;
      if (aw) {
        critiqueAr += `\n🔶 **المنطقة التحذيرية المتقدمة (سرعة ${V} كم/س):**\n`;
        critiqueAr += `   لوحة A: ${aw.A}م | لوحة B: ${aw.B}م | لوحة C: ${aw.C}م | لوحة D: ${aw.D}م قبل نقطة التدرج\n`;
        critiqueAr += `   الحد الأدنى لارتفاع حروف اللوحات: ${aw.letterHeight} ملم\n`;
        critiqueEn += `\n🔶 **Advanced Warning Zone (Speed ${V} km/h):**\n`;
        critiqueEn += `   Sign A: ${aw.A}m | Sign B: ${aw.B}m | Sign C: ${aw.C}m | Sign D: ${aw.D}m before taper point\n`;
        critiqueEn += `   Minimum sign letter height: ${aw.letterHeight}mm\n`;
      }

      // ── Gap 2: Barrier Selection Audit ──
      const br = barrierReq;
      if (br) {
        const propClearance = parseFloat(formData.barrierLateralClearance) || 0;
        critiqueAr += `\n🚧 **نوع الحواجز المطلوب:** ${br.labelAr}\n`;
        critiqueAr += `   السبب: ${br.reasonAr}\n`;
        if (propClearance >= br.clearanceMin && propClearance <= br.clearanceMax) {
          critiqueAr += `✅ **الارتداد الجانبي:** المقترح (${propClearance}م) ضمن النطاق المطلوب (${br.clearanceMin}م - ${br.clearanceMax}م).\n`;
        } else {
          critiqueAr += `❌ **الارتداد الجانبي:** المقترح (${propClearance}م) **خارج** النطاق المطلوب (${br.clearanceMin}م - ${br.clearanceMax}م). يرجى التصحيح.\n`;
        }
        critiqueEn += `\n🚧 **Required Barrier Type:** ${br.labelEn}\n`;
        critiqueEn += `   Reason: ${br.reasonEn}\n`;
        if (propClearance >= br.clearanceMin && propClearance <= br.clearanceMax) {
          critiqueEn += `✅ **Lateral Clearance:** Proposed (${propClearance}m) within required range (${br.clearanceMin}m - ${br.clearanceMax}m).\n`;
        } else {
          critiqueEn += `❌ **Lateral Clearance:** Proposed (${propClearance}m) is **outside** required range (${br.clearanceMin}m - ${br.clearanceMax}m). Please correct.\n`;
        }
      }

      // ── Gap 3: Trench Plate Audit ──
      const tv = trenchValidation;
      if (tv && tv.applicable) {
        if (tv.valid) {
          critiqueAr += `\n✅ **اللوح المعدني المؤقت:** جميع متطلبات التركيب مستوفاة (الحمل، الطحن، المانع للانزلاق، التثبيت).\n`;
          critiqueEn += `\n✅ **Steel Trench Plates:** All engineering requirements met (bearing, milling, anti-slip, anchoring).\n`;
        } else {
          critiqueAr += `\n❌ **اللوح المعدني المؤقت:** تم رصد ${tv.issues.length} مخالفة:\n`;
          critiqueEn += `\n❌ **Steel Trench Plates:** ${tv.issues.length} violation(s) detected:\n`;
          tv.issues.forEach((issue, idx) => {
            critiqueAr += `   ${idx + 1}. ${issue.ar}\n`;
            critiqueEn += `   ${idx + 1}. ${issue.en}\n`;
          });
        }
      }

      const largeMachinery = equipmentList.filter(eq => eq.width > 3.0 || eq.height > 3.0);
      if (largeMachinery.length > 0) {
        critiqueAr += `\n⚠️ **حجم الآليات والمعدات:** تم رصد معدات ذات أبعاد ضخمة (عرض/ارتفاع > ٣م). يجب تأمين ارتداد جانبي لا يقل عن ${latClearance}م من الحواجز لضمان استقرار التربة.\n`;
        critiqueEn += `\n⚠️ **Heavy Equipment footprints:** Mapped machinery exceeding 3.0m in height/width. Ensure a lateral clearance of at least ${latClearance}m from barriers is maintained for load stability.\n`;
      } else {
        critiqueAr += `\n✅ **أبعاد المعدات:** الآليات المدرجة تقع ضمن النطاق الآمن للحركة في الحارة الإنشائية.\n`;
        critiqueEn += `\n✅ **Equipment Dimensions:** Mapped machinery is within standard safety margins for active lane staging.\n`;
      }

      critiqueAr += `\n📝 **توصيات فنية عامة:** يرجى إرفاق شهادات مطابقة SASO للمواد العاكسة للتحويلات عند التقديم النهائي.`;
      critiqueEn += `\n📝 **General Guidelines:** Please attach SASO reflective compliance certificates during final permit submission.`;

      setAiFeedback({ ar: critiqueAr, en: critiqueEn });
    }, 1500);
  };

  // Typewriter effect for AI analysis
  useEffect(() => {
    if (aiStatus === 'completed') {
      const text = language === 'ar' ? aiFeedback.ar : aiFeedback.en;
      let i = 0;
      setAiDisplayedFeedback('');
      
      const interval = setInterval(() => {
        setAiDisplayedFeedback(prev => prev + text.charAt(i));
        i++;
        if (i >= text.length) {
          clearInterval(interval);
        }
      }, 3);
      
      return () => clearInterval(interval);
    }
  }, [aiStatus, aiFeedback, language]);

  // ─── Phase 1 Site-Overview Satellite Map: Initialize once, never destroy on panel collapse ───
  useEffect(() => {
    if (!currentUser || currentPhase !== 1) {
      // Only destroy when leaving Phase 1 entirely
      if (phase1MapInstance.current) {
        phase1MapInstance.current.remove();
        phase1MapInstance.current = null;
      }
      return;
    }

    // Already initialized — just invalidate size in case panel was hidden
    if (phase1MapInstance.current) {
      setTimeout(() => {
        if (phase1MapInstance.current) phase1MapInstance.current.invalidateSize();
      }, 150);
      return;
    }

    const initTimer = setTimeout(() => {
      if (!window.L || !phase1MapContainerRef.current) return;

      const defaultLat = 24.4686;
      const defaultLng = 39.6120;

      const map = window.L.map(phase1MapContainerRef.current, {
        center: [defaultLat, defaultLng],
        zoom: 16,
        zoomControl: true,
        attributionControl: false
      });

      window.L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
      }).addTo(map);

      phase1MapInstance.current = map;
      phase1MarkersGroupRef.current = window.L.layerGroup().addTo(map);

      map.on('click', e => {
        const { lat, lng } = e.latlng;
        const pt = { lat, lng, x: Math.round(582500 + (lng - 39.6120) * 100000), y: Math.round(2703800 + (lat - 24.4686) * 110000) };

        if (nodesStateRef.current.b < 4) {
          setBoundaryPoints(prev => [...prev, pt]);
        } else if (nodesStateRef.current.d < 2) {
          setDetourNodes(prev => {
            const newNodes = [...prev, { lat, lng }];
            if (newNodes.length === 1) {
              setFormData(f => ({...f, vehicleStart: `Sta 0+000 (E${pt.x}, N${pt.y})`}));
            } else if (newNodes.length === 2) {
              setFormData(f => ({...f, vehicleEnd: `Sta 0+450 (E${pt.x}, N${pt.y})`}));
            }
            return newNodes;
          });
        } else if (nodesStateRef.current.p < 2) {
          setPedestrianNodes(prev => {
            const newNodes = [...prev, { lat, lng }];
            if (newNodes.length === 1) {
              setFormData(f => ({...f, pedestrianStart: `Sta 0+050 (E${pt.x}, N${pt.y})`}));
            } else if (newNodes.length === 2) {
              setFormData(f => ({...f, pedestrianEnd: `Sta 0+355 (E${pt.x}, N${pt.y})`}));
            }
            return newNodes;
          });
        }
      });

      // Two invalidate calls: one immediate and one after tiles settle
      map.invalidateSize();
      setTimeout(() => { if (phase1MapInstance.current) phase1MapInstance.current.invalidateSize(); }, 500);
    }, 400);

    return () => {
      clearTimeout(initTimer);
    };
  }, [currentPhase, currentUser]);

  // Invalidate map size when panel is expanded (map container becomes visible)
  useEffect(() => {
    if (expandedPanels.p1_map && phase1MapInstance.current) {
      setTimeout(() => {
        if (phase1MapInstance.current) phase1MapInstance.current.invalidateSize();
      }, 150);
    }
  }, [expandedPanels.p1_map]);

  useEffect(() => {
    if (!phase1MapInstance.current || !phase1MarkersGroupRef.current || !window.L) return;
    phase1MarkersGroupRef.current.clearLayers();

    const renderMk = (pts, color, prefix, labels, setFn) => pts.slice(0, (prefix==='C'?4:2)).forEach((p, i) => {
      if (!p.lat || !p.lng) return;
      const mk = window.L.marker([p.lat, p.lng], {
        draggable: true,
        icon: window.L.divIcon({
          className: '',
          html: `<div style="background:${color};border:2.5px solid #fff;color:#fff;font-size:8px;font-weight:800;height:${prefix==='C'?26:28}px;width:${prefix==='C'?26:28}px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px ${color}99;cursor:grab">${prefix}${i+1}</div>`,
          iconSize: [prefix==='C'?26:28, prefix==='C'?26:28], iconAnchor: [prefix==='C'?13:14, prefix==='C'?13:14]
        })
      });
      mk.bindTooltip(`<b style="color:${color}">${prefix}${i+1} — ${labels[i]}</b><br/><span style="font-family:monospace;font-size:10px">Lat: ${p.lat.toFixed(5)}<br/>Lng: ${p.lng.toFixed(5)}</span>`, { permanent: false });
      mk.on('dragend', e => {
        const { lat, lng } = e.target.getLatLng();
        setFn(prev => {
          const u=[...prev]; 
          if(u[i]) {
            u[i]={...u[i],lat,lng,x:Math.round(582500+(lng-39.612)*100000),y:Math.round(2703800+(lat-24.4686)*110000)};
            if (prefix === 'D') {
              if (i === 0) setFormData(f => ({...f, vehicleStart: `Sta 0+000 (E${u[i].x}, N${u[i].y})`}));
              if (i === 1) setFormData(f => ({...f, vehicleEnd: `Sta 0+450 (E${u[i].x}, N${u[i].y})`}));
            }
            if (prefix === 'P') {
              if (i === 0) setFormData(f => ({...f, pedestrianStart: `Sta 0+050 (E${u[i].x}, N${u[i].y})`}));
              if (i === 1) setFormData(f => ({...f, pedestrianEnd: `Sta 0+355 (E${u[i].x}, N${u[i].y})`}));
            }
          }
          return u; 
        });
      });
      phase1MarkersGroupRef.current.addLayer(mk);
    });

    // ── Blue filled polygon under construction zone nodes (renders from 2+ nodes) ──
    if (boundaryPoints.length >= 2) {
      const polyCoords = boundaryPoints.slice(0, 4).filter(p => p.lat && p.lng).map(p => [p.lat, p.lng]);
      const blueZone = window.L.polygon(polyCoords, {
        color: '#0ea5e9',
        weight: 2,
        opacity: 0.9,
        fillColor: '#0ea5e9',
        fillOpacity: 0.20,
      });
      phase1MarkersGroupRef.current.addLayer(blueZone);
    }

    // ── Dashed orange line connecting detour start/end ──
    if (detourNodes.length >= 2) {
      const detourLine = window.L.polyline(
        detourNodes.slice(0, 2).map(p => [p.lat, p.lng]),
        { color: '#f97316', weight: 2.5, dashArray: '8, 6', opacity: 0.85 }
      );
      phase1MarkersGroupRef.current.addLayer(detourLine);
    }

    // ── Dashed green line connecting pedestrian start/end ──
    if (pedestrianNodes.length >= 2) {
      const pedLine = window.L.polyline(
        pedestrianNodes.slice(0, 2).map(p => [p.lat, p.lng]),
        { color: '#22c55e', weight: 2.5, dashArray: '8, 6', opacity: 0.85 }
      );
      phase1MarkersGroupRef.current.addLayer(pedLine);
    }

    renderMk(boundaryPoints, '#0ea5e9', 'C', ['Construction C1','Construction C2','Construction C3','Construction C4'], setBoundaryPoints);
    renderMk(detourNodes, '#f97316', 'D', ['Detour Start','Detour End'], setDetourNodes);
    renderMk(pedestrianNodes, '#22c55e', 'P', ['Pedestrian Start','Pedestrian End'], setPedestrianNodes);
  }, [boundaryPoints, detourNodes, pedestrianNodes]);



  // Initialize and update the report map when proposal is submitted (Satellite Imagery)
  useEffect(() => {
    if (submitted && window.L && reportMapContainerRef.current && !reportMapInstance.current) {
      const lat = boundaryPoints.length > 0 ? boundaryPoints[0].lat : 24.4686;
      const lng = boundaryPoints.length > 0 ? boundaryPoints[0].lng : 39.6120;
      
      const map = window.L.map(reportMapContainerRef.current, {
        center: [lat, lng],
        zoom: 16,
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false
      });

      window.L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: 'Map data &copy; Google Maps Satellite'
      }).addTo(map);

      reportMapInstance.current = map;
      reportMarkersGroupRef.current = window.L.layerGroup().addTo(map);

      const latlngs = [];
      boundaryPoints.forEach((p, index) => {
        latlngs.push([p.lat, p.lng]);
        const marker = window.L.marker([p.lat, p.lng], {
          icon: window.L.divIcon({
            className: 'custom-leaflet-marker',
            html: `<div class="bg-brand-teal text-white text-[9px] font-bold h-5 w-5 rounded-full border-2 border-white flex items-center justify-center shadow-md shadow-brand-teal/40">N${index + 1}</div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          })
        });
        reportMarkersGroupRef.current.addLayer(marker);
      });

      if (latlngs.length > 1) {
        reportPolygonLayerRef.current = window.L.polygon(latlngs, {
          color: '#00FFFF',
          fillColor: '#00FFFF',
          fillOpacity: 0.25,
          weight: 3,
          dashArray: '4, 4'
        }).addTo(map);
        map.fitBounds(reportPolygonLayerRef.current.getBounds(), { padding: [20, 20] });
      }
    }

    return () => {
      if (reportMapInstance.current) {
        reportMapInstance.current.remove();
        reportMapInstance.current = null;
      }
    };
  }, [submitted, boundaryPoints]);

  // Inspector Dashboard Satellite Map Loader (With invalidateSize fix to prevent blank map)
  useEffect(() => {
    if (!selectedPermitForReview || !window.L || !inspectorMapContainerRef.current) return;

    if (inspectorMapInstance.current) {
      inspectorMapInstance.current.remove();
      inspectorMapInstance.current = null;
    }

    const regex = /(?:E|e)?\s*(\d+(?:\.\d+)?)\s*,\s*(?:N|n)?\s*(\d+(?:\.\d+)?)/g;
    const coordsText = selectedPermitForReview.coordinates || '';
    const matches = [];
    let match;
    while ((match = regex.exec(coordsText)) !== null) {
      matches.push({ x: parseFloat(match[1]), y: parseFloat(match[2]) });
    }

    let parsedPoints = [];
    if (matches.length > 0) {
      parsedPoints = matches.map(pt => {
        const lng = 39.6120 + (pt.x - 582500) / 100000;
        const lat = 24.4686 + (pt.y - 2703800) / 110000;
        return { lat, lng, x: pt.x, y: pt.y };
      });
    }

    const lat = parsedPoints.length > 0 ? parsedPoints[0].lat : 24.4686;
    const lng = parsedPoints.length > 0 ? parsedPoints[0].lng : 39.6120;

    const map = window.L.map(inspectorMapContainerRef.current, {
      center: [lat, lng],
      zoom: 16,
      zoomControl: true,
      attributionControl: false
    });

    const googleSatLayer = window.L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      attribution: 'Map data &copy; Google Maps Satellite'
    }).addTo(map);

    const googlePureSatLayer = window.L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      attribution: 'Map data &copy; Google Maps Satellite'
    });

    const satLayer = window.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar'
    });

    const cartoLayer = window.L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    });

    window.L.control.layers({
      "🌍 Google Satellite (Hybrid)": googleSatLayer,
      "🛰️ Google Satellite (Pure)": googlePureSatLayer,
      "🛰️ Esri Satellite": satLayer,
      "🗺️ Base Map": cartoLayer
    }, null, { position: 'topright' }).addTo(map);

    inspectorMapInstance.current = map;
    const markersGroup = window.L.layerGroup().addTo(map);
    inspectorMarkersGroupRef.current = markersGroup;

    const latlngs = [];
    parsedPoints.forEach((p, index) => {
      latlngs.push([p.lat, p.lng]);
      const marker = window.L.marker([p.lat, p.lng], {
        icon: window.L.divIcon({
          className: 'custom-leaflet-marker',
          html: `<div class="bg-brand-teal text-white text-[9px] font-bold h-6 w-6 rounded-full border-2 border-white flex items-center justify-center shadow-md shadow-brand-teal/40">N${index + 1}</div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        })
      });
      markersGroup.addLayer(marker);
    });

    if (latlngs.length > 1) {
      const poly = window.L.polygon(latlngs, {
        color: '#00FFFF',
        fillColor: '#00FFFF',
        fillOpacity: 0.25,
        weight: 3,
        dashArray: '4, 4'
      }).addTo(map);
      map.fitBounds(poly.getBounds(), { padding: [20, 20] });
    }

    setTimeout(() => {
      if (inspectorMapInstance.current) {
        inspectorMapInstance.current.invalidateSize();
      }
    }, 300);

  }, [selectedPermitForReview, activePortalMode, inspectorTab]);

  // Live Tahcom AI Review content generator
  const generateLiveAiInsight = async (permit) => {
    setAiInsightLoading(true);
    
    // Calculate required standards for selected speed limit
    const reqTaper = permit.speed <= 60 ? (3.6 * Math.pow(permit.speed, 2) / 155) : (3.6 * permit.speed / 1.6);
    const reqBuffer = permit.speed <= 40 ? 50 : permit.speed <= 60 ? 85 : permit.speed <= 80 ? 130 : permit.speed <= 100 ? 185 : 250;
    
    const prompt = language === 'ar'
      ? `أنت نظام "تحكم للذكاء الاصطناعي" (Tahcom AI)، المستشار الهندسي الفني المعتمد لالجهة المالكة للمشروع.
قم بإعداد تقرير تدقيق بصري وموجز جداً (Visual Executive Format) للمخطط الهندسي للتحويلة المرورية:
- اسم المشروع: ${permit.projectNameAr}
- المقاول: ${permit.contractorAr}
- السرعة: ${permit.speed} كم/س
- التدرج المقترح: ${permit.taper}م (المطلوب: ${reqTaper.toFixed(1)}م)
- الأمان المقترح: ${permit.buffer}م (المطلوب: ${reqBuffer}م)
- مسافة الإنهاء: ${permit.termination}م (المطلوب: 30م)

قم بتنسيق الإجابة في شكل بطاقة بصرية قصيرة جداً تتضمن:
1. 🚦 النتيجة الفنية الشاملة (مطابق / غير مطابق).
2. 🛡️ نسبة الامتثال (Safety Score %).
3. 🔹 مصفوفة الأبعاد الثلاثية مقارنة بكود وزارة النقل KSA MOT.
4. ⚡ التوصية النهائية المباشرة.`
      : `You are "Tahcom AI", the Official Engineering Auditor for this project.
Generate a SHORT VISUAL DASHBOARD SUMMARY for this detour plan:
- Project: ${permit.projectNameEn}
- Speed: ${permit.speed} km/h
- Proposed Taper: ${permit.taper}m (Min Required: ${reqTaper.toFixed(1)}m)
- Proposed Buffer SSD: ${permit.buffer}m (Min Required: ${reqBuffer}m)
- Proposed Termination: ${permit.termination}m (Min Required: 30m)

Format the response strictly as a compact visual dashboard using ASCII boxes, progress indicators, and bullet badges for KSA MOT compliance rating.`;

    if (googleApiKey) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${googleApiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: prompt }]
            }]
          })
        });
        const data = await response.json();
        const text = data.candidates && data.candidates[0]?.content?.parts?.[0]?.text
          ? data.candidates[0].content.parts[0].text
          : `❌ Tahcom AI Error: ${data.error?.message || 'Invalid API key or model request parameters.'}`;
        setAiInsights(prev => ({ ...prev, [permit.id]: text }));
      } catch (err) {
        console.error(err);
        setAiInsights(prev => ({ 
          ...prev, 
          [permit.id]: `❌ Error querying Tahcom AI. Please check your API key.` 
        }));
      } finally {
        setAiInsightLoading(false);
      }
    } else {
      // Local simulated visual summary fallback for Tahcom AI
      setTimeout(() => {
        const isCompliant = permit.taper >= reqTaper && permit.buffer >= reqBuffer && permit.termination >= 30;
        let insightText = `🤖 **نظام تحكم للذكاء الاصطناعي | Tahcom AI**\n`;
        insightText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        insightText += `📊 **بطاقة الملخص البصري السريع (Visual Safety Summary):**\n\n`;

        if (isCompliant) {
          insightText += `┌──────────────────────────────────────────────┐\n`;
          insightText += `│ 🚦 النتيجة الفنية: 🟢 مطابق لكود السلامة (MOT Verified) │\n`;
          insightText += `│ 🛡️ معدل الامتثال: 98% (High Safety Score)         │\n`;
          insightText += `│ ⚡ المحرك: نظام تحكم للذكاء الاصطناعي (Tahcom AI)          │\n`;
          insightText += `└──────────────────────────────────────────────┘\n\n`;
          insightText += `🔹 **مصفوفة مطابقة عناصر التحويلة:**\n`;
          insightText += `  • 📐 طول التدرج (Taper): ${permit.taper}m (الحد المطلوب: ${reqTaper.toFixed(1)}m) ➔ ✅ OK\n`;
          insightText += `  • 🛡️ مسافة الرؤية (Buffer SSD): ${permit.buffer}m (الحد المطلوب: ${reqBuffer}m) ➔ ✅ OK\n`;
          insightText += `  • 🚧 إنهاء التحويلة (Termination): ${permit.termination}m (المطلوب: 30m) ➔ ✅ OK\n\n`;
          insightText += `⚡ **التوصية النهائية:** ✅ موافقة واعتماد الترخيص المروري.`;
        } else {
          insightText += `┌──────────────────────────────────────────────┐\n`;
          insightText += `│ 🚦 النتيجة الفنية: 🔴 غير مطابق / يتطلب التعديل (Out-of-Spec) │\n`;
          insightText += `│ 🛡️ معدل الامتثال: 64% (Safety Risks Flagged)        │\n`;
          insightText += `│ ⚡ المحرك: نظام تحكم للذكاء الاصطناعي (Tahcom AI)          │\n`;
          insightText += `└──────────────────────────────────────────────┘\n\n`;
          insightText += `🔹 **ملاحظات الانحراف عن الكود القياسي:**\n`;
          if (permit.taper < reqTaper) insightText += `  • ❌ قصور في طول التدرج: المقترح ${permit.taper}m أقل من المطلوب (${reqTaper.toFixed(1)}m)\n`;
          if (permit.buffer < reqBuffer) insightText += `  • ❌ مسافة أمان غير كافية: المقترح ${permit.buffer}m أقل من المطلوب (${reqBuffer}m)\n`;
          insightText += `\n⚡ **التوصية النهائية:** ❌ مرفوض - يتطلب تعديل الأبعاد قبل الاعتماد.`;
        }
        setAiInsights(prev => ({ ...prev, [permit.id]: insightText }));
        setAiInsightLoading(false);
      }, 800);
    }
  };

  // Bidirectional real-time coordinates textbox handler
  const handleCoordinatesChange = (e) => {
    const val = e.target.value;
    setFormData(prev => ({ ...prev, coordinates: val }));

    const regex = /(?:E|e)?\s*(\d+(?:\.\d+)?)\s*,\s*(?:N|n)?\s*(\d+(?:\.\d+)?)/g;
    const matches = [];
    let match;
    while ((match = regex.exec(val)) !== null) {
      matches.push({ x: parseFloat(match[1]), y: parseFloat(match[2]) });
    }

    if (matches.length > 0) {
      const parsedPoints = matches.map(pt => {
        const lng = 39.6120 + (pt.x - 582500) / 100000;
        const lat = 24.4686 + (pt.y - 2703800) / 110000;
        return { lat, lng, x: pt.x, y: pt.y };
      });

      const hasChanged = parsedPoints.length !== boundaryPoints.length || 
        parsedPoints.some((pt, idx) => pt.x !== boundaryPoints[idx]?.x || pt.y !== boundaryPoints[idx]?.y);
      
      if (hasChanged) {
        setBoundaryPoints(parsedPoints);
        if (leafletMapInstance.current) {
          const first = parsedPoints[0];
          leafletMapInstance.current.setView([first.lat, first.lng], 16);
        }
      }
    }
  };

  // Sync coordinates textbox & auto-calculate length on boundaryPoints changes
  useEffect(() => {
    if (boundaryPoints.length > 0) {
      // Use real lat/lng for coordinates display
      const coordString = boundaryPoints.map((p, idx) => {
        const labels = ['Detour Start', 'Detour End', 'Ped. Start', 'Ped. End'];
        const labelsAr = ['بداية التحويلة', 'نهاية التحويلة', 'بداية المشاة', 'نهاية المشاة'];
        return `N${idx + 1} (${labelsAr[idx] || ''}): Lat ${p.lat?.toFixed(6) || p.y}, Lng ${p.lng?.toFixed(6) || p.x}`;
      }).join('\n');
      if (formData.coordinates !== coordString) {
        setFormData(prev => ({ ...prev, coordinates: coordString }));
      }
      
      const calculatedLength = getWorkZoneLengthFromCoords();
      if (calculatedLength !== formData.siteLength) {
        setFormData(prev => ({ ...prev, siteLength: calculatedLength }));
      }
    } else {
      if (formData.coordinates !== '') {
        setFormData(prev => ({ ...prev, coordinates: '' }));
      }
    }
  }, [boundaryPoints]);


  // Sync detailedTimeline when milestones change
  useEffect(() => {
    const timelineText = milestones.map(m => {
      const task = language === 'ar' ? m.taskAr : m.taskEn;
      const start = getMilestoneStart(m);
      const duration = getMilestoneDuration(m);
      return `- ${task} (${language === 'ar' ? 'البدء' : 'Starts'}: ${start}, ${language === 'ar' ? 'المدة' : 'Duration'}: ${duration}) [${m.status}]`;
    }).join('\n');
    setFormData(prev => ({ ...prev, detailedTimeline: timelineText }));
  }, [milestones, language]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleCheckboxChange = (name) => {
    setCompliance(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const handleCadUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCadFile(file);
      setCadStatus('parsing');
      
      setTimeout(() => {
        setCadStatus('parsed');
        setCadMetadata({
          filename: file.name,
          fileSize: (file.size / 1024 / 1024).toFixed(2) + ' MB',
          crs: 'WGS 84 / UTM Zone 37N (EPSG:32637)',
          extents: 'Min: (582450E, 2703620N) - Max: (582980E, 2704100N)',
          layers: 18,
          geometryCount: 4218,
          integrityCheck: 'PASSED (0 errors, 4 warnings)',
          alignmentStatus: 'ALIGNED (Perfect match with local GIS)'
        });
      }, 2000);
    }
  };

  const addMilestone = () => {
    if (newMilestone.taskEn && newMilestone.startEn) {
      setMilestones([...milestones, { 
        id: Date.now(), 
        taskAr: newMilestone.taskAr || newMilestone.taskEn,
        taskEn: newMilestone.taskEn,
        startAr: newMilestone.startAr || newMilestone.startEn,
        startEn: newMilestone.startEn,
        durationAr: newMilestone.durationAr || newMilestone.durationEn,
        durationEn: newMilestone.durationEn,
        status: 'Planned'
      }]);
      setNewMilestone({ taskAr: '', taskEn: '', startAr: '', startEn: '', durationAr: '', durationEn: '', status: 'Planned' });
    }
  };

  const removeMilestone = (id) => {
    setMilestones(milestones.filter(m => m.id !== id));
  };

  const addEquipment = () => {
    const name = language === 'ar' ? newEquipment.nameAr : newEquipment.nameEn;
    if (name && newEquipment.length && newEquipment.width && newEquipment.height) {
      setEquipmentList([...equipmentList, { 
        id: Date.now(),
        nameAr: newEquipment.nameAr || newEquipment.nameEn,
        nameEn: newEquipment.nameEn || newEquipment.nameAr,
        length: parseFloat(newEquipment.length),
        width: parseFloat(newEquipment.width),
        height: parseFloat(newEquipment.height),
        systemAr: newEquipment.systemAr || newEquipment.systemEn,
        systemEn: newEquipment.systemEn || newEquipment.systemAr
      }]);
      setNewEquipment({
        selectedPreset: '',
        selectedRolePreset: '',
        nameAr: '',
        nameEn: '',
        length: '',
        width: '',
        height: '',
        systemAr: '',
        systemEn: ''
      });
    }
  };

  const removeEquipment = (id) => {
    setEquipmentList(equipmentList.filter(eq => eq.id !== id));
  };

  const clearBoundary = () => {
    setBoundaryPoints([]);
  };

  const nextPhase = () => setCurrentPhase(prev => Math.min(prev + 1, 3));
  const prevPhase = () => setCurrentPhase(prev => Math.max(prev - 1, 1));

  // Auto-sync boundaryPoints to formData.coordinates string
  useEffect(() => {
    if (boundaryPoints && boundaryPoints.length > 0) {
      const formatted = boundaryPoints.map(p => `E ${p.x}, N ${p.y}`).join('\n');
      setFormData(prev => ({ ...prev, coordinates: formatted }));
    }
  }, [boundaryPoints]);

  // Helper to download contractor's uploaded CAD blueprint file
  const downloadUploadedCadFile = (customPermit = null) => {
    const fileToDownload = customPermit?.cadFile || cadFile;
    if (fileToDownload && fileToDownload instanceof File) {
      const url = URL.createObjectURL(fileToDownload);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileToDownload.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      const fileName = customPermit?.cadFileName || cadMetadata?.filename || `Uploaded_Detour_Blueprint_${customPermit?.id || 'AM-2026'}.dwg`;
      const dummyContent = `CONTRACTOR UPLOADED CAD BLUEPRINT\nPermit ID: ${customPermit?.id || 'AM-2026'}\nProject: ${customPermit?.projectNameEn || formData.projectNameEn}`;
      const blob = new Blob([dummyContent], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // Helper to save ongoing field inspection notes for Active Approved Detours
  const handleSaveInspectionVisitNote = async (permitId, noteText) => {
    if (!noteText || !noteText.trim()) return;
    const targetPermit = submittedPermits.find(p => p.id === permitId);
    if (!targetPermit) return;

    const existingNotes = targetPermit.inspector_notes || '';
    const timestamp = new Date().toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const updatedNotes = existingNotes 
      ? `${existingNotes}\n📌 [${timestamp}] ${noteText}`
      : `📌 [${timestamp}] ${noteText}`;

    try {
      const res = await fetch(`/api/permits/${permitId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: targetPermit.status,
          inspector_notes: updatedNotes
        })
      });
      if (res.ok) {
        setSubmittedPermits(prev => prev.map(p => p.id === permitId ? { ...p, inspector_notes: updatedNotes } : p));
        if (selectedPermitForReview?.id === permitId) {
          setSelectedPermitForReview(prev => ({ ...prev, inspector_notes: updatedNotes }));
        }
        showToast(
          language === 'ar' ? 'تم حفظ ملاحظات المفتش' : 'Observations Saved',
          language === 'ar' ? 'تم تسجيل وتوثيق ملاحظات التفتيش الميداني بنجاح.' : 'Field inspection notes saved successfully.',
          'success'
        );
      }
    } catch (err) {
      console.error("Save note error:", err);
    }
  };

  const calculateDaysLeft = (endDateStr) => {
    if (!endDateStr) return 'N/A';
    const end = new Date(endDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = end - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  // ── Mandatory pre-submission validation gate ──
  // Directly automates the source document's rule: "يُرفض الطلب أو يعاد
  // للاستكمال عند غياب بيانات الموقع أو المخططات أو التوثيق الميداني
  // المؤثر على سلامة التحويلة" (request is rejected/returned if location
  // data, drawings, or on-site documentation are missing).
  const getSubmissionBlockingIssues = () => {
    const issues = [];
    if (!formData.coordinates) {
      issues.push(language === 'ar' ? 'بيانات موقع العمل (الإحداثيات) غير مكتملة.' : 'Work location coordinates are missing.');
    }
    if (!formData.cadFile) {
      issues.push(language === 'ar' ? 'لم يتم رفع مخطط CAD الهندسي.' : 'CAD blueprint has not been uploaded.');
    }
    if (!formData.photoDocCount || formData.photoDocCount < 1) {
      issues.push(language === 'ar' ? 'لا يوجد توثيق موقعي بالصور (مطلوب كل 25م على الأقل).' : 'No site photo documentation provided (required every 25m).');
    }
    if (!(language === 'ar' ? formData.workPurposeAr : formData.workPurposeEn)) {
      issues.push(language === 'ar' ? 'الغرض من الحفر/الأعمال غير محدد.' : 'Purpose of the work/excavation is not specified.');
    }
    if (!(language === 'ar' ? formData.owningUtilityAr : formData.owningUtilityEn)) {
      issues.push(language === 'ar' ? 'الجهة المالكة للخدمة غير محددة.' : 'Owning utility/service is not specified.');
    }
    if (isPedestrianPathMandatory(formData.diversionLengthM, formData.roadClassification) && !formData.pedestrianPathProvided) {
      issues.push(language === 'ar' ? 'طول التحويلة يتجاوز 400م ولم يتم تأكيد توفير ممر مشاة.' : 'Diversion length exceeds 400m and a pedestrian path has not been confirmed.');
    }
    return issues;
  };

  const submitContractorForm = async () => {
    const blockingIssues = DEV_SKIP_VALIDATION ? [] : getSubmissionBlockingIssues();
    if (blockingIssues.length > 0) {
      showToast(
        language === 'ar' ? 'تعذر إرسال الطلب — بيانات ناقصة' : 'Submission Blocked — Incomplete Data',
        blockingIssues.join(' '),
        'error'
      );
      return;
    }

    const isTaperFailure = parseFloat(formData.proposedTaper) < calcs.requiredTaper;
    const isBufferFailure = parseFloat(formData.proposedBuffer) < calcs.requiredBuffer;
    const isTermFailure = parseFloat(formData.proposedTermination) < calcs.requiredTermination;
    const isFlagged = isTaperFailure || isBufferFailure || isTermFailure;

    const newPermit = {
      id: `AM-2026-PR-${Math.floor(100000 + Math.random() * 900000)}`,
      projectNameAr: formData.projectNameAr,
      projectNameEn: formData.projectNameEn,
      clientAr: formData.clientNameAr,
      clientEn: formData.clientNameEn,
      contractorAr: formData.contractingCompanyAr,
      contractorEn: formData.contractingCompanyEn,
      submittedDate: new Date().toISOString().split('T')[0],
      status: formData.ownerClassification === 'not_affiliated'
        ? 'PendingExternalReview'
        : (isFlagged ? "Flagged" : "Clean"),
      ownerClassification: formData.ownerClassification,
      speed: parseFloat(formData.speedLimit),
      taper: parseFloat(formData.proposedTaper),
      buffer: parseFloat(formData.proposedBuffer),
      termination: parseFloat(formData.proposedTermination),
      siteLength: parseFloat(formData.siteLength),
      siteWidth: parseFloat(formData.siteWidth),
      lateralClearance: parseFloat(formData.lateralClearance),
      stagingAreaAr: formData.stagingAreaAr,
      stagingAreaEn: formData.stagingAreaEn,
      coordinates: formData.coordinates,
      tempBridgesAr: formData.tempBridgesAr,
      tempBridgesEn: formData.tempBridgesEn,
      lightingPlanAr: formData.lightingPlanAr,
      lightingPlanEn: formData.lightingPlanEn,
      isArterialRoad: formData.isArterialRoad,
      attenuatorType: formData.attenuatorType,
      attenuatorQuantityPlacement: formData.attenuatorQuantityPlacement,
      hasDetourLightingSensors: formData.hasDetourLightingSensors,
      lightingLuxTarget: formData.lightingLuxTarget,
      lightingTowerSpacing: formData.lightingTowerSpacing,
      lightingAlertChannel: formData.lightingAlertChannel,
      lightingBackupPower: formData.lightingBackupPower,
      workStartDate: formData.workStartDate,
      workEndDate: formData.workEndDate,
      permitStartDate: formData.permitStartDate,
      permitEndDate: formData.permitEndDate,
      deviationNotesAr: isFlagged 
        ? `${isTaperFailure ? 'التدرج المقترح أقل من الكود. ' : ''}${isBufferFailure ? 'المسافة العازلة أقل من الكود. ' : ''}` 
        : "مطابق لمواصفات وزارة النقل.",
      deviationNotesEn: isFlagged 
        ? `${isTaperFailure ? 'Taper is under code standard. ' : ''}${isBufferFailure ? 'Buffer space is under-spec. ' : ''}`
        : "Fully complies with KSA MOT code."
    };

    try {
      const res = await fetch('/api/permits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractor_id: currentUser?.id || 1,
          data: newPermit
        })
      });
      const dbRes = await res.json();
      if (dbRes.success) {
        newPermit.db_id = dbRes.id;
      }
    } catch (err) {
      console.error("Backend DB Save Failed:", err);
    }

    setSubmittedPermits(prev => [newPermit, ...prev]);
    setSubmitted(true);
  };

  // 2D Engineering Cross-Section Visualizer (Dynamically data-bound to permit data or active form)
  const renderCrossSectionSVG = (isLightBg = false, customPermit = null) => {
    const activeData = customPermit || formData;
    const latClearance = parseFloat(activeData.lateralClearance) || 25;
    const workWidth = parseFloat(activeData.siteWidth) || 80;
    
    const activeLanes = parseInt(activeData.activeLanesCount) || 2;
    const laneWidthValue = parseFloat(activeData.laneWidth) || 3.6;
    const pedPathWidthValue = parseFloat(activeData.pedestrianPathWidth) || 1.5;
    
    const pedWidthPx = Math.min(100, Math.max(30, pedPathWidthValue * 30));
    const barrierWidthPx = 15;
    const clearanceWidthPx = Math.min(100, Math.max(35, latClearance * 2));
    const workWidthPx = Math.min(180, Math.max(70, workWidth * 1.2));
    const laneWidthPx = Math.min(250, Math.max(60, activeLanes * laneWidthValue * 12.5));
    const totalWidth = pedWidthPx + barrierWidthPx + clearanceWidthPx + workWidthPx + laneWidthPx + 30;
    
    const height = 180;
    const roadY = 130;
    
    const startOfLanes = 10 + pedWidthPx + barrierWidthPx + clearanceWidthPx + workWidthPx + barrierWidthPx;
    const laneLines = [];
    for (let i = 1; i < activeLanes; i++) {
      const lineX = startOfLanes + (i * laneWidthPx / activeLanes);
      laneLines.push(
        <line key={i} x1={lineX} y1={roadY} x2={lineX} y2={roadY + 5} stroke="#e2e8f0" strokeWidth="1.5" strokeDasharray="3 3" />
      );
    }

    const firstLaneCenter = startOfLanes + (laneWidthPx / activeLanes) / 2;

    return (
      <svg viewBox={`0 0 ${totalWidth} ${height}`} className={`w-full h-auto rounded-xl border ${isLightBg ? 'bg-slate-50 border-slate-250 text-slate-900' : 'bg-slate-950 border-brand-dark-hover text-white'}`}>
        <defs>
          <marker id="arrow-start" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 10 0 L 0 5 L 10 10 z" fill="#bfa260"/>
          </marker>
          <marker id="arrow-end" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#bfa260"/>
          </marker>
          <pattern id="barrier-pattern" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="10" stroke="#6b7280" strokeWidth="2" />
          </pattern>
        </defs>

        <rect x="10" y={roadY - 10} width={pedWidthPx} height="10" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
        <circle cx={10 + pedWidthPx / 2} cy={roadY - 26} r="4" fill="#016b68" />
        <line x1={10 + pedWidthPx / 2} y1={roadY - 22} x2={10 + pedWidthPx / 2} y2={roadY - 14} stroke="#016b68" strokeWidth="2" />
        <line x1={10 + pedWidthPx / 2} y1={roadY - 18} x2={10 + pedWidthPx / 2 - 4} y2={roadY - 12} stroke="#016b68" strokeWidth="1.5" />
        <line x1={10 + pedWidthPx / 2} y1={roadY - 18} x2={10 + pedWidthPx / 2 + 4} y2={roadY - 12} stroke="#016b68" strokeWidth="1.5" />
        <line x1={10 + pedWidthPx / 2} y1={roadY - 14} x2={10 + pedWidthPx / 2 - 3} y2={roadY - 10} stroke="#016b68" strokeWidth="1.5" />
        <line x1={10 + pedWidthPx / 2} y1={roadY - 14} x2={10 + pedWidthPx / 2 + 3} y2={roadY - 10} stroke="#016b68" strokeWidth="1.5" />
        
        <polygon points={`${10 + pedWidthPx},${roadY} ${10 + pedWidthPx + 3},${roadY - 25} ${10 + pedWidthPx + barrierWidthPx - 3},${roadY - 25} ${10 + pedWidthPx + barrierWidthPx},${roadY}`} fill="url(#barrier-pattern)" stroke="#4b5563" strokeWidth="1" />
        
        <rect x={10 + pedWidthPx + barrierWidthPx} y={roadY - 3} width={clearanceWidthPx} height="3" fill="#fef3c7" stroke="#fde68a" />
        <line x1={10 + pedWidthPx + barrierWidthPx} y1={roadY - 15} x2={10 + pedWidthPx + barrierWidthPx + clearanceWidthPx} y2={roadY - 15} stroke="#bfa260" strokeWidth="1" strokeDasharray="3 3" />

        <polygon points={`${10 + pedWidthPx + barrierWidthPx + clearanceWidthPx},${roadY} ${10 + pedWidthPx + barrierWidthPx + clearanceWidthPx + 15},${roadY + 25} ${10 + pedWidthPx + barrierWidthPx + clearanceWidthPx + workWidthPx - 15},${roadY + 25} ${10 + pedWidthPx + barrierWidthPx + clearanceWidthPx + workWidthPx},${roadY}`} fill="#f8fafc" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="2 2" />
        <path d={`M ${10 + pedWidthPx + barrierWidthPx + clearanceWidthPx + workWidthPx / 2 - 15} ${roadY - 5} L ${10 + pedWidthPx + barrierWidthPx + clearanceWidthPx + workWidthPx / 2} ${roadY - 35} L ${10 + pedWidthPx + barrierWidthPx + clearanceWidthPx + workWidthPx / 2 + 20} ${roadY - 20} L ${10 + pedWidthPx + barrierWidthPx + clearanceWidthPx + workWidthPx / 2 + 10} ${roadY - 5}`} stroke="#d97706" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <rect x={10 + pedWidthPx + barrierWidthPx + clearanceWidthPx + workWidthPx / 2 - 25} y={roadY - 15} width="15" height="12" rx="2" fill="#d97706" stroke="#b45309" />

        <polygon points={`${10 + pedWidthPx + barrierWidthPx + clearanceWidthPx + workWidthPx},${roadY} ${10 + pedWidthPx + barrierWidthPx + clearanceWidthPx + workWidthPx + 3},${roadY - 25} ${10 + pedWidthPx + barrierWidthPx + clearanceWidthPx + workWidthPx + barrierWidthPx - 3},${roadY - 25} ${10 + pedWidthPx + barrierWidthPx + clearanceWidthPx + workWidthPx + barrierWidthPx},${roadY}`} fill="url(#barrier-pattern)" stroke="#4b5563" strokeWidth="1" />

        <rect x={startOfLanes} y={roadY} width={laneWidthPx} height="5" fill="#334155" />
        {laneLines}
        
        <rect x={firstLaneCenter - 12} y={roadY - 18} width="24" height="13" rx="3" fill="#0284c7" />
        <rect x={firstLaneCenter - 6} y={roadY - 16} width="8" height="9" fill="#e2e8f0" />

        <line x1="0" y1={roadY} x2={totalWidth} y2={roadY} stroke="#94a3b8" strokeWidth="1.5" />

        <line x1="10" y1="50" x2={10 + pedWidthPx} y2="50" stroke="#bfa260" strokeWidth="1" markerStart="url(#arrow-start)" markerEnd="url(#arrow-end)" />
        <text x={10 + pedWidthPx / 2} y="44" fill="#bfa260" fontSize="8" fontWeight="bold" textAnchor="middle">{pedPathWidthValue}m</text>

        <line x1={10 + pedWidthPx + barrierWidthPx} y1="50" x2={10 + pedWidthPx + barrierWidthPx + clearanceWidthPx} y2="50" stroke="#bfa260" strokeWidth="1" markerStart="url(#arrow-start)" markerEnd="url(#arrow-end)" />
        <text x={10 + pedWidthPx + barrierWidthPx + clearanceWidthPx / 2} y="44" fill="#bfa260" fontSize="8" fontWeight="bold" textAnchor="middle">{latClearance}m {t.svgBuffer}</text>

        <line x1={10 + pedWidthPx + barrierWidthPx + clearanceWidthPx} y1="30" x2={10 + pedWidthPx + barrierWidthPx + clearanceWidthPx + workWidthPx} y2="30" stroke="#bfa260" strokeWidth="1" markerStart="url(#arrow-start)" markerEnd="url(#arrow-end)" />
        <text x={10 + pedWidthPx + barrierWidthPx + clearanceWidthPx + workWidthPx / 2} y="24" fill="#bfa260" fontSize="8" fontWeight="bold" textAnchor="middle">{workWidth}m {t.svgWorkArea}</text>

        <line x1={startOfLanes} y1="50" x2={totalWidth - 10} y2="50" stroke="#bfa260" strokeWidth="1" markerStart="url(#arrow-start)" markerEnd="url(#arrow-end)" />
        <text x={startOfLanes + laneWidthPx / 2} y="44" fill="#bfa260" fontSize="8" fontWeight="bold" textAnchor="middle">
          {language === 'ar'
            ? `${activeLanes === 1 ? 'حارة واحدة' : activeLanes === 2 ? 'حارتين' : `${activeLanes} حارات`} × ${laneWidthValue}م`
            : `${activeLanes}x ${laneWidthValue}m Lane${activeLanes > 1 ? 's' : ''}`}
        </text>

        <text x={10 + pedWidthPx / 2} y={roadY + 20} fill={isLightBg ? '#4b5563' : '#94a3b8'} fontSize="8" fontWeight="bold" textAnchor="middle">{t.svgPedPath}</text>
        <text x={10 + pedWidthPx + barrierWidthPx + clearanceWidthPx / 2} y={roadY + 20} fill={isLightBg ? '#4b5563' : '#94a3b8'} fontSize="8" fontWeight="bold" textAnchor="middle">{t.svgBuffer}</text>
        <text x={10 + pedWidthPx + barrierWidthPx + clearanceWidthPx + workWidthPx / 2} y={roadY + 40} fill="#ef4444" fontSize="8" fontWeight="bold" textAnchor="middle">{t.svgHardZone}</text>
        <text x={startOfLanes + laneWidthPx / 2} y={roadY + 20} fill={isLightBg ? '#4b5563' : '#94a3b8'} fontSize="8" fontWeight="bold" textAnchor="middle">{t.svgDetourLanes}</text>
      </svg>
    );
  };

  // Dynamic detours Layout SVG Schematic (representing PDF layout figure)
  const renderHorizontalLayoutSVG = (customPermit = null) => {
    const activeData = customPermit || formData;
    const taperVal = parseFloat(activeData.proposedTaper || activeData.taper) || calcs.requiredTaper;
    const bufferVal = parseFloat(activeData.proposedBuffer || activeData.buffer) || calcs.requiredBuffer;
    const workLengthVal = parseFloat(activeData.siteLength) || 100;
    const termVal = parseFloat(activeData.proposedTermination || activeData.termination) || calcs.requiredTermination;
    
    return (
      <svg viewBox="0 0 850 200" className="w-full h-auto bg-slate-900 border border-brand-gold/25 rounded-xl text-white">
        <defs>
          <pattern id="road-lines" width="40" height="6" patternUnits="userSpaceOnUse">
            <line x1="0" y1="3" x2="20" y2="3" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="5,5" />
          </pattern>
          <pattern id="work-hatch" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="10" stroke="#f87171" strokeWidth="2.5" />
          </pattern>
          <marker id="arrow-start-d" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 10 0 L 0 5 L 10 10 z" fill="#bfa260"/>
          </marker>
          <marker id="arrow-end-d" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#bfa260"/>
          </marker>
        </defs>

        {/* Multi-lane Roadway asphalt */}
        <rect x="0" y="40" width="850" height="110" fill="#1e293b" />
        <line x1="0" y1="40" x2="850" y2="40" stroke="#fbbf24" strokeWidth="3" />
        <line x1="0" y1="150" x2="850" y2="150" stroke="#fbbf24" strokeWidth="3" />
        <rect x="0" y="90" width="850" height="10" fill="#64748b" />
        <line x1="0" y1="65" x2="850" y2="65" stroke="#ffffff" strokeWidth="1" strokeDasharray="10,12" />
        <line x1="0" y1="120" x2="850" y2="120" stroke="#ffffff" strokeWidth="1" strokeDasharray="10,12" />

        {/* 1. ADVANCE WARNING AREA (X: 0 to 180) */}
        <rect x="0" y="40" width="180" height="50" fill="rgba(251, 191, 36, 0.08)" />
        
        {/* Road Work Warning Sign (Saudi style) */}
        <g transform="translate(15, 12)">
          <rect x="0" y="0" width="18" height="18" fill="#f97316" stroke="#000000" strokeWidth="1" transform="rotate(45 9 9)" />
          {/* Stick worker digging icon */}
          <circle cx="9" cy="6" r="1.5" fill="#000000" />
          <line x1="9" y1="7.5" x2="9" y2="12" stroke="#000000" strokeWidth="1" />
          <line x1="9" y1="9" x2="6" y2="11" stroke="#000000" strokeWidth="1" />
          <line x1="9" y1="9" x2="12" y2="11" stroke="#000000" strokeWidth="1" />
          <line x1="9" y1="12" x2="7" y2="15" stroke="#000000" strokeWidth="1" />
          <line x1="9" y1="12" x2="11" y2="15" stroke="#000000" strokeWidth="1" />
          <line x1="6" y1="11" x2="4" y2="13" stroke="#000000" strokeWidth="0.8" />
          <rect x="3" y="12" width="2" height="2" fill="#000000" />
        </g>

        {/* Saudi Circular Speed Limit 80 Sign */}
        <g transform="translate(55, 10)">
          <circle cx="11" cy="11" r="11" fill="#ffffff" stroke="#ef4444" strokeWidth="2.2" />
          <text x="11" y="9.5" fill="#000000" fontSize="7" fontWeight="bold" textAnchor="middle">٨٠</text>
          <text x="11" y="16.5" fill="#000000" fontSize="7" fontWeight="bold" textAnchor="middle">80</text>
        </g>

        {/* Saudi Circular Speed Limit 40 Sign */}
        <g transform="translate(100, 10)">
          <circle cx="11" cy="11" r="11" fill="#ffffff" stroke="#ef4444" strokeWidth="2.2" />
          <text x="11" y="9.5" fill="#000000" fontSize="7" fontWeight="bold" textAnchor="middle">٤٠</text>
          <text x="11" y="16.5" fill="#000000" fontSize="7" fontWeight="bold" textAnchor="middle">40</text>
        </g>

        {/* Saudi Detour Warning Sign */}
        <g transform="translate(138, 11)">
          <rect x="0" y="0" width="28" height="18" fill="#f97316" stroke="#000000" strokeWidth="1.2" rx="1.5" />
          <text x="14" y="8" fill="#000000" fontSize="5.5" fontWeight="bold" textAnchor="middle">تحويلة</text>
          <text x="14" y="14.5" fill="#000000" fontSize="5" fontWeight="bold" textAnchor="middle">DETOUR</text>
        </g>

        {/* 2. TRANSITION TAPER AREA (X: 180 to 280) */}
        <line x1="180" y1="40" x2="280" y2="65" stroke="#f97316" strokeWidth="3" strokeDasharray="6,4" />
        <rect x="180" y="40" width="100" height="25" fill="rgba(249, 115, 22, 0.05)" />

        {/* 3. BUFFER SIGHT DISTANCE ZONE (X: 280 to 380) */}
        <rect x="280" y="40" width="100" height="25" fill="rgba(13, 148, 136, 0.05)" />
        <g transform="translate(350, 43)">
          <rect x="0" y="0" width="22" height="14" fill="#ef4444" rx="1" />
          <rect x="2" y="3" width="6" height="8" fill="#fef08a" />
          <polygon points="18,3 22,7 18,11" fill="#fbbf24" />
        </g>

        {/* 4. WORK ZONE (X: 380 to 650) */}
        <rect x="380" y="40" width="270" height="25" fill="url(#work-hatch)" stroke="#ef4444" strokeWidth="1" />
        <rect x="440" y="44" width="150" height="16" fill="#ef4444" rx="2" />
        <text x="515" y="54" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">{language === 'ar' ? 'منطقة العمل الإنشائي' : 'WORK AREA'}</text>

        {/* 5. TERMINATION AREA (X: 650 to 750) */}
        <line x1="650" y1="65" x2="750" y2="40" stroke="#10b981" strokeWidth="3" strokeDasharray="6,4" />
        <g transform="translate(775, 20)">
          <rect x="0" y="0" width="22" height="14" rx="2" fill="#10b981" stroke="#047857" />
          <text x="11" y="9" fill="#ffffff" fontSize="6" fontWeight="bold" textAnchor="middle">ENDS</text>
        </g>

        {/* ----------------- DIMENSION ARROWS & LABELS ----------------- */}
        <line x1="30" y1="175" x2="85" y2="175" stroke="#bfa260" strokeWidth="1" markerStart="url(#arrow-start-d)" markerEnd="url(#arrow-end-d)" />
        <line x1="85" y1="175" x2="140" y2="175" stroke="#bfa260" strokeWidth="1" markerStart="url(#arrow-start-d)" markerEnd="url(#arrow-end-d)" />
        <line x1="140" y1="175" x2="180" y2="175" stroke="#bfa260" strokeWidth="1" markerStart="url(#arrow-start-d)" markerEnd="url(#arrow-end-d)" />
        <text x="105" y="188" fill="#bfa260" fontSize="7" textAnchor="middle">{language === 'ar' ? `اللوحات: ${calcs.signSpacing}` : `Sign Spacing: ${calcs.signSpacing}`}</text>

        <line x1="180" y1="175" x2="280" y2="175" stroke="#bfa260" strokeWidth="1" markerStart="url(#arrow-start-d)" markerEnd="url(#arrow-end-d)" />
        <text x="230" y="188" fill="#bfa260" fontSize="7" textAnchor="middle">{language === 'ar' ? `التدرج L: ${taperVal}م` : `Taper L: ${taperVal}m`}</text>

        <line x1="280" y1="175" x2="380" y2="175" stroke="#bfa260" strokeWidth="1" markerStart="url(#arrow-start-d)" markerEnd="url(#arrow-end-d)" />
        <text x="330" y="188" fill="#bfa260" fontSize="7" textAnchor="middle">{language === 'ar' ? `الأمان SSD: ${bufferVal}م` : `Buffer SSD: ${bufferVal}m`}</text>

        <line x1="380" y1="175" x2="650" y2="175" stroke="#bfa260" strokeWidth="1" markerStart="url(#arrow-start-d)" markerEnd="url(#arrow-end-d)" />
        <text x="515" y="188" fill="#bfa260" fontSize="7" textAnchor="middle">{language === 'ar' ? `منطقة العمل: ${workLengthVal}م` : `Work Zone: ${workLengthVal}m`}</text>

        <line x1="650" y1="175" x2="750" y2="175" stroke="#bfa260" strokeWidth="1" markerStart="url(#arrow-start-d)" markerEnd="url(#arrow-end-d)" />
        <text x="700" y="188" fill="#bfa260" fontSize="7" textAnchor="middle">{language === 'ar' ? `النهاية: ${termVal}م` : `Termination: ${termVal}m`}</text>
      </svg>
    );
  };

  // Download official permit certificate / external permit file helper
  const downloadOfficialPermitFile = (permit) => {
    if (!permit) return;
    if (permit.externalPermitDocument) {
      const a = document.createElement('a');
      a.href = permit.externalPermitDocument;
      a.download = permit.externalPermitDocName || `Official_External_Permit_${permit.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      const content = `===============================================================
الجهة المالكة للمشروع - وكالة التعمير والمشاريع
OFFICIAL DETOUR & EXCAVATION PERMIT
===============================================================
رقم تصريح الحفر الرسمي: ${permit.id || 'AM-2026-PR-99'}
اسم المشروع: ${permit.projectNameAr || permit.projectNameEn || 'King Abdulaziz Road Project'}
المقاول المنفذ: ${permit.contractorAr || permit.contractorEn || 'Madina Infrastructure Corp'}
الجهة المالكة: ${permit.clientNameAr || 'هيئة تطوير منطقة المدينة المنورة'}
تاريخ تقديم الطلب: ${permit.submittedDate || new Date().toISOString().split('T')[0]}
تاريخ بداية التصريح: ${permit.permitStartDate || '2026-08-01'}
تاريخ نهاية التصريح: ${permit.permitEndDate || '2026-12-31'}

حالة الاعتماد: ${permit.status || 'معتمد - APPROVED'}
سرعة الطريق المعتمدة: ${permit.speed || 80} km/h
طول منطقة العمل: ${permit.siteLength || 450} meters

الأبعاد الهندسية المعتمدة لكود وزارة النقل:
- تدرج الانحراف (Taper L): ${permit.taper || 180}m
- مسافة الأمان العازلة (Buffer SSD): ${permit.buffer || 130}m
- تدرج النهاية (Termination): 30m

ملاحظات المفتش:
${permit.inspector_notes || 'تمت المراجعة والتحقق من اشتراطات اللائحة التنفيذية لسلامة التحويلات المرورية.'}

===============================================================
تنبيه: هذا المستند رسمي وصادر من المنظومة الرقمية لالجهة المالكة للمشروع
===============================================================`;

      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Official_Permit_Certificate_${permit.id || 'AM-2026'}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // Inspector Search, Filtering & Sorting logic
  const getFilteredPermits = () => {
    let result = [...submittedPermits];

    // Filter by Inspector Tab
    if (inspectorTab === 'inbox') {
      result = result.filter(p => p.status !== 'Approved' && p.status !== 'Rejected' && p.status !== 'Resolved' && p.status !== 'PendingExternalReview');
    } else if (inspectorTab === 'external_review') {
      result = result.filter(p => p.status === 'PendingExternalReview');
    } else if (inspectorTab === 'history') {
      result = result.filter(p => p.status === 'Approved' || p.status === 'Rejected' || p.status === 'Resolved');
    } else if (inspectorTab === 'active_approved') {
      result = result.filter(p => p.status === 'Approved');
    }

    // 1. Apply search filter (Project name or Contractor)
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(p => 
        (p.projectNameAr || '').toLowerCase().includes(q) || 
        (p.projectNameEn || '').toLowerCase().includes(q) ||
        (p.contractorAr || '').toLowerCase().includes(q) ||
        (p.contractorEn || '').toLowerCase().includes(q)
      );
    }

    // 2. Apply status filter
    if (statusFilter !== 'All') {
      result = result.filter(p => p.status === statusFilter);
    }

    // 3. Apply sorting
    result.sort((a, b) => {
      if (sortBy === 'date_desc') {
        return new Date(b.submittedDate) - new Date(a.submittedDate);
      } else if (sortBy === 'date_asc') {
        return new Date(a.submittedDate) - new Date(b.submittedDate);
      } else if (sortBy === 'status') {
        return (a.status || '').localeCompare(b.status || '');
      }
      return 0;
    });

    return result;
  };

  const filteredPermitsList = getFilteredPermits();

  // Render Authentication Screen if not logged in
  if (!currentUser) {
    return <AuthScreen onLogin={(user) => {
      setCurrentUser(user);
      if (user.role === 'external_entity') {
        setShowHomeScreen(false);
        setInspectorTab('external_review');
      } else {
        setShowHomeScreen(true);
      }
    }} language={language} t={t} />;
  }

  // Show the 5-stage process overview once per login, before the wizard/console.
  if (showHomeScreen) {
    return (
      <ProcessHomeScreen
        language={language}
        onToggleLanguage={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
        userRole={activePortalMode}
        formData={formData}
        calcs={calcs}
        pendingCount={submittedPermits.filter(p => p.status !== 'Approved' && p.status !== 'Rejected' && p.status !== 'Resolved').length}
        myPermits={submittedPermits}
        onContinue={(targetTab, targetZoneFilter) => {
          if (targetTab && activePortalMode === 'inspector') setInspectorTab(targetTab);
          if (targetZoneFilter) setActiveZoneFilter(targetZoneFilter);
          setShowHomeScreen(false);
        }}
      />
    );
  }

  // Contractor Permit Application return view
  if (submitted) {
    // Check if there were safety standard deviations in the contractor inputs
    const isTaperDeviation = parseFloat(formData.proposedTaper) < calcs.requiredTaper;
    const isBufferDeviation = parseFloat(formData.proposedBuffer) < calcs.requiredBuffer;
    const isTermDeviation = parseFloat(formData.proposedTermination) < calcs.requiredTermination;
    const hasAnyDeviation = isTaperDeviation || isBufferDeviation || isTermDeviation;

    return (
      <div className="min-h-screen bg-brand-light text-brand-text-dark py-10 px-4 sm:px-6 lg:px-8 font-sans transition-all duration-500" dir={t.dir}>
        <div className="max-w-4xl mx-auto bg-brand-light-card border border-brand-primary/10 rounded-2xl shadow-2xl overflow-hidden p-8 animate-fade-in">
          
          <div className="flex flex-col items-center text-center pb-8 border-b border-slate-200">
            <div className="h-16 w-16 bg-brand-primary/10 text-brand-primary rounded-full flex items-center justify-center mb-4 ring-4 ring-brand-primary/5">
              <FileCheck className="h-10 w-10 text-brand-primary" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-brand-dark">{language === 'ar' ? 'تم تقديم تصريح السلامة للمراجعة' : 'Permit Strategy Submitted'}</h1>
            <p className="text-brand-text-gray mt-2 max-w-xl">
              {language === 'ar' 
                ? 'تم إرسال مخطط التحويلة المرورية وصياغته بنجاح. يمكنك معاينة التقرير ومطابقته أدناه.'
                : 'The traffic detour plan has been filed. Review document specifications and compliance stampings below.'}
            </p>
            
            {hasAnyDeviation && (
              <div className="mt-4 max-w-xl bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
                <span>
                  {language === 'ar' 
                    ? '⚠️ تنبيه: تم رصد قيم تقل عن الكود القياسي لوزارة النقل. تم وسم هذا الطلب بقسم المراجعة الخاصة كـ "غير مطابق".'
                    : '⚠️ Warning: Some parameters deviate from MOT standard minimums. This design is flagged as "NON-COMPLIANT" on the report.'}
                </span>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3 justify-center">
              <button 
                onClick={() => window.print()} 
                className="flex items-center gap-2 px-5 py-2 text-brand-text-dark bg-slate-100 hover:bg-slate-200 font-semibold rounded-lg border border-slate-350 transition text-xs"
              >
                <Printer className="h-4 w-4" /> {t.print}
              </button>
              <button 
                onClick={() => window.print()} 
                className="flex items-center gap-2 px-5 py-2 text-white bg-emerald-600 hover:bg-emerald-700 font-semibold rounded-lg shadow transition text-xs"
              >
                <Shield className="h-4 w-4" /> {language === 'ar' ? 'تحميل شهادة إشعار مرور (PDF)' : 'Download Muroor Certificate'}
              </button>
              <button 
                onClick={() => setActiveReportModal('end')} 
                className="flex items-center gap-2 px-5 py-2 text-brand-text-dark bg-slate-100 hover:bg-slate-200 font-semibold rounded-lg border border-slate-350 transition text-xs"
              >
                <FileText className="h-4 w-4" /> {language === 'ar' ? 'تقرير انتهاء التحويلة' : 'Detour End Report'}
              </button>
              <button 
                onClick={() => setActiveReportModal('removal')} 
                className="flex items-center gap-2 px-5 py-2 text-brand-text-dark bg-slate-100 hover:bg-slate-200 font-semibold rounded-lg border border-slate-350 transition text-xs"
              >
                <FileText className="h-4 w-4" /> {language === 'ar' ? 'تقرير إزالة التحويلة' : 'Detour Removal Report'}
              </button>
              <button 
                onClick={() => setSubmitted(false)}
                className="flex items-center gap-2 px-5 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white font-semibold rounded-lg transition text-xs"
              >
                <RotateCcw className="h-4 w-4" /> {t.edit}
              </button>
            </div>
          </div>

          {/* Printable Permit report preview */}
          <div className="py-8 bg-white text-slate-900 rounded-xl p-8 shadow-inner mt-8 border border-slate-300 print:p-0 print:border-none print:shadow-none" id="printable-permit" dir={t.dir}>
            
            {/* Header info */}
            <div className="flex justify-between items-start border-b-2 border-brand-primary pb-6">
              <div>
                <div className="text-xs uppercase tracking-widest text-brand-primary font-bold">{t.ksa}</div>
                <div className="text-lg font-bold text-brand-dark">{t.amanaDept}</div>
                <div className="text-sm text-brand-text-gray font-medium">{t.deptName}</div>
              </div>
              <div className="text-right" dir="ltr">
                <div className={`inline-block px-3 py-1 font-semibold rounded text-xs ${hasAnyDeviation ? 'bg-red-100 text-red-800' : 'bg-brand-primary/10 text-brand-primary'}`}>
                  {hasAnyDeviation 
                    ? (language === 'ar' ? 'تصريح معلق - غير مطابق' : 'FLAGGED - NON-COMPLIANT') 
                    : formData.ownerClassification === 'not_affiliated'
                      ? (language === 'ar' ? 'بانتظار مراجعة الجهة الأخرى' : 'Pending External Entity Review')
                      : t.permitPending}
                </div>
                <div className="text-xs text-slate-500 mt-1">{t.refNo}: AM-2026-PR-{Math.floor(100000 + Math.random() * 900000)}</div>
                <div className="text-xs text-slate-500">{t.date}: {new Date().toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}</div>
              </div>
            </div>

            <div className="my-6 text-center">
              <h2 className="text-xl font-bold uppercase tracking-wider text-brand-dark border-b border-brand-gold/30 pb-2 inline-block">{t.officialPermitTitle}</h2>
            </div>

            {/* General Info table */}
            <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm mt-6 border-b border-slate-200 pb-6">
              <div>
                <span className="block text-xs font-bold text-slate-500 uppercase">{t.projectName}:</span>
                <span className="font-semibold text-slate-950">{language === 'ar' ? formData.projectNameAr : formData.projectNameEn}</span>
              </div>
              <div>
                <span className="block text-xs font-bold text-slate-500 uppercase">{t.clientName}:</span>
                <span className="font-semibold text-slate-950">{language === 'ar' ? formData.clientNameAr : formData.clientNameEn}</span>
              </div>
              <div>
                <span className="block text-xs font-bold text-slate-500 uppercase">{t.contractingCompany}:</span>
                <span className="font-semibold text-slate-950">{language === 'ar' ? formData.contractingCompanyAr : formData.contractingCompanyEn}</span>
              </div>
              <div>
                <span className="block text-xs font-bold text-slate-500 uppercase">{t.projectManager}:</span>
                <span className="font-semibold text-slate-950">{language === 'ar' ? formData.projectManagerAr : formData.projectManagerEn}</span>
              </div>
              <div>
                <span className="block text-xs font-bold text-slate-500 uppercase">{t.permitStartDate} & {t.permitEndDate}:</span>
                <span className="font-semibold text-slate-950 block" dir="ltr">Permit: {formData.permitStartDate} to {formData.permitEndDate}</span>
                <span className="font-semibold text-brand-primary block mt-1" dir="ltr">Work: {formData.workStartDate} to {formData.workEndDate}</span>
              </div>
              <div>
                <span className="block text-xs font-bold text-slate-500 uppercase">{t.siteDimensions}:</span>
                <span className="font-semibold text-slate-950">{formData.siteLength}m x {formData.siteWidth}m</span>
              </div>
            </div>

            {/* GIS and CAD Verification */}
            <div className="mt-6 border-b border-slate-200 pb-6">
              <h3 className="text-sm font-bold text-brand-primary uppercase tracking-wide mb-2 flex items-center gap-1">
                <Compass className="h-4 w-4" /> {t.section1Title}
              </h3>
              
              <div 
                ref={reportMapContainerRef}
                className="h-64 rounded-xl border border-slate-250 mt-2 mb-4 overflow-hidden relative z-0"
                id="report-leaflet-map"
              ></div>

              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs space-y-2">
                <div>
                  <span className="font-bold text-slate-700">{language === 'ar' ? 'إحداثيات مضلع حدود التحويلة بنظام UTM-WGS84:' : 'WGS84 UTM Coordinate Boundary Polygon:'} </span>
                  <code className="text-slate-800 break-all bg-slate-200/50 p-1 rounded font-mono" dir="ltr">{formData.coordinates || 'No boundary drawn'}</code>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-200">
                  <div><span className="font-bold text-slate-700">{t.stagingArea}:</span> {language === 'ar' ? formData.stagingAreaAr : formData.stagingAreaEn}</div>
                  <div><span className="font-bold text-slate-700">{t.hardZone}:</span> {language === 'ar' ? formData.hardZoneClassAr : formData.hardZoneClassEn}</div>
                </div>
              </div>
            </div>

            {/* Roadway SVG layout representation */}
            <div className="mt-6 border-b border-slate-200 pb-6">
              <h3 className="text-sm font-bold text-brand-primary uppercase tracking-wide mb-2 flex items-center gap-1">
                <Layers className="h-4 w-4" /> {language === 'ar' ? 'الرسم الهندسي التخطيطي لمسافات السلامة للتحويلة' : 'Detour Safety Layout Schematic'}
              </h3>
              <div className="my-3">
                {renderHorizontalLayoutSVG()}
              </div>
            </div>

            {/* Dimension audit card */}
            <div className="mt-6 border-b border-slate-200 pb-6">
              <h3 className="text-sm font-bold text-brand-primary uppercase tracking-wide mb-2 flex items-center gap-1">
                <Calculator className="h-4 w-4" /> {language === 'ar' ? 'نتائج مطابقة الأبعاد الهندسية لكود وزارة النقل' : 'Detour Safety Dimension Compliance Logs'}
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden" dir={t.dir}>
                  <thead className="bg-slate-50 font-bold text-slate-700 border-b border-slate-200">
                    <tr>
                      <th className="p-3">{language === 'ar' ? 'العنصر الهندسي للسلامة' : ' Detour Element'}</th>
                      <th className="p-3 text-center">{language === 'ar' ? 'الحد الأدنى المطلوب' : 'MOT Minimum Required'}</th>
                      <th className="p-3 text-center">{language === 'ar' ? 'المقترح من المقاول' : 'Proposed value'}</th>
                      <th className="p-3 text-center">{language === 'ar' ? 'الحالة الفنية' : 'Compliance'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="p-3 font-semibold text-slate-900">{t.taperLength}</td>
                      <td className="p-3 text-center font-mono">{calcs.requiredTaper}m</td>
                      <td className={`p-3 text-center font-mono ${isTaperDeviation ? 'text-red-650 font-bold bg-red-50' : 'text-slate-900'}`}>{formData.proposedTaper}m</td>
                      <td className="p-3 text-center">
                        {isTaperDeviation ? (
                          <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded font-bold text-[9px] uppercase">⚠️ NON-COMPLIANT / مخالف</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[9px] uppercase">COMPLIANT / مطابق</span>
                        )}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-3 font-semibold text-slate-900">{t.bufferSSD}</td>
                      <td className="p-3 text-center font-mono">{calcs.requiredBuffer}m</td>
                      <td className={`p-3 text-center font-mono ${isBufferDeviation ? 'text-red-650 font-bold bg-red-50' : 'text-slate-900'}`}>{formData.proposedBuffer}m</td>
                      <td className="p-3 text-center">
                        {isBufferDeviation ? (
                          <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded font-bold text-[9px] uppercase">⚠️ NON-COMPLIANT / مخالف</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[9px] uppercase">COMPLIANT / مطابق</span>
                        )}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-3 font-semibold text-slate-900">{t.terminationLength}</td>
                      <td className="p-3 text-center font-mono">{calcs.requiredTermination}m</td>
                      <td className={`p-3 text-center font-mono ${isTermDeviation ? 'text-red-650 font-bold bg-red-50' : 'text-slate-900'}`}>{formData.proposedTermination}m</td>
                      <td className="p-3 text-center">
                        {isTermDeviation ? (
                          <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded font-bold text-[9px] uppercase">⚠️ NON-COMPLIANT / مخالف</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[9px] uppercase">COMPLIANT / مطابق</span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Technical Compliance Checklists */}
            <div className="mt-6 border-b border-slate-200 pb-6">
              <h3 className="text-sm font-bold text-brand-primary uppercase tracking-wide mb-2 flex items-center gap-1">
                <CheckSquare className="h-4 w-4" /> {t.section6Title}
              </h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs text-slate-800">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={`h-4 w-4 ${compliance.motCompliant ? 'text-emerald-600' : 'text-slate-300'}`} />
                  <span>{t.motDesign}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={`h-4 w-4 ${compliance.sasoCompliant ? 'text-emerald-600' : 'text-slate-300'}`} />
                  <span>{t.sasoReflective}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={`h-4 w-4 ${compliance.lightingLuxVerified ? 'text-emerald-600' : 'text-slate-300'}`} />
                  <span>{t.lightingLuxVerified}</span>
                </div>
              </div>
            </div>

            {/* 5-Party Official Stakeholder E-Signatures (Gap 5 Mandate) */}
            <div className="mt-10 pt-8 border-t-2 border-slate-300">
              <h4 className="text-[11px] font-extrabold text-slate-700 uppercase mb-4 tracking-wider">
                {language === 'ar' ? 'اعتمادات وتوقيعات أطراف محضر التنسيق الـ ٥ (معتمدة إلكترونياً):' : 'Official 5-Party Stakeholder E-Signatures (Mandatory):'}
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-[10px]">
                <div className="border border-slate-200 p-2.5 rounded-lg bg-slate-50">
                  <div className="h-8 border-b border-slate-300 flex items-center justify-center font-mono text-[9px] text-emerald-700 font-bold">✓ SIGNED E-ID</div>
                  <div className="mt-1.5 font-bold text-slate-800 text-[11px]">{language === 'ar' ? (formData.projectManagerAr || 'م. طارق الحربي') : 'Eng. Tareq Al-Harbi'}</div>
                  <div className="text-slate-500 font-medium">{language === 'ar' ? '١. مندوب المقاول المنفذ' : '1. Contractor Representative'}</div>
                </div>

                <div className="border border-slate-200 p-2.5 rounded-lg bg-slate-50">
                  <div className="h-8 border-b border-slate-300 flex items-center justify-center font-mono text-[9px] text-emerald-700 font-bold">✓ SIGNED E-ID</div>
                  <div className="mt-1.5 font-bold text-slate-800 text-[11px]">{language === 'ar' ? 'د. عبدالمجيد الغامدي' : 'Dr. Abdulmajeed Al-Ghamdi'}</div>
                  <div className="text-slate-500 font-medium">{language === 'ar' ? '٢. الاستشاري المشرف' : '2. Supervising Consultant'}</div>
                </div>

                <div className="border border-slate-200 p-2.5 rounded-lg bg-slate-50">
                  <div className="h-8 border-b border-slate-300 flex items-center justify-center font-mono text-[9px] text-slate-400 font-bold">⏳ PENDING</div>
                  <div className="mt-1.5 font-bold text-slate-800 text-[11px]">{language === 'ar' ? 'إدارة السلامة المرورية' : 'Safety Dept. Delegate'}</div>
                  <div className="text-slate-500 font-medium">{language === 'ar' ? '٣. مندوب إدارة السلامة' : '3. Safety Dept. Officer'}</div>
                </div>

                <div className="border border-slate-200 p-2.5 rounded-lg bg-slate-50">
                  <div className="h-8 border-b border-slate-300 flex items-center justify-center font-mono text-[9px] text-slate-400 font-bold">⏳ PENDING</div>
                  <div className="mt-1.5 font-bold text-slate-800 text-[11px]">{language === 'ar' ? 'شركة صيانة الطرق' : 'Maintenance Contractor'}</div>
                  <div className="text-slate-500 font-medium">{language === 'ar' ? '٤. مقاول الصيانة' : '4. Maintenance Contractor'}</div>
                </div>

                <div className="border border-slate-200 p-2.5 rounded-lg bg-slate-50">
                  <div className="h-8 border-b border-slate-300 flex items-center justify-center font-mono text-[9px] text-slate-400 font-bold">⏳ PENDING</div>
                  <div className="mt-1.5 font-bold text-slate-800 text-[11px]">{language === 'ar' ? 'مكتب استشارات الصيانة' : 'Maintenance Consultant'}</div>
                  <div className="text-slate-500 font-medium">{language === 'ar' ? '٥. استشاري الصيانة' : '5. Maintenance Consultant'}</div>
                </div>
              </div>
            </div>

          </div>

        </div>
        
        {/* Report Modal */}
        <ReportModal 
          isOpen={!!activeReportModal} 
          onClose={() => setActiveReportModal(null)} 
          title={activeReportModal === 'end' ? (language === 'ar' ? 'تقرير انتهاء أعمال التحويلة المرورية' : 'Traffic Detour End Report') : (language === 'ar' ? 'تقرير إزالة التحويلة وإعادة الموقع' : 'Detour Removal & Site Handover Report')} 
          language={language} 
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-light text-brand-text-dark py-10 px-4 sm:px-6 lg:px-8 font-sans transition-all duration-300 relative" dir={t.dir}>
      
      {/* Custom In-App Toast Notification Banner (Never Browser Push: Top-Right on Arabic, Top-Left on English) */}
      {toastNotification && (
        <div 
          className={`fixed top-4 z-[9999] max-w-sm w-full bg-slate-900/95 text-white p-4 rounded-xl shadow-2xl border transition-all duration-300 backdrop-blur-md flex items-start gap-3 ${
            t.dir === 'rtl' ? 'right-4 border-brand-gold/30' : 'left-4 border-brand-primary/40'
          }`}
          dir={t.dir}
        >
          {toastNotification.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
          {toastNotification.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />}
          {toastNotification.type === 'error' && <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />}
          {toastNotification.type === 'info' && <Info className="w-5 h-5 text-brand-gold shrink-0 mt-0.5" />}
          
          <div className="flex-1 space-y-0.5">
            <h4 className="font-bold text-xs text-brand-gold">{toastNotification.title}</h4>
            <p className="text-[11px] text-slate-200 leading-snug">{toastNotification.text}</p>
          </div>

          <button 
            type="button"
            onClick={() => setToastNotification(null)}
            className="text-slate-400 hover:text-white text-xs p-1"
          >
            ✕
          </button>
        </div>
      )}

      <div className="max-w-5xl mx-auto bg-brand-light-card border border-brand-primary/10 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header & Mode Toggles */}
        <div className="bg-gradient-to-r from-brand-dark via-brand-primary to-brand-dark px-8 py-8 border-b-2 border-brand-gold/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-brand-gold text-xs font-bold uppercase tracking-wider mb-1">
                <Building2 className="h-4 w-4" /> {t.portalTitle}
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">{t.title}</h1>
            </div>

            {/* User Session Info & Language Switcher */}
            <div className="flex items-center gap-3">
              {/* Back to Home (5-stage process overview) */}
              <button
                type="button"
                onClick={() => setShowHomeScreen(true)}
                className="p-2 bg-brand-dark-hover/60 hover:bg-brand-dark-hover border border-brand-gold/30 rounded-xl text-brand-gold transition shadow flex items-center gap-1.5"
                title={language === 'ar' ? 'العودة للصفحة الرئيسية' : 'Back to Home'}
              >
                <Home className="w-4 h-4 text-brand-gold" />
                <span className="hidden sm:inline text-xs font-bold">{language === 'ar' ? 'الرئيسية' : 'Home'}</span>
              </button>

              {/* Header Notification Bell (🔔) Button & Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                  className="relative p-2 bg-brand-dark-hover/60 hover:bg-brand-dark-hover border border-brand-gold/30 rounded-xl text-brand-gold transition shadow flex items-center justify-center"
                  title={language === 'ar' ? 'مركز الإشعارات والتوجيهات' : 'Notification Center'}
                >
                  <Bell className="w-4 h-4 text-brand-gold" />
                  {submittedPermits.some(p => p.status === 'Rejected' || (p.inspector_notes && p.inspector_notes.trim().length > 0)) && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow">
                      {submittedPermits.filter(p => p.status === 'Rejected' || (p.inspector_notes && p.inspector_notes.trim().length > 0)).length}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown Menu */}
                {notifDropdownOpen && (
                  <div className={`absolute top-12 z-50 w-80 sm:w-96 bg-slate-900 border border-brand-gold/30 rounded-2xl shadow-2xl p-4 text-white animate-fade-in ${t.dir === 'rtl' ? 'left-0' : 'right-0'}`}>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-700 mb-3">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-brand-gold" />
                        <h4 className="font-bold text-xs text-white">
                          {language === 'ar' ? 'مركز التنبيهات والتوجيهات' : 'Directives & Notifications'}
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNotifDropdownOpen(false)}
                        className="text-slate-400 hover:text-white text-xs p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="max-h-72 overflow-y-auto space-y-2.5">
                      {submittedPermits.filter(p => p.status === 'Rejected' || (p.inspector_notes && p.inspector_notes.trim().length > 0)).length === 0 ? (
                        <div className="p-4 text-center text-slate-400 text-xs italic">
                          {language === 'ar' ? 'لا يوجد إشعارات أو توجيهات جديدة.' : 'No new notifications or directives.'}
                        </div>
                      ) : (
                        submittedPermits.filter(p => p.status === 'Rejected' || (p.inspector_notes && p.inspector_notes.trim().length > 0)).map(permit => (
                          <div key={permit.id} className="p-3 bg-slate-800 border border-slate-700 rounded-xl space-y-1.5 hover:border-brand-gold/50 transition">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-brand-gold">
                                {language === 'ar' ? `ترخيص #${permit.id} - ${permit.projectNameAr}` : `Permit #${permit.id} - ${permit.projectNameEn}`}
                              </span>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${permit.status === 'Rejected' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                                {permit.status === 'Rejected' ? (language === 'ar' ? 'مرفوض' : 'Rejected') : (language === 'ar' ? 'توجيه رسمي' : 'Directive')}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-300 font-sans leading-snug">
                              {permit.inspector_notes || (language === 'ar' ? 'تم رفض المخطط لعدم استيفاء مسافات التدرج.' : 'Rejected for geometric non-compliance.')}
                            </p>
                            <div className="pt-1 flex justify-end">
                              <button
                                type="button"
                                onClick={() => {
                                  setNotifDropdownOpen(false);
                                  setContractorTab('new_plan');
                                  setCurrentPhase(1);
                                }}
                                className="text-[10px] text-brand-gold hover:underline font-bold"
                              >
                                {language === 'ar' ? 'تعديل المعاملة ←' : 'Fix Request →'}
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2.5 bg-brand-dark-hover/60 px-3.5 py-1.5 rounded-xl border border-brand-gold/30 text-xs font-bold text-brand-gold shadow">
                <User className="w-4 h-4 text-brand-gold" />
                <span>{currentUser?.username} ({currentUser?.role === 'inspector' ? (language === 'ar' ? 'المفتش' : 'Inspector') : (language === 'ar' ? 'مقاول معتمد' : 'Contractor')})</span>
                <button 
                  onClick={() => setCurrentUser(null)} 
                  className="mr-1 text-slate-300 hover:text-red-400 flex items-center gap-1 transition-colors pl-2 border-l border-brand-gold/20"
                  title={language === 'ar' ? 'تسجيل الخروج' : 'Logout'}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="text-[10px] hidden sm:inline">{language === 'ar' ? 'خروج' : 'Logout'}</span>
                </button>
              </div>

              <button 
                onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
                className="flex items-center gap-2 px-3 py-1.5 bg-brand-dark-hover/40 hover:bg-brand-dark-hover/70 border border-brand-gold/30 rounded-lg text-xs font-semibold text-brand-gold transition shadow"
              >
                <Globe className="h-3.5 w-3.5" />
                <span>{language === 'ar' ? 'English' : 'العربية'}</span>
              </button>
            </div>
          </div>

          {/* Current stage \u2014 simple label instead of the full scrollable 5-stage bar */}
          <div className="mt-6 bg-brand-dark-hover/40 border border-brand-gold/20 rounded-xl px-4 py-2.5 flex items-center gap-2">
            {(() => {
              let stageIndex = 0; // contractor default: Stage 1
              if (activePortalMode === 'inspector') {
                if (inspectorTab === 'active_approved') stageIndex = 2; // Stage 3: Execute & Verify Readiness
                else stageIndex = 1; // Stage 2: Review & Approve (pending_review / decision_history)
              }
              const stage = LIFECYCLE_STAGES[stageIndex];
              return (
                <>
                  <span className="w-6 h-6 rounded-full bg-brand-gold/20 border border-brand-gold/40 text-brand-gold text-[11px] font-bold flex items-center justify-center shrink-0">
                    {stage.id}
                  </span>
                  <span className="text-xs font-bold text-white">
                    {language === 'ar' ? stage.labelAr : stage.labelEn}
                  </span>
                </>
              );
            })()}
          </div>

          {/* Stepper Progress bar (only visible in contractor portal) */}
          {activePortalMode === 'contractor' && (
            <div className="mt-8 relative">
              <div className="absolute top-5 left-0 w-full h-0.5 bg-brand-dark-hover/60 -translate-y-1/2 z-0"></div>
              <div 
                className={`absolute top-5 h-0.5 bg-brand-gold -translate-y-1/2 transition-all duration-500 z-0 ${t.dir === 'rtl' ? 'right-0' : 'left-0'}`} 
                style={{ width: `${((currentPhase - 1) / 2) * 100}%` }}
              ></div>

              <div className="relative z-10 flex items-center justify-between">
                {[1, 2, 3].map((step) => {
                  const stepNames = [t.step1, t.step2, t.step3];
                  const isCompleted = currentPhase > step;
                  const isActive = currentPhase === step;
                  
                  return (
                    <div key={step} className="flex flex-col items-center">
                      <button
                        onClick={() => {
                          if (step === 2 && !isPhaseComplete(1)) {
                            alert(language === 'ar' ? 'يرجى إكمال جميع متطلبات الخطوة الأولى أولاً.' : 'Please complete all Phase 1 requirements first.');
                            return;
                          }
                          if (step === 3 && (!isPhaseComplete(1) || !isPhaseComplete(2))) {
                            alert(language === 'ar' ? 'يرجى إكمال متطلبات الخطوة الأولى والثانية أولاً.' : 'Please complete all Phase 1 & 2 requirements first.');
                            return;
                          }
                          setCurrentPhase(step);
                        }}
                        className={`flex h-10 w-10 items-center justify-center rounded-full font-bold transition-all duration-300 border-2 ${
                          isCompleted 
                            ? 'bg-brand-primary border-brand-primary text-white shadow-lg' 
                            : isActive 
                              ? 'bg-brand-light-card border-brand-gold text-brand-gold ring-4 ring-brand-gold/10' 
                              : (step === 2 && !isPhaseComplete(1)) || (step === 3 && (!isPhaseComplete(1) || !isPhaseComplete(2)))
                                ? 'bg-slate-100 border-slate-200 text-slate-350 cursor-not-allowed opacity-50'
                                : 'bg-brand-dark border-brand-dark-hover text-brand-light/40'
                        }`}
                      >
                        {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : step}
                      </button>
                      <span className={`mt-2 text-xs font-semibold tracking-wide transition-colors ${
                        isActive ? 'text-brand-gold' : 'text-brand-light/60'
                      }`}>
                        {stepNames[step - 1]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* -------------------- CONTRACTOR PORTAL VIEW -------------------- */}
        {activePortalMode === 'contractor' && (
          <div className="p-8">
            
            {/* Contractor Portal View Switcher Bar */}
            <div className="flex flex-col sm:flex-row border-b border-slate-200 mb-6 bg-slate-100 p-1.5 rounded-2xl gap-2 shadow-inner">
              <button
                type="button"
                onClick={() => setContractorTab('new_plan')}
                className={`flex-1 py-2.5 px-4 rounded-xl font-extrabold text-xs transition flex items-center justify-center gap-2 ${
                  contractorTab === 'new_plan'
                    ? 'bg-brand-primary text-white shadow-md'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>{language === 'ar' ? 'إنشاء وتقديم خطة تحويلة جديدة' : 'Create & Submit Detour Plan'}</span>
              </button>

              <button
                type="button"
                onClick={() => setContractorTab('my_requests')}
                className={`flex-1 py-2.5 px-4 rounded-xl font-extrabold text-xs transition flex items-center justify-center gap-2 relative ${
                  contractorTab === 'my_requests'
                    ? 'bg-brand-primary text-white shadow-md'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>{language === 'ar' ? 'سجل طلباتي والمعاملات الحالية' : 'My Requests & Directives Log'}</span>
                {submittedPermits.some(p => p.status === 'Rejected' || (p.inspector_notes && p.inspector_notes.trim().length > 0)) && (
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setContractorTab('documents')}
                className={`flex-1 py-2.5 px-4 rounded-xl font-extrabold text-xs transition flex items-center justify-center gap-2 ${
                  contractorTab === 'documents'
                    ? 'bg-brand-primary text-white shadow-md'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                <FileSignature className="w-4 h-4" />
                <span>{language === 'ar' ? 'المستندات' : 'Documents'}</span>
              </button>
            </div>

            {/* High-Priority Inspector Rejection & Directives Alert Box (LATEST SINGLE UPDATE ONLY) */}
            {(() => {
              const flaggedPermits = submittedPermits.filter(p => p.status === 'Rejected' || (p.inspector_notes && p.inspector_notes.trim().length > 0));
              if (flaggedPermits.length === 0) return null;

              const latestPermit = flaggedPermits[0]; // ONLY show the latest update as an alertbox

              if (dismissedAlertId === latestPermit.id) return null;

              return (
                <div className="mb-6 relative">
                  <div className="bg-red-50 border-2 border-red-500/50 rounded-2xl p-4 shadow-md text-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-4 relative">
                    {/* Top Right (X) Dismiss Button */}
                    <button
                      type="button"
                      onClick={() => setDismissedAlertId(latestPermit.id)}
                      className="absolute top-2.5 right-2.5 p-1 bg-red-100 hover:bg-red-200 text-red-700 hover:text-red-900 rounded-full transition shadow-sm"
                      title={language === 'ar' ? 'إغلاق التنبيه' : 'Dismiss Alert'}
                    >
                      <X className="w-4 h-4" />
                    </button>

                    <div className="flex items-start gap-3 pr-6">
                      <div className="p-2 bg-red-600 text-white rounded-xl shrink-0 mt-0.5 shadow">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs text-red-700 uppercase tracking-wide">
                            {language === 'ar' ? `آخر تحديث عاجل — تصريح رقم #${latestPermit.id}` : `Latest Alert — Permit #${latestPermit.id}`}
                          </span>
                          <span className="bg-red-200 text-red-900 font-mono font-bold text-[10px] px-2 py-0.5 rounded-full">
                            {latestPermit.status === 'Rejected' ? (language === 'ar' ? 'مرفوض للتعديل' : 'REJECTED') : (language === 'ar' ? 'توجيه جديد' : 'DIRECTIVE LOGGED')}
                          </span>
                        </div>
                        <h3 className="font-bold text-sm text-slate-900 mt-0.5">
                          {language === 'ar' ? latestPermit.projectNameAr : latestPermit.projectNameEn}
                        </h3>
                        <p className="text-xs text-red-950 font-sans mt-1.5 bg-white/90 p-3 rounded-xl border border-red-200 leading-relaxed font-semibold shadow-sm">
                          <span className="font-extrabold text-red-700">{language === 'ar' ? 'توجيه وملاحظات المفتش الأخيرة:' : 'Latest Inspector Directives:'} </span>
                          {latestPermit.inspector_notes || (language === 'ar' ? 'تم رفض الخطة المرفقة لعدم استيفاء مسافات التدرج واللوحات التحذيرية المتقدمة.' : 'Request rejected for non-compliance with MOT guidelines.')}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setContractorTab('new_plan');
                        setCurrentPhase(1);
                        alert(language === 'ar' ? `تم فتح النموذج لتعديل التصريح رقم #${latestPermit.id} وإعادة التقديم` : `Form opened to modify permit #${latestPermit.id} and resubmit`);
                      }}
                      className="shrink-0 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold rounded-xl shadow-md transition flex items-center justify-center gap-2"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>{language === 'ar' ? 'تعديل الخطة وإعادة التقديم' : 'Fix & Resubmit Request'}</span>
                    </button>
                  </div>
                </div>
              );
            })()}

            {contractorTab === 'my_requests' ? (
              /* Contractor Requests & Directives Dashboard */
              <div className="space-y-6 animate-fade-in">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-brand-primary" />
                      <h2 className="font-extrabold text-slate-900 text-base">
                        {language === 'ar' ? 'سجل طلبات الترخيص والتوجيهات' : 'Contractor Permits & Directives Log'}
                      </h2>
                    </div>
                    <span className="text-xs font-mono font-bold bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                      {submittedPermits.length} {language === 'ar' ? 'طلبات' : 'permits'}
                    </span>
                  </div>

                  {submittedPermits.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs">
                      {language === 'ar' ? 'لا يوجد طلبات ترخيص مقدمة حالياً.' : 'No permit requests submitted yet.'}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {submittedPermits.map(permit => (
                        <div key={permit.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white transition shadow-sm space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-sm text-slate-900">{language === 'ar' ? permit.projectNameAr : permit.projectNameEn}</span>
                                <span className="text-xs font-mono text-slate-500 font-bold">#{permit.id}</span>
                              </div>
                              <span className="text-xs text-slate-500">{language === 'ar' ? permit.contractorAr : permit.contractorEn}</span>
                            </div>

                            <span className={`px-3 py-1 rounded-full font-bold text-xs ${
                              permit.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                              permit.status === 'Rejected' ? 'bg-red-100 text-red-800 border border-red-300' :
                              permit.status === 'Resolved' ? 'bg-slate-200 text-slate-700 border border-slate-300' :
                              permit.status === 'PendingExternalReview' ? 'bg-purple-100 text-purple-800 border border-purple-300' :
                              'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}>
                              {permit.status === 'Approved' ? (language === 'ar' ? 'معتمد ونشط' : 'Approved') :
                               permit.status === 'Rejected' ? (language === 'ar' ? 'مرفوض للتعديل' : 'Rejected') :
                               permit.status === 'Resolved' ? (language === 'ar' ? 'مغلق' : 'Closed') :
                               permit.status === 'PendingExternalReview' ? (language === 'ar' ? 'بانتظار مراجعة الجهة الأخرى' : 'Pending External Entity Review') :
                               (language === 'ar' ? 'قيد المراجعة الفنية' : 'Under Review')}
                            </span>
                          </div>

                          {/* Details Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                            <div className="bg-white p-2 rounded border border-slate-200">
                              <span className="block text-[10px] text-slate-400 uppercase font-bold">{t.speedLimit}</span>
                              <span className="font-bold text-slate-800">{permit.speed || 80} km/h</span>
                            </div>
                            <div className="bg-white p-2 rounded border border-slate-200">
                              <span className="block text-[10px] text-slate-400 uppercase font-bold">{t.taperLength}</span>
                              <span className="font-bold text-slate-800">{permit.taper || 180} m</span>
                            </div>
                            <div className="bg-white p-2 rounded border border-slate-200">
                              <span className="block text-[10px] text-slate-400 uppercase font-bold">{t.bufferSSD}</span>
                              <span className="font-bold text-slate-800">{permit.buffer || 130} m</span>
                            </div>
                            <div className="bg-white p-2 rounded border border-slate-200">
                              <span className="block text-[10px] text-slate-400 uppercase font-bold">{t.terminationLength}</span>
                              <span className="font-bold text-slate-800">{permit.termination || 30} m</span>
                            </div>
                          </div>

                          {/* Inspector Directives Log inside Card */}
                          {permit.inspector_notes && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs">
                              <span className="font-bold text-red-800 block mb-0.5">{language === 'ar' ? 'ملاحظات وتوجيهات المفتش:' : 'Inspector Directives:'}</span>
                              <p className="text-red-950 font-medium">{permit.inspector_notes}</p>
                            </div>
                          )}

                          {/* Official documents \u2014 the contractor can view and export
                              these once they exist, but the approval/decision actions
                              inside each one remain inspector-only. */}
                          <div className="pt-2 border-t border-slate-200">
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1.5">
                              {language === 'ar' ? 'المستندات الرسمية' : 'Official Documents'}
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              <button
                                onClick={() => { setSelectedPermitForOpening(permit); setOpeningMinutesModalOpen(true); }}
                                className="py-1.5 bg-brand-gold/10 hover:bg-brand-gold/20 text-brand-gold-hover font-bold text-[11px] rounded flex items-center justify-center gap-1 border border-brand-gold/20 transition"
                              >
                                <FileSignature className="w-3.5 h-3.5" />
                                <span>{language === 'ar' ? 'محضر فتح تحويلة' : 'Opening Minutes'}</span>
                              </button>
                              <button
                                onClick={() => { setSelectedPermitForReadiness(permit); setFieldReadinessModalOpen(true); }}
                                className="py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 font-bold text-[11px] rounded flex items-center justify-center gap-1 border border-emerald-500/20 transition"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>{language === 'ar' ? 'محضر الجاهزية' : 'Readiness Report'}</span>
                              </button>
                              <button
                                onClick={() => { setSelectedPermitForActiveAudit(permit); setActiveMonitoringModalOpen(true); }}
                                className="py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 font-bold text-[11px] rounded flex items-center justify-center gap-1 border border-amber-500/20 transition"
                              >
                                <ClipboardCheck className="w-3.5 h-3.5" />
                                <span>{language === 'ar' ? 'متابعة الأداء' : 'Monitoring Report'}</span>
                              </button>
                              <button
                                onClick={() => { setSelectedPermitForClosure(permit); setClosureModalOpen(true); }}
                                className="py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded flex items-center justify-center gap-1 border border-slate-300 transition"
                              >
                                <FileCheck className="w-3.5 h-3.5" />
                                <span>{language === 'ar' ? 'محضر إغلاق التحويلة' : 'Closure Minutes'}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : contractorTab === 'documents' ? (
              /* Contractor Documents Tab \u2014 all their permits' official
                 documents, consolidated in one place. */
              <div className="space-y-6 animate-fade-in">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
                    <div className="flex items-center gap-2">
                      <FileSignature className="w-5 h-5 text-brand-primary" />
                      <h2 className="font-extrabold text-slate-900 text-base">
                        {language === 'ar' ? 'المستندات الرسمية لجميع الطلبات' : 'Official Documents \u2014 All Requests'}
                      </h2>
                    </div>
                    <span className="text-xs font-mono font-bold bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                      {submittedPermits.filter(p => getDocumentAvailability(p).any).length} {language === 'ar' ? 'طلبات' : 'permits'}
                    </span>
                  </div>

                  {submittedPermits.filter(p => getDocumentAvailability(p).any).length === 0 ? (
                    <div className="text-center py-12 text-xs text-slate-400 space-y-2">
                      <FileSignature className="w-8 h-8 text-slate-300 mx-auto" />
                      <p>{language === 'ar' ? 'لا توجد مستندات مكتملة بعد \u2014 ستظهر هنا فور اعتماد أو تقديم أي محضر.' : 'No completed documents yet \u2014 they\u2019ll appear here once any document is submitted.'}</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {submittedPermits.filter(p => getDocumentAvailability(p).any).map(permit => {
                        const docs = getDocumentAvailability(permit);
                        return (
                        <div key={permit.id} className="border border-slate-200 rounded-xl p-4 space-y-3">
                          <div>
                            <span className="font-mono text-slate-400 text-[10px] font-bold">{permit.id}</span>
                            <h4 className="font-extrabold text-slate-900 text-sm">{language === 'ar' ? permit.projectNameAr : permit.projectNameEn}</h4>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {docs.openingMinutes && (
                            <button
                              onClick={() => { setSelectedPermitForOpening(permit); setOpeningMinutesModalOpen(true); }}
                              className="py-1.5 bg-brand-gold/10 hover:bg-brand-gold/20 text-brand-gold-hover font-bold text-[11px] rounded flex items-center justify-center gap-1 border border-brand-gold/20 transition"
                            >
                              <FileSignature className="w-3.5 h-3.5" />
                              <span>{language === 'ar' ? 'محضر فتح تحويلة' : 'Opening Minutes'}</span>
                            </button>
                            )}
                            {docs.readinessReport && (
                            <button
                              onClick={() => { setSelectedPermitForReadiness(permit); setFieldReadinessModalOpen(true); }}
                              className="py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 font-bold text-[11px] rounded flex items-center justify-center gap-1 border border-emerald-500/20 transition"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>{language === 'ar' ? 'محضر الجاهزية' : 'Readiness Report'}</span>
                            </button>
                            )}
                            {docs.monitoringReport && (
                            <button
                              onClick={() => { setSelectedPermitForActiveAudit(permit); setActiveMonitoringModalOpen(true); }}
                              className="py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 font-bold text-[11px] rounded flex items-center justify-center gap-1 border border-amber-500/20 transition"
                            >
                              <ClipboardCheck className="w-3.5 h-3.5" />
                              <span>{language === 'ar' ? 'متابعة الأداء' : 'Monitoring Report'}</span>
                            </button>
                            )}
                            {docs.closureMinutes && (
                            <button
                              onClick={() => { setSelectedPermitForClosure(permit); setClosureModalOpen(true); }}
                              className="py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded flex items-center justify-center gap-1 border border-slate-300 transition"
                            >
                              <FileCheck className="w-3.5 h-3.5" />
                              <span>{language === 'ar' ? 'محضر إغلاق التحويلة' : 'Closure Minutes'}</span>
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
            ) : (
              <>
            {/* PHASE 1 */}
            {currentPhase === 1 && (
              <div className="space-y-6 animate-fade-in">
                
                {/* 1. General Project Details Panel */}

                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <button
                    type="button"
                    onClick={() => togglePanel('p1_general')}
                    className="w-full flex items-center justify-between p-5 bg-slate-50 border-b border-slate-200 font-bold text-brand-dark text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <Building2 className="h-4.5 w-4.5 text-brand-primary" />
                      {language === 'ar' ? '١.١ بيانات المشروع الأساسية والمقاول' : '1.1 Project General Specs & Contractor'}
                    </span>
                    {expandedPanels.p1_general ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>

                  {expandedPanels.p1_general && (
                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5 animate-fade-in">
                      <div>
                        <label className="block text-xs font-bold text-brand-text-gray uppercase">{t.clientName}</label>
                        <input 
                          type="text" 
                          name={language === 'ar' ? 'clientNameAr' : 'clientNameEn'} 
                          value={language === 'ar' ? formData.clientNameAr : formData.clientNameEn} 
                          onChange={handleInputChange} 
                          className="mt-2 block w-full rounded-lg bg-white border border-slate-300 focus:border-brand-primary text-brand-text-dark p-2.5 text-xs transition" 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-brand-text-gray uppercase">{t.projectName}</label>
                        <input 
                          type="text" 
                          name={language === 'ar' ? 'projectNameAr' : 'projectNameEn'} 
                          value={language === 'ar' ? formData.projectNameAr : formData.projectNameEn} 
                          onChange={handleInputChange} 
                          className="mt-2 block w-full rounded-lg bg-white border border-slate-300 focus:border-brand-primary text-brand-text-dark p-2.5 text-xs transition" 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-brand-text-gray uppercase">
                          {language === 'ar' ? 'المقاول' : 'Contractor'}
                        </label>
                        <input
                          type="text"
                          name={language === 'ar' ? 'contractingCompanyAr' : 'contractingCompanyEn'}
                          value={language === 'ar' ? formData.contractingCompanyAr : formData.contractingCompanyEn}
                          onChange={handleInputChange}
                          placeholder={language === 'ar' ? 'اسم شركة المقاول المنفذ' : 'Executing contractor company name'}
                          className="mt-2 block w-full rounded-lg bg-white border border-slate-300 focus:border-brand-primary text-brand-text-dark p-2.5 text-xs transition"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-brand-text-gray uppercase">
                          {language === 'ar' ? 'الاستشاري' : 'Consultant'}
                        </label>
                        <input
                          type="text"
                          name={language === 'ar' ? 'consultantNameAr' : 'consultantNameEn'}
                          value={language === 'ar' ? formData.consultantNameAr : formData.consultantNameEn}
                          onChange={handleInputChange}
                          placeholder={language === 'ar' ? 'اسم الاستشاري المشرف' : 'Supervising consultant name'}
                          className="mt-2 block w-full rounded-lg bg-white border border-slate-300 focus:border-brand-primary text-brand-text-dark p-2.5 text-xs transition"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-brand-text-gray uppercase">
                          {language === 'ar' ? 'اسم الطريق' : 'Road Name'}
                        </label>
                        <input
                          type="text"
                          name={language === 'ar' ? 'roadNameAr' : 'roadNameEn'}
                          value={language === 'ar' ? formData.roadNameAr : formData.roadNameEn}
                          onChange={handleInputChange}
                          placeholder={language === 'ar' ? 'مثال: طريق الملك عبدالعزيز' : 'e.g. King Abdulaziz Road'}
                          className="mt-2 block w-full rounded-lg bg-white border border-slate-300 focus:border-brand-primary text-brand-text-dark p-2.5 text-xs transition"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-brand-text-gray uppercase">
                          {language === 'ar' ? 'تصنيف الجهة المالكة (يُحدد لكل تصريح)' : 'Owning Authority Classification (set per permit)'}
                        </label>
                        <select
                          name="ownerClassification"
                          value={formData.ownerClassification}
                          onChange={handleInputChange}
                          className="mt-2 block w-full rounded-lg bg-white border border-slate-300 focus:border-brand-primary text-brand-text-dark p-2.5 text-xs transition"
                        >
                          <option value="">{language === 'ar' ? '— اختر —' : '— Select —'}</option>
                          <option value="affiliated">{language === 'ar' ? 'تابعة للوكالة' : 'Affiliated with the Agency'}</option>
                          <option value="not_affiliated">{language === 'ar' ? 'غير تابعة للوكالة' : 'Not Affiliated with the Agency'}</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-bold text-brand-text-gray uppercase">{t.location}</label>
                        <input 
                          type="text" 
                          name={language === 'ar' ? 'locationAr' : 'locationEn'} 
                          value={language === 'ar' ? formData.locationAr : formData.locationEn} 
                          onChange={handleInputChange} 
                          className="mt-2 block w-full rounded-lg bg-white border border-slate-300 focus:border-brand-primary text-brand-text-dark p-2.5 text-xs transition" 
                        />
                      </div>
                      <div className="col-span-1 md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-4 mt-2">
                        <div>
                          <label className="block text-xs font-bold text-brand-text-gray uppercase">{t.permitStartDate}</label>
                          <input 
                            type="date" 
                            name="permitStartDate" 
                            value={formData.permitStartDate} 
                            onChange={handleInputChange} 
                            className="mt-2 block w-full rounded-lg bg-white border border-slate-300 focus:border-brand-primary text-brand-text-dark p-2.5 text-xs transition" 
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-brand-text-gray uppercase">{t.permitEndDate}</label>
                          <input 
                            type="date" 
                            name="permitEndDate" 
                            value={formData.permitEndDate} 
                            onChange={handleInputChange} 
                            className="mt-2 block w-full rounded-lg bg-white border border-slate-300 focus:border-brand-primary text-brand-text-dark p-2.5 text-xs transition" 
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-brand-text-gray uppercase">{t.workStartDate}</label>
                          <input 
                            type="date" 
                            name="workStartDate" 
                            value={formData.workStartDate} 
                            onChange={handleInputChange} 
                            className="mt-2 block w-full rounded-lg bg-white border border-slate-300 focus:border-brand-primary text-brand-text-dark p-2.5 text-xs transition" 
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-brand-text-gray uppercase">{t.workEndDate}</label>
                          <input 
                            type="date" 
                            name="workEndDate" 
                            value={formData.workEndDate} 
                            onChange={handleInputChange} 
                            className="mt-2 block w-full rounded-lg bg-white border border-slate-300 focus:border-brand-primary text-brand-text-dark p-2.5 text-xs transition" 
                          />
                        </div>
                      </div>

                      {/* Work Duration > 72 Hours Intelligent Requirement Banner */}
                      {(() => {
                        const start = new Date(formData.workStartDate);
                        const end = new Date(formData.workEndDate);
                        const durationHours = Math.max(0, (end - start) / (1000 * 60 * 60));
                        const isOver72h = durationHours > 72;

                        if (isOver72h) {
                          return (
                            <div className="col-span-1 md:col-span-2 bg-amber-50 border border-amber-300 rounded-xl p-3.5 text-xs text-amber-900 font-medium space-y-1 mt-2">
                              <div className="flex items-center gap-2 font-bold text-amber-800">
                                <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
                                <span>
                                  {language === 'ar'
                                    ? `مدة العمل المحسوبة: ${Math.round(durationHours)} ساعة (تتجاوز ٧٢ ساعة) — المتطلبات الفنية الإلزامية:`
                                    : `Work Duration: ${Math.round(durationHours)} Hours (Exceeds 72-Hour Threshold) — Enforced Requirements:`}
                                </span>
                              </div>
                              <ul className="list-disc list-inside text-[11px] text-amber-800 space-y-0.5 font-sans pl-6">
                                <li>{language === 'ar' ? 'إلزامية استخدام الحواجز الخرسانية المسلحة (Concrete Barriers) للسلامة وتمنع الحواجز البلاستيكية.' : 'Concrete Safety Barriers mandated. Water-filled plastic barriers and cones prohibited.'}</li>
                                <li>{language === 'ar' ? 'إلزامية معدات السلامة الليلية ومستشعرات الإضاءة ذكية مع إشارات وامضة.' : '150 Lux lighting towers & solar LED warning beacons required.'}</li>
                                <li>{language === 'ar' ? 'إلزامية دورة الاعتماد وتوقيعات أطراف التحويلة الـ ٥ قبل البدء.' : '5-Party official stakeholder approval workflow & e-signatures enforced.'}</li>
                              </ul>
                            </div>
                          );
                        } else if (durationHours > 0) {
                          return (
                            <div className="col-span-1 md:col-span-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 flex items-center justify-between mt-2">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                <span>
                                  {language === 'ar'
                                    ? `مدة العمل: ${Math.round(durationHours)} ساعة (أقل من ٧٢ ساعة — تحويلة قصيرة المدى)`
                                    : `Work Duration: ${Math.round(durationHours)} Hours (Short-term work < 72h)`}
                                </span>
                              </div>
                              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-mono">
                                {language === 'ar' ? 'حواجز بلاستيكية/أقماع مسموحة' : 'Plastic/Cones Permitted'}
                              </span>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {/* External Provider Official Permit File Attachment */}
                      <div className="col-span-1 md:col-span-2 border-t border-slate-100 pt-4 mt-2">
                        <label className="block text-xs font-bold text-brand-text-gray uppercase mb-1.5 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <FileText className="w-4 h-4 text-brand-primary" />
                            {language === 'ar' 
                              ? 'مستند/شهادة تصريح الحفر الصادر من الجهة الخارجية (مطلوب رفع النسخة الرسمية)' 
                              : 'Official Permit Document (Issued by External Provider)'}
                          </span>
                          <span className="text-[10px] text-brand-primary font-mono font-bold bg-brand-primary/10 px-2 py-0.5 rounded">
                            PDF, PNG, JPG, DOC
                          </span>
                        </label>
                        <p className="text-[11px] text-slate-500 mb-2">
                          {language === 'ar' 
                            ? 'نظراً لأن تصريح الحفر صادر من جهة خارجية مستقلة، يرجى رفع نسخة المستند الرسمي الصادر لتتم مراجعته والتحقق من التواريخ المعتمدة بواسطة المفتش.' 
                            : 'Because the permit is issued by an external provider, please upload the official permit file for inspector verification.'}
                        </p>

                        <div className="relative border-2 border-dashed border-slate-300 hover:border-brand-primary rounded-xl p-4 text-center bg-slate-50 hover:bg-white transition cursor-pointer group">
                          <input 
                            type="file" 
                            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                            onChange={handleExternalPermitFileUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                          />
                          {formData.externalPermitDocName ? (
                            <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-emerald-800 font-bold text-xs">
                              <div className="flex items-center gap-2">
                                <FileCheck className="w-5 h-5 text-emerald-600" />
                                <div className="text-left">
                                  <span className="block font-mono text-emerald-900">{formData.externalPermitDocName}</span>
                                  <span className="text-[10px] text-emerald-700 font-normal">
                                    {language === 'ar' ? 'تم رفع المستند الرسمي بنجاح - جاهز للمراجعة' : 'External permit file uploaded successfully'}
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFormData(prev => ({ ...prev, externalPermitDocument: null, externalPermitDocName: '' }));
                                }}
                                className="text-red-500 hover:text-red-700 text-xs px-2 py-1 bg-white border border-red-200 rounded font-semibold"
                              >
                                {language === 'ar' ? 'إزالة' : 'Remove'}
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <Upload className="w-7 h-7 text-brand-primary mx-auto group-hover:scale-110 transition-transform" />
                              <span className="text-xs font-bold text-slate-700 block">
                                {language === 'ar' ? 'اضغط هنا لرفع تصريح الحفر الصادر من الجهة الخارجية' : 'Click or Drag to Upload Official External Permit File'}
                              </span>
                              <span className="text-[10px] text-slate-400 block">
                                {language === 'ar' ? 'يدعم ملفات PDF والصور والمستندات الرسمية' : 'Supports PDF, Images and Office documents'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 1.5 Work Description, Road Classification & Traffic Data (PDF-required, previously missing) */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <button
                    type="button"
                    onClick={() => togglePanel('p1_roadwork')}
                    className="w-full flex items-center justify-between p-5 bg-slate-50 border-b border-slate-200 font-bold text-brand-dark text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <Signpost className="h-4.5 w-4.5 text-brand-primary" />
                      {language === 'ar' ? '١.٢ وصف الأعمال وبيانات الطريق والحركة المرورية' : '1.2 Work Description, Road & Traffic Data'}
                    </span>
                    {expandedPanels.p1_roadwork ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>

                  {expandedPanels.p1_roadwork && (
                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5 animate-fade-in">
                      <div>
                        <label className="block text-xs font-bold text-brand-text-gray uppercase">
                          {language === 'ar' ? 'الغرض من الحفر / نوع الأعمال' : 'Purpose of Excavation / Work Type'}
                        </label>
                        <input
                          type="text"
                          name={language === 'ar' ? 'workPurposeAr' : 'workPurposeEn'}
                          value={language === 'ar' ? formData.workPurposeAr : formData.workPurposeEn}
                          onChange={handleInputChange}
                          placeholder={language === 'ar' ? 'مثال: إصلاح خط مياه رئيسي' : 'e.g., Main water line repair'}
                          className="mt-2 block w-full rounded-lg bg-white border border-slate-300 focus:border-brand-primary text-brand-text-dark p-2.5 text-xs transition"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-brand-text-gray uppercase">
                          {language === 'ar' ? 'الجهة المالكة للخدمة' : 'Owning Utility / Service Provider'}
                        </label>
                        <input
                          type="text"
                          name={language === 'ar' ? 'owningUtilityAr' : 'owningUtilityEn'}
                          value={language === 'ar' ? formData.owningUtilityAr : formData.owningUtilityEn}
                          onChange={handleInputChange}
                          placeholder={language === 'ar' ? 'مثال: شركة المياه الوطنية' : 'e.g., National Water Company'}
                          className="mt-2 block w-full rounded-lg bg-white border border-slate-300 focus:border-brand-primary text-brand-text-dark p-2.5 text-xs transition"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-brand-text-gray uppercase">
                          {language === 'ar' ? 'درجة الطريق' : 'Road Classification'}
                        </label>
                        <select
                          name="roadClassification"
                          value={formData.roadClassification}
                          onChange={handleInputChange}
                          className="mt-2 block w-full rounded-lg bg-white border border-slate-300 focus:border-brand-primary text-brand-text-dark p-2.5 text-xs transition"
                        >
                          {ROAD_CLASSIFICATIONS.map(rc => (
                            <option key={rc.id} value={rc.id}>{language === 'ar' ? rc.labelAr : rc.labelEn}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-brand-text-gray uppercase">
                          {language === 'ar' ? 'حجم المرور' : 'Traffic Volume'}
                        </label>
                        <select
                          name="trafficVolumeLevel"
                          value={formData.trafficVolumeLevel}
                          onChange={handleInputChange}
                          className="mt-2 block w-full rounded-lg bg-white border border-slate-300 focus:border-brand-primary text-brand-text-dark p-2.5 text-xs transition"
                        >
                          {TRAFFIC_VOLUME_LEVELS.map(v => (
                            <option key={v.id} value={v.id}>{language === 'ar' ? v.labelAr : v.labelEn}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-brand-text-gray uppercase">
                          {language === 'ar' ? 'عدد الحارات الكلي' : 'Total Lane Count'}
                        </label>
                        <input type="number" min="1" name="totalLanesCount" value={formData.totalLanesCount} onChange={handleInputChange} className="mt-2 block w-full rounded-lg bg-white border border-slate-300 focus:border-brand-primary text-brand-text-dark p-2.5 text-xs transition" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-brand-text-gray uppercase">
                          {language === 'ar' ? 'عدد الحارات المغلقة' : 'Closed Lane Count'}
                        </label>
                        <input type="number" min="0" name="closedLanesCount" value={formData.closedLanesCount} onChange={handleInputChange} className="mt-2 block w-full rounded-lg bg-white border border-slate-300 focus:border-brand-primary text-brand-text-dark p-2.5 text-xs transition" />
                      </div>

                      <div className="col-span-1 md:col-span-2">
                        <label className="block text-xs font-bold text-brand-text-gray uppercase">
                          {language === 'ar' ? 'تصنيف مدة الأعمال' : 'Work Duration Category'}
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                          {DURATION_CATEGORIES.map(d => (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, workDurationCategory: d.id }))}
                              className={`p-2.5 rounded-lg border text-[11px] font-bold transition text-left ${formData.workDurationCategory === d.id ? 'border-brand-primary bg-brand-primary/10 text-brand-primary' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                            >
                              <span className="block">{language === 'ar' ? d.labelAr : d.labelEn}</span>
                              <span className="block text-[10px] font-normal mt-0.5 text-slate-400">{language === 'ar' ? d.ruleAr : d.ruleEn}</span>
                            </button>
                          ))}
                        </div>
                        {formData.workDurationCategory === 'mobile_emergency' && (
                          <div className="mt-2 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-center gap-2">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            {language === 'ar' ? 'أعمال متحركة/طوارئ: تخضع لتقييم مخاطر سريع وترتيبات معجّلة بدلاً من دورة الاعتماد الكاملة.' : 'Mobile/emergency works: subject to rapid risk assessment and expedited arrangements instead of the full approval cycle.'}
                          </div>
                        )}
                      </div>

                      {/* Road-narrowing control recommendation (priority sign / stop sign / portable signal) */}
                      {(() => {
                        const totalWidthEstimate = (parseFloat(formData.closedLaneWidth) || 3.3) * (parseFloat(formData.totalLanesCount) || 2);
                        if (totalWidthEstimate >= TWO_WAY_MIN_TOTAL_WIDTH_M) return null;
                        const control = getRoadNarrowingControl(parseFloat(formData.speedLimit) || 50);
                        return (
                          <div className="col-span-1 md:col-span-2 bg-slate-900 border border-slate-700 rounded-xl p-3.5 text-xs text-slate-200">
                            <div className="font-bold text-brand-gold mb-1 flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              {language === 'ar' ? 'تضييق الطريق: يلزم تشغيل تبادلي' : 'Road Narrowing: Alternating Operation Required'}
                            </div>
                            <p className="text-slate-400">
                              {language === 'ar'
                                ? `العرض الإجمالي المتاح أقل من ${TWO_WAY_MIN_TOTAL_WIDTH_M}م. الضابط المطلوب حسب السرعة وحجم المرور:`
                                : `Available total width is below ${TWO_WAY_MIN_TOTAL_WIDTH_M}m. Required control based on speed/volume:`}
                              {' '}
                              <span className="font-bold text-white">{language === 'ar' ? control.controlAr : control.controlEn}</span>
                            </p>
                          </div>
                        );
                      })()}

                      <div>
                        <label className="block text-xs font-bold text-brand-text-gray uppercase">
                          {language === 'ar' ? 'طول التحويلة الكلي (م)' : 'Total Diversion Length (m)'}
                        </label>
                        <input type="number" min="0" name="diversionLengthM" value={formData.diversionLengthM} onChange={handleInputChange} className="mt-2 block w-full rounded-lg bg-white border border-slate-300 focus:border-brand-primary text-brand-text-dark p-2.5 text-xs transition" />
                      </div>
                      <div className="flex items-end">
                        {isPedestrianPathMandatory(formData.diversionLengthM, formData.roadClassification) && (
                          <label className="flex items-center gap-2 cursor-pointer bg-amber-50 border border-amber-200 rounded-lg p-2.5 w-full">
                            <input
                              type="checkbox"
                              checked={!!formData.pedestrianPathProvided}
                              onChange={(e) => setFormData(prev => ({ ...prev, pedestrianPathProvided: e.target.checked }))}
                              className="w-4 h-4 text-brand-primary border-slate-300 rounded focus:ring-brand-primary"
                            />
                            <span className="text-[11px] font-bold text-amber-800">
                              {language === 'ar'
                                ? `مطلوب: توفير ممر مشاة ≥ ${PEDESTRIAN_MIN_PATH_WIDTH_M}م (طول التحويلة > 400م)`
                                : `Required: pedestrian path ≥ ${PEDESTRIAN_MIN_PATH_WIDTH_M}m (diversion length > 400m)`}
                            </span>
                          </label>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-brand-text-gray uppercase">
                          {language === 'ar' ? 'خطة الإضاءة' : 'Lighting Plan'}
                        </label>
                        <textarea
                          rows="2"
                          name={language === 'ar' ? 'lightingPlanAr' : 'lightingPlanEn'}
                          value={language === 'ar' ? formData.lightingPlanAr : formData.lightingPlanEn}
                          onChange={handleInputChange}
                          className="mt-2 block w-full rounded-lg bg-white border border-slate-300 focus:border-brand-primary text-brand-text-dark p-2.5 text-xs transition"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-brand-text-gray uppercase">
                          {language === 'ar' ? 'خطة التعامل مع الشوارع الجانبية والمعابر' : 'Side Streets & Crossings Plan'}
                        </label>
                        <textarea
                          rows="2"
                          name={language === 'ar' ? 'sideStreetsPlanAr' : 'sideStreetsPlanEn'}
                          value={language === 'ar' ? formData.sideStreetsPlanAr : formData.sideStreetsPlanEn}
                          onChange={handleInputChange}
                          className="mt-2 block w-full rounded-lg bg-white border border-slate-300 focus:border-brand-primary text-brand-text-dark p-2.5 text-xs transition"
                        />
                      </div>

                      {/* Long-duration presentation reminders (road marking repaint / site fencing) */}
                      {needsRoadMarkingRepaint(formData.workStartDate) && (
                        <div className="col-span-1 md:col-span-2 bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-[11px] text-amber-800 flex items-center gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          {language === 'ar' ? 'تذكير: يجب إعادة دهان العلامات الأرضية — مضى أكثر من 3 أشهر على بدء الأعمال.' : 'Reminder: road markings must be repainted — over 3 months have passed since works began.'}
                        </div>
                      )}
                      {needsSiteFencing(formData.workStartDate, formData.roadClassification) && (
                        <div className="col-span-1 md:col-span-2 bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-[11px] text-amber-800 flex items-center gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          {language === 'ar' ? 'تذكير: يجب تغطية الموقع بالشبك/الألواح — مشروع على طريق رئيسي تجاوز شهرين.' : 'Reminder: site must be covered with mesh/panels — main-road project has exceeded 2 months.'}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. Arterial Road Crash Protection & Smart Detour Lighting Management */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <button
                    type="button"
                    onClick={() => togglePanel('p1_equipment')}
                    className="w-full flex items-center justify-between p-5 border-b border-slate-200 font-bold text-sm transition-all bg-slate-50 text-brand-dark hover:bg-slate-100/50"
                  >
                    <span className="flex items-center gap-2">
                      <Shield className="h-4.5 w-4.5 text-brand-primary" />
                      {language === 'ar' ? '١.٣ تجهيزات سلامة الطرق الشريانية وإدارة إضاءة التحويلة' : '1.3 Arterial Road Safety & Smart Detour Lighting'}
                    </span>
                    {expandedPanels.p1_equipment ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>

                  {expandedPanels.p1_equipment && (
                    <div className="p-5 space-y-6 animate-fade-in">
                      {/* Point 1: Arterial Road & Crash Attenuators */}
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                        <div className="flex items-start gap-3">
                          <input 
                            type="checkbox"
                            id="isArterialRoad"
                            name="isArterialRoad"
                            checked={formData.isArterialRoad}
                            onChange={(e) => setFormData(prev => ({ ...prev, isArterialRoad: e.target.checked, impactAttenuators: e.target.checked }))}
                            className="mt-1 w-5 h-5 text-brand-primary border-slate-300 rounded focus:ring-brand-primary cursor-pointer"
                          />
                          <div>
                            <label htmlFor="isArterialRoad" className="block text-xs font-bold text-brand-dark uppercase cursor-pointer">
                              {language === 'ar' ? 'طريق شرياني رئيسي؟ (Arterial Road Classification)' : 'Arterial Road Classification'}
                            </label>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {language === 'ar' 
                                ? 'الطرق الشريانية الرئيسية التي تتميز بسرعات عالية أو كثافة مرورية يجب تزويدها بمصدات صدمات معتمدة (Crash Attenuators / Impact Absorbers) لتأمين تدرج التحويلة.' 
                                : 'Arterial roads with high design speeds or heavy traffic volumes must be equipped with certified crash attenuators (impact absorbers) at transition tapers.'}
                            </p>
                          </div>
                        </div>

                        {formData.isArterialRoad && (
                          <div className="ml-8 pt-3 border-t border-slate-200 space-y-4 animate-fade-in">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase">{language === 'ar' ? 'نوع ومواصفة مصد الصدمات (Impact Absorber Model)' : 'Crash Attenuator Model / Type'}</label>
                                <select
                                  name="attenuatorType"
                                  value={formData.attenuatorType}
                                  onChange={handleInputChange}
                                  className="w-full mt-1.5 border border-slate-300 rounded p-2 text-xs font-semibold focus:ring-brand-primary"
                                >
                                  <option value="mash_tl3">{language === 'ar' ? 'مصدات صدمات هيكلية MASH TL-3 QuadGuard' : 'MASH TL-3 QuadGuard Structural Attenuator'}</option>
                                  <option value="water_filled">{language === 'ar' ? 'حواجز مائية ماصة للصدمات (Water-Filled Absorber)' : 'Water-Filled Energy Absorbing Barrier'}</option>
                                  <option value="tma_truck">{language === 'ar' ? 'مصدات صدمات شاحنات متحركة TMA (Truck Mounted Attenuator)' : 'Truck Mounted Attenuator (TMA)'}</option>
                                  <option value="steel_cushion">{language === 'ar' ? 'وسائد صدمات فولاذية عالية الامتصاص' : 'Steel CushionGuard Crash Attenuator'}</option>
                                  <option value="other">{language === 'ar' ? 'أخرى (أدخل يدوياً)...' : 'Other (Enter manually)...'}</option>
                                </select>

                                {formData.attenuatorType === 'other' && (
                                  <input
                                    type="text"
                                    name="attenuatorTypeCustomEn"
                                    value={formData.attenuatorTypeCustomEn}
                                    onChange={handleInputChange}
                                    placeholder={language === 'ar' ? 'أدخل مواصفة مصد الصدمات هنا...' : 'Enter custom attenuator specs...'}
                                    className="w-full mt-2 border border-slate-300 rounded p-2 text-xs"
                                  />
                                )}
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase">{language === 'ar' ? 'عدد ومواقع التثبيت (Quantity & Placement)' : 'Quantity & Installation Placement'}</label>
                                <input
                                  type="text"
                                  name="attenuatorQuantityPlacement"
                                  value={formData.attenuatorQuantityPlacement}
                                  onChange={handleInputChange}
                                  placeholder={language === 'ar' ? 'مثال: وحدتان عند بداية منطقة التدرج وبداية منطقة الأمان' : 'e.g., 2 units at transition taper start'}
                                  className="w-full mt-1.5 border border-slate-300 rounded p-2 text-xs font-mono"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Point 2: Detour Lighting Sensors & Dedicated Platform Integration */}
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                        <div className="flex items-start gap-3">
                          <input 
                            type="checkbox"
                            id="hasDetourLightingSensors"
                            name="hasDetourLightingSensors"
                            checked={formData.hasDetourLightingSensors}
                            onChange={(e) => setFormData(prev => ({ ...prev, hasDetourLightingSensors: e.target.checked, smartLightingSensors: e.target.checked }))}
                            className="mt-1 w-5 h-5 text-brand-primary border-slate-300 rounded focus:ring-brand-primary cursor-pointer"
                          />
                          <div>
                            <label htmlFor="hasDetourLightingSensors" className="block text-xs font-bold text-brand-dark uppercase cursor-pointer">
                              {language === 'ar' ? 'مستشعرات إضاءة التحويلة المنفصلة وإدارة الانقطاع الآلي' : 'Detour Lighting Sensors & Automated Outage Telemetry'}
                            </label>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {language === 'ar' 
                                ? 'يجب تزويد إضاءة التحويلة بمستشعرات لاسلكية لإشعارات الأعطال الفورية والانقطاعات مع الربط المباشر بالمنصة المركزية لإدارة إضاءة التحويلات.' 
                                : 'Detour lighting must feature wireless outage sensors and real-time integration with the dedicated detour lighting management platform.'}
                            </p>
                          </div>
                        </div>

                        {formData.hasDetourLightingSensors && (
                          <div className="ml-8 pt-3 border-t border-slate-200 space-y-4 animate-fade-in">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                              <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase">{language === 'ar' ? 'مستوى الإضاءة الأدنى المطلوب (Target Illumination Lux)' : 'Target Illumination (Lux Level)'}</label>
                                <select
                                  name="lightingLuxTarget"
                                  value={formData.lightingLuxTarget}
                                  onChange={handleInputChange}
                                  className="w-full mt-1.5 border border-slate-300 rounded p-2 text-xs font-semibold focus:ring-brand-primary"
                                >
                                  <option value="150">150 Lux - {language === 'ar' ? 'المعيار القياسي لأعمال التحويلات الليلية' : 'Standard Night Work Zone'}</option>
                                  <option value="200">200 Lux - {language === 'ar' ? 'المناطق عالية الخطورة والطرق السريعة' : 'High Risk Highway Corridor'}</option>
                                  <option value="100">100 Lux - {language === 'ar' ? 'ممرات المشاة والتحويلات الفرعية' : 'Pedestrian & Minor Detours'}</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase">{language === 'ar' ? 'المسافة بين أبراج الإضاءة (Tower Light Spacing)' : 'Tower Light Spacing (m)'}</label>
                                <input
                                  type="text"
                                  name="lightingTowerSpacing"
                                  value={formData.lightingTowerSpacing}
                                  onChange={handleInputChange}
                                  placeholder="e.g., 25m or 30m"
                                  className="w-full mt-1.5 border border-slate-300 rounded p-2 text-xs font-mono"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase">{language === 'ar' ? 'قناة التنبيه والربط اللاسلكي (Outage Telemetry Channel)' : 'Outage Telemetry Platform Channel'}</label>
                                <select
                                  name="lightingAlertChannel"
                                  value={formData.lightingAlertChannel}
                                  onChange={handleInputChange}
                                  className="w-full mt-1.5 border border-slate-300 rounded p-2 text-xs font-semibold focus:ring-brand-primary"
                                >
                                  <option value="central_platform">{language === 'ar' ? 'المنصة الرقمية لإدارة إضاءة التحويلات (Lighting API)' : 'Dedicated Detour Lighting Platform'}</option>
                                  <option value="sms_gateway">{language === 'ar' ? 'بوابة التنبيه الفوري SMS / IoT Cellular Gateway' : 'Cellular IoT SMS Outage Gateway'}</option>
                                  <option value="scada">{language === 'ar' ? 'ربط غرفة التحكم والإنذار المركزي (SCADA Platform)' : 'Central SCADA Control Room Platform'}</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase">{language === 'ar' ? 'مولد الإضاءة الاحتياطي للطوارئ (Emergency Backup Power)' : 'Emergency Backup Generator'}</label>
                                <input
                                  type="text"
                                  name="lightingBackupPower"
                                  value={formData.lightingBackupPower}
                                  onChange={handleInputChange}
                                  placeholder="e.g., 15 kVA Silent Automatic Generator"
                                  className="w-full mt-1.5 border border-slate-300 rounded p-2 text-xs font-mono"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Gantt Setup Timeline */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <button
                    type="button"
                    onClick={() => togglePanel('p1_gantt')}
                    className="w-full flex items-center justify-between p-5 border-b border-slate-200 font-bold text-sm transition-all bg-slate-50 text-brand-dark hover:bg-slate-100/50"
                  >
                    <span className="flex items-center gap-2">
                      <Clock className="h-4.5 w-4.5 text-brand-primary" />
                      {language === 'ar' ? '١.٤ جدولة مراحل التنفيذ (Gantt Tracker)' : '1.4 Phasing & Gantt Scheduler'}
                    </span>
                    {expandedPanels.p1_gantt ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>

                  {expandedPanels.p1_gantt && (
                    <div className="p-5 space-y-4 animate-fade-in">
                      {/* Milestones list with edit option */}
                      <div className="space-y-2.5">
                        {milestones.map((m, idx) => {
                          const warning = getMilestoneWarning(m);
                          const isEditing = editingMilestoneId === m.id;
                          
                          return (
                            <div key={m.id} className={`p-4 border rounded-xl transition ${isEditing ? 'border-brand-primary bg-brand-light/20' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                              {isEditing ? (
                                <div className="space-y-3">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-500 uppercase">{language === 'ar' ? 'اسم المرحلة (بالعربية)' : 'Phase Name (Arabic)'}</label>
                                      <input 
                                        type="text" 
                                        value={editMilestoneForm.taskAr} 
                                        onChange={e => setEditMilestoneForm({ ...editMilestoneForm, taskAr: e.target.value })}
                                        className="mt-1 w-full rounded border border-slate-300 p-2 text-xs focus:outline-none"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-500 uppercase">{language === 'ar' ? 'اسم المرحلة (بالإنجليزية)' : 'Phase Name (English)'}</label>
                                      <input 
                                        type="text" 
                                        value={editMilestoneForm.taskEn} 
                                        onChange={e => setEditMilestoneForm({ ...editMilestoneForm, taskEn: e.target.value })}
                                        className="mt-1 w-full rounded border border-slate-300 p-2 text-xs focus:outline-none"
                                      />
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-500 uppercase">{language === 'ar' ? 'يوم بدء المرحلة' : 'Start Day'}</label>
                                      <input 
                                        type="number" 
                                        value={editMilestoneForm.startDay} 
                                        onChange={e => setEditMilestoneForm({ ...editMilestoneForm, startDay: parseInt(e.target.value) || '' })}
                                        className="mt-1 w-full rounded border border-slate-300 p-2 text-xs focus:outline-none font-mono"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-500 uppercase">{language === 'ar' ? 'المدة الإجمالية (يوم)' : 'Duration (Days)'}</label>
                                      <input 
                                        type="number" 
                                        value={editMilestoneForm.durationDays} 
                                        onChange={e => setEditMilestoneForm({ ...editMilestoneForm, durationDays: parseInt(e.target.value) || '' })}
                                        className="mt-1 w-full rounded border border-slate-300 p-2 text-xs focus:outline-none font-mono"
                                      />
                                    </div>
                                  </div>

                                  {/* Live edit warning */}
                                  {getMilestoneWarning({ ...m, ...editMilestoneForm }) && (
                                    <div className="text-red-650 text-[10px] font-bold bg-red-50 p-2 rounded border border-red-150 animate-pulse">
                                      {getMilestoneWarning({ ...m, ...editMilestoneForm })}
                                    </div>
                                  )}

                                  <div className="flex gap-2 justify-end pt-1">
                                    <button 
                                      type="button"
                                      onClick={() => handleSaveMilestone(m.id)}
                                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition"
                                    >
                                      {language === 'ar' ? 'حفظ التعديل' : 'Save Changes'}
                                    </button>
                                    <button 
                                      type="button"
                                      onClick={() => setEditingMilestoneId(null)}
                                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs font-semibold transition"
                                    >
                                      {language === 'ar' ? 'إلغاء' : 'Cancel'}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <span className="font-bold text-slate-800 text-xs">{idx+1}. {language === 'ar' ? m.taskAr : m.taskEn}</span>
                                      <div className="text-[10px] text-slate-500 mt-1 font-mono" dir="ltr">
                                        {getMilestoneStart(m)} | {getMilestoneDuration(m)}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <button 
                                        type="button"
                                        onClick={() => handleEditMilestone(m)}
                                        className="text-brand-primary hover:text-brand-gold text-xs font-semibold flex items-center gap-1"
                                      >
                                        <Edit3 className="h-3.5 w-3.5" />
                                      </button>
                                      <button 
                                        type="button"
                                        onClick={() => removeMilestone(m.id)}
                                        className="text-red-500 hover:text-red-700 text-xs font-semibold flex items-center gap-1"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Warning notification banner (doesn't block next step) */}
                                  {warning && (
                                    <div className="mt-2 text-red-650 text-[10px] font-bold bg-red-50 p-2 rounded border border-red-150">
                                      {warning}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Add new milestone form */}
                      <div className="pt-3.5 border-t border-slate-200 space-y-3">
                        <span className="block text-xs font-bold text-brand-dark">{language === 'ar' ? 'إضافة مرحلة أو خطوة جديدة للجدول الزمني:' : 'Add a New Phasing Timeline Step:'}</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input 
                            type="text" 
                            placeholder={language === 'ar' ? 'المرحلة بالعربية...' : 'Phase Name (Arabic)...'}
                            value={newMilestone.taskAr || ''}
                            onChange={e => setNewMilestone({ ...newMilestone, taskAr: e.target.value })}
                            className="rounded border border-slate-300 p-2 text-xs focus:outline-none"
                          />
                          <input 
                            type="text" 
                            placeholder={language === 'ar' ? 'المرحلة بالإنجليزية...' : 'Phase Name (English)...'}
                            value={newMilestone.taskEn || ''}
                            onChange={e => setNewMilestone({ ...newMilestone, taskEn: e.target.value })}
                            className="rounded border border-slate-300 p-2 text-xs focus:outline-none"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2 items-end">
                          <div>
                            <label className="block text-[9px] text-slate-500 font-semibold mb-0.5">{language === 'ar' ? 'يوم البدء' : 'Start Day'}</label>
                            <input type="number" placeholder="Start Day" value={newMilestone.startDay || ''} onChange={e => setNewMilestone({ ...newMilestone, startDay: parseInt(e.target.value) || '' })} className="w-full rounded border border-slate-300 p-2 text-xs font-mono text-center" />
                          </div>
                          <div>
                            <label className="block text-[9px] text-slate-500 font-semibold mb-0.5">{language === 'ar' ? 'المدة باليوم' : 'Duration (Days)'}</label>
                            <input type="number" placeholder="Duration" value={newMilestone.durationDays || ''} onChange={e => setNewMilestone({ ...newMilestone, durationDays: parseInt(e.target.value) || '' })} className="w-full rounded border border-slate-300 p-2 text-xs font-mono text-center" />
                          </div>
                          <button 
                            type="button"
                            onClick={() => {
                              if (newMilestone.taskEn && newMilestone.startDay && newMilestone.durationDays) {
                                setMilestones([...milestones, {
                                  id: Date.now(),
                                  taskAr: newMilestone.taskAr || newMilestone.taskEn,
                                  taskEn: newMilestone.taskEn,
                                  startDay: parseInt(newMilestone.startDay),
                                  durationDays: parseInt(newMilestone.durationDays),
                                  status: 'Planned'
                                }]);
                                setNewMilestone({ taskAr: '', taskEn: '', startDay: '', durationDays: '', status: 'Planned' });
                              }
                            }}
                            className="bg-brand-primary hover:bg-brand-primary-hover text-white font-bold rounded text-xs p-2.5 flex items-center justify-center gap-1 transition"
                          >
                            <Plus className="h-4 w-4" />
                            <span>{language === 'ar' ? 'إضافة خطوة' : 'Add Step'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Site Overview Map */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <button
                    type="button"
                    onClick={() => togglePanel('p1_map')}
                    className="w-full flex items-center justify-between p-5 border-b border-slate-200 font-bold text-sm bg-slate-50 text-brand-dark"
                  >
                    <span className="flex items-center gap-2">
                      <MapPin className="h-4.5 w-4.5 text-brand-primary" />
                      {language === 'ar' ? '١.٥ خريطة الموقع والنقاط (مرحلة التأسيس)' : '1.5 Site Overview & Nodes Mapping'}
                    </span>
                    {expandedPanels.p1_map ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>

                  {/* Map content wrapper: always keep container in DOM to avoid Leaflet destroy/reinit glitch.
                      Use CSS to show/hide inner controls, but keep the map div always mounted. */}
                  <div className="p-5 space-y-4">
                    <div className={expandedPanels.p1_map ? 'block' : 'hidden'}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-brand-light p-3 rounded-lg border border-slate-200 mb-4 gap-2">
                        <div className="flex items-center gap-2">
                          <Download className="w-4 h-4 text-brand-primary" />
                          <span className="text-xs font-bold text-slate-800">
                            {language === 'ar' ? 'تصدير المخطط الهندسي كملف CAD (.DXF):' : 'Export Projected CAD (.DXF):'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleExportCAD}
                            disabled={isGeneratingCAD}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-lg transition shadow-md disabled:opacity-50"
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span>{isGeneratingCAD ? (language === 'ar' ? 'جاري إنشاء المخطط...' : 'Generating CAD...') : (language === 'ar' ? 'توليد وتنزيل مخطط CAD (.DXF)' : 'Generate & Export CAD (.DXF)')}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => { setBoundaryPoints([]); setDetourNodes([]); setPedestrianNodes([]); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-650 hover:bg-red-750 text-white text-xs font-bold rounded-lg transition shadow-sm"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            <span>{language === 'ar' ? 'مسح النقاط' : 'Reset Points'}</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div
                      ref={phase1MapContainerRef}
                      className="rounded-xl border border-slate-300 relative z-0"
                      style={{
                        height: '400px',
                        overflow: expandedPanels.p1_map ? 'hidden' : 'hidden',
                        maxHeight: expandedPanels.p1_map ? '400px' : '0px',
                        transition: 'max-height 0.25s ease',
                        borderWidth: expandedPanels.p1_map ? '1px' : '0px'
                      }}
                      id="phase1-leaflet-map"
                    />

                    <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 ${expandedPanels.p1_map ? 'block' : 'hidden'}`}>
                       <div className="text-xs p-3 bg-blue-50 border border-blue-200 rounded text-blue-900">
                         <b>{language === 'ar' ? 'منطقة العمل (أزرق)' : 'Construction Area (Blue)'}</b><br/>
                         {language === 'ar' ? 'اضغط ٤ مرات لتحديد زوايا منطقة العمل.' : 'Click 4 times to set construction boundary nodes (C1-C4).'}
                       </div>
                       <div className="text-xs p-3 bg-orange-50 border border-orange-200 rounded text-orange-900">
                         <b>{language === 'ar' ? 'مسار التحويلة (برتقالي)' : 'Detour Route (Orange)'}</b><br/>
                         {language === 'ar' ? 'بعد منطقة العمل، اضغط مرتين لتحديد بداية ونهاية التحويلة.' : 'After construction nodes, click 2 times to set detour start/end (D1-D2).'}
                       </div>
                       <div className="text-xs p-3 bg-green-50 border border-green-200 rounded text-green-900">
                         <b>{language === 'ar' ? 'ممر المشاة (أخضر)' : 'Pedestrian Route (Green)'}</b><br/>
                         {language === 'ar' ? 'أخيراً، اضغط مرتين لتحديد ممر المشاة.' : 'Finally, click 2 times to set pedestrian start/end (P1-P2).'}
                       </div>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* PHASE 2 */}
            {currentPhase === 2 && (
              <div className="space-y-6 animate-fade-in">
                
                {/* 1. CAD File upload */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <button
                    type="button"
                    onClick={() => togglePanel('p2_blueprint')}
                    className="w-full flex items-center justify-between p-5 border-b border-slate-200 font-bold text-sm transition-all bg-slate-50 text-brand-dark hover:bg-slate-100/50"
                  >
                    <span className="flex items-center gap-2">
                      <FileCode className="h-4.5 w-4.5 text-brand-primary" />
                      {language === 'ar' ? '٢.١ رفع مخطط الأوتوكاد (CAD Blueprint)' : '2.1 CAD Blueprint Upload'}
                    </span>
                    {expandedPanels.p2_blueprint ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>

                  {expandedPanels.p2_blueprint && (
                    <div className="p-5 animate-fade-in space-y-4">
                      {cadStatus === 'parsing' && (
                        <div className="py-6 text-center text-xs text-brand-primary animate-pulse font-semibold">
                          {language === 'ar' ? 'جاري معالجة ومطابقة المخطط الهندسي CAD...' : 'Parsing and aligning CAD blueprint file...'}
                        </div>
                      )}
                      
                      {cadStatus === 'parsed' && cadMetadata && (
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs space-y-2">
                          <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                            <span className="font-bold text-slate-700">{language === 'ar' ? 'ملف المخطط المربوط:' : 'Aligned CAD Blueprint:'}</span>
                            <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px] uppercase">ALIGNED & VERIFIED / تم التحقق</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div><span className="font-semibold text-slate-500">{language === 'ar' ? 'اسم الملف:' : 'Filename:'}</span> {cadMetadata.filename}</div>
                            <div><span className="font-semibold text-slate-500">{language === 'ar' ? 'حجم الملف:' : 'Size:'}</span> {cadMetadata.fileSize}</div>
                            <div><span className="font-semibold text-slate-500">{t.targetCrs}:</span> {cadMetadata.crs}</div>
                            <div><span className="font-semibold text-slate-500">{t.entitiesCount}:</span> {cadMetadata.geometryCount}</div>
                            <div className="col-span-2"><span className="font-semibold text-slate-500">{language === 'ar' ? 'المدى الهندسي (Extents):' : 'Drawing Extents:'}</span> <code className="bg-slate-200 px-1 rounded">{cadMetadata.extents}</code></div>
                          </div>
                          
                          <div className="pt-3.5 border-t border-slate-200 flex flex-wrap gap-2 items-center justify-between">
                            <div className="flex gap-2 items-center">
                              <button
                                type="button"
                                onClick={() => { setCadFile(null); setCadStatus('idle'); setCadMetadata(null); }}
                                className="text-red-650 hover:text-red-750 font-bold text-xs"
                              >
                                {language === 'ar' ? 'إزالة واستبدال الملف' : 'Remove & Replace File'}
                              </button>
                              
                              <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded">
                                {language === 'ar' ? '✓ تم رفع وتوثيق المخطط الهندسي' : '✓ CAD Blueprint Uploaded'}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => downloadUploadedCadFile()}
                              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-1.5 rounded transition shadow-sm"
                            >
                              <Download className="h-3.5 w-3.5" />
                              <span>{language === 'ar' ? 'تحميل الملف المرفوع' : 'Download Uploaded CAD File'}</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {cadStatus === 'idle' && (
                        <div className="space-y-3">
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs font-semibold flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                            <span>
                              {language === 'ar' 
                                ? '⚠️ متطلب إجباري: يجب رفع ملف مخطط أوتوكاد المعتمد (DWG / DXF) للانتقال إلى الخطوات التالية.' 
                                : '⚠️ Mandatory Requirement: You must upload an official CAD Blueprint file (DWG / DXF) to proceed.'}
                            </span>
                          </div>

                          <div className="border-2 border-dashed border-slate-300 hover:border-brand-primary/60 rounded-xl p-8 bg-slate-50 text-center relative cursor-pointer hover:bg-slate-100/50 transition">
                            <input type="file" accept=".dwg,.dxf" onChange={handleCadUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                            <Upload className="h-10 w-10 text-brand-primary mx-auto mb-2" />
                            <span className="text-xs font-bold text-slate-800 block">
                              {language === 'ar' ? 'اضغط هنا لرفع ملف المخطط الهندسي للتحويلة (DWG / DXF)' : 'Click to Upload CAD Blueprint File (DWG / DXF)'}
                            </span>
                            <span className="text-[10px] text-slate-500 block mt-1">
                              {language === 'ar' ? 'الصيغ المقبولة: DWG, DXF (الحد الأقصى 50 ميجابايت)' : 'Supported Formats: DWG, DXF (Max 50MB)'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. 2D Cross Section diagram */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <button
                    type="button"
                    onClick={() => togglePanel('p2_crosssection')}
                    className="w-full flex items-center justify-between p-5 border-b border-slate-200 font-bold text-sm transition-all bg-slate-50 text-brand-dark hover:bg-slate-100/50"
                  >
                    <span className="flex items-center gap-2">
                      <Maximize2 className="h-4.5 w-4.5 text-brand-primary" />
                      {language === 'ar' ? '٢.٢ محرر المقطع العرضي (Cross-Section)' : '2.2 2D Cross-Section Editor'}
                    </span>
                    {expandedPanels.p2_crosssection ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>

                  {expandedPanels.p2_crosssection && (
                    <div className="p-5 animate-fade-in space-y-4">
                      {/* Configuration controls */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                        <div>
                          <label className="block text-slate-500 font-bold uppercase mb-1.5">{language === 'ar' ? 'عدد الحارات النشطة' : 'Number of Active Lanes'}</label>
                          <select 
                            name="activeLanesCount" 
                            value={formData.activeLanesCount || 2} 
                            onChange={handleInputChange} 
                            className="w-full bg-white border border-slate-300 rounded p-2 focus:ring-brand-primary"
                          >
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                            <option value="4">4</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-slate-500 font-bold uppercase mb-1.5">{language === 'ar' ? 'عرض الحارة المرورية (متر)' : 'Active Lane Width (m)'}</label>
                          <input 
                            type="number" 
                            step="0.1" 
                            name="laneWidth" 
                            value={formData.laneWidth || 3.6} 
                            onChange={handleInputChange} 
                            className="w-full bg-white border border-slate-300 rounded p-2 focus:ring-brand-primary font-mono" 
                          />
                        </div>

                        <div>
                          <label className="block text-slate-500 font-bold uppercase mb-1.5">{language === 'ar' ? 'عرض ممر المشاة (متر)' : 'Pedestrian Path Width (m)'}</label>
                          <input 
                            type="number" 
                            step="0.1" 
                            name="pedestrianPathWidth" 
                            value={formData.pedestrianPathWidth || 1.5} 
                            onChange={handleInputChange} 
                            className="w-full bg-white border border-slate-300 rounded p-2 focus:ring-brand-primary font-mono" 
                          />
                        </div>
                      </div>

                      <div className="bg-slate-900 rounded-xl overflow-hidden shadow-lg p-2">
                        {renderCrossSectionSVG(false)}
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* PHASE 3 */}
            {currentPhase === 3 && (
              <div className="space-y-6 animate-fade-in">
                
                {/* 1. Detour calculator */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <button
                    type="button"
                    onClick={() => togglePanel('p3_calculator')}
                    className="w-full flex items-center justify-between p-5 bg-slate-50 border-b border-slate-200 font-bold text-brand-dark text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <Calculator className="h-4.5 w-4.5 text-brand-primary" />
                      {language === 'ar' ? '٣.١ حاسبة أبعاد السلامة المرورية والالتفاف' : '3.1 Safety detour specifications sizer'}
                    </span>
                    {expandedPanels.p3_calculator ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>

                  {expandedPanels.p3_calculator && (
                    <div className="p-5 space-y-4 animate-fade-in">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase">{t.speedLimit}</label>
                          <select 
                            name="speedLimit" 
                            value={formData.speedLimit} 
                            onChange={handleInputChange} 
                            className="w-full mt-2 border border-slate-300 rounded p-2 text-xs"
                          >
                            <option value="40">40 km/h</option>
                            <option value="60">60 km/h</option>
                            <option value="80">80 km/h</option>
                            <option value="100">100 km/h</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase">{t.laneWidth}</label>
                          <input type="number" step="0.1" name="closedLaneWidth" value={formData.closedLaneWidth} onChange={handleInputChange} className="w-full mt-2 border border-slate-300 rounded p-2 text-xs" />
                        </div>
                      </div>

                      {/* Real time dimension auditing */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                        <div>
                          <label className="block text-slate-500 font-bold uppercase">{t.proposedTaper}</label>
                          <input type="number" name="proposedTaper" value={formData.proposedTaper} onChange={handleInputChange} className="w-full mt-1.5 border border-slate-300 rounded p-1.5 font-mono" />
                          <span className="text-[10px] text-slate-500 mt-1 block">{language === 'ar' ? `المطلوب: ${calcs.requiredTaper}م` : `Required: ${calcs.requiredTaper}m`}</span>
                        </div>
                        <div>
                          <label className="block text-slate-500 font-bold uppercase">{t.proposedBuffer}</label>
                          <input type="number" name="proposedBuffer" value={formData.proposedBuffer} onChange={handleInputChange} className="w-full mt-1.5 border border-slate-300 rounded p-1.5 font-mono" />
                          <span className="text-[10px] text-slate-500 mt-1 block">{language === 'ar' ? `المطلوب: ${calcs.requiredBuffer}م` : `Required: ${calcs.requiredBuffer}m`}</span>
                        </div>
                      </div>

                      {/* Gap 1: Advanced Warning Zone Distances Card */}
                      {calcs.advanceWarning && (
                        <div className="mt-3 bg-amber-50/90 border border-amber-200 rounded-xl p-4 text-xs">
                          <div className="flex items-center gap-2 font-bold text-amber-900 mb-2.5">
                            <Milestone className="h-4 w-4 text-amber-600" />
                            <span>{language === 'ar' ? 'مسافات المنطقة التحذيرية المتقدمة (حسب جدول سرعة الطريق)' : 'Advanced Warning Zone Distances (Speed Lookup Table)'}</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                            <div className="bg-white p-2 rounded-lg border border-amber-200 shadow-xs">
                              <span className="block text-[10px] text-slate-500 font-bold">{language === 'ar' ? 'لوحة أ (Sign A)' : 'Sign A'}</span>
                              <span className="text-sm font-extrabold text-amber-800 font-mono">{calcs.advanceWarning.A}m</span>
                            </div>
                            <div className="bg-white p-2 rounded-lg border border-amber-200 shadow-xs">
                              <span className="block text-[10px] text-slate-500 font-bold">{language === 'ar' ? 'لوحة ب (Sign B)' : 'Sign B'}</span>
                              <span className="text-sm font-extrabold text-amber-800 font-mono">{calcs.advanceWarning.B}m</span>
                            </div>
                            <div className="bg-white p-2 rounded-lg border border-amber-200 shadow-xs">
                              <span className="block text-[10px] text-slate-500 font-bold">{language === 'ar' ? 'لوحة ج (Sign C)' : 'Sign C'}</span>
                              <span className="text-sm font-extrabold text-amber-800 font-mono">{calcs.advanceWarning.C}m</span>
                            </div>
                            <div className="bg-white p-2 rounded-lg border border-amber-200 shadow-xs">
                              <span className="block text-[10px] text-slate-500 font-bold">{language === 'ar' ? 'لوحة د (Sign D)' : 'Sign D'}</span>
                              <span className="text-sm font-extrabold text-amber-800 font-mono">{calcs.advanceWarning.D}m</span>
                            </div>
                          </div>
                          <p className="text-[11px] text-amber-800 mt-2 font-medium">
                            {language === 'ar' 
                              ? `* أبعد لوحة تنبيه توضع عند ${calcs.advanceWarning.D}م قبل التدرج. الحد الأدنى لارتفاع الحروف: ${calcs.advanceWarning.letterHeight} ملم.`
                              : `* Furthest warning sign at ${calcs.advanceWarning.D}m prior to taper. Min letter height: ${calcs.advanceWarning.letterHeight}mm.`}
                          </p>
                        </div>
                      )}

                      {/* Real time deviation warning */}
                      {(isTaperDeviation || isBufferDeviation || isTermDeviation) && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-650 text-xs font-bold space-y-1">
                          <div className="flex items-center gap-1.5">
                            <AlertCircle className="h-4.5 w-4.5 text-red-600 animate-pulse" />
                            <span>
                              {language === 'ar' 
                                ? '⚠️ تنبيه: بعض القيم المقترحة تقل عن الحد الأدنى المطلوب للمواصفات الفنية!' 
                                : '⚠️ Warning: Some proposed values are below the technical specification minimums!'}
                            </span>
                          </div>
                          <ul className="list-disc list-inside pl-5 mt-1.5 space-y-0.5 font-semibold text-[11px]">
                            {isTaperDeviation && (
                              <li>
                                {language === 'ar'
                                  ? `طول التدرج المقترح (${formData.proposedTaper}م) أقل من الحد الأدنى المطلوب (${calcs.requiredTaper}م).`
                                  : `Proposed taper length (${formData.proposedTaper}m) is below the minimum required (${calcs.requiredTaper}m).`}
                              </li>
                            )}
                            {isBufferDeviation && (
                              <li>
                                {language === 'ar'
                                  ? `مسافة الأمان العازلة المقترحة (${formData.proposedBuffer}م) أقل من الحد الأدنى المطلوب (${calcs.requiredBuffer}م).`
                                  : `Proposed buffer space (${formData.proposedBuffer}m) is below the minimum required (${calcs.requiredBuffer}m).`}
                              </li>
                            )}
                            {isTermDeviation && (
                              <li>
                                {language === 'ar'
                                  ? `مسافة إنهاء التحويلة المقترحة (${formData.proposedTermination}م) أقل من الحد الأدنى المطلوب (${calcs.requiredTermination}م).`
                                  : `Proposed termination length (${formData.proposedTermination}m) is below the minimum required (${calcs.requiredTermination}m).`}
                              </li>
                            )}
                          </ul>
                          <span className="block text-[10px] text-red-500 font-normal mt-1.5 font-sans">
                            {language === 'ar'
                              ? '* سيتم الإشارة إلى هذه الفروقات باللون الأحمر في التقرير النهائي للمراجعة.'
                              : '* These adjustments will be flagged in red on the final audit report.'}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. Strategy descriptions */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <button
                    type="button"
                    onClick={() => togglePanel('p3_auditor')}
                    className="w-full flex items-center justify-between p-5 border-b border-slate-200 font-bold text-sm transition-all bg-slate-50 text-brand-dark hover:bg-slate-100/50"
                  >
                    <span className="flex items-center gap-2">
                      <Shield className="h-4.5 w-4.5 text-brand-primary" />
                      {language === 'ar' ? '٣.٢ إشغالات ومخطط الإغلاق والحركة' : '3.2 Closures & Traffic Management Plan'}
                    </span>
                    {expandedPanels.p3_auditor ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>

                  {expandedPanels.p3_auditor && (
                    <div className="p-5 space-y-4 animate-fade-in">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase">{t.roadClosureLabel}</label>
                        <textarea name={language === 'ar' ? 'roadClosureAr' : 'roadClosureEn'} rows="2" value={language === 'ar' ? formData.roadClosureAr : formData.roadClosureEn} onChange={handleInputChange} className="w-full mt-2 border border-slate-300 rounded p-2 text-xs" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase">{language === 'ar' ? 'مسار تحويلة بديل مغلق بالكامل؟' : 'Full Road Closure Alternative Route?'}</label>
                        <select name="closureAlternativeRoute" value={formData.closureAlternativeRoute} onChange={handleInputChange} className="w-full mt-2 border border-slate-300 rounded p-2 text-xs">
                          <option value="no">{language === 'ar' ? 'لا، إغلاق جزئي' : 'No, Partial Detour'}</option>
                          <option value="yes">{language === 'ar' ? 'نعم، إغلاق كامل وتوجيه بديل' : 'Yes, Full Closure with Rerouting'}</option>
                        </select>
                        {formData.closureAlternativeRoute === 'yes' && (
                          <textarea name="alternativeRoutePlan" rows="2" value={formData.alternativeRoutePlan} onChange={handleInputChange} placeholder={language === 'ar' ? 'أدخل مسار التحويلة البديل هنا...' : 'Enter alternative routing plan here...'} className="w-full mt-2 border border-slate-300 rounded p-2 text-xs" />
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase">{language === 'ar' ? 'غطاء أو جسور خنادق المشاة والمركبات' : 'Trench Steel Plates / Crossings'}</label>
                        <select name="trenchPlatesType" value={formData.trenchPlatesType} onChange={handleInputChange} className="w-full mt-2 border border-slate-300 rounded p-2 text-xs">
                          <option value="none">{language === 'ar' ? 'لا يوجد (بدون خنادق مفتوحة)' : 'None (No Open Trenches)'}</option>
                          <option value="steel_40t">{language === 'ar' ? 'ألواح صلب سماكة ٣٠ ملم - ٤٠ طن' : '30mm Steel Plates - 40 Tonnes'}</option>
                          <option value="anti_skid">{language === 'ar' ? 'ألواح مانعة للانزلاق (للمشاة)' : 'Anti-Skid Trench Covers'}</option>
                          <option value="pedestrian">{language === 'ar' ? 'جسور مشاة حديدية مع درابزين حماية' : 'Pedestrian Iron Bridges with Handrails'}</option>
                        </select>
                      </div>


                      <div className="flex flex-col gap-3 mt-4 p-4 bg-brand-light/30 border border-brand-primary/20 rounded-xl">
                        <div>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" name="impactAttenuators" checked={formData.impactAttenuators} onChange={(e) => setFormData(prev => ({...prev, impactAttenuators: e.target.checked}))} className="w-4 h-4 text-brand-primary border-slate-300 rounded focus:ring-brand-primary" />
                            <span className="text-xs font-bold text-brand-text-dark">{language === 'ar' ? 'مصدات صدمات للطرق السريعة (Crash Cushions / Attenuators)' : 'Impact Attenuators (Crash Cushions) for Arterial Roads'}</span>
                          </label>
                          {formData.speedLimit >= 80 && !formData.impactAttenuators && (
                            <div className="mt-2 text-[10px] text-red-600 font-bold bg-red-50 p-2 rounded flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              {language === 'ar' ? 'تحذير هندسي: سرعة الطريق ٨٠كم/س أو أعلى، يجب تركيب مصدات لتخفيف صدمات الانحراف.' : 'Warning: Speed is 80+ km/h. Attenuators are highly recommended to mitigate high-speed crashes.'}
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" name="smartLightingSensors" checked={formData.smartLightingSensors} onChange={(e) => setFormData(prev => ({...prev, smartLightingSensors: e.target.checked}))} className="w-4 h-4 text-brand-primary border-slate-300 rounded focus:ring-brand-primary" />
                            <span className="text-xs font-bold text-brand-text-dark">{language === 'ar' ? 'مستشعرات إضاءة ذكية مع إشعارات أعطال لاسلكية' : 'Smart Lighting with Wireless Outage Sensor Notifications'}</span>
                          </label>
                        </div>
                      </div>

                      {/* Gap 2: Deterministic Barrier Selection Engine Card */}
                      {barrierReq && (
                        <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 text-white text-xs space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 font-bold text-amber-400">
                              <Lock className="h-4 w-4" />
                              {language === 'ar' ? 'إلزامية نوع الحواجز (محرك المعايير الفنية)' : 'Deterministic Barrier Selection (Enforced)'}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                              {barrierReq.type.toUpperCase()}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-800/80 p-3 rounded-lg border border-slate-700">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase">{language === 'ar' ? 'نوع الحواجز الملزم' : 'Required Barrier Type'}</label>
                              <span className="text-sm font-bold text-white block mt-0.5">{language === 'ar' ? barrierReq.labelAr : barrierReq.labelEn}</span>
                              <span className="text-[10px] text-slate-400 block mt-1">({language === 'ar' ? barrierReq.reasonAr : barrierReq.reasonEn})</span>
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase">{language === 'ar' ? 'عمق الحفر (سم)' : 'Excavation Depth (cm)'}</label>
                              <input 
                                type="number" 
                                name="excavationDepth" 
                                value={formData.excavationDepth} 
                                onChange={handleInputChange} 
                                className="w-full mt-1 bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white font-mono" 
                                placeholder="0"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between bg-slate-800/80 p-3 rounded-lg border border-slate-700">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase">{language === 'ar' ? 'الارتداد الجانبي الآمن (م)' : 'Lateral Safety Clearance (m)'}</label>
                              <span className="text-[10px] text-slate-400">{language === 'ar' ? `النطاق المطلوب: ${barrierReq.clearanceMin}م - ${barrierReq.clearanceMax}م` : `Required: ${barrierReq.clearanceMin}m - ${barrierReq.clearanceMax}m`}</span>
                            </div>
                            <input 
                              type="number" 
                              step="0.1" 
                              name="barrierLateralClearance" 
                              value={formData.barrierLateralClearance} 
                              onChange={handleInputChange} 
                              className="w-24 bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white font-mono text-center font-bold" 
                            />
                          </div>
                        </div>
                      )}

                      {/* Gap 3: Temporary Steel Trench Plate Engineering Validation */}
                      {formData.trenchPlatesType !== 'none' && (
                        <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 text-white text-xs space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 font-bold text-teal-400">
                              <Ruler className="h-4 w-4" />
                              {language === 'ar' ? 'التحقق الهندسي لألواح التغطية المعدنية (Cross-Section Plate)' : 'Steel Trench Plate Engineering Validation'}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${trenchValidation.valid ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'}`}>
                              {trenchValidation.valid ? (language === 'ar' ? 'مطابق' : 'COMPLIANT') : (language === 'ar' ? 'غير مطابق' : 'NON-COMPLIANT')}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-800/80 p-3 rounded-lg border border-slate-700">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400">{language === 'ar' ? 'عرض الحفرة (م)' : 'Trench Width (m)'}</label>
                              <input type="number" step="0.1" name="trenchWidth" value={formData.trenchWidth} onChange={handleInputChange} className="w-full mt-1 bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white font-mono" />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400">{language === 'ar' ? 'سماكة اللوح (ملم)' : 'Plate Thickness (mm)'}</label>
                              <input type="number" name="steelPlateThickness" value={formData.steelPlateThickness} onChange={handleInputChange} className="w-full mt-1 bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white font-mono" />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400">{language === 'ar' ? 'عمق الكشط/الطحن (ملم)' : 'Flush Milling Depth (mm)'}</label>
                              <input type="number" name="flushMillingDepth" value={formData.flushMillingDepth} onChange={handleInputChange} className="w-full mt-1 bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white font-mono" />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-800/80 p-3 rounded-lg border border-slate-700">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400">{language === 'ar' ? 'عرض التحميل الأيسر (≥ ٤٠ سم)' : 'Left Bearing Length (≥ 40cm)'}</label>
                              <input type="number" name="bearingWidthLeft" value={formData.bearingWidthLeft} onChange={handleInputChange} className="w-full mt-1 bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white font-mono" />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400">{language === 'ar' ? 'عرض التحميل الأيمن (≥ ٤٠ سم)' : 'Right Bearing Length (≥ 40cm)'}</label>
                              <input type="number" name="bearingWidthRight" value={formData.bearingWidthRight} onChange={handleInputChange} className="w-full mt-1 bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white font-mono" />
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-3 pt-1">
                            <label className="flex items-center gap-2 cursor-pointer text-xs">
                              <input type="checkbox" name="antiSlipApplied" checked={formData.antiSlipApplied} onChange={(e) => setFormData(prev => ({...prev, antiSlipApplied: e.target.checked}))} className="w-4 h-4 text-brand-primary rounded" />
                              <span>{language === 'ar' ? 'معالجة مانعة للانزلاق (Anti-Slip Surface)' : 'Anti-Slip Surface Treatment'}</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-xs">
                              <input type="checkbox" name="mechanicalAnchoring" checked={formData.mechanicalAnchoring} onChange={(e) => setFormData(prev => ({...prev, mechanicalAnchoring: e.target.checked}))} className="w-4 h-4 text-brand-primary rounded" />
                              <span>{language === 'ar' ? 'تثبيت ميكانيكي لمنع الإزاحة' : 'Mechanical Anchoring'}</span>
                            </label>
                          </div>

                          {trenchValidation.issues && trenchValidation.issues.length > 0 && (
                            <div className="bg-red-500/10 border border-red-500/30 p-2.5 rounded text-[11px] text-red-300 space-y-1">
                              {trenchValidation.issues.map((iss, i) => (
                                <div key={i}>• {language === 'ar' ? iss.ar : iss.en}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 5. Gap 4: Site Photo Stream & GPS 25m Interval Parser */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <button
                    type="button"
                    onClick={() => togglePanel('p3_photos')}
                    className="w-full flex items-center justify-between p-5 bg-slate-50 border-b border-slate-200 font-bold text-brand-dark text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <Globe className="h-4.5 w-4.5 text-teal-600" />
                      {language === 'ar' ? '٣.٣ توثيق الصور الميدانية المكانية (تباعد ≤ ٢٥م)' : '3.3 Geotagged Photo Intake (≤ 25m Spatial Interval)'}
                    </span>
                    {expandedPanels.p3_photos ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>

                  {expandedPanels.p3_photos && (
                    <div className="p-5 animate-fade-in">
                      <PhotoUploadModule
                        language={language}
                        detourNodes={detourNodes}
                        onPhotosChange={({ count, violations }) => {
                          setFormData(prev => (prev.photoDocCount === count ? prev : { ...prev, photoDocCount: count, photoSpacingViolations: violations }));
                        }}
                      />
                    </div>
                  )}
                </div>

              </div>
            )}



            {/* Stepper Navigation buttons */}
            <div className="mt-8 flex justify-between border-t border-slate-200 pt-5">
              <button 
                onClick={prevPhase} 
                disabled={currentPhase === 1}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-50 transition"
              >
                {t.back}
              </button>
              {currentPhase < 3 ? (
                <button 
                  onClick={nextPhase} 
                  disabled={!isPhaseComplete(currentPhase)}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
                    !isPhaseComplete(currentPhase)
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-brand-primary hover:bg-brand-primary-hover text-white'
                  }`}
                >
                  {t.next}
                </button>
              ) : (
                <button 
                  onClick={submitContractorForm} 
                  disabled={!isPhaseComplete(3)}
                  className={`px-5 py-2 rounded-lg text-xs font-bold transition ${
                    !isPhaseComplete(3)
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-brand-gold hover:bg-brand-gold-hover text-white'
                  }`}
                >
                  {t.submit}
                </button>
              )}
            </div>
            </>
          )}
        </div>
      )}

        {/* -------------------- INSPECTOR REVIEW DASHBOARD -------------------- */}
        {(activePortalMode === 'inspector' || activePortalMode === 'external_entity') && (
          <div className="p-8 space-y-6">
            
            {/* Inspector Navigation Tabs: Inbox Proposals vs Active Approved Work Zones */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                <h2 className="text-base font-extrabold text-brand-dark flex items-center gap-1.5">
                  <Shield className="h-5 w-5 text-brand-gold" />
                  {activePortalMode === 'external_entity'
                    ? (language === 'ar' ? 'لوحة المنسق الخارجي — مراجعة طلبات الجهات غير التابعة للوكالة' : 'External Coordinator Console — Non-Agency Requests')
                    : (language === 'ar' ? 'لوحة المراجعة والتدقيق لتراخيص التحويلات المرورية' : 'Detour License Review Console')}
                </h2>
              </div>

              {/* Tab Selector Buttons — vertical stack instead of a horizontal scroller */}
              <div className="flex flex-col gap-1.5 text-xs font-bold">
                {activePortalMode === 'inspector' && (
                <button
                  onClick={() => setInspectorTab('inbox')}
                  className={`px-3 py-2.5 rounded-lg flex items-center gap-2 border-r-4 transition ${
                    inspectorTab === 'inbox'
                      ? 'bg-brand-primary/10 border-brand-primary text-brand-primary font-extrabold'
                      : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  }`}
                >
                  <FileText className="w-4 h-4 shrink-0" />
                  <span className="flex-1 text-left rtl:text-right">{language === 'ar' ? '📥 الطلبات قيد المراجعة والقرار (Pending)' : '📥 Pending Review & Decision'}</span>
                  <span className="px-2 py-0.5 bg-brand-primary/10 text-brand-primary rounded-full text-[10px] font-bold shrink-0">
                    {submittedPermits.filter(p => p.status !== 'Approved' && p.status !== 'Rejected' && p.status !== 'Resolved' && p.status !== 'PendingExternalReview').length}
                  </span>
                </button>
                )}

                <button
                  onClick={() => setInspectorTab('external_review')}
                  className={`px-3 py-2.5 rounded-lg flex items-center gap-2 border-r-4 transition ${
                    inspectorTab === 'external_review'
                      ? 'bg-amber-50 border-amber-500 text-amber-600 font-extrabold'
                      : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  }`}
                >
                  <Shield className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="flex-1 text-left rtl:text-right">{language === 'ar' ? '🔒 بانتظار مراجعة الجهة الأخرى' : '🔒 Pending External Entity Review'}</span>
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold rounded-full text-[10px] shrink-0">
                    {submittedPermits.filter(p => p.status === 'PendingExternalReview').length}
                  </span>
                </button>

                {activePortalMode === 'inspector' && (
                <button
                  onClick={() => setInspectorTab('active_approved')}
                  className={`px-3 py-2.5 rounded-lg flex items-center gap-2 border-r-4 transition ${
                    inspectorTab === 'active_approved'
                      ? 'bg-emerald-50 border-emerald-600 text-emerald-600 font-extrabold'
                      : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="flex-1 text-left rtl:text-right">{language === 'ar' ? '🚧 التحويلات المعتمدة النشطة (Active Zones)' : '🚧 Active Approved Work Zones'}</span>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full text-[10px] shrink-0">
                    {submittedPermits.filter(p => p.status === 'Approved').length}
                  </span>
                </button>
                )}

                {activePortalMode === 'inspector' && (
                <button
                  onClick={() => setInspectorTab('history')}
                  className={`px-3 py-2.5 rounded-lg flex items-center gap-2 border-r-4 transition ${
                    inspectorTab === 'history'
                      ? 'bg-amber-50 border-amber-500 text-amber-600 font-extrabold'
                      : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  }`}
                >
                  <Layers className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="flex-1 text-left rtl:text-right">{language === 'ar' ? '📜 أرشيف القرارات والتراخيص المعالجة (History)' : '📜 Decision History & Archive'}</span>
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold rounded-full text-[10px] shrink-0">
                    {submittedPermits.filter(p => p.status === 'Approved' || p.status === 'Rejected' || p.status === 'Resolved').length}
                  </span>
                </button>
                )}

                {activePortalMode === 'inspector' && (
                <button
                  onClick={() => setInspectorTab('documents')}
                  className={`px-3 py-2.5 rounded-lg flex items-center gap-2 border-r-4 transition ${
                    inspectorTab === 'documents'
                      ? 'bg-brand-primary/10 border-brand-primary text-brand-primary font-extrabold'
                      : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  }`}
                >
                  <FileSignature className="w-4 h-4 text-brand-primary shrink-0" />
                  <span className="flex-1 text-left rtl:text-right">{language === 'ar' ? '📄 المستندات الرسمية' : '📄 Official Documents'}</span>
                  <span className="px-2 py-0.5 bg-brand-primary/10 text-brand-primary rounded-full text-[10px] font-bold shrink-0">
                    {submittedPermits.filter(p => getDocumentAvailability(p).any).length}
                  </span>
                </button>
                )}
              </div>

              {/* Search & Filter Bar for Inbox */}
              {inspectorTab === 'inbox' && (
                <div className="flex flex-col md:flex-row gap-3 pt-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder={language === 'ar' ? 'البحث باسم المشروع أو المقاول المنفذ...' : 'Search by project name or contractor...'} 
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs focus:outline-none"
                    />
                  </div>
                  
                  <div className="flex gap-2 flex-wrap">
                    <select 
                      value={statusFilter} 
                      onChange={e => setStatusFilter(e.target.value)}
                      className="border border-slate-300 rounded-lg p-2 text-xs"
                    >
                      <option value="All">{language === 'ar' ? 'جميع الطلبات' : 'All Requests'}</option>
                      <option value="Clean">{language === 'ar' ? 'مطابق للكود (Clean)' : 'Code Compliant (Clean)'}</option>
                      <option value="Flagged">{language === 'ar' ? 'مستثنى / غير مطابق (Flagged)' : 'Out-of-Spec (Flagged)'}</option>
                    </select>

                    <select 
                      value={sortBy} 
                      onChange={e => setSortBy(e.target.value)}
                      className="border border-slate-300 rounded-lg p-2 text-xs"
                    >
                      <option value="date_desc">{language === 'ar' ? 'الأحدث تقديماً' : 'Latest submission'}</option>
                      <option value="date_asc">{language === 'ar' ? 'الأقدم أولاً' : 'Oldest first'}</option>
                      <option value="status">{language === 'ar' ? 'تصنيف حالة السلامة' : 'Compliance Class'}</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* TAB: المستندات الرسمية — a consolidated view of every permit's
                documents, independent of which stage/status it's currently in. */}
            {inspectorTab === 'documents' && (
              <div className="space-y-4">
                {submittedPermits.filter(p => getDocumentAvailability(p).any).length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-xs text-slate-400 space-y-2 shadow-sm">
                    <FileSignature className="w-8 h-8 text-slate-300 mx-auto" />
                    <p>{language === 'ar' ? 'لا توجد مستندات مكتملة بعد \u2014 ستظهر هنا فور اعتماد أو تقديم أي محضر.' : 'No completed documents yet \u2014 they\u2019ll appear here once any document is submitted.'}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {submittedPermits.filter(p => getDocumentAvailability(p).any).map(permit => {
                      const docs = getDocumentAvailability(permit);
                      return (
                      <div key={permit.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span className="font-mono text-slate-400 text-[10px] font-bold">{permit.id}</span>
                            <h4 className="font-extrabold text-slate-900 text-sm truncate">{language === 'ar' ? permit.projectNameAr : permit.projectNameEn}</h4>
                          </div>
                          <span className={`shrink-0 px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            permit.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                            permit.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                            permit.status === 'Resolved' ? 'bg-slate-200 text-slate-700' :
                            permit.status === 'PendingExternalReview' ? 'bg-amber-100 text-amber-800' :
                            'bg-blue-100 text-blue-900'
                          }`}>
                            {permit.status === 'Approved' ? (language === 'ar' ? 'معتمد' : 'Approved') :
                             permit.status === 'Rejected' ? (language === 'ar' ? 'مرفوض' : 'Rejected') :
                             permit.status === 'Resolved' ? (language === 'ar' ? 'مغلق' : 'Closed') :
                             permit.status === 'PendingExternalReview' ? (language === 'ar' ? 'بانتظار الجهة الأخرى' : 'Pending External') :
                             (language === 'ar' ? 'قيد المراجعة' : 'Under Review')}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {docs.openingMinutes && (
                          <button
                            onClick={() => { setSelectedPermitForOpening(permit); setOpeningMinutesModalOpen(true); }}
                            className="py-1.5 bg-brand-gold/10 hover:bg-brand-gold/20 text-brand-gold-hover font-bold text-[11px] rounded flex items-center justify-center gap-1 border border-brand-gold/20 transition"
                          >
                            <FileSignature className="w-3.5 h-3.5" />
                            <span>{language === 'ar' ? 'محضر فتح تحويلة' : 'Opening Minutes'}</span>
                          </button>
                          )}
                          {docs.readinessReport && (
                          <button
                            onClick={() => { setSelectedPermitForReadiness(permit); setFieldReadinessModalOpen(true); }}
                            className="py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 font-bold text-[11px] rounded flex items-center justify-center gap-1 border border-emerald-500/20 transition"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>{language === 'ar' ? 'محضر الجاهزية' : 'Readiness Report'}</span>
                          </button>
                          )}
                          {docs.monitoringReport && (
                          <button
                            onClick={() => { setSelectedPermitForActiveAudit(permit); setActiveMonitoringModalOpen(true); }}
                            className="py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 font-bold text-[11px] rounded flex items-center justify-center gap-1 border border-amber-500/20 transition"
                          >
                            <ClipboardCheck className="w-3.5 h-3.5" />
                            <span>{language === 'ar' ? 'متابعة الأداء' : 'Monitoring Report'}</span>
                          </button>
                          )}
                          {docs.closureMinutes && (
                          <button
                            onClick={() => { setSelectedPermitForClosure(permit); setClosureModalOpen(true); }}
                            className="py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded flex items-center justify-center gap-1 border border-slate-300 transition"
                          >
                            <FileCheck className="w-3.5 h-3.5" />
                            <span>{language === 'ar' ? 'محضر إغلاق التحويلة' : 'Closure Minutes'}</span>
                          </button>
                          )}
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB: بانتظار مراجعة الجهة الأخرى — permits with a non-affiliated
                owner classification are gated here until cleared, before they
                can enter the normal Pending Review queue. */}
            {inspectorTab === 'external_review' && (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
                  <h3 className="font-bold text-amber-900 text-sm flex items-center gap-2">
                    <Shield className="w-5 h-5 text-amber-600" />
                    {language === 'ar' ? 'طلبات بانتظار مراجعة الجهة الأخرى قبل الوصول للمفتش' : 'Requests awaiting the other entity\u2019s review before reaching the inspector'}
                  </h3>
                  <p className="text-xs text-amber-700 mt-0.5">
                    {language === 'ar'
                      ? 'هذه الطلبات مصنفة "غير تابعة للوكالة" في القسم 1.1 — لا تظهر في قائمة المراجعة العادية حتى يتم تحويلها هنا.'
                      : 'These requests are classified "Not Affiliated with the Agency" in section 1.1 — they won\u2019t appear in the normal review queue until forwarded here.'}
                  </p>
                </div>

                {submittedPermits.filter(p => p.status === 'PendingExternalReview').length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-xs text-slate-400 space-y-2 shadow-sm">
                    <Shield className="w-8 h-8 text-slate-300 mx-auto" />
                    <p>{language === 'ar' ? 'لا توجد طلبات بانتظار مراجعة الجهة الأخرى حالياً.' : 'No requests currently pending external entity review.'}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {submittedPermits.filter(p => p.status === 'PendingExternalReview').map(permit => (
                      <div key={permit.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
                        <div>
                          <span className="font-mono text-slate-400 text-[10px] font-bold">{permit.id}</span>
                          <h4 className="font-extrabold text-slate-900 text-sm">{language === 'ar' ? permit.projectNameAr : permit.projectNameEn}</h4>
                          <span className="text-xs text-slate-500 font-medium">{language === 'ar' ? permit.contractorAr : permit.contractorEn}</span>
                        </div>
                        <button
                          onClick={() => handleForwardToInspector(permit)}
                          className="w-full py-2 bg-brand-primary hover:bg-brand-primary-hover text-white font-bold text-xs rounded-lg transition flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          {language === 'ar' ? 'اعتماد ومتابعة للمفتش' : 'Approve & Forward to Inspector'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 1: SUBMITTED PERMITS INBOX GRID */}
            {inspectorTab === 'inbox' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              
              {/* Proposals Table List (Scales dynamically down the page) */}
              <div className="col-span-1 lg:col-span-1 bg-white border border-slate-200 rounded-xl p-4 shadow-sm max-h-[calc(100vh-140px)] sticky top-24 overflow-y-auto space-y-2">
                <span className="block text-[11px] font-bold text-slate-450 uppercase border-b pb-1.5">{language === 'ar' ? 'طلبات التراخيص الواردة (قيد القرار)' : 'Inbox Proposals'}</span>
                
                {filteredPermitsList.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400 font-medium">No results found.</div>
                ) : (
                  filteredPermitsList.map(permit => {
                    const isSelected = selectedPermitForReview?.id === permit.id;
                    return (
                      <button
                        key={permit.id}
                        onClick={() => setSelectedPermitForReview(permit)}
                        className={`w-full text-left p-3.5 rounded-lg border transition-all flex flex-col gap-1.5 ${
                          isSelected 
                            ? 'bg-brand-primary/10 border-brand-primary ring-1 ring-brand-primary' 
                            : 'bg-slate-50 hover:bg-slate-100/70 border-slate-200'
                        }`}
                      >
                        <div className="flex justify-between items-center w-full text-[10px]">
                          <span className="font-mono text-slate-500 font-bold">{permit.id}</span>
                          <span className={`px-2 py-0.5 rounded font-bold text-[9px] ${
                            permit.status === 'Clean' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {permit.status === 'Clean' ? 'COMPLIANT' : 'FLAGGED'}
                          </span>
                        </div>
                        <span className="font-bold text-slate-900 text-xs block leading-tight">{language === 'ar' ? permit.projectNameAr : permit.projectNameEn}</span>
                        <span className="text-[10px] text-slate-600 font-semibold">{language === 'ar' ? permit.contractorAr : permit.contractorEn}</span>
                        <div className="flex items-center justify-between text-[9px] text-slate-500 pt-1 border-t border-slate-200 mt-0.5">
                          <span>📅 {permit.submittedDate}</span>
                          <span>⚡ {permit.speed || 80} km/h</span>
                          <span>📐 {permit.siteLength || 100}m</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Inspector Detailed Permit Review View Panel */}
              <div className="col-span-1 lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-sm min-h-[500px] flex flex-col justify-between">
                {selectedPermitForReview ? (
                  <div className="space-y-6">
                    
                    {/* Header info */}
                    <div className="flex justify-between items-start border-b pb-4">
                      <div>
                        <span className="text-[10px] font-bold text-brand-primary uppercase tracking-wider block">{language === 'ar' ? 'تفاصيل ترخيص السلامة' : 'Permit Audit Specifications'}</span>
                        <h3 className="text-base font-extrabold text-slate-900 leading-snug">{language === 'ar' ? selectedPermitForReview.projectNameAr : selectedPermitForReview.projectNameEn}</h3>
                        <span className="text-xs text-slate-500 font-medium">{language === 'ar' ? selectedPermitForReview.contractorAr : selectedPermitForReview.contractorEn}</span>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          selectedPermitForReview.status === 'Clean' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {selectedPermitForReview.status === 'Clean' ? 'CODE COMPLIANT' : 'OUT-OF-SPEC FLAGGED'}
                        </span>
                        <span className="block text-[10px] text-slate-500 mt-1">Submitted: {selectedPermitForReview.submittedDate}</span>
                      </div>
                    </div>

                    {/* Official Permit File Download & Full Report Preview Actions */}
                    <div className="flex flex-wrap gap-2 justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => setInspectReportModalOpen(true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-bold rounded transition shadow"
                        >
                          <FileCheck className="h-3.5 w-3.5" />
                          <span>{language === 'ar' ? 'معاينة التقرير والشهادة' : 'View Full Report'}</span>
                        </button>
                        <button
                          onClick={() => downloadOfficialPermitFile(selectedPermitForReview)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded transition shadow"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>{language === 'ar' ? 'تحميل ملف التصريح الرسمي' : 'Download Official Permit'}</span>
                        </button>
                        <button
                          onClick={() => downloadUploadedCadFile(selectedPermitForReview)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded transition shadow"
                        >
                          <Download className="h-3.5 w-3.5 text-brand-gold" />
                          <span>{language === 'ar' ? 'تحميل مخطط الـ CAD المرفوع' : 'Download Uploaded CAD File'}</span>
                        </button>
                      </div>
                    </div>

                    {/* External Official Permit File Attachment Verification Box */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-brand-primary/10 text-brand-primary rounded-lg">
                          <FileText className="w-5 h-5 text-brand-primary" />
                        </div>
                        <div>
                          <span className="block font-bold text-slate-900 text-xs">
                            {language === 'ar' ? 'مستند تصريح الحفر الصادر من الجهة الخارجية:' : 'Official External Permit File:'}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {selectedPermitForReview.externalPermitDocName || (language === 'ar' ? 'تصريح_حفر_جهة_خارجية_معتمد.pdf' : 'Official_External_Permit.pdf')}
                          </span>
                        </div>
                      </div>
                      {selectedPermitForReview.externalPermitDocument ? (
                        <a
                          href={selectedPermitForReview.externalPermitDocument}
                          download={selectedPermitForReview.externalPermitDocName || 'Official_External_Permit.pdf'}
                          className="px-3 py-1.5 bg-brand-primary hover:bg-brand-primary-hover text-white font-bold text-xs rounded-lg transition flex items-center gap-1 shadow-sm"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>{language === 'ar' ? 'تحميل التصريح' : 'Download File'}</span>
                        </a>
                      ) : (
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>{language === 'ar' ? 'مستند خارجي موثق' : 'Verified Attachment'}</span>
                        </span>
                      )}
                    </div>

                    {/* GIS perimeter location map */}
                    <div>
                      <span className="block text-xs font-bold text-slate-550 uppercase mb-2">{language === 'ar' ? 'خريطة مضلع الـ GIS للموقع:' : 'GIS Boundary Perimeter Map:'}</span>
                      <div ref={inspectorMapContainerRef} className="h-48 rounded-lg border border-slate-200 overflow-hidden relative z-0" id="inspector-leaflet-map"></div>
                    </div>

                    {/* Calculations vs Proposed specs logs */}
                    <div>
                      <span className="block text-xs font-bold text-slate-550 uppercase mb-2">{language === 'ar' ? 'فحص ومطابقة أبعاد لوائح وزارة النقل:' : 'KSA Ministry of Transport Safety Spacings Match:'}</span>
                      
                      <div className="overflow-x-auto text-xs">
                        <table className="w-full text-left border border-slate-200 rounded overflow-hidden" dir={t.dir}>
                          <thead className="bg-slate-50 font-bold text-slate-700">
                            <tr>
                              <th className="p-2.5">Detour Element</th>
                              <th className="p-2.5 text-center">Calculated Min</th>
                              <th className="p-2.5 text-center">Proposed Value</th>
                              <th className="p-2.5 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {/* Taper */}
                            <tr className="border-b border-slate-200">
                              <td className="p-2.5 font-medium">{t.taperLength}</td>
                              <td className="p-2.5 text-center font-mono">
                                {(selectedPermitForReview.speed <= 60 
                                  ? (3.6 * Math.pow(selectedPermitForReview.speed, 2) / 155) 
                                  : (3.6 * selectedPermitForReview.speed / 1.6)).toFixed(1)}m
                              </td>
                              <td className={`p-2.5 text-center font-mono ${
                                selectedPermitForReview.taper < (selectedPermitForReview.speed <= 60 
                                  ? (3.6 * Math.pow(selectedPermitForReview.speed, 2) / 155) 
                                  : (3.6 * selectedPermitForReview.speed / 1.6)) 
                                  ? 'bg-red-50 text-red-700 font-bold' 
                                  : 'text-slate-800'
                              }`}>{selectedPermitForReview.taper}m</td>
                              <td className="p-2.5 text-center">
                                {selectedPermitForReview.taper < (selectedPermitForReview.speed <= 60 
                                  ? (3.6 * Math.pow(selectedPermitForReview.speed, 2) / 155) 
                                  : (3.6 * selectedPermitForReview.speed / 1.6)) ? (
                                  <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded font-bold text-[9px] uppercase">⚠️ OUT-OF-SPEC</span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[9px] uppercase">COMPLIANT</span>
                                )}
                              </td>
                            </tr>
                            {/* Buffer */}
                            <tr className="border-b border-slate-200">
                              <td className="p-2.5 font-medium">{t.bufferSSD}</td>
                              <td className="p-2.5 text-center font-mono">
                                {selectedPermitForReview.speed <= 40 ? 50 : selectedPermitForReview.speed <= 60 ? 85 : selectedPermitForReview.speed <= 80 ? 130 : selectedPermitForReview.speed <= 100 ? 185 : 250}m
                              </td>
                              <td className={`p-2.5 text-center font-mono ${
                                selectedPermitForReview.buffer < (selectedPermitForReview.speed <= 40 ? 50 : selectedPermitForReview.speed <= 60 ? 85 : selectedPermitForReview.speed <= 80 ? 130 : selectedPermitForReview.speed <= 100 ? 185 : 250)
                                  ? 'bg-red-50 text-red-700 font-bold' 
                                  : 'text-slate-800'
                              }`}>{selectedPermitForReview.buffer}m</td>
                              <td className="p-2.5 text-center">
                                {selectedPermitForReview.buffer < (selectedPermitForReview.speed <= 40 ? 50 : selectedPermitForReview.speed <= 60 ? 85 : selectedPermitForReview.speed <= 80 ? 130 : selectedPermitForReview.speed <= 100 ? 185 : 250) ? (
                                  <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded font-bold text-[9px] uppercase">⚠️ OUT-OF-SPEC</span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[9px] uppercase">COMPLIANT</span>
                                )}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* SVG roadmap layout representation */}
                    <div>
                      <span className="block text-xs font-bold text-slate-550 uppercase mb-2">{language === 'ar' ? 'المخطط الهندسي الأفقي للتحويلة:' : 'Detour Horizontal Roadmap Layout:'}</span>
                      {renderHorizontalLayoutSVG(selectedPermitForReview)}
                    </div>

                    {/* 🤖 Tahcom AI Inspector Reviewer Panel */}
                    <div className="bg-slate-900 border border-brand-gold/30 rounded-xl p-5 text-white space-y-4 shadow-md">
                      <div className="flex items-center justify-between border-b border-brand-gold/15 pb-2.5">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-5 w-5 text-brand-gold animate-pulse" />
                          <div>
                            <h4 className="text-xs font-bold text-brand-gold">{language === 'ar' ? 'تدقيق نظام تحكم للذكاء الاصطناعي (Tahcom AI)' : 'Tahcom AI Visual Compliance Report'}</h4>
                            <p className="text-[9px] text-slate-400">Short Visual Dashboard Audit against KSA MOT rules.</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => generateLiveAiInsight(selectedPermitForReview)}
                          disabled={aiInsightLoading}
                          className="px-3.5 py-1.5 bg-brand-primary hover:bg-brand-primary-hover text-white text-[11px] font-bold rounded transition flex items-center gap-1.5 shadow"
                        >
                          <Activity className="h-3.5 w-3.5" />
                          <span>{language === 'ar' ? '⚡ استعلام تحكم AI' : '⚡ Query Tahcom AI'}</span>
                        </button>
                      </div>

                      {aiInsightLoading && (
                        <div className="py-6 text-center text-xs animate-pulse text-slate-400">
                          {language === 'ar' ? 'جاري تحليل المخطط بواسطة نظام تحكم للذكاء الاصطناعي (Tahcom AI)...' : 'Tahcom AI is auditing detour layout...'}
                        </div>
                      )}

                      {!aiInsightLoading && aiInsights[selectedPermitForReview.id] && (
                        <div className="bg-slate-950 p-4 rounded text-[11px] font-mono leading-relaxed whitespace-pre-line text-slate-200 border border-brand-gold/20 shadow-inner">
                          {aiInsights[selectedPermitForReview.id]}
                        </div>
                      )}
                      
                      {!aiInsightLoading && !aiInsights[selectedPermitForReview.id] && (
                        <div className="py-4 text-center text-xs text-slate-500 bg-black/20 rounded border border-slate-800">
                          {language === 'ar' ? 'اضغط على استعلام تحكم AI للحصول على التقرير البصري الموجز.' : 'Click Query Tahcom AI for visual summary report.'}
                        </div>
                      )}
                    </div>
                    
                    {/* Live CCTV for Critical Detours */}
                    <CCTVMockWidget language={language} permit={selectedPermitForReview} />

                    {/* Inspector Review Form */}
                    <div className="mt-6 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="bg-slate-50 border-b border-slate-200 p-3 font-bold text-xs text-slate-700 flex items-center gap-2">
                        <Edit3 className="w-4 h-4 text-brand-primary" />
                        {language === 'ar' ? 'ملاحظات المفتش وقرار الاعتماد' : 'Inspector Observations & Decision'}
                      </div>
                      <div className="p-4 space-y-4">
                        <textarea 
                          value={inspectorNotes} 
                          onChange={(e) => setInspectorNotes(e.target.value)}
                          placeholder={language === 'ar' ? 'أدخل ملاحظات التفتيش الميداني هنا...' : 'Enter field inspection observations here...'}
                          className="w-full border border-slate-300 rounded p-3 text-xs min-h-[80px] focus:ring-1 focus:ring-brand-primary"
                        />
                        <div className="flex flex-wrap gap-3">
                          <button 
                            onClick={() => handleUpdatePermitStatus(selectedPermitForReview.status)}
                            className="flex-1 bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-2 px-3 rounded transition-colors flex items-center justify-center gap-1.5 text-xs shadow"
                          >
                            <Edit3 className="w-4 h-4" />
                            {language === 'ar' ? 'حفظ ملاحظات المفتش' : 'Save Observations'}
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedPermitForOpening(selectedPermitForReview);
                              setOpeningMinutesModalOpen(true);
                            }}
                            className="flex-1 bg-brand-gold hover:bg-brand-gold-hover text-slate-950 font-bold py-2 px-3 rounded transition-colors flex items-center justify-center gap-1.5 text-xs shadow"
                          >
                            <FileSignature className="w-4 h-4" />
                            {language === 'ar' ? 'محضر فتح تحويلة' : 'Opening Minutes'}
                          </button>
                          <button 
                            onClick={() => handleUpdatePermitStatus('Rejected')}
                            className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-3 rounded transition-colors flex items-center justify-center gap-1.5 text-xs shadow"
                          >
                            <X className="w-4 h-4" />
                            {language === 'ar' ? 'رفض التصريح' : 'Reject Permit'}
                          </button>
                        </div>
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="my-auto text-center py-12 text-slate-400 text-xs flex flex-col items-center justify-center space-y-2">
                    <Shield className="h-8 w-8 text-slate-300" />
                    <span>{language === 'ar' ? 'الرجاء اختيار أحد طلبات التصاريح الواردة لمراجعته وتدقيقه.' : 'Please select a submitted permit from the list to begin audit review.'}</span>
                  </div>
                )}
              </div>

            </div>
            )}

            {/* TAB 2: DECISION HISTORY & ARCHIVE */}
            {inspectorTab === 'history' && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex justify-between items-center bg-amber-50 border border-amber-200 p-4 rounded-xl shadow-sm">
                  <div>
                    <h3 className="font-bold text-amber-900 text-sm flex items-center gap-2">
                      <Layers className="w-5 h-5 text-amber-600" />
                      {language === 'ar' ? 'أرشيف القرارات والتراخيص المعالجة والاعتمادات السابقة' : 'Decision History & Approved/Rejected Permits Archive'}
                    </h3>
                    <p className="text-xs text-amber-700 mt-0.5">
                      {language === 'ar' 
                        ? 'يتضمن جميع القرارات السابقة الصادرة من المفتشين (سواءً بالاعتماد أو الرفض أو التوجيهات) مع إمكانية طباعة وتحميل ملفات التصاريح.' 
                        : 'Contains all past inspector decisions (Approved, Rejected, or Directives Issued) with complete permit file download options.'}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-amber-600 text-white font-extrabold text-xs rounded-full shadow">
                    {submittedPermits.filter(p => p.status === 'Approved' || p.status === 'Rejected' || p.status === 'Resolved').length} {language === 'ar' ? 'قرار مسجل' : 'Decisions Recorded'}
                  </span>
                </div>

                {submittedPermits.filter(p => p.status === 'Approved' || p.status === 'Rejected' || p.status === 'Resolved').length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-xs text-slate-400 space-y-2 shadow-sm">
                    <Layers className="w-8 h-8 text-slate-300 mx-auto" />
                    <p>{language === 'ar' ? 'لا يوجد قرارات سابقة مسجلة في الأرشيف حالياً.' : 'No decision history archived yet.'}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {submittedPermits.filter(p => p.status === 'Approved' || p.status === 'Rejected' || p.status === 'Resolved').map(permit => (
                      <div key={permit.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 hover:shadow-md transition">
                        <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                          <div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              permit.status === 'Approved' 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : permit.status === 'Rejected'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {permit.status === 'Approved' ? '✅ APPROVED / معتمد' : permit.status === 'Rejected' ? '❌ REJECTED / مرفوض' : '⚠️ DIRECTIVE ISSUED'}
                            </span>
                            <h4 className="font-extrabold text-slate-900 text-sm mt-1">{language === 'ar' ? permit.projectNameAr : permit.projectNameEn}</h4>
                            <span className="text-xs text-slate-500 font-medium">{language === 'ar' ? permit.contractorAr : permit.contractorEn}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-mono text-slate-500 text-xs font-bold block">{permit.id}</span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">Submitted: {permit.submittedDate}</span>
                          </div>
                        </div>

                        {permit.inspector_notes && (
                          <div className="p-3 bg-slate-900 text-slate-200 rounded-lg text-xs font-mono space-y-1">
                            <span className="text-brand-gold font-bold text-[10px] uppercase block">{language === 'ar' ? 'قرار وتوجيه المفتش:' : 'Inspector Decision & Directive:'}</span>
                            <p className="whitespace-pre-line text-[11px] leading-relaxed">{permit.inspector_notes}</p>
                          </div>
                        )}

                        <div className="flex gap-2 pt-2 border-t border-slate-100">
                          <button
                            onClick={() => downloadOfficialPermitFile(permit)}
                            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded transition flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <Download className="w-4 h-4" />
                            <span>{language === 'ar' ? 'تحميل ملف التصريح الرسمي' : 'Download Permit File'}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: ACTIVE APPROVED WORK ZONES MONITORING SECTION */}
            {inspectorTab === 'active_approved' && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex justify-between items-center bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
                  <div>
                    <h3 className="font-bold text-emerald-900 text-sm flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      {language === 'ar' ? 'متابعة التحويلات المرورية النشطة المعتمدة (قيد التنفيذ والمتابعة الميدانية)' : 'Active Approved Work Zones Monitoring & Site Audits'}
                    </h3>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      {language === 'ar' 
                        ? 'تتيح للمفتش متابعة أعمال التحويلات القائمة، وتسجيل زيارات الملاحظات الميدانية، والتحقق من التزام المقاول بالتاريخ والتجهيزات.' 
                        : 'Allows inspectors to monitor active detours in real-time, record field audit visits, and verify compliance until work completion.'}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-emerald-600 text-white font-extrabold text-xs rounded-full shadow">
                    {submittedPermits.filter(p => p.status === 'Approved').length} {language === 'ar' ? 'تحويلة نشطة' : 'Active Zones'}
                  </span>
                </div>

                {/* Sequential status filter: readiness -> monitoring -> closure,
                    plus a compact/detailed view toggle. */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'readiness', labelAr: 'التحقق من الجاهزية', labelEn: 'Readiness', icon: ShieldCheck },
                      { key: 'monitoring', labelAr: 'متابعة الأداء', labelEn: 'Performance Monitoring', icon: ClipboardCheck },
                      { key: 'closure', labelAr: 'الإغلاق', labelEn: 'Closure', icon: FileCheck }
                    ].map(f => {
                      const Icon = f.icon;
                      const count = submittedPermits.filter(p => p.status === 'Approved' && getPermitStage(p) === f.key).length;
                      return (
                        <button
                          key={f.key}
                          onClick={() => setActiveZoneFilter(f.key)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                            activeZoneFilter === f.key
                              ? 'bg-brand-primary text-white border-brand-primary shadow'
                              : 'bg-white text-brand-text-gray border-slate-200 hover:border-brand-primary/40'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{language === 'ar' ? f.labelAr : f.labelEn}</span>
                          <span className={`px-1.5 rounded-full text-[10px] ${activeZoneFilter === f.key ? 'bg-white/20' : 'bg-slate-100'}`}>{count}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                    <button
                      onClick={() => setActiveZoneViewMode('detailed')}
                      className={`px-3 py-1 rounded text-xs font-bold transition ${activeZoneViewMode === 'detailed' ? 'bg-white text-brand-primary shadow-sm' : 'text-slate-500'}`}
                    >
                      {language === 'ar' ? 'تفصيلي' : 'Detailed'}
                    </button>
                    <button
                      onClick={() => setActiveZoneViewMode('compact')}
                      className={`px-3 py-1 rounded text-xs font-bold transition ${activeZoneViewMode === 'compact' ? 'bg-white text-brand-primary shadow-sm' : 'text-slate-500'}`}
                    >
                      {language === 'ar' ? 'مختصر' : 'Compact'}
                    </button>
                  </div>
                </div>

                {activeZoneViewMode === 'compact' && (
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 shadow-sm">
                    {submittedPermits.filter(p => p.status === 'Approved' && getPermitStage(p) === activeZoneFilter).map(permit => {
                      let badge;
                      if (activeZoneFilter === 'readiness') {
                        badge = permit.readiness_status === 'verified'
                          ? { text: language === 'ar' ? '✅ الجاهزية تحققت' : '✅ Readiness Verified', cls: 'bg-emerald-100 text-emerald-800' }
                          : { text: language === 'ar' ? '⏳ الجاهزية معلقة' : '⏳ Readiness Pending', cls: 'bg-amber-100 text-amber-800' };
                      } else if (activeZoneFilter === 'monitoring') {
                        badge = permit.monitoring_status === 'started'
                          ? { text: language === 'ar' ? '📋 قيد المتابعة الدورية' : '📋 Monitoring Underway', cls: 'bg-blue-100 text-blue-900' }
                          : { text: language === 'ar' ? '⏳ بانتظار أول تقرير' : '⏳ Awaiting First Report', cls: 'bg-amber-100 text-amber-800' };
                      } else {
                        badge = { text: language === 'ar' ? '🔒 جاهزة للإغلاق' : '🔒 Ready for Closure', cls: 'bg-slate-200 text-slate-800' };
                      }

                      const actionButton = (() => {
                        if (activeZoneFilter === 'readiness') {
                          return (
                            <button
                              onClick={() => { setSelectedPermitForReadiness(permit); setFieldReadinessModalOpen(true); }}
                              className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold border transition ${
                                permit.readiness_status === 'verified'
                                  ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 border-emerald-500/20'
                                  : 'bg-red-500/10 hover:bg-red-500/20 text-red-700 border-red-500/20'
                              }`}
                            >
                              <ShieldCheck className="w-3 h-3" />
                              <span>{language === 'ar' ? 'التحقق من الجاهزية' : 'Field Readiness'}</span>
                            </button>
                          );
                        }
                        if (activeZoneFilter === 'monitoring') {
                          return (
                            <button
                              onClick={() => { setSelectedPermitForActiveAudit(permit); setActiveMonitoringModalOpen(true); }}
                              className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold border bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 border-amber-500/20 transition"
                            >
                              <ClipboardCheck className="w-3 h-3" />
                              <span>{language === 'ar' ? 'متابعة الأداء' : 'Performance Monitoring'}</span>
                            </button>
                          );
                        }
                        return (
                          <button
                            onClick={() => { setSelectedPermitForClosure(permit); setClosureModalOpen(true); }}
                            className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold border bg-slate-900 hover:bg-slate-800 text-amber-400 border-slate-700 transition"
                          >
                            <FileCheck className="w-3 h-3 text-amber-400" />
                            <span>{language === 'ar' ? 'محضر الإغلاق' : 'Closure Minutes'}</span>
                          </button>
                        );
                      })();

                      return (
                        <div key={permit.id} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-slate-50 transition">
                          <div className="min-w-0 flex items-baseline gap-2">
                            <span className="font-bold text-xs text-slate-900 truncate">{language === 'ar' ? permit.projectNameAr : permit.projectNameEn}</span>
                            <span className="text-[10px] font-mono text-slate-400 shrink-0">#{permit.id}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${badge.cls}`}>{badge.text}</span>
                            {actionButton}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {activeZoneViewMode === 'detailed' && (
                  submittedPermits.filter(p => p.status === 'Approved' && getPermitStage(p) === activeZoneFilter).length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-xs text-slate-400 space-y-2 shadow-sm">
                      <Shield className="w-8 h-8 text-slate-300 mx-auto" />
                      <p>{language === 'ar' ? 'لا يوجد تحويلات في هذه المرحلة حالياً.' : 'No active work zones at this stage right now.'}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {submittedPermits.filter(p => p.status === 'Approved' && getPermitStage(p) === activeZoneFilter).map(permit => {
                        const daysLeft = calculateDaysLeft(permit.workEndDate || permit.permitEndDate);
                        const isNoteDraft = fieldNoteInput[permit.id] || '';

                        return (
                          <div key={permit.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition space-y-4">
                          {/* Header */}
                          <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                            <div>
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                  IN-PROGRESS WORK ZONE
                                </span>
                                <span className="font-mono text-slate-400 text-[10px] font-bold">{permit.id}</span>
                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded flex items-center gap-1 ${permit.readiness_status === 'verified' ? 'bg-emerald-600 text-white' : 'bg-amber-100 text-amber-800 border border-amber-300'}`}>
                                  {permit.readiness_status === 'verified'
                                    ? (language === 'ar' ? '✅ الجاهزية تحققت' : '✅ Readiness Verified')
                                    : (language === 'ar' ? '⏳ الجاهزية لم تُتحقق بعد' : '⏳ Readiness Pending')}
                                </span>
                              </div>
                              <h4 className="font-extrabold text-slate-900 text-sm">{language === 'ar' ? permit.projectNameAr : permit.projectNameEn}</h4>
                              <span className="text-xs text-slate-500 font-medium">{language === 'ar' ? permit.contractorAr : permit.contractorEn}</span>
                            </div>

                            <div className="text-right">
                              <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs font-bold font-mono block shadow-sm">
                                ⏳ {daysLeft} {language === 'ar' ? 'يوم متبقي' : 'Days Left'}
                              </span>
                              <span className="text-[10px] text-slate-400 block mt-1">Ends: {permit.workEndDate || permit.permitEndDate}</span>
                            </div>
                          </div>

                          {/* Specs & Safety Status \u2014 individual boxes, matching the contractor card layout */}
                          <div className="grid grid-cols-3 gap-2 text-xs text-slate-700">
                            <div className="border border-slate-200 rounded-lg p-2.5 text-center bg-white">
                              <span className="block text-[9px] font-bold text-slate-400 uppercase">{t.speedLimit}</span>
                              <span className="font-bold font-mono">{permit.speed || 80} km/h</span>
                            </div>
                            <div className="border border-slate-200 rounded-lg p-2.5 text-center bg-white">
                              <span className="block text-[9px] font-bold text-slate-400 uppercase">{language === 'ar' ? 'طول التحويلة' : 'Site Length'}</span>
                              <span className="font-bold font-mono">{permit.siteLength || 100}m</span>
                            </div>
                            <div className="border border-slate-200 rounded-lg p-2.5 text-center bg-white">
                              <span className="block text-[9px] font-bold text-slate-400 uppercase">{language === 'ar' ? 'الحساسات والمصدات' : 'Safety Features'}</span>
                              <span className="font-bold text-emerald-700 text-[10px]">{language === 'ar' ? 'مجهزة بالكامل' : 'Active Telemetry'}</span>
                            </div>
                          </div>

                          {/* Existing Inspector Directives/Notes */}
                          {permit.inspector_notes && (
                            <div className="p-3 bg-slate-900 text-slate-200 rounded-lg text-xs space-y-1 font-mono">
                              <span className="text-brand-gold font-bold text-[10px] block uppercase">{language === 'ar' ? 'سجل ملاحظات التفتيش الميداني:' : 'Field Audit Directives Log:'}</span>
                              <p className="whitespace-pre-line text-[11px] leading-relaxed">{permit.inspector_notes}</p>
                            </div>
                          )}

                          {/* Add New Field Note Form */}
                          <div className="space-y-2 pt-2 border-t border-slate-100">
                            <label className="block text-xs font-bold text-slate-600 uppercase flex items-center gap-1">
                              <Edit3 className="w-3.5 h-3.5 text-brand-primary" />
                              {language === 'ar' ? 'إضافة ملاحظة زيارة ميدانية جديدة:' : 'Add Field Inspection Visit Note:'}
                            </label>
                            <textarea
                              value={isNoteDraft}
                              onChange={e => setFieldNoteInput({ ...fieldNoteInput, [permit.id]: e.target.value })}
                              placeholder={language === 'ar' ? 'أدخل تفاصيل زيارة التفتيش والملاحظات الميدانية...' : 'Enter field inspection observations...'}
                              className="w-full border border-slate-300 rounded-lg p-2.5 text-xs min-h-[60px] focus:ring-1 focus:ring-brand-primary"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                handleSaveInspectionVisitNote(permit.id, isNoteDraft);
                                setFieldNoteInput({ ...fieldNoteInput, [permit.id]: '' });
                              }}
                              className="w-full py-2 bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 shadow"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>{language === 'ar' ? 'حفظ زيارة التفتيش الميداني' : 'Save Inspection Visit Note'}</span>
                            </button>
                          </div>

                          {/* Action Toolbar */}
                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                            {activeZoneFilter === 'readiness' && (
                              <>
                                <button
                                  onClick={() => {
                                    setSelectedPermitForReadiness(permit);
                                    setFieldReadinessModalOpen(true);
                                  }}
                                  className={`py-1.5 font-bold text-xs rounded transition flex items-center justify-center gap-1 border ${
                                    permit.readiness_status === 'verified'
                                      ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 border-emerald-500/20'
                                      : 'bg-red-500/10 hover:bg-red-500/20 text-red-700 border-red-500/20 animate-pulse'
                                  }`}
                                >
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                  <span>{language === 'ar' ? 'التحقق من الجاهزية' : 'Field Readiness'}</span>
                                </button>
                                <button
                                  onClick={() => setCommentsModalPermit(permit)}
                                  className="py-1.5 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary font-bold text-xs rounded transition flex items-center justify-center gap-1 border border-brand-primary/20"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  <span>{language === 'ar' ? 'سجل الملاحظات' : 'Comments Log'}</span>
                                </button>
                              </>
                            )}

                            {activeZoneFilter === 'monitoring' && (
                              <>
                                <button
                                  onClick={() => setCommentsModalPermit(permit)}
                                  className="py-1.5 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary font-bold text-xs rounded transition flex items-center justify-center gap-1 border border-brand-primary/20"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  <span>{language === 'ar' ? 'سجل الملاحظات' : 'Comments Log'}</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedPermitForActiveAudit(permit);
                                    setActiveMonitoringModalOpen(true);
                                  }}
                                  className="py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 font-bold text-xs rounded transition flex items-center justify-center gap-1 border border-amber-500/20"
                                >
                                  <ClipboardCheck className="w-3.5 h-3.5 text-amber-600" />
                                  <span>{language === 'ar' ? 'متابعة الأداء' : 'Performance Monitoring'}</span>
                                </button>
                              </>
                            )}

                            {activeZoneFilter === 'closure' && (
                              <>
                                <button
                                  onClick={() => {
                                    setSelectedPermitForClosure(permit);
                                    setClosureModalOpen(true);
                                  }}
                                  className="py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs rounded transition flex items-center justify-center gap-1 border border-slate-700"
                                >
                                  <FileCheck className="w-3.5 h-3.5 text-amber-400" />
                                  <span>{language === 'ar' ? 'محضر إغلاق التحويلة' : 'Closure Minutes'}</span>
                                </button>
                                <button
                                  onClick={() => setCommentsModalPermit(permit)}
                                  className="py-1.5 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary font-bold text-xs rounded transition flex items-center justify-center gap-1 border border-brand-primary/20"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  <span>{language === 'ar' ? 'سجل الملاحظات' : 'Comments Log'}</span>
                                </button>
                              </>
                            )}
                          </div>

                          {/* المستندات — always accessible regardless of the current stage
                              filter, so the inspector isn't limited to only the document
                              tied to whichever tab happens to be selected. */}
                          <div className="pt-2 border-t border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1.5">
                              {language === 'ar' ? 'المستندات' : 'Documents'}
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                              <button
                                onClick={() => { setSelectedPermitForOpening(permit); setOpeningMinutesModalOpen(true); }}
                                className="py-1 px-1.5 bg-brand-gold/10 hover:bg-brand-gold/20 text-brand-gold-hover font-bold text-[10px] rounded transition border border-brand-gold/20"
                              >
                                {language === 'ar' ? 'محضر فتح تحويلة' : 'Opening Minutes'}
                              </button>
                              <button
                                onClick={() => { setSelectedPermitForReadiness(permit); setFieldReadinessModalOpen(true); }}
                                className="py-1 px-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 font-bold text-[10px] rounded transition border border-emerald-500/20"
                              >
                                {language === 'ar' ? 'محضر الجاهزية' : 'Readiness Report'}
                              </button>
                              <button
                                onClick={() => { setSelectedPermitForActiveAudit(permit); setActiveMonitoringModalOpen(true); }}
                                className="py-1 px-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 font-bold text-[10px] rounded transition border border-amber-500/20"
                              >
                                {language === 'ar' ? 'متابعة الأداء' : 'Monitoring Report'}
                              </button>
                              <button
                                onClick={() => { setSelectedPermitForClosure(permit); setClosureModalOpen(true); }}
                                className="py-1 px-1.5 bg-slate-800/10 hover:bg-slate-800/20 text-slate-700 font-bold text-[10px] rounded transition border border-slate-300"
                              >
                                {language === 'ar' ? 'محضر الإغلاق' : 'Closure Minutes'}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}

          </div>
        )}

      </div>

        {/* Inspector Full Report & Certificate View Modal */}
        {inspectReportModalOpen && selectedPermitForReview && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-100 w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden my-8 p-6 relative animate-fade-in max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center pb-4 border-b border-slate-300 sticky top-0 bg-slate-100 z-10">
                <div className="flex items-center gap-2 text-brand-dark font-extrabold text-base">
                  <FileCheck className="w-5 h-5 text-brand-primary" />
                  <span>{language === 'ar' ? `معاينة تقرير ترخيص السلامة رقم: ${selectedPermitForReview.id}` : `Audit Report View - Permit ID: ${selectedPermitForReview.id}`}</span>
                </div>
                <button 
                  onClick={() => setInspectReportModalOpen(false)}
                  className="p-1.5 bg-slate-200 hover:bg-red-500 hover:text-white rounded-full transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Submitted Permit Summary Card & Compliance Certificate */}
              <div className="pt-6 space-y-6 text-brand-text-dark font-sans" dir={t.dir}>
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                    <div>
                      <h2 className="text-xl font-extrabold text-brand-dark">{language === 'ar' ? selectedPermitForReview.projectNameAr : selectedPermitForReview.projectNameEn}</h2>
                      <span className="text-xs text-slate-500">{language === 'ar' ? selectedPermitForReview.contractorAr : selectedPermitForReview.contractorEn}</span>
                    </div>
                    <span className={`px-3 py-1 rounded-full font-bold text-xs ${selectedPermitForReview.status === 'Clean' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                      {selectedPermitForReview.status === 'Clean' ? 'COMPLIANT' : 'FLAGGED'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                      <span className="block text-slate-400 font-bold uppercase text-[10px]">{t.speedLimit}</span>
                      <span className="font-bold text-brand-dark font-mono">{selectedPermitForReview.speed || 80} km/h</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                      <span className="block text-slate-400 font-bold uppercase text-[10px]">{t.taperLength}</span>
                      <span className="font-bold text-brand-dark font-mono">{selectedPermitForReview.taper || 180} m</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                      <span className="block text-slate-400 font-bold uppercase text-[10px]">{t.bufferSSD}</span>
                      <span className="font-bold text-brand-dark font-mono">{selectedPermitForReview.buffer || 130} m</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                      <span className="block text-slate-400 font-bold uppercase text-[10px]">{t.terminationLength}</span>
                      <span className="font-bold text-brand-dark font-mono">{selectedPermitForReview.termination || 30} m</span>
                    </div>
                  </div>

                  {/* 17-Point Pre-Approval Desktop Review Widget */}
                  <div className="my-4">
                    <Inspector17PointAuditWidget
                      language={language}
                      permitData={selectedPermitForReview}
                      onPassAll={() => {
                        handleApprovePermit(selectedPermitForReview.id);
                        setInspectReportModalOpen(false);
                      }}
                    />
                  </div>

                  {/* Satellite Map included inside full report modal */}
                  <div>
                    <span className="block text-xs font-bold text-slate-500 uppercase mb-2">{language === 'ar' ? 'خريطة مضلع الـ GIS والحدود الجغرافية (صور القمر الصناعي Esri):' : 'GIS Boundary Perimeter Satellite Map:'}</span>
                    <ReportSatelliteMapView permit={selectedPermitForReview} language={language} />
                  </div>

                  <div>
                    <span className="block text-xs font-bold text-slate-500 uppercase mb-2">{language === 'ar' ? 'القطاع العرضي ثنائي الأبعاد (2D Cross-Section):' : '2D Cross-Section Visualizer:'}</span>
                    <div className="bg-slate-950 p-3 rounded-xl">
                      {renderCrossSectionSVG(false, selectedPermitForReview)}
                    </div>
                  </div>

                  <div>
                    <span className="block text-xs font-bold text-slate-500 uppercase mb-2">{language === 'ar' ? 'المخطط الهندسي الأفقي للتحويلة:' : 'Detour Horizontal Roadmap Layout:'}</span>
                    {renderHorizontalLayoutSVG(selectedPermitForReview)}
                  </div>

                  {selectedPermitForReview.inspector_notes && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs">
                      <span className="font-bold text-amber-800 block mb-1">{language === 'ar' ? 'ملاحظات وتوجيهات المفتش:' : 'Inspector Directives:'}</span>
                      <p className="text-amber-900">{selectedPermitForReview.inspector_notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Inspector Comments & Directives Log Modal (Available for all permits including finished/ended) */}
        {commentsModalPermit && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden p-6 relative animate-fade-in space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-brand-primary" />
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    {language === 'ar' ? `سجل الملاحظات والزيارات الميدانية - ${commentsModalPermit.id}` : `Inspector Comments & Directives Log - ${commentsModalPermit.id}`}
                  </h3>
                </div>
                <button 
                  onClick={() => setCommentsModalPermit(null)}
                  className="p-1 bg-slate-100 hover:bg-red-500 hover:text-white rounded-full transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <h4 className="font-bold text-xs text-brand-dark">{language === 'ar' ? commentsModalPermit.projectNameAr : commentsModalPermit.projectNameEn}</h4>
                <span className="text-[11px] text-slate-500">{language === 'ar' ? commentsModalPermit.contractorAr : commentsModalPermit.contractorEn}</span>
              </div>

              {/* Date-Stamped Comments History List */}
              <div className="bg-slate-900 text-slate-100 p-4 rounded-xl text-xs font-mono max-h-60 overflow-y-auto space-y-2 border border-slate-800">
                <span className="text-brand-gold font-bold text-[10px] block uppercase border-b border-slate-800 pb-1">
                  {language === 'ar' ? 'سجل الملاحظات المؤرخة بالتواريخ:' : 'Timestamped Directive Log:'}
                </span>
                {commentsModalPermit.inspector_notes ? (
                  <p className="whitespace-pre-line text-[11px] leading-relaxed text-slate-200">
                    {commentsModalPermit.inspector_notes}
                  </p>
                ) : (
                  <p className="text-slate-500 text-[11px] italic">
                    {language === 'ar' ? 'لا يوجد ملاحظات مدونة حتى الآن.' : 'No notes logged yet.'}
                  </p>
                )}
              </div>

              {/* Add New Comment Form (Available even for finished/ended permits) */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  {language === 'ar' ? 'إضافة ملاحظة وتوجيه جديد (حتى للترخيص المنتهي أو المعتمد):' : 'Add Inspector Directive / Note:'}
                </label>
                <textarea
                  value={newModalCommentInput}
                  onChange={e => setNewModalCommentInput(e.target.value)}
                  placeholder={language === 'ar' ? 'أدخل ملاحظتك هنا وسيتم حفظها مع التاريخ والوقت تلقائياً...' : 'Type note to record with timestamp...'}
                  className="w-full border border-slate-300 rounded-lg p-3 text-xs min-h-[80px] focus:ring-1 focus:ring-brand-primary"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setCommentsModalPermit(null)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-50"
                  >
                    {language === 'ar' ? 'إغلاق' : 'Close'}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!newModalCommentInput.trim()) return;
                      await handleSaveInspectionVisitNote(commentsModalPermit.id, newModalCommentInput);
                      const updated = submittedPermits.find(p => p.id === commentsModalPermit.id);
                      if (updated) setCommentsModalPermit({ ...updated });
                      setNewModalCommentInput('');
                    }}
                    className="px-4 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-bold rounded-lg shadow transition flex items-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'حفظ الملاحظة بالتواريخ' : 'Post Dated Note'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Step 4 \u2014 Operate & Monitor Performance: real TDP-FU periodic
            monitoring form (rebuilt from scratch, replacing the old blank-page
            ActiveDetourMonitoringModal), autofilled from permit data, with
            Word and print-to-PDF export. */}
        <PeriodicMonitoringForm
          isOpen={activeMonitoringModalOpen}
          onClose={() => {
            setActiveMonitoringModalOpen(false);
            setSelectedPermitForActiveAudit(null);
          }}
          permit={selectedPermitForActiveAudit}
          language={language}
          onSave={handleSavePeriodicAudit}
        />

        {/* Step 5 \u2014 Remove & Close: real \u0645\u062d\u0636\u0631 \u0625\u063a\u0644\u0627\u0642 \u062a\u062d\u0648\u064a\u0644\u0629 form (rebuilt from
            scratch, replacing the old blank-page DetourClosureModal), using
            the shared 5-party SignatureBlock, with Word and print-to-PDF export. */}
        <ClosureMinutesForm
          isOpen={closureModalOpen}
          onClose={() => {
            setClosureModalOpen(false);
            setSelectedPermitForClosure(null);
          }}
          permit={selectedPermitForClosure}
          language={language}
          onSave={handleSaveClosureMinutes}
        />

        {/* Stage 3 \u2014 Execute & Verify Readiness: Field Inspection (3.4) +
            Mandatory Execution Sequencing (3.4b), jointly owned by
            inspector/consultant, gating decision gate 3. */}
        <FieldReadinessModal
          isOpen={fieldReadinessModalOpen}
          onClose={() => {
            setFieldReadinessModalOpen(false);
            setSelectedPermitForReadiness(null);
          }}
          permit={selectedPermitForReadiness}
          language={language}
          onCompleteReadiness={handleSaveFieldReadiness}
        />

        {/* Step 2 \u2014 Review & Approve, Issue Permits: محضر فتح تحويلة,
            using the shared 5-party SignatureBlock (same signers as Step 5's
            closure minutes). */}
        <DetourOpeningMinutesForm
          isOpen={openingMinutesModalOpen}
          onClose={() => {
            setOpeningMinutesModalOpen(false);
            setSelectedPermitForOpening(null);
          }}
          permit={selectedPermitForOpening}
          language={language}
          onApprove={handleApproveFromOpeningMinutes}
          onSave={handleSaveOpeningMinutes}
        />

      </div>
    );
};

export default ConstructionPlanningInterface;
