import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const current = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      name: v.optional(v.string()),
      email: v.optional(v.string()),
    }),
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      return null;
    }
    return {
      name: identity.name ?? undefined,
      email: identity.email ?? undefined,
    };
  }
});
export const upsertCurrentUser = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const existing = await ctx.db
      .query("users")
      .withIndex('by_token', (q) => q.eq('tokenIdentifier', identity.tokenIdentifier))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: identity.name ?? undefined,
        email: identity.email ?? undefined,
      });
    } else {
      await ctx.db.insert("users", {
        tokenIdentifier: identity.tokenIdentifier,
        name: identity.name ?? undefined,
        email: identity.email ?? undefined,
        isMember: false,
      });
    }
    return null;
  },
});

