"use client";

import { useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FilterDropdownProps {
  id: string;
  label: string;
  options: readonly string[] | string[];
  value: string;
  onChange: (val: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  align?: "top" | "bottom";
}

export function FilterDropdown({
  label,
  options,
  value,
  onChange,
  isOpen,
  onToggle,
  onClose,
  align = "top",
}: FilterDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const hasSelected = value && value !== options[0];

  return (
    <div ref={dropdownRef} className="relative w-full">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className={cn(
          "w-full h-11 px-4 rounded-xl flex items-center justify-between transition-all text-sm border cursor-pointer select-none",
          "bg-[#212121] hover:bg-[#282828] focus:outline-none",
          isOpen
            ? "border-brand-lime ring-1 ring-brand-lime/30 text-white"
            : hasSelected
              ? "border-neutral-600 text-white font-medium"
              : "border-neutral-700/60 text-neutral-400"
        )}
      >
        <span className="truncate">{hasSelected ? value : label}</span>
        <ChevronDown
          className={cn(
            "w-4 h-4 transition-transform duration-200 shrink-0 ml-2",
            isOpen ? "rotate-180 text-white" : "text-neutral-400"
          )}
        />
      </button>

      {isOpen && (
        <div
          className={cn(
            "absolute z-50 py-2 bg-[#1c1c1c] border border-neutral-700 rounded-2xl shadow-2xl shadow-black/80 max-h-72 overflow-y-auto",
            "left-0 right-0 mt-1.5",
            "lg:left-[calc(100%+12px)] lg:right-auto lg:mt-0 lg:w-60 xl:w-64",
            align === "bottom"
              ? "lg:top-auto lg:bottom-0"
              : "lg:top-0 lg:bottom-auto"
          )}
        >
          <div className="px-3.5 py-1.5 mb-1 border-b border-neutral-800 text-[11px] font-bold uppercase tracking-wider text-neutral-400 select-none">
            {label}
          </div>
          {options.map((opt) => {
            const isSelected = (value || options[0]) === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onChange(opt);
                  onClose();
                }}
                className={cn(
                  "w-full px-3.5 py-2 text-left text-sm transition-colors flex items-center justify-between cursor-pointer rounded-lg mx-auto max-w-[calc(100%-8px)]",
                  isSelected
                    ? "bg-brand-lime/10 text-brand-lime font-semibold"
                    : "text-neutral-300 hover:bg-neutral-800 hover:text-white"
                )}
              >
                <span className="truncate">{opt}</span>
                {isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-lime shrink-0 ml-2" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
