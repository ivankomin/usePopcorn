export default function MovieLoading() {
  return (
    <div className="w-full max-w-5xl lg:max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 animate-pulse">
      <div className="h-4 w-28 bg-neutral-800 rounded mb-5" />
      <div className="bg-[#222222] border border-neutral-800 rounded-3xl p-6 sm:p-8 md:p-10 flex flex-col gap-8 shadow-2xl shadow-black/80">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
          <div className="w-full md:w-68 lg:w-76 aspect-2/3 rounded-2xl bg-neutral-800 shrink-0" />
          <div className="flex-1 w-full flex flex-col gap-4">
            <div className="h-10 w-3/4 bg-neutral-800 rounded-xl" />
            <div className="flex gap-2">
              <div className="h-6 w-16 bg-neutral-800 rounded-lg" />
              <div className="h-6 w-16 bg-neutral-800 rounded-lg" />
            </div>
            <div className="h-56 w-full bg-neutral-800/60 rounded-2xl" />
          </div>
        </div>
        <div className="h-20 w-full bg-neutral-800/40 rounded-xl" />
      </div>
    </div>
  );
}
