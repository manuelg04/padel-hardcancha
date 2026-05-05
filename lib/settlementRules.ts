import { getLocalDayOfWeek } from "./bookingRules";
import type { MembershipBenefitType } from "./membershipRules";

export type SettlementMemberInput = {
  customerId: string;
  displayName: string;
  membershipId: string;
  membershipPlanId: string;
  membershipPlanName: string;
  benefitType: MembershipBenefitType;
  discountPercent?: number;
  fixedPrice?: number;
  waivesDeposit?: boolean;
  appliesAlways: boolean;
  validDaysOfWeek?: number[];
  validStartTime?: string;
  validEndTime?: string;
};

export type SettlementMemberCharge = {
  customerId: string;
  customerName: string;
  membershipId: string;
  membershipPlanId: string;
  membershipPlanName: string;
  benefitType: MembershipBenefitType;
  discountPercent?: number;
  fixedPrice?: number;
  waivesDeposit?: boolean;
  benefitApplied: boolean;
  benefitNotAppliedReason?: "outside_schedule";
  baseShareValue: number;
  chargedValue: number;
  discountValue: number;
};

export type BookingSettlementCalculation = {
  baseBookingValue: number;
  baseShareValue: number;
  playerSlots: number;
  memberCount: number;
  nonMemberCount: number;
  memberCharges: SettlementMemberCharge[];
  nonMemberUnitValue: number;
  nonMemberTotalValue: number;
  calculatedTotalCollectedValue: number;
  manualAdjustmentAmount: number;
  manualAdjustmentReason?: string;
  finalTotalCollectedValue: number;
  discountAbsorbedByClubValue: number;
  ruleSnapshot: string[];
};

const clockTimePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

const toMoney = (value: number) => Math.round(value);
const toBaseShareMoney = (value: number) => Math.floor(value);

const timeToMinutes = (value: string) => {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
};

const assertPositiveIntegerMoney = (value: number, message: string) => {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
    throw new Error(message);
  }
};

const assertIntegerMoney = (value: number, message: string) => {
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    throw new Error(message);
  }
};

const assertUniqueMembers = (selectedMembers: SettlementMemberInput[]) => {
  const selectedCustomerIds = selectedMembers.map((member) => member.customerId);
  const uniqueCustomerIds = new Set(selectedCustomerIds);

  if (uniqueCustomerIds.size !== selectedCustomerIds.length) {
    throw new Error("No puedes seleccionar el mismo cliente dos veces.");
  }
};

const planAppliesToBookingStart = (
  member: SettlementMemberInput,
  bookingDate: string,
  bookingStartMinutes: number,
) => {
  if (member.appliesAlways) return true;

  const day = getLocalDayOfWeek(bookingDate);
  if (
    member.validDaysOfWeek &&
    member.validDaysOfWeek.length > 0 &&
    !member.validDaysOfWeek.includes(day)
  ) {
    return false;
  }

  if (member.validStartTime && member.validEndTime) {
    if (
      !clockTimePattern.test(member.validStartTime) ||
      !clockTimePattern.test(member.validEndTime)
    ) {
      return false;
    }

    return (
      bookingStartMinutes >= timeToMinutes(member.validStartTime) &&
      bookingStartMinutes < timeToMinutes(member.validEndTime)
    );
  }

  return true;
};

const calculateMemberCharge = ({
  member,
  baseShareValue,
  bookingDate,
  bookingStartMinutes,
}: {
  member: SettlementMemberInput;
  baseShareValue: number;
  bookingDate: string;
  bookingStartMinutes: number;
}): SettlementMemberCharge => {
  const benefitApplied = planAppliesToBookingStart(
    member,
    bookingDate,
    bookingStartMinutes,
  );

  if (!benefitApplied) {
    return {
      customerId: member.customerId,
      customerName: member.displayName,
      membershipId: member.membershipId,
      membershipPlanId: member.membershipPlanId,
      membershipPlanName: member.membershipPlanName,
      benefitType: member.benefitType,
      discountPercent: member.discountPercent,
      fixedPrice: member.fixedPrice,
      waivesDeposit: member.waivesDeposit,
      benefitApplied: false,
      benefitNotAppliedReason: "outside_schedule",
      baseShareValue,
      chargedValue: baseShareValue,
      discountValue: 0,
    };
  }

  if (member.benefitType === "percentage_discount") {
    if (
      member.discountPercent === undefined ||
      !Number.isFinite(member.discountPercent) ||
      member.discountPercent < 0 ||
      member.discountPercent > 100
    ) {
      throw new Error("El descuento debe estar entre 0 y 100.");
    }
  }

  if (member.benefitType === "fixed_price") {
    if (
      member.fixedPrice === undefined ||
      !Number.isFinite(member.fixedPrice) ||
      !Number.isInteger(member.fixedPrice) ||
      member.fixedPrice < 0
    ) {
      throw new Error("El precio fijo no es valido.");
    }

    if (member.fixedPrice > baseShareValue) {
      throw new Error("El precio fijo no puede ser mayor que la base por jugador.");
    }
  }

  const chargedValue =
    member.benefitType === "free"
      ? 0
      : member.benefitType === "percentage_discount"
        ? toMoney(baseShareValue * (1 - (member.discountPercent ?? 0) / 100))
        : toMoney(member.fixedPrice ?? baseShareValue);

  return {
    customerId: member.customerId,
    customerName: member.displayName,
    membershipId: member.membershipId,
    membershipPlanId: member.membershipPlanId,
    membershipPlanName: member.membershipPlanName,
    benefitType: member.benefitType,
    discountPercent: member.discountPercent,
    fixedPrice: member.fixedPrice,
    waivesDeposit: member.waivesDeposit,
    benefitApplied: true,
    baseShareValue,
    chargedValue,
    discountValue: baseShareValue - chargedValue,
  };
};

