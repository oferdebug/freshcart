import type { Id } from './_generated/dataModel';
import { mutation } from './_generated/server';

const categories = [
  { name: 'Fruits & Vegetables', slug: 'fruits-vegetables' },
  { name: 'Dairy & Eggs', slug: 'dairy-eggs' },
  { name: 'Bakery', slug: 'bakery' },
  { name: 'Meat & Poultry', slug: 'meat-poultry' },
  { name: 'Pantry', slug: 'pantry' },
  { name: 'Drinks', slug: 'drinks' },
] as const;

const products = [
  { name: 'Bananas', price: 7.9, stock: 80, categorySlug: 'fruits-vegetables' },
  {
    name: 'Red Apples',
    price: 12.9,
    stock: 65,
    categorySlug: 'fruits-vegetables',
  },
  {
    name: 'Tomatoes',
    price: 9.9,
    stock: 70,
    categorySlug: 'fruits-vegetables',
  },
  {
    name: 'Cucumbers',
    price: 8.9,
    stock: 70,
    categorySlug: 'fruits-vegetables',
  },
  { name: 'Fresh Milk 1L', price: 6.8, stock: 45, categorySlug: 'dairy-eggs' },
  {
    name: 'Large Eggs 12 Pack',
    price: 14.9,
    stock: 35,
    categorySlug: 'dairy-eggs',
  },
  { name: 'Greek Yogurt', price: 5.9, stock: 40, categorySlug: 'dairy-eggs' },
  { name: 'Whole Wheat Bread', price: 11.9, stock: 25, categorySlug: 'bakery' },
  { name: 'Fresh Baguette', price: 7.9, stock: 20, categorySlug: 'bakery' },
  {
    name: 'Chicken Breast 1kg',
    price: 39.9,
    stock: 24,
    categorySlug: 'meat-poultry',
  },
  {
    name: 'Ground Beef 500g',
    price: 34.9,
    stock: 18,
    categorySlug: 'meat-poultry',
  },
  { name: 'Basmati Rice 1kg', price: 16.9, stock: 50, categorySlug: 'pantry' },
  { name: 'Pasta 500g', price: 6.9, stock: 55, categorySlug: 'pantry' },
  { name: 'Olive Oil 750ml', price: 39.9, stock: 30, categorySlug: 'pantry' },
  {
    name: 'Mineral Water 6 Pack',
    price: 15.9,
    stock: 60,
    categorySlug: 'drinks',
  },
  { name: 'Orange Juice 1L', price: 12.9, stock: 32, categorySlug: 'drinks' },
] as const;

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Adds demo categories and products to FreshCart. Existing category slugs and
 * product names are skipped, so the mutation can safely be run more than once.
 * Remove this public function before deploying a production environment.
 */
export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const categoryIds = new Map<string, Id<'categories'>>();
    let categoriesCreated = 0;
    let productsCreated = 0;

    for (const [sortOrder, category] of categories.entries()) {
      const existing = await ctx.db
        .query('categories')
        .withIndex('by_slug', (q) => q.eq('slug', category.slug))
        .unique();

      if (existing) {
        categoryIds.set(category.slug, existing._id);
        continue;
      }

      const now = Date.now();
      const categoryId = await ctx.db.insert('categories', {
        name: category.name,
        slug: category.slug,
        sortOrder,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      categoryIds.set(category.slug, categoryId);
      categoriesCreated += 1;
    }

    const existingProducts = await ctx.db.query('products').collect();
    const existingNames = new Set(
      existingProducts.map((product) => product.name.trim().toLowerCase()),
    );

    for (const product of products) {
      if (existingNames.has(product.name.trim().toLowerCase())) continue;

      const categoryId = categoryIds.get(product.categorySlug);
      if (!categoryId) {
        throw new Error(`Category not found for product: ${product.name}`);
      }

      const now = Date.now();
      await ctx.db.insert('products', {
        name: product.name,
        slug: slugify(product.name),
        description: `${product.name} from FreshCart`,
        priceCents: Math.round(product.price * 100),
        currency: 'usd',
        categoryId,
        stock: product.stock,
        unit: 'each',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      productsCreated += 1;
    }

    return {
      categoriesCreated,
      productsCreated,
      message: 'FreshCart catalog is ready.',
    };
  },
});
