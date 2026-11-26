import en from "@/locales/en.json";
import uk from "@/locales/uk.json";
import {
  isSupportedLocale,
  translate,
  translateFilterOption,
  translateGenre,
  type Locale,
  type TranslationKey,
} from "@/lib/i18n";

function collectKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      keys.push(...collectKeys(value as Record<string, unknown>, path));
    } else {
      keys.push(path);
    }
  }
  return keys.sort();
}

describe("lib/i18n", () => {
  describe("isSupportedLocale", () => {
    it("accepts only en and uk", () => {
      expect(isSupportedLocale("en")).toBe(true);
      expect(isSupportedLocale("uk")).toBe(true);
      expect(isSupportedLocale("fr")).toBe(false);
      expect(isSupportedLocale(null)).toBe(false);
      expect(isSupportedLocale(123)).toBe(false);
    });
  });

  describe("translate", () => {
    it("resolves nested keys in English and Ukrainian", () => {
      expect(translate("en", "nav.home")).toBe("Home");
      expect(translate("uk", "nav.home")).toBe("Головна");
    });

    it("interpolates {{param}} placeholders and preserves unmatched tokens", () => {
      expect(translate("en", "catalog.found", { count: 42 })).toBe("42 Found");
      expect(translate("uk", "catalog.found", { count: 42 })).toBe(
        "Знайдено: 42",
      );
      expect(translate("en", "catalog.found", {})).toBe("{{count}} Found");
    });

    it("falls back to English for unknown locales and to the raw key if missing", () => {
      expect(translate("de" as Locale, "nav.movies")).toBe("Movies");
      expect(translate("en", "nonexistent.key" as TranslationKey)).toBe(
        "nonexistent.key",
      );
    });
  });

  describe("translateGenre & translateFilterOption", () => {
    it("translates known genres and passes through unknown genre names", () => {
      expect(translateGenre("en", "Science Fiction")).toBe("Science Fiction");
      expect(translateGenre("uk", "Science Fiction")).toBe("Фантастика");
      expect(translateGenre("uk", "Custom Genre")).toBe("Custom Genre");
    });

    it("translates known filter options and passes through unknown options", () => {
      expect(translateFilterOption("uk", "Under 90 min")).toBe("До 90 хв");
      expect(translateFilterOption("uk", "United States")).toBe("США");
      expect(translateFilterOption("uk", "Unmapped Option")).toBe(
        "Unmapped Option",
      );
    });
  });

  describe("dictionary parity", () => {
    it("keeps locales/en.json and locales/uk.json keys strictly in sync", () => {
      const enKeys = collectKeys(en as unknown as Record<string, unknown>);
      const ukKeys = collectKeys(uk as unknown as Record<string, unknown>);
      expect(ukKeys).toEqual(enKeys);
    });
  });
});
