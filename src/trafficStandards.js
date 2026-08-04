// trafficStandards.js
// Centralized technical standards data extracted from the Madinah Regional
// Municipality "التحويلات المرورية" (Traffic Diversions) reference document.
// Keeping these as data (not hardcoded inline in components) makes them easy
// to audit against the source PDF and reuse across the calculator, the
// checklists, and the printable report.

// ---------------------------------------------------------------------------
// 1) Work duration classification (كل من مدة الأعمال وأثرها)
// ---------------------------------------------------------------------------
export const DURATION_CATEGORIES = [
  {
    id: 'long',
    labelAr: 'طويلة المدى',
    labelEn: 'Long-term',
    ruleAr: 'أكثر من 72 ساعة',
    ruleEn: 'More than 72 hours',
    minHours: 72,
    maxHours: Infinity,
  },
  {
    id: 'medium',
    labelAr: 'متوسطة المدى',
    labelEn: 'Medium-term',
    ruleAr: 'من 8 إلى 72 ساعة',
    ruleEn: '8 to 72 hours',
    minHours: 8,
    maxHours: 72,
  },
  {
    id: 'short',
    labelAr: 'قصيرة المدى',
    labelEn: 'Short-term',
    ruleAr: 'لا تزيد عن 8 ساعات',
    ruleEn: '8 hours or less',
    minHours: 0,
    maxHours: 8,
  },
  {
    id: 'mobile_emergency',
    labelAr: 'متحركة / طوارئ',
    labelEn: 'Mobile / Emergency',
    ruleAr: 'إشغال متحرك أو حادث خدمات، تخضع لتقييم المخاطر وترتيبات سريعة',
    ruleEn: 'Mobile works or an emergency service incident; subject to rapid risk assessment',
    minHours: 0,
    maxHours: Infinity,
    isEmergency: true,
  },
];

// ---------------------------------------------------------------------------
// 2) Advance-warning sign spacing table (المسافة بين اللافتات في منطقة
//    التحذير المبكر) — columns أ/ب/ج/د, distances measured from point zero.
// ---------------------------------------------------------------------------
export const SIGN_SPACING_TABLE = [
  { speedMax: 40, a: 90, b: 60, c: 30, d: 0 },
  { speedMax: 60, a: 300, b: 200, c: 100, d: 0 },
  { speedMax: 80, a: 600, b: 300, c: 150, d: 0 },
  { speedMax: 999, a: 1550, b: 750, c: 300, d: 0 }, // ≥100 km/h bracket
];

export function getSignSpacing(speedKmh) {
  const row = SIGN_SPACING_TABLE.find(r => speedKmh <= r.speedMax) || SIGN_SPACING_TABLE[SIGN_SPACING_TABLE.length - 1];
  return row;
}

// First warning sign distance before start of closure/detour (منطقة
// التحذيرية المتقدمة) — fixed 2000m per the standard regardless of speed.
export const ADVANCE_WARNING_FIRST_SIGN_DISTANCE_M = 2000;

// ---------------------------------------------------------------------------
// 3) Taper length formula (معادلة طول الاستدقاق)
//    L = W x V^2 / 155   for V <= 70 km/h
//    L = W x V x 0.625   for V >= 70 km/h   (equivalent to W*V/1.6)
// ---------------------------------------------------------------------------
export function calcTaperLength(lateralOffsetM, speedKmh) {
  const W = Number(lateralOffsetM) || 0;
  const V = Number(speedKmh) || 0;
  const taper = V <= 70 ? (W * Math.pow(V, 2)) / 155 : W * V * 0.625;
  return Math.round(taper * 10) / 10;
}

// ---------------------------------------------------------------------------
// 4) Barrier selection matrix (اختيار الحواجز)
//    Simplified 2D lookup: excavation/work type x duration -> barrier spec.
//    Road type ("رئيسية" / "فرعية") is captured as a modifier note since the
//    clearance figures in the source document are the same across both.
// ---------------------------------------------------------------------------
export const EXCAVATION_TYPES = [
  { id: 'closed_horizontal_bore', labelAr: 'الحفر المغلق (الثقب الأفقي)', labelEn: 'Closed excavation (horizontal bore)' },
  { id: 'vertical_shaft_wells', labelAr: 'الحفر العمودي والآبار', labelEn: 'Vertical excavation & wells' },
  { id: 'open_precise', labelAr: 'الحفر المفتوح الدقيق / بالغ الدقة', labelEn: 'Open excavation (precise / high-precision)' },
  { id: 'open_normal', labelAr: 'الحفر المفتوح العادي', labelEn: 'Open excavation (standard)' },
];

