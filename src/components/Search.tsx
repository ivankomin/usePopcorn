import { Search as SearchIcon } from "lucide-react";
import { useMedia } from "../contexts/MediaContext";
import { useLocation } from "react-router";
import { useEffect, useState } from "react";
export default function Search() {
  const [query, setQuery] = useState("");
  const { searchMedia } = useMedia();
  const location = useLocation();
  const hideOn = ["/", "/login", "/watchlist"];
  const isDetailPage =
    location.pathname.startsWith("/movies/") ||
    location.pathname.startsWith("/series/");

  useEffect(() => {
    setQuery("");
  }, [location.pathname]);

  if (hideOn.includes(location.pathname) || isDetailPage) return null;

  return (
    <div className="mr-12 ml-auto w-100">
      <div className="group relative">
        <SearchIcon className="text-grey group-focus-within:text-accent absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 transition-colors" />
        <input
          type="text"
          value={query}
          placeholder="Search..."
          className="bg-lighter-bg text-body-text focus:border-grey-lighter placeholder:text-grey/50 w-full rounded-xl border border-transparent py-2.5 pr-4 pl-12 transition-all outline-none"
          onChange={(e) => {
            setQuery(e.target.value);
            searchMedia(e.target.value);
          }}
        />
      </div>
    </div>
  );
}
