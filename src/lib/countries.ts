/**
 * @fileOverview قائمة موحدة وشاملة للدول العربية لاستخدامها في كافة أنحاء المنصة.
 */

export interface Country {
  code: string;
  name: string;
  flag: string;
}

export const ARAB_COUNTRIES: Country[] = [
  { code: "LY", name: "ليبيا", flag: "🇱🇾" },
  { code: "PS", name: "فلسطين", flag: "🇵🇸" },
  { code: "EG", name: "مصر", flag: "🇪🇬" },
  { code: "DZ", name: "الجزائر", flag: "🇩🇿" },
  { code: "MA", name: "المغرب", flag: "🇲🇦" },
  { code: "TN", name: "تونس", flag: "🇹🇳" },
  { code: "SA", name: "السعودية", flag: "🇸🇦" },
  { code: "IQ", name: "العراق", flag: "🇮🇶" },
  { code: "JO", name: "الأردن", flag: "🇯🇴" },
  { code: "SY", name: "سوريا", flag: "🇸🇾" },
  { code: "LB", name: "لبنان", flag: "🇱🇧" },
  { code: "YE", name: "اليمن", flag: "🇾🇪" },
  { code: "SD", name: "السودان", flag: "🇸🇩" },
  { code: "AE", name: "الإمارات", flag: "🇦🇪" },
  { code: "KW", name: "الكويت", flag: "🇰🇼" },
  { code: "OM", name: "عمان", flag: "🇴🇲" },
  { code: "QA", name: "قطر", flag: "🇶🇦" },
  { code: "BH", name: "البحرين", flag: "🇧🇭" },
  { code: "MR", name: "موريتانيا", flag: "🇲🇷" },
  { code: "SO", name: "الصومال", flag: "🇸🇴" },
  { code: "DJ", name: "جيبوتي", flag: "🇩🇯" },
  { code: "KM", name: "جزر القمر", flag: "🇰🇲" }
];

export function getCountryByCode(code: string): Country | undefined {
  return ARAB_COUNTRIES.find(c => c.code === code);
}

export function getCountryDisplayName(code: string): string {
  const country = getCountryByCode(code);
  return country ? `${country.flag} ${country.name}` : code;
}
