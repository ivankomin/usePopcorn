"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Film, Folder, Pencil, Trash2, X } from "lucide-react";
import type {
  CollectionItemWithMedia,
  CollectionWithMedia,
  WatchlistEntry,
  WatchlistStatus,
  WatchlistStatusCounts,
} from "@/types/media";
import MediaCard from "./MediaCard";
import Pagination from "./Pagination";
import SortDropdown, { WATCHLIST_SORT_OPTIONS } from "./SortDropdown";
import ActiveFilterChips from "./ActiveFilterChips";
import WatchlistStatusTabs from "./WatchlistStatusTabs";
import { WatchlistCollectionsBar } from "./WatchlistCollectionsBar";
import { CollectionFormModal } from "./CollectionFormModal";
import Button from "./Button";
import { useCollections } from "@/hooks/useCollections";
import { useI18n } from "@/hooks/useI18n";

export interface WatchlistMediaListProps {
  items: WatchlistEntry[];
  totalFound: number;
  statusCounts: WatchlistStatusCounts;
  currentStatus?: WatchlistStatus | "all";
  currentPage?: number;
  totalPages?: number;
  currentSort?: string;
  searchQuery?: string;
  hasAnyWatchlistItems?: boolean;
  collections?: CollectionWithMedia[];
  activeCollection?: CollectionWithMedia | null;
  collectionItems?: CollectionItemWithMedia[];
}

