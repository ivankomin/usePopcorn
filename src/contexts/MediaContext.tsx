import { createContext, useCallback, useContext, useState } from "react";
import type { Media } from "../types/Media";
import { transformMedia } from "../utils/transformMedia";

const apiKey = import.meta.env.VITE_API_KEY;

interface MediaContextType {
  media: Media | null;
  results: Media[];
  loading: boolean;
  error: string | null;
  fetchMedia: (id: string) => Promise<Media | null>;
  searchMedia: (title: string) => Promise<void>;
}

const MediaContext = createContext<MediaContextType | null>(null);

function MediaProvider({ children }: { children: React.ReactNode }) {
  const [media, setMedia] = useState<Media | null>(null);
  const [results, setResults] = useState<Media[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>("");

  const fetchMedia = useCallback(async (id: string) => {
    try {
      setError("");
      setLoading(true);

      const response = await fetch(
        `https://www.omdbapi.com/?i=${id}&apikey=${apiKey}`,
      );

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();
      if (data.Response === "False") {
        throw new Error(data.Error);
      }

      const media = transformMedia(data);

      setMedia(media);

      return media;
    } catch (error) {
      setError((error as Error).message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const searchMedia = useCallback(
    async (title: string) => {
      try {
        setError("");
        setResults([]);
        setLoading(true);

        const response = await fetch(
          `https://www.omdbapi.com/?s=${title}&apikey=${apiKey}`,
        );

        if (!response.ok) {
          throw new Error("Network response was not ok");
        }

        const data = await response.json();
        if (data.Response === "False") {
          throw new Error(data.Error);
        }

        const results = (
          await Promise.all(
            data.Search.map((item: { imdbID: string }) =>
              fetchMedia(item.imdbID),
            ),
          )
        ).filter(Boolean) as Media[];

        setResults(results);
      } catch (error) {
        setError((error as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [fetchMedia],
  );

  return (
    <MediaContext.Provider
      value={{
        media,
        results,
        loading,
        error,
        fetchMedia,
        searchMedia,
      }}
    >
      {children}
    </MediaContext.Provider>
  );
}

function useMedia(): MediaContextType {
  const context = useContext(MediaContext);
  if (!context) {
    throw new Error("useMedia must be used within a MediaProvider");
  }
  return context;
}

// eslint-disable-next-line react-refresh/only-export-components
export { MediaProvider, useMedia };
