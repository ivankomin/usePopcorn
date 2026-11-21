"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Film, MessageSquareText, Users, ScrollText } from "lucide-react";

export function AdminNavTabs() {
  const pathname = usePathname();

  const isReviews = pathname.startsWith("/admin/reviews");
  const isUsers = pathname.startsWith("/admin/users");
  const isLogs = pathname.startsWith("/admin/logs");
  const isCatalog =
    pathname === "/admin" || (!isReviews && !isUsers && !isLogs);

  return (
    <div className="border-b border-neutral-800 mb-8">
      <nav
        className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2"
        aria-label="Admin navigation"
      >
        <Link
          href="/admin"
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            isCatalog
              ? "bg-brand-surface text-brand-lime shadow-md"
              : "text-neutral-400 hover:text-white hover:bg-neutral-900/60"
          }`}
        >
          <Film className="w-4 h-4 shrink-0" />
          <span>Catalog Management</span>
        </Link>

        <Link
          href="/admin/reviews"
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            isReviews
              ? "bg-brand-surface text-brand-lime shadow-md border border-brand-lime/20"
              : "text-neutral-400 hover:text-white hover:bg-neutral-900/60"
          }`}
        >
          <MessageSquareText className="w-4 h-4 shrink-0" />
          <span>Review Moderation</span>
        </Link>

        <Link
          href="/admin/users"
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            isUsers
              ? "bg-brand-surface text-brand-lime shadow-md border border-brand-lime/20"
              : "text-neutral-400 hover:text-white hover:bg-neutral-900/60"
          }`}
        >
          <Users className="w-4 h-4 shrink-0" />
          <span>User Management</span>
        </Link>

        <Link
          href="/admin/logs"
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
            isLogs
              ? "bg-brand-surface text-brand-lime shadow-md border border-brand-lime/20"
              : "text-neutral-400 hover:text-white hover:bg-neutral-900/60"
          }`}
        >
          <ScrollText className="w-4 h-4 shrink-0" />
          <span>Logs</span>
        </Link>
      </nav>
    </div>
  );
}
