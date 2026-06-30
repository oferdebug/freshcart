import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

// Get all favorites for a user with product details
export const list = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const favorites = await ctx.db
      .query('favorites')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();

    return await Promise.all(
      favorites.map(async (fav) => ({
        ...fav,
        product: await ctx.db.get(fav.productId),
      })),
    );
  },
});

// Check if a product is favorited
export const isFavorited = query({
  args: { userId: v.id('users'), productId: v.id('products') },
  handler: async (ctx, args) => {
    const fav = await ctx.db
      .query('favorites')
      .withIndex('by_user_product', (q) =>
        q.eq('userId', args.userId).eq('productId', args.productId),
      )
      .first();
    return !!fav;
  },
});

// Toggle favorite (add/remove)
export const toggle = mutation({
  args: { userId: v.id('users'), productId: v.id('products') },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('favorites')
      .withIndex('by_user_product', (q) =>
        q.eq('userId', args.userId).eq('productId', args.productId),
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { action: 'removed' };
    }

    await ctx.db.insert('favorites', {
      userId: args.userId,
      productId: args.productId,
      addedAt: Date.now(),
    });
    return { action: 'added' };
  },
});
