export type BookingStatus = "confirmed" | "cancelled" | "blocked";
export type PaymentStatus = "pending" | "paid";
export type PaymentMethod = "club" | "transfer" | "cash" | "other";
export type SettlementStatus = "draft" | "closed" | "paid" | "cancelled";
export type MembershipStatus = "active" | "paused" | "cancelled" | "expired";
export type MembershipBenefitType =
  | "free"
  | "percentage_discount"
  | "fixed_price";

export type MetricsOpeningHour = {
  dayOfWeek: number;
  isOpen: boolean;
  openMinutes: number;
  closeMinutes: number;
};

export type MetricsClub = {
  id: string;
  name: string;
  timezone: string;
  openingHours: MetricsOpeningHour[];
};

export type MetricsCourt = {
  id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
};

export type MetricsBooking = {
  id: string;
  code: string;
  localDate: string;
  startMinutes: number;
  endMinutes: number;
  durationMinutes: number;
  courtId: string;
  courtName: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  bookingStatus: BookingStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  value: number;
  createdAt: number;
  cancelledAt?: number;
};

export type MetricsSettlementMemberCharge = {
  customerId: string;
  customerName: string;
  membershipId: string;
  membershipPlanId: string;
  membershipPlanName: string;
  benefitType: MembershipBenefitType;
  discountPercent?: number;
  fixedPrice?: number;
  benefitApplied: boolean;
  baseShareValue: number;
  chargedValue: number;
  discountValue: number;
};

export type MetricsSettlement = {
  id: string;
  bookingId: string;
  status: SettlementStatus;
  baseBookingValue: number;
  finalTotalCollectedValue: number;
  discountAbsorbedByClubValue: number;
  manualAdjustmentAmount: number;
  manualAdjustmentReason?: string;
  paymentMethod?: PaymentMethod;
  memberCharges: MetricsSettlementMemberCharge[];
  paidAt?: number;
  closedAt?: number;
  createdAt: number;
  updatedAt: number;
};

export type MetricsMembership = {
  id: string;
  customerId: string;
  customerName: string;
  planId: string;
  planName: string;
  status: MembershipStatus;
  startsAt: number;
  endsAt?: number;
  createdAt: number;
  cancelledAt?: number;
  monthlyPrice?: number;
};

export type ClubMetricsExportData = {
  club: MetricsClub;
  courts: MetricsCourt[];
  bookings: MetricsBooking[];
  settlements: MetricsSettlement[];
  memberships: MetricsMembership[];
  generatedAt: number;
};

export type MetricsExportParams = {
  startDate: string;
  endDate: string;
  now?: {
    localDate: string;
    currentMinutes: number;
  };
};

export type MetricKey =
  | "reservas"
  | "ingresos"
  | "ocupacion"
  | "horarios"
  | "membresias";
