import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";

import { BOGOTA_TIMEZONE, calculateBookingValue } from "../../lib/bookingRules";
import { getPaymentHoldExpiresAt, type BookingSource } from "../../lib/paymentRules";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx, MutationCtx } from "../_generated/server";
import { requireClubAccessForUser } from "../access";
import {
  assertCanBook,
  buildBookingCode,
  getClubOrThrow,
  getCourtOrThrow,
  upsertCustomer,
} from "../bookings";
import {
  createMercadoPagoPreference,
  getMercadoPagoEnvironment,
} from "../mercadoPagoClient";
import { getActiveConnection, getSellerAccessToken } from "./connections";
import type { CheckoutActionResult, CheckoutPreparation } from "./types";

function providerCheckoutUrl(
  preference: { init_point?: string; sandbox_init_point?: string },
) {
  if (getMercadoPagoEnvironment() === "sandbox" && preference.sandbox_init_point) {
    return preference.sandbox_init_point;
  }

  return preference.init_point ?? preference.sandbox_init_point;
}

export async function createPreferenceAndAttach(
  ctx: ActionCtx,
  preparation: CheckoutPreparation,
): Promise<CheckoutActionResult> {
  try {
    const sellerAccessToken = await getSellerAccessToken(ctx, preparation);
    const preference = await createMercadoPagoPreference({
      sellerAccessToken,
      clubId: preparation.clubId,
      clubSlug: preparation.clubSlug,
      clubName: preparation.clubName,
      courtId: preparation.courtId,
      courtName: preparation.courtName,
      bookingId: preparation.bookingId,
      bookingCode: preparation.bookingCode,
      localDate: preparation.localDate,
      startMinutes: preparation.startMinutes,
      durationMinutes: preparation.durationMinutes,
      customerName: preparation.customerName,
      customerPhone: preparation.customerPhone,
      customerEmail: preparation.customerEmail,
      amount: preparation.amount,
      expiresAt: preparation.expiresAt,
      allowOfflineMethods: preparation.allowOfflineMethods,
    });
    const checkoutUrl = providerCheckoutUrl(preference);

    if (!checkoutUrl) {
      throw new Error("Mercado Pago did not return a checkout URL.");
    }

    await ctx.runMutation(internal.payments._attachPreferenceToPayment, {
      bookingId: preparation.bookingId,
      paymentId: preparation.paymentId,
      providerPreferenceId: preference.id,
      checkoutUrl,
      sandboxCheckoutUrl: preference.sandbox_init_point,
    });

    return {
      checkoutUrl,
      bookingCode: preparation.bookingCode,
      bookingId: preparation.bookingId,
      paymentId: preparation.paymentId,
    };
  } catch (error) {
    await ctx.runMutation(internal.payments._markPreferenceCreationFailed, {
      bookingId: preparation.bookingId,
      paymentId: preparation.paymentId,
      message:
        error instanceof Error
          ? error.message
          : "No pudimos crear el link de Mercado Pago.",
    });
    throw error;
  }
}

export const createOnlineBookingCheckoutHandler = async (
  ctx: ActionCtx,
  args: {
    clubSlug: string;
    courtId: Id<"courts">;
    localDate: string;
    startMinutes: number;
    durationMinutes: number;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
  },
): Promise<CheckoutActionResult> => {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError("Debes iniciar sesion.");

  const preparation = (await ctx.runMutation(
    internal.payments._createOnlineBookingForCheckout,
    {
      ...args,
      playerUserId: userId as Id<"users">,
    },
  )) as CheckoutPreparation;

  return await createPreferenceAndAttach(ctx, preparation);
};

export const createManualBookingPaymentLinkHandler = async (
  ctx: ActionCtx,
  args: {
    courtId: Id<"courts">;
    localDate: string;
    startMinutes: number;
    durationMinutes: number;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    source: BookingSource;
    internalNote?: string;
  },
): Promise<CheckoutActionResult> => {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError("Debes iniciar sesion.");

  const preparation = (await ctx.runMutation(
    internal.payments._createManualBookingForPaymentLink,
    {
      ...args,
      createdByUserId: userId as Id<"users">,
    },
  )) as CheckoutPreparation;

  return await createPreferenceAndAttach(ctx, preparation);
};

