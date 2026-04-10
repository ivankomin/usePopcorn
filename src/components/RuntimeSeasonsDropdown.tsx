import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, Check } from "lucide-react";
import { useState } from "react";

const runtimeOptions = [
  { label: "Any Runtime", value: "0-300", min: 0, max: 300 },
  { label: "Under 1 hour", value: "0-60", min: 0, max: 60 },
  { label: "1–2 hours", value: "60-120", min: 60, max: 120 },
  { label: "2–3 hours", value: "120-180", min: 120, max: 180 },
  { label: "3+ hours", value: "180-300", min: 180, max: 300 },
];

const seasonOptions = [
  { label: "Any Seasons", value: "0-300", min: 0, max: 300 },
  { label: "1–3 seasons", value: "1-3", min: 1, max: 3 },
  { label: "4–6 seasons", value: "4-6", min: 4, max: 6 },
  { label: "7–10 seasons", value: "7-10", min: 7, max: 10 },
  { label: "10+ seasons", value: "10-300", min: 10, max: 300 },
];

interface RuntimeSeasonsDropdownProps {
  min: number;
  max: number;
  type: "" | "movie" | "series";
  onChange: (min: number, max: number) => void;
}

export default function RuntimeSeasonsDropdown({
  min,
  max,
  onChange,
  type,
}: RuntimeSeasonsDropdownProps) {
  const [open, setOpen] = useState(false);
  const currentValue = `${min}-${max}`;

  const activeOptions = type === "movie" ? runtimeOptions : seasonOptions;
  const currentOption = activeOptions.find((opt) => opt.value === currentValue);

  const displayLabel = currentOption
    ? currentOption.label
    : type === "movie"
      ? "Runtime"
      : "Seasons";

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <button className="flex w-full items-center justify-between rounded-xl border border-neutral-700 bg-[#141414] px-4 py-2.5 text-base text-neutral-400 transition-colors outline-none hover:border-neutral-500">
          <span className="truncate">{displayLabel}</span>
          <ChevronDown
            size={16}
            className={`text-neutral-500 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="w-[--radix-dropdown-menu-trigger-width] overflow-hidden rounded-xl border border-neutral-700 bg-neutral-900 p-1 shadow-xl"
          sideOffset={6}
        >
          <DropdownMenu.RadioGroup
            value={currentValue}
            onValueChange={(val) => {
              const [newMin, newMax] = val.split("-").map(Number);
              onChange(newMin, newMax);
            }}
          >
            {activeOptions.map((opt) => (
              <DropdownMenu.RadioItem
                key={opt.value}
                value={opt.value}
                className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm text-neutral-300 transition-colors outline-none focus:bg-neutral-800 data-highlighted:bg-neutral-800"
              >
                {opt.label}
                <DropdownMenu.ItemIndicator>
                  <Check size={14} className="text-accent" />
                </DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
