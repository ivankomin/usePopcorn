"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterDropdownProps {
  label: string;
  options: string[];
  value: string;
  onChange: (val: string) => void;
}

function FilterDropdown({
  label,
  options,
  value,
  onChange,
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hasSelected = value && value !== options[0];

  return (
    <div ref={dropdownRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "w-full h-11 px-4 rounded-xl flex items-center justify-between transition-colors text-sm border",
          "bg-[#212121] hover:bg-[#282828] border-neutral-700/60 focus:outline-none focus:border-brand-lime",
          hasSelected ? "text-white font-medium" : "text-neutral-400",
        )}
      >
        <span className="truncate">{hasSelected ? value : label}</span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-neutral-400 transition-transform duration-200 shrink-0 ml-2",
            isOpen && "rotate-180 text-white",
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute z-30 left-0 right-0 mt-1.5 py-1.5 bg-[#1f1f1f] border border-neutral-700 rounded-xl shadow-xl max-h-56 overflow-y-auto">
          {options.map((opt) => {
            const isSelected = (value || options[0]) === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onChange(opt);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full px-4 py-2 text-left text-sm transition-colors flex items-center justify-between",
                  isSelected
                    ? "bg-brand-lime/10 text-brand-lime font-semibold"
                    : "text-neutral-300 hover:bg-neutral-800 hover:text-white",
                )}
              >
                <span>{opt}</span>
                {isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-lime" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function CatalogFilters() {
  // Purely UI state — no actual filtering logic
  const [genre, setGenre] = useState("");
  const [runtime, setRuntime] = useState("");
  const [country, setCountry] = useState("");
  const [budget, setBudget] = useState("");
  const [ageRating, setAgeRating] = useState("");
  const [minRating, setMinRating] = useState<number>(0.0);
  const [maxRating, setMaxRating] = useState<number>(10.0);
  const [decade, setDecade] = useState("");

  // Mobile collapse state
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const filterOptions = {
    genre: [
      "All Genres",
      "Action",
      "Adventure",
      "Animation",
      "Comedy",
      "Crime",
      "Documentary",
      "Drama",
      "Fantasy",
      "Horror",
      "Sci-Fi",
      "Thriller",
    ],
    runtime: [
      "All Runtimes",
      "Under 90 min",
      "90–120 min",
      "120–150 min",
      "Over 150 min",
    ],
    country: [
      "All Countries",
      "United States",
      "United Kingdom",
      "France",
      "Japan",
      "South Korea",
      "Germany",
      "Canada",
      "Spain",
    ],
    budget: [
      "All Budgets",
      "Low (< $15M)",
      "Medium ($15M–$60M)",
      "High ($60M–$120M)",
      "Blockbuster (> $120M)",
    ],
    ageRating: [
      "All Age Ratings",
      "G",
      "PG",
      "PG-13",
      "R",
      "NC-17",
      "TV-14",
      "TV-MA",
    ],
    decade: [
      "All Decades",
      "2020s",
      "2010s",
      "2000s",
      "1990s",
      "1980s",
      "1970s & earlier",
    ],
  };

  const handleMinRatingChange = (val: number) => {
    const rounded = Math.round(val * 10) / 10;
    setMinRating(Math.min(rounded, maxRating));
  };

  const handleMaxRatingChange = (val: number) => {
    const rounded = Math.round(val * 10) / 10;
    setMaxRating(Math.max(rounded, minRating));
  };

  return (
    <aside className="w-full lg:w-64 xl:w-72 shrink-0 select-none lg:sticky lg:top-8 self-start lg:mt-18">
      {/* Mobile Toggle Button */}
      <div className="lg:hidden mb-4">
        <button
          type="button"
          onClick={() => setIsMobileOpen((prev) => !prev)}
          className="w-full flex items-center justify-between px-4 py-3 bg-[#181818] border border-neutral-800 rounded-2xl text-white font-medium text-sm"
        >
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-brand-lime" />
            Filters
          </span>
          <ChevronDown
            className={cn(
              "w-4 h-4 text-neutral-400 transition-transform",
              isMobileOpen && "rotate-180",
            )}
          />
        </button>
      </div>

      {/* Main Filter Sidebar Box */}
      <div
        className={cn(
          "bg-[#181818] border border-neutral-800 rounded-3xl p-5 sm:p-6 flex flex-col gap-4 shadow-lg max-h-[calc(100vh-4rem)] overflow-y-auto overscroll-contain",
          "hidden lg:flex",
          isMobileOpen && "flex",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-center">
          <h2 className="text-xl font-semibold text-white tracking-tight">
            Filters
          </h2>
        </div>

        {/* 1. Genre */}
        <FilterDropdown
          label="Genre"
          options={filterOptions.genre}
          value={genre}
          onChange={setGenre}
        />

        {/* 2. Runtime */}
        <FilterDropdown
          label="Runtime"
          options={filterOptions.runtime}
          value={runtime}
          onChange={setRuntime}
        />

        {/* 3. Country */}
        <FilterDropdown
          label="Country"
          options={filterOptions.country}
          value={country}
          onChange={setCountry}
        />

        {/* 4. Budget */}
        <FilterDropdown
          label="Budget"
          options={filterOptions.budget}
          value={budget}
          onChange={setBudget}
        />

        {/* 5. Age Rating */}
        <FilterDropdown
          label="Age Rating"
          options={filterOptions.ageRating}
          value={ageRating}
          onChange={setAgeRating}
        />

        {/* Rating Range Sliders (Min Rating & Max Rating) */}
        <div className="flex flex-col gap-4 w-full px-1 py-1">
          {/* Min Rating */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-bold tracking-wider">
              <span className="text-neutral-300 font-semibold">MIN RATING</span>
              <span className="text-brand-lime font-mono font-bold text-sm">
                {minRating.toFixed(1)}
              </span>
            </div>
            <div className="relative w-full h-5 flex items-center">
              {/* Slider Track Line */}
              <div className="w-full h-1 bg-brand-input rounded-full" />

              {/* Slider Thumb matching screenshot */}
              <div
                className="absolute pointer-events-none -translate-x-1/2 w-3.5 h-4.5 rounded-[5px] bg-[#e8e8e8] shadow-sm transition-[left] duration-75"
                style={{ left: `${(minRating / 10) * 100}%` }}
              />

              {/* Range Input */}
              <input
                type="range"
                min="0"
                max="10"
                step="0.1"
                value={minRating}
                onChange={(e) =>
                  handleMinRatingChange(parseFloat(e.target.value))
                }
                aria-label="Min Rating"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          </div>

          {/* Max Rating */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-bold tracking-wider">
              <span className="text-neutral-300 font-semibold">MAX RATING</span>
              <span className="text-brand-lime font-mono font-bold text-sm">
                {maxRating.toFixed(1)}
              </span>
            </div>
            <div className="relative w-full h-5 flex items-center">
              {/* Slider Track Line */}
              <div className="w-full h-1 bg-brand-input rounded-full" />

              {/* Slider Thumb matching screenshot */}
              <div
                className="absolute pointer-events-none -translate-x-1/2 w-3.5 h-4.5 rounded-[5px] bg-[#e8e8e8] shadow-sm transition-[left] duration-75"
                style={{ left: `${(maxRating / 10) * 100}%` }}
              />

              {/* Range Input */}
              <input
                type="range"
                min="0"
                max="10"
                step="0.1"
                value={maxRating}
                onChange={(e) =>
                  handleMaxRatingChange(parseFloat(e.target.value))
                }
                aria-label="Max Rating"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* 6. Decade */}
        <FilterDropdown
          label="Decade"
          options={filterOptions.decade}
          value={decade}
          onChange={setDecade}
        />
      </div>
    </aside>
  );
}
