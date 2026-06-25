import { v } from 'convex/values';
import { query } from './_generated/server';
import { paginationOptsValidator } from 'convex/server';

export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
    categoryId: v.optional(v.id('categories')),
  },
  handler: async (ctx, args) => {
    const q = args.categoryId
      ? ctx.db
          .query('products')
          .withIndex('by_category', (q) => q.eq('categoryId', args.categoryId!))
      : ctx.db
          .query('products')
          .withIndex('by_active', (q) => q.eq('isActive', true));

    return await q.paginate(args.paginationOpts);
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  returns: v.union(v.null(), v.any()),
  handler: async (ctx, args) => {
    const product = await ctx.db
      .query('products')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .first();
    return product;
  },
});

export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('products')
      .withSearchIndex('search_name', (q) =>
        q.search('name', args.query).eq('isActive', true),
      )
      .take(20);
  },
});
