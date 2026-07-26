'use client';

import { SignInButton } from '@clerk/nextjs';
import { useMutation, useQuery } from 'convex/react';
import {
  ArrowLeft,
  Crown,
  ImageOff,
  LoaderCircle,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBasket,
  Trash2,
  Truck,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount);
}
function CartLoading() {
  return (
    <div className={'flex-1'}>
      <div className={'mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8'}>
        <div className={'mb-8 h-28 animate-pulse rounded-3xl bg-muted'} />
        <div className={'grid gap-8 lg:grid-cols-[1fr_360px]'}>
          <div className={'space-y-4'}>
            {['first', 'second', 'third'].map((placeholder) => (
              <div
                key={placeholder}
                className={'h-40 animate-pulse rounded-3xl bg-muted'}
              />
            ))}
          </div>
          <div className={'h-80 animate-pulse rounded-3xl bg-muted'} />
        </div>
      </div>
    </div>
  );
}

export default function cartPage() {
  const router = useRouter();
  const [updatingItemId, setUpdatingItemId] = useState<Id<'cartItems'> | null>(
    null,
  );
  const [isClearing, setIsClearing] = useState(false);
  const user = useQuery(api.users.current);
  const cartItems = useQuery(
    api.cart.getCart,
    user ? { userId: user._id } : 'skip',
  );
  const updateQuantity = useMutation(api.cart.updateQuantity);
  const removeItem = useMutation(api.cart.removeItem);
  const clearCart = useMutation(api.cart.clear);
  if (user === undefined) {
    return <CartLoading />;
  }
  if (user === null) {
    return (
      <main className={'flex flex-1 items-center justify-center px-4 py-16'}>
        <div
          className={
            'w-full max-w-xl rounded-3xl border bg-card/90 p-8 text-center shadow-[0_18px_50px_rgba(22,101,52,0.10)]'
          }
        >
          <div
            className={
              'mx-auto mb-6 flex size-20 items-center justify-center rounded-3xl bg-secondary text-primary'
            }
          >
            <ShoppingBasket className={'size-10'} />
          </div>
          <h1 className={'text-3xl font-bold'}>Your Cart Is Waiting</h1>
          <p
            className={
              'mx-auto mt-3 max-w-md leading-7 text-primary-foreground'
            }
          >
            Please sign in to view your Saved cart and Continue Shopping.
          </p>
          <SignInButton mode={'modal'}>
            <Button className={'mt-7 min-h-11 rounded-xl px-7'}>Sign In</Button>
          </SignInButton>
        </div>
      </main>
    );
  }
  if (cartItems === undefined) {
    return <CartLoading />;
  }
  const itemCount = cartItems.reduce(
    (total, item) => total + (item.product ? item.quantity : 0),
    0,
  );
  const subTotal = cartItems.reduce(
    (total, item) =>
      total + (item.product ? item.product.price * item.quantity : 0),
    0,
  );
  const currency =
    cartItems.find((item) => item.product)?.product?.currency ?? 'usd';
  const isMember = user.memberShipStatus === 'active';
  const userId = user._id;

  async function handleQuantityChange(
    cartItemId: Id<'cartItems'>,
    quantity: number,
  ) {
    setUpdatingItemId(cartItemId);

    try {
      await updateQuantity({
        cartItemId,
        quantity,
      });
    } finally {
      setUpdatingItemId(null);
    }
  }
  async function handleRemove(cartItemId: Id<'cartItems'>) {
    setUpdatingItemId(cartItemId);
    try {
      await removeItem({
        cartItemId,
      });
    } finally {
      setUpdatingItemId(null);
    }
  }
  async function handleClearCart() {
    const shouldClear = window.confirm(
      'Are you sure you want to clear your cart?',
    );
    if (!shouldClear) return;
    setIsClearing(true);
    try {
      await clearCart({
        userId,
      });
    } finally {
      setIsClearing(false);
    }
  }
  if (itemCount === 0) {
    return (
      <main className={'flex flex-1 items-center justify-center px-4 py-16'}>
        <div
          className={
            'w-full max-w-2xl rounded-3xl border border-dashed bg-card/80 p-8 text-center sm:p-14'
          }
        >
          <div
            className={
              'mx-auto mb-6 flex size-24 items-center justify-center rounded-3xl bg-secondary text-primary'
            }
          >
            <ShoppingBasket className={'size-12'} />
          </div>
          <h1 className={'text-4xl font-bold'}>Your Cart Is Empty</h1>
          <p
            className={'mx-auto mt-3 max-w-md leading-7 text-muted-foreground'}
          >
            Browse our fresh selection and add a few groceries to get started.
          </p>
          <Button asChild className={'mt-8 min-h-11 rounded-xl px-7'}>
            <Link href='/shop'>
              <ArrowLeft className={'size-5'} />
              Continue shopping
            </Link>
          </Button>
        </div>
      </main>
    );
  }
  return (
    <main className={'flex-1'}>
      <div className={'mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8'}>
        <Link
          href='/shop'
          className={
            'mb-6 inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-bold text-muted-foreground transition-colors hover:text-primary'
          }
        >
          <ArrowLeft className={'size-4'} />
          Continue shopping
        </Link>

        <section
          className={
            'mb-8 flex flex-col justify-between gap-5 rounded-3xl border bg-card/90 px-6 py-7 shadow-[0_18px_50px_rgba(22,101,52,0.08)] sm:flex-row sm:items-center sm:px-8'
          }
        >
          <div>
            <p
              className={
                'mb-2 text-sm font-bold uppercase tracking-[0.14em] text-primary'
              }
            >
              Your selection
            </p>

            <h1 className={'text-4xl font-bold'}>Shopping cart</h1>

            <p className={'mt-2 text-muted-foreground'}>
              {itemCount} {itemCount === 1 ? 'item' : 'items'} ready for
              checkout.
            </p>
          </div>

          <div
            className={
              'flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_10px_25px_rgba(22,101,52,0.20)]'
            }
          >
            <ShoppingBasket className={'size-8'} />
          </div>
        </section>

        <div
          className={
            'grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]'
          }
        >
          <section>
            <div className={'mb-4 flex items-center justify-between'}>
              <h2 className={'text-xl font-bold'}>Your products</h2>

              <Button
                type='button'
                variant='ghost'
                disabled={isClearing}
                onClick={handleClearCart}
                className={
                  'min-h-11 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
                }
              >
                {isClearing ? (
                  <LoaderCircle className={'size-4 animate-spin'} />
                ) : (
                  <Trash2 className={'size-4'} />
                )}
                Clear cart
              </Button>
            </div>

            <div className={'space-y-4'}>
              {cartItems.map((item) => {
                const product = item.product;

                if (!product) return null;

                const isUpdating = updatingItemId === item._id;
                const reachedMaximum =
                  item.quantity >= product.stock || item.quantity >= 99;

                return (
                  <Card
                    key={item._id}
                    className={
                      'gap-0 overflow-hidden rounded-3xl border-white/80 bg-card/95 py-0 shadow-[0_10px_35px_rgba(22,101,52,0.07)]'
                    }
                  >
                    <CardContent
                      className={
                        'flex flex-col gap-5 p-4 sm:flex-row sm:items-center sm:p-5'
                      }
                    >
                      <Link
                        href={`/product/${product._id}`}
                        className={'shrink-0'}
                      >
                        <div
                          className={
                            'relative aspect-square w-full overflow-hidden rounded-2xl bg-muted sm:size-28'
                          }
                        >
                          {product.imageUrl ? (
                            <Image
                              unoptimized
                              fill
                              src={product.imageUrl}
                              alt={product.name}
                              sizes={'(min-width: 640px) 7rem, 100vw'}
                              className={
                                'object-cover transition-transform duration-300 hover:scale-105'
                              }
                            />
                          ) : (
                            <div
                              className={
                                'flex h-full items-center justify-center text-muted-foreground'
                              }
                            >
                              <ImageOff className={'size-8'} />
                            </div>
                          )}
                        </div>
                      </Link>

                      <div className={'min-w-0 flex-1'}>
                        <Link
                          href={`/product/${product._id}`}
                          className={'transition-colors hover:text-primary'}
                        >
                          <h3 className={'truncate text-lg font-bold'}>
                            {product.name}
                          </h3>
                        </Link>

                        <p className={'mt-1 text-sm text-muted-foreground'}>
                          {formatPrice(product.price, product.currency)} /{' '}
                          {product.unit}
                        </p>

                        <p
                          className={'mt-2 text-xs font-semibold text-primary'}
                        >
                          {product.stock} currently in stock
                        </p>
                      </div>

                      <div
                        className={
                          'flex flex-wrap items-center justify-between gap-4 sm:justify-end'
                        }
                      >
                        <div
                          className={
                            'flex items-center rounded-xl border bg-background p-1'
                          }
                        >
                          <Button
                            type='button'
                            variant='ghost'
                            size='icon'
                            disabled={isUpdating}
                            onClick={() =>
                              handleQuantityChange(item._id, item.quantity - 1)
                            }
                            aria-label={
                              item.quantity === 1
                                ? `Remove ${product.name}`
                                : `Decrease ${product.name} quantity`
                            }
                            className={'size-10 rounded-lg'}
                          >
                            {isUpdating ? (
                              <LoaderCircle className={'size-4 animate-spin'} />
                            ) : (
                              <Minus className={'size-4'} />
                            )}
                          </Button>

                          <span className={'w-10 text-center font-bold'}>
                            {item.quantity}
                          </span>

                          <Button
                            type='button'
                            variant='ghost'
                            size='icon'
                            disabled={isUpdating || reachedMaximum}
                            onClick={() =>
                              handleQuantityChange(item._id, item.quantity + 1)
                            }
                            aria-label={`Increase ${product.name} quantity`}
                            className={'size-10 rounded-lg'}
                          >
                            <Plus className={'size-4'} />
                          </Button>
                        </div>

                        <div className={'min-w-24 text-right'}>
                          <p className={'text-lg font-bold'}>
                            {formatPrice(
                              product.price * item.quantity,
                              product.currency,
                            )}
                          </p>

                          <Button
                            type='button'
                            variant='ghost'
                            disabled={isUpdating}
                            onClick={() => handleRemove(item._id)}
                            className={
                              'mt-1 h-auto p-0 text-xs text-muted-foreground hover:bg-transparent hover:text-destructive'
                            }
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          <aside
            className={
              'rounded-3xl border bg-card/95 p-6 shadow-[0_18px_50px_rgba(22,101,52,0.10)] lg:sticky lg:top-24'
            }
          >
            <h2 className={'text-2xl font-bold'}>Order summary</h2>

            <div className={'mt-6 space-y-4 text-sm'}>
              <div className={'flex items-center justify-between'}>
                <span className={'text-muted-foreground'}>
                  Items ({itemCount})
                </span>

                <span className={'font-semibold'}>
                  {formatPrice(subTotal, currency)}
                </span>
              </div>

              <div className={'flex items-center justify-between'}>
                <span className={'text-muted-foreground'}>Delivery</span>

                <span
                  className={
                    isMember ? 'font-bold text-primary' : 'font-medium'
                  }
                >
                  {isMember ? 'Free' : 'Calculated at checkout'}
                </span>
              </div>
            </div>

            {isMember && (
              <div
                className={
                  'mt-6 flex gap-3 rounded-2xl bg-accent/45 p-4 text-accent-foreground'
                }
              >
                <Crown className={'mt-0.5 size-5 shrink-0 text-primary'} />

                <div>
                  <p className={'font-bold'}>Member delivery perk</p>

                  <p className={'mt-1 text-sm leading-5 opacity-80'}>
                    Your free-delivery membership will be applied during
                    checkout.
                  </p>
                </div>
              </div>
            )}

            <div className={'my-6 border-t'} />

            <div className={'flex items-end justify-between'}>
              <div>
                <p className={'font-bold'}>Subtotal</p>
                <p className={'mt-1 text-xs text-muted-foreground'}>
                  Before delivery and taxes
                </p>
              </div>

              <p className={'text-2xl font-bold'}>
                {formatPrice(subTotal, currency)}
              </p>
            </div>

            <Button
              type='button'
              onClick={() => router.push('/checkout')}
              className={
                'mt-7 min-h-12 w-full rounded-xl text-base font-bold shadow-[0_10px_25px_rgba(22,101,52,0.20)]'
              }
            >
              Proceed to checkout
            </Button>

            <div
              className={
                'mt-6 space-y-3 border-t pt-5 text-sm text-muted-foreground'
              }
            >
              <div className={'flex items-center gap-3'}>
                <ShieldCheck className={'size-5 text-primary'} />
                Secure checkout
              </div>

              <div className={'flex items-center gap-3'}>
                <Truck className={'size-5 text-primary'} />
                Delivery calculated at checkout
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
