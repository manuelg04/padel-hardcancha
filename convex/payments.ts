import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";

import { BOGOTA_TIMEZONE, calculateBookingValue } from "../lib/bookingRules";
import {
  applyDepositWebhookState,
  calculateSuggestedDeposit,
  estimateMembershipForDeposit,
  normalizeDepositSettings,
} from "../lib/depositRules";
import { normalizeMercadoPagoConnectionInput } from "../lib/mercadoPagoConnectionRules";
import {
  createMercadoPagoDepositPreference,
  getMercadoPagoCheckoutUrl,
  getMercadoPagoPayment,
} from "./mercadoPagoClient";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import {
  assertCanBook,
  buildBookingCode,
  getClubOrThrow,
  getCourtOrThrow,
  upsertCustomer,
} from "./bookings";
import { requireAuthUser, requireClubAccess, getCurrentUserClub } from "./access";
import {
  depositTypeValidator,
  reservationPaymentValidator,
} from "./validators";

type Ctx = QueryCtx | MutationCtx;

const onlineDepositBookingArgs = {
  clubSlug: v.string(),
  courtId: v.id("courts"),
  localDate: v.string(),
  startMinutes: v.number(),
  durationMinutes: v.number(),
  customerName: v.string(),
  customerPhone: v.string(),
  customerEmail: v.optional(v.string()),
};

const depositPreviewValidator = v.object({
  clubId: v.id("clubs"),
  onlineDepositsEnabled: v.boolean(),
  mercadoPagoConnected: v.boolean(),
  allowPayAtClub: v.boolean(),
  baseReservationTotal: v.number(),
  estimatedMembershipDiscount: v.number(),
  estimatedTotal: v.number(),
  depositSuggestedAmount: v.number(),
  estimatedBalanceDue: v.number(),
  playerHasDepositWaiver: v.boolean(),
  membershipSnapshot: v.union(v.null(), v.any()),
});

const createDepositResultValidator = v.object({
  code: v.string(),
  bookingId: v.id("bookings"),
  paymentId: v.optional(v.id("reservationPayments")),
  checkoutUrl: v.optional(v.string()),
  error: v.optional(v.string()),
});

type CreateDepositResult = {
  code: string;
  bookingId: Id<"bookings">;
  paymentId?: Id<"reservationPayments">;
  checkoutUrl?: string;
  error?: string;
};

type DepositPreparation = {
  clubId: Id<"clubs">;
  clubSlug: string;
  clubName: string;
  courtId: Id<"courts">;
  courtName: string;
  bookingId: Id<"bookings">;
  code: string;
  paymentId: Id<"reservationPayments">;
  userId: Id<"users">;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  amount: number;
  accessToken: string;
};

const connectionStatusValidator = v.object({
  clubId: v.id("clubs"),
  onlineDepositsEnabled: v.boolean(),
  depositMode: v.literal("optional"),
  depositType: depositTypeValidator,
  depositPercentage: v.number(),
  depositFixedAmount: v.union(v.number(), v.null()),
  depositMinAmount: v.number(),
  depositMaxAmount: v.number(),
  depositRoundingAmount: v.number(),
  depositApplyAfterMembershipDiscounts: v.boolean(),
  allowPayAtClub: v.boolean(),
  mercadoPagoConnected: v.boolean(),
  mercadoPagoConnectionStatus: v.string(),
  canManageConnection: v.boolean(),
});

async function getActiveMercadoPagoConnection(ctx: Ctx, clubId: Id<"clubs">) {
  const connection = await ctx.db
    .query("mercadoPagoConnections")
    .withIndex("by_club", (q) => q.eq("clubId", clubId))
    .unique();

  if (!connection || connection.status !== "connected") {
    return null;
  }

  return connection;
}

async function getClubAccessToken(ctx: Ctx, clubId: Id<"clubs">) {
  const connection = await getActiveMercadoPagoConnection(ctx, clubId);
  const accessToken = connection?.accessToken?.trim();

  if (!accessToken) {
    throw new ConvexError({
      code: "MERCADOPAGO_NOT_CONNECTED",
      message: "Este club no tiene Mercado Pago conectado.",
    });
  }

  return { connection, accessToken };
}

