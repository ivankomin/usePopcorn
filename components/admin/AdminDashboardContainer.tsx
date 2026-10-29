"use client";

import { useState } from "react";
import { PlusCircle, Film, List } from "lucide-react";
import Button from "@/components/Button";
import { AdminNavTabs } from "./AdminNavTabs";
import { SystemStatusCard } from "./SystemStatusCard";
import { AddMediaForm } from "./AddMediaForm";
import { AdminRecentMedia } from "./AdminRecentMedia";
import type { GenreRow, MediaItemRow } from "@/types/media";

export interface AdminDashboardContainerProps {
  initialSystemStatus: "Free" | "Updating";
  initialMessage?: string | null;
  updatedAt?: string | null;
  genres: GenreRow[];
  recentMedia: MediaItemRow[];
}

export function AdminDashboardContainer({
  initialSystemStatus,
  initialMessage,
  updatedAt,
  genres,
  recentMedia,
}: AdminDashboardContainerProps) {
  const [systemStatus, setSystemStatus] = useState<"Free" | "Updating">(initialSystemStatus);
  const [isFormOpen, setIsFormOpen] = useState(true);

  return (
    <div className="space-y-6">
      <AdminNavTabs />

      {/* Admin Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Admin Dashboard
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            size="md"
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="text-xs sm:text-sm"
          >
            {isFormOpen ? (
              <>
                <List className="w-4 h-4 mr-1.5" />
                <span>Hide Ingestion Form</span>
              </>
            ) : (
              <>
                <PlusCircle className="w-4 h-4 mr-1.5" />
                <span>Add Movie / TV Series</span>
              </>
            )}
          </Button>
        </div>
      </div>

      <SystemStatusCard
        status={systemStatus}
        message={initialMessage}
        updatedAt={updatedAt}
        onStatusChange={(newStatus) => setSystemStatus(newStatus)}
      />

      {isFormOpen && (
        <section aria-label="Manual Media Ingestion Form">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Film className="w-5 h-5 text-brand-lime" />
              Add New Media Record
            </h2>
          </div>
          <AddMediaForm
            genres={genres}
            systemStatus={systemStatus}
          />
        </section>
      )}

      {/* 3. Recently Ingested Media Records */}
      <section aria-label="Recently Ingested Media">
        <AdminRecentMedia items={recentMedia} />
      </section>
    </div>
  );
}
