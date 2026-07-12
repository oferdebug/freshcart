'use client';

import type { Id } from '@/convex/_generated/dataModel';
import { api } from '@/convex/_generated/api';
import { useState } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from 'convex/react';
import { Heart, Link, Search, ShoppingCart } from 'lucide-react';

export default function ShopPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<
    Id<'categories'> | undefined
  >(undefined);

  const categories = useQuery(api.categories.list, { activeOnly: true });
  const products = useQuery(api.products.list, {
    categoryId: selectedCategory ?? undefined,
  });

  const searchResults = useQuery(
    api.products.search,
    searchQuery.length > 2 ? { query: searchQuery } : 'skip',
  );

  const displayProducts = searchQuery.length > 2 ? searchResults : products;
  return (
    <div className={'flex-1 p-6'}>
      {/** Search Bar */}
      <div className={'relative mb-6 max-w-md'}>
        <Search
          className={
            'absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground'
          }
        />
      </div>
      <div className={'flex gap-2 mb-5 flex-wrap'}>
        <Badge
          variant={selectedCategory ? 'outline' : 'default'}
          className={'cursor-pointer'}
          onClick={() => setSelectedCategory(undefined)}
        >
          All
        </Badge>
        {categories?.map((cat) => (
          <Badge
            key={cat._id}
            variant={selectedCategory === cat._id ? 'default' : 'outline'}
            className={'curosr-pointer'}
            onClick={() => setSelectedCategory(cat._id)}
          >
            {cat.name}
          </Badge>
        ))}
      </div>

      {displayProducts && (
        <div>
          {displayProducts.map((product) => (
            <Card key={product._id}>
              <CardContent className={'p-4'}>
                <Link href={`/product/${product._id}`}>
                  <h3 className={'font-medium'}>{product.name}</h3>
                  <p className={'text-lg font-bold mt-2'}>
                    ${product.price.toFixed(2)}
                  </p>
                  {product.stock < 5 && (
                    <Badge variant='destructive' className={'mt-1'}>
                      Low Stock
                    </Badge>
                  )}
                </Link>
              </CardContent>
              <CardFooter className={'p-4 pt-0 flex gap-2'}>
                <Button size='sm' className={'flex-1'}>
                  <ShoppingCart className={'h-4 w-4 m-1'} /> Add
                </Button>
                <Button size='sm' variant={'outline'}>
                  <Heart className={'h-4 w-4'} />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
