import { describe, expect, test } from "vitest";

import { choosePostLoginPath } from "../lib/authRouting";

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
});
