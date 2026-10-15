"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Search, LogIn, User } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/catalog?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Movies", href: "/catalog?mediaType=movie" },
    { label: "Series", href: "/catalog?mediaType=tv" },
  ];

  return (
    <header className="w-full bg-brand-surface z-50 shadow-md">
      <div className="max-w-[1600px] mx-auto px-6 sm:px-10 h-19 flex items-center justify-between">
        <div className="flex items-center gap-10">
          <Link
            href="/"
            className="flex items-center gap-1.5 group select-none"
          >
            <span className="text-3xl font-extrabold tracking-tight text-neutral-400 group-hover:opacity-90 transition-opacity">
              USE
            </span>
            <div className="relative w-8 h-9 -mt-0.5">
              <Image
                src="/popcorn-bucket.png"
                alt="usePopcorn Logo"
                fill
                sizes="32px"
                className="object-contain"
                priority
              />
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => {
              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith("/catalog") &&
                    link.href.includes(
                      typeof window !== "undefined"
                        ? new URLSearchParams(window.location.search).get(
                            "mediaType",
                          ) || ""
                        : "",
                    );

              return (
                <div key={link.label} className="relative py-1">
                  <Link
                    href={link.href}
                    className={`text-base font-medium transition-colors ${
                      isActive
                        ? "text-white"
                        : "text-[#a0a0a0] hover:text-white"
                    }`}
                  >
                    {link.label}
                  </Link>
                  {isActive && (
                    <span className="absolute -bottom-2.5 left-0 right-0 h-[2.5px] bg-brand-lime rounded-full" />
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-6 sm:gap-8">
          <form
            onSubmit={handleSearchSubmit}
            className="relative flex items-center"
          >
            <Search className="w-4 h-4 text-brand-muted absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-brand-input text-sm text-white placeholder:text-brand-muted rounded-md pl-10 pr-4 py-2 w-48 sm:w-64 md:w-72 focus:outline-none focus:ring-1 focus:ring-brand-lime focus:border-brand-lime transition-all border border-transparent"
            />
          </form>

          <Link
            href="/watchlist"
            className="flex items-center gap-2 text-white hover:text-brand-lime transition-colors group"
          >
            <svg
              className="w-5 h-5 text-white group-hover:text-brand-lime transition-colors"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="5" y="3" width="14" height="18" rx="2" ry="2" />
              <line x1="9" y1="3" x2="9" y2="7" />
            </svg>
            <span className="text-sm font-medium hidden lg:inline">
              Watchlist
            </span>
          </Link>
          <Link
            href="/profile"
            aria-label="User Profile"
            className="text-white hover:text-brand-lime transition-colors"
          >
            <div className="w-8 h-8 rounded-full border border-white/60 flex items-center justify-center hover:border-brand-lime transition-colors">
              <User className="w-4 h-4 text-white hover:text-brand-lime" />
            </div>
          </Link>

          <Link
            href="/login"
            aria-label="Sign In"
            className="text-white hover:text-brand-lime transition-colors"
          >
            <div className="w-8 h-8 rounded-md border border-white/60 flex items-center justify-center hover:border-brand-lime transition-colors">
              <LogIn className="w-4 h-4 text-white hover:text-brand-lime" />
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}
