"use client";

import { CalendarDays, MapPin, MessageCircle, Timer } from "lucide-react";
import Link from "next/link";
import { useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import { formatCOP } from "@/lib/format";
import { minutesToTime } from "@/lib/dates";
import { whatsappUrl } from "@/lib/whatsapp";
import { PlayerShell } from "./PlayerShell";

export function ClubHomeClient({ slug }: { slug: string }) {
  const club = useQuery(api.clubs.getClubBySlug, { slug });

  if (club === undefined) {
    return <PlayerShell>Loading public club page...</PlayerShell>;
  }

  if (club === null) {
    return (
      <PlayerShell>
        <div className="p-8">
          <h1 className="text-display text-3xl font-black">Club no encontrado</h1>
        </div>
      </PlayerShell>
    );
  }

  const weekday = club.openingHours.find((entry) => entry.dayOfWeek === 1);
  const whatsappMessage = `Hola, quiero reservar una cancha en ${club.name}.`;

  return (
    <PlayerShell>
      <div className="min-h-full bg-[var(--paper)]">
        <section className="court-lines px-6 pb-8 pt-8 text-white md:pt-14">
          <div className="mb-12 flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-white/15">
                ◐
              </span>
              {club.name}
            </div>
            <span className="text-xs font-bold tracking-[0.18em]">
              {club.city.toUpperCase()}
            </span>
          </div>
          <p className="text-xs font-bold tracking-[0.22em] text-white/70">
            CANCHABGA PADEL
          </p>
          <h1 className="text-display mt-3 max-w-[270px] text-4xl font-black leading-[0.95]">
            Reserva tu cancha de pádel.
          </h1>
          <p className="mt-4 max-w-[250px] text-sm text-white/78">
            Fácil y rápido. Sin llamadas. En Santander.
          </p>
        </section>

        <section className="-mt-5 space-y-4 px-5 pb-8">
          <Link href={`/club/${slug}/reservar`} className="btn btn-primary btn-block">
            <CalendarDays size={17} />
            Reservar cancha
          </Link>

          <div className="grid gap-3">
            <InfoCard icon={<MapPin size={18} />} label="Dirección" value={club.address} />
            <InfoCard
              icon={<Timer size={18} />}
              label="Horario"
              value={
                weekday
                  ? `${minutesToTime(weekday.openMinutes)} - ${minutesToTime(
                      weekday.closeMinutes,
                    )}`
                  : "Horario por confirmar"
              }
            />
            <a
              className="rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-4 shadow-[var(--shadow-sm)]"
              href={whatsappUrl(club.whatsapp, whatsappMessage)}
              target="_blank"
              rel="noreferrer"
            >
              <div className="flex items-center gap-3">
                <MessageCircle size={18} color="var(--court-600)" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--ink-500)]">
                    WhatsApp
                  </p>
                  <p className="font-bold text-[var(--ink-900)]">{club.whatsapp}</p>
                </div>
              </div>
            </a>
          </div>

          <div className="rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-[var(--ink-50)] p-4">
            <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-[var(--ink-500)]">
              Precios por hora
            </p>
            <div className="grid grid-cols-3 gap-2">
              <Price label="Normal" value={club.pricing.normalPricePerHour} />
              <Price label="Pico" value={club.pricing.peakPricePerHour} />
              <Price label="F. de S." value={club.pricing.weekendPricePerHour} />
            </div>
          </div>
        </section>
      </div>
    </PlayerShell>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-4 shadow-[var(--shadow-sm)]">
      <div className="flex items-center gap-3">
        <span className="text-[var(--court-600)]">{icon}</span>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--ink-500)]">
            {label}
          </p>
          <p className="font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
}

function Price({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[var(--r-md)] bg-white p-3 text-center shadow-[var(--shadow-sm)]">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--ink-500)]">
        {label}
      </p>
      <p className="mt-1 text-sm font-black">{formatCOP(value)}</p>
    </div>
  );
}
