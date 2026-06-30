/** biome-ignore-all lint/suspicious/noExplicitAny: > */
import { v } from 'convex/values';
import { query, mutation } from './_generated/server';

//products list -filter by category,price range,search term
export const list = query({
  args: {
    categoryId: v.optional(v.id('categories')),
  },
  handler: async (ctx, args) => {
    const baseQuery = args.categoryId
      ? ctx.db
          .query('products')
          .withIndex('by_category', (q) =>
            q.eq('categoryId', args.categoryId ?? ('' as any)),
          )
      : ctx.db.query('products');
    return await baseQuery
      .filter((q) => q.eq(q.field('isActive'), true))
      .collect();
  },
});

//Get single product by ID
export const getById = query({
  args: { id: v.id('products') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

//Admin Can Create Products
export const create = mutation({
  args: {
    name: v.string(),
    price: v.number(),
    categoryId: v.id('categories'),
    stock: v.number(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthorized');
    return await ctx.db.insert('products', args);
  },
});

//Admin Can Update Products
export const update = mutation({
  args: {
    id: v.id('products'),
    name: v.string(),
    price: v.number(),
    categoryId: v.id('categories'),
    stock: v.number(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthorized');
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});

//Search Products
export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('products')
      .withSearchIndex('search_by_name', (q) => q.search('name', args.query))
      .filter((q) => q.eq(q.field('isActive'), true))
      .take(20);
  },
});