export const retryBookingPaymentHandler = async (
  ctx: ActionCtx,
  args: { bookingId: Id<"bookings"> },
): Promise<CheckoutActionResult> => {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError("Debes iniciar sesion.");

  const preparation = (await ctx.runMutation(
    internal.payments._prepareRetryBookingPayment,
    {
      bookingId: args.bookingId,
      userId: userId as Id<"users">,
    },
  )) as CheckoutPreparation;

  return await createPreferenceAndAttach(ctx, preparation);
};

export const createOnlineBookingForCheckoutHandler = async (
  ctx: MutationCtx,
  args: {
    clubSlug: string;
    courtId: Id<"courts">;
    localDate: string;
    startMinutes: number;
    durationMinutes: number;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    playerUserId: Id<"users">;
  },
) => {
  const club = await getClubOrThrow(ctx, args.clubSlug, {
    requirePublished: true,
    requireBookingEnabled: true,
  });
  const connection = await getActiveConnection(ctx, club._id);

  if (!(club.onlinePaymentsEnabled ?? false)) {
    throw new ConvexError({
      code: "ONLINE_PAYMENTS_DISABLED",
      message: "Este club aun no tiene pagos online activos.",
    });
  }

  const court = await getCourtOrThrow(ctx, args.courtId);
  await assertCanBook({ ctx, club, court, ...args });
  const user = await ctx.db.get(args.playerUserId);
  const now = Date.now();
  const value = calculateBookingValue(
    args.localDate,
    args.startMinutes,
    args.durationMinutes,
    club.pricing,
  );
  const expiresAt = getPaymentHoldExpiresAt(club.paymentHoldMinutes, now);
  const code = await buildBookingCode(ctx, now);
  const customerEmail = args.customerEmail?.trim() || user?.email;
  const customerId = await upsertCustomer(ctx, {
    clubId: club._id,
    fullName: args.customerName,
    phone: args.customerPhone,
    email: customerEmail,
    userId: args.playerUserId,
    source: "online",
  });
  const bookingId = await ctx.db.insert("bookings", {
    clubId: club._id,
    courtId: court._id,
    customerId,
    playerUserId: args.playerUserId,
    createdByUserId: args.playerUserId,
    createdByRole: "player",
    code,
    localDate: args.localDate,
    startMinutes: args.startMinutes,
    durationMinutes: args.durationMinutes,
    endMinutes: args.startMinutes + args.durationMinutes,
    timezone: BOGOTA_TIMEZONE,
    customerName: args.customerName.trim(),
    customerPhone: args.customerPhone.trim(),
    customerEmail: customerEmail?.trim() || undefined,
    source: "online",
    paymentMethod: "mercadopago",
    paymentStatus: "pending",
    bookingStatus: "payment_pending",
    paymentProvider: "mercadopago",
    paymentExpiresAt: expiresAt,
    value,
    createdAt: now,
    updatedAt: now,
  });
  const paymentId = await ctx.db.insert("payments", {
    clubId: club._id,
    bookingId,
    customerId,
    playerUserId: args.playerUserId,
    provider: "mercadopago",
    providerEnvironment: getMercadoPagoEnvironment(),
    providerCollectorId: connection.collectorId,
    externalReference: `booking:${bookingId}`,
    amount: value,
    currency: "COP",
    status: "created",
    expiresAt,
    createdByUserId: args.playerUserId,
    createdAt: now,
    updatedAt: now,
  });

  await ctx.db.patch(bookingId, { paymentId });

  return {
    clubId: club._id,
    clubSlug: club.slug,
    clubName: club.name,
    courtId: court._id,
    courtName: court.name,
    bookingId,
    bookingCode: code,
    paymentId,
    customerName: args.customerName.trim(),
    customerPhone: args.customerPhone.trim(),
    customerEmail: customerEmail?.trim() || undefined,
    localDate: args.localDate,
    startMinutes: args.startMinutes,
    durationMinutes: args.durationMinutes,
    amount: value,
    expiresAt,
    accessTokenEncrypted: connection.accessTokenEncrypted,
    refreshTokenEncrypted: connection.refreshTokenEncrypted,
    accessTokenExpiresAt: connection.accessTokenExpiresAt,
    allowOfflineMethods: club.allowOfflineMercadoPagoMethods ?? false,
  };
};

