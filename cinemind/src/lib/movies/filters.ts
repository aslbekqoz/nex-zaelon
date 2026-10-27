// Parses and validates the discovery filters from the URL. Pure, unit tested.

export type DiscoveryFilters = {
  yearFrom?: number;
  yearTo?: number;
  language?: string;
  minRating?: number;
};

export const RATING_STEPS = [5, 6, 7, 7.5, 8, 8.5];

const MIN_YEAR = 1874;

export function parseFilters(sp: Record<string, string | string[] | undefined>, now = new Date()): DiscoveryFilters {
  const one = (k: string) => {
    const v = sp[k];
    return (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
  };
  const maxYear = now.getFullYear() + 5;
  const year = (k: string) => {
    const v = one(k);
    if (!v || !/^\d{4}$/.test(v)) return undefined;
    const n = Number(v);
    return n >= MIN_YEAR && n <= maxYear ? n : undefined;
  };
  let yearFrom = year("from");
  let yearTo = year("to");
  if (yearFrom && yearTo && yearFrom > yearTo) [yearFrom, yearTo] = [yearTo, yearFrom];

  const lang = one("lang")?.toLowerCase();
  const minRatingRaw = Number(one("rating"));
  return {
    yearFrom,
    yearTo,
    language: lang && /^[a-z]{2,3}$/.test(lang) ? lang : undefined,
    minRating: RATING_STEPS.includes(minRatingRaw) ? minRatingRaw : undefined,
  };
}

export function hasFilters(f: DiscoveryFilters) {
  return Boolean(f.yearFrom || f.yearTo || f.language || f.minRating);
}

/** Query-string entries for the filters, for building links that keep them. */
export function filterParams(f: DiscoveryFilters): Record<string, string> {
  const out: Record<string, string> = {};
  if (f.yearFrom) out.from = String(f.yearFrom);
  if (f.yearTo) out.to = String(f.yearTo);
  if (f.language) out.lang = f.language;
  if (f.minRating) out.rating = String(f.minRating);
  return out;
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English", uz: "Uzbek", ru: "Russian", fr: "French", de: "German", es: "Spanish", it: "Italian", ja: "Japanese",
  ko: "Korean", zh: "Chinese", cn: "Cantonese", hi: "Hindi", tr: "Turkish", fa: "Persian", ar: "Arabic", pt: "Portuguese",
  sv: "Swedish", da: "Danish", no: "Norwegian", pl: "Polish", kk: "Kazakh", tg: "Tajik", ky: "Kyrgyz", th: "Thai",
};

export function languageName(code: string) {
  return LANGUAGE_NAMES[code] ?? code.toUpperCase();
}
