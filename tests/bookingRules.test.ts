import { describe, expect, it } from "vitest";

import {
  formatDateLong,
  formatDateShort,
} from "../lib/dates";

import {
  bookingOverlaps,
  calculateBookingValue,
  getNextBookableSlotStartMinutes,
  getLocalDayOfWeek,
  isSlotAvailableForDuration,
  isSlotStartBookable,
} from "../lib/bookingRules";

const pricing = {
  normalPricePerHour: 60000,
  peakPricePerHour: 75000,
  weekendPricePerHour: 70000,
  peakStartMinutes: 17 * 60,
  peakEndMinutes: 21 * 60,
};

describe("booking pricing", () => {
  it("calculates weekday normal plus peak pricing hour by hour", () => {
    expect(calculateBookingValue("2026-05-04", 16 * 60, 120, pricing)).toBe(
      135000,
    );
  });

  it("calculates weekday peak plus normal pricing hour by hour", () => {
    expect(calculateBookingValue("2026-05-04", 20 * 60, 120, pricing)).toBe(
      135000,
    );
  });

  it("uses weekend pricing for every hour on Saturday and Sunday", () => {
    expect(calculateBookingValue("2026-05-02", 19 * 60, 120, pricing)).toBe(
      140000,
    );
  });
});

describe("availability rules", () => {
  const activeBookings = [
    { startMinutes: 18 * 60, endMinutes: 19 * 60, bookingStatus: "confirmed" },
    { startMinutes: 20 * 60, endMinutes: 22 * 60, bookingStatus: "blocked" },
    { startMinutes: 7 * 60, endMinutes: 8 * 60, bookingStatus: "cancelled" },
  ] as const;

  it("detects overlaps with confirmed and blocked bookings", () => {
    expect(bookingOverlaps(activeBookings[0], 17 * 60 + 30, 18 * 60 + 30)).toBe(
      true,
    );
    expect(bookingOverlaps(activeBookings[1], 21 * 60, 22 * 60)).toBe(true);
  });

  it("allows slots that only overlap cancelled bookings", () => {
    expect(isSlotAvailableForDuration(7 * 60, 120, activeBookings)).toBe(true);
  });

  it("requires both consecutive hours to be free for a two-hour reservation", () => {
    expect(isSlotAvailableForDuration(17 * 60, 120, activeBookings)).toBe(
      false,
    );
    expect(isSlotAvailableForDuration(8 * 60, 120, activeBookings)).toBe(true);
  });
});

describe("past-time cutoff rules", () => {
  const mondayAtSixFifteenBogota = new Date("2026-05-04T23:15:00.000Z");
  const mondayAtSixBogota = new Date("2026-05-04T23:00:00.000Z");

  it("blocks same-day slots that already started and allows the next slot", () => {
    expect(
      isSlotStartBookable(
        "2026-05-04",
        18 * 60,
        mondayAtSixFifteenBogota,
      ),
    ).toBe(false);
    expect(
      isSlotStartBookable(
        "2026-05-04",
        17 * 60,
        mondayAtSixFifteenBogota,
      ),
    ).toBe(false);
    expect(
      isSlotStartBookable(
        "2026-05-04",
        19 * 60,
        mondayAtSixFifteenBogota,
      ),
    ).toBe(true);
  });

  it("blocks the slot that starts exactly at the current time", () => {
    expect(
      isSlotStartBookable("2026-05-04", 18 * 60, mondayAtSixBogota),
    ).toBe(false);
    expect(
      getNextBookableSlotStartMinutes(
        6 * 60,
        23 * 60,
        "2026-05-04",
        mondayAtSixBogota,
      ),
    ).toBe(19 * 60);
  });

  it("does not block future dates based on today's current time", () => {
    expect(
      isSlotStartBookable(
        "2026-05-05",
        6 * 60,
        mondayAtSixFifteenBogota,
      ),
    ).toBe(true);
    expect(
      getNextBookableSlotStartMinutes(
        6 * 60,
        23 * 60,
        "2026-05-05",
        mondayAtSixFifteenBogota,
      ),
    ).toBe(6 * 60);
  });

  it("blocks all slots on dates before today", () => {
    expect(
      isSlotStartBookable(
        "2026-05-03",
        22 * 60,
        mondayAtSixFifteenBogota,
      ),
    ).toBe(false);
    expect(
      getNextBookableSlotStartMinutes(
        6 * 60,
        23 * 60,
        "2026-05-03",
        mondayAtSixFifteenBogota,
      ),
    ).toBe(null);
  });
});

describe("local date helpers", () => {
  it("maps local dates to the correct day of week", () => {
    expect(getLocalDayOfWeek("2026-05-02")).toBe(6);
    expect(getLocalDayOfWeek("2026-05-03")).toBe(0);
    expect(getLocalDayOfWeek("2026-05-04")).toBe(1);
  });

  it("formats local dates without shifting them one day earlier", () => {
    expect(formatDateLong("2026-04-30")).toContain("30 de abril");
    expect(formatDateShort("2026-05-01")).toContain("1");
  });
});
