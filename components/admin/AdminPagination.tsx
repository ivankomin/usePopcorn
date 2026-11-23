"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export interface AdminPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  itemLabel: string;
  isPending?: boolean;
  onPageChange: (nextPage: number) => void;
}

export function AdminPagination({
  page,
  totalPages,
  total,
  itemLabel,
  isPending = false,
  onPageChange,
}: AdminPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between pt-4 border-t border-neutral-800 text-xs text-neutral-400">
      <span>
        Showing page <strong>{page}</strong> of <strong>{totalPages}</strong> (
        {total} {itemLabel})
      </span>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1 || isPending}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 hover:border-neutral-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Previous</span>
        </button>

        <button
          type="button"
          disabled={page >= totalPages || isPending}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 hover:border-neutral-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors cursor-pointer"
        >
          <span>Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
