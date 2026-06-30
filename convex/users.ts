import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

// Get current logged-in user from Convex
export const current = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkId', identity.subject))
      .first();
  },
});

// Upsert user on sign-in (call this from the frontend after login)
export const upsert = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthorized');

    const existing = await ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkId', identity.subject))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: identity.name ?? undefined,
        email: identity.email ?? '',
      });
      return existing._id;
    }

    return await ctx.db.insert('users', {
      clerkId: identity.subject,
      email: identity.email ?? '',
      name: identity.name ?? undefined,
      role: 'customer',
      membershipTier: 'free',
    });
  },
});
