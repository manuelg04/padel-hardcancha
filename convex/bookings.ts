import { ConvexError, v } from "convex/values";

import {
  assertValidBookingWindow,
  bookingOverlaps,
  BOGOTA_TIMEZONE,
  calculateBookingValue,
  getLocalDayOfWeek,
  isActiveBookingStatus,
  isSlotAvailableForDuration,
  SLOT_MINUTES,
} from "../lib/bookingRules";
import { buildCustomerUpsert, normalizeCustomerPhone } from "../lib/customerRecords";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import {
  getCurrentUserClub,
  requireAuthUser,
  requireClubAccess,
} from "./access";
import {
  bookingValidator,
  clubValidator,
  courtValidator,
  paymentMethodValidator,
  paymentStatusValidator,
  sourceValidator,
} from "./validators";

const slotValidator = v.object({
  courtId: v.id("courts"),
  courtName: v.string(),
  courtDescription: v.string(),
  isCovered: v.boolean(),
  startMinutes: v.number(),
  endMinutes: v.number(),
  durationMinutes: v.number(),
  value: v.number(),
  isAvailable: v.boolean(),
  bookingId: v.optional(v.id("bookings")),
  bookingStatus: v.optional(v.union(v.literal("confirmed"), v.literal("blocked"))),
  paymentStatus: v.optional(v.union(v.literal("pending"), v.literal("paid"))),
  customerName: v.optional(v.string()),
});

const agendaValidator = v.object({
  club: clubValidator,
  courts: v.array(courtValidator),
  bookings: v.array(bookingValidator),
  openMinutes: v.number(),
  closeMinutes: v.number(),
  isOpen: v.boolean(),
  metrics: v.object({
    reservationsToday: v.number(),
    pending: v.number(),
    occupancy: v.number(),
    occupiedSlots: v.number(),
    totalSlots: v.number(),
    expectedRevenue: v.number(),
    blocks: v.number(),
  }),
});

const playerBookingValidator = v.object({
  booking: bookingValidator,
  courtName: v.string(),
  clubName: v.string(),
});

type Ctx = QueryCtx | MutationCtx;
type AvailabilitySlot = {
  courtId: Id<"courts">;
  courtName: string;
  courtDescription: string;
  isCovered: boolean;
  startMinutes: number;
  endMinutes: number;
  durationMinutes: number;
  value: number;
  isAvailable: boolean;
  bookingId?: Id<"bookings">;
  bookingStatus?: "confirmed" | "blocked";
  paymentStatus?: "pending" | "paid";
  customerName?: string;
};

async function getClubOrThrow(
  ctx: Ctx,
  slug: string,
  options?: { requirePublished?: boolean; requireBookingEnabled?: boolean },
) {
  const club = await ctx.db
    .query("clubs")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique();

  if (!club || !club.isActive) {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "No encontramos el club.",
    });
  }

  if (options?.requirePublished && !club.isPublished) {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "No encontramos el club.",
    });
  }

  if (options?.requireBookingEnabled && !club.bookingEnabled) {
    throw new ConvexError({
      code: "BOOKING_DISABLED",
      message: "Las reservas no estan disponibles para este club.",
    });
  }

  return club;
}

async function getCourtOrThrow(ctx: Ctx, courtId: Id<"courts">) {
  const court = await ctx.db.get(courtId);

  if (!court || !court.isActive) {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "No encontramos la cancha.",
    });
  }

  return court;
}

function getOpeningWindow(club: Doc<"clubs">, localDate: string) {
  const day = getLocalDayOfWeek(localDate);
  const hours = club.openingHours.find((entry) => entry.dayOfWeek === day);

  if (!hours || !hours.isOpen) {
    return { isOpen: false, openMinutes: 0, closeMinutes: 0 };
  }

  return {
    isOpen: true,
    openMinutes: hours.openMinutes,
    closeMinutes: hours.closeMinutes,
  };
}

