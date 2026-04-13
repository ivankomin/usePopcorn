import { createContext, useContext } from "react";
import type { Media } from "../types/Media";
import { useLocalStorageState } from "../hooks/useLocalStorageState";

interface WatchlistContextType {
  watchlist: Media[];
  toggleWatchlist: (media: Media) => void;
  isBookmarked: (id: string) => boolean;
}

const WatchlistContext = createContext<WatchlistContextType | null>(null);

function WatchlistProvider({ children }: { children: React.ReactNode }) {
  const [watchlist, setWatchlist] = useLocalStorageState<Media[]>(
    [],
    "watchlist",
  );

  const toggleWatchlist = (media: Media) => {
    if (watchlist.some((m) => m.imdbID === media.imdbID)) {
      setWatchlist(watchlist.filter((m) => m.imdbID !== media.imdbID));
    } else {
      setWatchlist([...watchlist, media]);
    }
  };

  const isBookmarked = (id: string) => watchlist.some((item) => item.imdbID === id);
  
  return (
    <WatchlistContext.Provider
      value={{ watchlist, toggleWatchlist, isBookmarked }}
    >
      {children}
    </WatchlistContext.Provider>
  );
}

function useWatchlist(): WatchlistContextType {
  const context = useContext(WatchlistContext);
  if (!context) {
    throw new Error("useWatchlist must be used within a WatchlistProvider");
  }
  return context;
}

// eslint-disable-next-line react-refresh/only-export-components
export { WatchlistProvider, useWatchlist };
