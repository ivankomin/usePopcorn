import { useEffect } from "react";
import { useMedia } from "../contexts/MediaContext";
import { useParams } from "react-router";
import { Star, Plus, Share2 } from "lucide-react";
import Loader from "../components/Loader";

export default function MediaDetails() {
  const { id, type } = useParams();
  const { media, fetchMedia } = useMedia();

  useEffect(() => {
    if (id) {
      fetchMedia(id);
    }
  }, [id, fetchMedia]);

  if (!media || media.imdbID !== id) {
    return <Loader />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-[#0a0a0a] p-6 md:p-12">
      <div className="bg-light-bg relative flex w-full max-w-6xl flex-col gap-12 rounded-3xl p-8 shadow-2xl md:flex-row md:p-12">
        <div className="flex shrink-0 flex-col items-center gap-6 md:items-start">
          <img
            src={media.poster}
            alt={media.title}
            className="w-full max-w-87.5 rounded-2xl border border-neutral-700 shadow-2xl"
          />
          <div className="flex w-full gap-4">
            <button className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-full border border-neutral-700 px-4 py-3 text-neutral-300 transition-all hover:bg-neutral-800 hover:text-white">
              <Plus size={20} />
              <span className="text-sm font-medium">Add to Watchlist</span>
            </button>
            <button className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border border-neutral-700 text-neutral-400 transition-all hover:bg-neutral-800 hover:text-white">
              <Share2 size={20} />
            </button>
          </div>
        </div>

        <div className="flex flex-1 flex-col">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
                {media.title}
                <span className="ml-3 text-2xl font-light text-neutral-500 italic md:text-3xl">
                  ({media.year})
                </span>
                <span className="ml-3 inline-block rounded-full border border-red-500/50 px-2 py-0.5 align-middle text-xs font-bold text-red-500">
                  {media.rated}
                </span>
              </h1>
              <div className="mt-4 flex flex-wrap gap-2">
                {media.genres.map((genre) => (
                  <span
                    key={genre}
                    className="rounded-full bg-[#b4f44d] px-4 py-1 text-sm font-bold tracking-wider text-[#0a0a0a] uppercase"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-4xl font-bold text-white">
                {media.imdbRating}
              </span>
              <Star size={32} fill="#fcc419" stroke="#fcc419" />
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-neutral-800 bg-[#141414]/50 p-6 md:p-8">
            <div className="grid grid-cols-1 gap-y-4 text-[15px] text-neutral-400">
              <p>
                <span className="inline-block w-32 font-medium text-white">
                  Country:
                </span>{" "}
                {media.country}
              </p>
              <p>
                <span className="inline-block w-32 font-medium text-white">
                  Runtime:
                </span>
                {Math.floor(media.runtime / 60)} hrs {media.runtime % 60} min
              </p>

              <p>
                <span className="inline-block w-32 font-medium text-white">
                  {type === "movies" ? "Box Office:" : "Total Seasons:"}
                </span>
                <span
                  className={
                    type === "movies" ? "font-medium text-green-500" : ""
                  }
                >
                  {type === "movies"
                    ? media.boxOffice
                      ? `$${media.boxOffice.toLocaleString()}`
                      : "N/A"
                    : media.totalSeasons}
                </span>
              </p>

              <p>
                <span className="inline-block w-32 font-medium text-white">
                  Age rating:
                </span>{" "}
                <span className="text-red-500">{media.rated}</span>
              </p>
              <p>
                <span className="inline-block w-32 font-medium text-white">
                  Premiered on:
                </span>{" "}
                {media.released}
              </p>
              <p>
                <span className="inline-block w-32 font-medium text-white">
                  Director:
                </span>{" "}
                {media.director}
              </p>
              <p>
                <span className="inline-block w-32 font-medium text-white">
                  Stars:
                </span>{" "}
                {media.actors.join(", ")}
              </p>

              <div className="flex items-start gap-2 pt-2 text-neutral-300">
                <Star size={18} className="mt-0.5 shrink-0 text-neutral-600" />
                <p>{media.awards}</p>
              </div>
            </div>
          </div>

          <p className="mt-8 text-lg leading-relaxed text-neutral-300">
            {media.plot}
          </p>
        </div>
      </div>
    </div>
  );
}
