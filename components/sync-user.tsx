"use client";

import { useConvexAuth, useMutation } from "convex/react";
import { useEffect } from "react";
import { api } from "@/convex/_generated/api";

export function SyncUser() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const upsertCurrentUser = useMutation(api.users.upsertCurrentUser);

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      void upsertCurrentUser();
    }
  }, [isAuthenticated, isLoading, upsertCurrentUser]);

  return null;
}
