'use client';

import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { StripePaymentForm } from '@/components/';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
);

export default function CheckoutPage() {
  const router = useRouter();
  const user = useQuery(api.users.current);
  const cartItems = useQuery(
    api.cart.getCart,
    user ? { userId: user._id } : 'skip',
  );

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  const createOrder = useMutation(api.orders.create);
  const createPaymentIntent = useAction(api.stripe.createPaymentIntentMutation);

  const [shippingAddress, setShippingAddress] = useState({
    name: '',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    phone: '',
  });

  if (cartItems === undefined)
    return <div className='flex-1 p-6'>Loading...</div>;
  if (!cartItems || cartItems.length === 0) return router.push('/cart');

  const total = cartItems.reduce((sum, item) => {
    return sum + (item.product?.price ?? 0) * item.quantity;
  }, 0);

  const handleSubmitShipping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const orderId = await createOrder({
      userId: user._id,
      items: cartItems.map((item) => ({
        productId: item.productId,
        productName: item.product?.name ?? '',
        quantity: item.quantity,
        unitPrice: item.product?.price ?? 0,
      })),
      subtotal: total,
      tax: 0,
      shipping: 0,
      total,
      shippingAddress,
    });

    const res = await createPaymentIntent({
      orderId,
      amount: Math.round(total * 100), // cents
    });

    setClientSecret(res.clientSecret);
    setOrderId(res.orderId);
  };

  return (
    <div className='flex-1 p-6 max-w-4xl mx-auto'>
      <h1 className='text-2xl font-bold mb-6'>Checkout</h1>

      <div className='grid md:grid-cols-2 gap-6'>
        <div>
          <h2 className='text-lg font-medium mb-4'>Shipping Address</h2>
          <form onSubmit={handleSubmitShipping} className='space-y-3'>
            <Input
              placeholder='Full name'
              required
              value={shippingAddress.name}
              onChange={(e) =>
                setShippingAddress({ ...shippingAddress, name: e.target.value })
              }
            />
            <Input
              placeholder='Street'
              required
              value={shippingAddress.street}
              onChange={(e) =>
                setShippingAddress({
                  ...shippingAddress,
                  street: e.target.value,
                })
              }
            />
            <Input
              placeholder='City'
              required
              value={shippingAddress.city}
              onChange={(e) =>
                setShippingAddress({ ...shippingAddress, city: e.target.value })
              }
            />
            <Input
              placeholder='State'
              required
              value={shippingAddress.state}
              onChange={(e) =>
                setShippingAddress({
                  ...shippingAddress,
                  state: e.target.value,
                })
              }
            />
            <Input
              placeholder='Postal code'
              required
              value={shippingAddress.postalCode}
              onChange={(e) =>
                setShippingAddress({
                  ...shippingAddress,
                  postalCode: e.target.value,
                })
              }
            />
            <Input
              placeholder='Country'
              required
              value={shippingAddress.country}
              onChange={(e) =>
                setShippingAddress({
                  ...shippingAddress,
                  country: e.target.value,
                })
              }
            />
            <Input
              placeholder='Phone'
              required
              value={shippingAddress.phone}
              onChange={(e) =>
                setShippingAddress({
                  ...shippingAddress,
                  phone: e.target.value,
                })
              }
            />
            <Button type='submit' className='w-full'>
              Continue to Payment
            </Button>
          </form>
        </div>

        <div>
          <h2 className='text-lg font-medium mb-4'>Order Summary</h2>
          <Card>
            <CardContent className='p-4 space-y-3'>
              {cartItems.map((item) => (
                <div key={item._id} className='flex justify-between'>
                  <span>
                    {item.product?.name} x {item.quantity}
                  </span>
                  <span>
                    ${((item.product?.price ?? 0) * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
              <div className='border-t pt-3 font-bold text-lg'>
                Total: ${total.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          {clientSecret && (
            <div className='mt-6'>
              <h2 className='text-lg font-medium mb-4'>Payment</h2>
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <StripePaymentForm orderId={orderId!} />
              </Elements>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