async function getActiveCourts(ctx: Ctx, clubId: Id<"clubs">) {
  const courts = await ctx.db
    .query("courts")
    .withIndex("by_club", (q) => q.eq("clubId", clubId))
    .collect();

  return courts
    .filter((court) => court.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

async function listBookingsForCourtDate(
  ctx: Ctx,
  courtId: Id<"courts">,
  localDate: string,
) {
  return await ctx.db
    .query("bookings")
    .withIndex("by_court_date", (q) =>
      q.eq("courtId", courtId).eq("localDate", localDate),
    )
    .collect();
}

async function listBookingsForClubDate(
  ctx: Ctx,
  clubId: Id<"clubs">,
  localDate: string,
) {
  return await ctx.db
    .query("bookings")
    .withIndex("by_club_date", (q) =>
      q.eq("clubId", clubId).eq("localDate", localDate),
    )
    .collect();
}

function findOverlappingBooking(
  bookings: Doc<"bookings">[],
  startMinutes: number,
  endMinutes: number,
) {
  return bookings.find(
    (booking) =>
      isActiveBookingStatus(booking.bookingStatus) &&
      bookingOverlaps(booking, startMinutes, endMinutes),
  );
}

async function assertCanBook(args: {
  ctx: MutationCtx;
  club: Doc<"clubs">;
  court: Doc<"courts">;
  localDate: string;
  startMinutes: number;
  durationMinutes: number;
}) {
  if (args.court.clubId !== args.club._id) {
    throw new ConvexError({
      code: "INVALID_COURT",
      message: "La cancha no pertenece a este club.",
    });
  }

  const openingWindow = getOpeningWindow(args.club, args.localDate);

  if (
    !openingWindow.isOpen ||
    !assertValidBookingWindow(
      args.startMinutes,
      args.durationMinutes,
      openingWindow.openMinutes,
      openingWindow.closeMinutes,
    )
  ) {
    throw new ConvexError({
      code: "INVALID_TIME",
      message: "Este horario no está dentro del horario del club.",
    });
  }

  const endMinutes = args.startMinutes + args.durationMinutes;
  const existing = await listBookingsForCourtDate(
    args.ctx,
    args.court._id,
    args.localDate,
  );

  if (findOverlappingBooking(existing, args.startMinutes, endMinutes)) {
    throw new ConvexError({
      code: "SLOT_TAKEN",
      message: "Este horario ya no está disponible. Elige otro horario.",
    });
  }
}

async function buildBookingCode(ctx: MutationCtx, now: number) {
  const base = now % 100000;

  for (let offset = 0; offset < 100; offset += 1) {
    const candidate = `RES-${String(base + offset).padStart(5, "0")}`;
    const existing = await ctx.db
      .query("bookings")
      .withIndex("by_code", (q) => q.eq("code", candidate))
      .unique();

    if (!existing) {
      return candidate;
    }
  }

  throw new ConvexError({
    code: "CODE_COLLISION",
    message: "No pudimos generar el código de reserva. Intenta de nuevo.",
  });
}

async function upsertCustomer(
  ctx: MutationCtx,
  args: {
    clubId: Id<"clubs">;
    fullName: string;
    phone: string;
    email?: string;
    userId?: Id<"users">;
    source: "online" | "manual" | "whatsapp" | "walk_in" | "phone";
  },
) {
  const normalizedPhone = normalizeCustomerPhone(args.phone);

  if (!args.fullName.trim() || normalizedPhone.length < 7) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: "Completa nombre y celular del cliente.",
    });
  }

  const existing = await ctx.db
    .query("customers")
    .withIndex("by_club_phone", (q) =>
      q.eq("clubId", args.clubId).eq("phone", normalizedPhone),
    )
    .unique();
  const customer = buildCustomerUpsert<Id<"users">>({
    existing,
    input: {
      fullName: args.fullName,
      phone: normalizedPhone,
      email: args.email,
      userId: args.userId,
      source: args.source,
    },
    now: Date.now(),
  });

  if (existing) {
    await ctx.db.patch(existing._id, customer);
    return existing._id;
  }

  return await ctx.db.insert("customers", {
    clubId: args.clubId,
    ...customer,
  });
}

