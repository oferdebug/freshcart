import { type Infer, v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from './_generated/server';
import { hasActiveMembership, requireAdmin, requireUser } from './lib/helpers';
import {
  addressValidator,
  orderStatusValidator,
  paymentStatusValidator,
} from './schema';

const SHIPPING_CENTS = 599;
const RESERVATION_DURATION_MS = 30 * 60 * 1000;

type ShippingAddress = Infer<typeof addressValidator>;

function itemView(item: Doc<'orderItems'>) {
  return {
    ...item,
    unitPrice: item.unitPriceCents / 100,
    totalPrice: item.totalPriceCents / 100,
  };
}

function orderView(order: Doc<'orders'>) {
  return {
    ...order,
    subtotal: order.subtotalCents / 100,
    tax: order.taxCents / 100,
    shipping: order.shippingCents / 100,
    total: order.totalCents / 100,
  };
}

async function requireOrderAccess(
  ctx: QueryCtx | MutationCtx,
  userId: Id<'users'>,
) {
  const user = await requireUser(ctx);
  if (user._id !== userId && user.role !== 'admin') {
    throw new Error('You cannot access this order.');
  }
  return user;
}

async function getItemsForOrder(
  ctx: QueryCtx | MutationCtx,
  orderId: Id<'orders'>,
) {
  return await ctx.db
    .query('orderItems')
    .withIndex('by_order_id', (q) => q.eq('orderId', orderId))
    .collect();
}

function validateQuantity(quantity: number) {
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99) {
    throw new Error('Quantity must be an integer between 1 and 99.');
  }
}

async function createOrderFromProducts(
  ctx: MutationCtx,
  user: Doc<'users'>,
  requestedItems: Array<{ productId: Id<'products'>; quantity: number }>,
  shippingAddress: ShippingAddress,
  cartItemIds: Array<Id<'cartItems'>> = [],
) {
  if (requestedItems.length === 0) throw new Error('Your cart is empty.');

  const aggregated = new Map<
    string,
    { productId: Id<'products'>; quantity: number }
  >();
  for (const item of requestedItems) {
    validateQuantity(item.quantity);
    const key = item.productId.toString();
    const current = aggregated.get(key);
    const quantity = (current?.quantity ?? 0) + item.quantity;
    validateQuantity(quantity);
    aggregated.set(key, { productId: item.productId, quantity });
  }

  const lines: Array<{
    product: Doc<'products'>;
    quantity: number;
    totalPriceCents: number;
  }> = [];
  let currency: string | undefined;

  for (const requested of aggregated.values()) {
    const product = await ctx.db.get(requested.productId);
    if (!product || !product.isActive) {
      throw new Error('A product in your cart is no longer available.');
    }
    if (product.stock < requested.quantity) {
      throw new Error(`Not enough stock for ${product.name}.`);
    }
    if (currency && currency !== product.currency) {
      throw new Error('All products in an order must use the same currency.');
    }

    currency = product.currency;
    lines.push({
      product,
      quantity: requested.quantity,
      totalPriceCents: product.priceCents * requested.quantity,
    });
  }

  const subtotalCents = lines.reduce(
    (total, line) => total + line.totalPriceCents,
    0,
  );
  const hadFreeShipping = hasActiveMembership(user);
  const shippingCents = hadFreeShipping ? 0 : SHIPPING_CENTS;
  const taxCents = 0;
  const totalCents = subtotalCents + shippingCents + taxCents;
  const now = Date.now();
  const reservedUntil = now + RESERVATION_DURATION_MS;
  const orderNumber = `FC-${now}-${Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, '0')}`;

  const orderId = await ctx.db.insert('orders', {
    userId: user._id,
    orderNumber,
    status: 'pending',
    paymentStatus: 'pending',
    subtotalCents,
    taxCents,
    shippingCents,
    totalCents,
    currency: currency ?? 'usd',
    hadFreeShipping,
    shippingAddress,
    reservedUntil,
    createdAt: now,
    updatedAt: now,
  });

  for (const line of lines) {
    await ctx.db.patch(line.product._id, {
      stock: line.product.stock - line.quantity,
      updatedAt: now,
    });
    await ctx.db.insert('orderItems', {
      orderId,
      productId: line.product._id,
      productName: line.product.name,
      productSlug: line.product.slug,
      imageStorageId: line.product.imageStorageId,
      unit: line.product.unit,
      quantity: line.quantity,
      unitPriceCents: line.product.priceCents,
      totalPriceCents: line.totalPriceCents,
      currency: line.product.currency,
    });
    await ctx.db.insert('inventoryMovements', {
      productId: line.product._id,
      orderId,
      actorUserId: user._id,
      type: 'reservation',
      quantityDelta: -line.quantity,
      reason: 'Checkout stock reservation',
      createdAt: now,
    });
  }

  await Promise.all(cartItemIds.map((cartItemId) => ctx.db.delete(cartItemId)));

  return { orderId, amountCents: totalCents };
}

export const listByUser = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    await requireOrderAccess(ctx, args.userId);
    const orders = await ctx.db
      .query('orders')
      .withIndex('by_user_id', (q) => q.eq('userId', args.userId))
      .order('desc')
      .collect();

    return await Promise.all(
      orders.map(async (order) => ({
        ...orderView(order),
        items: (await getItemsForOrder(ctx, order._id)).map(itemView),
      })),
    );
  },
});

