"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  className?: string;
}

//Computes the window of page numbers with ellipses.

function getPageNumbers(
  currentPage: number,
  totalPages: number,
): (number | "...")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "...", totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [
      1,
      "...",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    "...",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "...",
    totalPages,
  ];
}

export default function Pagination({
  currentPage,
  totalPages,
  className,
}: PaginationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) {
    return null;
  }

  const safeCurrentPage = Math.max(1, Math.min(currentPage, totalPages));
  const pages = getPageNumbers(safeCurrentPage, totalPages);

  const createPageUrl = (pageNumber: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (pageNumber <= 1) {
      params.delete("page");
    } else {
      params.set("page", pageNumber.toString());
    }
    const queryString = params.toString();
    return queryString ? `${pathname}?${queryString}` : pathname;
  };

  const hasPrev = safeCurrentPage > 1;
  const hasNext = safeCurrentPage < totalPages;

  return (
    <nav
      aria-label="Pagination"
      className={cn(
        "flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 select-none",
        className,
      )}
    >
      {hasPrev ? (
        <Link
          href={createPageUrl(safeCurrentPage - 1)}
          className="inline-flex items-center gap-1 px-3 h-10 rounded-lg text-xs sm:text-sm font-medium bg-brand-surface text-neutral-300 hover:bg-[#252525] hover:text-white hover:border-neutral-700 transition-colors"
          aria-label="Go to previous page"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Prev</span>
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className="inline-flex items-center gap-1 px-3 h-10 rounded-lg text-xs sm:text-sm font-medium bg-brand-surface text-neutral-600 cursor-not-allowed opacity-50"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Prev</span>
        </span>
      )}

      <div className="flex items-center gap-1 sm:gap-1.5">
        {pages.map((p, idx) => {
          if (p === "...") {
            return (
              <span
                key={`ellipsis-${idx}`}
                className="w-8 sm:w-10 h-10 flex items-center justify-center text-neutral-500 font-bold select-none"
              >
                ...
              </span>
            );
          }

          const isCurrent = p === safeCurrentPage;

          if (isCurrent) {
            return (
              <span
                key={p}
                aria-current="page"
                className="w-9 sm:w-10 h-10 flex items-center justify-center rounded-lg text-xs sm:text-sm font-bold bg-brand-lime text-black shadow-sm"
              >
                {p}
              </span>
            );
          }

          return (
            <Link
              key={p}
              href={createPageUrl(p)}
              className="w-9 sm:w-10 h-10 flex items-center justify-center rounded-lg text-xs sm:text-sm font-medium bg-brand-surface text-neutral-300 hover:bg-[#252525] hover:text-white hover:border-neutral-700 transition-colors"
              aria-label={`Go to page ${p}`}
            >
              {p}
            </Link>
          );
        })}
      </div>

      {hasNext ? (
        <Link
          href={createPageUrl(safeCurrentPage + 1)}
          className="inline-flex items-center gap-1 px-3 h-10 rounded-lg text-xs sm:text-sm font-medium bg-brand-surface text-neutral-300 hover:bg-[#252525] hover:text-white hover:border-neutral-700 transition-colors"
          aria-label="Go to next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className="inline-flex items-center gap-1 px-3 h-10 rounded-lg text-xs sm:text-sm font-medium bg-brand-surface text-neutral-600 cursor-not-allowed opacity-50"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-4 h-4" />
        </span>
      )}
    </nav>
  );
}