export const getAvailability = query({
  args: {
    clubSlug: v.string(),
    localDate: v.string(),
    durationMinutes: v.number(),
  },
  returns: v.object({
    courts: v.array(courtValidator),
    slots: v.array(slotValidator),
    openMinutes: v.number(),
    closeMinutes: v.number(),
    isOpen: v.boolean(),
  }),
  handler: async (ctx, args) => {
    await requireAuthUser(ctx);
    const club = await getClubOrThrow(ctx, args.clubSlug, {
      requirePublished: true,
    });
    const courts = await getActiveCourts(ctx, club._id);
    const bookings = await listBookingsForClubDate(ctx, club._id, args.localDate);
    const openingWindow = getOpeningWindow(club, args.localDate);
    const slots: AvailabilitySlot[] = [];

    if (!openingWindow.isOpen) {
      return { courts, slots, ...openingWindow };
    }

    for (const court of courts) {
      const courtBookings = bookings.filter((booking) => booking.courtId === court._id);

      for (
        let startMinutes = openingWindow.openMinutes;
        startMinutes + args.durationMinutes <= openingWindow.closeMinutes;
        startMinutes += SLOT_MINUTES
      ) {
        const endMinutes = startMinutes + args.durationMinutes;
        const overlappingBooking = findOverlappingBooking(
          courtBookings,
          startMinutes,
          endMinutes,
        );

        slots.push({
          courtId: court._id,
          courtName: court.name,
          courtDescription: court.description,
          isCovered: court.isCovered,
          startMinutes,
          endMinutes,
          durationMinutes: args.durationMinutes,
          value: calculateBookingValue(
            args.localDate,
            startMinutes,
            args.durationMinutes,
            club.pricing,
          ),
          isAvailable:
            !overlappingBooking &&
            isSlotAvailableForDuration(
              startMinutes,
              args.durationMinutes,
              courtBookings,
            ),
          bookingId: overlappingBooking?._id,
          bookingStatus:
            overlappingBooking?.bookingStatus === "cancelled"
              ? undefined
              : overlappingBooking?.bookingStatus,
          paymentStatus: overlappingBooking?.paymentStatus,
          customerName: overlappingBooking?.customerName,
        });
      }
    }

    return { courts, slots, ...openingWindow };
  },
});

export const createOnlineBooking = mutation({
  args: {
    clubSlug: v.string(),
    courtId: v.id("courts"),
    localDate: v.string(),
    startMinutes: v.number(),
    durationMinutes: v.number(),
    customerName: v.string(),
    customerPhone: v.string(),
    customerEmail: v.optional(v.string()),
    paymentMethod: v.union(v.literal("club"), v.literal("transfer")),
  },
  returns: v.object({ code: v.string(), bookingId: v.id("bookings") }),
  handler: async (ctx, args) => {
    const auth = await requireAuthUser(ctx);
    const club = await getClubOrThrow(ctx, args.clubSlug, {
      requirePublished: true,
      requireBookingEnabled: true,
    });
    const court = await getCourtOrThrow(ctx, args.courtId);
    await assertCanBook({ ctx, club, court, ...args });

    const now = Date.now();
    const value = calculateBookingValue(
      args.localDate,
      args.startMinutes,
      args.durationMinutes,
      club.pricing,
    );
    const code = await buildBookingCode(ctx, now);
    const customerEmail = args.customerEmail?.trim() || auth.user.email;
    const customerId = await upsertCustomer(ctx, {
      clubId: club._id,
      fullName: args.customerName,
      phone: args.customerPhone,
      email: customerEmail,
      userId: auth.userId,
      source: "online",
    });

    const bookingId = await ctx.db.insert("bookings", {
      clubId: club._id,
      courtId: court._id,
      customerId,
      playerUserId: auth.userId,
      createdByUserId: auth.userId,
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
      paymentMethod: args.paymentMethod,
      paymentStatus: "pending",
      bookingStatus: "confirmed",
      value,
      createdAt: now,
      updatedAt: now,
    });

    return { code, bookingId };
  },
});

