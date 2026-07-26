'use client';

import { SignInButton } from '@clerk/nextjs';
import { useMutation, useQuery } from 'convex/react';
import { Heart, ShoppingBasket, Sparkles } from 'lucide-react';
import Link from 'next/link';

import ProductCard from '@/components/Shop/product-card';
import { Button } from '@/components/ui/button';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';

const FAVORITE_SKELETON_IDS = [
  'favorite-skeleton-1',
  'favorite-skeleton-2',
  'favorite-skeleton-3',
  'favorite-skeleton-4',
] as const;

export default function FavoritesPage() {
  const user = useQuery(api.users.current);

  const favorites = useQuery(
    api.favorites.list,
    user ? { userId: user._id } : 'skip',
  );

  const categories = useQuery(api.categories.list, {
    activeOnly: true,
  });

  const addItem = useMutation(api.cart.addItem);
  const toggleFavorite = useMutation(api.favorites.toggle);

  const categoryNames = new Map(
    categories?.map((category) => [category._id, category.name]) ?? [],
  );

  const favoriteCount =
    favorites?.reduce(
      (count, favorite) => count + (favorite.product ? 1 : 0),
      0,
    ) ?? 0;

  async function handleAddToCart(productId: Id<'products'>) {
    if (!user) return;

    await addItem({
      userId: user._id,
      productId,
      quantity: 1,
    });
  }

  async function handleToggleFavorite(productId: Id<'products'>) {
    if (!user) return;

    await toggleFavorite({
      userId: user._id,
      productId,
    });
  }

  if (user === undefined || (user !== null && favorites === undefined)) {
    return (
      <main className={'flex-1'}>
        <div className={'mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8'}>
          <div className={'mb-8 h-40 animate-pulse rounded-3xl bg-muted'} />

          <div
            className={
              'grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
            }
          >
            {FAVORITE_SKELETON_IDS.map((skeletonId) => (
              <div
                key={skeletonId}
                className='overflow-hidden rounded-3xl border bg-card'
              >
                <div className='aspect-[4/3] animate-pulse bg-muted' />

                <div className={'space-y-3 p-5'}>
                  <div
                    className={'h-3 w-24 animate-pulse rounded-full bg-muted'}
                  />
                  <div
                    className={'h-6 w-3/4 animate-pulse rounded-full bg-muted'}
                  />
                  <div
                    className={'h-4 w-full animate-pulse rounded-full bg-muted'}
                  />
                  <div className={'h-11 animate-pulse rounded-xl bg-muted'} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (user === null) {
    return (
      <main className={'flex flex-1 items-center justify-center px-4 py-16'}>
        <div
          className={
            'w-full max-w-xl rounded-3xl border bg-card/90 p-8 text-center shadow-[0_18px_50px_rgba(22,101,52,0.10)] sm:p-12'
          }
        >
          <div
            className={
              'mx-auto mb-6 flex size-20 items-center justify-center rounded-3xl bg-secondary text-primary'
            }
          >
            <Heart className={'size-10'} />
          </div>

          <h1 className={'text-3xl font-bold'}>Save your favorite groceries</h1>

          <p
            className={'mx-auto mt-3 max-w-md leading-7 text-muted-foreground'}
          >
            Sign in to create your personal shopping list and quickly find the
            products you love.
          </p>

          <SignInButton mode='modal'>
            <Button className={'mt-7 min-h-11 rounded-xl px-7'}>Sign in</Button>
          </SignInButton>
        </div>
      </main>
    );
  }

  return (
    <main className={'flex-1'}>
      <div className={'mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8'}>
        <section
          className={
            'relative mb-10 overflow-hidden rounded-3xl border border-primary/10 bg-card/90 px-6 py-8 shadow-[0_18px_50px_rgba(22,101,52,0.08)] sm:px-10 sm:py-10'
          }
        >
          <div
            className={
              'absolute -right-16 -top-20 size-56 rounded-full bg-accent/30 blur-3xl'
            }
            aria-hidden='true'
          />

          <div
            className={
              'relative flex flex-col justify-between gap-6 sm:flex-row sm:items-center'
            }
          >
            <div>
              <div
                className={
                  'mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-primary'
                }
              >
                <Sparkles className={'size-4'} />
                Your personal collection
              </div>

              <h1 className={'text-4xl font-bold'}>Favorite groceries</h1>

              <p className={'mt-3 max-w-xl leading-7 text-muted-foreground'}>
                Everything you love, saved in one place and ready to add to your
                next order.
              </p>
            </div>

            <div
              className={
                'flex size-20 shrink-0 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-[0_12px_30px_rgba(22,101,52,0.22)]'
              }
            >
              <Heart className={'size-9 fill-current'} />
            </div>
          </div>
        </section>

        {favoriteCount === 0 ? (
          <section
            className={
              'flex min-h-96 flex-col items-center justify-center rounded-3xl border border-dashed bg-card/70 px-6 text-center'
            }
          >
            <div
              className={
                'mb-6 flex size-20 items-center justify-center rounded-3xl bg-secondary text-primary'
              }
            >
              <Heart className={'size-10'} />
            </div>

            <h2 className='text-3xl font-bold'>Nothing saved yet</h2>

            <p className={'mt-3 max-w-md leading-7 text-muted-foreground'}>
              Tap the heart on any product to keep it here for your next
              shopping trip.
            </p>

            <Button asChild className={'mt-7 min-h-11 rounded-xl px-7'}>
              <Link href='/shop'>
                <ShoppingBasket className={'size-5'} />
                Browse products
              </Link>
            </Button>
          </section>
        ) : (
          <>
            <div className={'mb-6 flex items-end justify-between gap-4'}>
              <div>
                <p
                  className={
                    'text-sm font-bold uppercase tracking-[0.14em] text-primary'
                  }
                >
                  Saved products
                </p>

                <h2 className={'mt-1 text-2xl font-bold'}>Your favorites</h2>
              </div>

              <p className={'text-sm text-muted-foreground'}>
                {favoriteCount} {favoriteCount === 1 ? 'product' : 'products'}
              </p>
            </div>

            <div
              className={
                'grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
              }
            >
              {favorites?.map((favorite) => {
                const product = favorite.product;

                if (!product) return null;

                return (
                  <ProductCard
                    key={favorite._id}
                    product={product}
                    categoryName={categoryNames.get(product.categoryId)}
                    isFavorite
                    isSignedIn
                    onAdd={handleAddToCart}
                    onToggleFavorite={handleToggleFavorite}
                  />
                );
              })}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
