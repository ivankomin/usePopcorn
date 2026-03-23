import MediaCard from "../components/MediaCard";
import { useMedia } from "../contexts/MediaContext";

interface MediaListProps {
  type: "movie" | "series";
}
export default function MediaList({ type }: MediaListProps) {
  const { results } = useMedia();
  const filteredMedia = results.filter((m) => m.type === type);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {filteredMedia.map((media) => (
        <MediaCard key={media.imdbID} media={media} />
      ))}
    </div>
  );
}
