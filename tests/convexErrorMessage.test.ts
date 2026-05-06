import { describe, expect, test } from "vitest";

import { userFacingConvexErrorMessage } from "../lib/convexErrorMessage";

describe("userFacingConvexErrorMessage", () => {
  test("extracts the readable message from ConvexError JSON", () => {
    const error = new Error(
      '[CONVEX A(clubSetup:superAdminCreateClubWithAdmin)] Server Error Uncaught ConvexError: {"code":"ADMIN_EMAIL_EXISTS","message":"Ese email ya tiene una cuenta."} at handler (../convex/clubSetup.ts:68:8) Called by client',
    );

    expect(userFacingConvexErrorMessage(error, "No se pudo guardar.")).toBe(
      "Ese email ya tiene una cuenta.",
    );
  });

  test("falls back to the normal error message", () => {
    expect(
      userFacingConvexErrorMessage(
        new Error("No encontramos el club."),
        "No se pudo guardar.",
      ),
    ).toBe("No encontramos el club.");
  });

  test("uses the fallback for unknown errors", () => {
    expect(userFacingConvexErrorMessage("x", "No se pudo guardar.")).toBe(
      "No se pudo guardar.",
    );
  });
});
