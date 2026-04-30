type CustomerSource = "online" | "manual" | "whatsapp" | "walk_in" | "phone";
type CustomerStatus = "active" | "inactive";

type CustomerLike<TUserId extends string = string> = {
  fullName: string;
  phone: string;
  email?: string | null;
  userId?: TUserId | null;
  source: CustomerSource;
  status: CustomerStatus;
  createdAt: number;
  updatedAt: number;
};

type CustomerInput<TUserId extends string = string> = {
  fullName: string;
  phone: string;
  email?: string | null;
  userId?: TUserId | null;
  source: CustomerSource;
};

function cleanOptionalEmail(email?: string | null) {
  const value = email?.trim().toLowerCase();
  return value || undefined;
}

export function normalizeCustomerPhone(phone: string) {
  return phone.replace(/\D/g, "");
}

export function buildCustomerUpsert<TUserId extends string = string>({
  existing,
  input,
  now,
}: {
  existing: CustomerLike<TUserId> | null;
  input: CustomerInput<TUserId>;
  now: number;
}) {
  const fullName = input.fullName.trim();
  const phone = normalizeCustomerPhone(input.phone);
  const email = cleanOptionalEmail(input.email) ?? existing?.email ?? undefined;
  const userId = input.userId ?? existing?.userId ?? undefined;

  return {
    fullName,
    phone,
    email,
    userId,
    source: existing?.source ?? input.source,
    status: existing?.status ?? "active",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}
