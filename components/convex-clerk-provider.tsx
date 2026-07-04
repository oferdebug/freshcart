'use client';

import { useAuth } from '@clerk/nextjs';
import { ConvexReactClient, useMutation, useConvexAuth } from 'convex/react';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { api } from '@/convex/_generated/api';

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  throw new Error('Missing NEXT_PUBLIC_CONVEX_URL in your .env file');
}

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL);

export default function ConvexClientProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <AuthSync />
      {children}
    </ConvexProviderWithClerk>
  );
}

function AuthSync() {
  const upsertUser = useMutation(api.users.upsert);
  const { isAuthenticated } = useConvexAuth();
  useEffect(() => {
    if (isAuthenticated) {
      upsertUser();
    }
  }, [isAuthenticated, upsertUser]);
  return null;
}
