import { describe, expect, test } from "vitest";

import { validateNewClubAdminAccount } from "../lib/clubAdminRules";

describe("new club admin account rules", () => {
  test("normalizes a valid club admin account", () => {
    expect(
      validateNewClubAdminAccount({
        name: "  Laura Gomez  ",
        email: "  ADMIN@NUEVOCLUB.CO  ",
        phone: " 300 123 4567 ",
        password: "manuel123",
      }),
    ).toEqual({
      ok: true,
      account: {
        name: "Laura Gomez",
        email: "admin@nuevoclub.co",
        phone: "300 123 4567",
        password: "manuel123",
      },
    });
  });

  test("requires the admin name", () => {
    expect(
      validateNewClubAdminAccount({
        name: " ",
        email: "admin@nuevoclub.co",
        phone: "300 123 4567",
        password: "manuel123",
      }),
    ).toEqual({
      ok: false,
      message: "Completa el nombre del admin del club.",
    });
  });

  test("rejects invalid admin email", () => {
    expect(
      validateNewClubAdminAccount({
        name: "Laura Gomez",
        email: "admin",
        phone: "300 123 4567",
        password: "manuel123",
      }),
    ).toEqual({
      ok: false,
      message: "Ingresa un email valido para el admin del club.",
    });
  });

  test("rejects short admin phone numbers", () => {
    expect(
      validateNewClubAdminAccount({
        name: "Laura Gomez",
        email: "admin@nuevoclub.co",
        phone: "12345",
        password: "manuel123",
      }),
    ).toEqual({
      ok: false,
      message: "Ingresa un celular valido para el admin del club.",
    });
  });

  test("requires a password that can be used to log in", () => {
    expect(
      validateNewClubAdminAccount({
        name: "Laura Gomez",
        email: "admin@nuevoclub.co",
        phone: "300 123 4567",
        password: "1234567",
      }),
    ).toEqual({
      ok: false,
      message: "La contrasena del admin debe tener minimo 8 caracteres.",
    });
  });
});
