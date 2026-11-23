"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ListPlus, Check, Plus, Folder, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCollections } from "@/hooks/useCollections";
import { useOutsideClick } from "@/hooks/useOutsideClick";
import { redirectToLogin } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export interface AddToCollectionMenuProps {
  mediaId: string;
}

export function AddToCollectionMenu({ mediaId }: AddToCollectionMenuProps) {
  const router = useRouter();
  const { user } = useAuth();
  const {
    collections,
    getCollectionsForMedia,
    createCollection,
    toggleMediaInCollection,
  } = useCollections();

  const [isOpen, setIsOpen] = useState(false);
  const [isCreatingInline, setIsCreatingInline] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  useOutsideClick(menuRef, () => setIsOpen(false), isOpen);

  const assignedCollections = getCollectionsForMedia(mediaId);
  const assignedCount = assignedCollections.length;

  const handleToggleMenu = () => {
    if (!user) {
      redirectToLogin(router);
      return;
    }
    setIsOpen((prev) => !prev);
    setInlineError(null);
  };

  const handleCreateAndAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newListName.trim();
    if (!trimmed || isSubmittingNew) return;

    setIsSubmittingNew(true);
    setInlineError(null);

    try {
      const res = await createCollection(trimmed);
      if (!res.success || !res.collection) {
        setInlineError(res.error || "Failed to create list.");
      } else {
        await toggleMediaInCollection(res.collection.id, mediaId);
        setNewListName("");
        setIsCreatingInline(false);
      }
    } finally {
      setIsSubmittingNew(false);
    }
  };

  return (
    <div className="relative w-full" ref={menuRef}>
      <button
        type="button"
        onClick={handleToggleMenu}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className={cn(
          "w-full h-10 px-3.5 rounded-xl bg-[#181818] border text-xs font-medium flex items-center justify-between transition-all cursor-pointer select-none",
          assignedCount > 0
            ? "border-brand-lime/50 text-white hover:border-brand-lime"
            : "border-neutral-700/80 text-neutral-200 hover:border-neutral-500 hover:bg-neutral-800/60 hover:text-white",
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <ListPlus
            className={cn(
              "w-4 h-4 shrink-0",
              assignedCount > 0 ? "text-brand-lime" : "text-neutral-400",
            )}
          />
          <span className="truncate">
            {assignedCount === 0
              ? "Add to Custom List"
              : assignedCount === 1
                ? `In "${assignedCollections[0].name}"`
                : `In ${assignedCount} Custom Lists`}
          </span>
        </div>

        {assignedCount > 0 && (
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-brand-lime/20 text-brand-lime shrink-0">
            {assignedCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 w-full rounded-xl bg-[#1c1c1c] border border-neutral-700/90 shadow-2xl p-2 z-30 flex flex-col gap-1.5 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2 py-1 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider border-b border-neutral-800 pb-1.5">
            Save to Custom Lists
          </div>

          {collections.length === 0 ? (
            <p className="px-2 py-2 text-xs text-neutral-500 italic">
              You don&apos;t have any custom lists yet.
            </p>
          ) : (
            <div className="max-h-48 overflow-y-auto flex flex-col gap-0.5">
              {collections.map((col) => {
                const isMember = col.mediaIds.includes(mediaId);
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => void toggleMediaInCollection(col.id, mediaId)}
                    className={cn(
                      "flex items-center justify-between gap-2 w-full px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer text-left",
                      isMember
                        ? "bg-brand-lime/10 text-white font-semibold"
                        : "text-neutral-300 hover:bg-neutral-800 hover:text-white",
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={cn(
                          "w-4 h-4 rounded flex items-center justify-center border shrink-0 transition-colors",
                          isMember
                            ? "bg-brand-lime border-brand-lime text-black"
                            : "border-neutral-600 bg-neutral-900",
                        )}
                      >
                        {isMember && <Check className="w-3 h-3 stroke-3" />}
                      </span>
                      <Folder className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                      <span className="truncate">{col.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-neutral-500 shrink-0">
                      {col.itemCount}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Inline Create List */}
          <div className="pt-1.5 border-t border-neutral-800">
            {isCreatingInline ? (
              <form
                onSubmit={handleCreateAndAdd}
                className="flex flex-col gap-2 px-1"
              >
                <input
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  maxLength={80}
                  autoFocus
                  disabled={isSubmittingNew}
                  placeholder="New list name..."
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-brand-lime"
                />
                {inlineError && (
                  <p className="text-[11px] text-rose-400">{inlineError}</p>
                )}
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingInline(false);
                      setNewListName("");
                      setInlineError(null);
                    }}
                    disabled={isSubmittingNew}
                    className="px-2.5 py-1 rounded-lg text-[11px] text-neutral-400 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingNew || !newListName.trim()}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-brand-lime text-black hover:bg-brand-lime/90 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmittingNew && (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    )}
                    <span>Create &amp; Add</span>
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setIsCreatingInline(true)}
                className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-xs font-semibold text-brand-lime hover:bg-neutral-800/80 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create new list</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
