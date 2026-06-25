import { query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("categories"),
      name: v.string(),
      slug: v.string(),
      order: v.number(),
    }),
  ),
  handler: async (ctx) => {
    return await ctx.db.query("categories").order("asc").take(50);
  },
});
