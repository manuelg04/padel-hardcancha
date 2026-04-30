/* eslint-disable @next/next/no-img-element */
"use client";

import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Phone,
  ShieldCheck,
  Timer,
} from "lucide-react";
import Link from "next/link";
import { useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import { ClubCourtsList } from "./ClubCourtsList";
import { ClubPriceSummary } from "./ClubPriceSummary";
import { WhatsAppButton } from "./WhatsAppButton";

export function ClubPublicPage({ slug }: { slug: string }) {
  const club = useQuery(api.clubs.getClubBySlug, { slug });
  const courts = useQuery(
    api.courts.listActiveCourtsByClub,
    club ? { clubId: club._id } : "skip",
  );

  if (club === undefined || (club && courts === undefined)) {
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--ink-100)]">
        <p className="font-bold text-[var(--ink-500)]">Cargando club...</p>
      </main>
    );
  }

  if (club === null) {
    return (
      <main className="min-h-screen bg-[var(--ink-100)] px-5 py-12">
        <div className="mx-auto max-w-2xl rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-8 text-center shadow-[var(--shadow-sm)]">
          <h1 className="text-display text-4xl font-black">Club no disponible</h1>
          <p className="mt-2 text-[var(--ink-500)]">
            Este club no esta publicado o ya no esta activo.
          </p>
          <Link className="btn btn-primary mt-6" href="/clubes">
            Volver al directorio
          </Link>
        </div>
      </main>
    );
  }

  const whatsappMessage = `Hola, quiero informacion para reservar en ${club.name}.`;

  return (
    <main className="min-h-screen bg-[var(--ink-100)]">
      <header className="border-b border-[var(--ink-200)] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link
            href="/clubes"
            className="inline-flex items-center gap-2 text-sm font-black text-[var(--ink-700)]"
          >
            <ArrowLeft size={17} />
            Clubes
          </Link>
          <span className="font-black">CanchaBGA Padel</span>
        </div>
      </header>

      <section className="bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:py-12">
          <div className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-[var(--ink-200)] shadow-[var(--shadow-md)]">
            {club.coverImageUrl ? (
              <img
                className="h-[320px] w-full object-cover md:h-[480px]"
                src={club.coverImageUrl}
                alt={club.name}
              />
            ) : (
              <div className="court-lines h-[320px] md:h-[480px]" />
            )}
          </div>

          <div className="flex flex-col justify-center">
            <div className="mb-4 flex flex-wrap gap-2">
              {club.isFeatured ? (
                <span className="pill pill-available">
                  <span className="dot" />
                  Destacado
                </span>
              ) : null}
              <span className="pill bg-[var(--ink-100)] text-[var(--ink-700)]">
                <ShieldCheck size={13} />
                {club.city}, {club.state}
              </span>
            </div>
            <h1 className="text-display text-5xl font-black leading-[0.95] md:text-7xl">
              {club.name}
            </h1>
            <p className="mt-5 text-lg text-[var(--ink-600)]">{club.description}</p>

            <div className="mt-6 space-y-3 text-[var(--ink-700)]">
              <Info icon={<MapPin size={18} />} value={club.address} />
              <Info icon={<Timer size={18} />} value={club.openingHoursText} />
              {club.phone ? <Info icon={<Phone size={18} />} value={club.phone} /> : null}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {club.bookingEnabled ? (
                <Link className="btn btn-primary" href={`/club/${club.slug}/reservar`}>
                  <CalendarDays size={17} />
                  Reservar cancha
                </Link>
              ) : (
                <span className="btn btn-ghost text-[var(--ink-500)]">
                  Reservas no disponibles por ahora
                </span>
              )}
              <WhatsAppButton
                phone={club.whatsapp}
                message={whatsappMessage}
                label="Hablar por WhatsApp"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-5 py-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <section>
            <h2 className="text-display mb-3 text-3xl font-black">Precios</h2>
            <ClubPriceSummary
              normalPricePerHour={club.normalPricePerHour}
              peakPricePerHour={club.peakPricePerHour}
              weekendPricePerHour={club.weekendPricePerHour}
            />
          </section>

          <section className="rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-5 shadow-[var(--shadow-sm)]">
            <h2 className="text-display text-2xl font-black">Contacto</h2>
            <div className="mt-4 space-y-3">
              <Detail label="WhatsApp" value={club.whatsapp} />
              <Detail label="Direccion" value={club.address} />
              <Detail label="Pais" value={`${club.city}, ${club.country}`} />
            </div>
          </section>
        </div>

        <section>
          <h2 className="text-display mb-3 text-3xl font-black">Canchas activas</h2>
          <ClubCourtsList courts={courts ?? []} />
        </section>
      </section>

      {club.galleryImageUrls.length > 0 ? (
        <section className="mx-auto max-w-6xl px-5 pb-12">
          <h2 className="text-display mb-3 text-3xl font-black">Galeria</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {club.galleryImageUrls.map((url) => (
              <img
                key={url}
                className="h-52 w-full rounded-[var(--r-lg)] border border-[var(--ink-200)] object-cover shadow-[var(--shadow-sm)]"
                src={url}
                alt={`${club.name} galeria`}
              />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

function Info({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <p className="flex gap-3">
      <span className="mt-0.5 text-[var(--court-600)]">{icon}</span>
      <span className="font-bold">{value}</span>
    </p>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--ink-200)] py-2 last:border-0">
      <span className="text-[var(--ink-500)]">{label}</span>
      <span className="text-right font-black">{value}</span>
    </div>
  );
}
