'use client';
import { Heart, ImageOff, LoaderCircle, ShoppingBasket } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import type { Id } from '@/convex/_generated/dataModel';
import { cn } from '@/lib/utils';

type ProductCardProduct = {
  _id: Id<'products'>;
  name: string;
  description: string;
  price: number;
  currency: string;
  stock: number;
  unit: string;
  imageUrl: string | null;
};

type ProductCardProps = {
  product: ProductCardProduct;
  categoryName?: string;
  isFavorite?: boolean;
  isSignedIn: boolean;
  onAdd: (productId: Id<'products'>) => Promise<void>;
  onToggleFavorite: (productId: Id<'products'>) => Promise<void>;
};

export default function ProductCard({
  product,
  categoryName,
  isFavorite = false,
  isSignedIn,
  onAdd,
  onToggleFavorite,
}: ProductCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdatingFavorite, setIsUpdatingFavorite] = useState(false);
  const isOutOfStock = product.stock === 0;
  const isLowStock = product.stock > 0 && product.stock < 5;
  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: product.currency.toUpperCase(),
  }).format(product.price);

  async function handleAddToCart() {
    if (!isSignedIn || isOutOfStock || isAdding) return;
    setIsAdding(true);
    try {
      await onAdd(product._id);
    } finally {
      setIsAdding(false);
    }
  }

  async function handleToggleFavorite() {
    if (!isSignedIn || isUpdatingFavorite) return;
    setIsUpdatingFavorite(true);
    try {
      await onToggleFavorite(product._id);
    } finally {
      setIsUpdatingFavorite(false);
    }
  }
  return (
    <Card
      className={cn(
        'group gap-0 overflow-hidden rounded-3xl border-white/80',
        'bg-card/95 py-0 shadow-[0_10px_35px_rgba(22,101,52,0.08)]',
        'transition-all duration-300',
        'hover:-translate-y-1 hover:border-primary/20',
        'hover:shadow-[0_18px_45px_rgba(22,101,52,0.14)]',
      )}
    >
      <div className={'relative overflow-hidden bg-secondary'}>
        <Link
          href={`/product/${product._id}`}
          className={'relative block aspect-[4/3]'}
        >
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              unoptimized
              sizes={
                '(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw'
              }
              className={cn(
                'h-full w-full object-cover',
                'transition-transform duration-500',
                'group-hover:scale-105',
              )}
            />
          ) : (
            <div
              className={
                'flex h-full items-center justify-center text-muted-foreground'
              }
            >
              <ImageOff className={'size-10'} aria-hidden={true} />
              <span className={'sr-only'}>No Image Available</span>
            </div>
          )}
        </Link>
        <Button
          type={'button'}
          variant={'secondary'}
          size={'icon'}
          disabled={!isSignedIn || isUpdatingFavorite}
          onClick={handleToggleFavorite}
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          className={cn(
            'absolute right-3 top-3 size-11 rounded-full',
            'border border-white/70 bg-white/90 shadow-md backdrop-blur',
            'hover:bg-white hover:text-primary',
            isFavorite &&
              'bg-primary text-primary-foreground hover:bg-primary/90',
          )}
        >
          {isUpdatingFavorite ? (
            <LoaderCircle className={'size-5 animate-spin'} />
          ) : (
            <Heart className={cn('size-5', isFavorite && 'fill-current')} />
          )}
        </Button>
        <div className={'absolute bottom-3 left-3'}>
          {isOutOfStock ? (
            <Badge variant={'destructive'}>Out Of Stock</Badge>
          ) : isLowStock ? (
            <Badge variant={'destructive'}>Only {product.stock} left</Badge>
          ) : (
            <Badge
              className={
                'border-white/70 bg-white/90 text-foreground shadow-sm backdrop-blur'
              }
            >
              In Stock
            </Badge>
          )}
        </div>
      </div>
      <CardContent className={'flex flex-1 flex-col p-5'}>
        <p
          className={
            'mb-2 text-xs font-bold uppercase tracking-[0.14em] text-primary'
          }
        >
          {categoryName ?? 'Fresh Groceries'}
        </p>
        <Link href={`/product/${product._id}`}>
          <h3
            className={
              'line-clamp-1 text-lg font-semibold transition-colors group-hover:text-primary'
            }
          >
            {product.name}
          </h3>
        </Link>
        <p
          className={
            'mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground'
          }
        >
          {product.description}
        </p>
        <div className={'mt-2 flex items-end gap-2'}>
          <span className={'font-heading text-2xl font-bold text-foreground'}>
            {formattedPrice}
          </span>
          <span className={'pb-1 text-sm text-muted-foreground'}>
            / {product.unit}
          </span>
        </div>
      </CardContent>
      <CardFooter className={'p-5 pt-0'}>
        <Button
          type={'button'}
          disabled={!isSignedIn || isOutOfStock || isAdding}
          onClick={handleAddToCart}
          className={
            'min-h-11 w-full rounded-xl font-bold shadow-[0_8px_20px_rgba(22,101,52,0.18)] transition-all hover:-translate-y-0.5'
          }
        >
          {isAdding ? (
            <>
              <LoaderCircle className={'size-5 animate-spin'} />
              Adding...
            </>
          ) : (
            <>
              <ShoppingBasket className={'size-5'} />
              {isOutOfStock ? 'Out Of Stock' : 'Add to Cart'}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
