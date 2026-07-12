'use node';

import { v } from 'convex/values';
import Stripe from 'stripe';
import { internal } from './_generated/api';
import { action, internalQuery } from './_generated/server';

export const createPaymentIntent = action({
  args: { orderId: v.id('orders') },
  returns: v.object({ clientSecret: v.string() }),
  handler: async (ctx, args) => {
    const stripeSecretKeys = process.env.STRIPE_SECRET_KET;
    if (!stripeSecretKeys) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }

    const order = await ctx.runQuery(
      internal.orders.getPendingOrderForPayment,
      {
        orderId: args.orderId,
      },
    );

    const stripe = new Stripe(stripeSecretKeys);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: order.amountCents,
      currency: 'usd,ils,eur',
      metadata: { orderId: args.orderId },
      automatic_payment_methods: { enabled: true },
    });

    if (!paymentIntent.client_secret) {
      throw new Error('Failed to create payment intent');
    }

    await ctx.runMutation(internal.orders.attachPaymentIntent, {
      orderId: args.orderId,
      paymentIntentId: paymentIntent.id,
    });
    return { clientSecret: paymentIntent.client_secret };
  },
});

export const getPendingOrderForPayment = internalQuery({});

export const createPaymentIntentMutation = action({
  args: {
    amount: v.number(),
    orderId: v.string(),
    currency: v.optional(v.string()),
  },
  returns: v.object({
    clientSecret: v.string(),
    orderId: v.string(),
  }),
  handler: async (_ctx, args) => {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }

    if (!paymentIntent.client_secret) {
      throw new Error('Failed to create payment intent');
    }

    return {
      clientSecret: paymentIntent.client_secret,
      orderId: args.orderId,
    };
  },
});
