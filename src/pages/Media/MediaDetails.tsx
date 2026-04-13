import { useEffect } from "react";
import { useMedia } from "../../contexts/MediaContext";
import { useParams } from "react-router";
import {
  Star,
  PlusCircle,
  Share2,
  Trophy,
  CheckCircle,
  Trash2,
} from "lucide-react";
import Loader from "../../components/Loader";
import { useWatchlist } from "../../contexts/WatchlistContext";

export default function MediaDetails() {
  const { id, type } = useParams();
  const { media, fetchMedia } = useMedia();
  const { toggleWatchlist, isBookmarked } = useWatchlist();

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
  };

  useEffect(() => {
    if (id) {
      fetchMedia(id);
    }
  }, [id, fetchMedia]);

  if (!media || media.imdbID !== id) {
    return <Loader />;
  }

  const isAdded = isBookmarked(media.imdbID);

  return (
    <div className="bg-main-bg flex min-h-screen flex-col items-center p-6 md:p-12">
      <div className="bg-light-bg relative mt-6 flex w-full max-w-7xl flex-col rounded-3xl p-8 shadow-2xl md:p-12">
        <div className="flex flex-col gap-12 md:flex-row">
          <div className="flex shrink-0 flex-col items-center md:items-start">
            <div className="w-full max-w-87.5 overflow-hidden rounded-xl bg-[#141414] shadow-xl shadow-black/50">
              <img
                src={media.poster}
                alt={media.title}
                className="w-full object-cover"
              />

              {isAdded ? (
                <div className="flex w-full items-center justify-between border-t border-neutral-800/50 px-5 py-3">
                  <div className="text-accent flex items-center gap-3 text-lg font-medium tracking-wide">
                    <CheckCircle size={24} className="text-accent" />
                    <span>In Watchlist</span>
                  </div>

                  <div className="flex items-center gap-5 text-neutral-200">
                    <button
                      onClick={() => toggleWatchlist(media)}
                      className="flex cursor-pointer items-center justify-center text-red-500 transition-colors hover:text-red-600"
                    >
                      <Trash2 size={24} strokeWidth={1.5} />
                    </button>

                    <button
                      onClick={handleCopyLink}
                      className="flex cursor-pointer items-center justify-center transition-colors hover:text-white"
                    >
                      <Share2 size={24} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex w-full items-center justify-between border-t border-neutral-800/50 px-5 py-3">
                  <button
                    className="group flex cursor-pointer items-center gap-3 text-neutral-200 transition-colors hover:text-white"
                    onClick={() => toggleWatchlist(media)}
                  >
                    <PlusCircle
                      size={28}
                      strokeWidth={1.5}
                      className="text-neutral-100"
                    />

                    <span className="text-lg font-medium tracking-wide">
                      Add to Watchlist
                    </span>
                  </button>

                  <button
                    onClick={handleCopyLink}
                    className="flex cursor-pointer items-center justify-center text-neutral-200 transition-colors hover:text-white"
                  >
                    <Share2 size={24} strokeWidth={1.5} />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-1 flex-col">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
                  {media.title}
                  <span className="ml-3 text-2xl font-light text-neutral-500 italic md:text-3xl">
                    ({media.year.replace(/\D+$/, "")})
                  </span>
                  <span
                    className={`ml-3 inline-flex aspect-square min-w-8 items-center justify-center rounded-full border-3 p-1.5 text-xs leading-none font-bold uppercase ${media.rated.includes("R") || media.rated.includes("TV-MA") ? "border-red-400 text-red-400" : "border-yellow-200 text-yellow-200"}`}
                  >
                    {media.rated}
                  </span>
                </h1>
                <div className="mt-5 flex flex-wrap gap-4">
                  {media.genres.map((genre) => (
                    <span
                      key={genre}
                      className="bg-tag-green rounded-md px-3 py-1.5 text-sm font-bold tracking-wider text-[#0a0a0a] uppercase"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-body-text text-3xl font-bold">
                  {media.imdbRating}
                </span>
                <Star size={36} fill="#fcc419" stroke="#fcc419" />
              </div>
            </div>

            <div className="mt-3 rounded-2xl border-4 border-neutral-700/80 bg-[#141414]/50 p-6 md:p-8">
              <div className="grid grid-cols-1 gap-y-4 text-base text-neutral-400">
                <p>
                  <span className="inline-block w-32 font-medium text-white">
                    Country:
                  </span>
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
                      type === "movies" ? "font-medium text-green-400" : ""
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
                  <span
                    className={
                      media.rated.includes("R") || media.rated.includes("TV-MA")
                        ? "text-red-500"
                        : ""
                    }
                  >
                    {media.rated}
                  </span>
                </p>
                <p>
                  <span className="inline-block w-32 font-medium text-white">
                    Premiered on:
                  </span>{" "}
                  {media.released}
                </p>
                <p>
                  <span className="inline-block w-32 font-medium text-white">
                    {type === "movies" ? "Director:" : "Writer:"}
                  </span>{" "}
                  {type === "movies" ? media.director : media.writer}
                </p>
                <p>
                  <span className="inline-block w-32 font-medium text-white">
                    Stars:
                  </span>{" "}
                  {media.actors.join(", ")}
                </p>

                {media.awards !== "N/A" && (
                  <div className="flex items-start gap-2 text-neutral-300">
                    <Trophy
                      size={28}
                      className="mb-1 shrink-0 text-yellow-600"
                    />
                    <p>{media.awards}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <p className="mt-8 text-lg leading-relaxed text-neutral-300">
          {media.plot}
        </p>
      </div>
    </div>
  );
}
