import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

type Ctx = QueryCtx | MutationCtx;
export type ClubUserRole = "club_master" | "club_staff";

export async function getAuthUser(ctx: Ctx) {
  const userId = await getAuthUserId(ctx);

  if (!userId) {
    return null;
  }

  const user = await ctx.db.get(userId);

  if (!user) {
    return null;
  }

  return { userId, user };
}

export async function requireAuthUser(ctx: Ctx) {
  const result = await getAuthUser(ctx);

  if (!result) {
    throw new ConvexError("Debes iniciar sesion.");
  }

  return result;
}

export async function isSuperAdmin(ctx: Ctx, userId: Id<"users">) {
  const roles = await ctx.db
    .query("platformRoles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  return roles.some(
    (role) => role.role === "super_admin" && role.status === "active",
  );
}

export async function requireSuperAdmin(ctx: Ctx) {
  const auth = await requireAuthUser(ctx);

  if (!(await isSuperAdmin(ctx, auth.userId))) {
    throw new ConvexError("No tienes permisos de super admin.");
  }

  return auth;
}

export async function listActiveClubUsers(ctx: Ctx, userId: Id<"users">) {
  const clubUsers = await ctx.db
    .query("clubUsers")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  return clubUsers.filter((clubUser) => clubUser.status === "active");
}

export async function requireClubAccess(
  ctx: Ctx,
  clubId: Id<"clubs">,
  allowedRoles: ClubUserRole[],
) {
  const auth = await requireAuthUser(ctx);
  const clubUser = await requireClubAccessForUser(
    ctx,
    auth.userId,
    clubId,
    allowedRoles,
  );

  return { ...auth, clubUser };
}

export async function requireClubAccessForUser(
  ctx: Ctx,
  userId: Id<"users">,
  clubId: Id<"clubs">,
  allowedRoles: ClubUserRole[],
) {
  const clubUser = await ctx.db
    .query("clubUsers")
    .withIndex("by_user_club", (q) =>
      q.eq("userId", userId).eq("clubId", clubId),
    )
    .unique();

  if (
    !clubUser ||
    clubUser.status !== "active" ||
    !allowedRoles.includes(clubUser.role)
  ) {
    throw new ConvexError("No tienes acceso a este club.");
  }

  return clubUser;
}

export async function getCurrentUserClub(ctx: Ctx) {
  const auth = await requireAuthUser(ctx);
  const clubUsers = await listActiveClubUsers(ctx, auth.userId);

  for (const clubUser of clubUsers) {
    const club = await ctx.db.get(clubUser.clubId);

    if (club && club.isActive) {
      return { ...auth, clubUser, club };
    }
  }

  throw new ConvexError("No tienes acceso a ningun club.");
}

export function publicUser(user: Doc<"users">) {
  return {
    _id: user._id,
    _creationTime: user._creationTime,
    name: user.name,
    email: user.email,
    phone: user.phone,
    image: user.image,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
