import { ChevronDown, ChevronUp } from "lucide-react";

interface YearInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

export default function YearInput({
  label,
  value,
  min,
  max,
  onChange,
}: YearInputProps) {
  const handleIncrement = () => {
    if (value < max) onChange(value + 1);
  };

  const handleDecrement = () => {
    if (value > min) onChange(value - 1);
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-extrabold tracking-widest text-neutral-400 uppercase">
        {label}
      </p>

      <div className="group focus-within:border-accent/50 focus-within:ring-accent/20 flex items-center overflow-hidden rounded-xl border border-neutral-800 bg-[#141414] px-3 py-2 transition-all focus-within:ring-1">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(parseInt(e.target.value) || 0)}
          className="w-full [appearance:textfield] bg-transparent text-sm font-medium text-white outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />

        <div className="ml-2 flex flex-col border-l border-neutral-800/50 pl-2">
          <button
            type="button"
            onClick={handleIncrement}
            className="hover:text-accent text-neutral-500 transition-colors active:scale-90 hover:cursor-pointer"
          >
            <ChevronUp size={14} strokeWidth={3} />
          </button>
          <button
            type="button"
            onClick={handleDecrement}
            className="hover:text-accent text-neutral-500 transition-colors active:scale-90 hover:cursor-pointer"
          >
            <ChevronDown size={14} strokeWidth={3} />
          </button>
        </div>
      </div>
    </div>
  );
}
