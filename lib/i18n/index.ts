import en from "@/locales/en.json";
import uk from "@/locales/uk.json";

export type Locale = "en" | "uk";

export const DEFAULT_LOCALE: Locale = "en";
export const SUPPORTED_LOCALES: readonly Locale[] = ["en", "uk"] as const;
export const LOCALE_STORAGE_KEY = "usepopcorn_locale";
export const LOCALE_COOKIE_NAME = "usepopcorn_locale";

type Dictionary = typeof en;

const DICTIONARIES: Record<Locale, Dictionary> = {
  en,
  uk,
};

type DotPaths<T, Prefix extends string = ""> = T extends Record<string, unknown>
  ? {
      [K in keyof T & string]: T[K] extends Record<string, unknown>
        ? DotPaths<T[K], Prefix extends "" ? K : `${Prefix}.${K}`>
        : Prefix extends ""
          ? K
          : `${Prefix}.${K}`;
    }[keyof T & string]
  : never;

export type TranslationKey = DotPaths<
  Omit<Dictionary, "genres" | "filterOptions">
>;

export type TranslationParams = Record<string, string | number>;

export function isSupportedLocale(value: unknown): value is Locale {
  return value === "en" || value === "uk";
}

function resolvePath(obj: Record<string, unknown>, path: string): string | null {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (
      current &&
      typeof current === "object" &&
      part in (current as Record<string, unknown>)
    ) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return null;
    }
  }
  return typeof current === "string" ? current : null;
}

/**
 * Resolves a typed dot-notation translation key from the active JSON dictionary
 * with optional `{{param}}` interpolation.
 */
export function translate(
  locale: Locale,
  key: TranslationKey,
  params?: TranslationParams,
): string {
  const dict = DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
  const raw =
    resolvePath(dict as unknown as Record<string, unknown>, key) ??
    resolvePath(DICTIONARIES.en as unknown as Record<string, unknown>, key) ??
    key;

  if (!params) return raw;

  return raw.replace(/\{\{(\w+)\}\}/g, (_, token: string) =>
    params[token] !== undefined ? String(params[token]) : `{{${token}}}`,
  );
}

/**
 * Translates a canonical English TMDB genre name into the active locale.
 */
export function translateGenre(locale: Locale, genreName: string): string {
  const map = DICTIONARIES[locale]?.genres as Record<string, string> | undefined;
  return map?.[genreName] ?? genreName;
}

/**
 * Translates a canonical English filter option value (runtime/country/budget/etc.)
 * into the active locale while keeping URL/DB query values unchanged.
 */
export function translateFilterOption(locale: Locale, option: string): string {
  const map = DICTIONARIES[locale]?.filterOptions as
    | Record<string, string>
    | undefined;
  return map?.[option] ?? option;
}
