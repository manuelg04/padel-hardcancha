import { onlyDigits } from "./format";

export type NewClubAdminAccountInput = {
  name: string;
  email: string;
  phone: string;
  password: string;
};

export type NewClubAdminAccount = {
  name: string;
  email: string;
  phone: string;
  password: string;
};

export type NewClubAdminAccountValidation =
  | {
      ok: true;
      account: NewClubAdminAccount;
    }
  | {
      ok: false;
      message: string;
    };

export function validateNewClubAdminAccount(
  input: NewClubAdminAccountInput,
): NewClubAdminAccountValidation {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone.trim();
  const password = input.password;

  if (!name) {
    return {
      ok: false,
      message: "Completa el nombre del admin del club.",
    };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return {
      ok: false,
      message: "Ingresa un email valido para el admin del club.",
    };
  }

  if (onlyDigits(phone).length < 10) {
    return {
      ok: false,
      message: "Ingresa un celular valido para el admin del club.",
    };
  }

  if (password.length < 8) {
    return {
      ok: false,
      message: "La contrasena del admin debe tener minimo 8 caracteres.",
    };
  }

  return {
    ok: true,
    account: {
      name,
      email,
      phone,
      password,
    },
  };
}
