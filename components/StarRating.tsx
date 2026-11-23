"use client";

import dynamic from "next/dynamic";
import type { RatingProps } from "@mui/material/Rating";

const DynamicMuiRating = dynamic(() => import("@mui/material/Rating"), {
  ssr: false,
  loading: () => (
    <span
      className="inline-flex items-center gap-0.5 text-[#383838] select-none"
      aria-hidden="true"
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} className="text-base sm:text-lg leading-none">
          ★
        </span>
      ))}
    </span>
  ),
});

export function StarRating(props: RatingProps) {
  return <DynamicMuiRating {...props} />;
}