export default function WatchlistMediaList({
  items,
  totalFound,
  statusCounts,
  currentStatus = "all",
  currentPage = 1,
  totalPages,
  currentSort = "added_desc",
  searchQuery,
  hasAnyWatchlistItems = true,
  collections = [],
  activeCollection = null,
  collectionItems = [],
}: WatchlistMediaListProps) {
  const router = useRouter();
  const { t } = useI18n();
  const { updateCollection, deleteCollection, removeMediaFromCollection } =
    useCollections();

  // Local state to allow instant removal animation & immediate count updates
  const [prevItems, setPrevItems] = useState(items);
  const [displayedItems, setDisplayedItems] = useState(items);
  const [prevCollectionItems, setPrevCollectionItems] =
    useState(collectionItems);
  const [displayedCollectionItems, setDisplayedCollectionItems] =
    useState(collectionItems);
  const [liveTotalFound, setLiveTotalFound] = useState(totalFound);
  const [liveStatusCounts, setLiveStatusCounts] = useState(statusCounts);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  if (prevItems !== items || prevCollectionItems !== collectionItems) {
    setPrevItems(items);
    setDisplayedItems(items);
    setPrevCollectionItems(collectionItems);
    setDisplayedCollectionItems(collectionItems);
    setLiveTotalFound(totalFound);
    setLiveStatusCounts(statusCounts);
    setIsConfirmingDelete(false);
  }

  const handleWatchlistToggle = (mediaId: string, inWatchlist: boolean) => {
    if (activeCollection) return;
    if (!inWatchlist) {
      const itemToRemove = displayedItems.find(
        (e) => e.media_id === mediaId || e.media?.id === mediaId,
      );

      setDisplayedItems((prev) =>
        prev.filter((e) => e.media_id !== mediaId && e.media?.id !== mediaId),
      );
      setLiveTotalFound((prev) => Math.max(0, prev - 1));

      if (itemToRemove) {
        setLiveStatusCounts((prev) => {
          const next = { ...prev };
          next.all = Math.max(0, next.all - 1);
          if (itemToRemove.status === "plan_to_watch") {
            next.plan_to_watch = Math.max(0, next.plan_to_watch - 1);
          } else if (itemToRemove.status === "watched") {
            next.watched = Math.max(0, next.watched - 1);
          } else if (itemToRemove.status === "favorite") {
            next.favorite = Math.max(0, next.favorite - 1);
          }
          return next;
        });
      }

      router.refresh();
    }
  };

  const handleRemoveFromCollection = async (mediaId: string) => {
    if (!activeCollection) return;
    const ok = await removeMediaFromCollection(activeCollection.id, mediaId);
    if (ok) {
      setDisplayedCollectionItems((prev) =>
        prev.filter((entry) => entry.media_id !== mediaId),
      );
      setLiveTotalFound((prev) => Math.max(0, prev - 1));
      router.refresh();
    }
  };

  const handleEditCollection = async (values: {
    name: string;
    description: string | null;
  }) => {
    if (!activeCollection) return { success: false, error: "No list selected" };
    const res = await updateCollection(activeCollection.id, values);
    if (res.success) {
      router.refresh();
    }
    return res;
  };

  const handleDeleteCollection = async () => {
    if (!activeCollection) return;
    const res = await deleteCollection(activeCollection.id);
    if (res.success) {
      router.push("/watchlist");
      router.refresh();
    }
  };

  const getHeadingLabel = () => {
    if (searchQuery) return `${t("catalog.resultsFor")} "${searchQuery}"`;
    if (activeCollection) return activeCollection.name;
    if (currentStatus === "plan_to_watch") return t("movieDetails.planToWatch");
    if (currentStatus === "watched") return t("movieDetails.watched");
    if (currentStatus === "favorite") return t("movieDetails.favorites");
    return t("watchlist.allSavedTitles");
  };

  // Completely empty watchlist AND no custom lists selected/created
  if (
    !activeCollection &&
    collections.length === 0 &&
    (!hasAnyWatchlistItems || liveStatusCounts.all === 0)
  ) {
    return (
      <div className="w-full flex flex-col gap-5">
        <WatchlistCollectionsBar
          collections={collections}
          activeCollectionId={null}
        />
        <div className="w-full bg-[#181818] border border-neutral-800 rounded-3xl p-10 sm:p-16 text-center flex flex-col items-center justify-center my-4 shadow-xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 tracking-tight">
            {t("watchlist.emptyTitle")}
          </h2>
          <p className="text-sm sm:text-base text-neutral-400 max-w-md mb-8 leading-relaxed">
            {t("watchlist.emptyBody")}
          </p>
          <Button href="/catalog?mediaType=movie" size="lg">
            <Film className="w-4 h-4 mr-2 inline-block" />
            {t("watchlist.browseCatalog")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Top Status Tabs + Custom Lists Bar */}
      <div className="flex flex-col gap-2.5">
        <WatchlistStatusTabs
          statusCounts={liveStatusCounts}
          currentStatus={currentStatus}
          hasActiveCollection={Boolean(activeCollection)}
        />
        <WatchlistCollectionsBar
          collections={collections}
          activeCollectionId={activeCollection?.id ?? null}
        />
      </div>

      {/* Header with Title & Sort */}
      <div className="mb-2 flex flex-col gap-3">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex flex-col gap-1.5 min-w-0">
            <div className="flex items-baseline flex-wrap gap-2">
              <h1 className="text-2xl sm:text-3xl md:text-[32px] font-bold text-white tracking-tight leading-tight flex items-center gap-2.5">
                {activeCollection && (
                  <Folder className="w-6 h-6 text-brand-lime shrink-0" />
                )}
                <span>{getHeadingLabel()}</span>
              </h1>
              <span className="text-neutral-400 font-normal italic text-lg sm:text-xl ml-1">
                ({liveTotalFound}{" "}
                {liveTotalFound === 1
                  ? t("watchlist.itemSingular")
                  : t("watchlist.itemPlural")}
                )
              </span>
            </div>

            {activeCollection?.description && (
              <p className="text-xs sm:text-sm text-neutral-400 max-w-2xl">
                {activeCollection.description}
              </p>
            )}

            {activeCollection && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                >
                  <Pencil className="w-3 h-3" />
                  <span>{t("watchlist.editList")}</span>
                </button>

                {isConfirmingDelete ? (
                  <div className="inline-flex items-center gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => void handleDeleteCollection()}
                      className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold cursor-pointer"
                    >
                      {t("watchlist.confirmDelete")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsConfirmingDelete(false)}
                      className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 cursor-pointer"
                    >
                      {t("watchlist.cancel")}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(true)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-neutral-900 border border-neutral-800 hover:border-rose-500/40 text-neutral-400 hover:text-rose-400 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>{t("watchlist.deleteList")}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <SortDropdown
            currentSort={currentSort}
            options={WATCHLIST_SORT_OPTIONS}
            defaultSort="added_desc"
          />
        </div>

        <ActiveFilterChips />
      </div>

      {/* Media Cards List */}
      {activeCollection ? (
        displayedCollectionItems.length > 0 ? (
          <div className="flex flex-col gap-5 sm:gap-6 w-full">
            {displayedCollectionItems.map((entry) => {
              if (!entry.media) return null;
              return (
                <div key={entry.id} className="relative group/listcard">
                  <MediaCard media={entry.media} fromWatchlist={true} />
                  <button
                    type="button"
                    onClick={() =>
                      void handleRemoveFromCollection(entry.media_id)
                    }
                    title={t("watchlist.removeFromList")}
                    aria-label={t("watchlist.removeFromList")}
                    className="absolute top-3 right-3 z-20 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-neutral-900/90 border border-neutral-700/80 text-neutral-300 hover:text-rose-300 hover:border-rose-500/50 transition-colors cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                    <span>{t("watchlist.removeFromList")}</span>
                  </button>
                </div>
              );
            })}

            {totalPages !== undefined && totalPages > 1 && (
              <Pagination currentPage={currentPage} totalPages={totalPages} />
            )}
          </div>
        ) : (
          <div className="bg-[#181818] border border-neutral-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center my-6">
            <h2 className="text-xl font-bold text-white mb-2">
              {activeCollection.itemCount === 0
                ? t("watchlist.listEmptyTitle")
                : t("watchlist.noTitlesFound")}
            </h2>
            <p className="text-sm text-neutral-400 max-w-md mb-6">
              {activeCollection.itemCount === 0
                ? t("watchlist.listEmptyBody")
                : t("watchlist.noListMatch")}
            </p>
            <Link
              href={
                activeCollection.itemCount === 0
                  ? "/catalog"
                  : `/watchlist?collection=${activeCollection.id}`
              }
              className="px-5 py-2.5 rounded-md bg-brand-lime text-black font-semibold text-sm hover:bg-[#a8e63e] transition-colors"
            >
              {activeCollection.itemCount === 0
                ? t("watchlist.browseCatalog")
                : t("watchlist.resetListFilters")}
            </Link>
          </div>
        )
      ) : displayedItems.length > 0 ? (
        <div className="flex flex-col gap-5 sm:gap-6 w-full">
          {displayedItems.map((entry) => {
            if (!entry.media) return null;
            return (
              <MediaCard
                key={entry.id}
                media={entry.media}
                initialInWatchlist={true}
                fromWatchlist={true}
                onWatchlistToggle={handleWatchlistToggle}
              />
            );
          })}

          {totalPages !== undefined && totalPages > 1 && (
            <Pagination currentPage={currentPage} totalPages={totalPages} />
          )}
        </div>
      ) : (
        <div className="bg-[#181818] border border-neutral-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center my-6">
          <h2 className="text-xl font-bold text-white mb-2">
            {t("watchlist.noTitlesFound")}
          </h2>
          <p className="text-sm text-neutral-400 max-w-md mb-6">
            {t("watchlist.noWatchlistMatch")}
          </p>
          <Link
            href="/watchlist"
            className="px-5 py-2.5 rounded-md bg-brand-lime text-black font-semibold text-sm hover:bg-[#a8e63e] transition-colors"
          >
            {t("watchlist.resetWatchlistFilters")}
          </Link>
        </div>
      )}

      {/* Edit Active Collection Modal */}
      {activeCollection && isEditModalOpen && (
        <CollectionFormModal
          key={`edit-${activeCollection.id}`}
          isOpen={true}
          mode="edit"
          initialName={activeCollection.name}
          initialDescription={activeCollection.description}
          onClose={() => setIsEditModalOpen(false)}
          onSubmit={handleEditCollection}
        />
      )}
    </div>
  );
}
