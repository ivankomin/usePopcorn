import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, Check } from "lucide-react";
import { useState } from "react";

const genresList = [
  "Action",
  "Adventure",
  "Animation",
  "Comedy",
  "Crime",
  "Documentary",
  "Drama",
  "Fantasy",
  "Horror",
  "Mystery",
  "Romance",
  "Sci-Fi",
  "Thriller",
  "Western",
];

interface GenresDropdownProps {
  selected: string[];
  onChange: (genres: string[]) => void;
}

export default function GenresDropdown({
  selected,
  onChange,
}: GenresDropdownProps) {
  const [open, setOpen] = useState(false);

  function toggleGenre(genre: string) {
    if (selected.includes(genre)) {
      onChange(selected.filter((g) => g !== genre));
    } else {
      onChange([...selected, genre]);
    }
  }

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <button className="flex w-full items-center justify-between rounded-xl border border-neutral-700 bg-transparent px-4 py-2.5 text-base text-neutral-400 transition-colors outline-none hover:border-neutral-500">
          <span className="truncate">
            {selected.length > 0
              ? `${selected.join(", ")}`
              : "Genre"}
          </span>
          <ChevronDown
            size={16}
            className={`text-neutral-500 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="z-50 w-[--radix-dropdown-menu-trigger-width] overflow-hidden rounded-xl border border-neutral-700 bg-neutral-900 p-1 shadow-xl"
          sideOffset={6}
        >
          {genresList.map((genre) => (
            <DropdownMenu.CheckboxItem
              key={genre}
              checked={selected.includes(genre)}
              onCheckedChange={() => toggleGenre(genre)}
              className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm text-neutral-300 transition-colors outline-none hover:bg-neutral-800 focus:bg-neutral-800"
            >
              {genre}
              <DropdownMenu.ItemIndicator>
                <Check size={14} className="text-accent" />
              </DropdownMenu.ItemIndicator>
            </DropdownMenu.CheckboxItem>
          ))}

          {selected.length > 0 && (
            <>
              <DropdownMenu.Separator className="my-1 border-t border-neutral-800" />
              <DropdownMenu.Item
                className="cursor-pointer rounded-lg px-3 py-2 text-sm text-neutral-500 transition-colors outline-none hover:bg-neutral-800 hover:text-neutral-300"
                onSelect={() => onChange([])}
              >
                Clear all
              </DropdownMenu.Item>
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
