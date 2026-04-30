import { describe, expect, test } from "vitest";

import {
  buildCustomerUpsert,
  normalizeCustomerPhone,
} from "../lib/customerRecords";

describe("customer records", () => {
  test("normalizes phone numbers for club customer lookup", () => {
    expect(normalizeCustomerPhone("+57 300 123 4567")).toBe("573001234567");
  });

  test("builds a new customer from a booking snapshot", () => {
    expect(
      buildCustomerUpsert({
        existing: null,
        input: {
          fullName: "  Manuel Gonzalez  ",
          phone: " 300 123 4567 ",
          email: " MANUEL@EXAMPLE.COM ",
          userId: "users:manuel",
          source: "online",
        },
        now: 1000,
      }),
    ).toEqual({
      fullName: "Manuel Gonzalez",
      phone: "3001234567",
      email: "manuel@example.com",
      userId: "users:manuel",
      source: "online",
      status: "active",
      createdAt: 1000,
      updatedAt: 1000,
    });
  });

  test("updates an existing customer without erasing useful stored details", () => {
    expect(
      buildCustomerUpsert({
        existing: {
          fullName: "Manuel Gonzalez",
          phone: "300 123 4567",
          email: "manuel@example.com",
          userId: null,
          source: "manual",
          status: "active",
          createdAt: 500,
          updatedAt: 500,
        },
        input: {
          fullName: " Manuel G ",
          phone: "3001234567",
          email: "",
          userId: "users:manuel",
          source: "online",
        },
        now: 1500,
      }),
    ).toEqual({
      fullName: "Manuel G",
      phone: "3001234567",
      email: "manuel@example.com",
      userId: "users:manuel",
      source: "manual",
      status: "active",
      createdAt: 500,
      updatedAt: 1500,
    });
  });
});
