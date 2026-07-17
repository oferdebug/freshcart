import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { requireUser } from './lib/helpers';

async function assertUserAccess(
  ctx: Parameters<typeof requireUser>[0],
  userId: string,
) {
  const user = await requireUser(ctx);
  if (user._id !== userId && user.role !== 'admin') {
    throw new Error('You cannot access these favorites.');
  }
}

export const list = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    await assertUserAccess(ctx, args.userId);
    const favorites = await ctx.db
      .query('favorites')
      .withIndex('by_user_id', (q) => q.eq('userId', args.userId))
      .collect();

    return await Promise.all(
      favorites.map(async (favorite) => {
        const product = await ctx.db.get(favorite.productId);
        return {
          ...favorite,
          product: product
            ? { ...product, price: product.priceCents / 100 }
            : null,
        };
      }),
    );
  },
});

export const isFavorited = query({
  args: { userId: v.id('users'), productId: v.id('products') },
  handler: async (ctx, args) => {
    await assertUserAccess(ctx, args.userId);
    const favorite = await ctx.db
      .query('favorites')
      .withIndex('by_user_id_and_product_id', (q) =>
        q.eq('userId', args.userId).eq('productId', args.productId),
      )
      .unique();
    return favorite !== null;
  },
});

export const toggle = mutation({
  args: { userId: v.id('users'), productId: v.id('products') },
  handler: async (ctx, args) => {
    await assertUserAccess(ctx, args.userId);
    const product = await ctx.db.get(args.productId);
    if (!product || !product.isActive) throw new Error('Product not available.');

    const existing = await ctx.db
      .query('favorites')
      .withIndex('by_user_id_and_product_id', (q) =>
        q.eq('userId', args.userId).eq('productId', args.productId),
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { action: 'removed' as const };
    }

    await ctx.db.insert('favorites', {
      userId: args.userId,
      productId: args.productId,
      createdAt: Date.now(),
    });
    return { action: 'added' as const };
  },
});
