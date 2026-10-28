"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  User as UserIcon,
  Bookmark,
  LogOut,
  ChevronDown,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useOutsideClick } from "@/hooks/useOutsideClick";

export default function UserMenu() {
  const { user, profile, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useOutsideClick(menuRef, () => setIsOpen(false), isOpen);

  if (!user) return null;

  const displayName = profile?.username || user.email?.split("@")[0] || "User";
  const displayEmail = user.email || "";
  const initial = displayName.charAt(0).toUpperCase();

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label="User navigation menu"
        className="flex items-center gap-2 p-1 rounded-full hover:bg-neutral-800/60 transition-colors group cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand-lime"
      >
        {profile?.avatar_url ? (
          <div className="relative w-8 h-8 rounded-full overflow-hidden border border-neutral-700 group-hover:border-brand-lime transition-colors">
            <Image
              src={profile.avatar_url}
              alt={displayName}
              fill
              sizes="32px"
              className="object-cover"
            />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-neutral-800 border border-brand-lime/40 text-brand-lime font-bold text-xs flex items-center justify-center select-none shadow-sm group-hover:border-brand-lime transition-colors">
            {initial}
          </div>
        )}
        <ChevronDown
          className={`w-3.5 h-3.5 text-neutral-400 group-hover:text-white transition-transform duration-200 ${
            isOpen ? "rotate-180 text-white" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-brand-surface border border-neutral-800 rounded-xl shadow-2xl p-1.5 z-50">
          {/* User Details */}
          <div className="px-3 py-2.5 border-b border-neutral-800/80 mb-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-white text-sm truncate">
                {displayName}
              </span>
            </div>
            <p className="text-xs text-neutral-400 truncate mt-0.5">
              {displayEmail}
            </p>
          </div>

          {/* Navigation Links */}
          <div className="space-y-0.5">
            {profile?.role === "admin" && (
              <Link
                href="/admin"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-brand-lime hover:bg-brand-lime/10 transition-colors font-semibold"
              >
                <ShieldCheck className="w-4 h-4 text-brand-lime shrink-0" />
                <span>Admin Dashboard</span>
              </Link>
            )}

            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors"
            >
              <UserIcon className="w-4 h-4 text-neutral-400" />
              <span>Profile</span>
            </Link>

            <Link
              href="/watchlist"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors"
            >
              <Bookmark className="w-4 h-4 text-neutral-400" />
              <span>Watchlist</span>
            </Link>
          </div>

          <div className="h-px bg-neutral-800 my-1" />

          {/* Sign Out Action */}
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors cursor-pointer text-left disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogOut className="w-4 h-4" />
            <span>{isSigningOut ? "Signing out..." : "Sign Out"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
