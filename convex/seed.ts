import { v } from "convex/values";

import { BOGOTA_TIMEZONE, calculateBookingValue } from "../lib/bookingRules";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";

const defaultOpeningHours = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
  dayOfWeek,
  isOpen: true,
  openMinutes: 6 * 60,
  closeMinutes: 23 * 60,
}));

type ClubSeed = {
  name: string;
  slug: string;
  city: string;
  state: string;
  country: string;
  address: string;
  phone: string;
  whatsapp: string;
  description: string;
  coverImageUrl: string;
  galleryImageUrls: string[];
  openingHoursText: string;
  normalPricePerHour: number;
  peakPricePerHour: number;
  weekendPricePerHour: number;
  isActive: boolean;
  isPublished: boolean;
  isFeatured: boolean;
  bookingEnabled: boolean;
  courts: {
    name: string;
    description: string;
    courtType: string;
    isCovered: boolean;
  }[];
};

const clubSeeds: ClubSeed[] = [
  {
    name: "Match Point Padel",
    slug: "match-point",
    city: "Bucaramanga",
    state: "Santander",
    country: "Colombia",
    address: "Cra 27 # 42-15, Cabecera",
    phone: "+57 318 555 0142",
    whatsapp: "+57 318 555 0142",
    description:
      "Reserva tu cancha de padel en Bucaramanga sin llamadas y en pocos pasos.",
    coverImageUrl:
      "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1400&q=80",
    galleryImageUrls: [
      "https://images.unsplash.com/photo-1600679472829-3044539ce8ed?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=900&q=80",
    ],
    openingHoursText: "Lunes a viernes: 6:00 am - 11:00 pm",
    normalPricePerHour: 60000,
    peakPricePerHour: 75000,
    weekendPricePerHour: 70000,
    isActive: true,
    isPublished: true,
    isFeatured: true,
    bookingEnabled: true,
    courts: [
      {
        name: "Cancha 1",
        description: "Cristal - Techada",
        courtType: "Cristal",
        isCovered: true,
      },
      {
        name: "Cancha 2",
        description: "Cristal - Techada",
        courtType: "Cristal",
        isCovered: true,
      },
      {
        name: "Cancha 3",
        description: "Cristal - Aire libre",
        courtType: "Cristal",
        isCovered: false,
      },
      {
        name: "Cancha 4",
        description: "Panoramica - Techada",
        courtType: "Panoramica",
        isCovered: true,
      },
    ],
  },
  {
    name: "Arena Padel Club",
    slug: "arena-padel-club",
    city: "Floridablanca",
    state: "Santander",
    country: "Colombia",
    address: "Anillo Vial, Floridablanca",
    phone: "+57 300 555 0199",
    whatsapp: "+57 300 555 0199",
    description:
      "Club de padel con canchas techadas y horarios amplios para jugar despues del trabajo.",
    coverImageUrl:
      "https://images.unsplash.com/photo-1599474924187-334a4ae5bd3c?auto=format&fit=crop&w=1400&q=80",
    galleryImageUrls: [
      "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=900&q=80",
    ],
    openingHoursText: "Todos los dias: 7:00 am - 10:00 pm",
    normalPricePerHour: 55000,
    peakPricePerHour: 70000,
    weekendPricePerHour: 65000,
    isActive: true,
    isPublished: true,
    isFeatured: false,
    bookingEnabled: true,
    courts: [
      {
        name: "Cancha 1",
        description: "Cristal - Techada",
        courtType: "Cristal",
        isCovered: true,
      },
      {
        name: "Cancha 2",
        description: "Cristal - Techada",
        courtType: "Cristal",
        isCovered: true,
      },
      {
        name: "Cancha 3",
        description: "Mixta - Aire libre",
        courtType: "Mixta",
        isCovered: false,
      },
    ],
  },
  {
    name: "Padel House Canaveral",
    slug: "padel-house-canaveral",
    city: "Floridablanca",
    state: "Santander",
    country: "Colombia",
    address: "Canaveral, Floridablanca",
    phone: "+57 301 555 0220",
    whatsapp: "+57 301 555 0220",
    description:
      "Espacio social para jugar padel en Canaveral, con canchas panoramicas y ambiente familiar.",
    coverImageUrl:
      "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=1400&q=80",
    galleryImageUrls: [],
    openingHoursText: "Lunes a domingo: 6:00 am - 10:00 pm",
    normalPricePerHour: 60000,
    peakPricePerHour: 80000,
    weekendPricePerHour: 75000,
    isActive: true,
    isPublished: true,
    isFeatured: false,
    bookingEnabled: false,
    courts: [
      {
        name: "Cancha 1",
        description: "Panoramica - Techada",
        courtType: "Panoramica",
        isCovered: true,
      },
      {
        name: "Cancha 2",
        description: "Panoramica - Techada",
        courtType: "Panoramica",
        isCovered: true,
      },
    ],
  },
];

