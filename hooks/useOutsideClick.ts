import { useEffect, useRef, type RefObject } from "react";

export interface UseOutsideClickOptions {
  enabled?: boolean;
  closeOnEscape?: boolean;
}

/**
 * Custom hook that triggers a callback when a click is detected outside of a referenced element
 * or when the Escape key is pressed.
 *
 * @param ref - Ref object pointing to the container element to detect clicks outside of.
 * @param handler - Callback function to run when an outside click or Escape key press occurs.
 * @param optionsOrEnabled - Either a boolean indicating whether the listener is active, or an options object.
 */
export function useOutsideClick<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T | null>,
  handler: () => void,
  optionsOrEnabled: boolean | UseOutsideClickOptions = true
): void {
  const enabled =
    typeof optionsOrEnabled === "boolean"
      ? optionsOrEnabled
      : (optionsOrEnabled.enabled ?? true);
  const closeOnEscape =
    typeof optionsOrEnabled === "boolean"
      ? true
      : (optionsOrEnabled.closeOnEscape ?? true);

  const savedHandler = useRef(handler);

  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!enabled) return;

    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        savedHandler.current();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (closeOnEscape && event.key === "Escape") {
        savedHandler.current();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [ref, enabled, closeOnEscape]);
}
