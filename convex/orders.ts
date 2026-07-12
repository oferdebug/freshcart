import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { requireUser } from './lib/helpers';

// Get all orders for a user
export const listByUser = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const orders = await ctx.db
      .query('orders')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .order('desc')
      .collect();

    return await Promise.all(
      orders.map(async (order) => ({
        ...order,
        items: await ctx.db
          .query('orderItems')
          .withIndex('by_order', (q) => q.eq('orderId', order._id))
          .collect(),
      })),
    );
  },
});

// Get single order by ID
export const getById = query({
  args: { orderId: v.id('orders') },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) return null;

    const items = await ctx.db
      .query('orderItems')
      .withIndex('by_order', (q) => q.eq('orderId', args.orderId))
      .collect();

    return { ...order, items };
  },
});

// Admin: list all orders
export const listAll = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const orders = args.status
      ? await ctx.db
          .query('orders')
          .withIndex('by_status', (q) => q.eq('status', args.status!))
          .order('desc')
          .collect()
      : await ctx.db.query('orders').order('desc').collect();

    return orders;
  },
});

// Create order from cart
export const create = mutation({
  args: {
    userId: v.id('users'),
    items: v.array(
      v.object({
        productId: v.id('products'),
        productName: v.string(),
        quantity: v.number(),
        unitPrice: v.number(),
      }),
    ),
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
  },
  handler: async (ctx, args) => {
    const { items, ...orderData } = args;

    const orderNumber = `FC-${Date.now()}`;
    const now = Date.now();

    const orderId = await ctx.db.insert('orders', {
      ...orderData,
      orderNumber,
      status: 'pending',
      paymentStatus: 'pending',
      createdAt: now,
      updatedAt: now,
    });

    // Insert order items
    await Promise.all(
      items.map((item) =>
        ctx.db.insert('orderItems', {
          orderId,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.quantity * item.unitPrice,
        }),
      ),
    );

    return orderId;
  },
});

// Update order status (admin)
export const updateStatus = mutation({
  args: {
    orderId: v.id('orders'),
    status: v.string(),
    paymentStatus: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { orderId, status, paymentStatus } = args;
    await ctx.db.patch(orderId, {
      status,
      ...(paymentStatus ? { paymentStatus } : {}),
      updatedAt: Date.now(),
    });
  },
});

// Get order by order number
export const getByOrderNumber = query({
  args: {
    orderNumber: v.string(),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query('orders')
      .withIndex('by_order_number', (q) =>
        q.eq('orderNumber', args.orderNumber),
      )
      .first();
    if (!order) return null;

    const items = await ctx.db
      .query('orderItems')
      .withIndex('by_order', (q) => q.eq('orderId', order._id))
      .collect();

    return { ...order, items };
  },
});

export const createFromCart = mutation({
  args: {
    shippingAddress: v.object({
      name: v.string(),
      street: v.string(),
      city: v.string(),
      state: v.string(),
      postalCode: v.string(),
      country: v.string(),
      phone: v.string(),
    }),
  },
  returns: v.object({
    orderId: v.id('orders'),
    amountCents: v.number(),
  }),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const cartItems = await ctx.db
      .query('cartItems')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();

    if (cartItems.length === 0) {
      throw new Error('Your Cart Is Empty');
    }

    const lines = [];

    for (const item of cartItems) {
      const product = await ctx.db.get(item.productId);

      if (!product || !product.isActive) {
        throw new Error('Product Is Not Available Anymore');
      }

      if (product.stock < item.quantity) {
        throw new Error(`Not Enough Stock For ${product.name}`);
      }

      lines.push({
        productId: product._id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: product.price,
        totalPrice: product.price * item.quantity,
      });
    }

    const subtotal = lines.reduce((sum, line) => sum + line.totalPrice, 0);
    const shipping = user.isMember ? 0 : 5.99;
    const tax = 0;
    const total = subtotal + shipping + tax;

    const now = Date.now();

    const orderId = await ctx.db.insert('orders', {
      userId: user._id,
      orderNumber: `FC-${now}`,
      status: 'pending',
      paymentStatus: 'pending',
      subtotal,
      tax,
      shipping,
      total,
      shippingAddress: args.shippingAddress,
      createdAt: now,
      updatedAt: now,
    });

    for (const line of lines) {
      await ctx.db.insert('orderItems', {
        orderId,
        ...line,
      });
    }

    return {
      orderId,
      amountCents: Math.round(total * 100),
    };
  },
});
