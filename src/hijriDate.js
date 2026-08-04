// Umm al-Qura Hijri calendar utility — the official Saudi civil calendar.
// Uses the browser's built-in ICU support (no external library needed).

const HIJRI_MONTHS_AR = [
  'محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة',
  'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
];

const DAY_NAMES_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const DAY_NAMES_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * @param {string} gregorianDateStr - 'YYYY-MM-DD'
 * @returns {{ hijriAr: string, hijriEn: string, dayNameAr: string, dayNameEn: string }}
 */
export function getHijriAndDayName(gregorianDateStr) {
  if (!gregorianDateStr) {
    return { hijriAr: '', hijriEn: '', dayNameAr: '', dayNameEn: '' };
  }

  const date = new Date(gregorianDateStr + 'T12:00:00');
  if (isNaN(date.getTime())) {
    return { hijriAr: '', hijriEn: '', dayNameAr: '', dayNameEn: '' };
  }

  const dayIndex = date.getDay();
  const dayNameAr = DAY_NAMES_AR[dayIndex];
  const dayNameEn = DAY_NAMES_EN[dayIndex];

  try {
    const parts = new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric'
    }).formatToParts(date);

    const day = parts.find(p => p.type === 'day')?.value;
    const month = parseInt(parts.find(p => p.type === 'month')?.value, 10);
    const year = parts.find(p => p.type === 'year')?.value;

    const hijriEn = `${day}/${month}/${year}`;
    const hijriAr = `${day} ${HIJRI_MONTHS_AR[month - 1] || ''} ${year}هـ`;

    return { hijriAr, hijriEn, dayNameAr, dayNameEn };
  } catch (err) {
    // Umm al-Qura calendar not supported in this environment — fail gracefully.
    console.error('Hijri conversion unavailable:', err);
    return { hijriAr: '', hijriEn: '', dayNameAr, dayNameEn };
  }
}
