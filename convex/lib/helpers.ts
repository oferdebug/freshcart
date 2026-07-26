import type { Doc } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';

type DatabaseCtx = QueryCtx | MutationCtx;

export async function getCurrentUser(ctx: DatabaseCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  const byToken = await ctx.db
    .query('users')
    .withIndex('by_token_identifier', (q) =>
      q.eq('tokenIdentifier', identity.tokenIdentifier),
    )
    .unique();

  if (byToken) return byToken;

  return await ctx.db
    .query('users')
    .withIndex('by_clerk_user_id', (q) => q.eq('clerkUserId', identity.subject))
    .unique();
}

export async function requireUser(ctx: DatabaseCtx) {
  const user = await getCurrentUser(ctx);
  if (!user) throw new Error('You must be signed in.');
  return user;
}

export async function requireAdmin(ctx: DatabaseCtx) {
  const user = await requireUser(ctx);
  if (user.role !== 'admin') throw new Error('Admin access is required.');
  return user;
}

export function isConfiguredAdmin(clerkUserId: string) {
  const configuredIds = process.env.ADMIN_CLERK_USER_IDS;
  if (!configuredIds) return false;

  return configuredIds
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .includes(clerkUserId);
}

export function hasActiveMembership(user: Doc<'users'>, now = Date.now()) {
  if (user.memberShipStatus !== 'active') return false;
  return (
    user.membershipCurrentPeriodEnd === undefined ||
    user.membershipCurrentPeriodEnd > now
  );
}
