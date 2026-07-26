'use client';
import { SignInButton, SignUpButton, UserButton, useAuth } from '@clerk/nextjs';
import { useQuery } from 'convex/react';
import { Heart, ShoppingBasket } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { api } from '@/convex/_generated/api';
import { cn } from '@/lib/utils';

const navigation = [
  {
    label: 'Shop',
    href: '/shop',
  },
  {
    label: 'Favorites',
    href: '/favorites',
  },
];

export function AuthHeader() {
  const pathname = usePathname();
  const { isSignedIn, isLoaded } = useAuth();

  const user = useQuery(api.users.current);
  const cartItems = useQuery(
    api.cart.getCart,
    isSignedIn && user ? { userId: user._id } : 'skip',
  );

  const cartItemCount =
    cartItems?.reduce((total, item) => total + item.quantity, 0) ?? 0;

  return (
    <header
      className={
        'sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-xl'
      }
    >
      <div
        className={
          'mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8'
        }
      >
        <div className={'flex items-center gap-8'}>
          <Link
            href={'/'}
            aria-label={'FreshCart home'}
            className={'group flex items-center gap-3'}
          >
            <div
              className={
                'flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_8px_20px_rgba(22,101,52,0.22)] transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-105'
              }
            >
              <ShoppingBasket className={'size-6'} aria-hidden={'true'} />
            </div>

            <div>
              <p
                className={
                  'font-heading text-xl font-bold leading-none tracking-tight'
                }
              >
                Fresh<span className={'text-primary'}>Cart</span>
              </p>
              <p
                className={'mt-1 hidden text-xs text-muted-foreground sm:block'}
              >
                Groceries made simple
              </p>
            </div>
          </Link>

          {isSignedIn && (
            <nav
              aria-label={'Main navigation'}
              className={'hidden items-center gap-1 md:flex'}
            >
              {navigation.map((item) => {
                const active = isActiveRoute(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex min-h-11 items-center rounded-xl px-4 text-sm font-bold',
                      'transition-colors',
                      active
                        ? 'bg-secondary text-primary'
                        : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground',
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>

        <div className={'flex items-center gap-2'}>
          {!isLoaded ? (
            <div className={'size-10 animate-pulse rounded-full bg-muted'} />
          ) : isSignedIn ? (
            <>
              <Button
                asChild
                type={'button'}
                variant={'ghost'}
                size={'icon'}
                className={'size-11 rounded-xl md:hidden'}
              >
                <Link href={'/favorites'} aria-label={'View favorites'}>
                  <Heart className={'size-5'} aria-hidden={'true'} />
                </Link>
              </Button>

              <Button
                asChild
                type={'button'}
                variant={'outline'}
                size={'icon'}
                className={'relative size-11 rounded-xl bg-card shadow-sm'}
              >
                <Link
                  href={'/cart'}
                  aria-label={`View shopping cart with ${cartItemCount} items`}
                >
                  <ShoppingBasket className={'size-5'} aria-hidden={'true'} />

                  {cartItemCount > 0 && (
                    <span
                      className={
                        'absolute -right-1.5 -top-1.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold leading-none text-primary-foreground ring-2 ring-background'
                      }
                    >
                      {cartItemCount > 99 ? '99+' : cartItemCount}
                    </span>
                  )}
                </Link>
              </Button>

              <div className={'ml-1 flex size-11 items-center justify-center'}>
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: 'size-10',
                    },
                  }}
                />
              </div>
            </>
          ) : (
            <>
              <SignInButton mode={'modal'}>
                <Button
                  type={'button'}
                  variant={'ghost'}
                  className={'min-h-11 rounded-xl'}
                >
                  Sign in
                </Button>
              </SignInButton>

              <SignUpButton mode={'modal'}>
                <Button type={'button'} className={'min-h-11 rounded-xl px-5'}>
                  Get started
                </Button>
              </SignUpButton>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function isActiveRoute(pathname: string, href: string) {
  if (href === '/shop') {
    return (
      pathname === href ||
      pathname.startsWith(`${href}/`) ||
      pathname.startsWith('/product/')
    );
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default AuthHeader;
