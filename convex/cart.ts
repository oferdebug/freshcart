import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const getCart = query({
  args: {
    userId: v.optional(v.id('users')),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const items = args.userId
      ? await ctx.db
          .query('cartItems')
          .withIndex('by_user', (q) => q.eq('userId', args.userId!))
          .collect()
      : args.sessionId
        ? await ctx.db
            .query('cartItems')
            .withIndex('by_session', (q) => q.eq('sessionId', args.sessionId!))
            .collect()
        : [];

    return await Promise.all(
      items.map(async (item) => ({
        ...item,
        product: await ctx.db.get(item.productId),
      })),
    );
  },
});

export const addItem = mutation({
  args: {
    userId: v.optional(v.id('users')),
    sessionId: v.optional(v.string()),
    productId: v.id('products'),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId, sessionId, productId, quantity } = args;

    const product = await ctx.db.get(productId);
    if (!product || !product.isActive) throw new Error('Product not available');
    if (product.stock < quantity) throw new Error('Insufficient stock');

    //Check If Product Already In Cart
    const existing = userId
      ? await ctx.db
          .query('cartItems')
          .withIndex('by_product_user', (q) =>
            q.eq('productId', productId).eq('userId', userId),
          )
          .first()
      : null;

    if (existing) {
      return await ctx.db.patch(existing._id, {
        quantity: existing.quantity + quantity,
        addedAt: Date.now(),
      });
    }

    return await ctx.db.insert('cartItems', {
      userId,
      sessionId,
      productId,
      quantity,
      addedAt: Date.now(),
    });
  },
});

//Update Item Quantity
export const updateQuantity = mutation({
  args: {
    cartItemId: v.id('cartItems'),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.quantity <= 0) {
      return await ctx.db.delete(args.cartItemId);
    }
    return await ctx.db.patch(args.cartItemId, { quantity: args.quantity });
  },
});

//Remove Item From Cart
export const removeItem = mutation({
  args: {
    cartItemId: v.id('cartItems'),
  },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.cartItemId);
  },
});

//Clear Entire Cart
export const clear = mutation({
  args: {
    userId: v.optional(v.id('users')),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const items = args.userId
      ? await ctx.db
          .query('cartItems')
          .withIndex('by_user', (q) => q.eq('userId', args.userId!))
          .collect()
      : await ctx.db
          .query('cartItems')
          .withIndex('by_session', (q) => q.eq('sessionId', args.sessionId!))
          .collect();

    await Promise.all(items.map((item) => ctx.db.delete(item._id)));
  },
});
