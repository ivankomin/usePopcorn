import { Link } from "react-router";
import type { Media } from "../types/Media";
import Rating from "@mui/material/Rating";
import { Plus } from "lucide-react";

interface MediaCardProps {
  media: Media;
}

export default function MediaCard({ media }: MediaCardProps) {
  const cleanYear = media.year.replace(/\D+$/, "");

  return (
    <Link
      to={`/${media.type === "movie" ? "movies" : "series"}/${media.imdbID}`}
      className="group bg-light-bg relative flex gap-6 rounded-2xl p-4 transition-all hover:bg-[#252525]"
    >
      {/* 1. Poster Image */}
      <div className="h-44 w-32 shrink-0 overflow-hidden rounded-lg shadow-lg">
        <img
          src={media.poster}
          alt={media.title}
          className="h-full w-full object-cover"
        />
      </div>

      {/* 2. Content Info */}
      <div className="flex flex-1 flex-col justify-between py-1">
        <div>
          {/* Title & Year */}
          <h2 className="text-2xl font-semibold text-white">
            {media.title}{" "}
            <span className="text-lg font-normal text-gray-500">
              ({cleanYear})
            </span>
          </h2>

          {/* Meta (Genre & Runtime) */}
          <div className="mt-1 flex items-center gap-2 text-sm text-gray-400">
            <span>{media.genres.join(", ")}</span>
            <span className="text-gray-600">&bull;</span>
            <span>
              {Math.floor(media.runtime / 60)} hrs {media.runtime % 60} min
            </span>
          </div>

          {/* Plot - Italicized as per image */}
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-gray-400 italic">
            {media.plot}
          </p>
        </div>

        {/* Ratings Section */}
        <div className="mt-4 flex items-center gap-3">
          <span className="text-sm font-medium text-gray-300">IMDb:</span>
          <Rating
            name="read-only"
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

      {/* 3. Action Button (Right Side) */}
      <div className="flex items-center pr-4">
        <button className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-gray-500 text-gray-300 transition-colors hover:border-white hover:text-white">
          {/* Toggle between Plus and Check based on your watchlist state */}
          <Plus size={24} />
        </button>
      </div>
    </Link>
  );
}
