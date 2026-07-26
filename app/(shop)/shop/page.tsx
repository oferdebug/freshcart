'use client';

import { useMutation, useQuery } from 'convex/react';
import { Leaf, Search, SearchX, Sparkles, Truck, X } from 'lucide-react';
import { useState } from 'react';

import ProductCard from '@/components/Shop/product-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';

export default function ShopPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<
    Id<'categories'> | undefined
  >();

  const normalizedSearch = searchQuery.trim();
  const isSearching = normalizedSearch.length > 2;

  const user = useQuery(api.users.current);

  const categories = useQuery(api.categories.list, {
    activeOnly: true,
  });

  const products = useQuery(api.products.list, {
    categoryId: selectedCategory,
  });

  const searchResults = useQuery(
    api.products.search,
    isSearching
      ? {
          query: normalizedSearch,
          categoryId: selectedCategory,
        }
      : 'skip',
  );

  const favorites = useQuery(
    api.favorites.list,
    user ? { userId: user._id } : 'skip',
  );

  const addItem = useMutation(api.cart.addItem);
  const toggleFavorite = useMutation(api.favorites.toggle);

  const displayProducts = isSearching ? searchResults : products;

  const favoriteProductIds = new Set(
    favorites?.map((favorite) => favorite.productId) ?? [],
  );

  const categoryNames = new Map(
    categories?.map((category) => [category._id, category.name]) ?? [],
  );

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

  function clearFilters() {
    setSearchQuery('');
    setSelectedCategory(undefined);
  }

  return (
    <main className='flex-1'>
      <div className='mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8'>
        <section className='relative overflow-hidden rounded-3xl bg-primary px-6 py-10 text-primary-foreground shadow-[0_24px_70px_rgba(22,101,52,0.22)] sm:px-10 sm:py-14'>
          <div
            className='absolute -right-20 -top-24 size-72 rounded-full bg-accent/20 blur-3xl'
            aria-hidden='true'
          />

          <div
            className='absolute -bottom-28 left-1/3 size-64 rounded-full bg-white/10 blur-3xl'
            aria-hidden='true'
          />

          <div className='relative max-w-3xl'>
            <div className='mb-5 inline-flex min-h-9 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 text-sm font-bold backdrop-blur'>
              <Sparkles className='size-4 text-accent' />
              Fresh groceries, delivered
            </div>

            <h1 className='max-w-2xl text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl'>
              Your weekly shop,
              <span className='text-accent'> made fresh.</span>
            </h1>

            <p className='mt-5 max-w-xl text-base leading-7 text-white/80 sm:text-lg'>
              Everyday essentials, fresh produce and pantry favourites delivered
              straight to your door.
            </p>

            <div className='mt-8 max-w-2xl'>
              <div className='relative'>
                <Search
                  className='pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground'
                  aria-hidden='true'
                />

                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder='Search bananas, milk, bread...'
                  className='h-14 rounded-2xl border-white/50 bg-white pl-12 pr-12 text-base text-foreground shadow-xl placeholder:text-muted-foreground focus-visible:ring-accent'
                />

                {searchQuery && (
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    onClick={() => setSearchQuery('')}
                    aria-label='Clear search'
                    className='absolute right-2 top-1/2 size-10 -translate-y-1/2 rounded-xl text-muted-foreground hover:bg-muted'
                  >
                    <X className='size-5' />
                  </Button>
                )}
              </div>

              {normalizedSearch.length > 0 && normalizedSearch.length < 3 && (
                <p className='mt-2 pl-2 text-sm text-white/70'>
                  Type at least 3 characters to search.
                </p>
              )}
            </div>

            <div className='mt-7 flex flex-wrap gap-3 text-sm font-semibold'>
              <div className='flex min-h-10 items-center gap-2 rounded-full bg-white/10 px-4 backdrop-blur'>
                <Leaf className='size-4 text-accent' />
                Fresh selection
              </div>

              <div className='flex min-h-10 items-center gap-2 rounded-full bg-white/10 px-4 backdrop-blur'>
                <Truck className='size-4 text-accent' />
                Fast delivery
              </div>
            </div>
          </div>
        </section>

        <section className='py-10'>
          <div className='mb-8'>
            <div className='mb-5 flex items-end justify-between gap-4'>
              <div>
                <p className='mb-1 text-sm font-bold uppercase tracking-[0.15em] text-primary'>
                  Shop by category
                </p>

                <h2 className='text-3xl font-bold'>Explore groceries</h2>
              </div>

              {displayProducts !== undefined && (
                <p className='hidden text-sm text-muted-foreground sm:block'>
                  {displayProducts.length}{' '}
                  {displayProducts.length === 1 ? 'product' : 'products'}
                </p>
              )}
            </div>

            <div className='flex gap-2 overflow-x-auto pb-2'>
              <Button
                type='button'
                variant={selectedCategory === undefined ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(undefined)}
                aria-pressed={selectedCategory === undefined}
                className='min-h-11 shrink-0 rounded-full px-5'
              >
                All products
              </Button>

              {categories?.map((category) => (
                <Button
                  key={category._id}
                  type='button'
                  variant={
                    selectedCategory === category._id ? 'default' : 'outline'
                  }
                  onClick={() => setSelectedCategory(category._id)}
                  aria-pressed={selectedCategory === category._id}
                  className='min-h-11 shrink-0 rounded-full bg-card px-5'
                >
                  {category.name}
                </Button>
              ))}
            </div>
          </div>

          {displayProducts === undefined && (
            <div className='grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                  key={index}
                  className='overflow-hidden rounded-3xl border bg-card'
                >
                  <div className='aspect-[4/3] animate-pulse bg-muted' />

                  <div className='space-y-3 p-5'>
                    <div className='h-3 w-24 animate-pulse rounded-full bg-muted' />
                    <div className='h-6 w-3/4 animate-pulse rounded-full bg-muted' />
                    <div className='h-4 w-full animate-pulse rounded-full bg-muted' />
                    <div className='h-11 animate-pulse rounded-xl bg-muted' />
                  </div>
                </div>
              ))}
            </div>
          )}

          {displayProducts?.length === 0 && (
            <div className='flex min-h-80 flex-col items-center justify-center rounded-3xl border border-dashed bg-card/70 px-6 text-center'>
              <div className='mb-5 flex size-16 items-center justify-center rounded-2xl bg-secondary text-primary'>
                <SearchX className='size-8' />
              </div>

              <h3 className='text-2xl font-bold'>No products found</h3>

              <p className='mt-2 max-w-md text-muted-foreground'>
                Try another search term or clear the selected category.
              </p>

              <Button
                type='button'
                onClick={clearFilters}
                className='mt-6 min-h-11 rounded-xl px-6'
              >
                Clear filters
              </Button>
            </div>
          )}

          {displayProducts && displayProducts.length > 0 && (
            <div className='grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
              {displayProducts.map((product) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  categoryName={categoryNames.get(product.categoryId)}
                  isFavorite={favoriteProductIds.has(product._id)}
                  isSignedIn={Boolean(user)}
                  onAdd={handleAddToCart}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
