import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";

import type { Id, Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import {
  getCurrentUserClub,
  requireClubAccess,
  requireClubAccessForUser,
} from "../access";

type Ctx = QueryCtx;

export function safePayment(payment: Doc<"payments">) {
  return {
    _id: payment._id,
    _creationTime: payment._creationTime,
    clubId: payment.clubId,
    bookingId: payment.bookingId,
    customerId: payment.customerId,
    playerUserId: payment.playerUserId,
    provider: payment.provider,
    providerEnvironment: payment.providerEnvironment,
    providerPreferenceId: payment.providerPreferenceId,
    providerPaymentId: payment.providerPaymentId,
    providerMerchantOrderId: payment.providerMerchantOrderId,
    providerCollectorId: payment.providerCollectorId,
    externalReference: payment.externalReference,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    statusDetail: payment.statusDetail,
    checkoutUrl: payment.checkoutUrl,
    sandboxCheckoutUrl: payment.sandboxCheckoutUrl,
    paymentMethod: payment.paymentMethod,
    paymentType: payment.paymentType,
    expiresAt: payment.expiresAt,
    paidAt: payment.paidAt,
    failedAt: payment.failedAt,
    refundedAt: payment.refundedAt,
    createdByUserId: payment.createdByUserId,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };
}

export async function getLatestPaymentForBooking(
  ctx: Ctx,
  bookingId: Id<"bookings">,
) {
  const payments = await ctx.db
    .query("payments")
    .withIndex("by_booking", (q) => q.eq("bookingId", bookingId))
    .collect();

  return payments.sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;
}

export const listClubPaymentsHandler = async (ctx: QueryCtx) => {
  const { club } = await getCurrentUserClub(ctx);
  await requireClubAccess(ctx, club._id, ["club_master", "club_staff"]);
  const payments = await ctx.db
    .query("payments")
    .withIndex("by_club", (q) => q.eq("clubId", club._id))
    .collect();

  return payments.sort((a, b) => b.createdAt - a.createdAt).map(safePayment);
};

export const getBookingPaymentDetailsHandler = async (
  ctx: QueryCtx,
  args: { bookingId: Id<"bookings"> },
) => {
  const booking = await ctx.db.get(args.bookingId);
  if (!booking) return null;

  await requireClubAccess(ctx, booking.clubId, ["club_master", "club_staff"]);
  const payment = await getLatestPaymentForBooking(ctx, args.bookingId);
  return payment ? safePayment(payment) : null;
};

export const getPaymentByBookingHandler = async (
  ctx: QueryCtx,
  args: { bookingId: Id<"bookings"> },
) => {
  const authUserId = await getAuthUserId(ctx);
  if (!authUserId) throw new ConvexError("Debes iniciar sesion.");
  const booking = await ctx.db.get(args.bookingId);
  if (!booking) return null;

  if (booking.playerUserId !== authUserId) {
    await requireClubAccessForUser(
      ctx,
      authUserId as Id<"users">,
      booking.clubId,
      ["club_master", "club_staff"],
    );
  }

  const payment = await getLatestPaymentForBooking(ctx, args.bookingId);
  return payment ? safePayment(payment) : null;
};
