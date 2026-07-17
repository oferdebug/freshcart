'use client'

import { Authenticated, Unauthenticated } from 'convex/react'
import { SignInButton, UserButton } from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import { api } from '../convex/_generated/api'
export default function Home() {
  return (
      <div>
          <Authenticated>
              <UserButton />
          </Authenticated>
          <Unauthenticated>
              <SignInButton />
          </Unauthenticated>
          <div className='flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black'>
              <h1 className={'text-4xl font-bold'}>Welcome to FreshCart!</h1>
              <br />
      </div>
    </div>
  );
}