async function getActiveMembershipForCustomer(
  ctx: Ctx,
  clubId: Id<"clubs">,
  customerId: Id<"customers">,
  now: number,
) {
  const memberships = await ctx.db
    .query("customerMemberships")
    .withIndex("by_customer_club", (q) =>
      q.eq("customerId", customerId).eq("clubId", clubId),
    )
    .collect();

  return (
    memberships.find(
      (membership) =>
        membership.status === "active" &&
        membership.startsAt <= now &&
        (membership.endsAt === undefined || membership.endsAt > now),
    ) ?? null
  );
}

async function findCustomerForDepositPreview(
  ctx: Ctx,
  clubId: Id<"clubs">,
  userId: Id<"users">,
  customerPhone?: string,
) {
  const byUser = await ctx.db
    .query("customers")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  const userCustomer = byUser.find((customer) => customer.clubId === clubId);

  if (userCustomer) return userCustomer;

  const normalizedPhone = customerPhone?.replace(/\D/g, "");
  if (!normalizedPhone) return null;

  return await ctx.db
    .query("customers")
    .withIndex("by_club_phone", (q) =>
      q.eq("clubId", clubId).eq("phone", normalizedPhone),
    )
    .unique();
}

async function buildDepositEstimate(args: {
  ctx: Ctx;
  club: Doc<"clubs">;
  customerId: Id<"customers"> | null;
  localDate: string;
  startMinutes: number;
  baseReservationTotal: number;
}) {
  const membership = args.customerId
    ? await getActiveMembershipForCustomer(
        args.ctx,
        args.club._id,
        args.customerId,
        bookingStartTimestamp(args.localDate, args.startMinutes),
      )
    : null;
  const plan = membership ? await args.ctx.db.get(membership.membershipPlanId) : null;
  const membershipEstimate = estimateMembershipForDeposit({
    baseReservationTotal: args.baseReservationTotal,
    bookingDate: args.localDate,
    bookingStartMinutes: args.startMinutes,
    membership:
      membership && plan && plan.isActive
        ? {
            membershipId: membership._id,
            membershipPlanId: plan._id,
            membershipPlanName: plan.name,
            benefitType: plan.benefitType,
            discountPercent: plan.discountPercent,
            fixedPrice: plan.fixedPrice,
            waivesDeposit: plan.waivesDeposit,
            appliesAlways: plan.appliesAlways,
            validDaysOfWeek: plan.validDaysOfWeek,
            validStartTime: plan.validStartTime,
            validEndTime: plan.validEndTime,
          }
        : null,
  });
  const deposit = calculateSuggestedDeposit({
    baseReservationTotal: args.baseReservationTotal,
    estimatedMembershipDiscount: membershipEstimate.estimatedMembershipDiscount,
    playerHasDepositWaiver: membershipEstimate.playerHasDepositWaiver,
    clubDepositSettings: args.club,
  });

  return {
    ...membershipEstimate,
    estimatedTotal: deposit.estimatedPayableTotal,
    depositSuggestedAmount: deposit.depositAmount,
    estimatedBalanceDue: deposit.estimatedPayableTotal,
  };
}

function bookingStartTimestamp(localDate: string, startMinutes: number) {
  const hours = Math.floor(startMinutes / 60);
  const minutes = startMinutes % 60;
  return new Date(
    `${localDate}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0",
    )}:00-05:00`,
  ).getTime();
}

function extractProviderPaymentId(payload: unknown, query: Record<string, string>) {
  if (query["data.id"]) return query["data.id"];
  if (query.id && (query.type === "payment" || query.topic === "payment")) {
    return query.id;
  }

  if (payload && typeof payload === "object") {
    const data = "data" in payload ? (payload as { data?: unknown }).data : null;
    if (data && typeof data === "object" && "id" in data) {
      return String((data as { id: unknown }).id);
    }
  }

  return null;
}

function stringFromPayload(payload: unknown, key: string) {
  if (payload && typeof payload === "object" && key in payload) {
    const value = (payload as Record<string, unknown>)[key];
    return value === undefined || value === null ? undefined : String(value);
  }

  return undefined;
}

