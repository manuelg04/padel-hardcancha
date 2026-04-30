/* eslint-disable @next/next/no-img-element */
import { CalendarDays, MapPin, Star, Timer } from "lucide-react";
import Link from "next/link";

import { formatCOP } from "@/lib/format";
import type { PublicClubCardData } from "./types";
import { WhatsAppButton } from "./WhatsAppButton";

export function ClubDirectoryCard({ club }: { club: PublicClubCardData }) {
  const whatsappMessage = `Hola, quiero informacion para reservar en ${club.name}.`;

  return (
    <article className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white shadow-[var(--shadow-sm)]">
      <div className="relative h-48 bg-[var(--ink-200)]">
        {club.coverImageUrl ? (
          <img
            className="h-full w-full object-cover"
            src={club.coverImageUrl}
            alt={club.name}
          />
        ) : (
          <div className="court-lines h-full w-full" />
        )}
        {club.isFeatured ? (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-[var(--r-pill)] bg-white px-3 py-1 text-xs font-black text-[var(--court-700)] shadow-[var(--shadow-sm)]">
            <Star size={13} fill="currentColor" />
            Destacado
          </span>
        ) : null}
      </div>

      <div className="space-y-4 p-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--ink-500)]">
            {club.city}
          </p>
          <h2 className="text-display mt-1 text-2xl font-black">{club.name}</h2>
        </div>

        <div className="space-y-2 text-sm text-[var(--ink-600)]">
          <p className="flex gap-2">
            <MapPin className="mt-0.5 shrink-0 text-[var(--court-600)]" size={16} />
            <span>{club.address}</span>
          </p>
          <p className="flex gap-2">
            <Timer className="mt-0.5 shrink-0 text-[var(--court-600)]" size={16} />
            <span>{club.openingHoursText}</span>
          </p>
          <p className="flex gap-2">
            <CalendarDays
              className="mt-0.5 shrink-0 text-[var(--court-600)]"
              size={16}
            />
            <span>
              {club.activeCourtCount} cancha
              {club.activeCourtCount === 1 ? "" : "s"} activa
              {club.activeCourtCount === 1 ? "" : "s"}
            </span>
          </p>
        </div>

        <div className="rounded-[var(--r-md)] bg-[var(--ink-50)] p-3">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--ink-500)]">
            Desde
          </p>
          <p className="text-xl font-black text-[var(--ink-950)]">
            {formatCOP(club.normalPricePerHour)}
            <span className="text-sm font-bold text-[var(--ink-500)]"> / hora</span>
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Link className="btn btn-dark flex-1" href={`/club/${club.slug}`}>
            Ver club
          </Link>
          {club.bookingEnabled ? (
            <Link className="btn btn-primary flex-1" href={`/club/${club.slug}/reservar`}>
              Reservar
            </Link>
          ) : (
            <span className="btn btn-ghost flex-1 text-[var(--ink-500)]">
              Reservas no disponibles
            </span>
          )}
        </div>

        <WhatsAppButton
          className="btn btn-ghost btn-block"
          phone={club.whatsapp}
          message={whatsappMessage}
          label={club.whatsapp}
        />
      </div>
    </article>
  );
}
