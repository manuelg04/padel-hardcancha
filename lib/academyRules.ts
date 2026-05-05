export type AcademyProfessorStatus = "active" | "inactive";
export type AcademyPackageStatus =
  | "active"
  | "exhausted"
  | "expired"
  | "cancelled";
export type AcademySessionStatus = "registered" | "completed" | "cancelled";
export type AcademyAttendanceStatus =
  | "registered"
  | "student_confirmed"
  | "professor_validated"
  | "completed"
  | "cancelled";
export type AcademyPaymentType = "single" | "package";
export type AcademyPaymentStatus = "pending" | "paid" | "not_required";
export type AcademyClassType = "private" | "group" | "other";

export type AcademyPackageLike = {
  clubId: string;
  customerId: string;
  totalClasses: number;
  usedClasses: number;
  status: AcademyPackageStatus;
  expiresAt?: number;
};

export type AcademyAttendanceLike = {
  clubId: string;
  customerId: string;
  paymentType: AcademyPaymentType;
  packagePurchaseId?: string;
  studentConfirmedAt?: number;
  professorValidatedAt?: number;
  packageConsumedAt?: number;
  packageConsumptionRevertedAt?: number;
  status: AcademyAttendanceStatus;
};

export type AcademyRevenueAttendance = {
  paymentType: AcademyPaymentType;
  singleClassPrice?: number;
  paymentStatus: AcademyPaymentStatus;
  status: AcademyAttendanceStatus;
  packageConsumedAt?: number;
};

export type AcademyPackageSale = {
  amountPaid: number;
  status: AcademyPackageStatus;
};

const clockTimePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

const hasInvalidWholeMoney = (value: number) =>
  !Number.isFinite(value) || value < 0 || !Number.isInteger(value);

export function validateProfessorInput(input: {
  name: string;
  email?: string;
  phone?: string;
}) {
  const errors: string[] = [];

  if (!input.name.trim()) {
    errors.push("El nombre del profesor es obligatorio.");
  }

  if (input.email && !input.email.includes("@")) {
    errors.push("El email del profesor no es valido.");
  }

  return errors;
}

export function validatePackagePlanInput(input: {
  name: string;
  classesCount: number;
  price: number;
  validityDays?: number;
}) {
  const errors: string[] = [];

  if (!input.name.trim()) {
    errors.push("El nombre del paquete es obligatorio.");
  }

  if (!Number.isInteger(input.classesCount) || input.classesCount <= 0) {
    errors.push("La cantidad de clases debe ser mayor a cero.");
  }

  if (hasInvalidWholeMoney(input.price)) {
    errors.push("El precio debe estar en pesos enteros y no puede ser negativo.");
  }

  if (
    input.validityDays !== undefined &&
    (!Number.isInteger(input.validityDays) || input.validityDays <= 0)
  ) {
    errors.push("La vigencia debe estar expresada en dias positivos.");
  }

  return errors;
}

export function validatePackageSaleInput(input: {
  totalClasses: number;
  amountPaid: number;
  purchasedAt: number;
  expiresAt?: number;
}) {
  const errors: string[] = [];

  if (!Number.isInteger(input.totalClasses) || input.totalClasses <= 0) {
    errors.push("La cantidad de clases compradas debe ser mayor a cero.");
  }

  if (hasInvalidWholeMoney(input.amountPaid)) {
    errors.push("El valor pagado debe estar en pesos enteros y no puede ser negativo.");
  }

  if (!Number.isFinite(input.purchasedAt)) {
    errors.push("La fecha de compra no es valida.");
  }

  if (
    input.expiresAt !== undefined &&
    (!Number.isFinite(input.expiresAt) || input.expiresAt <= input.purchasedAt)
  ) {
    errors.push("La fecha de vencimiento debe ser posterior a la compra.");
  }

  return errors;
}

export function validateSessionInput(input: {
  localDate: string;
  startTime: string;
  endTime?: string;
}) {
  const errors: string[] = [];

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.localDate)) {
    errors.push("La fecha debe estar en formato YYYY-MM-DD.");
  }

  if (!clockTimePattern.test(input.startTime)) {
    errors.push("La hora inicial debe usar formato HH:MM.");
  }

  if (input.endTime !== undefined && !clockTimePattern.test(input.endTime)) {
    errors.push("La hora final debe usar formato HH:MM.");
  }

  if (
    input.endTime !== undefined &&
    clockTimePattern.test(input.startTime) &&
    clockTimePattern.test(input.endTime) &&
    input.endTime <= input.startTime
  ) {
    errors.push("La hora final debe ser posterior a la hora inicial.");
  }

  return errors;
}

export function getRemainingClasses(pkg: Pick<AcademyPackageLike, "totalClasses" | "usedClasses">) {
  return Math.max(0, pkg.totalClasses - pkg.usedClasses);
}

