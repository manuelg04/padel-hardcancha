export type PublicReservationPaymentType =
  | "pay_at_club"
  | "deposit"
  | "full_payment";
export type OnlineReservationPaymentType = "deposit" | "full_payment";
export type ReservationPaymentStatus =
  | "created"
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled"
  | "refunded"
  | "failed"
  | "superseded";
export type DepositStatus = "none" | "pending" | "paid" | "failed" | "refunded";
export type BookingPaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "expired"
  | "refunded"
  | "no_payment_required";
export type BookingStatus = "payment_pending" | "confirmed" | "expired";

export function calculateReservationDepositAmount(
  totalReservationAmount: number,
) {
  const total = normalizeReservationTotal(totalReservationAmount);
  const depositAmount = Math.max(Math.round(total * 0.25), 1);

  return Math.min(depositAmount, total);
}

export function calculateReservationPaymentBreakdown(
  totalReservationAmount: number,
  paymentType: PublicReservationPaymentType,
) {
  const total = normalizeReservationTotal(totalReservationAmount);

  if (paymentType === "pay_at_club") {
    return {
      onlineAmount: 0,
      pendingAtReception: total,
      label: "Pago en club",
      description: "Reserva ahora y paga el total en recepcion.",
    };
  }

  if (paymentType === "full_payment") {
    return {
      onlineAmount: total,
      pendingAtReception: 0,
      label: "Pagar completo online",
      description: "Paga el total de la reserva ahora.",
    };
  }

  const onlineAmount = calculateReservationDepositAmount(total);

  return {
    onlineAmount,
    pendingAtReception: Math.max(total - onlineAmount, 0),
    label: "Abonar online",
    description: "Paga el cuarto de cancha ahora y el saldo en el club.",
  };
}

export function getReservationPaymentSubmitLabel(
  paymentType: PublicReservationPaymentType,
  submitting: boolean,
) {
  if (submitting) {
    return paymentType === "pay_at_club"
      ? "Confirmando..."
      : "Abriendo Mercado Pago...";
  }

  if (paymentType === "deposit") return "Abonar y reservar";
  if (paymentType === "full_payment") return "Pagar completo";

  return "Confirmar reserva";
}

export function buildReservationPaymentExternalReference(
  paymentType: OnlineReservationPaymentType,
  reservationPaymentId: string,
) {
  return `${paymentType}:${reservationPaymentId}`;
}

export function isReservationPaymentExternalReferenceForType(
  externalReference: string | undefined,
  paymentType: OnlineReservationPaymentType,
) {
  if (!externalReference) return false;

  return externalReference.startsWith(`${paymentType}:`);
}

export function applyReservationPaymentWebhookState({
  paymentType,
  currentReservationPaymentStatus,
  currentDepositStatus,
  currentDepositPaidAmount,
  estimatedTotal,
  paymentAmount,
  providerStatus,
}: {
  paymentType: OnlineReservationPaymentType;
  currentReservationPaymentStatus?: ReservationPaymentStatus;
  currentDepositStatus: DepositStatus;
  currentDepositPaidAmount: number;
  estimatedTotal: number;
  paymentAmount: number;
  providerStatus: string;
}) {
  const reservationPaymentStatus = mapMercadoPagoReservationPaymentStatus(
    providerStatus,
  );
  const cleanEstimatedTotal = normalizeMoney(estimatedTotal);
  const cleanCurrentPaid = normalizeMoney(currentDepositPaidAmount);
  const cleanPaymentAmount = normalizeMoney(paymentAmount);

  if (
    currentReservationPaymentStatus === "approved" &&
    reservationPaymentStatus !== "refunded"
  ) {
    if (paymentType === "full_payment") {
      return {
        reservationPaymentStatus: "approved" as const,
        bookingPaymentStatus: "paid" as const,
        depositStatus: "none" as const,
        depositPaidAmount: 0,
        estimatedBalanceDue: 0,
        bookingStatus: "confirmed" as const,
      };
    }

    const depositPaidAmount =
      cleanCurrentPaid > 0 ? cleanCurrentPaid : cleanPaymentAmount;

    return {
      reservationPaymentStatus: "approved" as const,
      bookingPaymentStatus: "pending" as const,
      depositStatus: "paid" as const,
      depositPaidAmount,
      estimatedBalanceDue: Math.max(cleanEstimatedTotal - depositPaidAmount, 0),
      bookingStatus: "confirmed" as const,
    };
  }

  if (reservationPaymentStatus === "approved") {
    if (paymentType === "full_payment") {
      return {
        reservationPaymentStatus,
        bookingPaymentStatus: "paid" as const,
        depositStatus: "none" as const,
        depositPaidAmount: 0,
        estimatedBalanceDue: 0,
        bookingStatus: "confirmed" as const,
      };
    }

    const depositPaidAmount =
      currentDepositStatus === "paid" && cleanCurrentPaid > 0
        ? cleanCurrentPaid
        : cleanPaymentAmount;

    return {
      reservationPaymentStatus,
      bookingPaymentStatus: "pending" as const,
      depositStatus: "paid" as const,
      depositPaidAmount,
      estimatedBalanceDue: Math.max(cleanEstimatedTotal - depositPaidAmount, 0),
      bookingStatus: "confirmed" as const,
    };
  }

  if (reservationPaymentStatus === "pending") {
    return {
      reservationPaymentStatus,
      bookingPaymentStatus: "pending" as const,
      depositStatus:
        paymentType === "deposit" && currentDepositStatus === "paid"
          ? ("paid" as const)
          : paymentType === "deposit"
            ? ("pending" as const)
            : ("none" as const),
      depositPaidAmount: paymentType === "deposit" ? cleanCurrentPaid : 0,
      estimatedBalanceDue: Math.max(cleanEstimatedTotal - cleanCurrentPaid, 0),
      bookingStatus: "payment_pending" as const,
    };
  }

  if (reservationPaymentStatus === "refunded") {
    return {
      reservationPaymentStatus,
      bookingPaymentStatus: "refunded" as const,
      depositStatus: paymentType === "deposit" ? ("refunded" as const) : ("none" as const),
      depositPaidAmount: 0,
      estimatedBalanceDue: cleanEstimatedTotal,
      bookingStatus: "confirmed" as const,
    };
  }

  return {
    reservationPaymentStatus,
    bookingPaymentStatus: "failed" as const,
    depositStatus:
      paymentType === "deposit" && currentDepositStatus === "paid"
        ? ("paid" as const)
        : paymentType === "deposit"
          ? ("failed" as const)
          : ("none" as const),
    depositPaidAmount: paymentType === "deposit" ? cleanCurrentPaid : 0,
    estimatedBalanceDue: Math.max(cleanEstimatedTotal - cleanCurrentPaid, 0),
    bookingStatus: "expired" as const,
  };
}

function mapMercadoPagoReservationPaymentStatus(
  status?: string,
): ReservationPaymentStatus {
  if (status === "approved") return "approved";
  if (status === "rejected") return "rejected";
  if (status === "cancelled") return "cancelled";
  if (status === "refunded" || status === "charged_back") return "refunded";
  if (status === "in_process" || status === "pending" || status === "authorized") {
    return "pending";
  }

  return "failed";
}

function normalizeReservationTotal(value: number) {
  const total = normalizeMoney(value);

  if (total <= 0) {
    throw new Error("El total de la reserva debe ser mayor a cero.");
  }

  return total;
}

function normalizeMoney(value: number) {
  if (!Number.isFinite(value)) return 0;

  return Math.max(Math.round(value), 0);
}