export const BARRIER_MATRIX = {
  // key = `${excavationTypeId}_${durationId}`
  closed_horizontal_bore_long: { barrierAr: 'حواجز خرسانية؛ منطقة سلامة عرضية عازلة لا تقل عن 1.5م من الحد الخلفي للحاجز، مع مسار بديل للمشاة عند إشغال الأرصفة.', clearanceM: 1.5 },
  closed_horizontal_bore_medium: { barrierAr: 'حواجز خرسانية أو بلاستيكية مملوءة بالماء؛ خلوص أفقي 2.5م بين منطقة العمل والحواجز.', clearanceM: 2.5 },
  closed_horizontal_bore_short: { barrierAr: 'حواجز بلاستيكية أو أقماع مرورية؛ خلوص أفقي 2.5م بين منطقة العمل والحواجز.', clearanceM: 2.5 },

  vertical_shaft_wells_long: { barrierAr: 'حواجز خرسانية؛ خلوص أفقي من 0.6 إلى 1.0م، ومسار بديل للمشاة عند الحاجة.', clearanceM: [0.6, 1.0] },
  vertical_shaft_wells_medium: { barrierAr: 'حواجز خرسانية أو بلاستيكية مملوءة بالماء؛ خلوص أفقي 2.5م.', clearanceM: 2.5 },
  vertical_shaft_wells_short: { barrierAr: 'حواجز بلاستيكية أو أقماع مرورية؛ خلوص أفقي 2.5م.', clearanceM: 2.5 },

  open_precise_long: { barrierAr: 'حواجز خرسانية؛ خلوص أفقي من 0.6 إلى 1.0م، ومسار بديل للمشاة عند وقوع الأعمال داخل الأرصفة.', clearanceM: [0.6, 1.0] },
  open_precise_medium: { barrierAr: 'حواجز خرسانية أو بلاستيكية مملوءة بالماء؛ خلوص أفقي 2.5م.', clearanceM: 2.5 },
  open_precise_short: { barrierAr: 'حواجز بلاستيكية أو أقماع مرورية؛ خلوص أفقي 2.5م.', clearanceM: 2.5 },

  open_normal_long: { barrierAr: 'حواجز خرسانية مع بنرات لتغطية موقع الحفر؛ خلوص أفقي 2.5م. (طرق رئيسية)', clearanceM: 2.5 },
  open_normal_medium: { barrierAr: 'حواجز خرسانية أو بلاستيكية مملوءة بالماء؛ خلوص أفقي 2.5م.', clearanceM: 2.5 },
  open_normal_short: { barrierAr: 'حواجز بلاستيكية أو أقماع مرورية؛ خلوص أفقي 2.5م.', clearanceM: 2.5 },
};

export function getBarrierSpec(excavationTypeId, durationId) {
  const key = `${excavationTypeId}_${durationId}`;
  return BARRIER_MATRIX[key] || null;
}

// Simple barrier-by-depth/duration rule already used elsewhere in the app,
// kept for backward compatibility with existing calculator logic.
export function getSimpleBarrierType(durationHours, depthCm) {
  if (depthCm > 60) return { id: 'concrete', labelAr: 'حواجز خرسانية' };
  if (durationHours <= 72 && depthCm <= 30) return { id: 'plastic_water', labelAr: 'حواجز بلاستيكية مملوءة بالماء/الرمل' };
  if (durationHours <= 8) return { id: 'cones', labelAr: 'أقماع ومخاريط مرورية' };
  return { id: 'plastic_water', labelAr: 'حواجز بلاستيكية مملوءة بالماء/الرمل' };
}

// ---------------------------------------------------------------------------
// 5) Lighting equipment table (وسائل التحكم المروري - الإنارة)
// ---------------------------------------------------------------------------
export const LIGHTING_EQUIPMENT = [
  {
    id: 'flood_lights',
    labelAr: 'الأضواء الكاشفة',
    labelEn: 'Flood Lights',
    usageAr: 'تستخدم في مواقع الحفر العميق، وعند ضعف إضاءة الطريق، ولتوضيح بعض العناصر والمعدات المتحركة.',
  },
  {
    id: 'flashing_warning_beacons',
    labelAr: 'الإشارات التشغيلية المتقطعة',
    labelEn: 'Flashing Warning Beacons',
    usageAr: 'ملزمة لكل أنواع الأعمال: كل 4م في مناطق العمل الصغيرة والمنحنيات، وكل 18م في المناطق المستقيمة، وتصل إلى 8م في المنطقة الانتقالية.',
  },
  {
    id: 'steady_burn_lamp',
    labelAr: 'المصابيح الكهربائية ثابتة التوهج',
    labelEn: 'Steady Burn Electrical Lamp',
    usageAr: 'تستعمل في مناطق العمل طويلة المدى لدعم وضوح الحواجز ومسار الحركة أثناء الليل.',
  },
  {
    id: 'arrow_board',
    labelAr: 'الأسهم المضيئة',
    labelEn: 'Arrow Board',
    usageAr: 'تثبت عند نقطة تقاطع المنطقة الانتقالية مع نهاية الحارة المرورية. يفضل سهم مضيء ليد بمقاس (1م طول × 2م عرض) مع إمكانية تغيير الاتجاه والرسائل.',
  },
];

