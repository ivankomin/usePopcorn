import heroImage from "../assets/hero_image.png";
export default function Hero() {
  return (
    <section className="bg-main-bg w-full px-6 pt-20 pb-8">
      <div className="relative mx-auto aspect-16/7 w-full max-w-7xl overflow-hidden">
        <img
          src={heroImage}
          alt="Princess Leia loading plans into R2-D2"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="from-main-bg absolute top-0 left-0 z-10 h-full w-1/4 bg-linear-to-r to-transparent" />

        <div className="from-main-bg absolute top-0 right-0 z-10 h-full w-1/4 bg-linear-to-l to-transparent" />

        <div className="from-main-bg/95 via-main-bg/70 absolute bottom-0 left-0 z-20 h-1/5 w-full bg-linear-to-t to-transparent backdrop-blur-xl" />

        <div className="absolute inset-0 z-30 flex flex-col items-center justify-end px-6 pb-6 text-center">
          <h1 className="font-main text-7xl font-extrabold tracking-tighter uppercase drop-shadow-xl">
            <span className="text-body-text">USE</span>
            <span className="text-accent">POPCORN</span>
          </h1>

          <p className="font-main text-body-text/90 mt-4 max-w-xl text-2xl font-bold drop-shadow-lg">
            All your favorite movies in one place!
          </p>
        </div>
      </div>
    </section>
  );
}
