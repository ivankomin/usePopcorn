import type { Metadata } from "next";
import { AboutPageContent } from "@/components/InfoPagesContent";

export const metadata: Metadata = {
  title: "About - usePopcorn",
  description: "Learn more about usePopcorn, our movie and TV series catalog.",
};

export default function AboutPage() {
  return <AboutPageContent />;
}
