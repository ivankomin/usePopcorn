interface MediaListProps {
  type: string;
}
export default function MediaList({ type }: MediaListProps) {
  if (type === "movie") return <div>Movies</div>;
  if (type === "series") return <div>Series</div>;
  return <div>MediaList</div>;
}