export const getOnlineDepositPreview = query({
  args: {
    clubSlug: v.string(),
    courtId: v.id("courts"),
    localDate: v.string(),
    startMinutes: v.number(),
    durationMinutes: v.number(),
    customerPhone: v.optional(v.string()),
  },
  returns: depositPreviewValidator,
  handler: async (ctx, args) => {
    const auth = await requireAuthUser(ctx);
    const club = await getClubOrThrow(ctx, args.clubSlug, {
      requirePublished: true,
    });
    const connection = await getActiveMercadoPagoConnection(ctx, club._id);
    const customer = await findCustomerForDepositPreview(
      ctx,
      club._id,
      auth.userId,
      args.customerPhone,
    );
    const baseReservationTotal = calculateBookingValue(
      args.localDate,
      args.startMinutes,
      args.durationMinutes,
      club.pricing,
    );
    const estimate = await buildDepositEstimate({
      ctx,
      club,
      customerId: customer?._id ?? null,
      localDate: args.localDate,
      startMinutes: args.startMinutes,
      baseReservationTotal,
    });
    const settings = normalizeDepositSettings(club);
    const mercadoPagoConnected =
      connection?.status === "connected" && Boolean(connection.accessToken?.trim());
    const onlineDepositsEnabled = settings.onlineDepositsEnabled && mercadoPagoConnected;

    return {
      clubId: club._id,
      onlineDepositsEnabled,
      mercadoPagoConnected,
      allowPayAtClub: settings.allowPayAtClub,
      baseReservationTotal,
      estimatedMembershipDiscount: estimate.estimatedMembershipDiscount,
      estimatedTotal: estimate.estimatedTotal,
      depositSuggestedAmount: onlineDepositsEnabled
        ? estimate.depositSuggestedAmount
        : 0,
      estimatedBalanceDue: estimate.estimatedTotal,
      playerHasDepositWaiver: estimate.playerHasDepositWaiver,
      membershipSnapshot: estimate.membershipSnapshot,
    };
  },
});

export const getClubMercadoPagoStatus = query({
  args: {},
  returns: connectionStatusValidator,
  handler: async (ctx) => {
    const { club, clubUser } = await getCurrentUserClub(ctx);
    await requireClubAccess(ctx, club._id, ["club_master", "club_staff"]);
    const connection = await getActiveMercadoPagoConnection(ctx, club._id);
    const settings = normalizeDepositSettings(club);
    const mercadoPagoConnected =
      connection?.status === "connected" && Boolean(connection.accessToken?.trim());

    return {
      clubId: club._id,
      ...settings,
      onlineDepositsEnabled: settings.onlineDepositsEnabled,
      mercadoPagoConnected,
      mercadoPagoConnectionStatus:
        connection?.status ?? club.mercadoPagoConnectionStatus ?? "disconnected",
      canManageConnection: clubUser.role === "club_master",
    };
  },
});

export const updateClubDepositSettings = mutation({
  args: {
    onlineDepositsEnabled: v.boolean(),
    depositType: depositTypeValidator,
    depositPercentage: v.number(),
    depositFixedAmount: v.optional(v.union(v.number(), v.null())),
    depositMinAmount: v.number(),
    depositMaxAmount: v.number(),
    depositRoundingAmount: v.number(),
    depositApplyAfterMembershipDiscounts: v.boolean(),
    allowPayAtClub: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { club } = await getCurrentUserClub(ctx);
    await requireClubAccess(ctx, club._id, ["club_master"]);
    const connection = await getActiveMercadoPagoConnection(ctx, club._id);

    if (args.onlineDepositsEnabled && connection?.status !== "connected") {
      throw new ConvexError({
        code: "MERCADOPAGO_NOT_CONNECTED",
        message: "Conecta Mercado Pago antes de activar anticipos online.",
      });
    }

    if (args.depositMinAmount < 0 || args.depositMaxAmount < args.depositMinAmount) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Revisa los montos minimo y maximo del anticipo.",
      });
    }

    if (args.depositRoundingAmount <= 0) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "El redondeo debe ser mayor a cero.",
      });
    }

    await ctx.db.patch(club._id, {
      onlineDepositsEnabled: args.onlineDepositsEnabled,
      depositMode: "optional",
      depositType: args.depositType,
      depositPercentage: args.depositPercentage,
      depositFixedAmount: args.depositFixedAmount ?? null,
      depositMinAmount: args.depositMinAmount,
      depositMaxAmount: args.depositMaxAmount,
      depositRoundingAmount: args.depositRoundingAmount,
      depositApplyAfterMembershipDiscounts:
        args.depositApplyAfterMembershipDiscounts,
      allowPayAtClub: args.allowPayAtClub,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const connectMercadoPagoAccessToken = mutation({
  args: {
    accessToken: v.string(),
    collectorId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { club } = await getCurrentUserClub(ctx);
    await requireClubAccess(ctx, club._id, ["club_master"]);
    const connectionInput = normalizeMercadoPagoConnectionInput(args);

    if (!connectionInput.ok) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: connectionInput.message,
      });
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("mercadoPagoConnections")
      .withIndex("by_club", (q) => q.eq("clubId", club._id))
      .unique();
    const payload = {
      status: "connected" as const,
      ...(connectionInput.collectorId
        ? { collectorId: connectionInput.collectorId }
        : {}),
      accessToken: connectionInput.accessToken,
      connectedAt: existing?.connectedAt ?? now,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
    } else {
      await ctx.db.insert("mercadoPagoConnections", {
        clubId: club._id,
        ...payload,
        createdAt: now,
      });
    }

    await ctx.db.patch(club._id, {
      mercadoPagoConnectionStatus: "connected",
      updatedAt: now,
    });

    return null;
  },
});