function todayInBogota() {
  const formatter = new Intl.DateTimeFormat("en", {
    timeZone: BOGOTA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

function pricingFromSeed(seed: ClubSeed) {
  return {
    normalPricePerHour: seed.normalPricePerHour,
    peakPricePerHour: seed.peakPricePerHour,
    weekendPricePerHour: seed.weekendPricePerHour,
    peakStartMinutes: 17 * 60,
    peakEndMinutes: 21 * 60,
  };
}

async function upsertClub(ctx: MutationCtx, seed: ClubSeed) {
  const now = Date.now();
  const existingClub = await ctx.db
    .query("clubs")
    .withIndex("by_slug", (q) => q.eq("slug", seed.slug))
    .unique();

  const clubData = {
    slug: seed.slug,
    name: seed.name,
    city: seed.city,
    state: seed.state,
    country: seed.country,
    address: seed.address,
    phone: seed.phone,
    whatsapp: seed.whatsapp,
    description: seed.description,
    coverImageUrl: seed.coverImageUrl,
    galleryImageUrls: seed.galleryImageUrls,
    openingHoursText: seed.openingHoursText,
    timezone: BOGOTA_TIMEZONE,
    normalPricePerHour: seed.normalPricePerHour,
    peakPricePerHour: seed.peakPricePerHour,
    weekendPricePerHour: seed.weekendPricePerHour,
    peakStartMinutes: 17 * 60,
    peakEndMinutes: 21 * 60,
    openingHours: defaultOpeningHours,
    pricing: pricingFromSeed(seed),
    isActive: seed.isActive,
    isPublished: seed.isPublished,
    isFeatured: seed.isFeatured,
    bookingEnabled: seed.bookingEnabled,
    updatedAt: now,
  };

  const clubId = existingClub
    ? existingClub._id
    : await ctx.db.insert("clubs", { ...clubData, createdAt: now });

  if (existingClub) {
    await ctx.db.patch(existingClub._id, clubData);
  }

  return clubId;
}

async function upsertCourt(
  ctx: MutationCtx,
  clubId: Id<"clubs">,
  courtSeed: ClubSeed["courts"][number],
  sortOrder: number,
) {
  const existingCourts = await ctx.db
    .query("courts")
    .withIndex("by_club", (q) => q.eq("clubId", clubId))
    .collect();
  const existing = existingCourts.find((court) => court.name === courtSeed.name);
  const now = Date.now();

  if (existing) {
    await ctx.db.patch(existing._id, {
      ...courtSeed,
      sortOrder,
      isActive: true,
      updatedAt: now,
    });
    return existing._id;
  }

  return await ctx.db.insert("courts", {
    clubId,
    ...courtSeed,
    sortOrder,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });
}

async function createDemoBooking(
  ctx: MutationCtx,
  club: Doc<"clubs">,
  courtId: Id<"courts">,
  booking: {
    code: string;
    startMinutes: number;
    durationMinutes: number;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    paymentStatus: "pending" | "paid";
    bookingStatus: "confirmed" | "blocked";
    internalNote?: string;
  },
) {
  const existing = await ctx.db
    .query("bookings")
    .withIndex("by_code", (q) => q.eq("code", booking.code))
    .unique();

  if (existing) {
    return existing._id;
  }

  const now = Date.now();
  const localDate = todayInBogota();
  const value =
    booking.bookingStatus === "blocked"
      ? 0
      : calculateBookingValue(
          localDate,
          booking.startMinutes,
          booking.durationMinutes,
          club.pricing,
        );

  return await ctx.db.insert("bookings", {
    clubId: club._id,
    courtId,
    code: booking.code,
    localDate,
    startMinutes: booking.startMinutes,
    durationMinutes: booking.durationMinutes,
    endMinutes: booking.startMinutes + booking.durationMinutes,
    timezone: BOGOTA_TIMEZONE,
    customerName: booking.customerName,
    customerPhone: booking.customerPhone,
    customerEmail: booking.customerEmail,
    source: booking.bookingStatus === "blocked" ? "manual" : "whatsapp",
    paymentMethod: booking.paymentStatus === "paid" ? "cash" : "club",
    paymentStatus: booking.paymentStatus,
    bookingStatus: booking.bookingStatus,
    value,
    internalNote: booking.internalNote,
    createdAt: now,
    updatedAt: now,
    paidAt: booking.paymentStatus === "paid" ? now : undefined,
  });
}

async function findUserByEmail(ctx: MutationCtx, email: string) {
  return await ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", email))
    .unique();
}

async function upsertSuperAdminRole(ctx: MutationCtx, userId: Id<"users">) {
  const now = Date.now();
  const roles = await ctx.db
    .query("platformRoles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  const existing = roles.find((role) => role.role === "super_admin");

  if (existing) {
    await ctx.db.patch(existing._id, {
      status: "active",
      updatedAt: now,
    });
    return existing._id;
  }

  return await ctx.db.insert("platformRoles", {
    userId,
    role: "super_admin",
    status: "active",
    createdAt: now,
    updatedAt: now,
  });
}

async function upsertClubMaster(
  ctx: MutationCtx,
  clubId: Id<"clubs">,
  userId: Id<"users">,
) {
  const now = Date.now();
  const existing = await ctx.db
    .query("clubUsers")
    .withIndex("by_user_club", (q) =>
      q.eq("userId", userId).eq("clubId", clubId),
    )
    .unique();

  if (existing) {
    await ctx.db.patch(existing._id, {
      role: "club_master",
      status: "active",
      updatedAt: now,
    });
    return existing._id;
  }

  return await ctx.db.insert("clubUsers", {
    clubId,
    userId,
    role: "club_master",
    status: "active",
    createdAt: now,
    updatedAt: now,
  });
}

async function seedAccessForExistingUsers(
  ctx: MutationCtx,
  matchPointClubId: Id<"clubs">,
) {
  const [superAdmin, clubMaster] = await Promise.all([
    findUserByEmail(ctx, "admin@canchabga.co"),
    findUserByEmail(ctx, "recepcion@matchpointpadel.co"),
  ]);
  const assigned = {
    superAdmin: false,
    clubMaster: false,
  };

  if (superAdmin) {
    await upsertSuperAdminRole(ctx, superAdmin._id);
    assigned.superAdmin = true;
  }

  if (clubMaster) {
    await upsertClubMaster(ctx, matchPointClubId, clubMaster._id);
    assigned.clubMaster = true;
  }

  return assigned;
}

export const seedDemoData = mutation({
  args: {},
  returns: v.object({
    clubId: v.id("clubs"),
    courtIds: v.array(v.id("courts")),
  }),
  handler: async (ctx) => {
    let matchPointClubId: Id<"clubs"> | null = null;
    let matchPointCourtIds: Id<"courts">[] = [];

    for (const seed of clubSeeds) {
      const clubId = await upsertClub(ctx, seed);
      const courtIds = [];

      for (const [index, courtSeed] of seed.courts.entries()) {
        courtIds.push(await upsertCourt(ctx, clubId, courtSeed, index + 1));
      }

      if (seed.slug === "match-point") {
        matchPointClubId = clubId;
        matchPointCourtIds = courtIds;
      }
    }

    const club = (await ctx.db.get(matchPointClubId!))!;

    await createDemoBooking(ctx, club, matchPointCourtIds[0], {
      code: "RES-1024",
      startMinutes: 17 * 60,
      durationMinutes: 60,
      customerName: "Andres Cardenas",
      customerPhone: "300 111 2222",
      customerEmail: "andres@email.com",
      paymentStatus: "pending",
      bookingStatus: "confirmed",
      internalNote: "Reserva recibida por WhatsApp",
    });
    await createDemoBooking(ctx, club, matchPointCourtIds[1], {
      code: "RES-1025",
      startMinutes: 17 * 60,
      durationMinutes: 60,
      customerName: "Valentina Ruiz",
      customerPhone: "300 222 3333",
      paymentStatus: "paid",
      bookingStatus: "confirmed",
    });
    await createDemoBooking(ctx, club, matchPointCourtIds[0], {
      code: "RES-1026",
      startMinutes: 18 * 60,
      durationMinutes: 60,
      customerName: "Carlos Arenas",
      customerPhone: "300 333 4444",
      paymentStatus: "paid",
      bookingStatus: "confirmed",
    });
    await createDemoBooking(ctx, club, matchPointCourtIds[2], {
      code: "RES-1027",
      startMinutes: 19 * 60,
      durationMinutes: 120,
      customerName: "Laura Castano",
      customerPhone: "300 444 5555",
      paymentStatus: "paid",
      bookingStatus: "confirmed",
      internalNote: "Cliente frecuente",
    });
    await createDemoBooking(ctx, club, matchPointCourtIds[3], {
      code: "RES-1028",
      startMinutes: 19 * 60,
      durationMinutes: 60,
      customerName: "Felipe Torres",
      customerPhone: "300 555 6666",
      paymentStatus: "pending",
      bookingStatus: "confirmed",
    });
    await createDemoBooking(ctx, club, matchPointCourtIds[3], {
      code: "BLK-1001",
      startMinutes: 20 * 60,
      durationMinutes: 60,
      paymentStatus: "pending",
      bookingStatus: "blocked",
      internalNote: "Torneo",
    });

    await seedAccessForExistingUsers(ctx, matchPointClubId!);

    return { clubId: matchPointClubId!, courtIds: matchPointCourtIds };
  },
});

export const seedDemoAccess = mutation({
  args: {},
  returns: v.object({
    superAdmin: v.boolean(),
    clubMaster: v.boolean(),
  }),
  handler: async (ctx) => {
    const matchPoint = await ctx.db
      .query("clubs")
      .withIndex("by_slug", (q) => q.eq("slug", "match-point"))
      .unique();

    if (!matchPoint) {
      throw new Error("Run seedDemoData before seedDemoAccess.");
    }

    return await seedAccessForExistingUsers(ctx, matchPoint._id);
  },
});
