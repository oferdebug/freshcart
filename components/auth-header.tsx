'use client';

import { SignInButton, SignUpButton, UserButton, useAuth } from '@clerk/nextjs';

export function AuthHeader() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return null;
  }

  return (
    <header className='flex items-center justify-end gap-3 px-6 py-4'>
      {isSignedIn ? (
        <UserButton />
      ) : (
        <>
          <SignInButton mode='redirect'>
            <button
              type='button'
              className='rounded-full border border-solid  border-black/[.08] px-4 py-2 text-sm font-medium transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]'
            >
              Sign in
            </button>
          </SignInButton>
          <SignUpButton mode='redirect'>
            <button
              type='button'
              className='rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]'
            >
              Sign up
            </button>
          </SignUpButton>
        </>
      )}
    </header>
  );
}