export const disconnectMercadoPago = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const { club } = await getCurrentUserClub(ctx);
    await requireClubAccess(ctx, club._id, ["club_master"]);
    const connection = await ctx.db
      .query("mercadoPagoConnections")
      .withIndex("by_club", (q) => q.eq("clubId", club._id))
      .unique();
    const now = Date.now();

    if (connection) {
      await ctx.db.patch(connection._id, {
        status: "disconnected",
        collectorId: undefined,
        accessToken: undefined,
        accessTokenEncrypted: undefined,
        publicKey: undefined,
        disconnectedAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.patch(club._id, {
      mercadoPagoConnectionStatus: "disconnected",
      onlineDepositsEnabled: false,
      updatedAt: now,
    });

    return null;
  },
});

export const createOnlineDepositBooking = action({
  args: onlineDepositBookingArgs,
  returns: createDepositResultValidator,
  handler: async (ctx, args): Promise<CreateDepositResult> => {
    const userId = await getAuthUserId(ctx);

    if (!userId) {
      throw new ConvexError("Debes iniciar sesion.");
    }

    const preparation: DepositPreparation = await ctx.runMutation(
      internal.payments._createOnlineDepositReservation,
      {
        ...args,
        userId: userId as Id<"users">,
      },
    );

    try {
      const preference = await createMercadoPagoDepositPreference({
        sellerAccessToken: preparation.accessToken,
        clubId: preparation.clubId,
        clubSlug: preparation.clubSlug,
        clubName: preparation.clubName,
        courtId: preparation.courtId,
        courtName: preparation.courtName,
        reservationId: preparation.bookingId,
        reservationCode: preparation.code,
        reservationPaymentId: preparation.paymentId,
        userId: preparation.userId,
        customerName: preparation.customerName,
        customerPhone: preparation.customerPhone,
        customerEmail: preparation.customerEmail,
        amount: preparation.amount,
      });
      const checkoutUrl = getMercadoPagoCheckoutUrl(preference);

      if (!checkoutUrl) {
        throw new Error("Mercado Pago no retorno una URL de pago.");
      }

      await ctx.runMutation(internal.payments._attachDepositPreference, {
        bookingId: preparation.bookingId,
        paymentId: preparation.paymentId,
        preferenceId: preference.id,
        initPoint: preference.init_point,
        sandboxInitPoint: preference.sandbox_init_point,
      });

      return {
        code: preparation.code,
        bookingId: preparation.bookingId,
        paymentId: preparation.paymentId,
        checkoutUrl,
      };
    } catch (error) {
      await ctx.runMutation(internal.payments._markDepositPreferenceFailed, {
        bookingId: preparation.bookingId,
        paymentId: preparation.paymentId,
        message:
          error instanceof Error
            ? error.message
            : "No pudimos crear el anticipo online.",
      });

      return {
        code: preparation.code,
        bookingId: preparation.bookingId,
        paymentId: preparation.paymentId,
        error: "La reserva quedo creada, pero no pudimos abrir Mercado Pago.",
      };
    }
  },
});

