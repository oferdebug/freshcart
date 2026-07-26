'use client';

import { useMutation, useQuery } from 'convex/react';
import { ArrowLeft, Heart, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const product = useQuery(api.products.getById, {
    id: id as Id<'products'>,
  });

  const user = useQuery(api.users.current);
  const isFavorite = useQuery(
    api.favorites.isFavorited,
    user && product ? { userId: user._id, productId: product._id } : 'skip',
  );
  const addToCart = useMutation(api.cart.addItem);
  const toggleFavorite = useMutation(api.favorites.toggle);
  const imgRef = useRef<HTMLImageElement | null>(null);

  if (product === undefined) {
    return <div className={'flex-1 p-6'}>Loading...</div>;
  }
  if (!product) {
    return <div className={'flex-1 p-6'}>Product not found</div>;
  }
  const handleAddToCart = () => {
    if (!user) return;
    addToCart({ userId: user._id, productId: product._id, quantity: 1 });
  };

  const handleToggleFavorite = () => {
    if (!user) return;
    toggleFavorite({ userId: user._id, productId: product._id });
  };

  return (
    <div className={'flex-1 p-6 max-w-4xl mx-auto'}>
      <Link
        href='/shop'
        className={'flex items-center gap-2 text-sm text-muted-foreground mb-6'}
      >
        <ArrowLeft className={'h-4 w-4'} />
        Back to Shop
      </Link>
      <div className={'grid md:grid-cols-2 gap-8'}>
        {/* Place holder */}
        <div
          className={'aspect-square overflow-hidden rounded-lg border bg-muted'}
        >
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className={'h-full w-full object-cover'}
              ref={imgRef}
            />
          ) : (
            <div className={'flex h-full items-center justify-center'}>
              <span className={'text-muted-foreground'}>
                No Image Available
              </span>
            </div>
          )}
        </div>
        {/* Product Info */}
        <div className={'space-y-4'}>
          <h1 className={'text-2xl font-bold'}>{product.name}</h1>
          <p className={'text-3xl font-bold'}>{product.price.toFixed(2)}</p>
          {product.stock < 5 && product.stock > 0 && (
            <Badge variant='destructive'>Only {product.stock}</Badge>
          )}
          {product.stock === 0 && (
            <Badge variant='destructive'>Out of Stock</Badge>
          )}
          <div className={'flex gap-3 pt-4'}>
            <Button
              onClick={handleAddToCart}
              disabled={product.stock === 0}
              className={'flex-1'}
            >
              <ShoppingCart className={'h-4 w-4 mr-2'} />
              Add to Cart
            </Button>
            <Button variant={'outline'} onClick={handleToggleFavorite}>
              {isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
              <Heart
                className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`}
              />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
