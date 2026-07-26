import { mutation, query } from './_generated/server';
import { getCurrentUser, isConfiguredAdmin } from './lib/helpers';

export const current = query({
  args: {},
  handler: async (ctx) => await getCurrentUser(ctx),
});

export const upsert = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthorized');

    const byClerkId = await ctx.db
      .query('users')
      .withIndex('by_clerk_user_id', (q) =>
        q.eq('clerkUserId', identity.subject),
      )
      .unique();

    const existing =
      byClerkId ??
      (await ctx.db
        .query('users')
        .withIndex('by_token_identifier', (q) =>
          q.eq('tokenIdentifier', identity.tokenIdentifier),
        )
        .unique());

    const now = Date.now();
    const shouldBeAdmin = isConfiguredAdmin(identity.subject);

    if (existing) {
      await ctx.db.patch(existing._id, {
        clerkUserId: identity.subject,
        tokenIdentifier: identity.tokenIdentifier,
        email: identity.email ?? existing.email,
        name: identity.name ?? existing.name,
        imageUrl: identity.pictureUrl ?? existing.imageUrl,
        role: shouldBeAdmin ? 'admin' : existing.role,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert('users', {
      clerkUserId: identity.subject,
      tokenIdentifier: identity.tokenIdentifier,
      email: identity.email ?? '',
      name: identity.name ?? undefined,
      imageUrl: identity.pictureUrl ?? undefined,
      role: shouldBeAdmin ? 'admin' : 'customer',
      memberShipStatus: 'none',
      createdAt: now,
      updatedAt: now,
    });
  },
});
