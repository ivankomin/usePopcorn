"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { redirectToLogin } from "@/lib/navigation";
import { useAuth } from "@/hooks/useAuth";
import type { CollectionRow, UserCollection } from "@/types/media";

export interface CollectionMutationResult {
  success: boolean;
  collection?: UserCollection;
  error?: string;
}

export interface CollectionsContextType {
  collections: UserCollection[];
  isLoading: boolean;
  getCollectionsForMedia: (mediaId: string) => UserCollection[];
  isInCollection: (collectionId: string, mediaId: string) => boolean;
  createCollection: (
    name: string,
    description?: string | null,
  ) => Promise<CollectionMutationResult>;
  updateCollection: (
    collectionId: string,
    updates: { name: string; description?: string | null },
  ) => Promise<CollectionMutationResult>;
  deleteCollection: (collectionId: string) => Promise<{
    success: boolean;
    error?: string;
  }>;
  toggleMediaInCollection: (
    collectionId: string,
    mediaId: string,
  ) => Promise<boolean>;
  removeMediaFromCollection: (
    collectionId: string,
    mediaId: string,
  ) => Promise<boolean>;
  refreshCollections: () => Promise<void>;
}

const CollectionsContext = createContext<CollectionsContextType | undefined>(
  undefined,
);

interface CollectionWithItemIds extends CollectionRow {
  collection_items?: Array<{ media_id: string }> | null;
}

function mapUserCollections(
  rows: ReadonlyArray<CollectionWithItemIds>,
): UserCollection[] {
  return rows.map((row) => {
    const mediaIds = (row.collection_items || []).map((item) => item.media_id);
    return {
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      description: row.description,
      created_at: row.created_at,
      updated_at: row.updated_at,
      mediaIds,
      itemCount: mediaIds.length,
    };
  });
}

