import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="relative flex-1 flex flex-col items-center justify-center bg-black px-4 py-8 sm:py-12 overflow-hidden">
      <div className="w-full max-w-237.5 flex flex-col items-center -translate-y-8 sm:-translate-y-12">
        <div className="relative w-full aspect-16/7.5 sm:aspect-16/7 flex flex-col justify-end items-center pb-2 sm:pb-3">
          <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
            <Image
              src="/homepage-img.webp"
              alt="usePopcorn Cinema Hero Scene"
              fill
              sizes="(max-width: 1200px) 100vw, 950px"
              priority
              className="object-cover object-center"
              style={{
                maskImage:
                  "radial-gradient(ellipse 70% 65% at 50% 50%, black 30%, transparent 80%)",
                WebkitMaskImage:
                  "radial-gradient(ellipse 70% 65% at 50% 50%, black 30%, transparent 80%)",
              }}
            />
            <div className="absolute inset-0 bg-linear-to-r from-black via-transparent to-black opacity-30" />
            <div className="absolute inset-0 bg-linear-to-t from-black via-transparent to-black opacity-50" />
          </div>

          <div className="relative z-10 flex flex-col items-center text-center px-4">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[64px] font-bold tracking-tight drop-shadow-lg select-none">
              <span className="text-white">USE</span>
              <span className="text-brand-lime">POPCORN</span>
            </h1>

            <p className="mt-2 text-lg sm:text-xl md:text-[24px] font-bold text-neutral-300 tracking-normal leading-snug drop-shadow-md max-w-xl">
              All your favorite movies in
              <br />
              one place!
            </p>
          </div>
        </div>

        <div className="mt-8 sm:mt-10 flex justify-center z-10">
          <Link
            href="/catalog"
            className="inline-flex items-center justify-center px-7 py-3 rounded-md border-2 border-brand-lime text-brand-lime hover:text-black font-semibold text-xs sm:text-sm uppercase tracking-wider bg-black/50 hover:bg-brand-lime active:scale-95 transition-all duration-200 cursor-pointer shadow-sm select-none"
          >
            GET STARTED NOW
          </Link>
        </div>
      </div>
    </div>
  );
}
