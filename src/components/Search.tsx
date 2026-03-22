import { Search as SearchIcon } from "lucide-react";
export default function Search() {
  return (
    <div className="mr-12 ml-auto w-100">
      <div className="group relative">
        <SearchIcon className="text-grey group-focus-within:text-accent absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 transition-colors" />
        <input
          type="text"
          placeholder="Search..."
          className="bg-lighter-bg text-body-text focus:border-grey-lighter placeholder:text-grey/50 w-full rounded-xl border border-transparent py-2.5 pr-4 pl-12 transition-all outline-none"
        />
      </div>
    </div>
  );
}
