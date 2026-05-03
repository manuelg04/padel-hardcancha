import { describe, expect, test } from "vitest";

import {
  BOOKING_CODE_RANDOM_BYTES,
  buildPublicAvailabilitySlot,
  buildPublicBookingReceipt,
  formatBookingCode,
  isSeedTokenAuthorized,
  normalizePublicBookingReceiptResponse,
} from "../lib/securityRules";

describe("security rules", () => {
  test("requires an explicit matching seed token", () => {
    expect(isSeedTokenAuthorized(undefined, undefined)).toBe(false);
    expect(isSeedTokenAuthorized("demo", undefined)).toBe(false);
    expect(isSeedTokenAuthorized("demo", "other")).toBe(false);
    expect(isSeedTokenAuthorized("demo", "demo")).toBe(true);
  });

  test("formats booking codes from enough random bytes", () => {
    const bytes = new Uint8Array(BOOKING_CODE_RANDOM_BYTES);
    bytes.set([0, 1, 10, 255]);

    expect(formatBookingCode(bytes)).toMatch(/^RES-[0-9A-F]{32}$/);
    expect(formatBookingCode(bytes)).not.toMatch(/^RES-\d{5}$/);
  });

  test("removes reservation details from player availability slots", () => {
    const sensitiveSlot = {
      courtId: "court-1",
      courtName: "Cancha 1",
      courtDescription: "Techada",
      isCovered: true,
      startMinutes: 18 * 60,
      endMinutes: 19 * 60,
      durationMinutes: 60,
      value: 70000,
      isAvailable: false,
      bookingId: "booking-1",
      bookingStatus: "blocked",
      paymentStatus: "paid",
      customerName: "Cliente privado",
    };

    expect(buildPublicAvailabilitySlot(sensitiveSlot)).toEqual({
      courtId: "court-1",
      courtName: "Cancha 1",
      courtDescription: "Techada",
      isCovered: true,
      startMinutes: 18 * 60,
      endMinutes: 19 * 60,
      durationMinutes: 60,
      value: 70000,
      isAvailable: false,
    });
  });

  test("builds public receipts without personal or internal booking data", () => {
    const receipt = buildPublicBookingReceipt({
      booking: {
        code: "RES-0123456789ABCDEF0123456789ABCDEF",
        localDate: "2026-05-04",
        startMinutes: 18 * 60,
        endMinutes: 19 * 60,
        durationMinutes: 60,
        value: 70000,
        customerName: "Cliente privado",
        customerPhone: "3998887777",
        customerEmail: "cliente@example.com",
        internalNote: "Nota interna",
        paymentStatus: "paid",
      },
      court: { name: "Cancha 1" },
      club: { name: "Match Point", whatsapp: "+573001112222" },
    });

    expect(receipt).toEqual({
      code: "RES-0123456789ABCDEF0123456789ABCDEF",
      localDate: "2026-05-04",
      startMinutes: 18 * 60,
      endMinutes: 19 * 60,
      durationMinutes: 60,
      value: 70000,
      courtName: "Cancha 1",
      clubName: "Match Point",
      clubWhatsapp: "+573001112222",
    });
    expect(JSON.stringify(receipt)).not.toContain("Cliente privado");
    expect(JSON.stringify(receipt)).not.toContain("3998887777");
    expect(JSON.stringify(receipt)).not.toContain("Nota interna");
  });

  test("normalizes legacy full booking responses into public receipts", () => {
    const receipt = normalizePublicBookingReceiptResponse({
      booking: {
        code: "RES-1024",
        localDate: "2026-05-04",
        startMinutes: 18 * 60,
        endMinutes: 19 * 60,
        durationMinutes: 60,
        value: 70000,
        customerName: "Cliente privado",
        customerPhone: "3998887777",
        internalNote: "Nota interna",
      },
      court: { name: "Cancha 1" },
      clubName: "Match Point",
      clubWhatsapp: "+573001112222",
    });

    expect(receipt).toEqual({
      code: "RES-1024",
      localDate: "2026-05-04",
      startMinutes: 18 * 60,
      endMinutes: 19 * 60,
      durationMinutes: 60,
      value: 70000,
      courtName: "Cancha 1",
      clubName: "Match Point",
      clubWhatsapp: "+573001112222",
    });
    expect(JSON.stringify(receipt)).not.toContain("Cliente privado");
    expect(JSON.stringify(receipt)).not.toContain("3998887777");
    expect(JSON.stringify(receipt)).not.toContain("Nota interna");
  });
});