export const createManualBooking = mutation({
  args: {
    courtId: v.id("courts"),
    localDate: v.string(),
    startMinutes: v.number(),
    durationMinutes: v.number(),
    customerName: v.string(),
    customerPhone: v.string(),
    customerEmail: v.optional(v.string()),
    source: sourceValidator,
    paymentMethod: paymentMethodValidator,
    paymentStatus: paymentStatusValidator,
    internalNote: v.optional(v.string()),
  },
  returns: v.object({ code: v.string(), bookingId: v.id("bookings") }),
  handler: async (ctx, args) => {
    if (args.source === "online") {
      throw new ConvexError({
        code: "INVALID_SOURCE",
        message: "Las reservas manuales no pueden tener origen online.",
      });
    }

    const { club } = await getCurrentUserClub(ctx);
    const access = await requireClubAccess(ctx, club._id, [
      "club_master",
      "club_staff",
    ]);
    const court = await getCourtOrThrow(ctx, args.courtId);
    await assertCanBook({ ctx, club, court, ...args });

    const now = Date.now();
    const value = calculateBookingValue(
      args.localDate,
      args.startMinutes,
      args.durationMinutes,
      club.pricing,
    );
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
      createdByUserId: access.userId,
      createdByRole: access.clubUser.role,
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
      paymentMethod: args.paymentMethod,
      paymentStatus: args.paymentStatus,
      bookingStatus: "confirmed",
      value,
      internalNote: args.internalNote?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
      paidAt: args.paymentStatus === "paid" ? now : undefined,
    });

    return { code, bookingId };
  },
});

export const listAgendaByDate = query({
  args: {
    localDate: v.string(),
  },
  returns: agendaValidator,
  handler: async (ctx, args) => {
    const { club } = await getCurrentUserClub(ctx);
    await requireClubAccess(ctx, club._id, ["club_master", "club_staff"]);
    const courts = await getActiveCourts(ctx, club._id);
    const bookings = (
      await listBookingsForClubDate(ctx, club._id, args.localDate)
    ).filter((booking) => booking.bookingStatus !== "cancelled");
    const openingWindow = getOpeningWindow(club, args.localDate);
    const visibleBookings = bookings.sort((a, b) => {
      if (a.startMinutes !== b.startMinutes) {
        return a.startMinutes - b.startMinutes;
      }

      return a.code.localeCompare(b.code);
    });

    const slotsPerCourt = openingWindow.isOpen
      ? Math.max(0, (openingWindow.closeMinutes - openingWindow.openMinutes) / 60)
      : 0;
    const totalSlots = courts.length * slotsPerCourt;
    const occupiedSlots = visibleBookings.reduce(
      (total, booking) => total + booking.durationMinutes / 60,
      0,
    );
    const revenueBookings = visibleBookings.filter(
      (booking) => booking.bookingStatus !== "blocked",
    );

    return {
      club,
      courts,
      bookings: visibleBookings,
      ...openingWindow,
      metrics: {
        reservationsToday: revenueBookings.length,
        pending: revenueBookings.filter(
          (booking) => booking.paymentStatus === "pending",
        ).length,
        occupancy:
          totalSlots > 0 ? Math.round((occupiedSlots / totalSlots) * 100) : 0,
        occupiedSlots,
        totalSlots,
        expectedRevenue: revenueBookings.reduce(
          (total, booking) => total + booking.value,
          0,
        ),
        blocks: visibleBookings.filter(
          (booking) => booking.bookingStatus === "blocked",
        ).length,
      },
    };
  },
});

export const getBookingByCode = query({
  args: { code: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      booking: bookingValidator,
      court: courtValidator,
      clubName: v.string(),
      clubWhatsapp: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const booking = await ctx.db
      .query("bookings")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .unique();

    if (!booking) {
      return null;
    }

    const [court, club] = await Promise.all([
      ctx.db.get(booking.courtId),
      ctx.db.get(booking.clubId),
    ]);

    if (!court || !club) {
      return null;
    }

    return {
      booking,
      court,
      clubName: club.name,
      clubWhatsapp: club.whatsapp,
    };
  },
});

export const listMyBookings = query({
  args: {},
  returns: v.array(playerBookingValidator),
  handler: async (ctx) => {
    const auth = await requireAuthUser(ctx);
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_player_user", (q) => q.eq("playerUserId", auth.userId))
      .collect();
    const result = [];

    for (const booking of bookings) {
      const [court, club] = await Promise.all([
        ctx.db.get(booking.courtId),
        ctx.db.get(booking.clubId),
      ]);

      if (court && club) {
        result.push({
          booking,
          courtName: court.name,
          clubName: club.name,
        });
      }
    }

    return result.sort((a, b) => b.booking.createdAt - a.booking.createdAt);
  },
});