// Sign panel lighting spec table (جدول مقاسات الإضاءة اللازمة لمواقع العمل)
export const SIGN_PANEL_LIGHTING_SPEC = [
  { type: 'أ', minSizeMm: '1200 × 600', minBulbCount: 12, minVisibilityM: 0.80 },
  { type: 'ب', minSizeMm: '750 × 135', minBulbCount: 13, minVisibilityM: 1.25 },
  { type: 'ج', minSizeMm: '2400 × 1200', minBulbCount: 15, minVisibilityM: 1.50 },
];

export const MIN_WORKZONE_LUX = 150;

// ---------------------------------------------------------------------------
// 6) Pedestrian path requirements (متطلبات حركة المشاة)
// ---------------------------------------------------------------------------
// NOTE: previously two components in this app disagreed on the minimum
// pedestrian path width (1.2m in PreApprovalChecklist.jsx vs 1.5m/150cm in
// the source PDF). Standardizing on the PDF's value here.
export const PEDESTRIAN_MIN_PATH_WIDTH_M = 1.5; // 150cm, per source document
export const PEDESTRIAN_PATH_TRIGGER_LENGTH_M = 400; // diversion length above which a pedestrian path becomes mandatory (commercial/residential roads)

export function isPedestrianPathMandatory(diversionLengthM, roadType) {
  const isCommercialOrResidential = roadType === 'commercial' || roadType === 'residential';
  return isCommercialOrResidential && Number(diversionLengthM) > PEDESTRIAN_PATH_TRIGGER_LENGTH_M;
}

// ---------------------------------------------------------------------------
// 7) Road-narrowing controls (تضييق الطريق: أولوية / قف / إشارات متنقلة)
//    Based on single-direction closures where the remaining two-way width
//    cannot be maintained at >= 6.6m.
// ---------------------------------------------------------------------------
export const ROAD_NARROWING_CONTROL_TABLE = [
  {
    speedMax: 50,
    volumeBracketAr: 'أقل من 700 مركبة/ساعة أو أقل من 40 مركبة/3 دقائق',
    controlAr: 'لافتات الأولوية',
    controlEn: 'Priority signs',
  },
  {
    speedMax: 80,
    volumeBracketAr: '800 – 1200 مركبة/ساعة أو 40 – 60 مركبة/3 دقائق',
    controlAr: 'لافتة قف + حد السرعة المؤقت',
    controlEn: 'Stop sign + temporary speed limit',
  },
  {
    speedMax: 100,
    volumeBracketAr: 'أكثر من 1200 مركبة/ساعة أو أكثر من 60 مركبة/3 دقائق',
    controlAr: 'إشارات متنقلة + حد السرعة المؤقت',
    controlEn: 'Portable signals + temporary speed limit',
  },
];

export function getRoadNarrowingControl(speedKmh) {
  const row = ROAD_NARROWING_CONTROL_TABLE.find(r => speedKmh <= r.speedMax) || ROAD_NARROWING_CONTROL_TABLE[ROAD_NARROWING_CONTROL_TABLE.length - 1];
  return row;
}

export const TWO_WAY_MIN_TOTAL_WIDTH_M = 6.6; // below this, must close/alternate single-lane
export const ALTERNATING_SINGLE_LANE_MIN_WIDTH_M = 3.3;

// ---------------------------------------------------------------------------
// 8) Long-duration site presentation rules
// ---------------------------------------------------------------------------
export const ROAD_MARKING_REPAINT_MONTHS = 3; // إعادة دهان العلامات الأرضية بعد 3 أشهر
export const SITE_FENCING_REQUIRED_MONTHS = 2; // تغطية الموقع بالشبك/الألواح على الطرق الرئيسية والمحورية بعد شهرين

