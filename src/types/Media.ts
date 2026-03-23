export interface RawMedia {
  Title: string;
  Year: string;
  Rated: string;
  Released: string;
  Runtime: string;
  Genre: string;
  Director: string;
  Writer: string;
  Actors: string;
  Plot: string;
  Language: string;
  Country: string;
  Awards: string;
  Poster: string;
  Ratings: { Source: string; Value: string }[];
  Metascore: string;
  imdbRating: string;
  imdbVotes: string;
  imdbID: string;
  Type: string;
  totalSeasons?: string;
  BoxOffice?: string;
}

export interface Media {
  title: string;
  year: number;
  rated: string;
  released: string;
  runtime: number;
  genres: string[];
  director: string;
  writer: string;
  actors: string[];
  plot: string;
  languages: string[];
  country: string;
  awards: string;
  poster: string;
  ratings: { source: string; value: string }[];
  metascore: string | null;
  imdbRating: number;
  imdbVotes: number;
  imdbID: string;
  type: string;
  totalSeasons?: number;
  boxOffice?: number;
}
