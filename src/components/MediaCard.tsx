import { Link } from "react-router";
import type { Media } from "../types/Media";

interface MediaCardProps {
  media: Media;
}
export default function MediaCard({ media }: MediaCardProps) {
  return (
    <Link
      to={`/${media.type === "movie" ? "movies" : "series"}/${media.imdbID}`}
      className="bg-lighter-bg hover:bg-accent hover:text-main-bg rounded-md border border-transparent px-4 py-3 font-bold text-white uppercase transition-colors duration-300 hover:cursor-pointer"
    >
      {media.title}
    </Link>
  );
}
