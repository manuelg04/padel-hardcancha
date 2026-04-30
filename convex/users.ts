import { v } from "convex/values";

import { query } from "./_generated/server";
import {
  clubAccessValidator,
  userPublicValidator,
} from "./validators";
import {
  getAuthUser,
  isSuperAdmin,
  listActiveClubUsers,
  publicUser,
  requireSuperAdmin,
} from "./access";

export const getCurrentUser = query({
  args: {},
  returns: v.union(userPublicValidator, v.null()),
  handler: async (ctx) => {
    const auth = await getAuthUser(ctx);
    return auth ? publicUser(auth.user) : null;
  },
});

export const getCurrentUserAccess = query({
  args: {},
  returns: v.object({
    user: v.union(userPublicValidator, v.null()),
    isSuperAdmin: v.boolean(),
    clubAccess: v.array(clubAccessValidator),
  }),
  handler: async (ctx) => {
    const auth = await getAuthUser(ctx);

    if (!auth) {
      return {
        user: null,
        isSuperAdmin: false,
        clubAccess: [],
      };
    }

    const [superAdmin, clubUsers] = await Promise.all([
      isSuperAdmin(ctx, auth.userId),
      listActiveClubUsers(ctx, auth.userId),
    ]);
    const clubAccess = [];

    for (const clubUser of clubUsers) {
      const club = await ctx.db.get(clubUser.clubId);
      if (club && club.isActive) {
        clubAccess.push({
          clubId: club._id,
          clubName: club.name,
          role: clubUser.role,
        });
      }
    }

    return {
      user: publicUser(auth.user),
      isSuperAdmin: superAdmin,
      clubAccess,
    };
  },
});

export const superAdminFindUserByEmail = query({
  args: { email: v.string() },
  returns: v.union(userPublicValidator, v.null()),
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email.trim().toLowerCase()))
      .unique();

    return user ? publicUser(user) : null;
  },
});
