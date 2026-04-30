export const DEFAULT_PAYMENT_HOLD_MINUTES = 15;
export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
export const TOKEN_REFRESH_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export type ProviderPaymentStatus =
  | "created"
  | "pending"
  | "approved"
  | "in_process"
  | "rejected"
  | "cancelled"
  | "expired"
  | "refunded"
  | "charged_back"
  | "error";

export type BookingPaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "expired"
  | "refunded"
  | "no_payment_required";

export type BookingStatus =
  | "payment_pending"
  | "confirmed"
  | "cancelled"
  | "expired"
  | "blocked";

export type BookingSource =
  | "online"
  | "manual"
  | "whatsapp"
  | "walk_in"
  | "phone";

export type PaymentLifecycleUpdates = {
  payment: {
    paidAt?: number;
    failedAt?: number;
    refundedAt?: number;
  };
  booking: {
    paymentStatus?: BookingPaymentStatus;
    bookingStatus?: BookingStatus;
    paidAt?: number;
    expiredAt?: number;
  };
};

export const getPaymentHoldMinutes = (paymentHoldMinutes?: number) =>
  paymentHoldMinutes ?? DEFAULT_PAYMENT_HOLD_MINUTES;

export const getPaymentHoldExpiresAt = (
  paymentHoldMinutes: number | undefined,
  now: number,
) => now + getPaymentHoldMinutes(paymentHoldMinutes) * 60 * 1000;

export const mapMercadoPagoStatus = (
  status?: string,
): ProviderPaymentStatus => {
  if (status === "approved") return "approved";
  if (status === "pending") return "pending";
  if (status === "in_process") return "in_process";
  if (status === "rejected") return "rejected";
  if (status === "cancelled") return "cancelled";
  if (status === "refunded") return "refunded";
  if (status === "charged_back") return "charged_back";
  return "error";
};

export const paymentLifecycleUpdatesForProviderStatus = ({
  status,
  bookingStatus,
  source,
  now,
  paidAt,
}: {
  status: ProviderPaymentStatus;
  bookingStatus: BookingStatus;
  source: BookingSource;
  now: number;
  paidAt?: number;
}): PaymentLifecycleUpdates => {
  if (status === "approved") {
    const paymentTime = paidAt ?? now;

    return {
      payment: { paidAt: paymentTime },
      booking: {
        paymentStatus: "paid",
        bookingStatus: "confirmed",
        paidAt: paymentTime,
      },
    };
  }

  if (status === "pending" || status === "in_process") {
    return {
      payment: {},
      booking: {
        paymentStatus: "pending",
        bookingStatus: source === "online" ? "payment_pending" : undefined,
      },
    };
  }

  if (status === "rejected" || status === "cancelled") {
    return {
      payment: { failedAt: now },
      booking: {
        paymentStatus: "failed",
        bookingStatus: "expired",
        expiredAt: now,
      },
    };
  }

  if (status === "refunded") {
    return {
      payment: { refundedAt: now },
      booking: { paymentStatus: "refunded" },
    };
  }

  if (status === "charged_back") {
    return {
      payment: { failedAt: now },
      booking: { paymentStatus: "failed" },
    };
  }

  if (status === "expired" || status === "error") {
    return {
      payment: { failedAt: now },
      booking: {
        paymentStatus: status === "expired" ? "expired" : "failed",
        bookingStatus:
          bookingStatus === "payment_pending" ? "expired" : undefined,
        expiredAt: bookingStatus === "payment_pending" ? now : undefined,
      },
    };
  }

  return { payment: {}, booking: {} };
};
