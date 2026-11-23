"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Folder,
  FolderPlus,
  Pencil,
  Trash2,
  ExternalLink,
  X,
} from "lucide-react";
import type { CollectionWithMedia } from "@/types/media";
import { useCollections } from "@/hooks/useCollections";
import { useI18n } from "@/hooks/useI18n";
import { CollectionFormModal } from "@/components/CollectionFormModal";
import { ProfileMovieCard } from "./ProfileMovieCard";

export interface CabinetCollectionsProps {
  initialCollections: CollectionWithMedia[];
}

export function CabinetCollections({
  initialCollections,
}: CabinetCollectionsProps) {
  const router = useRouter();
  const { t } = useI18n();
  const {
    createCollection,
    updateCollection,
    deleteCollection,
    removeMediaFromCollection,
  } = useCollections();

  const [prevInitial, setPrevInitial] = useState(initialCollections);
  const [collections, setCollections] =
    useState<CollectionWithMedia[]>(initialCollections);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialCollections[0]?.id ?? null,
  );

  if (prevInitial !== initialCollections) {
    setPrevInitial(initialCollections);
    setCollections(initialCollections);
    if (
      selectedId &&
      !initialCollections.some((c) => c.id === selectedId)
    ) {
      setSelectedId(initialCollections[0]?.id ?? null);
    } else if (!selectedId && initialCollections.length > 0) {
      setSelectedId(initialCollections[0].id);
    }
  }

  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingCollection, setEditingCollection] =
    useState<CollectionWithMedia | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const selectedCollection =
    collections.find((c) => c.id === selectedId) ?? collections[0] ?? null;

  const handleCreateSubmit = async (values: {
    name: string;
    description: string | null;
  }) => {
    const res = await createCollection(values.name, values.description);
    if (res.success && res.collection) {
      const created: CollectionWithMedia = {
        ...res.collection,
        items: [],
        itemCount: 0,
      };
      setCollections((prev) => [created, ...prev]);
      setSelectedId(created.id);
      router.refresh();
    }
    return res;
  };

  const handleEditSubmit = async (values: {
    name: string;
    description: string | null;
  }) => {
    if (!editingCollection) return { success: false, error: "No list selected" };
    const res = await updateCollection(editingCollection.id, values);
    if (res.success && res.collection) {
      const updated = res.collection;
      setCollections((prev) =>
        prev.map((col) =>
          col.id === updated.id
            ? {
                ...col,
                name: updated.name,
                description: updated.description,
                updated_at: updated.updated_at,
              }
            : col,
        ),
      );
      router.refresh();
    }
    return res;
  };

  const handleDeleteCollection = async (collectionId: string) => {
    const res = await deleteCollection(collectionId);
    if (res.success) {
      setCollections((prev) => {
        const next = prev.filter((c) => c.id !== collectionId);
        if (selectedId === collectionId) {
          setSelectedId(next[0]?.id ?? null);
        }
        return next;
      });
      setConfirmDeleteId(null);
      router.refresh();
    }
  };

  const handleRemoveItem = async (collectionId: string, mediaId: string) => {
    const ok = await removeMediaFromCollection(collectionId, mediaId);
    if (ok) {
      setCollections((prev) =>
        prev.map((col) => {
          if (col.id !== collectionId) return col;
          const nextItems = col.items.filter(
            (entry) => entry.media_id !== mediaId,
          );
          return { ...col, items: nextItems, itemCount: nextItems.length };
        }),
      );
      router.refresh();
    }
  };

  return (
    <div className="flex flex-col gap-5 pt-6 border-t border-neutral-800/80">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <Folder className="w-5 h-5 text-brand-lime" />
            <span>{t("profile.customCollections")}</span>
            <span className="text-xs font-mono font-normal text-neutral-400">
              ({collections.length})
            </span>
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            {t("profile.customCollectionsDesc")}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingCollection(null);
            setModalMode("create");
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-lime text-black text-xs font-semibold hover:bg-brand-lime/90 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <FolderPlus className="w-3.5 h-3.5" />
          <span>{t("watchlist.newList")}</span>
        </button>
      </div>

      {collections.length === 0 ? (
        <div className="bg-brand-surface border border-neutral-800/80 rounded-2xl p-10 text-center flex flex-col items-center justify-center gap-3">
          <Folder className="w-9 h-9 text-neutral-600" />
          <h3 className="text-base font-bold text-white">
            {t("profile.noCustomLists")}
          </h3>
          <p className="text-xs text-neutral-400 max-w-sm">
            {t("profile.customCollectionsDesc")}
          </p>
          <button
            type="button"
            onClick={() => {
              setEditingCollection(null);
              setModalMode("create");
            }}
            className="mt-1 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-lime text-black text-xs font-semibold hover:bg-brand-lime/90 transition-colors cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>{t("profile.createFirstList")}</span>
          </button>
        </div>
      ) : (
        <>
          {/* Collection Selector Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {collections.map((col) => {
              const isActive = selectedCollection?.id === col.id;
              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(col.id);
                    setConfirmDeleteId(null);
                  }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors border cursor-pointer shrink-0 ${
                    isActive
                      ? "bg-brand-lime text-black border-brand-lime"
                      : "bg-brand-surface border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700"
                  }`}
                >
                  <Folder className="w-3.5 h-3.5 shrink-0" />
                  <span>{col.name}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                      isActive
                        ? "bg-black/20 text-black font-bold"
                        : "bg-neutral-800 text-neutral-400"
                    }`}
                  >
                    {col.itemCount}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Collection Details & Grid */}
          {selectedCollection && (
            <div className="flex flex-col gap-5 bg-brand-surface border border-neutral-800 rounded-2xl p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-neutral-800/80">
                <div className="space-y-1 min-w-0">
                  <h3 className="text-lg font-bold text-white truncate">
                    {selectedCollection.name}
                  </h3>
                  {selectedCollection.description && (
                    <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                      {selectedCollection.description}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <Link
                    href={`/watchlist?collection=${selectedCollection.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-xs text-neutral-300 hover:text-white transition-colors"
                  >
                    <span>{t("profile.openInWatchlist")}</span>
                    <ExternalLink className="w-3 h-3 text-neutral-500" />
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingCollection(selectedCollection);
                      setModalMode("edit");
                    }}
                    title={t("watchlist.editList")}
                    className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>

                  {confirmDeleteId === selectedCollection.id ? (
                    <div className="flex items-center gap-1.5 text-xs">
                      <button
                        type="button"
                        onClick={() =>
                          void handleDeleteCollection(selectedCollection.id)
                        }
                        className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold cursor-pointer"
                      >
                        {t("watchlist.confirmDelete")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 cursor-pointer"
                      >
                        {t("watchlist.cancel")}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(selectedCollection.id)}
                      title={t("watchlist.deleteList")}
                      className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-rose-500/40 text-neutral-400 hover:text-rose-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {selectedCollection.items.length === 0 ? (
                <div className="py-10 text-center flex flex-col items-center gap-2.5">
                  <p className="text-sm font-semibold text-white">
                    {t("watchlist.listEmptyTitle")}
                  </p>
                  <p className="text-xs text-neutral-400 max-w-sm">
                    {t("watchlist.listEmptyBody")}
                  </p>
                  <Link
                    href="/catalog"
                    className="mt-1 px-4 py-2 rounded-xl bg-brand-lime text-black text-xs font-semibold hover:bg-brand-lime/90 transition-colors"
                  >
                    {t("watchlist.browseCatalog")}
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
                  {selectedCollection.items.map((entry) => {
                    if (!entry.media) return null;
                    return (
                      <div key={entry.id} className="relative group/colcard">
                        <ProfileMovieCard media={entry.media} />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleRemoveItem(
                              selectedCollection.id,
                              entry.media_id,
                            );
                          }}
                          title={`Remove from "${selectedCollection.name}"`}
                          aria-label={`Remove ${entry.media.title} from ${selectedCollection.name}`}
                          className="absolute top-2.5 right-2.5 z-20 w-7 h-7 rounded-full bg-black/75 border border-white/15 text-neutral-300 hover:text-white hover:bg-rose-600 hover:border-rose-500 flex items-center justify-center opacity-0 group-hover/colcard:opacity-100 transition-all cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Create / Edit Modal */}
      {modalMode && (
        <CollectionFormModal
          key={`${modalMode}-${editingCollection?.id ?? "new"}`}
          isOpen={true}
          mode={modalMode}
          initialName={
            modalMode === "edit" ? editingCollection?.name ?? "" : ""
          }
          initialDescription={
            modalMode === "edit" ? editingCollection?.description ?? "" : ""
          }
          onClose={() => {
            setModalMode(null);
            setEditingCollection(null);
          }}
          onSubmit={
            modalMode === "create" ? handleCreateSubmit : handleEditSubmit
          }
        />
      )}
    </div>
  );
}
