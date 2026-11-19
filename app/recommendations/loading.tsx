import Loader from "@/components/Loader";

export default function RecommendationsLoading() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4 py-20">
      <Loader size="lg" text="Personalizing your recommendations..." />
    </div>
  );
}
