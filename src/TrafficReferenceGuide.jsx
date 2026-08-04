import React, { useState } from 'react';
import { BookOpen, Ruler, Signpost, Lightbulb, Footprints, Shield, ChevronDown, ChevronUp } from 'lucide-react';
import {
  SIGN_SPACING_TABLE,
  ADVANCE_WARNING_FIRST_SIGN_DISTANCE_M,
  LIGHTING_EQUIPMENT,
  SIGN_PANEL_LIGHTING_SPEC,
  MIN_WORKZONE_LUX,
  PEDESTRIAN_MIN_PATH_WIDTH_M,
  PEDESTRIAN_PATH_TRIGGER_LENGTH_M,
  ROAD_NARROWING_CONTROL_TABLE,
  TWO_WAY_MIN_TOTAL_WIDTH_M,
  ALTERNATING_SINGLE_LANE_MIN_WIDTH_M,
  ROAD_MARKING_REPAINT_MONTHS,
  SITE_FENCING_REQUIRED_MONTHS,
  DURATION_CATEGORIES,
} from './trafficStandards';

// A reference/educational panel summarizing the definitions and standards
// tables from the source document, so contractors/inspectors can consult the
// rules inside the app instead of the paper PDF.

const Section = ({ icon, titleAr, titleEn, isAr, defaultOpen = false, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-slate-800/80 border border-slate-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-4 bg-slate-800 hover:bg-slate-700/80 transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon}
          <span className="font-semibold text-sm text-white">{isAr ? titleAr : titleEn}</span>
        </div>
        {open ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
      </button>
      {open && <div className="p-4 border-t border-slate-700 text-sm text-slate-300 space-y-3">{children}</div>}
    </div>
  );
};

