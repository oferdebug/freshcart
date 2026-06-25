import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    isMember: v.boolean(),
    membershipExpiresAt: v.optional(v.number()),
  }).index('by_token', ['tokenIdentifier']),

  categories: defineTable({
    name: v.string(),
    slug: v.string(),
    order: v.number(),
  }).index('by_slug', ['slug']),

  products: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.string(),
    price: v.number(),
    categoryId: v.id('categories'),
    imageUrl: v.optional(v.string()),
    imageStorageId: v.optional(v.id('_storage')),
    stock: v.number(),
    isActive: v.boolean(),
  })
    .index('by_category', ['categoryId'])
    .index('by_slug', ['slug'])
    .index('by_active', ['isActive'])
    .searchIndex('search_name', {
      searchField: 'name',
      filterFields: ['isActive'],
    }),

  cartItems: defineTable({
    userId: v.string(),
    productId: v.id('products'),
    quantity: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_and_product', ['userId', 'productId']),

  favourites: defineTable({
    userId: v.string(),
    productId: v.id('products'),
  })
    .index('by_user', ['userId'])
    .index('by_user_and_product', ['userId', 'productId']),

  orders: defineTable({
    userId: v.string(),
    stripeSessionId: v.string(),
    status: v.union(
      v.literal('pending'),
      v.literal('paid'),
      v.literal('cancelled'),
      v.literal('fulfilled'),
    ),
    items: v.array(
      v.object({
        productId: v.id('products'),
        name: v.string(),
        price: v.number(),
        quantity: v.number(),
      }),
    ),
    total: v.number(),
    deliveryFee: v.number(),
    shippingAddress: v.optional(v.string()),
  })
    .index('by_user', ['userId'])
    .index('by_stripe_session', ['stripeSessionId'])
    .index('by_status', ['status']),
  membershipSubscriptions: defineTable({
    userId: v.string(),
    stripeSubscriptionId: v.string(),
    stripeCustomerId: v.string(),
    status: v.string(),
  })
    .index('by_user', ['userId'])
    .index('by_stripe_subscription', ['stripeSubscriptionId']),
});
