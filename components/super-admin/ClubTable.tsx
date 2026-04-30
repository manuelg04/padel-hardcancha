/* eslint-disable @next/next/no-img-element */
"use client";

import { CreditCard, Edit, Eye, EyeOff, Power, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useMutation } from "convex/react";

import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { ClubStatusBadge } from "./ClubStatusBadge";

export type SuperAdminClubRow = Doc<"clubs"> & {
  activeCourtCount: number;
  mercadoPagoCollectorId?: string;
  mercadoPagoConnectedAt?: number;
  mercadoPagoLastRefreshAt?: number;
};

export function ClubTable({ clubs }: { clubs: SuperAdminClubRow[] }) {
  const publishClub = useMutation(api.clubs.superAdminPublishClub);
  const unpublishClub = useMutation(api.clubs.superAdminUnpublishClub);
  const updateClub = useMutation(api.clubs.superAdminUpdateClub);
  const deactivateClub = useMutation(api.clubs.superAdminDeactivateClub);

  if (clubs.length === 0) {
    return (
      <div className="rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-8 text-center shadow-[var(--shadow-sm)]">
        <h2 className="text-display text-3xl font-black">No hay clubes aqui.</h2>
        <p className="mt-2 text-[var(--ink-500)]">
          Crea un club nuevo o cambia los filtros.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white shadow-[var(--shadow-sm)]">
      <div className="hidden grid-cols-[72px_1.1fr_0.75fr_90px_1.15fr_1fr_230px] gap-3 border-b border-[var(--ink-200)] bg-[var(--ink-50)] px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-[var(--ink-500)] lg:grid">
        <span>Img</span>
        <span>Club</span>
        <span>Ciudad</span>
        <span>Canchas</span>
        <span>Estado</span>
        <span>Pagos</span>
        <span>Acciones</span>
      </div>

      <div className="divide-y divide-[var(--ink-200)]">
        {clubs.map((club) => (
          <article
            key={club._id}
            className="grid gap-3 p-4 lg:grid-cols-[72px_1.1fr_0.75fr_90px_1.15fr_1fr_230px] lg:items-center"
          >
            <img
              className="h-16 w-20 rounded-[var(--r-md)] object-cover lg:h-14 lg:w-16"
              src={club.coverImageUrl}
              alt={club.name}
            />
            <div>
              <p className="font-black">{club.name}</p>
              <p className="text-mono text-xs text-[var(--ink-500)]">{club.slug}</p>
            </div>
            <p className="font-bold text-[var(--ink-700)]">{club.city}</p>
            <p className="font-black">{club.activeCourtCount}</p>
            <div className="flex flex-wrap gap-2">
              <ClubStatusBadge active={club.isActive} />
              <ClubStatusBadge
                active={club.isPublished}
                positiveLabel="Publicado"
                negativeLabel="Borrador"
              />
              <ClubStatusBadge
                active={club.bookingEnabled}
                positiveLabel="Reservas"
                negativeLabel="Sin reservas"
              />
            </div>
            <div className="text-sm">
              <div className="flex items-center gap-2 font-black">
                <CreditCard size={15} />
                {paymentStatusLabel(club.mercadoPagoConnectionStatus)}
              </div>
              <p className="text-mono mt-1 truncate text-xs text-[var(--ink-500)]">
                {club.mercadoPagoCollectorId ?? "Sin collector"}
              </p>
              <p className="text-xs text-[var(--ink-500)]">
                {club.onlinePaymentsEnabled ? "Online activo" : "Online inactivo"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                className="btn-icon"
                aria-label="Editar"
                href={`/super-admin/clubes/${club._id}/editar`}
              >
                <Edit size={16} />
              </Link>
              <button
                className="btn-icon"
                aria-label={club.isPublished ? "Despublicar" : "Publicar"}
                onClick={() =>
                  club.isPublished
                    ? unpublishClub({ clubId: club._id })
                    : publishClub({ clubId: club._id })
                }
              >
                {club.isPublished ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              {club.isActive ? (
                <button
                  className="btn-icon"
                  aria-label="Desactivar"
                  onClick={() => {
                    if (
                      window.confirm(
                        "Desactivar este club lo ocultara de la plataforma. Continuar?",
                      )
                    ) {
                      deactivateClub({ clubId: club._id });
                    }
                  }}
                >
                  <Power size={16} />
                </button>
              ) : (
                <button
                  className="btn-icon"
                  aria-label="Activar"
                  onClick={() =>
                    updateClub({ clubId: club._id, isActive: true })
                  }
                >
                  <RotateCcw size={16} />
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function paymentStatusLabel(status?: string) {
  const labels: Record<string, string> = {
    connected: "Conectado",
    disconnected: "No conectado",
    expired: "Vencido",
    error: "Error",
  };
  return labels[status ?? "disconnected"] ?? "No conectado";
}
