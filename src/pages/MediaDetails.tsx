interface MediaDetailsProps {
  type: string;
}
export default function MediaDetails({ type }: MediaDetailsProps) {
  if (type === "movie") return <div>MovieDetails</div>;
  if (type === "series") return <div>SeriesDetails</div>;
  return <div>MediaDetails</div>;
}
