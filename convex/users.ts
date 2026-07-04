import { mutation, query } from './_generated/server';

// Get current logged-in user from Convex
export const current = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query('users')
      .withIndex('by_token', (q) =>
        q.eq('tokenIdentifier', identity.tokenIdentifier),
      )
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
      .withIndex('by_token', (q) =>
        q.eq('tokenIdentifier', identity.tokenIdentifier),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: identity.name ?? undefined,
        email: identity.email ?? '',
        clerkId: identity.subject,
        tokenIdentifier: identity.tokenIdentifier,
      });
      return existing._id;
    }

    return await ctx.db.insert('users', {
      clerkId: identity.subject,
      tokenIdentifier: identity.tokenIdentifier,
      email: identity.email ?? '',
      name: identity.name ?? undefined,
      role: 'customer',
      membershipTier: 'free',
    });
  },
});
