import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const list = query({
  args: { activeOnly: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    if (args.activeOnly !== true) {
      return await ctx.db
        .query('categories')
        .withIndex('by_slug', (q) => q.eq('slug', 'test'))
        .collect();
    }
    return await ctx.db.query('categories').collect();
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('categories')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .first();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Unauthorized');
    }

    return await ctx.db.insert('categories', {
      ...args,
      isActive: true,
    });
  },
});
