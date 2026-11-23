import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { I18nProvider } from "@/components/I18nProvider";
import { AuthProvider } from "@/components/AuthProvider";
import { WatchlistProvider } from "@/components/WatchlistProvider";
import { CollectionsProvider } from "@/components/CollectionsProvider";
import { RatingProvider } from "@/components/RatingProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "usePopcorn - All your favorite movies in one place!",
  description:
    "Explore movies and TV series, organize personal watchlists, and share reviews.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-brand-bg text-white">
        <I18nProvider>
          <AuthProvider>
            <WatchlistProvider>
              <CollectionsProvider>
                <RatingProvider>
                  <Navbar />
                  <main className="flex-1 flex flex-col">{children}</main>
                  <Footer />
                </RatingProvider>
              </CollectionsProvider>
            </WatchlistProvider>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
