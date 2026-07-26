'use client';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useAction, useMutation, useQuery } from 'convex/react';
import {
  ArrowLeft,
  Check,
  CreditCard,
  Crown,
  ImageOff,
  LoaderCircle,
  MapPin,
  ShieldCheck,
  ShoppingBasket,
  Truck,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useState } from 'react';

import { StripePaymentForm } from '@/components/checkout/stripe-payment-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripePublishableKey
  ? loadStripe(stripePublishableKey)
  : null;
const stripeAppearance = {
  theme: 'stripe',
  variables: {
    colorPrimary: '#166534',
    colorBackground: '#ffffff',
    colorText: '#17211b',
    colorDanger: '#dc2626',
    borderRadius: '12px',
    fontFamily: 'Nunito Sans, system-ui, sans-serif',
  },
} as const;

type ShippingAddress = {
  name: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
};

type CheckoutSummaryItem = {
  _id: Id<'cartItems'>;
  quantity: number;
  product: {
    name: string;
    price: number;
    currency: string;
    imageUrl: string | null;
  } | null;
};

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}
function CheckoutLoading({
  message = 'Checkout In Preparing...',
}: {
  message?: string;
}) {
  return (
    <main className={'flex flex-1 items-center justify-center px-4 py-16'}>
      <div className={'flex flex-col items-center gap-4 text-center'}>
        <div
          className={
            'flex size-16 items-center justify-center rounded-2xl bg-secondary text-primary'
          }
        >
          <LoaderCircle className={'size-8 animate-spin'} />
        </div>
        <p className={'font-bold'}>{message}</p>
      </div>
    </main>
  );
}
export default function CheckoutPage() {
  const router = useRouter();
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    name: '',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    phone: '',
  });

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<Id<'orders'> | null>(null);
  const [orderTotal, setOrderTotal] = useState<number | null>(null);
  const [checkoutItems, setCheckoutItems] = useState<
    CheckoutSummaryItem[] | null
  >(null);
  const [checkoutStarted, setCheckoutStarted] = useState(false);
  const [isPreparingPayment, setIsPreparingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const user = useQuery(api.users.current);
  const cartItems = useQuery(
    api.cart.getCart,
    user ? { userId: user._id } : 'skip',
  );
  const createOrder = useMutation(api.orders.createFromCart);
  const createPaymentIntent = useAction(api.stripe.createPaymentIntent);
  useEffect(() => {
    if (
      user &&
      cartItems !== undefined &&
      cartItems.length === 0 &&
      !checkoutStarted
    ) {
      router.replace('/cart');
    }
  }, [cartItems, checkoutStarted, router, user]);
  function updateAddress(field: keyof ShippingAddress, value: string) {
    setShippingAddress((current) => ({
      ...current,
      [field]: value,
    }));
  }
  async function handleContinueToPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !cartItems || isPreparingPayment) return;
    const addressIsComplete = Object.values(shippingAddress).every(
      (value) => value.trim().length > 0,
    );
    if (!addressIsComplete) {
      setError('Please Make Sure All The Fields Are Filled.');
      return;
    }
    if (!stripePromise) {
      setError('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not configured.');
      return;
    }
    setError(null);
    setIsPreparingPayment(true);
    setCheckoutStarted(true);
    if (!checkoutItems) {
      setCheckoutItems(
        cartItems.map((item) => ({
          _id: item._id,
          quantity: item.quantity,
          product: item.product
            ? {
                name: item.product.name,
                price: item.product.price,
                currency: item.product.currency,
                imageUrl: item.product.imageUrl,
              }
            : null,
        })),
      );
    }
    let activeOrderId = orderId;
    try {
      if (!activeOrderId) {
        const createdOrder = await createOrder({
          shippingAddress: {
            name: shippingAddress.name.trim(),
            street: shippingAddress.street.trim(),
            city: shippingAddress.city.trim(),
            state: shippingAddress.state.trim(),
            postalCode: shippingAddress.postalCode.trim(),
            country: shippingAddress.country.trim(),
            phone: shippingAddress.phone.trim(),
          },
        });

        activeOrderId = createdOrder.orderId;

        setOrderId(createdOrder.orderId);
        setOrderTotal(createdOrder.amountCents / 100);
      }

      const paymentIntent = await createPaymentIntent({
        orderId: activeOrderId,
      });
      setClientSecret(paymentIntent.clientSecret);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to prepare payment.',
      );
      if (!activeOrderId) {
        setCheckoutStarted(false);
      }
    } finally {
      setIsPreparingPayment(false);
    }
  }

  if (user === undefined) {
    return <CheckoutLoading />;
  }

  if (user === null) {
    return (
      <main className={'flex flex-1 items-center justify-center px-4 py-16'}>
        <div
          className={
            'w-full max-w-xl rounded-3xl border bg-card/90 p-10 text-center'
          }
        >
          <ShoppingBasket className={'mx-auto size-12 text-primary'} />
          <h1 className={'mt-5 text-3xl font-bold'}>
            Please sign in to complete your purchase.
          </h1>
          <p className={'mt-3 text-muted-foreground'}>
            Your Account is Required To Securely Complete Your Purchase.
          </p>
          <Button asChild className={'mt-7 rounded-xl'}>
            <Link href={'/shop'}>Return to Shop</Link>
          </Button>
        </div>
      </main>
    );
  }

  if (cartItems === undefined && !checkoutItems) {
    return <CheckoutLoading />;
  }

  if (cartItems !== undefined && cartItems.length === 0 && !checkoutStarted) {
    return <CheckoutLoading message={'Returning to cart...'} />;
  }

  const displayedItems = checkoutItems ?? cartItems ?? [];

  const subtotal = displayedItems.reduce(
    (total, item) =>
      total + (item.product ? item.product.price * item.quantity : 0),
    0,
  );

  const itemCount = displayedItems.reduce(
    (total, item) => total + (item.product ? item.quantity : 0),
    0,
  );

  const currency =
    displayedItems.find((item) => item.product)?.product?.currency ?? 'usd';

  const isMember = user.memberShipStatus === 'active';
  const estimatedShipping = isMember ? 0 : 5.99;

  const displayedTotal = orderTotal ?? subtotal + estimatedShipping;

  const displayedShipping =
    orderTotal !== null
      ? Math.max(orderTotal - subtotal, 0)
      : estimatedShipping;

  const addressLocked = isPreparingPayment || orderId !== null;
  return (
    <main className={'flex-1'}>
      <div className={'mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8'}>
        <Link
          href={'/cart'}
          className={
            'mb-6 inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-bold text-muted-foreground transition-colors hover:text-primary'
          }
        >
          <ArrowLeft className={'size-4'} />
          Back to Cart
        </Link>

        <section
          className={
            'mb-8 rounded-3xl border bg-card/90 px-6 py-7 shadow-[0_18px_50px_rgba(22,101,52,0.08)] sm:px-8'
          }
        >
          <div
            className={
              'flex flex-col justify-between gap-6 sm:flex-row sm:items-center'
            }
          >
            <div>
              <p
                className={
                  'mb-2 text-sm font-bold uppercase tracking-[0.14em] text-primary'
                }
              >
                Secure checkout
              </p>

              <h1 className={'text-4xl font-bold'}>Complete your order</h1>

              <p className={'mt-2 text-muted-foreground'}>
                Enter your delivery details and securely pay with Stripe.
              </p>
            </div>

            <div className={'flex items-center gap-3'}>
              <div className={'flex items-center gap-2'}>
                <div
                  className={
                    'flex size-10 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground'
                  }
                >
                  {orderId ? <Check className={'size-5'} /> : '1'}
                </div>

                <span className={'hidden font-bold sm:inline'}>Delivery</span>
              </div>

              <div className={'h-px w-8 bg-border'} />

              <div className={'flex items-center gap-2'}>
                <div
                  className={
                    clientSecret
                      ? 'flex size-10 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground'
                      : 'flex size-10 items-center justify-center rounded-full bg-muted font-bold text-muted-foreground'
                  }
                >
                  2
                </div>

                <span className={'hidden font-bold sm:inline'}>Payment</span>
              </div>
            </div>
          </div>
        </section>

        <div
          className={
            'grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_380px]'
          }
        >
          <section className={'space-y-6'}>
            <Card
              className={
                'gap-0 rounded-3xl bg-card/95 py-0 shadow-[0_15px_45px_rgba(22,101,52,0.08)]'
              }
            >
              <CardContent className={'p-6 sm:p-8'}>
                <div className={'mb-6 flex items-center gap-3'}>
                  <div
                    className={
                      'flex size-11 items-center justify-center rounded-2xl bg-secondary text-primary'
                    }
                  >
                    <MapPin className={'size-5'} />
                  </div>

                  <div>
                    <h2 className={'text-2xl font-bold'}>Delivery address</h2>

                    <p className={'text-sm text-muted-foreground'}>
                      Where should we deliver your groceries?
                    </p>
                  </div>
                </div>

                <form
                  onSubmit={handleContinueToPayment}
                  className={'grid gap-5 sm:grid-cols-2'}
                >
                  <div className={'sm:col-span-2'}>
                    <label
                      htmlFor='name'
                      className={'mb-2 block text-sm font-bold'}
                    >
                      Full name
                    </label>

                    <Input
                      id='name'
                      autoComplete='name'
                      required
                      disabled={addressLocked}
                      value={shippingAddress.name}
                      onChange={(event) =>
                        updateAddress('name', event.target.value)
                      }
                      className={'min-h-12 rounded-xl bg-background'}
                    />
                  </div>

                  <div className={'sm:col-span-2'}>
                    <label
                      htmlFor='street'
                      className={'mb-2 block text-sm font-bold'}
                    >
                      Street address
                    </label>

                    <Input
                      id='street'
                      autoComplete='street-address'
                      required
                      disabled={addressLocked}
                      value={shippingAddress.street}
                      onChange={(event) =>
                        updateAddress('street', event.target.value)
                      }
                      className={'min-h-12 rounded-xl bg-background'}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor='city'
                      className={'mb-2 block text-sm font-bold'}
                    >
                      City
                    </label>

                    <Input
                      id='city'
                      autoComplete='address-level2'
                      required
                      disabled={addressLocked}
                      value={shippingAddress.city}
                      onChange={(event) =>
                        updateAddress('city', event.target.value)
                      }
                      className={'min-h-12 rounded-xl bg-background'}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor='state'
                      className={'mb-2 block text-sm font-bold'}
                    >
                      State / region
                    </label>

                    <Input
                      id='state'
                      autoComplete='address-level1'
                      required
                      disabled={addressLocked}
                      value={shippingAddress.state}
                      onChange={(event) =>
                        updateAddress('state', event.target.value)
                      }
                      className={'min-h-12 rounded-xl bg-background'}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor='postalCode'
                      className={'mb-2 block text-sm font-bold'}
                    >
                      Postal code
                    </label>

                    <Input
                      id='postalCode'
                      autoComplete='postal-code'
                      required
                      disabled={addressLocked}
                      value={shippingAddress.postalCode}
                      onChange={(event) =>
                        updateAddress('postalCode', event.target.value)
                      }
                      className={'min-h-12 rounded-xl bg-background'}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor='country'
                      className={'mb-2 block text-sm font-bold'}
                    >
                      Country
                    </label>

                    <Input
                      id='country'
                      autoComplete='country-name'
                      required
                      disabled={addressLocked}
                      value={shippingAddress.country}
                      onChange={(event) =>
                        updateAddress('country', event.target.value)
                      }
                      className={'min-h-12 rounded-xl bg-background'}
                    />
                  </div>

                  <div className={'sm:col-span-2'}>
                    <label
                      htmlFor='phone'
                      className={'mb-2 block text-sm font-bold'}
                    >
                      Phone number
                    </label>

                    <Input
                      id='phone'
                      type='tel'
                      autoComplete='tel'
                      required
                      disabled={addressLocked}
                      value={shippingAddress.phone}
                      onChange={(event) =>
                        updateAddress('phone', event.target.value)
                      }
                      className={'min-h-12 rounded-xl bg-background'}
                    />
                  </div>

                  {error && (
                    <div
                      role='alert'
                      className={
                        'sm:col-span-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive'
                      }
                    >
                      {error}
                    </div>
                  )}

                  {!clientSecret && (
                    <Button
                      type='submit'
                      disabled={isPreparingPayment}
                      className={
                        'min-h-12 rounded-xl text-base font-bold sm:col-span-2'
                      }
                    >
                      {isPreparingPayment ? (
                        <>
                          <LoaderCircle className={'size-5 animate-spin'} />
                          Preparing secure payment...
                        </>
                      ) : (
                        <>
                          <CreditCard className={'size-5'} />
                          {orderId
                            ? 'Retry payment setup'
                            : 'Continue to payment'}
                        </>
                      )}
                    </Button>
                  )}
                </form>
              </CardContent>
            </Card>

            {clientSecret && orderId && stripePromise && (
              <Card
                className={
                  'gap-0 rounded-3xl bg-card/95 py-0 shadow-[0_15px_45px_rgba(22,101,52,0.08)]'
                }
              >
                <CardContent className={'p-6 sm:p-8'}>
                  <div className={'mb-6 flex items-center gap-3'}>
                    <div
                      className={
                        'flex size-11 items-center justify-center rounded-2xl bg-secondary text-primary'
                      }
                    >
                      <CreditCard className={'size-5'} />
                    </div>

                    <div>
                      <h2 className={'text-2xl font-bold'}>Payment</h2>

                      <p className={'text-sm text-muted-foreground'}>
                        Your payment information is handled securely by Stripe.
                      </p>
                    </div>
                  </div>

                  <Elements
                    stripe={stripePromise}
                    options={{
                      clientSecret,
                      appearance: stripeAppearance,
                    }}
                  >
                    <StripePaymentForm orderId={orderId} />
                  </Elements>
                </CardContent>
              </Card>
            )}
          </section>

          <aside
            className={
              'rounded-3xl border bg-card/95 p-6 shadow-[0_18px_50px_rgba(22,101,52,0.10)] lg:sticky lg:top-24'
            }
          >
            <h2 className={'text-2xl font-bold'}>Order summary</h2>

            <p className={'mt-1 text-sm text-muted-foreground'}>
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </p>

            <div className={'mt-6 max-h-72 space-y-4 overflow-y-auto pr-1'}>
              {displayedItems.map((item) => {
                const product = item.product;

                if (!product) return null;

                return (
                  <div key={item._id} className={'flex items-center gap-3'}>
                    <div
                      className={
                        'relative size-14 shrink-0 overflow-hidden rounded-xl bg-muted'
                      }
                    >
                      {product.imageUrl ? (
                        <Image
                          unoptimized
                          fill
                          src={product.imageUrl}
                          alt={product.name}
                          sizes={'3.5rem'}
                          className={'object-cover'}
                        />
                      ) : (
                        <div
                          className={'flex h-full items-center justify-center'}
                        >
                          <ImageOff
                            className={'size-5 text-muted-foreground'}
                          />
                        </div>
                      )}
                    </div>

                    <div className={'min-w-0 flex-1'}>
                      <p className={'truncate text-sm font-bold'}>
                        {product.name}
                      </p>

                      <p className={'text-xs text-muted-foreground'}>
                        Quantity: {item.quantity}
                      </p>
                    </div>

                    <p className={'text-sm font-bold'}>
                      {formatPrice(
                        product.price * item.quantity,
                        product.currency,
                      )}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className={'my-6 border-t'} />

            <div className={'space-y-4 text-sm'}>
              <div className={'flex justify-between'}>
                <span className={'text-muted-foreground'}>Subtotal</span>

                <span className={'font-semibold'}>
                  {formatPrice(subtotal, currency)}
                </span>
              </div>

              <div className={'flex justify-between'}>
                <span className={'text-muted-foreground'}>Delivery</span>

                <span
                  className={
                    displayedShipping === 0
                      ? 'font-bold text-primary'
                      : 'font-semibold'
                  }
                >
                  {displayedShipping === 0
                    ? 'Free'
                    : formatPrice(displayedShipping, currency)}
                </span>
              </div>
            </div>

            {isMember && (
              <div className={'mt-5 flex gap-3 rounded-2xl bg-accent/45 p-4'}>
                <Crown className={'size-5 shrink-0 text-primary'} />

                <p className={'text-sm font-bold'}>
                  Member free delivery applied
                </p>
              </div>
            )}

            <div className={'my-6 border-t'} />

            <div className={'flex items-end justify-between'}>
              <span className={'font-bold'}>Total</span>

              <span className={'text-2xl font-bold'}>
                {formatPrice(displayedTotal, currency)}
              </span>
            </div>

            <div
              className={
                'mt-6 space-y-3 border-t pt-5 text-sm text-muted-foreground'
              }
            >
              <div className={'flex items-center gap-3'}>
                <ShieldCheck className={'size-5 text-primary'} />
                Secure Stripe payment
              </div>

              <div className={'flex items-center gap-3'}>
                <Truck className={'size-5 text-primary'} />
                30-minute stock reservation
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