export const getMyBookingByCode = query({
  args: { code: v.string() },
  returns: v.union(playerBookingValidator, v.null()),
  handler: async (ctx, args) => {
    const auth = await requireAuthUser(ctx);
    const booking = await ctx.db
      .query("bookings")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .unique();

    if (!booking || booking.playerUserId !== auth.userId) {
      return null;
    }

    const [court, club] = await Promise.all([
      ctx.db.get(booking.courtId),
      ctx.db.get(booking.clubId),
    ]);

    if (!court || !club) {
      return null;
    }

    return {
      booking,
      courtName: court.name,
      clubName: club.name,
    };
  },
});

export const markBookingPaid = mutation({
  args: { bookingId: v.id("bookings") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);

    if (!booking) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "No encontramos la reserva.",
      });
    }

    await requireClubAccess(ctx, booking.clubId, ["club_master", "club_staff"]);

    if (booking.paymentStatus === "paid") {
      return null;
    }

    await ctx.db.patch(args.bookingId, {
      paymentStatus: "paid",
      paidAt: Date.now(),
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const cancelBooking = mutation({
  args: {
    bookingId: v.id("bookings"),
    cancelReason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);

    if (!booking) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "No encontramos la reserva.",
      });
    }

    await requireClubAccess(ctx, booking.clubId, ["club_master", "club_staff"]);

    if (booking.bookingStatus === "cancelled") {
      return null;
    }

    await ctx.db.patch(args.bookingId, {
      bookingStatus: "cancelled",
      cancelledAt: Date.now(),
      cancelReason: args.cancelReason?.trim() || undefined,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const updateBookingNote = mutation({
  args: {
    bookingId: v.id("bookings"),
    internalNote: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);

    if (!booking) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "No encontramos la reserva.",
      });
    }

    await requireClubAccess(ctx, booking.clubId, ["club_master", "club_staff"]);

    await ctx.db.patch(args.bookingId, {
      internalNote: args.internalNote.trim() || undefined,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const createBlock = mutation({
  args: {
    courtId: v.id("courts"),
    localDate: v.string(),
    startMinutes: v.number(),
    durationMinutes: v.number(),
    internalNote: v.string(),
  },
  returns: v.object({ code: v.string(), bookingId: v.id("bookings") }),
  handler: async (ctx, args) => {
    const { club } = await getCurrentUserClub(ctx);
    const access = await requireClubAccess(ctx, club._id, [
      "club_master",
      "club_staff",
    ]);
    const court = await getCourtOrThrow(ctx, args.courtId);
    await assertCanBook({ ctx, club, court, ...args });

    const now = Date.now();
    const code = `BLK-${String(now % 100000).padStart(5, "0")}`;

    const bookingId = await ctx.db.insert("bookings", {
      clubId: club._id,
      courtId: court._id,
      createdByUserId: access.userId,
      createdByRole: access.clubUser.role,
      code,
      localDate: args.localDate,
      startMinutes: args.startMinutes,
      durationMinutes: args.durationMinutes,
      endMinutes: args.startMinutes + args.durationMinutes,
      timezone: BOGOTA_TIMEZONE,
      source: "manual",
      paymentMethod: "other",
      paymentStatus: "pending",
      bookingStatus: "blocked",
      value: 0,
      internalNote: args.internalNote.trim(),
      createdAt: now,
      updatedAt: now,
    });

    return { code, bookingId };
  },
});

export const cancelBlock = mutation({
  args: { bookingId: v.id("bookings") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);

    if (!booking || booking.bookingStatus !== "blocked") {
      throw new ConvexError({
        code: "NOT_BLOCK",
        message: "No encontramos el bloqueo.",
      });
    }

    await requireClubAccess(ctx, booking.clubId, ["club_master", "club_staff"]);

    await ctx.db.patch(args.bookingId, {
      bookingStatus: "cancelled",
      cancelledAt: Date.now(),
      updatedAt: Date.now(),
    });
    return null;
  },
});
