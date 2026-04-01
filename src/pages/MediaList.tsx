import { useEffect } from "react";
import MediaCard from "../components/MediaCard";
import { useMedia } from "../contexts/MediaContext";
import { useLocation, useSearchParams } from "react-router";
import { getMediaType } from "../utils/getMediaType";
import Loader from "../components/Loader";
import type { Media } from "../types/Media";

export default function MediaList() {
  const { results, searchMedia, loading, clearResults } = useMedia();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const query: string | null = searchParams.get("q");

  const type = getMediaType(location.pathname);

  //fetch some initial media on mount
  useEffect(() => {
    searchMedia(query || "man", type);
    return () => {
      clearResults();
    };
  }, [searchMedia, type, clearResults, query]);

  if (loading) {
    return <Loader />;
  }

  const filteredMedia: Media[] = results.filter((m) => m.type === type);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 p-4">
      {query && <h1 className="text-3xl font-bold">Results for "{query}"</h1>}
      {filteredMedia.map((media) => (
        <MediaCard key={media.imdbID} media={media} />
      ))}
    </div>
  );
}
