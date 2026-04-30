"use client";

import { useQuery } from "convex/react";
import { Save, Send, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { inputToMinutes, minutesToInput } from "@/lib/dates";
import { normalizeGalleryUrls, slugify } from "@/lib/slug";

export type ClubFormValues = {
  name: string;
  slug: string;
  city: string;
  state: string;
  country: string;
  address: string;
  phone: string;
  whatsapp: string;
  description: string;
  coverImageUrl: string;
  galleryImageUrls: string[];
  openingHoursText: string;
  normalPricePerHour: number;
  peakPricePerHour: number;
  weekendPricePerHour: number;
  peakStartMinutes: number;
  peakEndMinutes: number;
  isActive: boolean;
  isPublished: boolean;
  isFeatured: boolean;
  bookingEnabled: boolean;
  onlinePaymentsEnabled: boolean;
  onlinePaymentRequired: boolean;
  paymentHoldMinutes: number;
  allowOfflineMercadoPagoMethods: boolean;
  masterName: string;
  masterEmail: string;
  masterPhone: string;
};

export type ClubMasterValues = {
  name?: string;
  email?: string;
  phone?: string;
} | null;

type SubmitIntent = "draft" | "publish" | "save";

const defaults: ClubFormValues = {
  name: "",
  slug: "",
  city: "Bucaramanga",
  state: "Santander",
  country: "Colombia",
  address: "",
  phone: "",
  whatsapp: "",
  description: "",
  coverImageUrl: "",
  galleryImageUrls: [],
  openingHoursText:
    "Lunes a viernes: 6:00 am - 11:00 pm\nSabados y domingos: 7:00 am - 10:00 pm",
  normalPricePerHour: 60000,
  peakPricePerHour: 75000,
  weekendPricePerHour: 70000,
  peakStartMinutes: 17 * 60,
  peakEndMinutes: 21 * 60,
  isActive: true,
  isPublished: false,
  isFeatured: false,
  bookingEnabled: true,
  onlinePaymentsEnabled: false,
  onlinePaymentRequired: false,
  paymentHoldMinutes: 15,
  allowOfflineMercadoPagoMethods: false,
  masterName: "",
  masterEmail: "",
  masterPhone: "",
};

function clubToValues(
  club?: Doc<"clubs">,
  master?: ClubMasterValues,
): ClubFormValues {
  if (!club) {
    return {
      ...defaults,
      masterName: master?.name ?? "",
      masterEmail: master?.email ?? "",
      masterPhone: master?.phone ?? "",
    };
  }

  return {
    name: club.name,
    slug: club.slug,
    city: club.city,
    state: club.state,
    country: club.country,
    address: club.address,
    phone: club.phone,
    whatsapp: club.whatsapp,
    description: club.description,
    coverImageUrl: club.coverImageUrl,
    galleryImageUrls: club.galleryImageUrls,
    openingHoursText: club.openingHoursText,
    normalPricePerHour: club.normalPricePerHour,
    peakPricePerHour: club.peakPricePerHour,
    weekendPricePerHour: club.weekendPricePerHour,
    peakStartMinutes: club.peakStartMinutes,
    peakEndMinutes: club.peakEndMinutes,
    isActive: club.isActive,
    isPublished: club.isPublished,
    isFeatured: club.isFeatured,
    bookingEnabled: club.bookingEnabled,
    onlinePaymentsEnabled: club.onlinePaymentsEnabled ?? false,
    onlinePaymentRequired: club.onlinePaymentRequired ?? false,
    paymentHoldMinutes: club.paymentHoldMinutes ?? 15,
    allowOfflineMercadoPagoMethods: club.allowOfflineMercadoPagoMethods ?? false,
    masterName: master?.name ?? "",
    masterEmail: master?.email ?? "",
    masterPhone: master?.phone ?? "",
  };
}

function isValidOptionalUrl(value: string) {
  if (!value.trim()) return true;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function validate(values: ClubFormValues) {
  if (!values.name.trim()) return "Completa el nombre del club.";
  if (!values.slug.trim()) return "Completa el slug del club.";
  if (!values.city.trim()) return "Completa la ciudad.";
  if (!values.address.trim()) return "Completa la direccion.";
  if (!values.whatsapp.trim()) return "Completa el WhatsApp.";
  if (values.description.length > 500) {
    return "La descripcion no puede superar 500 caracteres.";
  }
  if (
    values.normalPricePerHour < 0 ||
    values.peakPricePerHour < 0 ||
    values.weekendPricePerHour < 0
  ) {
    return "Los precios deben ser mayores o iguales a 0.";
  }
  if (values.peakStartMinutes >= values.peakEndMinutes) {
    return "La hora pico inicial debe ser menor que la hora final.";
  }
  if (values.paymentHoldMinutes < 5 || values.paymentHoldMinutes > 60) {
    return "El tiempo de pago debe estar entre 5 y 60 minutos.";
  }
  if (!isValidOptionalUrl(values.coverImageUrl)) {
    return "La imagen principal debe ser una URL valida.";
  }
  if (values.galleryImageUrls.some((url) => !isValidOptionalUrl(url))) {
    return "Cada imagen de galeria debe ser una URL valida.";
  }
  if (
    values.masterEmail.trim() &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.masterEmail.trim())
  ) {
    return "El email del usuario maestro debe ser valido.";
  }

  return "";
}

export function ClubForm({
  mode,
  initialClub,
  initialMaster,
  onSubmit,
}: {
  mode: "create" | "edit";
  initialClub?: Doc<"clubs">;
  initialMaster?: ClubMasterValues;
  onSubmit: (values: ClubFormValues, intent: SubmitIntent) => Promise<void>;
}) {
  const initial = clubToValues(initialClub, initialMaster);
  const [values, setValues] = useState(initial);
  const [galleryText, setGalleryText] = useState(
    initial.galleryImageUrls.join("\n"),
  );
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<SubmitIntent | null>(null);
  const [lookupEmail, setLookupEmail] = useState("");
  const foundMaster = useQuery(
    api.users.superAdminFindUserByEmail,
    lookupEmail ? { email: lookupEmail } : "skip",
  );

  const masterName = foundMaster?.name ?? values.masterName;
  const masterPhone = foundMaster?.phone ?? values.masterPhone;

  function setField<K extends keyof ClubFormValues>(
    key: K,
    value: ClubFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function submit(intent: SubmitIntent) {
    const nextValues = {
      ...values,
      slug: slugify(values.slug),
      galleryImageUrls: normalizeGalleryUrls(galleryText),
      isPublished:
        intent === "publish" ? true : intent === "draft" ? false : values.isPublished,
    };
    const validationError = validate(nextValues);

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setError("");
      setSaving(intent);
      await onSubmit(nextValues, intent);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo guardar el club.",
      );
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-5">
      <Section title="Informacion general">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="field">
            <label>Nombre del club</label>
            <input
              value={values.name}
              onChange={(event) => {
                const name = event.target.value;
                setValues((current) => ({
                  ...current,
                  name,
                  slug: slugTouched ? current.slug : slugify(name),
                }));
              }}
            />
          </div>
          <div className="field">
            <label>Slug</label>
            <input
              value={values.slug}
              onChange={(event) => {
                setSlugTouched(true);
                setField("slug", event.target.value);
              }}
            />
          </div>
          <div className="field">
            <label>Ciudad</label>
            <input
              value={values.city}
              onChange={(event) => setField("city", event.target.value)}
            />
          </div>
          <div className="field">
            <label>Departamento / Estado</label>
            <input
              value={values.state}
              onChange={(event) => setField("state", event.target.value)}
            />
          </div>
          <div className="field">
            <label>Pais</label>
            <input
              value={values.country}
              onChange={(event) => setField("country", event.target.value)}
            />
          </div>
          <div className="field md:col-span-2">
            <label>Descripcion</label>
            <textarea
              rows={4}
              maxLength={500}
              value={values.description}
              onChange={(event) => setField("description", event.target.value)}
            />
            <span className="text-xs text-[var(--ink-500)]">
              {values.description.length}/500
            </span>
          </div>
        </div>
      </Section>

      <Section title="Contacto y ubicacion">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="field md:col-span-2">
            <label>Direccion</label>
            <input
              value={values.address}
              onChange={(event) => setField("address", event.target.value)}
            />
          </div>
          <div className="field">
            <label>Telefono</label>
            <input
              value={values.phone}
              onChange={(event) => setField("phone", event.target.value)}
            />
          </div>
          <div className="field">
            <label>WhatsApp</label>
            <input
              value={values.whatsapp}
              onChange={(event) => setField("whatsapp", event.target.value)}
            />
          </div>
        </div>
      </Section>

      <Section title="Imagenes">
        <div className="grid gap-4">
          <div className="field">
            <label>URL de imagen principal</label>
            <input
              value={values.coverImageUrl}
              onChange={(event) => setField("coverImageUrl", event.target.value)}
            />
          </div>
          <div className="field">
            <label>URLs de galeria</label>
            <textarea
              rows={4}
              value={galleryText}
              onChange={(event) => setGalleryText(event.target.value)}
              placeholder="Una URL por linea o separadas por coma"
            />
          </div>
        </div>
      </Section>

      <Section title="Horarios">
        <div className="field">
          <label>Horarios visibles</label>
          <textarea
            rows={3}
            value={values.openingHoursText}
            onChange={(event) => setField("openingHoursText", event.target.value)}
          />
        </div>
      </Section>

      <Section title="Precios">
        <div className="grid gap-4 md:grid-cols-3">
          <NumberField
            label="Precio normal por hora"
            value={values.normalPricePerHour}
            onChange={(value) => setField("normalPricePerHour", value)}
          />
          <NumberField
            label="Precio hora pico"
            value={values.peakPricePerHour}
            onChange={(value) => setField("peakPricePerHour", value)}
          />
          <NumberField
            label="Precio fin de semana"
            value={values.weekendPricePerHour}
            onChange={(value) => setField("weekendPricePerHour", value)}
          />
          <div className="field">
            <label>Hora inicio pico</label>
            <input
              type="time"
              value={minutesToInput(values.peakStartMinutes)}
              onChange={(event) =>
                setField("peakStartMinutes", inputToMinutes(event.target.value))
              }
            />
          </div>
          <div className="field">
            <label>Hora fin pico</label>
            <input
              type="time"
              value={minutesToInput(values.peakEndMinutes)}
              onChange={(event) =>
                setField("peakEndMinutes", inputToMinutes(event.target.value))
              }
            />
          </div>
        </div>
      </Section>

      <Section title="Estado de publicacion">
        <div className="grid gap-3 md:grid-cols-2">
          {mode === "edit" ? (
            <>
              <Switch
                label="Activo"
                checked={values.isActive}
                onChange={(checked) => setField("isActive", checked)}
              />
              <Switch
                label="Publicado en directorio"
                checked={values.isPublished}
                onChange={(checked) => setField("isPublished", checked)}
              />
            </>
          ) : null}
          <Switch
            label="Club destacado"
            checked={values.isFeatured}
            onChange={(checked) => setField("isFeatured", checked)}
          />
          <Switch
            label="Reservas habilitadas"
            checked={values.bookingEnabled}
            onChange={(checked) => setField("bookingEnabled", checked)}
          />
        </div>
      </Section>

      <Section title="Pagos online">
        <div className="grid gap-3 md:grid-cols-2">
          <Switch
            label="Pagos online activos"
            checked={values.onlinePaymentsEnabled}
            onChange={(checked) => setField("onlinePaymentsEnabled", checked)}
          />
          <Switch
            label="Pago online obligatorio"
            checked={values.onlinePaymentRequired}
            onChange={(checked) => setField("onlinePaymentRequired", checked)}
          />
          <Switch
            label="Permitir medios offline Mercado Pago"
            checked={values.allowOfflineMercadoPagoMethods}
            onChange={(checked) =>
              setField("allowOfflineMercadoPagoMethods", checked)
            }
          />
          <NumberField
            label="Minutos para pagar"
            value={values.paymentHoldMinutes}
            onChange={(value) => setField("paymentHoldMinutes", value)}
          />
        </div>
        <p className="mt-3 text-sm text-[var(--ink-500)]">
          El super admin no ve tokens. La cuenta Mercado Pago la conecta el club.
        </p>
      </Section>

      <Section title="Usuario maestro del club">
        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <div className="field">
            <label>Email</label>
            <input
              value={values.masterEmail}
              onChange={(event) => {
                setField("masterEmail", event.target.value);
                setField("masterName", "");
                setField("masterPhone", "");
              }}
            />
          </div>
          <button
            className="btn btn-dark mt-5"
            type="button"
            onClick={() => setLookupEmail(values.masterEmail.trim().toLowerCase())}
          >
            Buscar usuario
          </button>
          <div className="field">
            <label>Nombre</label>
            <input value={masterName} readOnly />
          </div>
          <div className="field">
            <label>Celular</label>
            <input value={masterPhone} readOnly />
          </div>
        </div>
        {lookupEmail && foundMaster === null ? (
          <p className="mt-3 rounded-[var(--r-md)] bg-[var(--status-pending-bg)] p-3 text-sm font-bold text-[var(--status-pending-fg)]">
            No encontramos un usuario con ese email.
          </p>
        ) : null}
      </Section>

      {error ? (
        <p className="rounded-[var(--r-md)] bg-[var(--status-cancelled-bg)] p-3 text-sm font-bold text-[var(--status-cancelled-fg)]">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-4 shadow-[var(--shadow-sm)] sm:flex-row sm:justify-end">
        <Link className="btn btn-ghost" href="/super-admin/clubes">
          <X size={17} />
          Cancelar
        </Link>
        {mode === "create" ? (
          <>
            <button
              className="btn btn-dark"
              type="button"
              disabled={saving !== null}
              onClick={() => submit("draft")}
            >
              <Save size={17} />
              {saving === "draft" ? "Guardando..." : "Guardar como borrador"}
            </button>
            <button
              className="btn btn-primary"
              type="button"
              disabled={saving !== null}
              onClick={() => submit("publish")}
            >
              <Send size={17} />
              {saving === "publish" ? "Publicando..." : "Guardar y publicar"}
            </button>
          </>
        ) : (
          <button
            className="btn btn-primary"
            type="button"
            disabled={saving !== null}
            onClick={() => submit("save")}
          >
            <Save size={17} />
            {saving === "save" ? "Guardando..." : "Guardar cambios"}
          </button>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-5 shadow-[var(--shadow-sm)]">
      <h2 className="mb-4 text-xl font-black">{title}</h2>
      {children}
    </section>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

function Switch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-[var(--r-md)] border border-[var(--ink-200)] p-3 text-sm font-black">
      {label}
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}
