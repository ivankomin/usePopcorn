"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Folder, FolderPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildUrlWithParams } from "@/lib/navigation";
import { useCollections } from "@/hooks/useCollections";
import { useI18n } from "@/hooks/useI18n";
import { CollectionFormModal } from "@/components/CollectionFormModal";
import type { CollectionWithMedia } from "@/types/media";

export interface WatchlistCollectionsBarProps {
  collections: CollectionWithMedia[];
  activeCollectionId?: string | null;
}

export function WatchlistCollectionsBar({
  collections,
  activeCollectionId = null,
}: WatchlistCollectionsBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { createCollection } = useCollections();
  const { t } = useI18n();

  const handleSelectCollection = (collectionId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (activeCollectionId === collectionId) {
      params.delete("collection");
    } else {
      params.set("collection", collectionId);
      params.delete("status");
    }
    params.delete("page");

    const targetUrl = buildUrlWithParams(pathname, params);
    startTransition(() => {
      router.push(targetUrl);
    });
  };

  const handleCreateList = async (values: {
    name: string;
    description: string | null;
  }) => {
    const res = await createCollection(values.name, values.description);
    if (res.success && res.collection) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("collection", res.collection.id);
      params.delete("status");
      params.delete("page");
      router.push(buildUrlWithParams(pathname, params));
      router.refresh();
    }
    return res;
  };

  return (
    <div className="w-full flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none select-none">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 shrink-0 mr-1">
        {t("watchlist.myLists")}
      </span>

      {collections.map((col) => {
        const isActive = activeCollectionId === col.id;
        return (
          <button
            key={col.id}
            type="button"
            disabled={isPending}
            onClick={() => handleSelectCollection(col.id)}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer shrink-0 border",
              isActive
                ? "bg-brand-lime text-black border-brand-lime font-semibold shadow-md"
                : "bg-[#181818] border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700",
              isPending && "opacity-80",
            )}
          >
            <Folder className="w-3.5 h-3.5 shrink-0" />
            <span>{col.name}</span>
            <span
              className={cn(
                "px-1.5 py-0.5 rounded-full text-[10px] font-mono",
                isActive
                  ? "bg-black/20 text-black font-bold"
                  : "bg-neutral-800 text-neutral-400",
              )}
            >
              {col.itemCount}
            </span>
          </button>
        );
      })}

      <button
        type="button"
        onClick={() => setIsCreateOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-dashed border-neutral-700 text-neutral-300 hover:text-brand-lime hover:border-brand-lime/70 transition-colors cursor-pointer shrink-0"
      >
        <FolderPlus className="w-3.5 h-3.5" />
        <span>{t("watchlist.newList")}</span>
      </button>

      {isCreateOpen && (
        <CollectionFormModal
          isOpen={true}
          mode="create"
          onClose={() => setIsCreateOpen(false)}
          onSubmit={handleCreateList}
        />
      )}
    </div>
  );
}
