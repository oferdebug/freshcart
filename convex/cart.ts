import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { mutation, query } from './_generated/server';
import { requireUser } from './lib/helpers';

type CartOwner = {
  userId?: Id<'users'>;
  sessionId?: string;
};

function validateQuantity(quantity: number) {
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99) {
    throw new Error('Quantity must be an integer between 1 and 99.');
  }
}

function normalizeSessionId(sessionId?: string) {
  const normalized = sessionId?.trim();
  return normalized || undefined;
}

async function assertOwnerAccess(
  ctx: QueryCtx | MutationCtx,
  owner: CartOwner,
) {
  if (owner.userId) {
    const user = await requireUser(ctx);
    if (user._id !== owner.userId && user.role !== 'admin') {
      throw new Error('You cannot access this cart.');
    }
    return { userId: owner.userId, sessionId: undefined };
  }

  const sessionId = normalizeSessionId(owner.sessionId);
  if (!sessionId) throw new Error('A user or session is required.');
  return { userId: undefined, sessionId };
}

async function assertCartItemAccess(
  ctx: MutationCtx,
  itemId: Id<'cartItems'>,
  sessionId?: string,
) {
  const item = await ctx.db.get(itemId);
  if (!item) throw new Error('Cart item not found.');

  if (item.userId) {
    const user = await requireUser(ctx);
    if (user._id !== item.userId && user.role !== 'admin') {
      throw new Error('You cannot modify this cart item.');
    }
  } else if (!item.sessionId || item.sessionId !== normalizeSessionId(sessionId)) {
    throw new Error('A matching session is required.');
  }

  return item;
}

export const getCart = query({
  args: {
    userId: v.optional(v.id('users')),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const owner = await assertOwnerAccess(ctx, args);
    const items = owner.userId
      ? await ctx.db
          .query('cartItems')
          .withIndex('by_user_id', (q) => q.eq('userId', owner.userId))
          .collect()
      : await ctx.db
          .query('cartItems')
          .withIndex('by_session_id', (q) =>
            q.eq('sessionId', owner.sessionId),
          )
          .collect();

    return await Promise.all(
      items.map(async (item) => {
        const product = await ctx.db.get(item.productId);
        return {
          ...item,
          product: product
            ? { ...product, price: product.priceCents / 100 }
            : null,
        };
      }),
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
    validateQuantity(args.quantity);
    const owner = await assertOwnerAccess(ctx, args);
    const product = await ctx.db.get(args.productId);
    if (!product || !product.isActive) throw new Error('Product not available.');

    const existing = owner.userId
      ? await ctx.db
          .query('cartItems')
          .withIndex('by_user_id_and_product_id', (q) =>
            q.eq('userId', owner.userId).eq('productId', args.productId),
          )
          .unique()
      : await ctx.db
          .query('cartItems')
          .withIndex('by_session_id_and_product_id', (q) =>
            q.eq('sessionId', owner.sessionId).eq('productId', args.productId),
          )
          .unique();

    const nextQuantity = (existing?.quantity ?? 0) + args.quantity;
    validateQuantity(nextQuantity);
    if (product.stock < nextQuantity) throw new Error('Insufficient stock.');

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        quantity: nextQuantity,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert('cartItems', {
      userId: owner.userId,
      sessionId: owner.sessionId,
      productId: args.productId,
      quantity: args.quantity,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateQuantity = mutation({
  args: {
    cartItemId: v.id('cartItems'),
    quantity: v.number(),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const item = await assertCartItemAccess(ctx, args.cartItemId, args.sessionId);
    if (args.quantity <= 0) {
      await ctx.db.delete(item._id);
      return;
    }

    validateQuantity(args.quantity);
    const product = await ctx.db.get(item.productId);
    if (!product || !product.isActive) throw new Error('Product not available.');
    if (product.stock < args.quantity) throw new Error('Insufficient stock.');

    await ctx.db.patch(item._id, {
      quantity: args.quantity,
      updatedAt: Date.now(),
    });
  },
});

export const removeItem = mutation({
  args: {
    cartItemId: v.id('cartItems'),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const item = await assertCartItemAccess(ctx, args.cartItemId, args.sessionId);
    await ctx.db.delete(item._id);
  },
});

export const clear = mutation({
  args: {
    userId: v.optional(v.id('users')),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const owner = await assertOwnerAccess(ctx, args);
    const items = owner.userId
      ? await ctx.db
          .query('cartItems')
          .withIndex('by_user_id', (q) => q.eq('userId', owner.userId))
          .collect()
      : await ctx.db
          .query('cartItems')
          .withIndex('by_session_id', (q) =>
            q.eq('sessionId', owner.sessionId),
          )
          .collect();

    await Promise.all(items.map((item) => ctx.db.delete(item._id)));
  },
});
