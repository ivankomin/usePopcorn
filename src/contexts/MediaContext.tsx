import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import type { Media } from "../types/Media";
import { transformMedia } from "../utils/transformMedia";

const apiKey = import.meta.env.VITE_API_KEY;

interface MediaContextType {
  media: Media | null;
  results: Media[];
  loading: boolean;
  error: string | null;
  fetchMedia: (id: string) => Promise<void>;
  searchMedia: (title: string, type: string, page: number) => Promise<void>;
  clearResults: () => void;
}

const MediaContext = createContext<MediaContextType | null>(null);

function MediaProvider({ children }: { children: React.ReactNode }) {
  const [media, setMedia] = useState<Media | null>(null);
  const [results, setResults] = useState<Media[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>("");
  const controller = useRef<AbortController | null>(null);

  const fetchMedia = useCallback(async (id: string) => {
    try {
      setError("");
      setLoading(true);

      const response = await fetch(
        `https://www.omdbapi.com/?i=${id}&apikey=${apiKey}&plot=full`,
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
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  //the omdb api's search object only returns basic info for each media, so i need to make a separate request for each media to get the full details
  //this is probably not a very good practice, but i don't really see a better way for now
  const getMediaDetails = useCallback(async (id: string) => {
    const res = await fetch(
      `https://www.omdbapi.com/?i=${id}&apikey=${apiKey}`,
    );
    const data = await res.json();
    return data.Response === "True" ? transformMedia(data) : null;
  }, []);

  //this code fucking sucks lmaaaaaoo (i GOTTA use tanstack query for the next project)
  const searchMedia = useCallback(
    async (title: string, type: string, page: number) => {
      controller.current?.abort();
      controller.current = new AbortController();

      try {
        setError("");
        setResults([]);
        setLoading(true);

        const response = await fetch(
          `https://www.omdbapi.com/?s=${title}&apikey=${apiKey}&type=${type}&page=${page}`,
          {
            signal: controller.current.signal,
          },
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
              getMediaDetails(item.imdbID),
            ),
          )
        ).filter(Boolean) as Media[];

        setResults(results);
        setLoading(false);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setError((error as Error).message);
          setLoading(false);
        }
      }
    },
    [getMediaDetails],
  );

  const clearResults = useCallback(() => {
    setResults([]);
    setLoading(false);
  }, []);

  return (
    <MediaContext.Provider
      value={{
        media,
        results,
        loading,
        error,
        fetchMedia,
        searchMedia,
        clearResults,
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
