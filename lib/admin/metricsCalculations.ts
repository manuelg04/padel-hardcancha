import {
  getBogotaNowParts,
  getLocalDayOfWeek,
} from "../bookingRules";
import { minutesToInput } from "../dates";
import type {
  ClubMetricsExportData,
  MetricsBooking,
  MetricsExportParams,
  MetricsMembership,
  MetricsSettlement,
} from "./metricsTypes";

type NowParts = {
  localDate: string;
  currentMinutes: number;
};

type SummaryValue = string | number;

export type SummaryRow = {
  label: string;
  value: SummaryValue;
};

export type MetricsWorkbookModel = ReturnType<typeof buildMetricsWorkbookModel>;

function addDays(localDate: string, days: number) {
  const [year, month, day] = localDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function listDates(startDate: string, endDate: string) {
  const dates: string[] = [];

  for (let date = startDate; date <= endDate; date = addDays(date, 1)) {
    dates.push(date);
  }

  return dates;
}

function minutesToTwentyFourHour(minutes: number) {
  return minutesToInput(minutes);
}

function hourSlot(startMinutes: number) {
  const slotStart = Math.floor(startMinutes / 60) * 60;
  return {
    key: String(slotStart).padStart(4, "0"),
    label: `${minutesToTwentyFourHour(slotStart)} - ${minutesToTwentyFourHour(slotStart + 60)}`,
  };
}

function timestampToDateTime(value?: number) {
  if (value === undefined) return "";

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusLabel(status: MetricsBooking["bookingStatus"]) {
  if (status === "confirmed") return "Confirmada";
  if (status === "cancelled") return "Cancelada";
  return "Bloqueo";
}

function settlementStatusLabel(status?: MetricsSettlement["status"]) {
  if (!status) return "Sin liquidación";
  if (status === "paid") return "Pagada";
  if (status === "closed") return "Liquidada pendiente";
  if (status === "cancelled") return "Liquidación cancelada";
  return "Borrador";
}

function paymentStatusLabel(status: MetricsBooking["paymentStatus"]) {
  return status === "paid" ? "Pagada" : "Pendiente";
}

function paymentMethodLabel(method?: MetricsBooking["paymentMethod"]) {
  if (!method) return "";
  if (method === "club") return "Club";
  if (method === "transfer") return "Transferencia";
  if (method === "cash") return "Efectivo";
  return "Otro";
}

function benefitTypeLabel(type?: string) {
  if (type === "free") return "Gratis";
  if (type === "percentage_discount") return "Descuento porcentual";
  if (type === "fixed_price") return "Precio fijo";
  return "";
}

function isCommercialBooking(booking: MetricsBooking) {
  return booking.bookingStatus === "confirmed";
}

function isCompletedBooking(booking: MetricsBooking, now: NowParts) {
  if (!isCommercialBooking(booking)) return false;
  if (booking.localDate < now.localDate) return true;
  if (booking.localDate > now.localDate) return false;

  return booking.endMinutes <= now.currentMinutes;
}

function getOpeningWindow(
  data: ClubMetricsExportData,
  localDate: string,
) {
  const dayOfWeek = getLocalDayOfWeek(localDate);
  const openingHour = data.club.openingHours.find(
    (entry) => entry.dayOfWeek === dayOfWeek,
  );

  if (!openingHour || !openingHour.isOpen) {
    return { isOpen: false, openMinutes: 0, closeMinutes: 0 };
  }

  return {
    isOpen: true,
    openMinutes: openingHour.openMinutes,
    closeMinutes: openingHour.closeMinutes,
  };
}

function summaryRows(entries: Record<string, SummaryValue>): SummaryRow[] {
  return Object.entries(entries).map(([label, value]) => ({ label, value }));
}

export function buildMetricsWorkbookModel(
  data: ClubMetricsExportData,
  params: MetricsExportParams,
) {
  const now = params.now ?? getBogotaNowParts();
  const bookings = data.bookings
    .slice()
    .sort((a, b) =>
      `${a.localDate}-${String(a.startMinutes).padStart(4, "0")}`.localeCompare(
        `${b.localDate}-${String(b.startMinutes).padStart(4, "0")}`,
      ),
    );
  const settlementsByBookingId = new Map(
    data.settlements.map((settlement) => [settlement.bookingId, settlement]),
  );
  const paidSettlementsByBookingId = new Map(
    data.settlements
      .filter((settlement) => settlement.status === "paid")
      .map((settlement) => [settlement.bookingId, settlement]),
  );
  const commercialBookings = bookings.filter(isCommercialBooking);
  const completedBookings = commercialBookings.filter((booking) =>
    isCompletedBooking(booking, now),
  );
  const futureConfirmedBookings = commercialBookings.filter(
    (booking) => !isCompletedBooking(booking, now),
  );
  const paidSettledBookings = commercialBookings.filter((booking) =>
    paidSettlementsByBookingId.has(booking.id),
  );
  const expectedBaseValue = commercialBookings.reduce(
    (total, booking) => total + booking.value,
    0,
  );
  const totalCollected = paidSettledBookings.reduce((total, booking) => {
    return total + (paidSettlementsByBookingId.get(booking.id)?.finalTotalCollectedValue ?? 0);
  }, 0);
  const reservasDetail = bookings.map((booking) => ({
    date: booking.localDate,
    startTime: minutesToTwentyFourHour(booking.startMinutes),
    endTime: minutesToTwentyFourHour(booking.endMinutes),
    court: booking.courtName,
    customer: booking.customerName ?? "",
    customerIdentifier: booking.customerPhone ?? booking.customerEmail ?? "",
    bookingStatus: statusLabel(booking.bookingStatus),
    type: booking.bookingStatus === "blocked" ? "Bloqueo" : "Reserva",
    paymentStatus: paymentStatusLabel(booking.paymentStatus),
    baseValue: booking.value,
    completed: isCompletedBooking(booking, now) ? "Sí" : "No",
    createdAt: timestampToDateTime(booking.createdAt),
    cancelledAt: timestampToDateTime(booking.cancelledAt),
    bookingId: booking.id,
  }));
  const ingresosDetail = commercialBookings.map((booking) => {
    const settlement = settlementsByBookingId.get(booking.id);

    return {
      date: booking.localDate,
      startTime: minutesToTwentyFourHour(booking.startMinutes),
      endTime: minutesToTwentyFourHour(booking.endMinutes),
      court: booking.courtName,
      customer: booking.customerName ?? "",
      bookingStatus: statusLabel(booking.bookingStatus),
      paymentStatus: paymentStatusLabel(booking.paymentStatus),
      settlementStatus: settlementStatusLabel(settlement?.status),
      closedAt: timestampToDateTime(settlement?.closedAt),
      paidAt: timestampToDateTime(settlement?.paidAt),
      baseValue: booking.value,
      finalCollected: settlement?.status === "paid" ? settlement.finalTotalCollectedValue : 0,
      discounts: settlement?.discountAbsorbedByClubValue ?? 0,
      adjustments: settlement?.manualAdjustmentAmount ?? 0,
      paymentMethod: paymentMethodLabel(settlement?.paymentMethod ?? booking.paymentMethod),
      bookingId: booking.id,
      settlementId: settlement?.id ?? "",
    };
  });
  const dates = listDates(params.startDate, params.endDate);
  const courts = data.courts.slice().sort((a, b) => a.sortOrder - b.sortOrder);
  const activeCourts = courts.filter((court) => court.isActive);
  const ocupacionDetail = dates.flatMap((date) => {
    const openingWindow = getOpeningWindow(data, date);

    return courts.map((court) => {
      const courtBookings = bookings.filter(
        (booking) => booking.localDate === date && booking.courtId === court.id,
      );
      const availableHours =
        court.isActive && openingWindow.isOpen
          ? Math.max(0, openingWindow.closeMinutes - openingWindow.openMinutes) / 60
          : 0;
      const confirmed = courtBookings.filter(isCommercialBooking);
      const cancelled = courtBookings.filter(
        (booking) => booking.bookingStatus === "cancelled",
      );
      const blocked = courtBookings.filter(
        (booking) => booking.bookingStatus === "blocked",
      );
      const reservedCommercialHours = confirmed.reduce(
        (total, booking) => total + booking.durationMinutes / 60,
        0,
      );
      const cancelledHours = cancelled.reduce(
        (total, booking) => total + booking.durationMinutes / 60,
        0,
      );
      const blockedHours = blocked.reduce(
        (total, booking) => total + booking.durationMinutes / 60,
        0,
      );

      return {
        date,
        court: court.name,
        courtStatus: court.isActive ? "Activa" : "Inactiva",
        availableHours,
        reservedCommercialHours,
        cancelledHours,
        blockedHours,
        occupancyPercent:
          availableHours > 0
            ? Math.round((reservedCommercialHours / availableHours) * 10000) / 100
            : 0,
        confirmedBookings: confirmed.length,
        cancelledBookings: cancelled.length,
        blocks: blocked.length,
      };
    });
  });
  const availableHours = ocupacionDetail.reduce(
    (total, row) => total + row.availableHours,
    0,
  );
  const reservedCommercialHours = ocupacionDetail.reduce(
    (total, row) => total + row.reservedCommercialHours,
    0,
  );
  const occupancyByCourt = activeCourts.map((court) => {
    const rows = ocupacionDetail.filter((row) => row.court === court.name);
    const courtAvailable = rows.reduce((total, row) => total + row.availableHours, 0);
    const courtReserved = rows.reduce(
      (total, row) => total + row.reservedCommercialHours,
      0,
    );

    return {
      court: court.name,
      percent:
        courtAvailable > 0
          ? Math.round((courtReserved / courtAvailable) * 10000) / 100
          : 0,
    };
  });
  const topOccupancy = occupancyByCourt.reduce(
    (top, court) => (court.percent > top.percent ? court : top),
    { court: "", percent: -1 },
  );
  const lowOccupancy = occupancyByCourt.reduce(
    (low, court) => (court.percent < low.percent ? court : low),
    { court: "", percent: Number.POSITIVE_INFINITY },
  );
  const slotMap = new Map<
    string,
    {
      slot: string;
      confirmedBookings: number;
      completedBookings: number;
      cancelledBookings: number;
      reservedCommercialHours: number;
      expectedBaseValue: number;
      collectedTotal: number;
    }
  >();
  const horariosBookingDetail = bookings
    .filter((booking) => booking.bookingStatus !== "blocked")
    .map((booking) => {
      const slot = hourSlot(booking.startMinutes);
      const settlement = settlementsByBookingId.get(booking.id);
      const paidSettlement = paidSettlementsByBookingId.get(booking.id);
      const existing = slotMap.get(slot.key) ?? {
        slot: slot.label,
        confirmedBookings: 0,
        completedBookings: 0,
        cancelledBookings: 0,
        reservedCommercialHours: 0,
        expectedBaseValue: 0,
        collectedTotal: 0,
      };

      if (booking.bookingStatus === "confirmed") {
        existing.confirmedBookings += 1;
        existing.reservedCommercialHours += booking.durationMinutes / 60;
        existing.expectedBaseValue += booking.value;
      }

      if (isCompletedBooking(booking, now)) {
        existing.completedBookings += 1;
      }

      if (booking.bookingStatus === "cancelled") {
        existing.cancelledBookings += 1;
      }

      if (paidSettlement) {
        existing.collectedTotal += paidSettlement.finalTotalCollectedValue;
      }

      slotMap.set(slot.key, existing);

      return {
        date: booking.localDate,
        startTime: minutesToTwentyFourHour(booking.startMinutes),
        endTime: minutesToTwentyFourHour(booking.endMinutes),
        slot: slot.label,
        court: booking.courtName,
        customer: booking.customerName ?? "",
        bookingStatus: statusLabel(booking.bookingStatus),
        completed: isCompletedBooking(booking, now) ? "Sí" : "No",
        baseValue: booking.value,
        settlementStatus: settlementStatusLabel(settlement?.status),
        collectedTotal: paidSettlement?.finalTotalCollectedValue ?? 0,
        bookingId: booking.id,
      };
    });
  const detailBySlot = Array.from(slotMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, row]) => ({
      ...row,
      completedOverConfirmedPercent:
        row.confirmedBookings > 0
          ? Math.round((row.completedBookings / row.confirmedBookings) * 10000) / 100
          : 0,
    }));
  const mostBookingsSlot = detailBySlot.reduce(
    (top, row) =>
      row.confirmedBookings > top.confirmedBookings ? row : top,
    {
      slot: "",
      confirmedBookings: -1,
      completedBookings: 0,
      cancelledBookings: 0,
      reservedCommercialHours: 0,
      expectedBaseValue: 0,
      collectedTotal: 0,
      completedOverConfirmedPercent: 0,
    },
  );
  const highestIncomeSlot = detailBySlot.reduce(
    (top, row) => (row.collectedTotal > top.collectedTotal ? row : top),
    {
      slot: "",
      confirmedBookings: 0,
      completedBookings: 0,
      cancelledBookings: 0,
      reservedCommercialHours: 0,
      expectedBaseValue: 0,
      collectedTotal: -1,
      completedOverConfirmedPercent: 0,
    },
  );
  const activeMemberships = data.memberships.filter((membership) =>
    isMembershipActive(membership, data.generatedAt),
  );
  const createdMemberships = data.memberships.filter((membership) =>
    timestampInRange(membership.createdAt, params.startDate, params.endDate),
  );
  const endedMemberships = data.memberships.filter(
    (membership) =>
      (membership.endsAt !== undefined &&
        timestampInRange(membership.endsAt, params.startDate, params.endDate)) ||
      (membership.cancelledAt !== undefined &&
        timestampInRange(membership.cancelledAt, params.startDate, params.endDate)),
  );
  const paidSettlementsWithBenefits = data.settlements.filter(
    (settlement) =>
      settlement.status === "paid" &&
      settlement.memberCharges.some((charge) => charge.benefitApplied),
  );
  const membershipBenefits = paidSettlementsWithBenefits.flatMap((settlement) => {
    const booking = bookings.find((candidate) => candidate.id === settlement.bookingId);

    if (!booking) return [];

    return settlement.memberCharges
      .filter((charge) => charge.benefitApplied)
      .map((charge) => ({
        bookingDate: booking.localDate,
        bookingTime: `${minutesToTwentyFourHour(booking.startMinutes)} - ${minutesToTwentyFourHour(booking.endMinutes)}`,
        court: booking.courtName,
        customer: charge.customerName,
        plan: charge.membershipPlanName,
        benefitType: benefitTypeLabel(charge.benefitType),
        originalValue: charge.baseShareValue,
        discountApplied: charge.discountValue,
        chargedValue: charge.chargedValue,
        settlementStatus: settlementStatusLabel(settlement.status),
        bookingId: booking.id,
        settlementId: settlement.id,
      }));
  });
  const membershipDetails = data.memberships.map((membership) => ({
    customer: membership.customerName,
    plan: membership.planName,
    status: membershipStatusLabel(membership.status),
    startsAt: timestampToLocalDate(membership.startsAt),
    endsAt: timestampToLocalDate(membership.endsAt),
    createdAt: timestampToDateTime(membership.createdAt),
    membershipId: membership.id,
    planId: membership.planId,
  }));
  const membershipDiscount = membershipBenefits.reduce(
    (total, benefit) => total + benefit.discountApplied,
    0,
  );
  const totalCollectedWithMembership = paidSettlementsWithBenefits.reduce(
    (total, settlement) => total + settlement.finalTotalCollectedValue,
    0,
  );
  const membershipMonthlyIncome = activeMemberships.reduce(
    (total, membership) => total + (membership.monthlyPrice ?? 0),
    0,
  );

  return {
    reservas: {
      summary: {
        totalRecords: bookings.length,
        commercialBookings: commercialBookings.length,
        confirmed: commercialBookings.length,
        cancelled: bookings.filter((booking) => booking.bookingStatus === "cancelled")
          .length,
        blocks: bookings.filter((booking) => booking.bookingStatus === "blocked")
          .length,
        completed: completedBookings.length,
        futureConfirmed: futureConfirmedBookings.length,
      },
      summaryRows: summaryRows({
        "Total registros": bookings.length,
        "Total reservas comerciales": commercialBookings.length,
        Confirmadas: commercialBookings.length,
        Canceladas: bookings.filter((booking) => booking.bookingStatus === "cancelled")
          .length,
        Bloqueos: bookings.filter((booking) => booking.bookingStatus === "blocked")
          .length,
        Efectuadas: completedBookings.length,
        "Futuras confirmadas": futureConfirmedBookings.length,
      }),
      detail: reservasDetail,
    },
    ingresos: {
      summary: {
        completedBookings: completedBookings.length,
        paidSettledBookings: paidSettledBookings.length,
        totalCollected,
        expectedBaseValue,
        difference: expectedBaseValue - totalCollected,
      },
      summaryRows: summaryRows({
        "Total reservas efectuadas": completedBookings.length,
        "Total reservas con liquidación pagada": paidSettledBookings.length,
        "Total liquidado/cobrado": totalCollected,
        "Total valor base esperado": expectedBaseValue,
        "Diferencia valor esperado menos liquidado": expectedBaseValue - totalCollected,
      }),
      detail: ingresosDetail,
    },
    ocupacion: {
      summary: {
        activeCourts: activeCourts.length,
        availableHours,
        reservedCommercialHours,
        commercialOccupancyPercent:
          availableHours > 0
            ? Math.round((reservedCommercialHours / availableHours) * 10000) / 100
            : 0,
        topCourt: topOccupancy.court,
        lowCourt: lowOccupancy.court,
      },
      summaryRows: summaryRows({
        "Total canchas activas": activeCourts.length,
        "Horas disponibles totales": availableHours,
        "Horas reservadas comerciales": reservedCommercialHours,
        "Porcentaje ocupación comercial": `${
          availableHours > 0
            ? Math.round((reservedCommercialHours / availableHours) * 10000) / 100
            : 0
        }%`,
        "Cancha con mayor ocupación": topOccupancy.court,
        "Cancha con menor ocupación": lowOccupancy.court,
      }),
      detail: ocupacionDetail,
    },
    horarios: {
      summary: {
        mostBookingsSlot: mostBookingsSlot.slot,
        highestIncomeSlot: highestIncomeSlot.slot,
        confirmedBookings: commercialBookings.length,
        completedBookings: completedBookings.length,
        cancelledBookings: bookings.filter(
          (booking) => booking.bookingStatus === "cancelled",
        ).length,
        totalCollected,
      },
      summaryRows: summaryRows({
        "Franja con más reservas": mostBookingsSlot.slot,
        "Franja con mayor ingreso liquidado": highestIncomeSlot.slot,
        "Total reservas confirmadas": commercialBookings.length,
        "Total reservas efectuadas": completedBookings.length,
        "Total canceladas": bookings.filter(
          (booking) => booking.bookingStatus === "cancelled",
        ).length,
        "Total liquidado": totalCollected,
      }),
      detailBySlot,
      detailByBooking: horariosBookingDetail,
    },
    membresias: {
      summary: {
        activeMemberships: activeMemberships.length,
        createdInRange: createdMemberships.length,
        endedInRange: endedMemberships.length,
        usedBenefitBookings: paidSettlementsWithBenefits.length,
        totalMembershipDiscount: membershipDiscount,
        totalCollectedWithMembership,
        membershipMonthlyIncome,
      },
      summaryRows: summaryRows({
        "Membresías activas": activeMemberships.length,
        "Membresías creadas en el rango": createdMemberships.length,
        "Membresías vencidas o terminadas en el rango": endedMemberships.length,
        "Reservas con beneficio de membresía aplicado":
          paidSettlementsWithBenefits.length,
        "Total descuentos por membresía": membershipDiscount,
        "Total cobrado en reservas con membresía": totalCollectedWithMembership,
        "Total ingresos por membresías": membershipMonthlyIncome,
      }),
      membershipDetails,
      benefitDetails: membershipBenefits,
    },
  };
}

function timestampInRange(value: number, startDate: string, endDate: string) {
  const localDate = timestampToLocalDate(value);
  return localDate >= startDate && localDate <= endDate;
}

function timestampToLocalDate(value?: number) {
  if (value === undefined) return "";

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function isMembershipActive(membership: MetricsMembership, now: number) {
  return (
    membership.status === "active" &&
    membership.startsAt <= now &&
    (membership.endsAt === undefined || membership.endsAt >= now)
  );
}

function membershipStatusLabel(status: MetricsMembership["status"]) {
  if (status === "active") return "Activa";
  if (status === "paused") return "Pausada";
  if (status === "cancelled") return "Cancelada";
  return "Vencida";
}
