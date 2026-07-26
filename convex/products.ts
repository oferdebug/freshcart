import { v } from 'convex/values';
import { internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  type QueryCtx,
  query,
} from './_generated/server';
import { requireAdmin } from './lib/helpers';

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function resolvePriceCents(priceCents?: number, price?: number) {
  const resolved =
    priceCents ?? (price === undefined ? undefined : price * 100);
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

async function productView(ctx: QueryCtx, product: Doc<'products'>) {
  const imageUrl = product.imageStorageId
    ? await ctx.storage.getUrl(product.imageStorageId)
    : null;

  return {
    ...product,
    price: product.priceCents / 100,
    imageUrl,
  };
}

export const list = query({
  args: { categoryId: v.optional(v.id('categories')) },
  handler: async (ctx, args) => {
    const { categoryId } = args;
    const products = categoryId
      ? await ctx.db
          .query('products')
          .withIndex('by_category_id_and_is_active', (q) =>
            q.eq('categoryId', categoryId).eq('isActive', true),
          )
          .collect()
      : await ctx.db
          .query('products')
          .withIndex('by_is_active', (q) => q.eq('isActive', true))
          .collect();

    return await Promise.all(
      products.map((product) => productView(ctx, product)),
    );
  },
});

export const getById = query({
  args: { id: v.id('products') },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id);
    return product ? await productView(ctx, product) : null;
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
      if (duplicate)
        throw new Error('A product with this slug already exists.');
    }

    type ProductPatch = Partial<Omit<Doc<'products'>, '_id' | '_creationTime'>>;
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

    if (!term) {
      return [];
    }

    const products = await ctx.db
      .query('products')
      .withSearchIndex('search_name', (q) => {
        const activeSearch = q.search('name', term).eq('isActive', true);

        return args.categoryId
          ? activeSearch.eq('categoryId', args.categoryId)
          : activeSearch;
      })
      .take(20);

    return await Promise.all(
      products.map((product) => productView(ctx, product)),
    );
  },
});
const unsplashImage = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1000&q=70`;

const productImageUrls = {
  Bananas: unsplashImage('1571771894821-ce9b6c11b08e'),
  'Red Apples': unsplashImage('1477830530828-c849c4b9bf2d'),
  Tomatoes: unsplashImage('1749776016335-374d2a350ec6'),
  Cucumbers: unsplashImage('1449300079323-02e209d9d3a6'),
  'Fresh Milk 1L': unsplashImage('1576186726188-c9d70843790f'),
  'Large Eggs 12 Pack': unsplashImage('1582722872445-44dc5f7e3c8f'),
  'Greek Yogurt': unsplashImage('1488477181946-6428a0291777'),
  'Whole Wheat Bread': unsplashImage('1559811814-e2c57b5e69df'),
  'Fresh Baguette': unsplashImage('1554475659-9fd915c8f156'),
  'Chicken Breast 1kg': unsplashImage('1604503468506-a8da13d82791'),
  'Ground Beef 500g': unsplashImage('1551446591-142875a901a1'),
  'Basmati Rice 1kg': unsplashImage('1777726041709-7e2875bfa0e0'),
  'Pasta 500g': unsplashImage('1767913338843-1ac3854e202e'),
  'Olive Oil 750ml': unsplashImage('1474979266404-7eaacbcd87c5'),
  'Mineral Water 6 Pack': unsplashImage('1548839140-29a749e1cf4d'),
  'Orange Juice 1L': unsplashImage('1600271886742-f049cd451bba'),
} as const;

export const productsMissingImages = internalQuery({
  args: {},
  handler: async (ctx) => {
    const existingProducts = await ctx.db.query('products').collect();

    return existingProducts
      .filter((product) => !product.imageStorageId)
      .map((product) => ({
        _id: product._id,
        name: product.name,
      }));
  },
});

export const attachSeedImage = internalMutation({
  args: {
    productId: v.id('products'),
    imageStorageId: v.id('_storage'),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);

    if (!product) {
      throw new Error('Product not found.');
    }

    if (product.imageStorageId) {
      return false;
    }

    await ctx.db.patch(args.productId, {
      imageStorageId: args.imageStorageId,
      updatedAt: Date.now(),
    });

    return true;
  },
});

export const seedImages = action({
  args: {},
  handler: async (
    ctx,
  ): Promise<{
    imagesUploaded: number;
    skipped: number;
  }> => {
    const missingProducts: Array<{
      _id: Id<'products'>;
      name: string;
    }> = await ctx.runQuery(internal.products.productsMissingImages, {});

    let imagesUploaded = 0;
    let skipped = 0;

    for (const product of missingProducts) {
      const imageUrl =
        productImageUrls[product.name as keyof typeof productImageUrls];

      if (!imageUrl) {
        skipped += 1;
        continue;
      }

      const response = await fetch(imageUrl);

      if (!response.ok) {
        throw new Error(
          `Failed to download image for ${product.name}: ${response.status}`,
        );
      }

      const contentType = response.headers.get('content-type');

      if (!contentType?.startsWith('image/')) {
        throw new Error(`Invalid image response for ${product.name}.`);
      }

      const blob = await response.blob();
      const imageStorageId = await ctx.storage.store(blob);

      await ctx.runMutation(internal.products.attachSeedImage, {
        productId: product._id,
        imageStorageId,
      });

      imagesUploaded += 1;
    }

    return {
      imagesUploaded,
      skipped,
    };
  },
});
