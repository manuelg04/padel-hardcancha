import { ConvexError, v } from "convex/values";

import {
  buildPackagePurchaseRecord,
  buildProfessorRecord,
  calculateAcademyRevenue,
  getPackageUnavailableReason,
  getRemainingClasses,
  nextPackageStatus,
  shouldConsumePackage,
  shouldRestorePackage,
  statusAfterConfirmation,
  validatePackagePlanInput,
  validatePackageSaleInput,
  validateProfessorInput,
  validateSessionInput,
} from "../lib/academyRules";
import { normalizeCustomerPhone } from "../lib/customerRecords";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { getAuthUser, isSuperAdmin, requireClubAccess } from "./access";
import {
  academyAttendancePaymentStatusValidator,
  academyAttendanceStatusValidator,
  academyClassAttendanceValidator,
  academyClassSessionValidator,
  academyClassTypeValidator,
  academyPackagePlanValidator,
  academyPackagePurchaseValidator,
  academyPackageStatusValidator,
  academyProfessorStatusValidator,
  academyProfessorValidator,
  customerValidator,
} from "./validators";

type Ctx = QueryCtx | MutationCtx;

const maxRangeDays = 92;
const localDatePattern = /^\d{4}-\d{2}-\d{2}$/;

const attendanceWithDetailsValidator = v.object({
  attendance: academyClassAttendanceValidator,
  customer: customerValidator,
  packagePurchase: v.union(academyPackagePurchaseValidator, v.null()),
});

const sessionWithDetailsValidator = v.object({
  session: academyClassSessionValidator,
  professor: academyProfessorValidator,
  attendances: v.array(attendanceWithDetailsValidator),
});

const packagePurchaseWithCustomerValidator = v.object({
  packagePurchase: academyPackagePurchaseValidator,
  customer: customerValidator,
  plan: v.union(academyPackagePlanValidator, v.null()),
  remainingClasses: v.number(),
});

const professorReportValidator = v.object({
  professorId: v.id("academyProfessors"),
  professorName: v.string(),
  sessions: v.number(),
  studentsServed: v.number(),
  singleClassStudents: v.number(),
  packageStudents: v.number(),
  pendingValidations: v.number(),
});

const revenueReportValidator = v.object({
  packageSalesRevenue: v.number(),
  singleClassRevenue: v.number(),
  packageClassesConsumed: v.number(),
  totalReceived: v.number(),
});

const reportsValidator = v.object({
  dailyClasses: v.array(sessionWithDetailsValidator),
  professorReport: v.array(professorReportValidator),
  revenue: revenueReportValidator,
  packages: v.array(packagePurchaseWithCustomerValidator),
  pendingValidations: v.array(sessionWithDetailsValidator),
});

async function requireAcademyAccess(ctx: Ctx, clubId: Id<"clubs">) {
  const auth = await getAuthUser(ctx);

  if (!auth) {
    throw new ConvexError("Debes iniciar sesion.");
  }

  if (await isSuperAdmin(ctx, auth.userId)) {
    return { ...auth, isSuperAdmin: true };
  }

  const access = await requireClubAccess(ctx, clubId, [
    "club_master",
    "club_staff",
  ]);

  return { ...access, isSuperAdmin: false };
}

async function getClubOrThrow(ctx: Ctx, clubId: Id<"clubs">) {
  const club = await ctx.db.get(clubId);

  if (!club) {
    throw new ConvexError("No encontramos el club.");
  }

  return club;
}

async function getCustomerOrThrow(ctx: Ctx, customerId: Id<"customers">) {
  const customer = await ctx.db.get(customerId);

  if (!customer) {
    throw new ConvexError("No encontramos el cliente.");
  }

  return customer;
}

async function getProfessorOrThrow(
  ctx: Ctx,
  professorId: Id<"academyProfessors">,
) {
  const professor = await ctx.db.get(professorId);

  if (!professor) {
    throw new ConvexError("No encontramos el profesor.");
  }

  return professor;
}

async function getSessionOrThrow(
  ctx: Ctx,
  sessionId: Id<"academyClassSessions">,
) {
  const session = await ctx.db.get(sessionId);

  if (!session) {
    throw new ConvexError("No encontramos la clase.");
  }

  return session;
}

async function getAttendanceOrThrow(
  ctx: Ctx,
  attendanceId: Id<"academyClassAttendances">,
) {
  const attendance = await ctx.db.get(attendanceId);

  if (!attendance) {
    throw new ConvexError("No encontramos la asistencia.");
  }

  return attendance;
}

