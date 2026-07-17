'use client';

import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useMutation, useQuery } from 'convex/react';
import { Heart, Search, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

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

    return (
        <div className='flex-1 p-6'>
            <div className='relative mb-6 max-w-md'>
                <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />

                <Input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder='Search products...'
                    className='pl-9'
                />
            </div>

            <div className='mb-5 flex flex-wrap gap-2'>
                <Badge
                    variant={selectedCategory ? 'outline' : 'default'}
                    className='cursor-pointer'
                    onClick={() => setSelectedCategory(undefined)}
                >
                    All
                </Badge>

                {categories?.map((category) => (
                    <Badge
                        key={category._id}
                        variant={
                            selectedCategory === category._id ? 'default' : 'outline'
                        }
                        className='cursor-pointer'
                        onClick={() => setSelectedCategory(category._id)}
                    >
                        {category.name}
                    </Badge>
                ))}
            </div>

            {displayProducts === undefined && (
                <p className='text-muted-foreground'>Loading products...</p>
            )}

            {displayProducts?.length === 0 && (
                <p className='text-muted-foreground'>No products found.</p>
            )}

            {displayProducts && displayProducts.length > 0 && (
                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
                    {displayProducts.map((product) => {
                        const isFavorite =
                            favorites?.some(
                                (favorite) => favorite.productId === product._id,
                            ) ?? false;

                        return (
                            <Card key={product._id}>
                                <CardContent className='p-4'>
                                    <Link href={`/product/${product._id}`}>
                                        <h3 className='font-medium'>{product.name}</h3>

                                        <p className='mt-2 text-lg font-bold'>
                                            ${product.price.toFixed(2)}
                                        </p>

                                        {product.stock === 0 && (
                                            <Badge variant='destructive' className='mt-1'>
                                                Out of stock
                                            </Badge>
                                        )}

                                        {product.stock > 0 && product.stock < 5 && (
                                            <Badge variant='destructive' className='mt-1'>
                                                Low stock
                                            </Badge>
                                        )}
                                    </Link>
                                </CardContent>

                                <CardFooter className='flex gap-2 p-4 pt-0'>
                                    <Button
                                        type='button'
                                        size='sm'
                                        className='flex-1'
                                        disabled={!user || product.stock === 0}
                                        onClick={async () => {
                                            if (!user) return;

                                            await addItem({
                                                userId: user._id,
                                                productId: product._id,
                                                quantity: 1,
                                            });
                                        }}
                                    >
                                        <ShoppingCart className='mr-1 h-4 w-4' />
                                        {product.stock === 0 ? 'Out of stock' : 'Add'}
                                    </Button>

                                    <Button
                                        type='button'
                                        size='sm'
                                        variant='outline'
                                        disabled={!user}
                                        aria-label='Toggle favorite'
                                        aria-pressed={isFavorite}
                                        onClick={async () => {
                                            if (!user) return;

                                            await toggleFavorite({
                                                userId: user._id,
                                                productId: product._id,
                                            });
                                        }}
                                    >
                                        <Heart
                                            className={
                                                isFavorite
                                                    ? 'h-4 w-4 fill-red-500 text-red-500'
                                                    : 'h-4 w-4'
                                            }
                                        />
                                    </Button>
                                </CardFooter>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}