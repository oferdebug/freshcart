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

export const list = query({
  args: { activeOnly: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    if (args.activeOnly) {
      return await ctx.db
        .query('categories')
        .withIndex('by_is_active_and_sort_order', (q) => q.eq('isActive', true))
        .order('asc')
        .collect();
    }

    const categories = await ctx.db.query('categories').collect();
    return categories.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) =>
    await ctx.db
      .query('categories')
      .withIndex('by_slug', (q) => q.eq('slug', normalizeSlug(args.slug)))
      .unique(),
});

export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    imageStorageId: v.optional(v.id('_storage')),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const name = args.name.trim();
    const slug = normalizeSlug(args.slug);
    if (!name || !slug) throw new Error('Name and slug are required.');

    const existing = await ctx.db
      .query('categories')
      .withIndex('by_slug', (q) => q.eq('slug', slug))
      .unique();
    if (existing) throw new Error('A category with this slug already exists.');

    const allCategories = await ctx.db.query('categories').collect();
    const nextSortOrder =
      allCategories.reduce(
        (highest, category) => Math.max(highest, category.sortOrder),
        -1,
      ) + 1;
    const now = Date.now();

    return await ctx.db.insert('categories', {
      name,
      slug,
      description: args.description?.trim() || undefined,
      imageStorageId: args.imageStorageId,
      sortOrder: args.sortOrder ?? nextSortOrder,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id('categories'),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    imageStorageId: v.optional(v.id('_storage')),
    sortOrder: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const category = await ctx.db.get(args.id);
    if (!category) throw new Error('Category not found.');

    const slug = args.slug ? normalizeSlug(args.slug) : undefined;
    if (args.slug && !slug) throw new Error('Slug cannot be empty.');
    if (slug && slug !== category.slug) {
      const duplicate = await ctx.db
        .query('categories')
        .withIndex('by_slug', (q) => q.eq('slug', slug))
        .unique();
      if (duplicate)
        throw new Error('A category with this slug already exists.');
    }

    type CategoryPatch = Partial<
      Omit<Doc<'categories'>, '_id' | '_creationTime'>
    >;
    const updates: CategoryPatch = { updatedAt: Date.now() };

    if (args.name !== undefined) {
      const name = args.name.trim();
      if (!name) throw new Error('Name cannot be empty.');
      updates.name = name;
    }
    if (slug !== undefined) updates.slug = slug;
    if (args.description !== undefined) {
      updates.description = args.description.trim() || undefined;
    }
    if (args.imageStorageId !== undefined) {
      updates.imageStorageId = args.imageStorageId;
    }
    if (args.sortOrder !== undefined) updates.sortOrder = args.sortOrder;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(args.id, updates);
  },
});
