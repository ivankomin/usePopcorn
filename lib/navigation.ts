import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

/**
 * Redirects an unauthenticated client user to `/login` while preserving
 * the current pathname and search query in the `?next=` parameter.
 */
export function redirectToLogin(router: AppRouterInstance): void {
  const currentPath =
    typeof window !== "undefined"
      ? window.location.pathname + window.location.search
      : "/";
  const next = currentPath ? `?next=${encodeURIComponent(currentPath)}` : "";
  router.push(`/login${next}`);
}

/**
 * Joins a pathname and URLSearchParams into a clean relative URL.
 */
export function buildUrlWithParams(
  pathname: string,
  params: URLSearchParams
): string {
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