export const _createOnlineDepositReservation = internalMutation({
  args: {
    ...onlineDepositBookingArgs,
    userId: v.id("users"),
  },
  returns: v.object({
    clubId: v.id("clubs"),
    clubSlug: v.string(),
    clubName: v.string(),
    courtId: v.id("courts"),
    courtName: v.string(),
    bookingId: v.id("bookings"),
    code: v.string(),
    paymentId: v.id("reservationPayments"),
    userId: v.id("users"),
    customerName: v.string(),
    customerPhone: v.string(),
    customerEmail: v.optional(v.string()),
    amount: v.number(),
    accessToken: v.string(),
  }),
  handler: async (ctx, args) => {
    const club = await getClubOrThrow(ctx, args.clubSlug, {
      requirePublished: true,
      requireBookingEnabled: true,
    });
    const court = await getCourtOrThrow(ctx, args.courtId);
    await assertCanBook({ ctx, club, court, ...args });
    const { accessToken } = await getClubAccessToken(ctx, club._id);

    if (!(club.onlineDepositsEnabled ?? false)) {
      throw new ConvexError({
        code: "ONLINE_DEPOSITS_DISABLED",
        message: "Este club no tiene anticipos online activos.",
      });
    }

    const user = await ctx.db.get(args.userId);
    const now = Date.now();
    const value = calculateBookingValue(
      args.localDate,
      args.startMinutes,
      args.durationMinutes,
      club.pricing,
    );
    const code = await buildBookingCode(ctx);
    const customerEmail = args.customerEmail?.trim() || user?.email;
    const customerId = await upsertCustomer(ctx, {
      clubId: club._id,
      fullName: args.customerName,
      phone: args.customerPhone,
      email: customerEmail,
      userId: args.userId,
      source: "online",
    });
    const estimate = await buildDepositEstimate({
      ctx,
      club,
      customerId,
      localDate: args.localDate,
      startMinutes: args.startMinutes,
      baseReservationTotal: value,
    });

    if (estimate.depositSuggestedAmount <= 0) {
      throw new ConvexError({
        code: "DEPOSIT_NOT_REQUIRED",
        message: "Esta reserva no requiere anticipo.",
      });
    }

    const bookingId = await ctx.db.insert("bookings", {
      clubId: club._id,
      courtId: court._id,
      customerId,
      playerUserId: args.userId,
      createdByUserId: args.userId,
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
      paymentMethod: "club",
      paymentStatus: "pending",
      bookingStatus: "confirmed",
      value,
      basePrice: value,
      estimatedMembershipDiscount: estimate.estimatedMembershipDiscount,
      estimatedTotal: estimate.estimatedTotal,
      depositSuggestedAmount: estimate.depositSuggestedAmount,
      depositPaidAmount: 0,
      depositStatus: "pending",
      paymentOptionSelected: "deposit_online",
      estimatedBalanceDue: estimate.estimatedTotal,
      membershipSnapshot: estimate.membershipSnapshot,
      createdAt: now,
      updatedAt: now,
    });
    const paymentId = await ctx.db.insert("reservationPayments", {
      reservationId: bookingId,
      clubId: club._id,
      userId: args.userId,
      provider: "mercadopago",
      type: "deposit",
      status: "created",
      amount: estimate.depositSuggestedAmount,
      currency: "COP",
      externalReference: "",
      metadata: {
        reservationId: bookingId,
        clubId: club._id,
        userId: args.userId,
        paymentType: "deposit",
      },
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(paymentId, {
      externalReference: `deposit:${paymentId}`,
    });

    return {
      clubId: club._id,
      clubSlug: club.slug,
      clubName: club.name,
      courtId: court._id,
      courtName: court.name,
      bookingId,
      code,
      paymentId,
      userId: args.userId,
      customerName: args.customerName.trim(),
      customerPhone: args.customerPhone.trim(),
      customerEmail: customerEmail?.trim() || undefined,
      amount: estimate.depositSuggestedAmount,
      accessToken,
    };
  },
});

export const _attachDepositPreference = internalMutation({
  args: {
    bookingId: v.id("bookings"),
    paymentId: v.id("reservationPayments"),
    preferenceId: v.string(),
    initPoint: v.optional(v.string()),
    sandboxInitPoint: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.paymentId, {
      status: "pending",
      mercadoPagoPreferenceId: args.preferenceId,
      initPoint: args.initPoint,
      sandboxInitPoint: args.sandboxInitPoint,
      updatedAt: Date.now(),
    });
    await ctx.db.patch(args.bookingId, {
      depositStatus: "pending",
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const _markDepositPreferenceFailed = internalMutation({
  args: {
    bookingId: v.id("bookings"),
    paymentId: v.id("reservationPayments"),
    message: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    const estimatedTotal = booking?.estimatedTotal ?? booking?.value ?? 0;

    await ctx.db.patch(args.paymentId, {
      status: "failed",
      mercadoPagoStatusDetail: args.message,
      updatedAt: Date.now(),
    });
    await ctx.db.patch(args.bookingId, {
      depositStatus: "failed",
      depositPaidAmount: booking?.depositPaidAmount ?? 0,
      estimatedBalanceDue: estimatedTotal,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const processMercadoPagoWebhook = action({
  args: {
    query: v.any(),
    payload: v.any(),
  },
  returns: v.object({ processed: v.boolean() }),
  handler: async (ctx, args) => {
    const query = args.query as Record<string, string>;
    const providerPaymentId = extractProviderPaymentId(args.payload, query);
    const eventType = stringFromPayload(args.payload, "type") ?? query.type;
    const actionName = stringFromPayload(args.payload, "action") ?? query.action;
    const dateCreated = stringFromPayload(args.payload, "date_created");
    const eventId =
      stringFromPayload(args.payload, "id") ??
      `mercadopago:${eventType ?? "unknown"}:${actionName ?? "unknown"}:${
        providerPaymentId ?? "no-payment"
      }:${dateCreated ?? "no-date"}`;
    const event = await ctx.runMutation(
      internal.payments._recordWebhookEventStart,
      {
        eventId,
        clubId: query.clubId as Id<"clubs"> | undefined,
        mercadoPagoPaymentId: providerPaymentId ?? undefined,
        eventType,
        action: actionName,
        rawPayload: args.payload,
      },
    );

    if (!event.shouldProcess) {
      return { processed: false };
    }

    if (!providerPaymentId || !query.clubId) {
      await ctx.runMutation(internal.payments._markWebhookEventProcessed, {
        eventId,
      });
      return { processed: false };
    }

    const connection = await ctx.runQuery(
      internal.payments._getConnectionForWebhook,
      { clubId: query.clubId as Id<"clubs"> },
    );

    if (!connection) {
      throw new Error("Mercado Pago no esta conectado para este club.");
    }

    const mercadoPagoPayment = await getMercadoPagoPayment(
      connection.accessToken,
      providerPaymentId,
    );

    await ctx.runMutation(internal.payments._applyMercadoPagoDepositWebhook, {
      eventId,
      clubId: connection.clubId,
      mercadoPagoPaymentId: providerPaymentId,
      mercadoPagoPreferenceId: mercadoPagoPayment.preference_id,
      externalReference: mercadoPagoPayment.external_reference,
      status: mercadoPagoPayment.status ?? "unknown",
      statusDetail: mercadoPagoPayment.status_detail,
      amount: mercadoPagoPayment.transaction_amount,
      currency: mercadoPagoPayment.currency_id,
      paidAt: mercadoPagoPayment.date_approved
        ? Date.parse(mercadoPagoPayment.date_approved)
        : undefined,
      rawProviderResponse: mercadoPagoPayment,
    });

    return { processed: true };
  },
});

export const _getConnectionForWebhook = internalQuery({
  args: { clubId: v.id("clubs") },
  returns: v.union(
    v.null(),
    v.object({
      clubId: v.id("clubs"),
      accessToken: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const connection = await getActiveMercadoPagoConnection(ctx, args.clubId);

    if (!connection?.accessToken) return null;

    return {
      clubId: connection.clubId,
      accessToken: connection.accessToken,
    };
  },
});

export const _recordWebhookEventStart = internalMutation({
  args: {
    eventId: v.string(),
    clubId: v.optional(v.id("clubs")),
    mercadoPagoPaymentId: v.optional(v.string()),
    eventType: v.optional(v.string()),
    action: v.optional(v.string()),
    rawPayload: v.any(),
  },
  returns: v.object({
    eventId: v.string(),
    shouldProcess: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("paymentWebhookEvents")
      .withIndex("by_provider_event", (q) =>
        q.eq("provider", "mercadopago").eq("eventId", args.eventId),
      )
      .unique();

    if (existing) {
      return {
        eventId: existing.eventId,
        shouldProcess: existing.processedAt === undefined,
      };
    }

    await ctx.db.insert("paymentWebhookEvents", {
      provider: "mercadopago",
      eventId: args.eventId,
      clubId: args.clubId,
      mercadoPagoPaymentId: args.mercadoPagoPaymentId,
      eventType: args.eventType,
      action: args.action,
      rawPayload: args.rawPayload,
      createdAt: Date.now(),
    });

    return { eventId: args.eventId, shouldProcess: true };
  },
});

export const _markWebhookEventProcessed = internalMutation({
  args: { eventId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const event = await ctx.db
      .query("paymentWebhookEvents")
      .withIndex("by_provider_event", (q) =>
        q.eq("provider", "mercadopago").eq("eventId", args.eventId),
      )
      .unique();

    if (event) {
      await ctx.db.patch(event._id, {
        processedAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return null;
  },
});

export const _applyMercadoPagoDepositWebhook = internalMutation({
  args: {
    eventId: v.string(),
    clubId: v.id("clubs"),
    mercadoPagoPaymentId: v.string(),
    mercadoPagoPreferenceId: v.optional(v.string()),
    externalReference: v.optional(v.string()),
    status: v.string(),
    statusDetail: v.optional(v.string()),
    amount: v.optional(v.number()),
    currency: v.optional(v.string()),
    paidAt: v.optional(v.number()),
    rawProviderResponse: v.any(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!args.externalReference?.startsWith("deposit:")) {
      throw new Error("Mercado Pago envio una referencia invalida.");
    }

    const payment = await ctx.db
      .query("reservationPayments")
      .withIndex("by_external_reference", (q) =>
        q.eq("externalReference", args.externalReference!),
      )
      .unique();

    if (!payment || payment.clubId !== args.clubId) {
      throw new Error("No encontramos el intento de anticipo.");
    }

    const booking = await ctx.db.get(payment.reservationId);
    if (!booking) {
      throw new Error("No encontramos la reserva del anticipo.");
    }

    const webhookState = applyDepositWebhookState({
      currentDepositStatus: booking.depositStatus ?? "none",
      currentDepositPaidAmount: booking.depositPaidAmount ?? 0,
      estimatedTotal: booking.estimatedTotal ?? booking.value,
      paymentAmount: args.amount ?? payment.amount,
      providerStatus: args.status,
    });
    const now = Date.now();

    await ctx.db.patch(payment._id, {
      status: webhookState.paymentStatus,
      mercadoPagoPaymentId: args.mercadoPagoPaymentId,
      mercadoPagoPreferenceId:
        args.mercadoPagoPreferenceId ?? payment.mercadoPagoPreferenceId,
      mercadoPagoStatus: args.status,
      mercadoPagoStatusDetail: args.statusDetail,
      amount: args.amount ?? payment.amount,
      currency: args.currency ?? payment.currency,
      paidAt: webhookState.paymentStatus === "approved" ? args.paidAt ?? now : payment.paidAt,
      rawProviderResponse: args.rawProviderResponse,
      updatedAt: now,
    });

    await ctx.db.patch(booking._id, {
      depositStatus: webhookState.depositStatus,
      depositPaidAmount: webhookState.depositPaidAmount,
      estimatedBalanceDue: webhookState.estimatedBalanceDue,
      updatedAt: now,
    });
    const event = await ctx.db
      .query("paymentWebhookEvents")
      .withIndex("by_provider_event", (q) =>
        q.eq("provider", "mercadopago").eq("eventId", args.eventId),
      )
      .unique();

    if (event) {
      await ctx.db.patch(event._id, {
        reservationPaymentId: payment._id,
        processedAt: now,
        updatedAt: now,
      });
    }

    return null;
  },
});

export const markReservationPaymentSuperseded = mutation({
  args: {
    paymentId: v.id("reservationPayments"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const payment = await ctx.db.get(args.paymentId);

    if (!payment) return null;

    await requireClubAccess(ctx, payment.clubId, ["club_master", "club_staff"]);

    if (payment.status === "approved") {
      throw new ConvexError({
        code: "PAYMENT_APPROVED",
        message: "No se puede reemplazar un anticipo ya pagado.",
      });
    }

    await ctx.db.patch(args.paymentId, {
      status: "superseded",
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const listReservationPaymentsByBooking = query({
  args: {
    bookingId: v.id("bookings"),
  },
  returns: v.array(reservationPaymentValidator),
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);

    if (!booking) return [];

    await requireClubAccess(ctx, booking.clubId, ["club_master", "club_staff"]);

    return await ctx.db
      .query("reservationPayments")
      .withIndex("by_reservation", (q) => q.eq("reservationId", args.bookingId))
      .collect();
  },
});
