export type MembershipBenefitType =
  | "free"
  | "percentage_discount"
  | "fixed_price";

export type CustomerMembershipStatus =
  | "active"
  | "paused"
  | "cancelled"
  | "expired";

type MembershipPlanInput = {
  name: string;
  description?: string;
  monthlyPrice?: number;
  benefitType: MembershipBenefitType;
  discountPercent?: number;
  fixedPrice?: number;
  waivesDeposit?: boolean;
  appliesAlways: boolean;
  validDaysOfWeek?: number[];
  validStartTime?: string;
  validEndTime?: string;
};

type MembershipLike<TClubId extends string, TCustomerId extends string> = {
  clubId: TClubId;
  customerId: TCustomerId;
  status: CustomerMembershipStatus;
  startsAt: number;
  endsAt?: number;
};

type MembershipPlanStatusLike = {
  isActive: boolean;
};

const clockTimePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

const clockTimeToMinutes = (value: string) => {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
};

const isValidClockTime = (value: string) => clockTimePattern.test(value);

const hasInvalidMoney = (value?: number) =>
  value !== undefined && (!Number.isFinite(value) || value < 0);

const hasNonIntegerMoney = (value?: number) =>
  value !== undefined &&
  Number.isFinite(value) &&
  value >= 0 &&
  !Number.isInteger(value);

export const validateMembershipPlanInput = (input: MembershipPlanInput) => {
  const errors: string[] = [];

  if (!input.name.trim()) {
    errors.push("El nombre del plan es obligatorio.");
  }

  if (hasInvalidMoney(input.monthlyPrice)) {
    errors.push("El precio mensual no puede ser negativo.");
  } else if (hasNonIntegerMoney(input.monthlyPrice)) {
    errors.push("El precio mensual debe estar en pesos enteros.");
  }

  if (input.benefitType === "percentage_discount") {
    if (
      input.discountPercent === undefined ||
      !Number.isFinite(input.discountPercent) ||
      input.discountPercent < 0 ||
      input.discountPercent > 100
    ) {
      errors.push("El descuento debe estar entre 0 y 100.");
    }
  }

  if (input.benefitType === "fixed_price") {
    if (input.fixedPrice === undefined || hasInvalidMoney(input.fixedPrice)) {
      errors.push("El precio fijo no puede ser negativo.");
    } else if (hasNonIntegerMoney(input.fixedPrice)) {
      errors.push("El precio fijo debe estar en pesos enteros.");
    }
  } else if (hasInvalidMoney(input.fixedPrice)) {
    errors.push("El precio fijo no puede ser negativo.");
  } else if (hasNonIntegerMoney(input.fixedPrice)) {
    errors.push("El precio fijo debe estar en pesos enteros.");
  }

  if (
    input.validDaysOfWeek?.some(
      (day) => !Number.isInteger(day) || day < 0 || day > 6,
    )
  ) {
    errors.push("Los dias validos deben estar entre 0 y 6.");
  }

  if (input.validStartTime !== undefined && !isValidClockTime(input.validStartTime)) {
    errors.push("La hora inicial debe usar formato HH:MM.");
  }

  if (input.validEndTime !== undefined && !isValidClockTime(input.validEndTime)) {
    errors.push("La hora final debe usar formato HH:MM.");
  }

  if (
    input.validStartTime !== undefined &&
    input.validEndTime !== undefined &&
    isValidClockTime(input.validStartTime) &&
    isValidClockTime(input.validEndTime) &&
    clockTimeToMinutes(input.validEndTime) <= clockTimeToMinutes(input.validStartTime)
  ) {
    errors.push("La hora final debe ser posterior a la hora inicial.");
  }

  return errors;
};

export const isMembershipPlanUsable = (plan: MembershipPlanStatusLike) =>
  plan.isActive;

export const isCustomerMembershipActive = <
  TClubId extends string,
  TCustomerId extends string,
>(
  membership: MembershipLike<TClubId, TCustomerId>,
  now: number,
) =>
  membership.status === "active" &&
  membership.startsAt <= now &&
  (membership.endsAt === undefined || membership.endsAt > now);

export const findActiveCustomerMembership = <
  TMembership extends MembershipLike<string, string>,
>(
  memberships: TMembership[],
  {
    clubId,
    customerId,
    now,
  }: {
    clubId: string;
    customerId: string;
    now: number;
  },
) =>
  memberships.find(
    (membership) =>
      membership.clubId === clubId &&
      membership.customerId === customerId &&
      isCustomerMembershipActive(membership, now),
  ) ?? null;

const membershipPeriodEnd = (membership: MembershipLike<string, string>) =>
  membership.endsAt ?? Number.POSITIVE_INFINITY;

const membershipPeriodsOverlap = (
  first: MembershipLike<string, string>,
  second: MembershipLike<string, string>,
) =>
  first.startsAt < membershipPeriodEnd(second) &&
  second.startsAt < membershipPeriodEnd(first);

export const findOverlappingActiveMembership = <
  TMembership extends MembershipLike<string, string> & { _id?: string },
  TCandidate extends MembershipLike<string, string> & { _id?: string },
>(
  memberships: TMembership[],
  candidate: TCandidate,
  options?: { excludeMembershipId?: string },
) => {
  if (candidate.status !== "active") return null;

  return (
    memberships.find((membership) => {
      if (membership.status !== "active") return false;
      if (membership.clubId !== candidate.clubId) return false;
      if (membership.customerId !== candidate.customerId) return false;
      if (
        options?.excludeMembershipId &&
        membership._id === options.excludeMembershipId
      ) {
        return false;
      }

      return membershipPeriodsOverlap(membership, candidate);
    }) ?? null
  );
};

export const buildCustomerMembershipRecord = <
  TClubId extends string,
  TCustomerId extends string,
  TUserId extends string,
  TPlanId extends string,
>({
  clubId,
  customerId,
  userId,
  membershipPlanId,
  status = "active",
  startsAt,
  endsAt,
  notes,
  now,
}: {
  clubId: TClubId;
  customerId: TCustomerId;
  userId?: TUserId;
  membershipPlanId: TPlanId;
  status?: CustomerMembershipStatus;
  startsAt: number;
  endsAt?: number;
  notes?: string;
  now: number;
}) => ({
  clubId,
  customerId,
  userId,
  membershipPlanId,
  status,
  startsAt,
  endsAt,
  createdAt: now,
  updatedAt: now,
  cancelledAt: status === "cancelled" ? now : undefined,
  notes: notes?.trim() || undefined,
});
