import { describe, expect, test } from "vitest";

import { formatCOP } from "../lib/format";

describe("formatCOP", () => {
  test("preserves cents when Colombian peso values have decimals", () => {
    expect(formatCOP(30000)).toBe("$30.000");
    expect(formatCOP(2702.2)).toBe("$2.702,20");
    expect(formatCOP(27297.8)).toBe("$27.297,80");
    expect(formatCOP(0)).toBe("$0");
  });
});
