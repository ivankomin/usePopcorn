import { useEffect } from "react";
import MediaCard from "../components/MediaCard";
import { useMedia } from "../contexts/MediaContext";
import { useLocation } from "react-router";
import { getMediaType } from "../utils/getMediaType";
import Loader from "../components/Loader";

export default function MediaList() {
  const { results, searchMedia, loading, clearResults } = useMedia();
  const location = useLocation();

  const type = getMediaType(location.pathname);

  //fetch some initial media on mount
  useEffect(() => {
    searchMedia("man", type);
    return () => {
      clearResults();
    };
  }, [searchMedia, type, clearResults]);

  if (loading) {
    return <Loader />;
  }

  const filteredMedia = results.filter((m) => m.type === type);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {filteredMedia.map((media) => (
        <MediaCard key={media.imdbID} media={media} />
      ))}
    </div>
  );
}
