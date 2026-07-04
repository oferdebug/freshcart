import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  users: defineTable({
    clerkId: v.optional(v.string()),
    tokenIdentifier: v.optional(v.string()),
    email: v.string(),
    name: v.optional(v.string()),
    role: v.optional(v.string()),
    membershipTier: v.optional(v.string()),
    isMember: v.optional(v.boolean()),
  })
    .index('by_clerk', ['clerkId'])
    .index('by_token', ['tokenIdentifier']),

  categories: defineTable({
    name: v.string(),
    slug: v.string(),
    isActive: v.boolean(),
  }).index('by_slug', ['slug']),

  cartItems: defineTable({
    userId: v.optional(v.id('users')),
    productId: v.id('products'),
    sessionId: v.optional(v.string()),
    quantity: v.number(),
    addedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_session', ['sessionId'])
    .index('by_product_user', ['productId', 'userId']),

  favorites: defineTable({
    userId: v.id('users'),
    productId: v.id('products'),
    addedAt: v.number(),
  })

    .index('by_user', ['userId'])
    .index('by_user_product', ['userId', 'productId']),

  orders: defineTable({
    userId: v.id('users'),
    orderNumber: v.string(),
    status: v.string(),
    paymentStatus: v.string(),
    subtotal: v.number(),
    tax: v.number(),
    shipping: v.number(),
    total: v.number(),
    shippingAddress: v.object({
      name: v.string(),
      street: v.string(),
      city: v.string(),
      state: v.string(),
      postalCode: v.string(),
      country: v.string(),
      phone: v.string(),
    }),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_status', ['status'])
    .index('by_order_number', ['orderNumber']),

  orderItems: defineTable({
    orderId: v.id('orders'),
    productId: v.id('products'),
    productName: v.string(),
    quantity: v.number(),
    unitPrice: v.number(),
    totalPrice: v.number(),
  }).index('by_order', ['orderId']),

  addresses: defineTable({
    userId: v.id('users'),
    type: v.string(),
    name: v.string(),
    street: v.string(),
    city: v.string(),
    state: v.string(),
    postalCode: v.string(),
    country: v.string(),
    phone: v.string(),
    isDefault: v.boolean(),
  }).index('by_user', ['userId']),

  products: defineTable({
    name: v.string(),
    price: v.number(),
    categoryId: v.id('categories'),
    stock: v.number(),
    isActive: v.boolean(),
  })
    .index('by_category', ['categoryId'])
    .searchIndex('search_by_name', { searchField: 'name' }),
});
