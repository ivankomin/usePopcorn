"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { useState, useTransition, Suspense } from "react";
import Loader from "./Loader";
import UserMenu from "./UserMenu";
import Button from "./Button";
import { useAuth } from "@/hooks/useAuth";

function NavLinks() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentMediaType = searchParams.get("mediaType") || "movie";

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Movies", href: "/catalog?mediaType=movie" },
    { label: "Series", href: "/catalog?mediaType=tv" },
  ];

  return (
    <nav className="hidden md:flex items-center gap-8">
      {navLinks.map((link) => {
        let isActive = false;
        if (link.href === "/") {
          isActive = pathname === "/";
        } else if (pathname.startsWith("/catalog")) {
          if (link.href.includes("mediaType=tv")) {
            isActive = currentMediaType === "tv";
          } else if (link.href.includes("mediaType=movie")) {
            isActive = currentMediaType === "movie";
          }
        }

        return (
          <div key={link.label} className="relative py-1">
            <Link
              href={link.href}
              className={`text-base font-medium transition-colors ${
                isActive ? "text-white" : "text-[#a0a0a0] hover:text-white"
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
  );
}

interface SearchInputProps {
  initialQuery: string;
  isSearching: boolean;
  onSearch: (query: string) => void;
  onClear: () => void;
}

function SearchInput({
  initialQuery,
  isSearching,
  onSearch,
  onClear,
}: SearchInputProps) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (trimmed) {
      onSearch(trimmed);
    }
  };

  const handleClearClick = () => {
    setSearchQuery("");
    onClear();
  };

  return (
    <form onSubmit={handleSubmit} className="relative flex items-center">
      {isSearching ? (
        <div className="absolute left-3.5 pointer-events-none flex items-center justify-center">
          <Loader size="sm" />
        </div>
      ) : (
        <Search className="w-4 h-4 text-brand-muted absolute left-3.5 pointer-events-none" />
      )}
      <input
        type="text"
        placeholder="Search..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="bg-brand-input text-sm text-white placeholder:text-brand-muted rounded-md pl-10 pr-9 py-2 w-48 sm:w-64 md:w-72 focus:outline-none focus:ring-1 focus:ring-brand-lime focus:border-brand-lime transition-all border border-transparent"
      />
      {searchQuery && (
        <button
          type="button"
          onClick={handleClearClick}
          aria-label="Clear search"
          className="absolute right-2.5 p-1 text-brand-muted hover:text-white transition-colors cursor-pointer rounded-full flex items-center justify-center"
        >
          <X className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>
      )}
    </form>
  );
}

function SearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isSearching, startSearching] = useTransition();

  const currentSearch = searchParams.get("search") || "";
  const currentMediaType = searchParams.get("mediaType");

  // Key changes when navigating to another page, changing media type, or search param,
  // cleanly resetting the search input state without any cascading useEffect renders.
  const formKey = `${pathname}?type=${currentMediaType || ""}&q=${currentSearch}`;

  const handleSearch = (query: string) => {
    // If currently on /watchlist, stay on /watchlist and preserve other params (like status/mediaType)
    const isWatchlist = pathname.startsWith("/watchlist");
    const targetPath = isWatchlist ? "/watchlist" : "/catalog";

    const params = new URLSearchParams(
      isWatchlist ? searchParams.toString() : ""
    );
    params.set("search", query);
    params.delete("page");

    if (!isWatchlist && currentMediaType) {
      params.set("mediaType", currentMediaType);
    }

    startSearching(() => {
      router.push(`${targetPath}?${params.toString()}`);
    });
  };

  const handleClear = () => {
    if (searchParams.has("search")) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("search");
      params.delete("page");
      const newQueryString = params.toString();
      const target = newQueryString
        ? `${pathname}?${newQueryString}`
        : pathname;
      startSearching(() => {
        router.push(target);
      });
    }
  };

  return (
    <SearchInput
      key={formKey}
      initialQuery={currentSearch}
      isSearching={isSearching}
      onSearch={handleSearch}
      onClear={handleClear}
    />
  );
}

export default function Navbar() {
  const { user } = useAuth();

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

          <Suspense
            fallback={
              <nav className="hidden md:flex items-center gap-8">
                <div className="relative py-1">
                  <span className="text-base font-medium text-[#a0a0a0]">
                    Home
                  </span>
                </div>
                <div className="relative py-1">
                  <span className="text-base font-medium text-white">
                    Movies
                  </span>
                  <span className="absolute -bottom-2.5 left-0 right-0 h-[2.5px] bg-brand-lime rounded-full" />
                </div>
                <div className="relative py-1">
                  <span className="text-base font-medium text-[#a0a0a0]">
                    Series
                  </span>
                </div>
              </nav>
            }
          >
            <NavLinks />
          </Suspense>
        </div>

        <div className="flex items-center gap-6 sm:gap-8">
          <Suspense
            fallback={
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-brand-muted absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search..."
                  disabled
                  className="bg-brand-input text-sm text-white placeholder:text-brand-muted rounded-md pl-10 pr-9 py-2 w-48 sm:w-64 md:w-72 border border-transparent"
                />
              </div>
            }
          >
            <SearchBar />
          </Suspense>

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

          {user ? (
            <UserMenu />
          ) : (
            <Button href="/login" size="sm">
              Sign In
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
