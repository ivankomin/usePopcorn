"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";

export interface AdminFeedbackData {
  type: "success" | "error";
  message: string;
}

export interface AdminFeedbackBannerProps {
  feedback: AdminFeedbackData | null;
  onDismiss: () => void;
  variant?: "bordered" | "minimal";
}

export function AdminFeedbackBanner({
  feedback,
  onDismiss,
  variant = "bordered",
}: AdminFeedbackBannerProps) {
  if (!feedback) return null;

  const isSuccess = feedback.type === "success";
  const containerClassName =
    variant === "minimal"
      ? `p-3.5 rounded-xl text-xs flex items-center gap-3 ${
          isSuccess ? "text-emerald-300" : " text-rose-300"
        }`
      : `p-3.5 rounded-xl text-xs flex items-center justify-between gap-3 border ${
          isSuccess
            ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300"
            : "bg-rose-950/20 border-rose-500/30 text-rose-300"
        }`;

  return (
    <div className={containerClassName}>
      <div className="flex items-center gap-2">
        {isSuccess ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
        ) : (
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
        )}
        <span>{feedback.message}</span>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className={
          variant === "minimal"
            ? "text-neutral-100 hover:text-white font-mono cursor-pointer"
            : "text-neutral-300 hover:text-white font-mono cursor-pointer"
        }
      >
        ✕
      </button>
    </div>
  );
}
