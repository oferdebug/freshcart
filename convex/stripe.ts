'use node';

import { v } from 'convex/values';
import Stripe from 'stripe';
import type { Id } from './_generated/dataModel';
import { internal } from './_generated/api';
import type { ActionCtx } from './_generated/server';
import { action } from './_generated/server';

async function createOrReusePaymentIntent(
  ctx: ActionCtx,
  orderId: Id<'orders'>,
) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured.');
  }

  const order = await ctx.runQuery(
    internal.orders.getPendingOrderForPayment,
    { orderId },
  );
  const stripe = new Stripe(stripeSecretKey);

  if (order.paymentIntentId) {
    const existingIntent = await stripe.paymentIntents.retrieve(
      order.paymentIntentId,
    );
    if (!existingIntent.client_secret) {
      throw new Error('The existing payment cannot be resumed.');
    }
    if (existingIntent.status === 'canceled') {
      throw new Error('The existing payment was cancelled.');
    }
    if (existingIntent.status === 'succeeded') {
      throw new Error('This order has already been paid.');
    }
    return existingIntent.client_secret;
  }

  const paymentIntent = await stripe.paymentIntents.create(
    {
      amount: order.amountCents,
      currency: order.currency.toLowerCase(),
      metadata: { orderId },
      automatic_payment_methods: { enabled: true },
    },
    { idempotencyKey: `freshcart-order-${orderId}` },
  );

  if (!paymentIntent.client_secret) {
    throw new Error('Failed to create payment intent.');
  }

  await ctx.runMutation(internal.orders.attachPaymentIntent, {
    orderId,
    paymentIntentId: paymentIntent.id,
  });

  return paymentIntent.client_secret;
}

export const createPaymentIntent = action({
  args: { orderId: v.id('orders') },
  returns: v.object({ clientSecret: v.string() }),
  handler: async (ctx, args) => ({
    clientSecret: await createOrReusePaymentIntent(ctx, args.orderId),
  }),
});

// Compatibility endpoint for the current checkout page. The client-provided
// amount and currency are intentionally ignored; Convex reloads them by order ID.
export const createPaymentIntentMutation = action({
  args: {
    amount: v.optional(v.number()),
    orderId: v.id('orders'),
    currency: v.optional(v.string()),
  },
  returns: v.object({
    clientSecret: v.string(),
    orderId: v.id('orders'),
  }),
  handler: async (ctx, args) => ({
    clientSecret: await createOrReusePaymentIntent(ctx, args.orderId),
    orderId: args.orderId,
  }),
});
