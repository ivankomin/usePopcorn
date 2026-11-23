import type { Metadata } from "next";
import { ContactPageContent } from "@/components/InfoPagesContent";

export const metadata: Metadata = {
  title: "Contact Us - usePopcorn",
  description: "Get in touch with the usePopcorn team.",
};

export default function ContactPage() {
  return <ContactPageContent />;
}
