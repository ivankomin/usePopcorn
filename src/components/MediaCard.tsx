import { Link } from "react-router";
import type { Media } from "../types/Media";
import Rating from "@mui/material/Rating";
import { Check, Plus } from "lucide-react";
import { useWatchlist } from "../contexts/WatchlistContext";

interface MediaCardProps {
  media: Media;
}

export default function MediaCard({ media }: MediaCardProps) {
  const { toggleWatchlist, isBookmarked } = useWatchlist();
  const isAdded = isBookmarked(media.imdbID);
  const cleanYear = media.year.replace(/\D+$/, "");
  const runTimeString = `${Math.floor(media.runtime / 60)} hrs ${media.runtime % 60} min`;

  const handleAddClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWatchlist(media);
  };

  return (
    <div className="group bg-light-bg relative flex items-center gap-6 rounded-2xl border border-transparent p-4 transition-all hover:bg-[#252525]">
      <Link
        to={`/${media.type === "movie" ? "movies" : "series"}/${media.imdbID}`}
        className="flex flex-1 items-start gap-6"
      >
        <div className="h-44 w-32 shrink-0 overflow-hidden rounded-lg shadow-lg">
          <img
            src={media.poster}
            alt={media.title}
            className="h-full w-full object-cover"
          />
        </div>

        <div className="flex flex-1 flex-col justify-between self-stretch py-1">
          <div>
            <h2 className="hover:text-accent text-2xl font-semibold text-white transition-colors duration-300">
              {media.title}{" "}
              <span className="text-lg font-normal text-gray-500 italic">
                ({cleanYear})
              </span>
            </h2>

            <div className="mt-1 flex items-center gap-2 text-base text-neutral-400/90">
              <span>{media.genres.join(", ")}</span>
              <span className="text-2xl leading-none text-stone-600">
                &bull;
              </span>
              <span>
                {media.type === "movie"
                  ? runTimeString
                  : media.totalSeasons === 1
                    ? "1 Season"
                    : `${media.totalSeasons} Seasons`}
              </span>
            </div>

            <p className="mt-3 line-clamp-2 text-[15px] leading-relaxed text-neutral-300/90 italic">
              {media.plot}
            </p>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <span className="text-base font-medium text-gray-300">IMDb:</span>
            <Rating
              value={media.imdbRating / 2}
              precision={0.1}
              readOnly
              sx={{
                "& .MuiRating-iconFilled": { color: "#fcc419" },
                "& .MuiRating-iconEmpty": { color: "#444" },
              }}
            />
          </div>
        </div>
      </Link>

      <div className="flex shrink-0 items-center pr-2">
        <button
          type="button"
          onClick={handleAddClick}
          className={`flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border-2 transition-all ${
            isAdded
              ? "bg-accent border-accent text-light-bg"
              : "hover:border-accent hover:bg-accent hover:text-light-bg border-gray-500 bg-transparent text-gray-300"
          } `}
          aria-label="Add to watchlist"
        >
          {isAdded ? <Check size={28} /> : <Plus size={28} />}
        </button>
      </div>
    </div>
  );
}
