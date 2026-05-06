export type DepositMode = "optional";
export type DepositStatus = "none" | "pending" | "paid" | "failed" | "refunded";
export type PaymentOptionSelected =
  | "pay_at_club"
  | "deposit_online"
  | "full_payment_online";
export type ReservationPaymentStatus =
  | "created"
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled"
  | "refunded"
  | "failed"
  | "superseded";

export type ClubDepositSettings = {
  onlineDepositsEnabled?: boolean;
  depositMode?: DepositMode;
  depositType?: "percentage" | "fixed";
  depositPercentage?: number;
  depositFixedAmount?: number | null;
  depositMinAmount?: number;
  depositMaxAmount?: number;
  depositRoundingAmount?: number;
  depositApplyAfterMembershipDiscounts?: boolean;
  allowPayAtClub?: boolean;
};

export type DepositCalculationInput = {
  baseReservationTotal: number;
  estimatedMembershipDiscount: number;
  playerHasDepositWaiver: boolean;
  clubDepositSettings: ClubDepositSettings;
};

export type DepositCalculationResult = {
  estimatedPayableTotal: number;
  depositAmount: number;
};

export type DepositWebhookStateInput = {
  currentDepositStatus: DepositStatus;
  currentDepositPaidAmount: number;
  estimatedTotal: number;
  paymentAmount: number;
  providerStatus: string;
};

export type DepositWebhookStateResult = {
  paymentStatus: ReservationPaymentStatus;
  depositStatus: DepositStatus;
  depositPaidAmount: number;
  estimatedBalanceDue: number;
};

export type MembershipDepositEstimateInput = {
  baseReservationTotal: number;
  playerSlots?: number;
  bookingDate: string;
  bookingStartMinutes: number;
  membership:
    | {
        membershipId: string;
        membershipPlanId: string;
        membershipPlanName: string;
        benefitType: "free" | "percentage_discount" | "fixed_price";
        discountPercent?: number;
        fixedPrice?: number;
        waivesDeposit?: boolean;
        appliesAlways: boolean;
        validDaysOfWeek?: number[];
        validStartTime?: string;
        validEndTime?: string;
      }
    | null;
};

export type MembershipDepositEstimate = {
  estimatedMembershipDiscount: number;
  playerHasDepositWaiver: boolean;
  membershipSnapshot: null | {
    applied: boolean;
    membershipId: string;
    membershipPlanId: string;
    membershipPlanName: string;
    benefitType: "free" | "percentage_discount" | "fixed_price";
    discountPercent?: number;
    fixedPrice?: number;
    waivesDeposit?: boolean;
    baseShareValue: number;
    estimatedDiscount: number;
  };
};

export const DEFAULT_DEPOSIT_SETTINGS = {
  onlineDepositsEnabled: false,
};

export function normalizeDepositSettings(settings: ClubDepositSettings) {
  const merged = {
    ...DEFAULT_DEPOSIT_SETTINGS,
    ...settings,
  };

  return {
    onlineDepositsEnabled: Boolean(merged.onlineDepositsEnabled),
  };
}

export function calculateSuggestedDeposit({
  baseReservationTotal,
  estimatedMembershipDiscount,
  playerHasDepositWaiver,
}: DepositCalculationInput): DepositCalculationResult {
  const estimatedPayableTotal = clampMoney(
    baseReservationTotal - estimatedMembershipDiscount,
  );

  if (estimatedPayableTotal <= 0 || playerHasDepositWaiver) {
    return { estimatedPayableTotal, depositAmount: 0 };
  }

  return {
    estimatedPayableTotal,
    depositAmount: calculateOnlineDepositAmount(estimatedPayableTotal),
  };
}

export function calculateOnlineDepositAmount(totalReservationAmount: number) {
  const total = clampMoney(totalReservationAmount);
  if (total <= 0) return 0;

  const depositAmount = Math.max(Math.round(total * 0.25), 1);

  return Math.min(depositAmount, total);
}

