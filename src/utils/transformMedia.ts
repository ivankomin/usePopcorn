import type { Media, RawMedia } from "../types/Media";

export function transformMedia(raw: RawMedia): Media {
  const base = {
    title: raw.Title,
    year: Number(raw.Year),
    rated: raw.Rated,
    released: raw.Released,
    runtime: Number(raw.Runtime.slice(0, raw.Runtime.indexOf(" "))),
    genres: raw.Genre.split(", "),
    director: raw.Director,
    writer: raw.Writer,
    actors: raw.Actors.split(", "),
    plot: raw.Plot,
    languages: raw.Language.split(", "),
    country: raw.Country,
    awards: raw.Awards,
    poster: raw.Poster,
    ratings: raw.Ratings.map((r) => ({ source: r.Source, value: r.Value })),
    metascore: raw.Metascore,
    imdbRating: Number(raw.imdbRating),
    imdbVotes: Number(raw.imdbVotes),
    imdbID: raw.imdbID,
    type: raw.Type,
  };

  if (raw.Type === "movie") {
    return {
      ...base,
      type: "movie",
      boxOffice: Number(raw.BoxOffice?.slice(1).replace(/,/g, "")),
    };
  }

  return {
    ...base,
    type: "series",
    totalSeasons: Number(raw.totalSeasons),
  };
}