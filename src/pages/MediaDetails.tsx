import { useEffect } from "react";
import { useMedia } from "../contexts/MediaContext";
import { useParams } from "react-router";

export default function MediaDetails() {
  const { id, type } = useParams();
  const { media, fetchMedia, loading } = useMedia(); 

  useEffect(() => {
    if (id) {
      fetchMedia(id);
    }
  }, [id, fetchMedia]);

  if (!media || media.imdbID !== id) {
    return null
  }

  if (loading) {
    return <div>Loading...</div>;
  }
  return (
    <div className="flex flex-col items-center">
      <img src={media.poster} alt={media.title} />
      <h1>{media.title}</h1>
      <h1>{type === "movies" ? media.boxOffice : media.totalSeasons}</h1>
    </div>
  );
}