function throwValidationErrors(errors: string[]) {
  if (errors.length > 0) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: errors.join(" "),
    });
  }
}

function parseLocalDate(localDate: string) {
  if (!localDatePattern.test(localDate)) {
    throw new ConvexError("La fecha debe estar en formato YYYY-MM-DD.");
  }

  const [year, month, day] = localDate.split("-").map(Number);
  const timestamp = Date.UTC(year, month - 1, day);

  if (!Number.isFinite(timestamp)) {
    throw new ConvexError("La fecha no es valida.");
  }

  return timestamp;
}

function rangeDays(startDate: string, endDate: string) {
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);

  if (start > end) {
    throw new ConvexError("La fecha inicial no puede ser posterior a la final.");
  }

  const days = Math.floor((end - start) / 86400000) + 1;

  if (days > maxRangeDays) {
    throw new ConvexError("El rango maximo permitido es de 92 dias.");
  }

  return days;
}

function addDays(localDate: string, days: number) {
  const [year, month, day] = localDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function timestampAtBogotaEnd(localDate: string) {
  return new Date(`${localDate}T23:59:59-05:00`).getTime();
}

async function listSessionsForRange(
  ctx: QueryCtx,
  clubId: Id<"clubs">,
  startDate: string,
  days: number,
) {
  const sessions: Doc<"academyClassSessions">[] = [];

  for (let offset = 0; offset < days; offset += 1) {
    const localDate = addDays(startDate, offset);
    const daySessions = await ctx.db
      .query("academyClassSessions")
      .withIndex("by_club_date", (q) =>
        q.eq("clubId", clubId).eq("localDate", localDate),
      )
      .collect();

    sessions.push(...daySessions);
  }

  return sessions;
}

async function buildAttendanceDetails(
  ctx: Ctx,
  attendance: Doc<"academyClassAttendances">,
) {
  const [customer, packagePurchase] = await Promise.all([
    ctx.db.get(attendance.customerId),
    attendance.packagePurchaseId
      ? ctx.db.get(attendance.packagePurchaseId)
      : Promise.resolve(null),
  ]);

  if (!customer) {
    return null;
  }

  return { attendance, customer, packagePurchase };
}

async function buildSessionDetails(
  ctx: Ctx,
  session: Doc<"academyClassSessions">,
) {
  const professor = await ctx.db.get(session.professorId);

  if (!professor) {
    return null;
  }

  const attendances = await ctx.db
    .query("academyClassAttendances")
    .withIndex("by_club_session", (q) =>
      q.eq("clubId", session.clubId).eq("classSessionId", session._id),
    )
    .collect();
  const details = await Promise.all(
    attendances.map((attendance) => buildAttendanceDetails(ctx, attendance)),
  );

  return {
    session,
    professor,
    attendances: details.filter(
      (detail): detail is NonNullable<typeof detail> => detail !== null,
    ),
  };
}

async function maybeMarkSessionCompleted(
  ctx: MutationCtx,
  sessionId: Id<"academyClassSessions">,
  now: number,
  updatedByUserId: Id<"users">,
) {
  const session = await ctx.db.get(sessionId);

  if (!session || session.status === "cancelled") {
    return;
  }

  const attendances = await ctx.db
    .query("academyClassAttendances")
    .withIndex("by_club_session", (q) =>
      q.eq("clubId", session.clubId).eq("classSessionId", sessionId),
    )
    .collect();

  if (
    attendances.length > 0 &&
    attendances.every((attendance) =>
      attendance.status === "completed" || attendance.status === "cancelled",
    )
  ) {
    await ctx.db.patch(sessionId, {
      status: "completed",
      updatedByUserId,
      updatedAt: now,
    });
  }
}

async function completeAttendanceIfReady(
  ctx: MutationCtx,
  attendance: Doc<"academyClassAttendances">,
  now: number,
  updatedByUserId: Id<"users">,
) {
  const nextStatus = statusAfterConfirmation(attendance);

  if (nextStatus !== "completed") {
    await ctx.db.patch(attendance._id, {
      status: nextStatus,
      updatedByUserId,
      updatedAt: now,
    });
    return;
  }

  if (shouldConsumePackage(attendance)) {
    if (!attendance.packagePurchaseId) {
      throw new ConvexError("Selecciona un paquete para esta asistencia.");
    }

    const packagePurchase = await ctx.db.get(attendance.packagePurchaseId);

    if (!packagePurchase) {
      throw new ConvexError("No encontramos el paquete.");
    }

    const reason = getPackageUnavailableReason(
      packagePurchase,
      attendance,
      now,
    );

    if (reason) {
      throw new ConvexError({
        code: reason,
        message: "Este paquete no esta disponible para consumir.",
      });
    }

    const usedClasses = packagePurchase.usedClasses + 1;
    await ctx.db.patch(packagePurchase._id, {
      usedClasses,
      status: nextPackageStatus({ ...packagePurchase, usedClasses }),
      updatedByUserId,
      updatedAt: now,
    });
    await ctx.db.patch(attendance._id, {
      status: "completed",
      packageConsumedAt: now,
      updatedByUserId,
      updatedAt: now,
    });
  } else {
    await ctx.db.patch(attendance._id, {
      status: "completed",
      updatedByUserId,
      updatedAt: now,
    });
  }

  await maybeMarkSessionCompleted(ctx, attendance.classSessionId, now, updatedByUserId);
}

export const listProfessors = query({
  args: {
    clubId: v.id("clubs"),
    includeInactive: v.optional(v.boolean()),
  },
  returns: v.array(academyProfessorValidator),
  handler: async (ctx, args) => {
    await requireAcademyAccess(ctx, args.clubId);
    await getClubOrThrow(ctx, args.clubId);

    const professors = await ctx.db
      .query("academyProfessors")
      .withIndex("by_club", (q) => q.eq("clubId", args.clubId))
      .collect();

    return professors
      .filter((professor) => args.includeInactive || professor.status === "active")
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const createProfessor = mutation({
  args: {
    clubId: v.id("clubs"),
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    userId: v.optional(v.id("users")),
  },
  returns: v.id("academyProfessors"),
  handler: async (ctx, args) => {
    await requireAcademyAccess(ctx, args.clubId);
    await getClubOrThrow(ctx, args.clubId);
    throwValidationErrors(validateProfessorInput(args));

    return await ctx.db.insert(
      "academyProfessors",
      buildProfessorRecord({
        clubId: args.clubId,
        name: args.name,
        email: args.email,
        phone: args.phone,
        userId: args.userId,
        now: Date.now(),
      }),
    );
  },
});

export const updateProfessor = mutation({
  args: {
    professorId: v.id("academyProfessors"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    status: v.optional(academyProfessorStatusValidator),
    userId: v.optional(v.id("users")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const professor = await getProfessorOrThrow(ctx, args.professorId);
    await requireAcademyAccess(ctx, professor.clubId);
    const next = {
      name: args.name ?? professor.name,
      email: args.email !== undefined ? args.email : professor.email,
      phone: args.phone !== undefined ? args.phone : professor.phone,
    };
    throwValidationErrors(validateProfessorInput(next));

    await ctx.db.patch(args.professorId, {
      name: next.name.trim(),
      email: next.email?.trim() || undefined,
      phone: next.phone?.trim() || undefined,
      status: args.status ?? professor.status,
      userId: args.userId !== undefined ? args.userId : professor.userId,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const listPackagePlans = query({
  args: {
    clubId: v.id("clubs"),
    includeInactive: v.optional(v.boolean()),
  },
  returns: v.array(academyPackagePlanValidator),
  handler: async (ctx, args) => {
    await requireAcademyAccess(ctx, args.clubId);
    await getClubOrThrow(ctx, args.clubId);

    const plans = await ctx.db
      .query("academyPackagePlans")
      .withIndex("by_club", (q) => q.eq("clubId", args.clubId))
      .collect();

    return plans
      .filter((plan) => args.includeInactive || plan.active)
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const createPackagePlan = mutation({
  args: {
    clubId: v.id("clubs"),
    name: v.string(),
    classesCount: v.number(),
    price: v.number(),
    validityDays: v.optional(v.number()),
  },
  returns: v.id("academyPackagePlans"),
  handler: async (ctx, args) => {
    await requireAcademyAccess(ctx, args.clubId);
    await getClubOrThrow(ctx, args.clubId);
    throwValidationErrors(validatePackagePlanInput(args));

    const now = Date.now();
    return await ctx.db.insert("academyPackagePlans", {
      clubId: args.clubId,
      name: args.name.trim(),
      classesCount: args.classesCount,
      price: args.price,
      validityDays: args.validityDays,
      active: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updatePackagePlan = mutation({
  args: {
    packagePlanId: v.id("academyPackagePlans"),
    name: v.optional(v.string()),
    classesCount: v.optional(v.number()),
    price: v.optional(v.number()),
    validityDays: v.optional(v.number()),
    active: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const plan = await ctx.db.get(args.packagePlanId);

    if (!plan) {
      throw new ConvexError("No encontramos el plan.");
    }

    await requireAcademyAccess(ctx, plan.clubId);
    const next = {
      name: args.name ?? plan.name,
      classesCount: args.classesCount ?? plan.classesCount,
      price: args.price ?? plan.price,
      validityDays:
        args.validityDays !== undefined ? args.validityDays : plan.validityDays,
    };
    throwValidationErrors(validatePackagePlanInput(next));

    await ctx.db.patch(args.packagePlanId, {
      ...next,
      name: next.name.trim(),
      active: args.active ?? plan.active,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const searchCustomers = query({
  args: {
    clubId: v.id("clubs"),
    search: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(customerValidator),
  handler: async (ctx, args) => {
    await requireAcademyAccess(ctx, args.clubId);

    const normalizedSearch = args.search.trim().toLowerCase();
    const normalizedPhone = normalizeCustomerPhone(args.search);
    const customers = await ctx.db
      .query("customers")
      .withIndex("by_club", (q) => q.eq("clubId", args.clubId))
      .take(200);

    return customers
      .filter((customer) => {
        if (customer.status !== "active") return false;
        if (!normalizedSearch) return true;

        return (
          customer.fullName.toLowerCase().includes(normalizedSearch) ||
          (normalizedPhone ? customer.phone.includes(normalizedPhone) : false) ||
          (customer.email?.toLowerCase().includes(normalizedSearch) ?? false)
        );
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
      .slice(0, args.limit ?? 10);
  },
});

export const sellPackage = mutation({
  args: {
    clubId: v.id("clubs"),
    customerId: v.id("customers"),
    packagePlanId: v.optional(v.id("academyPackagePlans")),
    name: v.string(),
    totalClasses: v.number(),
    amountPaid: v.number(),
    purchasedAt: v.number(),
    expiresAt: v.optional(v.number()),
  },
  returns: v.id("academyPackagePurchases"),
  handler: async (ctx, args) => {
    const access = await requireAcademyAccess(ctx, args.clubId);
    await getClubOrThrow(ctx, args.clubId);
    const customer = await getCustomerOrThrow(ctx, args.customerId);

    if (customer.clubId !== args.clubId) {
      throw new ConvexError("El cliente no pertenece a este club.");
    }

    let plan: Doc<"academyPackagePlans"> | null = null;
    if (args.packagePlanId) {
      plan = await ctx.db.get(args.packagePlanId);
      if (!plan || plan.clubId !== args.clubId) {
        throw new ConvexError("El plan no pertenece a este club.");
      }
      if (!plan.active) {
        throw new ConvexError("No puedes vender un plan inactivo.");
      }
    }

    const name = args.name.trim() || plan?.name || "Paquete de clases";
    throwValidationErrors(
      validatePackageSaleInput({
        totalClasses: args.totalClasses,
        amountPaid: args.amountPaid,
        purchasedAt: args.purchasedAt,
        expiresAt: args.expiresAt,
      }),
    );

    return await ctx.db.insert(
      "academyPackagePurchases",
      buildPackagePurchaseRecord({
        clubId: args.clubId,
        customerId: args.customerId,
        packagePlanId: args.packagePlanId,
        name,
        totalClasses: args.totalClasses,
        amountPaid: args.amountPaid,
        purchasedAt: args.purchasedAt,
        expiresAt: args.expiresAt,
        createdByUserId: access.userId,
        now: Date.now(),
      }),
    );
  },
});

export const listPackages = query({
  args: {
    clubId: v.id("clubs"),
    customerId: v.optional(v.id("customers")),
    status: v.optional(academyPackageStatusValidator),
  },
  returns: v.array(packagePurchaseWithCustomerValidator),
  handler: async (ctx, args) => {
    await requireAcademyAccess(ctx, args.clubId);

    let packages: Doc<"academyPackagePurchases">[];

    if (args.customerId) {
      packages = await ctx.db
        .query("academyPackagePurchases")
        .withIndex("by_customer_club", (q) =>
          q.eq("customerId", args.customerId as Id<"customers">).eq("clubId", args.clubId),
        )
        .collect();
    } else if (args.status) {
      const status = args.status;
      packages = await ctx.db
        .query("academyPackagePurchases")
        .withIndex("by_club_status", (q) =>
          q.eq("clubId", args.clubId).eq("status", status),
        )
        .collect();
    } else {
      packages = await ctx.db
        .query("academyPackagePurchases")
        .withIndex("by_club", (q) => q.eq("clubId", args.clubId))
        .collect();
    }

    const filtered = packages.filter(
      (packagePurchase) =>
        packagePurchase.clubId === args.clubId &&
        (args.status === undefined || packagePurchase.status === args.status),
    );
    const details = await Promise.all(
      filtered.map(async (packagePurchase) => {
        const [customer, plan] = await Promise.all([
          ctx.db.get(packagePurchase.customerId),
          packagePurchase.packagePlanId
            ? ctx.db.get(packagePurchase.packagePlanId)
            : Promise.resolve(null),
        ]);

        if (!customer) return null;

        return {
          packagePurchase,
          customer,
          plan,
          remainingClasses: getRemainingClasses(packagePurchase),
        };
      }),
    );

    return details
      .filter((detail): detail is NonNullable<typeof detail> => detail !== null)
      .sort((a, b) => b.packagePurchase.purchasedAt - a.packagePurchase.purchasedAt);
  },
});

export const listUsablePackagesForCustomer = query({
  args: {
    clubId: v.id("clubs"),
    customerId: v.id("customers"),
  },
  returns: v.array(packagePurchaseWithCustomerValidator),
  handler: async (ctx, args) => {
    await requireAcademyAccess(ctx, args.clubId);
    const customer = await getCustomerOrThrow(ctx, args.customerId);

    if (customer.clubId !== args.clubId) {
      throw new ConvexError("El cliente no pertenece a este club.");
    }

    const packages = await ctx.db
      .query("academyPackagePurchases")
      .withIndex("by_customer_club_status", (q) =>
        q
          .eq("customerId", args.customerId)
          .eq("clubId", args.clubId)
          .eq("status", "active"),
      )
      .collect();
    const now = Date.now();

    return packages
      .filter(
        (packagePurchase) =>
          getPackageUnavailableReason(packagePurchase, args, now) === null,
      )
      .map((packagePurchase) => ({
        packagePurchase,
        customer,
        plan: null,
        remainingClasses: getRemainingClasses(packagePurchase),
      }))
      .sort((a, b) => (a.packagePurchase.expiresAt ?? Infinity) - (b.packagePurchase.expiresAt ?? Infinity));
  },
});

export const createSession = mutation({
  args: {
    clubId: v.id("clubs"),
    professorId: v.id("academyProfessors"),
    localDate: v.string(),
    startTime: v.string(),
    endTime: v.optional(v.string()),
    classType: v.optional(academyClassTypeValidator),
    notes: v.optional(v.string()),
  },
  returns: v.id("academyClassSessions"),
  handler: async (ctx, args) => {
    const access = await requireAcademyAccess(ctx, args.clubId);
    await getClubOrThrow(ctx, args.clubId);
    const professor = await getProfessorOrThrow(ctx, args.professorId);

    if (professor.clubId !== args.clubId) {
      throw new ConvexError("El profesor no pertenece a este club.");
    }

    if (professor.status !== "active") {
      throw new ConvexError("No puedes asignar un profesor inactivo.");
    }

    throwValidationErrors(
      validateSessionInput({
        localDate: args.localDate,
        startTime: args.startTime,
        endTime: args.endTime,
      }),
    );

    const now = Date.now();
    return await ctx.db.insert("academyClassSessions", {
      clubId: args.clubId,
      professorId: args.professorId,
      localDate: args.localDate,
      startTime: args.startTime,
      endTime: args.endTime,
      classType: args.classType ?? "private",
      notes: args.notes?.trim() || undefined,
      status: "registered",
      createdByUserId: access.userId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateSession = mutation({
  args: {
    sessionId: v.id("academyClassSessions"),
    professorId: v.optional(v.id("academyProfessors")),
    localDate: v.optional(v.string()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    classType: v.optional(academyClassTypeValidator),
    notes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await getSessionOrThrow(ctx, args.sessionId);
    const access = await requireAcademyAccess(ctx, session.clubId);

    if (session.status !== "registered") {
      throw new ConvexError("Solo puedes editar clases registradas.");
    }

    const professorId = args.professorId ?? session.professorId;
    const professor = await getProfessorOrThrow(ctx, professorId);

    if (professor.clubId !== session.clubId || professor.status !== "active") {
      throw new ConvexError("El profesor no esta disponible para esta clase.");
    }

    const next = {
      localDate: args.localDate ?? session.localDate,
      startTime: args.startTime ?? session.startTime,
      endTime: args.endTime !== undefined ? args.endTime : session.endTime,
    };
    throwValidationErrors(validateSessionInput(next));

    await ctx.db.patch(args.sessionId, {
      professorId,
      localDate: next.localDate,
      startTime: next.startTime,
      endTime: next.endTime,
      classType: args.classType ?? session.classType,
      notes: args.notes !== undefined ? args.notes.trim() || undefined : session.notes,
      updatedByUserId: access.userId,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const addAttendance = mutation({
  args: {
    classSessionId: v.id("academyClassSessions"),
    customerId: v.id("customers"),
    paymentType: v.union(v.literal("single"), v.literal("package")),
    singleClassPrice: v.optional(v.number()),
    packagePurchaseId: v.optional(v.id("academyPackagePurchases")),
    paymentStatus: academyAttendancePaymentStatusValidator,
    notes: v.optional(v.string()),
  },
  returns: v.id("academyClassAttendances"),
  handler: async (ctx, args) => {
    const session = await getSessionOrThrow(ctx, args.classSessionId);
    const access = await requireAcademyAccess(ctx, session.clubId);

    if (session.status !== "registered") {
      throw new ConvexError("No puedes agregar alumnos a esta clase.");
    }

    const customer = await getCustomerOrThrow(ctx, args.customerId);
    if (customer.clubId !== session.clubId) {
      throw new ConvexError("El alumno no pertenece a este club.");
    }

    const existing = await ctx.db
      .query("academyClassAttendances")
      .withIndex("by_club_session", (q) =>
        q.eq("clubId", session.clubId).eq("classSessionId", session._id),
      )
      .collect();

    if (
      existing.some(
        (attendance) =>
          attendance.customerId === args.customerId &&
          attendance.status !== "cancelled",
      )
    ) {
      throw new ConvexError("Este alumno ya esta en la clase.");
    }

    if (args.paymentType === "package") {
      if (!args.packagePurchaseId) {
        throw new ConvexError("Selecciona un paquete para este alumno.");
      }

      const packagePurchase = await ctx.db.get(args.packagePurchaseId);
      if (!packagePurchase) {
        throw new ConvexError("No encontramos el paquete.");
      }

      const reason = getPackageUnavailableReason(
        packagePurchase,
        {
          clubId: session.clubId,
          customerId: args.customerId,
        },
        Date.now(),
      );

      if (reason) {
        throw new ConvexError({
          code: reason,
          message: "Este paquete no esta disponible.",
        });
      }
    }

    if (
      args.paymentType === "single" &&
      (args.singleClassPrice === undefined ||
        !Number.isInteger(args.singleClassPrice) ||
        args.singleClassPrice < 0)
    ) {
      throw new ConvexError("El precio de clase individual no es valido.");
    }

    const now = Date.now();
    return await ctx.db.insert("academyClassAttendances", {
      clubId: session.clubId,
      classSessionId: session._id,
      customerId: args.customerId,
      paymentType: args.paymentType,
      singleClassPrice:
        args.paymentType === "single" ? args.singleClassPrice : undefined,
      packagePurchaseId:
        args.paymentType === "package" ? args.packagePurchaseId : undefined,
      paymentStatus:
        args.paymentType === "package" ? "not_required" : args.paymentStatus,
      status: "registered",
      notes: args.notes?.trim() || undefined,
      createdByUserId: access.userId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const confirmAttendance = mutation({
  args: {
    attendanceId: v.id("academyClassAttendances"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const attendance = await getAttendanceOrThrow(ctx, args.attendanceId);
    const access = await requireAcademyAccess(ctx, attendance.clubId);
    const session = await getSessionOrThrow(ctx, attendance.classSessionId);

    if (session.status === "cancelled" || attendance.status === "cancelled") {
      throw new ConvexError("No puedes confirmar una asistencia cancelada.");
    }

    if (attendance.studentConfirmedAt) {
      await completeAttendanceIfReady(ctx, attendance, Date.now(), access.userId);
      return null;
    }

    const now = Date.now();
    const nextAttendance = {
      ...attendance,
      studentConfirmedAt: now,
      studentConfirmedByUserId: access.userId,
    };

    await ctx.db.patch(args.attendanceId, {
      studentConfirmedAt: now,
      studentConfirmedByUserId: access.userId,
      updatedByUserId: access.userId,
      updatedAt: now,
    });
    await completeAttendanceIfReady(ctx, nextAttendance, now, access.userId);

    return null;
  },
});

export const validateAttendanceByProfessor = mutation({
  args: {
    attendanceId: v.id("academyClassAttendances"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const attendance = await getAttendanceOrThrow(ctx, args.attendanceId);
    const access = await requireAcademyAccess(ctx, attendance.clubId);
    const session = await getSessionOrThrow(ctx, attendance.classSessionId);

    if (session.status === "cancelled" || attendance.status === "cancelled") {
      throw new ConvexError("No puedes validar una asistencia cancelada.");
    }

    if (attendance.professorValidatedAt) {
      await completeAttendanceIfReady(ctx, attendance, Date.now(), access.userId);
      return null;
    }

    const now = Date.now();
    const nextAttendance = {
      ...attendance,
      professorValidatedAt: now,
      professorValidatedByUserId: access.userId,
    };

    await ctx.db.patch(args.attendanceId, {
      professorValidatedAt: now,
      professorValidatedByUserId: access.userId,
      updatedByUserId: access.userId,
      updatedAt: now,
    });
    await completeAttendanceIfReady(ctx, nextAttendance, now, access.userId);

    return null;
  },
});

export const cancelAttendance = mutation({
  args: {
    attendanceId: v.id("academyClassAttendances"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const attendance = await getAttendanceOrThrow(ctx, args.attendanceId);
    const access = await requireAcademyAccess(ctx, attendance.clubId);
    const now = Date.now();

    if (attendance.status === "cancelled") {
      return null;
    }

    if (shouldRestorePackage(attendance)) {
      if (!attendance.packagePurchaseId) {
        throw new ConvexError("La asistencia no tiene paquete asociado.");
      }

      const packagePurchase = await ctx.db.get(attendance.packagePurchaseId);
      if (!packagePurchase) {
        throw new ConvexError("No encontramos el paquete.");
      }

      const usedClasses = Math.max(0, packagePurchase.usedClasses - 1);
      await ctx.db.patch(packagePurchase._id, {
        usedClasses,
        status: packagePurchase.status === "cancelled" ? "cancelled" : "active",
        updatedByUserId: access.userId,
        updatedAt: now,
      });
      await ctx.db.patch(args.attendanceId, {
        status: "cancelled",
        packageConsumptionRevertedAt: now,
        cancelledAt: now,
        updatedByUserId: access.userId,
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(args.attendanceId, {
        status: "cancelled",
        cancelledAt: now,
        updatedByUserId: access.userId,
        updatedAt: now,
      });
    }

    return null;
  },
});

export const cancelSession = mutation({
  args: {
    sessionId: v.id("academyClassSessions"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await getSessionOrThrow(ctx, args.sessionId);
    const access = await requireAcademyAccess(ctx, session.clubId);
    const attendances = await ctx.db
      .query("academyClassAttendances")
      .withIndex("by_club_session", (q) =>
        q.eq("clubId", session.clubId).eq("classSessionId", session._id),
      )
      .collect();
    const now = Date.now();

    for (const attendance of attendances) {
      if (attendance.status !== "cancelled") {
        if (shouldRestorePackage(attendance)) {
          if (!attendance.packagePurchaseId) {
            throw new ConvexError("La asistencia no tiene paquete asociado.");
          }

          const packagePurchase = await ctx.db.get(attendance.packagePurchaseId);
          if (!packagePurchase) {
            throw new ConvexError("No encontramos el paquete.");
          }

          const usedClasses = Math.max(0, packagePurchase.usedClasses - 1);
          await ctx.db.patch(packagePurchase._id, {
            usedClasses,
            status: packagePurchase.status === "cancelled" ? "cancelled" : "active",
            updatedByUserId: access.userId,
            updatedAt: now,
          });
        }

        await ctx.db.patch(attendance._id, {
          status: "cancelled",
          packageConsumptionRevertedAt: shouldRestorePackage(attendance)
            ? now
            : attendance.packageConsumptionRevertedAt,
          cancelledAt: now,
          updatedByUserId: access.userId,
          updatedAt: now,
        });
      }
    }

    await ctx.db.patch(args.sessionId, {
      status: "cancelled",
      cancelledAt: now,
      updatedByUserId: access.userId,
      updatedAt: now,
    });

    return null;
  },
});

export const listSessions = query({
  args: {
    clubId: v.id("clubs"),
    startDate: v.string(),
    endDate: v.string(),
    professorId: v.optional(v.id("academyProfessors")),
    status: v.optional(academyAttendanceStatusValidator),
  },
  returns: v.array(sessionWithDetailsValidator),
  handler: async (ctx, args) => {
    await requireAcademyAccess(ctx, args.clubId);
    const days = rangeDays(args.startDate, args.endDate);
    const sessions = await listSessionsForRange(
      ctx,
      args.clubId,
      args.startDate,
      days,
    );
    const filtered = sessions.filter(
      (session) =>
        (args.professorId === undefined ||
          session.professorId === args.professorId) &&
        session.clubId === args.clubId,
    );
    const details = await Promise.all(
      filtered.map((session) => buildSessionDetails(ctx, session)),
    );
    const withDetails = details.filter(
      (detail): detail is NonNullable<typeof detail> => detail !== null,
    );

    return withDetails
      .filter((detail) =>
        args.status === undefined
          ? true
          : detail.attendances.some(
              (attendance) => attendance.attendance.status === args.status,
            ),
      )
      .sort((a, b) =>
        `${a.session.localDate} ${a.session.startTime}`.localeCompare(
          `${b.session.localDate} ${b.session.startTime}`,
        ),
      );
  },
});

export const getSessionDetail = query({
  args: {
    sessionId: v.id("academyClassSessions"),
  },
  returns: v.union(sessionWithDetailsValidator, v.null()),
  handler: async (ctx, args) => {
    const session = await getSessionOrThrow(ctx, args.sessionId);
    await requireAcademyAccess(ctx, session.clubId);

    return await buildSessionDetails(ctx, session);
  },
});

export const getReports = query({
  args: {
    clubId: v.id("clubs"),
    startDate: v.string(),
    endDate: v.string(),
  },
  returns: reportsValidator,
  handler: async (ctx, args) => {
    await requireAcademyAccess(ctx, args.clubId);
    const days = rangeDays(args.startDate, args.endDate);
    const [sessions, packages] = await Promise.all([
      listSessionsForRange(ctx, args.clubId, args.startDate, days),
      ctx.db
        .query("academyPackagePurchases")
        .withIndex("by_club", (q) => q.eq("clubId", args.clubId))
        .collect(),
    ]);
    const sessionDetails = (
      await Promise.all(sessions.map((session) => buildSessionDetails(ctx, session)))
    ).filter((detail): detail is NonNullable<typeof detail> => detail !== null);
    const attendances = sessionDetails.flatMap((detail) =>
      detail.attendances.map((attendance) => attendance.attendance),
    );
    const packageDetails = (
      await Promise.all(
        packages.map(async (packagePurchase) => {
          const [customer, plan] = await Promise.all([
            ctx.db.get(packagePurchase.customerId),
            packagePurchase.packagePlanId
              ? ctx.db.get(packagePurchase.packagePlanId)
              : Promise.resolve(null),
          ]);

          if (!customer) return null;

          return {
            packagePurchase,
            customer,
            plan,
            remainingClasses: getRemainingClasses(packagePurchase),
          };
        }),
      )
    ).filter((detail): detail is NonNullable<typeof detail> => detail !== null);
    const packageSalesInRange = packages.filter(
      (packagePurchase) =>
        packagePurchase.purchasedAt >= parseLocalDate(args.startDate) &&
        packagePurchase.purchasedAt <= timestampAtBogotaEnd(args.endDate),
    );
    const revenue = calculateAcademyRevenue({
      packageSales: packageSalesInRange,
      attendances,
    });
    const professorMap = new Map<string, {
      professorId: Id<"academyProfessors">;
      professorName: string;
      sessionIds: Set<string>;
      studentsServed: number;
      singleClassStudents: number;
      packageStudents: number;
      pendingValidations: number;
    }>();

    for (const detail of sessionDetails) {
      const current =
        professorMap.get(detail.professor._id) ?? {
          professorId: detail.professor._id,
          professorName: detail.professor.name,
          sessionIds: new Set<string>(),
          studentsServed: 0,
          singleClassStudents: 0,
          packageStudents: 0,
          pendingValidations: 0,
        };

      current.sessionIds.add(detail.session._id);
      for (const attendanceDetail of detail.attendances) {
        const attendance = attendanceDetail.attendance;
        if (attendance.status === "cancelled") continue;
        current.studentsServed += 1;
        if (attendance.paymentType === "single") current.singleClassStudents += 1;
        if (attendance.paymentType === "package") current.packageStudents += 1;
        if (!attendance.professorValidatedAt) current.pendingValidations += 1;
      }
      professorMap.set(detail.professor._id, current);
    }

    return {
      dailyClasses: sessionDetails,
      professorReport: Array.from(professorMap.values()).map((entry) => ({
        professorId: entry.professorId,
        professorName: entry.professorName,
        sessions: entry.sessionIds.size,
        studentsServed: entry.studentsServed,
        singleClassStudents: entry.singleClassStudents,
        packageStudents: entry.packageStudents,
        pendingValidations: entry.pendingValidations,
      })),
      revenue,
      packages: packageDetails,
      pendingValidations: sessionDetails.filter((detail) =>
        detail.attendances.some(
          (attendance) =>
            attendance.attendance.status !== "cancelled" &&
            !attendance.attendance.professorValidatedAt,
        ),
      ),
    };
  },
});