export const getById = query({
  args: { orderId: v.id('orders') },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) return null;
    await requireOrderAccess(ctx, order.userId);

    return {
      ...orderView(order),
      items: (await getItemsForOrder(ctx, order._id)).map(itemView),
    };
  },
});

export const listAll = query({
  args: { status: v.optional(orderStatusValidator) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { status } = args;
    const orders = status
      ? await ctx.db
          .query('orders')
          .withIndex('by_status', (q) => q.eq('status', status))
          .order('desc')
          .collect()
      : await ctx.db.query('orders').order('desc').collect();

    return orders.map(orderView);
  },
});

export const create = mutation({
  args: {
    userId: v.id('users'),
    items: v.array(
      v.object({
        productId: v.id('products'),
        productName: v.optional(v.string()),
        quantity: v.number(),
        unitPrice: v.optional(v.number()),
      }),
    ),
    subtotal: v.optional(v.number()),
    tax: v.optional(v.number()),
    shipping: v.optional(v.number()),
    total: v.optional(v.number()),
    shippingAddress: addressValidator,
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (user._id !== args.userId) throw new Error('Invalid order owner.');

    const order = await createOrderFromProducts(
      ctx,
      user,
      args.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
      args.shippingAddress,
    );
    return order.orderId;
  },
});

export const createFromCart = mutation({
  args: { shippingAddress: addressValidator },
  returns: v.object({
    orderId: v.id('orders'),
    amountCents: v.number(),
  }),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const cartItems = await ctx.db
      .query('cartItems')
      .withIndex('by_user_id', (q) => q.eq('userId', user._id))
      .collect();

    return await createOrderFromProducts(
      ctx,
      user,
      cartItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
      args.shippingAddress,
      cartItems.map((item) => item._id),
    );
  },
});

export const updateStatus = mutation({
  args: {
    orderId: v.id('orders'),
    status: orderStatusValidator,
    paymentStatus: v.optional(paymentStatusValidator),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error('Order not found.');

    if (
      args.status === 'fulfilled' &&
      order.paymentStatus !== 'paid' &&
      args.paymentStatus !== 'paid'
    ) {
      throw new Error('An unpaid order cannot be fulfilled.');
    }

    const now = Date.now();
    if (args.status === 'cancelled' && order.status !== 'cancelled') {
      if (
        order.paymentStatus === 'paid' ||
        order.paymentStatus === 'partially_refunded'
      ) {
        throw new Error('Refund the payment before cancelling this order.');
      }
      if (order.status === 'fulfilled') {
        throw new Error('A fulfilled order cannot be cancelled.');
      }

      const items = await getItemsForOrder(ctx, order._id);
      for (const item of items) {
        const product = await ctx.db.get(item.productId);
        if (product) {
          await ctx.db.patch(product._id, {
            stock: product.stock + item.quantity,
            updatedAt: now,
          });
        }
        await ctx.db.insert('inventoryMovements', {
          productId: item.productId,
          orderId: order._id,
          actorUserId: admin._id,
          type: 'release',
          quantityDelta: item.quantity,
          reason: 'Order cancelled by admin',
          createdAt: now,
        });
      }
    }

    await ctx.db.patch(order._id, {
      status: args.status,
      ...(args.paymentStatus !== undefined
        ? { paymentStatus: args.paymentStatus }
        : {}),
      reservedUntil:
        args.status === 'cancelled' || args.status === 'fulfilled'
          ? undefined
          : order.reservedUntil,
      cancelledAt: args.status === 'cancelled' ? now : order.cancelledAt,
      paidAt:
        args.paymentStatus === 'paid' && order.paidAt === undefined
          ? now
          : order.paidAt,
      updatedAt: now,
    });
  },
});

export const getByOrderNumber = query({
  args: { orderNumber: v.string() },
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query('orders')
      .withIndex('by_order_number', (q) =>
        q.eq('orderNumber', args.orderNumber),
      )
      .unique();
    if (!order) return null;
    await requireOrderAccess(ctx, order.userId);

    return {
      ...orderView(order),
      items: (await getItemsForOrder(ctx, order._id)).map(itemView),
    };
  },
});

export const getPendingOrderForPayment = internalQuery({
  args: { orderId: v.id('orders') },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const order = await ctx.db.get(args.orderId);
    if (!order || order.userId !== user._id) {
      throw new Error('Order not found.');
    }
    if (order.status !== 'pending') throw new Error('Order is not pending.');
    if (!['unpaid', 'pending'].includes(order.paymentStatus)) {
      throw new Error('Order is not awaiting payment.');
    }
    if (!order.reservedUntil || order.reservedUntil <= Date.now()) {
      throw new Error('The stock reservation has expired.');
    }

    return {
      amountCents: order.totalCents,
      currency: order.currency,
      paymentIntentId: order.stripePaymentIntentId,
    };
  },
});

export const attachPaymentIntent = internalMutation({
  args: {
    orderId: v.id('orders'),
    paymentIntentId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const order = await ctx.db.get(args.orderId);
    if (!order || order.userId !== user._id) {
      throw new Error('Order not found.');
    }
    if (
      order.stripePaymentIntentId &&
      order.stripePaymentIntentId !== args.paymentIntentId
    ) {
      throw new Error('A different payment is already attached.');
    }

    await ctx.db.patch(order._id, {
      stripePaymentIntentId: args.paymentIntentId,
      paymentStatus: 'pending',
      updatedAt: Date.now(),
    });
  },
});
