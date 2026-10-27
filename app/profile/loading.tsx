import Loader from "@/components/Loader";

export default function ProfileLoading() {
  return (
    <div className="w-full flex flex-col items-center justify-center min-h-[60vh] py-20">
      <Loader size="lg" text="Loading your profile cabinet..." />
    </div>
  );
}
