import React from 'react';
import { PenLine } from 'lucide-react';

// The same 5 signers appear on every official form in the source document:
// مندوب المقاول | الاستشاري | مندوب إدارة السلامة | مقاول الصيانة | استشاري الصيانة
export const SIGNER_ROLES = [
  { key: 'contractor', roleAr: 'مندوب المقاول', roleEn: 'Contractor Representative' },
  { key: 'consultant', roleAr: 'الاستشاري', roleEn: 'Consultant' },
  { key: 'safety_dept', roleAr: 'مندوب إدارة السلامة', roleEn: 'Safety Dept. Delegate' },
  { key: 'maintenance_contractor', roleAr: 'مقاول الصيانة', roleEn: 'Maintenance Contractor' },
  { key: 'maintenance_consultant', roleAr: 'استشاري الصيانة', roleEn: 'Maintenance Consultant' }
];

// signatures: { contractor: { name, date }, consultant: {...}, ... }
const SignatureBlock = ({ language, signatures, onChange }) => {
  const isArabic = language === 'ar';

  const update = (key, field, value) => {
    onChange({ ...signatures, [key]: { ...(signatures[key] || {}), [field]: value } });
  };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div className="bg-brand-light px-4 py-2.5 border-b border-slate-200 flex items-center gap-2">
        <PenLine className="w-4 h-4 text-brand-primary" />
        <h4 className="font-bold text-xs text-brand-text-dark">
          {isArabic ? 'التوقيعات' : 'Signatures'}
        </h4>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
        {SIGNER_ROLES.map(role => (
          <div key={role.key} className="p-3 space-y-2">
            <p className="text-[10px] font-bold text-brand-text-gray uppercase text-center leading-tight">
              {isArabic ? role.roleAr : role.roleEn}
            </p>
            <input
              type="text"
              placeholder={isArabic ? 'الاسم' : 'Name'}
              value={signatures[role.key]?.name || ''}
              onChange={(e) => update(role.key, 'name', e.target.value)}
              className="w-full text-[11px] border border-slate-200 rounded p-1.5 text-center focus:outline-none focus:border-brand-primary"
            />
            <input
              type="date"
              value={signatures[role.key]?.date || ''}
              onChange={(e) => update(role.key, 'date', e.target.value)}
              className="w-full text-[11px] border border-slate-200 rounded p-1.5 text-center focus:outline-none focus:border-brand-primary"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default SignatureBlock;
