import Button from "../components/Button";
import Hero from "../components/Hero";

export default function Home() {
  return (
    <div className="bg-main-bg flex min-h-screen flex-1 flex-col items-center">
      <Hero />
      <Button to="/movies">GET STARTED NOW</Button>
    </div>
  );
}
