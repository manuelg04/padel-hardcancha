"use client";

import { Power } from "lucide-react";
import { useMutation, useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { CourtForm, type CourtFormValues } from "./CourtForm";
import { ClubStatusBadge } from "./ClubStatusBadge";

export function CourtsManager({ clubId }: { clubId: Id<"clubs"> }) {
  const courts = useQuery(api.courts.listCourtsByClub, {
    clubId,
    includeInactive: true,
  });
  const createCourt = useMutation(api.courts.superAdminCreateCourt);
  const updateCourt = useMutation(api.courts.superAdminUpdateCourt);
  const deactivateCourt = useMutation(api.courts.superAdminDeactivateCourt);

  if (courts === undefined) {
    return (
      <section className="rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-5 shadow-[var(--shadow-sm)]">
        <h2 className="text-xl font-black">Canchas</h2>
        <p className="mt-3 text-[var(--ink-500)]">Cargando canchas...</p>
      </section>
    );
  }

  return (
    <section className="rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-5 shadow-[var(--shadow-sm)]">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-black">Canchas</h2>
          <p className="text-sm text-[var(--ink-500)]">
            {courts.filter((court) => court.isActive).length} activas
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {courts
          .slice()
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((court) => (
            <div key={court._id} className="rounded-[var(--r-md)] bg-[var(--ink-50)] p-3">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <ClubStatusBadge
                    active={court.isActive}
                    positiveLabel="Activa"
                    negativeLabel="Inactiva"
                  />
                  <span className="pill bg-white text-[var(--ink-700)]">
                    Orden {court.sortOrder}
                  </span>
                </div>
                {court.isActive ? (
                  <button
                    className="btn btn-danger"
                    type="button"
                    onClick={() => {
                      if (window.confirm("Desactivar esta cancha?")) {
                        deactivateCourt({ courtId: court._id });
                      }
                    }}
                  >
                    <Power size={16} />
                    Desactivar
                  </button>
                ) : null}
              </div>
              <CourtForm
                court={court}
                submitLabel="Guardar cancha"
                onSubmit={async (values) => {
                  await updateCourt({
                    courtId: court._id,
                    ...values,
                  });
                }}
              />
            </div>
          ))}
      </div>

      <div className="mt-5 rounded-[var(--r-lg)] border border-dashed border-[var(--ink-300)] bg-[var(--ink-50)] p-4">
        <h3 className="mb-3 font-black">Crear cancha</h3>
        <CourtForm
          sortOrder={courts.length + 1}
          submitLabel="Crear cancha"
          onSubmit={async (values: CourtFormValues) => {
            await createCourt({
              clubId,
              ...values,
            });
          }}
        />
      </div>
    </section>
  );
}