export const createManualBookingForPaymentLinkHandler = async (
  ctx: MutationCtx,
  args: {
    courtId: Id<"courts">;
    localDate: string;
    startMinutes: number;
    durationMinutes: number;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    source: BookingSource;
    internalNote?: string;
    createdByUserId: Id<"users">;
  },
) => {
  if (args.source === "online") {
    throw new ConvexError({
      code: "INVALID_SOURCE",
      message: "Las reservas manuales no pueden tener origen online.",
    });
  }

  const clubUser = await ctx.db
    .query("clubUsers")
    .withIndex("by_user", (q) => q.eq("userId", args.createdByUserId))
    .collect();
  const activeClubUser = clubUser.find((entry) => entry.status === "active");
  if (!activeClubUser) {
    throw new ConvexError("No tienes acceso a ningun club.");
  }

  const club = await ctx.db.get(activeClubUser.clubId);
  if (!club || !club.isActive) {
    throw new ConvexError("No tienes acceso a ningun club.");
  }

  await requireClubAccessForUser(ctx, args.createdByUserId, club._id, [
    "club_master",
    "club_staff",
  ]);

  if (!(club.onlinePaymentsEnabled ?? false)) {
    throw new ConvexError({
      code: "ONLINE_PAYMENTS_DISABLED",
      message: "Activa pagos online antes de generar links de pago.",
    });
  }

  const connection = await getActiveConnection(ctx, club._id);
  const court = await getCourtOrThrow(ctx, args.courtId);
  await assertCanBook({ ctx, club, court, ...args });
  const now = Date.now();
  const value = calculateBookingValue(
    args.localDate,
    args.startMinutes,
    args.durationMinutes,
    club.pricing,
  );
  const expiresAt = getPaymentHoldExpiresAt(club.paymentHoldMinutes, now);
  const code = await buildBookingCode(ctx, now);
  const customerId = await upsertCustomer(ctx, {
    clubId: club._id,
    fullName: args.customerName,
    phone: args.customerPhone,
    email: args.customerEmail,
    source: args.source,
  });
  const bookingId = await ctx.db.insert("bookings", {
    clubId: club._id,
    courtId: court._id,
    customerId,
    createdByUserId: args.createdByUserId,
    createdByRole: activeClubUser.role,
    code,
    localDate: args.localDate,
    startMinutes: args.startMinutes,
    durationMinutes: args.durationMinutes,
    endMinutes: args.startMinutes + args.durationMinutes,
    timezone: BOGOTA_TIMEZONE,
    customerName: args.customerName.trim(),
    customerPhone: args.customerPhone.trim(),
    customerEmail: args.customerEmail?.trim() || undefined,
    source: args.source,
    paymentMethod: "mercadopago",
    paymentStatus: "pending",
    bookingStatus: "confirmed",
    paymentProvider: "mercadopago",
    paymentExpiresAt: expiresAt,
    value,
    internalNote: args.internalNote?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  });
  const paymentId = await ctx.db.insert("payments", {
    clubId: club._id,
    bookingId,
    customerId,
    provider: "mercadopago",
    providerEnvironment: getMercadoPagoEnvironment(),
    providerCollectorId: connection.collectorId,
    externalReference: `booking:${bookingId}`,
    amount: value,
    currency: "COP",
    status: "created",
    expiresAt,
    createdByUserId: args.createdByUserId,
    createdAt: now,
    updatedAt: now,
  });

  await ctx.db.patch(bookingId, { paymentId });
  await ctx.db.insert("auditLogs", {
    clubId: club._id,
    userId: args.createdByUserId,
    action: "payment_link.created",
    entityType: "booking",
    entityId: bookingId,
    createdAt: now,
  });

  return {
    clubId: club._id,
    clubSlug: club.slug,
    clubName: club.name,
    courtId: court._id,
    courtName: court.name,
    bookingId,
    bookingCode: code,
    paymentId,
    customerName: args.customerName.trim(),
    customerPhone: args.customerPhone.trim(),
    customerEmail: args.customerEmail?.trim() || undefined,
    localDate: args.localDate,
    startMinutes: args.startMinutes,
    durationMinutes: args.durationMinutes,
    amount: value,
    expiresAt,
    accessTokenEncrypted: connection.accessTokenEncrypted,
    refreshTokenEncrypted: connection.refreshTokenEncrypted,
    accessTokenExpiresAt: connection.accessTokenExpiresAt,
    allowOfflineMethods: club.allowOfflineMercadoPagoMethods ?? false,
  };
};

