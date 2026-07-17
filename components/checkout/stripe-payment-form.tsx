'use client';
import {
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { useMutation, useQuery } from 'convex/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/convex/_generated/api';
import { Button } from '../ui/button';

export function StripePaymentForm({ orderId }: { orderId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const user = useQuery(api.users.current);
  const clearCart = useMutation(api.cart.clear);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError(null);
    const result = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });
    if (result.error) {
      setError(result.error.message ?? 'payment Failed');
      setLoading(false);
      return;
    }
    if (user) {
      await clearCart({ userId: user._id });
    }
    router.push(`/orders?success=true&orderId=${orderId}`);
  };
  return (
    <form onSubmit={handleSubmit} className={'space-y-4'}>
      <PaymentElement />
      {error && <p className='text-sm text-destructive'>{error}</p>}
      <Button type='submit' disabled={!stripe || loading} className={'w-full'}>
        {loading ? 'processing...' : 'Pay Now'}
      </Button>
    </form>
  );
}