export function estimateMembershipForDeposit({
  baseReservationTotal,
  playerSlots = 4,
  bookingDate,
  bookingStartMinutes,
  membership,
}: MembershipDepositEstimateInput): MembershipDepositEstimate {
  const baseShareValue = Math.floor(clampMoney(baseReservationTotal) / playerSlots);

  if (!membership) {
    return {
      estimatedMembershipDiscount: 0,
      playerHasDepositWaiver: false,
      membershipSnapshot: null,
    };
  }

  const applied = membershipAppliesToBookingStart(
    membership,
    bookingDate,
    bookingStartMinutes,
  );
  const estimatedDiscount = applied
    ? estimateMemberDiscount(baseShareValue, membership)
    : 0;

  return {
    estimatedMembershipDiscount: estimatedDiscount,
    playerHasDepositWaiver: applied && Boolean(membership.waivesDeposit),
    membershipSnapshot: {
      applied,
      membershipId: membership.membershipId,
      membershipPlanId: membership.membershipPlanId,
      membershipPlanName: membership.membershipPlanName,
      benefitType: membership.benefitType,
      discountPercent: membership.discountPercent,
      fixedPrice: membership.fixedPrice,
      waivesDeposit: membership.waivesDeposit,
      baseShareValue,
      estimatedDiscount,
    },
  };
}

export function mapMercadoPagoDepositStatus(status?: string) {
  if (status === "approved") return "approved" as const;
  if (status === "rejected") return "rejected" as const;
  if (status === "cancelled") return "cancelled" as const;
  if (status === "refunded" || status === "charged_back") return "refunded" as const;
  if (status === "in_process" || status === "pending" || status === "authorized") {
    return "pending" as const;
  }

  return "failed" as const;
}

export function applyDepositWebhookState({
  currentDepositStatus,
  currentDepositPaidAmount,
  estimatedTotal,
  paymentAmount,
  providerStatus,
}: DepositWebhookStateInput): DepositWebhookStateResult {
  const paymentStatus = mapMercadoPagoDepositStatus(providerStatus);
  const cleanEstimatedTotal = clampMoney(estimatedTotal);
  const cleanCurrentPaid = clampMoney(currentDepositPaidAmount);
  const cleanPaymentAmount = clampMoney(paymentAmount);

  if (paymentStatus === "approved") {
    const paidAmount =
      currentDepositStatus === "paid" && cleanCurrentPaid > 0
        ? cleanCurrentPaid
        : cleanPaymentAmount;

    return {
      paymentStatus,
      depositStatus: "paid",
      depositPaidAmount: paidAmount,
      estimatedBalanceDue: Math.max(cleanEstimatedTotal - paidAmount, 0),
    };
  }

  if (paymentStatus === "pending") {
    return {
      paymentStatus,
      depositStatus: currentDepositStatus === "paid" ? "paid" : "pending",
      depositPaidAmount: cleanCurrentPaid,
      estimatedBalanceDue: Math.max(cleanEstimatedTotal - cleanCurrentPaid, 0),
    };
  }

  if (paymentStatus === "refunded") {
    return {
      paymentStatus,
      depositStatus: "refunded",
      depositPaidAmount: 0,
      estimatedBalanceDue: cleanEstimatedTotal,
    };
  }

  return {
    paymentStatus,
    depositStatus: currentDepositStatus === "paid" ? "paid" : "failed",
    depositPaidAmount: cleanCurrentPaid,
    estimatedBalanceDue: Math.max(cleanEstimatedTotal - cleanCurrentPaid, 0),
  };
}

export function calculateFinalBalanceDue(finalTotal: number, depositPaidAmount: number) {
  return Math.max(clampMoney(finalTotal) - clampMoney(depositPaidAmount), 0);
}

function clampMoney(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(Math.round(value), 0);
}

function estimateMemberDiscount(
  baseShareValue: number,
  membership: NonNullable<MembershipDepositEstimateInput["membership"]>,
) {
  if (membership.benefitType === "free") {
    return baseShareValue;
  }

  if (membership.benefitType === "percentage_discount") {
    const percent = Math.min(Math.max(membership.discountPercent ?? 0, 0), 100);
    return clampMoney(baseShareValue * (percent / 100));
  }

  const fixedPrice = Math.min(
    Math.max(membership.fixedPrice ?? baseShareValue, 0),
    baseShareValue,
  );
  return clampMoney(baseShareValue - fixedPrice);
}

function membershipAppliesToBookingStart(
  membership: NonNullable<MembershipDepositEstimateInput["membership"]>,
  bookingDate: string,
  bookingStartMinutes: number,
) {
  if (membership.appliesAlways) return true;

  const [year, month, day] = bookingDate.split("-").map(Number);
  const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay();

  if (
    membership.validDaysOfWeek &&
    membership.validDaysOfWeek.length > 0 &&
    !membership.validDaysOfWeek.includes(dayOfWeek)
  ) {
    return false;
  }

  if (membership.validStartTime && membership.validEndTime) {
    return (
      bookingStartMinutes >= clockTimeToMinutes(membership.validStartTime) &&
      bookingStartMinutes < clockTimeToMinutes(membership.validEndTime)
    );
  }

  return true;
}

function clockTimeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}