export function CollectionsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const router = useRouter();

  const [prevUserId, setPrevUserId] = useState(userId);
  const [collections, setCollections] = useState<UserCollection[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(userId));

  if (prevUserId !== userId) {
    setPrevUserId(userId);
    if (!userId) {
      setCollections([]);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }
  }

  const supabase = useMemo(() => createClient(), []);

  const loadCollectionsState = useCallback(
    async (currentUserId: string) => {
      const { data, error } = await supabase
        .from("collections")
        .select("*, collection_items(media_id)")
        .eq("user_id", currentUserId)
        .order("created_at", { ascending: false });

      if (error || !data) return null;
      return mapUserCollections(data as unknown as CollectionWithItemIds[]);
    },
    [supabase],
  );

  const refreshCollections = useCallback(async () => {
    if (!userId) {
      setCollections([]);
      return;
    }
    try {
      const result = await loadCollectionsState(userId);
      if (result) {
        setCollections(result);
      }
    } catch (err) {
      console.error("Failed to load user collections:", err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, loadCollectionsState]);

  useEffect(() => {
    if (!userId) return;

    let isMounted = true;
    loadCollectionsState(userId)
      .then((result) => {
        if (!isMounted) return;
        if (result) {
          setCollections(result);
        }
      })
      .catch((err) => {
        console.error("Failed to load user collections:", err);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [loadCollectionsState, userId]);

  const getCollectionsForMedia = useCallback(
    (mediaId: string): UserCollection[] =>
      collections.filter((col) => col.mediaIds.includes(mediaId)),
    [collections],
  );

  const isInCollection = useCallback(
    (collectionId: string, mediaId: string): boolean => {
      const target = collections.find((c) => c.id === collectionId);
      return target ? target.mediaIds.includes(mediaId) : false;
    },
    [collections],
  );

  const createCollection = useCallback(
    async (
      name: string,
      description?: string | null,
    ): Promise<CollectionMutationResult> => {
      if (!userId) {
        redirectToLogin(router);
        return { success: false, error: "Please sign in to create a list." };
      }

      const trimmedName = name.trim();
      const trimmedDesc = description?.trim() || null;

      if (!trimmedName) {
        return { success: false, error: "List name is required." };
      }
      if (trimmedName.length > 80) {
        return {
          success: false,
          error: "List name must be 80 characters or fewer.",
        };
      }
      if (trimmedDesc && trimmedDesc.length > 300) {
        return {
          success: false,
          error: "Description must be 300 characters or fewer.",
        };
      }

      try {
        const { data, error } = await supabase
          .from("collections")
          .insert({
            user_id: userId,
            name: trimmedName,
            description: trimmedDesc,
          })
          .select("*")
          .single();

        if (error) {
          if (error.code === "23505") {
            return {
              success: false,
              error: "You already have a list with that name.",
            };
          }
          return { success: false, error: error.message };
        }

        const created: UserCollection = {
          ...data,
          mediaIds: [],
          itemCount: 0,
        };
        setCollections((prev) => [created, ...prev]);
        return { success: true, collection: created };
      } catch (err: unknown) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Failed to create list.",
        };
      }
    },
    [userId, router, supabase],
  );

  const updateCollection = useCallback(
    async (
      collectionId: string,
      updates: { name: string; description?: string | null },
    ): Promise<CollectionMutationResult> => {
      if (!userId) {
        return { success: false, error: "Authentication required." };
      }

      const trimmedName = updates.name.trim();
      const trimmedDesc = updates.description?.trim() || null;

      if (!trimmedName) {
        return { success: false, error: "List name is required." };
      }
      if (trimmedName.length > 80) {
        return {
          success: false,
          error: "List name must be 80 characters or fewer.",
        };
      }
      if (trimmedDesc && trimmedDesc.length > 300) {
        return {
          success: false,
          error: "Description must be 300 characters or fewer.",
        };
      }

      try {
        const { data, error } = await supabase
          .from("collections")
          .update({
            name: trimmedName,
            description: trimmedDesc,
            updated_at: new Date().toISOString(),
          })
          .eq("id", collectionId)
          .eq("user_id", userId)
          .select("*")
          .single();

        if (error) {
          if (error.code === "23505") {
            return {
              success: false,
              error: "You already have a list with that name.",
            };
          }
          return { success: false, error: error.message };
        }

        let updatedCol: UserCollection | undefined;
        setCollections((prev) =>
          prev.map((col) => {
            if (col.id !== collectionId) return col;
            updatedCol = {
              ...col,
              ...data,
            };
            return updatedCol;
          }),
        );

        return { success: true, collection: updatedCol };
      } catch (err: unknown) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Failed to update list.",
        };
      }
    },
    [userId, supabase],
  );

  const deleteCollection = useCallback(
    async (
      collectionId: string,
    ): Promise<{ success: boolean; error?: string }> => {
      if (!userId) {
        return { success: false, error: "Authentication required." };
      }

      const previous = collections;
      setCollections((prev) => prev.filter((c) => c.id !== collectionId));

      try {
        const { error } = await supabase
          .from("collections")
          .delete()
          .eq("id", collectionId)
          .eq("user_id", userId);

        if (error) throw error;
        return { success: true };
      } catch (err: unknown) {
        setCollections(previous);
        return {
          success: false,
          error: err instanceof Error ? err.message : "Failed to delete list.",
        };
      }
    },
    [userId, collections, supabase],
  );

  const removeMediaFromCollection = useCallback(
    async (collectionId: string, mediaId: string): Promise<boolean> => {
      if (!userId) return false;

      const previous = collections;
      setCollections((prev) =>
        prev.map((col) => {
          if (col.id !== collectionId) return col;
          const nextIds = col.mediaIds.filter((id) => id !== mediaId);
          return { ...col, mediaIds: nextIds, itemCount: nextIds.length };
        }),
      );

      try {
        const { error } = await supabase
          .from("collection_items")
          .delete()
          .eq("collection_id", collectionId)
          .eq("media_id", mediaId);

        if (error) throw error;
        return true;
      } catch (err) {
        setCollections(previous);
        console.error("Failed to remove item from collection:", err);
        return false;
      }
    },
    [userId, collections, supabase],
  );

  const toggleMediaInCollection = useCallback(
    async (collectionId: string, mediaId: string): Promise<boolean> => {
      if (!userId) {
        redirectToLogin(router);
        return false;
      }

      const target = collections.find((c) => c.id === collectionId);
      const alreadyIn = target?.mediaIds.includes(mediaId) ?? false;

      if (alreadyIn) {
        return removeMediaFromCollection(collectionId, mediaId);
      }

      const previous = collections;
      setCollections((prev) =>
        prev.map((col) => {
          if (col.id !== collectionId) return col;
          const nextIds = col.mediaIds.includes(mediaId)
            ? col.mediaIds
            : [mediaId, ...col.mediaIds];
          return { ...col, mediaIds: nextIds, itemCount: nextIds.length };
        }),
      );

      try {
        const { error } = await supabase
          .from("collection_items")
          .upsert(
            { collection_id: collectionId, media_id: mediaId },
            { onConflict: "collection_id,media_id" },
          );

        if (error) throw error;
        return true;
      } catch (err) {
        setCollections(previous);
        console.error("Failed to add item to collection:", err);
        return false;
      }
    },
    [userId, router, collections, removeMediaFromCollection, supabase],
  );

  const value = useMemo(
    () => ({
      collections,
      isLoading,
      getCollectionsForMedia,
      isInCollection,
      createCollection,
      updateCollection,
      deleteCollection,
      toggleMediaInCollection,
      removeMediaFromCollection,
      refreshCollections,
    }),
    [
      collections,
      isLoading,
      getCollectionsForMedia,
      isInCollection,
      createCollection,
      updateCollection,
      deleteCollection,
      toggleMediaInCollection,
      removeMediaFromCollection,
      refreshCollections,
    ],
  );

  return (
    <CollectionsContext.Provider value={value}>
      {children}
    </CollectionsContext.Provider>
  );
}

export function useCollections(): CollectionsContextType {
  const context = useContext(CollectionsContext);
  if (!context) {
    throw new Error("useCollections must be used within a CollectionsProvider");
  }
  return context;
}
