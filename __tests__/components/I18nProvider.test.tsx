/** @jest-environment jsdom */
import type { ReactNode } from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import { I18nProvider, useI18n } from "@/components/I18nProvider";
import { LOCALE_COOKIE_NAME, LOCALE_STORAGE_KEY } from "@/lib/i18n";

function wrapper({ children }: { children: ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}

describe("I18nProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    document.cookie = `${LOCALE_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    document.documentElement.lang = "";
  });

  it("throws when useI18n is called outside I18nProvider", () => {
    expect(() => renderHook(() => useI18n())).toThrow(
      "useI18n must be used within an I18nProvider",
    );
  });

  it("defaults to English and switches locale with persistence", () => {
    const { result } = renderHook(() => useI18n(), { wrapper });

    expect(result.current.locale).toBe("en");
    expect(result.current.t("catalog.filtersTitle")).toBeTruthy();

    act(() => {
      result.current.setLocale("uk");
    });

    expect(result.current.locale).toBe("uk");
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("uk");
    expect(document.cookie).toContain(`${LOCALE_COOKIE_NAME}=uk`);
    expect(document.documentElement.lang).toBe("uk");
  });

  it("hydrates persisted locale from localStorage on mount", async () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, "uk");

    const { result } = renderHook(() => useI18n(), { wrapper });

    await waitFor(() => expect(result.current.locale).toBe("uk"));
    expect(document.documentElement.lang).toBe("uk");
  });

  it("hydrates persisted locale from cookie when localStorage is empty", async () => {
    document.cookie = `${LOCALE_COOKIE_NAME}=uk; path=/`;

    const { result } = renderHook(() => useI18n(), { wrapper });

    await waitFor(() => expect(result.current.locale).toBe("uk"));
  });
});