export function needsRoadMarkingRepaint(workStartDate, todayDate = new Date()) {
  if (!workStartDate) return false;
  const start = new Date(workStartDate);
  const months = (todayDate.getFullYear() - start.getFullYear()) * 12 + (todayDate.getMonth() - start.getMonth());
  return months >= ROAD_MARKING_REPAINT_MONTHS;
}

export function needsSiteFencing(workStartDate, roadType, todayDate = new Date()) {
  if (!workStartDate) return false;
  if (!(roadType === 'main' || roadType === 'arterial')) return false;
  const start = new Date(workStartDate);
  const months = (todayDate.getFullYear() - start.getFullYear()) * 12 + (todayDate.getMonth() - start.getMonth());
  return months >= SITE_FENCING_REQUIRED_MONTHS;
}

// ---------------------------------------------------------------------------
// 9) The 20 mandatory execution/implementation requirements
//    (متطلبات تنفيذ خطة تحويل الحركة المرورية في مناطق العمل)
//    This is distinct from the 20-item FIELD READINESS checklist already in
//    FieldInspectionChecklist.jsx — this list governs execution SEQUENCING.
// ---------------------------------------------------------------------------
export const MANDATORY_IMPLEMENTATION_REQUIREMENTS = [
  { id: 1, ar: 'تقسيم التنفيذ إلى مراحل تحويل تدريجي بالتنسيق مع المرور.', en: 'Phase implementation into gradual diversion stages, coordinated with traffic police.' },
  { id: 2, ar: 'عدم تنفيذ عكس الاتجاه أو الإغلاق الكلي إلا بعد الإعلان.', en: 'No reverse-direction operation or full closure without prior public notice.' },
  { id: 3, ar: 'وجود حامل راية لتوجيه المركبات وفق المواصفات.', en: 'A flag/signal person present to direct vehicles per spec.' },
  { id: 4, ar: 'تركيب عناصر التحويلة باتجاه الحركة وإزالتها عكس الاتجاه.', en: 'Install diversion elements in the direction of travel; remove in reverse order.' },
  { id: 5, ar: 'تغطية أو إزالة العلامات واللوحات المتعارضة حسب مدة العمل.', en: 'Cover or remove conflicting existing signs/markings for the duration of works.' },
  { id: 6, ar: 'إعادة العلامات الأرضية بعد انتهاء الأعمال للوضع الصحيح.', en: 'Restore road surface markings to correct state after work completion.' },
  { id: 7, ar: 'قياس جميع الأبعاد من نقطة الصفر المحددة بالموقع.', en: 'Measure all distances from the defined zero point on site.' },
  { id: 8, ar: 'وضع سيارة سلامة مجهزة في منطقة التحذير المبكر.', en: 'Station an equipped safety vehicle in the advance warning area.' },
  { id: 9, ar: 'تعيين فرقة صيانة مناوبة على مدار الساعة.', en: 'Assign a 24/7 on-call maintenance crew.' },
  { id: 10, ar: 'تأمين بوابة دخول وخروج للمعدات بمنطقة العمل.', en: 'Secure a designated equipment entry/exit gate at the work zone.' },
  { id: 11, ar: 'جعل مسارات المرور مرئية وواضحة لمستخدمي الطريق.', en: 'Keep traffic lanes visible and clear for road users.' },
  { id: 12, ar: 'تثبيت لوحة تعريفية بالمشروع في موقع العمل.', en: 'Install a project identification board at the work site.' },
  { id: 13, ar: 'وضع أدوات توجيه بين مسار المرور السالك ومنطقة العمل.', en: 'Place channelizing devices between the open traffic lane and the work zone.' },
  { id: 14, ar: 'تأمين مخارج ومداخل آمنة للمعدات من وإلى الموقع.', en: 'Secure safe equipment entry/exit routes to and from the site.' },
  { id: 15, ar: 'وضع العلامات التحذيرية واستخدام السيارة الحاملة للوحات الحذرة.', en: 'Deploy warning signs and a sign-carrying vehicle where required.' },
  { id: 16, ar: 'استخدام الرايات والأضواء الومضية على سيارات العمل المتداخلة.', en: 'Use flags and flashing lights on work vehicles interacting with traffic.' },
  { id: 17, ar: 'استخدام الحواجز الخرسانية عند محاذاة العمل لمسار المرور.', en: 'Use concrete barriers when the work zone runs alongside an active traffic lane.' },
  { id: 18, ar: 'استخدام البراميل البلاستيكية عند نهاية منطقة العمل.', en: 'Use plastic drums at the end of the work zone.' },
  { id: 19, ar: 'الالتزام بالمواعيد المحددة وعدم التأخر عن الخطة المرورية.', en: 'Adhere to scheduled timing; no delays against the approved traffic plan.' },
  { id: 20, ar: 'توفير ممرات آمنة للمشاة والدراجات ومسارات بديلة عند الحاجة.', en: 'Provide safe pedestrian/cyclist paths and alternate routes as needed.' },
];

