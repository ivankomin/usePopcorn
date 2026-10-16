"use client";

import { useRef, useEffect } from "react";
import { ChevronDown, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MultiSelectDropdownProps {
  id: string;
  label: string;
  options: readonly string[] | string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  align?: "top" | "bottom";
}

export function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
  isOpen,
  onToggle,
  onClose,
  align = "top",
}: MultiSelectDropdownProps) {
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

  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter((item) => item !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const hasSelected = selected.length > 0;

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
              : "border-neutral-700/60 text-neutral-400",
        )}
      >
        <div className="flex items-center gap-1.5 truncate min-w-0">
          {!hasSelected ? (
            <span className="truncate">{label}</span>
          ) : selected.length === 1 ? (
            <span className="truncate text-white font-medium">
              {selected[0]}
            </span>
          ) : (
            <div className="flex items-center gap-1.5 truncate">
              <span className="truncate text-white font-medium">
                {selected[0]}
              </span>
              <span className="shrink-0 px-1.5 py-0.5 text-[11px] font-bold rounded-full bg-brand-lime/20 text-brand-lime">
                +{selected.length - 1}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {hasSelected && (
            <span
              onClick={clearAll}
              title="Clear selection"
              className="p-0.5 text-neutral-400 hover:text-white rounded-full hover:bg-neutral-700/60 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={cn(
              "w-4 h-4 transition-transform duration-200",
              isOpen ? "rotate-180 text-white" : "text-neutral-400",
            )}
          />
        </div>
      </button>

      {isOpen && (
        <div
          className={cn(
            "absolute z-50 py-2 bg-[#1c1c1c] border border-neutral-700 rounded-2xl shadow-2xl shadow-black/80 max-h-72 overflow-y-auto",
            // Mobile: standard dropdown below button
            "left-0 right-0 mt-1.5",
            // Desktop (lg:): fly out outside the sidebar to the right
            "lg:left-[calc(100%+12px)] lg:right-auto lg:mt-0 lg:w-60 xl:w-64",
            align === "bottom"
              ? "lg:top-auto lg:bottom-0"
              : "lg:top-0 lg:bottom-auto",
          )}
        >
          {/* Header with Title and Clear Action */}
          <div className="px-3.5 py-1.5 mb-1 border-b border-neutral-800 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-neutral-400 select-none">
            <span>
              {label} {hasSelected && `(${selected.length})`}
            </span>
            {hasSelected && (
              <button
                type="button"
                onClick={clearAll}
                className="text-[11px] lowercase tracking-normal text-brand-lime hover:underline cursor-pointer"
              >
                clear
              </button>
            )}
          </div>

          {/* Option Items with Checkboxes */}
          {options.map((opt) => {
            const isSelected = selected.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => toggleOption(opt)}
                className={cn(
                  "w-full px-3.5 py-2 text-left text-sm transition-colors flex items-center justify-between cursor-pointer rounded-lg mx-auto max-w-[calc(100%-8px)] group",
                  isSelected
                    ? "font-semibold"
                    : "text-neutral-300 hover:bg-neutral-800 hover:text-white",
                )}
              >
                <span className="truncate mr-2">{opt}</span>
                <span
                  className={cn(
                    "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                    isSelected
                      ? "bg-brand-lime border-brand-lime text-black"
                      : "border-neutral-600 bg-neutral-900/60 group-hover:border-neutral-400",
                  )}
                >
                  {isSelected && <Check className="w-3 h-3 stroke-3" />}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
