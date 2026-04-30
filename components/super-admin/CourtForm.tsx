"use client";

import { Save } from "lucide-react";
import { useState } from "react";

import type { Doc } from "@/convex/_generated/dataModel";

export type CourtFormValues = {
  name: string;
  description: string;
  courtType: string;
  isCovered: boolean;
  isActive: boolean;
  sortOrder: number;
};

const courtTypes = ["Cristal", "Panoramica", "Mixta", "Otra"];

function initialValues(court?: Doc<"courts">, sortOrder = 1): CourtFormValues {
  return {
    name: court?.name ?? "",
    description: court?.description ?? "",
    courtType: court?.courtType ?? "Cristal",
    isCovered: court?.isCovered ?? true,
    isActive: court?.isActive ?? true,
    sortOrder: court?.sortOrder ?? sortOrder,
  };
}

function validate(values: CourtFormValues) {
  if (!values.name.trim()) return "Completa el nombre de la cancha.";
  if (!values.description.trim()) return "Completa la descripcion.";
  if (!values.courtType.trim()) return "Completa el tipo de cancha.";
  if (values.sortOrder < 0) return "El orden debe ser mayor o igual a 0.";
  return "";
}

export function CourtForm({
  court,
  sortOrder,
  submitLabel,
  onSubmit,
}: {
  court?: Doc<"courts">;
  sortOrder?: number;
  submitLabel: string;
  onSubmit: (values: CourtFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState(initialValues(court, sortOrder));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function setField<K extends keyof CourtFormValues>(
    key: K,
    value: CourtFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validate(values);

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      setError("");
      await onSubmit(values);
      if (!court) {
        setValues(initialValues(undefined, (sortOrder ?? 1) + 1));
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo guardar la cancha.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className="rounded-[var(--r-md)] border border-[var(--ink-200)] p-3"
      onSubmit={submit}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <div className="field">
          <label>Nombre</label>
          <input
            value={values.name}
            onChange={(event) => setField("name", event.target.value)}
          />
        </div>
        <div className="field">
          <label>Tipo</label>
          <select
            value={values.courtType}
            onChange={(event) => setField("courtType", event.target.value)}
          >
            {courtTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div className="field md:col-span-2">
          <label>Descripcion</label>
          <input
            value={values.description}
            onChange={(event) => setField("description", event.target.value)}
          />
        </div>
        <div className="field">
          <label>Orden</label>
          <input
            type="number"
            min={0}
            value={values.sortOrder}
            onChange={(event) => setField("sortOrder", Number(event.target.value))}
          />
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex items-center gap-2 text-sm font-bold">
            <input
              type="checkbox"
              checked={values.isCovered}
              onChange={(event) => setField("isCovered", event.target.checked)}
            />
            Techada
          </label>
          <label className="flex items-center gap-2 text-sm font-bold">
            <input
              type="checkbox"
              checked={values.isActive}
              onChange={(event) => setField("isActive", event.target.checked)}
            />
            Activa
          </label>
        </div>
      </div>

      {error ? (
        <p className="mt-3 rounded-[var(--r-md)] bg-[var(--status-cancelled-bg)] p-3 text-sm font-bold text-[var(--status-cancelled-fg)]">
          {error}
        </p>
      ) : null}

      <button className="btn btn-dark mt-3" disabled={saving} type="submit">
        <Save size={17} />
        {saving ? "Guardando..." : submitLabel}
      </button>
    </form>
  );
}
