import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

import { getPublicOnlineBookingRequiredError } from "../lib/reservationPaymentOptionRules";

const root = process.cwd();

function readProjectFile(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("public online payment guards", () => {
  test("the public confirmation client cannot call the offline booking mutation", () => {
    const source = readProjectFile("components/player/ConfirmClient.tsx");

    expect(source).not.toContain("api.bookings.createOnlineBooking");
    expect(source).not.toMatch(/paymentMethod:\s*option/);
    expect(source).not.toMatch(/Pago en club/i);
    expect(source).not.toContain("Transferencia");
  });

  test("public booking screens do not advertise offline payment fallbacks", () => {
    const publicCopy = [
      readProjectFile("components/public/ClubPublicPage.tsx"),
      readProjectFile("components/player/ReserveClient.tsx"),
      readProjectFile("components/player/ReservationClient.tsx"),
    ].join("\n");

    expect(publicCopy).not.toMatch(/pago en club/i);
    expect(publicCopy).not.toMatch(/pago en el club/i);
    expect(publicCopy).not.toMatch(/transferencia/i);
    expect(publicCopy).not.toMatch(/pagar en el club/i);
  });

  test("online payment actions do not accept client-controlled payment amounts", () => {
    const source = readProjectFile("convex/payments.ts");
    const argsBlock = source.match(/const onlineDepositBookingArgs = \{[\s\S]*?\};/)?.[0] ?? "";

    expect(argsBlock).not.toMatch(/\bamount\b/);
    expect(argsBlock).not.toMatch(/\bdepositAmount\b/);
    expect(argsBlock).not.toMatch(/\bfullPaymentAmount\b/);
    expect(source).toContain("calculateReservationDepositAmount(deposit.estimatedPayableTotal)");
    expect(source).toContain("amount: estimate.estimatedTotal");
  });

  test("the old public booking mutation rejects attempts to skip online payment", () => {
    const source = readProjectFile("convex/bookings.ts");

    expect(getPublicOnlineBookingRequiredError()).toEqual({
      code: "ONLINE_PAYMENT_REQUIRED",
      message: "Las reservas online requieren pago.",
    });
    expect(source).toContain("getPublicOnlineBookingRequiredError");
  });

  test("online payment reservations stay pending until Mercado Pago approves them", () => {
    const source = readProjectFile("convex/payments.ts");

    expect(source).toMatch(/paymentMethod:\s*"mercadopago"/);
    expect(source).toMatch(/bookingStatus:\s*"payment_pending"/);
    expect(source).toMatch(/paymentStatus:\s*"pending"/);
    expect(source).not.toMatch(/bookingStatus:\s*"confirmed"[\s\S]{0,120}paymentOptionSelected:\s*"deposit_online"/);
    expect(source).not.toMatch(/bookingStatus:\s*"confirmed"[\s\S]{0,120}paymentOptionSelected:\s*"full_payment_online"/);
  });
});