export function isPackageUsableForAttendance(
  pkg: AcademyPackageLike,
  attendance: Pick<AcademyAttendanceLike, "clubId" | "customerId">,
  now: number,
) {
  if (pkg.clubId !== attendance.clubId) return false;
  if (pkg.customerId !== attendance.customerId) return false;
  if (pkg.status !== "active") return false;
  if (pkg.expiresAt !== undefined && pkg.expiresAt <= now) return false;
  return getRemainingClasses(pkg) > 0;
}

export function getPackageUnavailableReason(
  pkg: AcademyPackageLike,
  attendance: Pick<AcademyAttendanceLike, "clubId" | "customerId">,
  now: number,
) {
  if (pkg.clubId !== attendance.clubId) return "PACKAGE_OTHER_CLUB";
  if (pkg.customerId !== attendance.customerId) return "PACKAGE_OTHER_CUSTOMER";
  if (pkg.status === "cancelled") return "PACKAGE_CANCELLED";
  if (pkg.status === "expired") return "PACKAGE_EXPIRED";
  if (pkg.status === "exhausted") return "PACKAGE_EXHAUSTED";
  if (pkg.expiresAt !== undefined && pkg.expiresAt <= now) return "PACKAGE_EXPIRED";
  if (getRemainingClasses(pkg) <= 0) return "PACKAGE_NO_BALANCE";
  return null;
}

export function statusAfterConfirmation(attendance: AcademyAttendanceLike) {
  if (attendance.status === "cancelled") return "cancelled";
  if (attendance.studentConfirmedAt && attendance.professorValidatedAt) {
    return "completed";
  }
  if (attendance.studentConfirmedAt) return "student_confirmed";
  if (attendance.professorValidatedAt) return "professor_validated";
  return "registered";
}

export function shouldConsumePackage(attendance: AcademyAttendanceLike) {
  return (
    attendance.paymentType === "package" &&
    statusAfterConfirmation(attendance) === "completed" &&
    attendance.packageConsumedAt === undefined &&
    attendance.packageConsumptionRevertedAt === undefined
  );
}

export function shouldRestorePackage(attendance: AcademyAttendanceLike) {
  return (
    attendance.paymentType === "package" &&
    attendance.packageConsumedAt !== undefined &&
    attendance.packageConsumptionRevertedAt === undefined
  );
}

export function nextPackageStatus(pkg: Pick<AcademyPackageLike, "totalClasses" | "usedClasses" | "status">) {
  if (pkg.status === "cancelled") return "cancelled";
  return getRemainingClasses(pkg) <= 0 ? "exhausted" : "active";
}

export function calculateAcademyRevenue(input: {
  packageSales: AcademyPackageSale[];
  attendances: AcademyRevenueAttendance[];
}) {
  const packageSalesRevenue = input.packageSales
    .filter((sale) => sale.status !== "cancelled")
    .reduce((total, sale) => total + sale.amountPaid, 0);
  const singleClassRevenue = input.attendances
    .filter(
      (attendance) =>
        attendance.paymentType === "single" &&
        attendance.paymentStatus === "paid" &&
        attendance.status !== "cancelled",
    )
    .reduce((total, attendance) => total + (attendance.singleClassPrice ?? 0), 0);
  const packageClassesConsumed = input.attendances.filter(
    (attendance) =>
      attendance.paymentType === "package" &&
      attendance.status === "completed" &&
      attendance.packageConsumedAt !== undefined,
  ).length;

  return {
    packageSalesRevenue,
    singleClassRevenue,
    packageClassesConsumed,
    totalReceived: packageSalesRevenue + singleClassRevenue,
  };
}

export function buildProfessorRecord<TClubId extends string, TUserId extends string>({
  clubId,
  name,
  email,
  phone,
  userId,
  now,
}: {
  clubId: TClubId;
  name: string;
  email?: string;
  phone?: string;
  userId?: TUserId;
  now: number;
}) {
  return {
    clubId,
    name: name.trim(),
    email: email?.trim() || undefined,
    phone: phone?.trim() || undefined,
    userId,
    status: "active" as const,
    createdAt: now,
    updatedAt: now,
  };
}

export function buildPackagePurchaseRecord<
  TClubId extends string,
  TCustomerId extends string,
  TPlanId extends string,
  TUserId extends string,
>({
  clubId,
  customerId,
  packagePlanId,
  name,
  totalClasses,
  amountPaid,
  purchasedAt,
  expiresAt,
  createdByUserId,
  now,
}: {
  clubId: TClubId;
  customerId: TCustomerId;
  packagePlanId?: TPlanId;
  name: string;
  totalClasses: number;
  amountPaid: number;
  purchasedAt: number;
  expiresAt?: number;
  createdByUserId: TUserId;
  now: number;
}) {
  return {
    clubId,
    customerId,
    packagePlanId,
    name: name.trim(),
    totalClasses,
    usedClasses: 0,
    amountPaid,
    purchasedAt,
    expiresAt,
    status: "active" as const,
    createdByUserId,
    createdAt: now,
    updatedAt: now,
  };
}
