import { v } from 'convex/values';
import type { Doc } from './_generated/dataModel';
import { mutation, query } from './_generated/server';
import { requireAdmin } from './lib/helpers';

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function resolvePriceCents(priceCents?: number, price?: number) {
  const resolved = priceCents ?? (price === undefined ? undefined : price * 100);
  if (resolved === undefined) throw new Error('A product price is required.');

  const rounded = Math.round(resolved);
  if (!Number.isSafeInteger(rounded) || rounded < 0) {
    throw new Error('Product price must be a non-negative amount.');
  }
  return rounded;
}

function validateStock(stock: number) {
  if (!Number.isSafeInteger(stock) || stock < 0) {
    throw new Error('Stock must be a non-negative integer.');
  }
}

function productView(product: Doc<'products'>) {
  return { ...product, price: product.priceCents / 100 };
}

export const list = query({
  args: { categoryId: v.optional(v.id('categories')) },
  handler: async (ctx, args) => {
    const products = args.categoryId
      ? await ctx.db
          .query('products')
          .withIndex('by_category_id_and_is_active', (q) =>
            q.eq('categoryId', args.categoryId!).eq('isActive', true),
          )
          .collect()
      : await ctx.db
          .query('products')
          .withIndex('by_is_active', (q) => q.eq('isActive', true))
          .collect();

    return products.map(productView);
  },
});

export const getById = query({
  args: { id: v.id('products') },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id);
    return product ? productView(product) : null;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    priceCents: v.optional(v.number()),
    currency: v.optional(v.string()),
    categoryId: v.id('categories'),
    imageStorageId: v.optional(v.id('_storage')),
    sku: v.optional(v.string()),
    stock: v.number(),
    unit: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const category = await ctx.db.get(args.categoryId);
    if (!category) throw new Error('Category not found.');

    const name = args.name.trim();
    const slug = normalizeSlug(args.slug ?? name);
    if (!name || !slug) throw new Error('Product name and slug are required.');

    const existing = await ctx.db
      .query('products')
      .withIndex('by_slug', (q) => q.eq('slug', slug))
      .unique();
    if (existing) throw new Error('A product with this slug already exists.');

    validateStock(args.stock);
    const now = Date.now();

    return await ctx.db.insert('products', {
      name,
      slug,
      description: args.description?.trim() || `${name} from FreshCart`,
      priceCents: resolvePriceCents(args.priceCents, args.price),
      currency: (args.currency ?? 'usd').trim().toLowerCase(),
      categoryId: args.categoryId,
      imageStorageId: args.imageStorageId,
      sku: args.sku?.trim() || undefined,
      stock: args.stock,
      unit: args.unit?.trim() || 'each',
      isActive: args.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id('products'),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    priceCents: v.optional(v.number()),
    currency: v.optional(v.string()),
    categoryId: v.optional(v.id('categories')),
    imageStorageId: v.optional(v.id('_storage')),
    sku: v.optional(v.string()),
    stock: v.optional(v.number()),
    unit: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const product = await ctx.db.get(args.id);
    if (!product) throw new Error('Product not found.');

    if (args.categoryId) {
      const category = await ctx.db.get(args.categoryId);
      if (!category) throw new Error('Category not found.');
    }
    if (args.stock !== undefined) validateStock(args.stock);

    const slug = args.slug ? normalizeSlug(args.slug) : undefined;
    if (args.slug && !slug) throw new Error('Slug cannot be empty.');
    if (slug && slug !== product.slug) {
      const duplicate = await ctx.db
        .query('products')
        .withIndex('by_slug', (q) => q.eq('slug', slug))
        .unique();
      if (duplicate) throw new Error('A product with this slug already exists.');
    }

    type ProductPatch = Partial<
      Omit<Doc<'products'>, '_id' | '_creationTime'>
    >;
    const updates: ProductPatch = { updatedAt: Date.now() };

    if (args.name !== undefined) updates.name = args.name.trim();
    if (slug !== undefined) updates.slug = slug;
    if (args.description !== undefined) {
      updates.description = args.description.trim();
    }
    if (args.price !== undefined || args.priceCents !== undefined) {
      updates.priceCents = resolvePriceCents(args.priceCents, args.price);
    }
    if (args.currency !== undefined) {
      updates.currency = args.currency.trim().toLowerCase();
    }
    if (args.categoryId !== undefined) updates.categoryId = args.categoryId;
    if (args.imageStorageId !== undefined) {
      updates.imageStorageId = args.imageStorageId;
    }
    if (args.sku !== undefined) updates.sku = args.sku.trim() || undefined;
    if (args.stock !== undefined) updates.stock = args.stock;
    if (args.unit !== undefined) updates.unit = args.unit.trim();
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(args.id, updates);
  },
});

export const search = query({
  args: {
    query: v.string(),
    categoryId: v.optional(v.id('categories')),
  },
  handler: async (ctx, args) => {
    const term = args.query.trim();
    if (!term) return [];

    const products = await ctx.db
      .query('products')
      .withSearchIndex('search_name', (q) => {
        const activeSearch = q.search('name', term).eq('isActive', true);
        return args.categoryId
          ? activeSearch.eq('categoryId', args.categoryId)
          : activeSearch;
      })
      .take(20);

    return products.map(productView);
  },
});