export const prepareRetryBookingPaymentHandler = async (
  ctx: MutationCtx,
  args: { bookingId: Id<"bookings">; userId: Id<"users"> },
) => {
  const booking = await ctx.db.get(args.bookingId);
  if (!booking) {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "No encontramos la reserva.",
    });
  }
  if (booking.bookingStatus === "cancelled") {
    throw new ConvexError({
      code: "BOOKING_CANCELLED",
      message: "Esta reserva esta cancelada.",
    });
  }

  if (booking.playerUserId !== args.userId) {
    await requireClubAccessForUser(ctx, args.userId, booking.clubId, [
      "club_master",
      "club_staff",
    ]);
  }

  const [club, court] = await Promise.all([
    ctx.db.get(booking.clubId),
    ctx.db.get(booking.courtId),
  ]);
  if (!club || !court) {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "No encontramos la reserva.",
    });
  }

  if (booking.bookingStatus === "expired") {
    await assertCanBook({
      ctx,
      club,
      court,
      localDate: booking.localDate,
      startMinutes: booking.startMinutes,
      durationMinutes: booking.durationMinutes,
    });
  }

  const connection = await getActiveConnection(ctx, club._id);
  const now = Date.now();
  const expiresAt = getPaymentHoldExpiresAt(club.paymentHoldMinutes, now);
  const paymentId = await ctx.db.insert("payments", {
    clubId: club._id,
    bookingId: booking._id,
    customerId: booking.customerId,
    playerUserId: booking.playerUserId,
    provider: "mercadopago",
    providerEnvironment: getMercadoPagoEnvironment(),
    providerCollectorId: connection.collectorId,
    externalReference: `booking:${booking._id}`,
    amount: booking.value,
    currency: "COP",
    status: "created",
    expiresAt,
    createdByUserId: args.userId,
    createdAt: now,
    updatedAt: now,
  });

  await ctx.db.patch(booking._id, {
    paymentId,
    paymentProvider: "mercadopago",
    paymentMethod: "mercadopago",
    paymentStatus: "pending",
    bookingStatus:
      booking.source === "online" ? "payment_pending" : booking.bookingStatus,
    paymentExpiresAt: expiresAt,
    expiredAt: undefined,
    updatedAt: now,
  });

  return {
    clubId: club._id,
    clubSlug: club.slug,
    clubName: club.name,
    courtId: court._id,
    courtName: court.name,
    bookingId: booking._id,
    bookingCode: booking.code,
    paymentId,
    customerName: booking.customerName ?? "",
    customerPhone: booking.customerPhone ?? "",
    customerEmail: booking.customerEmail,
    localDate: booking.localDate,
    startMinutes: booking.startMinutes,
    durationMinutes: booking.durationMinutes,
    amount: booking.value,
    expiresAt,
    accessTokenEncrypted: connection.accessTokenEncrypted,
    refreshTokenEncrypted: connection.refreshTokenEncrypted,
    accessTokenExpiresAt: connection.accessTokenExpiresAt,
    allowOfflineMethods: club.allowOfflineMercadoPagoMethods ?? false,
  };
};

export const attachPreferenceToPaymentHandler = async (
  ctx: MutationCtx,
  args: {
    bookingId: Id<"bookings">;
    paymentId: Id<"payments">;
    providerPreferenceId: string;
    checkoutUrl: string;
    sandboxCheckoutUrl?: string;
  },
) => {
  const now = Date.now();
  await ctx.db.patch(args.paymentId, {
    providerPreferenceId: args.providerPreferenceId,
    checkoutUrl: args.checkoutUrl,
    sandboxCheckoutUrl: args.sandboxCheckoutUrl,
    status: "pending",
    updatedAt: now,
  });
  await ctx.db.patch(args.bookingId, {
    paymentCheckoutUrl: args.checkoutUrl,
    updatedAt: now,
  });
  return null;
};

export const markPreferenceCreationFailedHandler = async (
  ctx: MutationCtx,
  args: {
    bookingId: Id<"bookings">;
    paymentId: Id<"payments">;
    message: string;
  },
) => {
  const now = Date.now();
  const booking = await ctx.db.get(args.bookingId);
  await ctx.db.patch(args.paymentId, {
    status: "error",
    statusDetail: args.message.slice(0, 300),
    failedAt: now,
    updatedAt: now,
  });
  if (booking?.bookingStatus === "payment_pending") {
    await ctx.db.patch(args.bookingId, {
      bookingStatus: "expired",
      paymentStatus: "failed",
      expiredAt: now,
      updatedAt: now,
    });
  }
  return null;
};
