import { describe, expect, it } from "vitest";

import { normalizeGalleryUrls, slugify } from "../lib/slug";

describe("slug helpers", () => {
  it("creates URL-friendly slugs from club names", () => {
    expect(slugify("Match Point Padel")).toBe("match-point-padel");
    expect(slugify("Pádel House Cañaveral")).toBe("padel-house-canaveral");
    expect(slugify("  Arena  Padel Club!! ")).toBe("arena-padel-club");
  });

  it("keeps existing clean slugs stable", () => {
    expect(slugify("match-point")).toBe("match-point");
  });

  it("normalizes gallery URLs from multiline or comma-separated input", () => {
    expect(
      normalizeGalleryUrls("https://one.test/a.jpg\nhttps://two.test/b.jpg, https://three.test/c.jpg"),
    ).toEqual([
      "https://one.test/a.jpg",
      "https://two.test/b.jpg",
      "https://three.test/c.jpg",
    ]);
  });
});