// ---------------------------------------------------------------------------
// 10) Temporary steel trench plate installation (تركيب اللوح المعدني المؤقت)
//     Kept as structured reference data so a diagram/description can be
//     rendered conditionally when a project declares open trenches.
// ---------------------------------------------------------------------------
export const STEEL_TRENCH_PLATE_KEY_POINTS = [
  { id: 1, ar: 'اللوح المعدني داخل منطقة الكشط وبنفس منسوب الطريق.' },
  { id: 2, ar: 'عمق الكشط يساوي سماكة اللوح المعدني.' },
  { id: 3, ar: 'تثبيت ميكانيكي لمنع الحركة والاهتزاز.' },
  { id: 4, ar: 'فرشة ضبط أسفل مناطق الارتكاز.' },
  { id: 5, ar: 'الخندق أو الحفر أسفل اللوح.' },
  { id: 6, ar: 'سطح خشن أو معالجة مانعة للانزلاق.' },
  { id: 7, ar: 'حواجز وأقماع ولوحات تحذيرية.' },
  { id: 8, ar: 'حدود الكشط تكون أكبر من حدود اللوح.' },
];
export const STEEL_TRENCH_PLATE_MIN_RETENTION_CM = 40; // ارتكاز لا يقل عن 40سم

// ---------------------------------------------------------------------------
// 11) Explicit 5-stage lifecycle labels + decision gates (for stepper UI)
// ---------------------------------------------------------------------------
export const LIFECYCLE_STAGES = [
  {
    id: 1,
    labelAr: 'إعداد ورفع الطلب',
    labelEn: 'Prepare & Submit Request',
    responsibleAr: 'المقاول / الاستشاري',
    gateAr: 'بوابة القرار: استكمال المستندات قبل الرفع',
    gateEn: 'Decision gate: documents complete before submission',
  },
  {
    id: 2,
    labelAr: 'مراجعة واعتماد خطة التحكم المروري وإصدار التصاريح',
    labelEn: 'Review, Approve & Issue Permits',
    responsibleAr: 'إدارة السلامة المرورية / الجهات المختصة',
    gateAr: 'بوابة القرار: المطابقة الفنية قبل الاعتماد',
    gateEn: 'Decision gate: technical conformity before approval',
  },
  {
    id: 3,
    labelAr: 'تنفيذ والتحقق من الجاهزية',
    labelEn: 'Implement & Verify Readiness',
    responsibleAr: 'المقاول / الاستشاري / إدارة السلامة',
    gateAr: 'بوابة القرار: محضر الجاهزية قبل التشغيل',
    gateEn: 'Decision gate: readiness report before operation',
  },
  {
    id: 4,
    labelAr: 'تشغيل ومتابعة الأداء',
    labelEn: 'Operate & Monitor Performance',
    responsibleAr: 'المقاول / الاستشاري / إدارة السلامة المرورية',
    gateAr: null,
    gateEn: null,
  },
  {
    id: 5,
    labelAr: 'إزالة وإغلاق التحويلة',
    labelEn: 'Remove, Restore & Close',
    responsibleAr: 'المقاول / الاستشاري / إدارة السلامة المرورية',
    gateAr: 'بوابة القرار: معاينة نهائية قبل الإغلاق',
    gateEn: 'Decision gate: final inspection before closure',
  },
];

// ---------------------------------------------------------------------------
// 12) Road classification & traffic volume options (used by Step 1 form and
//     the road-narrowing / barrier logic above)
// ---------------------------------------------------------------------------
export const ROAD_CLASSIFICATIONS = [
  { id: 'local', labelAr: 'محلي', labelEn: 'Local' },
  { id: 'collector', labelAr: 'تجميعي', labelEn: 'Collector' },
  { id: 'main', labelAr: 'رئيسي / سريع', labelEn: 'Main / Expressway' },
  { id: 'commercial', labelAr: 'تجاري', labelEn: 'Commercial' },
  { id: 'residential', labelAr: 'سكني', labelEn: 'Residential' },
];

export const TRAFFIC_VOLUME_LEVELS = [
  { id: 'low', labelAr: 'منخفض', labelEn: 'Low' },
  { id: 'medium', labelAr: 'متوسط', labelEn: 'Medium' },
  { id: 'high', labelAr: 'عالي', labelEn: 'High' },
];
