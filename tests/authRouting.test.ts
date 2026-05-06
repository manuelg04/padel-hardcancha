import { describe, expect, test } from "vitest";

import { choosePostLoginPath, shouldHandleConvexAuthCode } from "../lib/authRouting";

describe("auth routing", () => {
  test("sends a super admin to the super admin clubs page", () => {
    expect(
      choosePostLoginPath({
        isSuperAdmin: true,
        clubAccess: [],
      }),
    ).toBe("/super-admin/clubes");
  });

  test("sends a club user to the club agenda when they are not super admin", () => {
    expect(
      choosePostLoginPath({
        isSuperAdmin: false,
        clubAccess: [
          {
            clubId: "clubs:match-point",
            clubName: "Match Point Padel",
            role: "club_master",
          },
        ],
      }),
    ).toBe("/admin/agenda");
  });

  test("sends a signed-in player without admin access to the club directory", () => {
    expect(
      choosePostLoginPath({
        isSuperAdmin: false,
        clubAccess: [],
      }),
    ).toBe("/clubes");
  });

  test("does not let Convex Auth consume the Mercado Pago OAuth callback code", () => {
    expect(shouldHandleConvexAuthCode("/api/mercadopago/oauth/callback")).toBe(
      false,
    );
    expect(shouldHandleConvexAuthCode("/api/auth/callback")).toBe(true);
    expect(shouldHandleConvexAuthCode("/login")).toBe(true);
  });
});
