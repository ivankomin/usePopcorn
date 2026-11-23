import type { Metadata } from "next";
import { HelpPageContent } from "@/components/InfoPagesContent";

export const metadata: Metadata = {
  title: "Help - usePopcorn",
  description: "Frequently asked questions and quick help for usePopcorn.",
};

export default function HelpPage() {
  return <HelpPageContent />;
}
