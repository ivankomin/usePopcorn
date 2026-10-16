"use client";

export interface RatingRangeSliderProps {
  minRating: number;
  maxRating: number;
  onMinRatingChange: (val: number) => void;
  onMaxRatingChange: (val: number) => void;
}

export function RatingRangeSlider({
  minRating,
  maxRating,
  onMinRatingChange,
  onMaxRatingChange,
}: RatingRangeSliderProps) {
  const handleMinChange = (val: number) => {
    const rounded = Math.round(val * 10) / 10;
    onMinRatingChange(Math.min(rounded, maxRating));
  };

  const handleMaxChange = (val: number) => {
    const rounded = Math.round(val * 10) / 10;
    onMaxRatingChange(Math.max(rounded, minRating));
  };

  return (
    <div className="flex flex-col gap-4 w-full px-1 py-1">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-bold tracking-wider">
          <span className="text-neutral-300 font-semibold">MIN RATING</span>
          <span className="text-brand-lime font-mono font-bold text-sm">
            {minRating.toFixed(1)}
          </span>
        </div>
        <div className="relative w-full h-5 flex items-center">
          <div className="w-full h-1 bg-brand-input rounded-full" />

          <div
            className="absolute pointer-events-none -translate-x-1/2 w-3.5 h-4.5 rounded-[5px] bg-[#e8e8e8] shadow-sm transition-[left] duration-75"
            style={{ left: `${(minRating / 10) * 100}%` }}
          />

          <input
            type="range"
            min="0"
            max="10"
            step="0.1"
            value={minRating}
            onChange={(e) => handleMinChange(parseFloat(e.target.value))}
            aria-label="Min Rating"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-bold tracking-wider">
          <span className="text-neutral-300 font-semibold">MAX RATING</span>
          <span className="text-brand-lime font-mono font-bold text-sm">
            {maxRating.toFixed(1)}
          </span>
        </div>
        <div className="relative w-full h-5 flex items-center">
          <div className="w-full h-1 bg-brand-input rounded-full" />
          <div
            className="absolute pointer-events-none -translate-x-1/2 w-3.5 h-4.5 rounded-[5px] bg-[#e8e8e8] shadow-sm transition-[left] duration-75"
            style={{ left: `${(maxRating / 10) * 100}%` }}
          />

          <input
            type="range"
            min="0"
            max="10"
            step="0.1"
            value={maxRating}
            onChange={(e) => handleMaxChange(parseFloat(e.target.value))}
            aria-label="Max Rating"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