export const calculateBookingSettlement = ({
  bookingValue,
  bookingDate,
  bookingStartMinutes,
  playerSlots = 4,
  selectedMembers,
  manualAdjustmentAmount,
  manualAdjustmentReason,
}: {
  bookingValue: number;
  bookingDate: string;
  bookingStartMinutes: number;
  playerSlots?: number;
  selectedMembers: SettlementMemberInput[];
  manualAdjustmentAmount?: number;
  manualAdjustmentReason?: string;
}): BookingSettlementCalculation => {
  if (playerSlots !== 4) {
    throw new Error("La liquidacion MVP usa exactamente 4 cupos.");
  }

  assertPositiveIntegerMoney(bookingValue, "El valor de la reserva no es valido.");

  if (selectedMembers.length > playerSlots) {
    throw new Error("No puedes seleccionar mas miembros que cupos.");
  }

  assertUniqueMembers(selectedMembers);

  const adjustment = manualAdjustmentAmount ?? 0;
  assertIntegerMoney(adjustment, "El ajuste manual no es valido.");

  const cleanAdjustmentReason = manualAdjustmentReason?.trim();
  if (adjustment !== 0 && !cleanAdjustmentReason) {
    throw new Error("El ajuste manual requiere una razon.");
  }

  const baseBookingValue = toMoney(bookingValue);
  const baseShareValue = toBaseShareMoney(baseBookingValue / playerSlots);
  const memberCharges = selectedMembers.map((member) =>
    calculateMemberCharge({
      member,
      baseShareValue,
      bookingDate,
      bookingStartMinutes,
    }),
  );
  const memberCount = selectedMembers.length;
  const nonMemberCount = playerSlots - memberCount;
  const nonMemberUnitValue = baseShareValue;
  const nonMemberTotalValue = nonMemberCount * nonMemberUnitValue;
  const calculatedTotalCollectedValue =
    memberCharges.reduce((total, charge) => total + charge.chargedValue, 0) +
    nonMemberTotalValue;
  const manualAdjustmentAmountValue = toMoney(adjustment);
  const finalTotalCollectedValue =
    calculatedTotalCollectedValue + manualAdjustmentAmountValue;
  const discountAbsorbedByClubValue =
    baseBookingValue - finalTotalCollectedValue;

  if (finalTotalCollectedValue < 0) {
    throw new Error("El total final no puede ser negativo.");
  }

  if (discountAbsorbedByClubValue < 0) {
    throw new Error("La liquidacion no permite sobrecargos en este MVP.");
  }

  return {
    baseBookingValue,
    baseShareValue,
    playerSlots,
    memberCount,
    nonMemberCount,
    memberCharges,
    nonMemberUnitValue,
    nonMemberTotalValue,
    calculatedTotalCollectedValue,
    manualAdjustmentAmount: manualAdjustmentAmountValue,
    manualAdjustmentReason: cleanAdjustmentReason || undefined,
    finalTotalCollectedValue,
    discountAbsorbedByClubValue,
    ruleSnapshot: [
      "bookings.value is the full court value",
      "court value is split into 4 base player slots",
      "selected members occupy one slot each",
      "non-members are counted as an aggregate amount",
      "membership benefit is evaluated at booking start time",
      "club absorbs discounts and free benefits",
      "uneven base shares are rounded down and the club absorbs the remainder",
    ],
  };
};
