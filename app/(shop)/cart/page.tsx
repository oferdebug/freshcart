'use client';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Trash, Plus, Minus, ArrowLeft, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
export default function CartPage() {
  const router = useRouter();
  const user = useQuery(api.users.current);
  const cartItems = useQuery(
    api.cart.getCart,
    user ? { userId: user._id } : 'skip',
  );
  const updateQuantity = useMutation(api.cart.updateQuantity);
  const removeitem = useMutation(api.cart.removeItem);
  const clearCart = useMutation(api.cart.clear);
  if (!cartItems || cartItems === undefined) {
    return <div className={'flex-1 p-6'}>Loading...</div>;
  }

  if (!cartItems || cartItems.length === 0) {
    return (
      <div
        className={'flex-1 p-6 flex flex-col items-center justify-center gap-4'}
      >
        <ShoppingBag className={'w-16 h-16 text-muted-foreground'} />
        <h2 className={'text-2xl font-semibold'}>Your cart is empty</h2>
        <p className={'text-muted-foreground'}>
          Add some products to your cart to see them here.
        </p>
        <Button asChild>
          <Link href={'/'}>
            <ArrowLeft className={'mr-2'} />
            Continue Shopping
          </Link>
        </Button>
      </div>
    );
  }
  return (
    <div>
      <div>CartPage</div>
    </div>
  );
}
