import type { MutationCtx } from "../_generated/server";

export const expirePendingPaymentBookingsHandler = async (ctx: MutationCtx) => {
  const now = Date.now();
  const pendingBookings = await ctx.db
    .query("bookings")
    .withIndex("by_payment_status", (q) => q.eq("paymentStatus", "pending"))
    .collect();
  let expired = 0;

  for (const booking of pendingBookings) {
    if (
      booking.bookingStatus !== "payment_pending" ||
      booking.paymentExpiresAt === undefined ||
      booking.paymentExpiresAt >= now
    ) {
      continue;
    }

    await ctx.db.patch(booking._id, {
      bookingStatus: "expired",
      paymentStatus: "expired",
      expiredAt: now,
      updatedAt: now,
    });

    if (booking.paymentId) {
      await ctx.db.patch(booking.paymentId, {
        status: "expired",
        failedAt: now,
        updatedAt: now,
      });
    }

    expired += 1;
  }

  return { expired };
};
