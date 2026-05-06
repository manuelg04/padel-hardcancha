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

  test("club config does not expose legacy deposit tuning controls", () => {
    const source = readProjectFile("components/admin/ConfigClient.tsx");

    expect(source).not.toMatch(/Reglas del anticipo opcional/i);
    expect(source).not.toMatch(/Porcentaje/i);
    expect(source).not.toMatch(/Valor fijo/i);
    expect(source).not.toMatch(/Minimo/i);
    expect(source).not.toMatch(/Maximo/i);
    expect(source).not.toMatch(/Redondeo/i);
    expect(source).not.toMatch(/Calcular despues de beneficios de membresia/i);
    expect(source).not.toMatch(/Permitir reservar sin anticipo/i);
    expect(source).not.toContain("depositType");
    expect(source).not.toContain("depositPercentage");
    expect(source).not.toContain("depositFixedAmount");
    expect(source).not.toContain("depositMinAmount");
    expect(source).not.toContain("depositMaxAmount");
    expect(source).not.toContain("depositRoundingAmount");
    expect(source).not.toContain("allowPayAtClub");
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
