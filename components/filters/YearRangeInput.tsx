"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface YearRangeInputProps {
  minYear: number;
  maxYear: number;
  onMinYearChange: (val: number) => void;
  onMaxYearChange: (val: number) => void;
  minLimit?: number;
  maxLimit?: number;
}

export function YearRangeInput({
  minYear,
  maxYear,
  onMinYearChange,
  onMaxYearChange,
  minLimit = 1900,
  maxLimit = 2026,
}: YearRangeInputProps) {
  // Temporary draft state only while the user is actively typing into the field
  const [minDraft, setMinDraft] = useState<string | null>(null);
  const [maxDraft, setMaxDraft] = useState<string | null>(null);

  // Derive display values directly during render
  const minDisplay = minDraft ?? minYear.toString();
  const maxDisplay = maxDraft ?? maxYear.toString();

  // Handle Stepper Up / Down
  const handleMinStep = (delta: number) => {
    const nextVal = Math.min(Math.max(minYear + delta, minLimit), maxYear);
    onMinYearChange(nextVal);
    setMinDraft(null);
  };

  const handleMaxStep = (delta: number) => {
    const nextVal = Math.max(Math.min(maxYear + delta, maxLimit), minYear);
    onMaxYearChange(nextVal);
    setMaxDraft(null);
  };

  // Handle Typing & Clamping on Blur / Enter
  const handleMinBlur = () => {
    if (minDraft === null) return;
    const parsed = parseInt(minDraft, 10);
    if (!isNaN(parsed)) {
      const clamped = Math.min(Math.max(parsed, minLimit), maxYear);
      onMinYearChange(clamped);
    }
    setMinDraft(null);
  };

  const handleMaxBlur = () => {
    if (maxDraft === null) return;
    const parsed = parseInt(maxDraft, 10);
    if (!isNaN(parsed)) {
      const clamped = Math.max(Math.min(parsed, maxLimit), minYear);
      onMaxYearChange(clamped);
    }
    setMaxDraft(null);
  };

  return (
    <div className="flex flex-col gap-2.5 w-full">
      <div className="flex flex-col gap-1.5 w-full">
        <label
          htmlFor="min-year-input"
          className="text-xs font-bold tracking-wider text-neutral-300 uppercase select-none"
        >
          MIN YEAR
        </label>
        <div
          className={cn(
            "w-full h-11 rounded-xl bg-[#212121] border border-neutral-700/60 flex items-center justify-between transition-all",
            "hover:border-neutral-600 focus-within:border-brand-lime focus-within:ring-1 focus-within:ring-brand-lime/30"
          )}
        >
          <input
            id="min-year-input"
            type="number"
            min={minLimit}
            max={maxYear}
            value={minDisplay}
            onChange={(e) => setMinDraft(e.target.value)}
            onBlur={handleMinBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleMinBlur();
            }}
            className="w-full h-full bg-transparent pl-4 pr-2 text-sm text-white font-medium outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <div className="flex items-center shrink-0 pr-3">
            <div className="h-5 w-px bg-neutral-700/60 mr-2.5" />
            <div className="flex flex-col items-center justify-center gap-0.5">
              <button
                type="button"
                onClick={() => handleMinStep(1)}
                disabled={minYear >= maxYear}
                aria-label="Increase Min Year"
                className="text-neutral-400 hover:text-white disabled:text-neutral-600 disabled:cursor-not-allowed transition-colors cursor-pointer leading-none"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleMinStep(-1)}
                disabled={minYear <= minLimit}
                aria-label="Decrease Min Year"
                className="text-neutral-400 hover:text-white disabled:text-neutral-600 disabled:cursor-not-allowed transition-colors cursor-pointer leading-none"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="w-3.5 h-0.5 bg-neutral-700 rounded-full my-0.5 ml-1" />

      <div className="flex flex-col gap-1.5 w-full">
        <label
          htmlFor="max-year-input"
          className="text-xs font-bold tracking-wider text-neutral-300 uppercase select-none"
        >
          MAX YEAR
        </label>
        <div
          className={cn(
            "w-full h-11 rounded-xl bg-[#212121] border border-neutral-700/60 flex items-center justify-between transition-all",
            "hover:border-neutral-600 focus-within:border-brand-lime focus-within:ring-1 focus-within:ring-brand-lime/30"
          )}
        >
          <input
            id="max-year-input"
            type="number"
            min={minYear}
            max={maxLimit}
            value={maxDisplay}
            onChange={(e) => setMaxDraft(e.target.value)}
            onBlur={handleMaxBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleMaxBlur();
            }}
            className="w-full h-full bg-transparent pl-4 pr-2 text-sm text-white font-medium outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <div className="flex items-center shrink-0 pr-3">
            <div className="h-5 w-px bg-neutral-700/60 mr-2.5" />
            <div className="flex flex-col items-center justify-center gap-0.5">
              <button
                type="button"
                onClick={() => handleMaxStep(1)}
                disabled={maxYear >= maxLimit}
                aria-label="Increase Max Year"
                className="text-neutral-400 hover:text-white disabled:text-neutral-600 disabled:cursor-not-allowed transition-colors cursor-pointer leading-none"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleMaxStep(-1)}
                disabled={maxYear <= minYear}
                aria-label="Decrease Max Year"
                className="text-neutral-400 hover:text-white disabled:text-neutral-600 disabled:cursor-not-allowed transition-colors cursor-pointer leading-none"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
