import Loader from "@/components/Loader";
import CatalogFilters from "@/components/CatalogFilters";

export default function CatalogLoading() {
  return (
    <div className="min-h-screen bg-black text-white px-4 sm:px-6 lg:px-10 py-8 sm:py-10">
      <div className="max-w-360 mx-auto flex flex-col lg:flex-row gap-8 lg:gap-10 items-start justify-center">
        {/* Sticky Filters Sidebar on the Left */}
        <CatalogFilters />

        {/* Loading Content on the Right */}
        <div className="flex-1 max-w-235 min-w-0 w-full flex flex-col items-center justify-center min-h-[50vh] py-16">
          <Loader size="lg" text="Searching catalog..." />
        </div>
      </div>
    </div>
  );
}
