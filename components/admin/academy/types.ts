import type { Doc } from "@/convex/_generated/dataModel";

export type AcademyAttendanceDetails = {
  attendance: Doc<"academyClassAttendances">;
  customer: Doc<"customers">;
  packagePurchase: Doc<"academyPackagePurchases"> | null;
};

export type AcademySessionDetails = {
  session: Doc<"academyClassSessions">;
  professor: Doc<"academyProfessors">;
  attendances: AcademyAttendanceDetails[];
};

export type AcademyPackageDetails = {
  packagePurchase: Doc<"academyPackagePurchases">;
  customer: Doc<"customers">;
  plan: Doc<"academyPackagePlans"> | null;
  remainingClasses: number;
};

export type AcademyReports = {
  dailyClasses: AcademySessionDetails[];
  professorReport: {
    professorId: string;
    professorName: string;
    sessions: number;
    studentsServed: number;
    singleClassStudents: number;
    packageStudents: number;
    pendingValidations: number;
  }[];
  revenue: {
    packageSalesRevenue: number;
    singleClassRevenue: number;
    packageClassesConsumed: number;
    totalReceived: number;
  };
  packages: AcademyPackageDetails[];
  pendingValidations: AcademySessionDetails[];
};
