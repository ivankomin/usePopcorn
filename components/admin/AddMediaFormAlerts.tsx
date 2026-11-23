"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, ExternalLink, Lock } from "lucide-react";

export interface DuplicateMediaWarning {
  id: string;
  title: string;
  release_year: number;
}

export interface AddMediaFormAlertsProps {
  isLocked: boolean;
  duplicateWarning: DuplicateMediaWarning | null;
  createdMediaId: string | null;
  errorMessage: string | null;
}

export function AddMediaFormAlerts({
  isLocked,
  duplicateWarning,
  createdMediaId,
  errorMessage,
}: AddMediaFormAlertsProps) {
  return (
    <>
      {isLocked && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3 text-amber-300">
          <Lock className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
          <div className="text-sm">
            <p className="font-bold">
              System Synchronization Active (Updating)
            </p>
            <p className="text-xs text-amber-300/90 mt-0.5">
              Manual movie addition and catalog modifications are currently
              locked to avoid write conflicts. Please{" "}
              <strong>Try again later</strong> once background sync finishes.
            </p>
          </div>
        </div>
      )}

      {duplicateWarning && (
        <div className="p-4 flex items-start justify-between gap-3 text-rose-300 animate-fadeIn">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
            <div className="text-sm">
              <p className="font-bold">Duplicate Entry Detected</p>
              <p className="text-xs text-rose-300/90 mt-0.5">
                A media item titled{" "}
                <strong>&quot;{duplicateWarning.title}&quot;</strong> released
                in <strong>{duplicateWarning.release_year}</strong> already
                exists in the catalog. Creation is blocked to prevent duplicate
                records.
              </p>
            </div>
          </div>
          <Link
            href={`/movie/${duplicateWarning.id}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-200 underline hover:text-white shrink-0 mt-0.5"
          >
            <span>View existing</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {createdMediaId && (
        <div className="p-4 flex items-center justify-between gap-3 text-emerald-300">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
            <div>
              <p className="text-sm font-bold">
                Media successfully ingested into catalog!
              </p>
            </div>
          </div>
          <Link
            href={`/movie/${createdMediaId}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-lime text-black font-semibold text-xs hover:bg-[#96d862] transition-colors shrink-0"
          >
            <span>View Movie</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl p-4 text-xs text-rose-300">
          {errorMessage}
        </div>
      )}
    </>
  );
}
