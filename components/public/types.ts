import type { Id } from "@/convex/_generated/dataModel";

export type PublicClubCardData = {
  _id: Id<"clubs">;
  _creationTime: number;
  name: string;
  slug: string;
  city: string;
  address: string;
  whatsapp: string;
  coverImageUrl: string;
  openingHoursText: string;
  normalPricePerHour: number;
  peakPricePerHour: number;
  weekendPricePerHour: number;
  isFeatured: boolean;
  bookingEnabled: boolean;
  activeCourtCount: number;
};
