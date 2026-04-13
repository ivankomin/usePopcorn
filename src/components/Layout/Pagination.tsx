import { MoveLeft, MoveRight } from "lucide-react";

// components/Pagination.tsx
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  function getPages() {
    const pages: (number | "...")[] = [];

    // if less than 5 pages, show all
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    pages.push(1);

    if (currentPage > 3) pages.push("...");

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) pages.push(i);

    if (currentPage < totalPages - 2) pages.push("...");

    pages.push(totalPages);

    return pages;
  }

  return (
    <div className="mt-8 grid grid-cols-3 items-center">
      <div>
        {currentPage > 1 && (
          <button
            onClick={() => onPageChange(currentPage - 1)}
            className="hover:text-body-text flex items-center gap-2 text-sm font-bold text-neutral-400 uppercase transition-colors hover:cursor-pointer hover:underline"
          >
            <MoveLeft size={16} strokeWidth={2.5} />
            Previous page
          </button>
        )}
      </div>

      <div className="flex items-center justify-center gap-1">
        {getPages().map((page, i) =>
          page === "..." ? (
            <span key={`ellipsis-${i}`} className="px-2 text-neutral-600">
              ...
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`h-8 w-8 rounded-lg text-sm font-medium transition-colors hover:cursor-pointer ${
                currentPage === page
                  ? "bg-accent text-black"
                  : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
              }`}
            >
              {page}
            </button>
          ),
        )}
      </div>

      <div className="flex justify-end">
        {currentPage < totalPages && (
          <button
            onClick={() => onPageChange(currentPage + 1)}
            className="hover:text-body-text flex items-center gap-2 text-sm font-bold tracking-widest text-neutral-400 uppercase transition-colors hover:cursor-pointer hover:underline"
          >
            Next page
            <MoveRight size={16} strokeWidth={2.5} />
          </button>
        )}
      </div>
    </div>
  );
}
