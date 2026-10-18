"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronDown, Check } from "lucide-react";
import Loader from "@/components/Loader";
import { cn } from "@/lib/utils";
import { useOutsideClick } from "@/hooks/useOutsideClick";
import type { SortOption } from "@/types/media";

export interface SortOptionItem {
  value: SortOption;
  label: string;
}

export const SORT_OPTIONS: SortOptionItem[] = [
  { value: "popularity", label: "Most Popular" },
  { value: "vote_average_desc", label: "Highest Rating" },
  { value: "vote_average_asc", label: "Lowest Rating" },
  { value: "release_year_desc", label: "Release Year: Newest" },
  { value: "release_year_asc", label: "Release Year: Oldest" },
  { value: "title_asc", label: "Title: A to Z" },
  { value: "title_desc", label: "Title: Z to A" },
];

export interface SortDropdownProps {
  currentSort?: string;
  className?: string;
}

export default function SortDropdown({
  currentSort = "popularity",
  className,
}: SortDropdownProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Normalize currentSort to handle legacy values
  const normalizedSort =
    currentSort === "vote_average"
      ? "vote_average_desc"
      : currentSort === "release_year"
        ? "release_year_desc"
        : currentSort === "title"
          ? "title_asc"
          : currentSort;

  const currentOption =
    SORT_OPTIONS.find((opt) => opt.value === normalizedSort) || SORT_OPTIONS[0];

  // Close on outside click or Escape key
  useOutsideClick(dropdownRef, () => setIsOpen(false), isOpen);

  const handleSelect = (optionValue: SortOption) => {
    setIsOpen(false);
    if (optionValue === normalizedSort) return;

    const params = new URLSearchParams(searchParams.toString());
    if (optionValue === "popularity") {
      params.delete("sortBy");
    } else {
      params.set("sortBy", optionValue);
    }
    // Reset to page 1 upon changing sort order
    params.delete("page");

    const queryString = params.toString();
    const targetUrl = queryString ? `${pathname}?${queryString}` : pathname;

    startTransition(() => {
      router.push(targetUrl);
    });
  };

  return (
    <div ref={dropdownRef} className={cn("relative select-none", className)}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={cn(
          "h-10 px-3.5 sm:px-4 rounded-xl flex items-center gap-2 text-sm transition-all border cursor-pointer",
          "bg-[#181818] hover:bg-[#212121] hover:border-neutral-700",
          isOpen
            ? "border-brand-lime ring-1 ring-brand-lime/30 text-white"
            : "border-neutral-800 text-neutral-300",
        )}
      >
        <span className="text-neutral-400 font-normal hidden sm:inline">
          Sort by:
        </span>
        <span className="text-white font-medium truncate max-w-40 sm:max-w-none">
          {currentOption.label}
        </span>

        {isPending ? (
          <div className="w-4 h-4 flex items-center justify-center shrink-0 ml-1">
            <Loader size="sm" />
          </div>
        ) : (
          <ChevronDown
            className={cn(
              "w-4 h-4 text-neutral-400 transition-transform duration-200 shrink-0 ml-1",
              isOpen && "rotate-180 text-white",
            )}
          />
        )}
      </button>

      {isOpen && (
        <div
          role="listbox"
          className={cn(
            "absolute right-0 top-[calc(100%+8px)] z-50 w-56 py-1.5",
            "bg-[#1c1c1c] border border-neutral-700 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden",
          )}
        >
          <div className="px-3.5 py-1.5 mb-1 border-b border-neutral-800 text-[11px] font-bold uppercase tracking-wider text-neutral-400 select-none">
            Sort By
          </div>
          {SORT_OPTIONS.map((opt) => {
            const isSelected = opt.value === normalizedSort;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(opt.value)}
                className={cn(
                  "w-full px-3.5 py-2 text-left text-sm transition-colors flex items-center justify-between cursor-pointer rounded-lg mx-auto max-w-[calc(100%-8px)]",
                  isSelected
                    ? "font-semibold"
                    : "text-neutral-300 hover:bg-neutral-800 hover:text-white",
                )}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && (
                  <Check className="w-3.5 h-3.5 stroke-[2.5] text-brand-lime shrink-0 ml-2" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
