import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export const userRoleValidator = v.union(
  v.literal('customer'),
  v.literal('admin'),
);

export const membershipStatusValidator = v.union(
  v.literal('none'),
  v.literal('active'),
  v.literal('past_due'),
  v.literal('cancelled'),
);

export const orderStatusValidator = v.union(
  v.literal('pending'),
  v.literal('confirmed'),
  v.literal('processing'),
  v.literal('fulfilled'),
  v.literal('cancelled'),
);

export const paymentStatusValidator = v.union(
  v.literal('unpaid'),
  v.literal('pending'),
  v.literal('paid'),
  v.literal('failed'),
  v.literal('refunded'),
  v.literal('partially_refunded'),
);

export const addressValidator = v.object({
  name: v.string(),
  street: v.string(),
  city: v.string(),
  state: v.string(),
  postalCode: v.string(),
  country: v.string(),
  phone: v.string(),
});

export default defineSchema({
  users: defineTable({
    clerkUserId: v.string(),
    tokenIdentifier: v.optional(v.string()),
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    role: userRoleValidator,
    memberShipStatus: membershipStatusValidator,
    memberShipPlan: v.optional(v.string()),
    membershipCurrentPeriodEnd: v.optional(v.number()),
    stripeCustomerId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_clerk_user_id', ['clerkUserId'])
    .index('by_token_identifier', ['tokenIdentifier'])
    .index('by_stripe_customer_id', ['stripeCustomerId']),

  webhookEvents: defineTable({
    eventId: v.string(),
    source: v.union(v.literal('clerk'), v.literal('stripe')),
    eventType: v.string(),
    status: v.union(
      v.literal('processing'),
      v.literal('succeeded'),
      v.literal('failed'),
    ),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
    processedAt: v.optional(v.number()),
  })
    .index('by_event_id', ['eventId'])
    .index('by_source_and_event_id', ['source', 'eventId']),

  categories: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    imageStorageId: v.optional(v.id('_storage')),
    sortOrder: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_slug', ['slug'])
    .index('by_is_active_and_sort_order', ['isActive', 'sortOrder']),

  products: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.string(),
    priceCents: v.number(),
    currency: v.string(),
    categoryId: v.id('categories'),
    imageStorageId: v.optional(v.id('_storage')),
    sku: v.optional(v.string()),
    stock: v.number(),
    unit: v.string(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_slug', ['slug'])
    .index('by_category_id', ['categoryId'])
    .index('by_is_active', ['isActive'])
    .index('by_category_id_and_is_active', ['categoryId', 'isActive'])
    .searchIndex('search_name', {
      searchField: 'name',
      filterFields: ['categoryId', 'isActive'],
    }),

  cartItems: defineTable({
    userId: v.optional(v.id('users')),
    sessionId: v.optional(v.string()),
    productId: v.id('products'),
    quantity: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user_id', ['userId'])
    .index('by_session_id', ['sessionId'])
    .index('by_user_id_and_product_id', ['userId', 'productId'])
    .index('by_session_id_and_product_id', ['sessionId', 'productId']),

  favorites: defineTable({
    userId: v.id('users'),
    productId: v.id('products'),
    createdAt: v.number(),
  })
    .index('by_user_id', ['userId'])
    .index('by_user_id_and_product_id', ['userId', 'productId']),

  orders: defineTable({
    userId: v.id('users'),
    orderNumber: v.string(),
    status: orderStatusValidator,
    paymentStatus: paymentStatusValidator,
    subtotalCents: v.number(),
    taxCents: v.number(),
    shippingCents: v.number(),
    totalCents: v.number(),
    currency: v.string(),
    hadFreeShipping: v.boolean(),
    stripeCheckoutSessionId: v.optional(v.string()),
    stripePaymentIntentId: v.optional(v.string()),
    shippingAddress: addressValidator,
    reservedUntil: v.optional(v.number()),
    paidAt: v.optional(v.number()),
    cancelledAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user_id', ['userId'])
    .index('by_status', ['status'])
    .index('by_status_and_reserved_until', ['status', 'reservedUntil'])
    .index('by_payment_status', ['paymentStatus'])
    .index('by_order_number', ['orderNumber'])
    .index('by_reserved_until', ['reservedUntil'])
    .index('by_stripe_checkout_session_id', ['stripeCheckoutSessionId'])
    .index('by_stripe_payment_intent_id', ['stripePaymentIntentId']),

  orderItems: defineTable({
    orderId: v.id('orders'),
    productId: v.id('products'),
    productName: v.string(),
    productSlug: v.string(),
    imageStorageId: v.optional(v.id('_storage')),
    unit: v.string(),
    quantity: v.number(),
    unitPriceCents: v.number(),
    totalPriceCents: v.number(),
    currency: v.string(),
  })
    .index('by_order_id', ['orderId'])
    .index('by_product_id', ['productId']),

  addresses: defineTable({
    userId: v.id('users'),
    type: v.union(v.literal('home'), v.literal('work'), v.literal('other')),
    ...addressValidator.fields,
    isDefault: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user_id', ['userId'])
    .index('by_user_id_and_is_default', ['userId', 'isDefault']),

  inventoryMovements: defineTable({
    productId: v.id('products'),
    orderId: v.optional(v.id('orders')),
    actorUserId: v.optional(v.id('users')),
    type: v.union(
      v.literal('reservation'),
      v.literal('release'),
      v.literal('sale'),
      v.literal('restock'),
      v.literal('adjustment'),
    ),
    quantityDelta: v.number(),
    reason: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_product_id', ['productId'])
    .index('by_order_id', ['orderId'])
    .index('by_created_at', ['createdAt']),
});
