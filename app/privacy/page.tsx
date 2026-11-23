import type { Metadata } from "next";
import { PrivacyPageContent } from "@/components/InfoPagesContent";

export const metadata: Metadata = {
  title: "Privacy Policy - usePopcorn",
  description: "Basic privacy overview for usePopcorn.",
};

export default function PrivacyPage() {
  return <PrivacyPageContent />;
}
