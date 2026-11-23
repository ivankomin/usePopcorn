"use client";

import { useState, useEffect } from "react";
import { X, FolderPlus, Loader2 } from "lucide-react";
import Button from "@/components/Button";

export interface CollectionFormModalProps {
  isOpen: boolean;
  mode: "create" | "edit";
  initialName?: string;
  initialDescription?: string | null;
  onClose: () => void;
  onSubmit: (values: {
    name: string;
    description: string | null;
  }) => Promise<{ success: boolean; error?: string }>;
}

export function CollectionFormModal({
  isOpen,
  mode,
  initialName = "",
  initialDescription = "",
  onClose,
  onSubmit,
}: CollectionFormModalProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription || "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Please enter a name for your list.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await onSubmit({
        name: trimmedName,
        description: description.trim() || null,
      });

      if (!res.success) {
        setError(res.error || "Failed to save list.");
      } else {
        onClose();
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={mode === "create" ? "Create New List" : "Edit List"}
      onClick={() => !isSubmitting && onClose()}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#181818] border border-neutral-800 rounded-2xl shadow-2xl shadow-black/90 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-brand-lime/15 text-brand-lime flex items-center justify-center shrink-0">
              <FolderPlus className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-white">
              {mode === "create" ? "Create Custom List" : "Edit Custom List"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="collection-name-input"
                className="text-xs font-semibold text-neutral-300"
              >
                List Name <span className="text-rose-400">*</span>
              </label>
              <span className="text-[11px] font-mono text-neutral-500">
                {name.length}/80
              </span>
            </div>
            <input
              id="collection-name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              required
              autoFocus
              disabled={isSubmitting}
              placeholder="e.g. Weekend Sci-Fi Marathon"
              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-brand-lime transition-colors disabled:opacity-50"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="collection-description-input"
                className="text-xs font-semibold text-neutral-300"
              >
                Description (Optional)
              </label>
              <span className="text-[11px] font-mono text-neutral-500">
                {description.length}/300
              </span>
            </div>
            <textarea
              id="collection-description-input"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={300}
              disabled={isSubmitting}
              placeholder="What's the theme or mood of this collection?"
              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-brand-lime transition-colors resize-none disabled:opacity-50"
            />
          </div>

          {error && (
            <div className="text-xs text-rose-300 bg-rose-950/30 border border-rose-500/30 rounded-xl px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-800/80">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-900 border border-neutral-700 hover:border-neutral-600 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !name.trim()}
              isLoading={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>
                  {mode === "create" ? "Create List" : "Save Changes"}
                </span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