const TrafficReferenceGuide = ({ language = 'ar' }) => {
  const isAr = language === 'ar';

  return (
    <div className={`p-6 bg-slate-900 border border-slate-700 rounded-xl shadow-lg text-slate-100 ${isAr ? 'text-right' : 'text-left'}`} dir={isAr ? 'rtl' : 'ltr'}>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-brand-gold" />
          {isAr ? 'دليل المرجعية الفنية للتحويلات المرورية' : 'Traffic Diversion Technical Reference Guide'}
        </h2>
        <p className="text-sm text-slate-400">
          {isAr
            ? 'تعريفات ومعايير مرجعية مأخوذة من كود أمانة منطقة المدينة المنورة، لمساعدة المقاولين والمفتشين أثناء التقديم والمراجعة.'
            : 'Reference definitions and standards from the Madinah Regional Municipality code, to assist contractors and inspectors during submission and review.'}
        </p>
      </div>

      <div className="space-y-4">
        {/* Definitions */}
        <Section icon={<Ruler className="w-5 h-5 text-brand-gold" />} titleAr="تعريفات مكونات التحويلة المرورية" titleEn="Diversion Component Definitions" isAr={isAr} defaultOpen>
          <p>
            {isAr
              ? 'التحويلة المرورية تتكون من منطقة تحذير، منطقة انتقال، منطقة عمل، مسار مرور مؤقت، ومنطقة إنهاء. تتميز بوضوح اللوحات، الفصل الآمن بين المرور والعمل، سهولة الحركة، وحماية المشاة والعمال.'
              : 'A traffic diversion consists of: a warning zone, a transition zone, a work zone, a temporary travel path, and a termination zone. It is characterized by clear signage, safe separation between traffic and work, ease of movement, and protection of pedestrians and workers.'}
          </p>
          <p>
            {isAr
              ? 'وسائل التحكم المروري المؤقتة تشمل: اللافتات التحذيرية والإرشادية، العلامات الأرضية المؤقتة، الحواجز والمخاريط والبراميل، ممرات آمنة للمشاة، إضاءة ووسائل تنبيه، وحامل راية أو سيارة سلامة عند الحاجة.'
              : 'Temporary traffic control devices include: warning/guidance signs, temporary road markings, barriers/cones/drums, safe pedestrian paths, lighting & warning devices, and a flag person or safety vehicle when needed.'}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
            {DURATION_CATEGORIES.map(d => (
              <div key={d.id} className="bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs">
                <div className="font-bold text-brand-gold">{isAr ? d.labelAr : d.labelEn}</div>
                <div className="text-slate-400 mt-1">{isAr ? d.ruleAr : d.ruleEn}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* Sign spacing table */}
        <Section icon={<Signpost className="w-5 h-5 text-brand-gold" />} titleAr="مسافات اللافتات في منطقة التحذير المبكر" titleEn="Advance Warning Sign Spacing">
          <p className="text-xs text-slate-400 mb-2">
            {isAr
              ? `أول لافتة تحذيرية تُوضع على بعد ${ADVANCE_WARNING_FIRST_SIGN_DISTANCE_M}م قبل بداية إغلاق المسار أو موضع التلويح بالعلم. المسافات بين اللافتات (أ/ب/ج/د) تُقاس من نقطة الصفر.`
              : `The first warning sign is placed ${ADVANCE_WARNING_FIRST_SIGN_DISTANCE_M}m before the start of the lane closure. Distances between signs (A/B/C/D) are measured from the zero point.`}
          </p>
          <table className="w-full text-xs border border-slate-700 rounded overflow-hidden" dir="ltr">
            <thead className="bg-slate-800 text-slate-300">
              <tr>
                <th className="p-2 text-left">{isAr ? 'السرعة حتى (كم/س)' : 'Speed up to (km/h)'}</th>
                <th className="p-2 text-center">A</th>
                <th className="p-2 text-center">B</th>
                <th className="p-2 text-center">C</th>
                <th className="p-2 text-center">D</th>
              </tr>
            </thead>
            <tbody>
              {SIGN_SPACING_TABLE.map((row, i) => (
                <tr key={i} className="border-t border-slate-700">
                  <td className="p-2 font-mono">{row.speedMax >= 999 ? '100+' : row.speedMax}</td>
                  <td className="p-2 text-center font-mono">{row.a}</td>
                  <td className="p-2 text-center font-mono">{row.b}</td>
                  <td className="p-2 text-center font-mono">{row.c}</td>
                  <td className="p-2 text-center font-mono">{row.d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        {/* Lighting */}
        <Section icon={<Lightbulb className="w-5 h-5 text-brand-gold" />} titleAr="وسائل الإنارة في مناطق العمل" titleEn="Work Zone Lighting Equipment">
          <p className="text-xs text-slate-400 mb-2">
            {isAr ? `الحد الأدنى المطلوب لإضاءة منطقة العمل: ${MIN_WORKZONE_LUX} لوكس.` : `Minimum required work zone lighting: ${MIN_WORKZONE_LUX} lux.`}
          </p>
          <div className="grid sm:grid-cols-2 gap-2">
            {LIGHTING_EQUIPMENT.map(eq => (
              <div key={eq.id} className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs">
                <div className="font-bold text-white">{isAr ? eq.labelAr : eq.labelEn}</div>
                <div className="text-slate-400 mt-1">{eq.usageAr}</div>
              </div>
            ))}
          </div>
          <table className="w-full text-xs border border-slate-700 rounded overflow-hidden mt-2" dir="ltr">
            <thead className="bg-slate-800 text-slate-300">
              <tr>
                <th className="p-2 text-left">{isAr ? 'نوع اللوح' : 'Panel Type'}</th>
                <th className="p-2 text-center">{isAr ? 'الحد الأدنى للمقاس (ملم)' : 'Min Size (mm)'}</th>
                <th className="p-2 text-center">{isAr ? 'عدد المصابيح' : 'Bulb Count'}</th>
                <th className="p-2 text-center">{isAr ? 'مسافة الوضوح (م)' : 'Visibility (m)'}</th>
              </tr>
            </thead>
            <tbody>
              {SIGN_PANEL_LIGHTING_SPEC.map((row, i) => (
                <tr key={i} className="border-t border-slate-700">
                  <td className="p-2 font-mono">{row.type}</td>
                  <td className="p-2 text-center font-mono">{row.minSizeMm}</td>
                  <td className="p-2 text-center font-mono">{row.minBulbCount}</td>
                  <td className="p-2 text-center font-mono">{row.minVisibilityM}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        {/* Pedestrian rules */}
        <Section icon={<Footprints className="w-5 h-5 text-brand-gold" />} titleAr="متطلبات حركة المشاة" titleEn="Pedestrian Path Requirements">
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>{isAr ? `عرض ممر المشاة المؤقت لا يقل عن ${PEDESTRIAN_MIN_PATH_WIDTH_M}م (150سم).` : `Minimum temporary pedestrian path width: ${PEDESTRIAN_MIN_PATH_WIDTH_M}m (150cm).`}</li>
            <li>{isAr ? `في الطرق التجارية والسكنية، إذا زاد طول التحويلة عن ${PEDESTRIAN_PATH_TRIGGER_LENGTH_M}م يجب توفير ممر آمن للمشاة.` : `On commercial/residential roads, a safe pedestrian path is mandatory if the diversion length exceeds ${PEDESTRIAN_PATH_TRIGGER_LENGTH_M}m.`}</li>
            <li>{isAr ? 'يجب توفير منحدرات لذوي الإعاقة وضمان استمرارية المسار المؤقت.' : 'Accessible ramps must be provided and the temporary path must remain continuous.'}</li>
          </ul>
        </Section>

        {/* Road narrowing */}
        <Section icon={<Shield className="w-5 h-5 text-brand-gold" />} titleAr="تضييق الطريق: أولوية / قف / إشارات متنقلة" titleEn="Road Narrowing: Priority / Stop / Portable Signals">
          <p className="text-xs text-slate-400 mb-2">
            {isAr
              ? `عند تعذر الحفاظ على عرض إجمالي لا يقل عن ${TWO_WAY_MIN_TOTAL_WIDTH_M}م للطريق ثنائي الاتجاه، يجب التشغيل التبادلي بعرض لا يقل عن ${ALTERNATING_SINGLE_LANE_MIN_WIDTH_M}م باستخدام أحد ضوابط التحكم التالية حسب حجم المرور والسرعة:`
              : `When a two-way road cannot maintain a total width of ${TWO_WAY_MIN_TOTAL_WIDTH_M}m, alternating single-lane operation (min ${ALTERNATING_SINGLE_LANE_MIN_WIDTH_M}m) is required, using one of the following controls based on volume & speed:`}
          </p>
          <table className="w-full text-xs border border-slate-700 rounded overflow-hidden" dir={isAr ? 'rtl' : 'ltr'}>
            <thead className="bg-slate-800 text-slate-300">
              <tr>
                <th className="p-2">{isAr ? 'السرعة حتى (كم/س)' : 'Speed up to (km/h)'}</th>
                <th className="p-2">{isAr ? 'حجم المرور' : 'Traffic Volume'}</th>
                <th className="p-2">{isAr ? 'الضابط المطلوب' : 'Required Control'}</th>
              </tr>
            </thead>
            <tbody>
              {ROAD_NARROWING_CONTROL_TABLE.map((row, i) => (
                <tr key={i} className="border-t border-slate-700">
                  <td className="p-2 text-center font-mono">{row.speedMax}</td>
                  <td className="p-2 text-center">{row.volumeBracketAr}</td>
                  <td className="p-2 text-center font-bold text-brand-gold">{isAr ? row.controlAr : row.controlEn}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        {/* Long-duration presentation rules */}
        <Section icon={<Ruler className="w-5 h-5 text-brand-gold" />} titleAr="متطلبات المشاريع طويلة المدة" titleEn="Long-Duration Project Requirements">
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>{isAr ? `إعادة دهان العلامات الأرضية إذا زادت مدة الأعمال عن ${ROAD_MARKING_REPAINT_MONTHS} أشهر.` : `Repaint road surface markings if works exceed ${ROAD_MARKING_REPAINT_MONTHS} months.`}</li>
            <li>{isAr ? `تغطية الموقع بالشبك/الألواح في الطرق الرئيسية والمحورية إذا زادت مدة العمل عن ${SITE_FENCING_REQUIRED_MONTHS} شهرين.` : `Cover the site with mesh/panels on main/arterial roads if works exceed ${SITE_FENCING_REQUIRED_MONTHS} months.`}</li>
          </ul>
        </Section>
      </div>
    </div>
  );
};

export default TrafficReferenceGuide;
