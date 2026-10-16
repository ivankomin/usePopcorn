import Loader from "@/components/Loader";

export default function CatalogLoading() {
  return (
    <div className="min-h-screen bg-black text-white px-4 sm:px-8 lg:px-12 py-8 sm:py-10">
      <div className="max-w-360 mx-auto flex flex-col items-center">
        <div className="w-full max-w-235 flex flex-col items-center justify-center min-h-[50vh] py-16">
          <Loader size="lg" text="Searching catalog..." />
        </div>
      </div>
    </div>
  );
}
