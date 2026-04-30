import type { Doc, Id } from "@/convex/_generated/dataModel";

import type { AgendaBookingFilter } from "../agendaRules";

export type BookingDoc = Doc<"bookings">;
export type CourtDoc = Doc<"courts">;
export type BookingFilter = AgendaBookingFilter;

export type PaymentStatus = {
  onlinePaymentsEnabled: boolean;
  status: string;
  canManageConnection: boolean;
} | null | undefined;

export type ModalDefaults = {
  courtId?: Id<"courts">;
  localDate: string;
  startMinutes?: number;
};
