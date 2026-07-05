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

  const total = cartItems.reduce((sum, item) => {
    return sum + (item.product?.price || 0) * item.quantity;
  }, 0);

  return (
    <div className={'flex-1 p-6 max-w-4xl mx-auto'}>
      <Link
        href={'/shop'}
        className={'flex items-center gap-2 text-sm text-muted-foreground mb-6'}
      >
        <ArrowLeft className={'w-4 h-4'} />
        Continue Shopping
      </Link>
      <h1 className={'text-2xl font-bold mb-6'}>Shopping Cart</h1>
      <div className={'space-y-4'}>
        {cartItems.map((item) => (
          <Card key={item._id}>
            <CardContent className={'p-4 flex items-center gap-5'}>
              <div
                className={
                  'bg-muted rounded h-20 w-20 flex items-center justify-center'
                }
              >
                <span className={'text-xs text-muted-foreground'}>IMAGE</span>
              </div>
              <div className={'flex-1'}>
                <Link
                  href={`/shop/${item.product?._id}`}
                  className={'text-lg font-medium hover:text-primary'}
                >
                  <h3 className={'font-medium'}>{item.product?.name}</h3>
                </Link>
                <p className={'text-sm text-muted-foreground'}>
                  ${item.product?.price.toFixed(2)} x {item.quantity} = $
                  {(item.product?.price || 0) * item.quantity} Each
                </p>
              </div>
              <div className={'flex items-center gap-2'}>
                <Button
                  variant={'outline'}
                  size={'icon'}
                  onClick={() =>
                    updateQuantity({
                      cartItemId: item._id,
                      quantity: item.quantity - 1,
                    })
                  }
                >
                  <Minus className={'w-4 h-4'} />
                </Button>
                <Input
                  className={'w-16 text-center'}
                  value={item.quantity}
                  onClick={() =>
                    updateQuantity({
                      cartItemId: item._id,
                      quantity: item.quantity + 1,
                    })
                  }
                />
                <Button
                  variant={'outline'}
                  size={'icon'}
                  onClick={() =>
                    updateQuantity({
                      cartItemId: item._id,
                      quantity: item.quantity + 1,
                    })
                  }
                >
                  <Plus className={'w-4 h-4'} />
                </Button>
              </div>
              <div className={'text-right min-w-[80px]'}>
                <p className={'font-bold'}>
                  ${((item.product?.price || 0) * item.quantity).toFixed(2)}
                </p>
              </div>
              <Button
                variant={'ghost'}
                size={'icon'}
                onClick={() => removeitem({ cartItemId: item._id })}
              >
                <Trash className={'w-4 h-4'} />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className='mt-6 flex items-center justify-between'>
        <Button
          variant='outline'
          onClick={() => clearCart({ userId: user!._id })}
        >
          Clear Cart
        </Button>
        <div className='text-xl font-bold'>Total: ${total.toFixed(2)}</div>
      </div>

      <div className={'mt-6 flex justify-end'}>
        <Button size='lg' onClick={() => router.push('/checkout')}>
          Proceed to Checkout
        </Button>
      </div>
    </div>
  );
}
