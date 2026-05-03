/* eslint-disable @next/next/no-img-element */
"use client";

import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Camera,
  CheckCircle2,
  Clock3,
  MapPin,
  Phone,
  ShieldCheck,
  Star,
  Tag,
  Timer,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
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
  const activeCourts = courts ?? [];
  const activeCourtCount = activeCourts.length;
  const coveredCourtCount = activeCourts.filter((court) => court.isCovered).length;
  const openAirCourtCount = activeCourtCount - coveredCourtCount;
  const courtTypes = uniqueCourtTypes(activeCourts);
  const galleryImages = club.galleryImageUrls.filter(Boolean);
  const mapHref = googleMapsHref(club.address, club.city, club.country);
  const locationLabel = `${club.city}, ${club.state}`;

  return (
    <main className="min-h-screen bg-[var(--ink-100)]">
      <header className="border-b border-[var(--ink-200)] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-5">
          <Link
            href="/clubes"
            className="inline-flex items-center gap-2 text-sm font-black text-[var(--ink-700)] transition hover:text-[var(--court-700)]"
          >
            <ArrowLeft size={17} />
            Volver a clubes
          </Link>
          <span className="font-black text-[var(--ink-950)]">CanchaBGA Padel</span>
        </div>
      </header>

      <section className="border-b border-[var(--ink-200)] bg-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-5 sm:px-5 md:py-8 xl:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.85fr)_340px] xl:items-start">
          <div className="space-y-3">
            <div className="relative overflow-hidden rounded-[var(--r-xl)] border border-[var(--ink-200)] bg-[var(--ink-200)] shadow-[var(--shadow-md)]">
              {club.coverImageUrl ? (
                <img
                  className="aspect-[4/3] w-full object-cover sm:aspect-[16/10] xl:aspect-[5/4]"
                  src={club.coverImageUrl}
                  alt={club.name}
                />
              ) : (
                <div className="court-lines aspect-[4/3] w-full sm:aspect-[16/10] xl:aspect-[5/4]" />
              )}
              {club.isFeatured ? (
                <span className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-[var(--r-pill)] bg-white/92 px-3 py-1.5 text-xs font-black text-[var(--court-700)] shadow-[var(--shadow-sm)]">
                  <Star size={13} fill="currentColor" />
                  Destacado
                </span>
              ) : null}
              {galleryImages.length > 0 ? (
                <span className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-[var(--r-pill)] bg-white/94 px-3 py-1.5 text-xs font-black text-[var(--ink-800)] shadow-[var(--shadow-sm)]">
                  <Camera size={14} />
                  {galleryImages.length} foto
                  {galleryImages.length === 1 ? "" : "s"}
                </span>
              ) : null}
            </div>

            {galleryImages.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {galleryImages.slice(0, 3).map((url) => (
                  <img
                    key={url}
                    className="aspect-[4/3] w-full rounded-[var(--r-md)] border border-[var(--ink-200)] object-cover shadow-[var(--shadow-sm)]"
                    src={url}
                    alt={`${club.name} foto`}
                  />
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col justify-center xl:min-h-[520px]">
            <div className="mb-4 flex flex-wrap gap-2">
              <span className="pill bg-[var(--court-50)] text-[var(--court-700)] ring-1 ring-[var(--court-100)]">
                <ShieldCheck size={13} />
                Club publicado
              </span>
              <span className="pill bg-[var(--ink-100)] text-[var(--ink-700)]">
                <MapPin size={13} />
                {locationLabel}
              </span>
            </div>
            <h1 className="text-display max-w-xl text-5xl font-black leading-[0.95] text-[var(--ink-950)] md:text-6xl">
              {club.name}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-[var(--ink-600)] md:text-lg">
              {club.description}
            </p>

            <div className="mt-6 grid gap-3 text-[var(--ink-700)]">
              <Info icon={<MapPin size={18} />} label="Direccion" value={club.address} />
              <Info
                icon={<Timer size={18} />}
                label="Horario"
                value={club.openingHoursText}
              />
              {club.phone ? (
                <Info icon={<Phone size={18} />} label="Telefono" value={club.phone} />
              ) : null}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {activeCourtCount > 0 ? (
                <FeaturePill
                  icon={<CalendarDays size={14} />}
                  label={`${activeCourtCount} cancha${activeCourtCount === 1 ? "" : "s"}`}
                />
              ) : null}
              {courtTypes.slice(0, 2).map((courtType) => (
                <FeaturePill
                  key={courtType}
                  icon={<Tag size={14} />}
                  label={courtType}
                />
              ))}
              {coveredCourtCount > 0 ? (
                <FeaturePill
                  icon={<ShieldCheck size={14} />}
                  label={`${coveredCourtCount} techada${
                    coveredCourtCount === 1 ? "" : "s"
                  }`}
                />
              ) : null}
              {openAirCourtCount > 0 ? (
                <FeaturePill
                  icon={<CheckCircle2 size={14} />}
                  label={`${openAirCourtCount} aire libre`}
                />
              ) : null}
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {club.bookingEnabled ? (
                <Link
                  className="btn btn-primary btn-block min-h-12 text-sm shadow-[var(--shadow-md)]"
                  href={`/club/${club.slug}/reservar`}
                >
                  <CalendarDays size={17} />
                  Reservar cancha
                </Link>
              ) : (
                <span className="btn btn-ghost btn-block min-h-12 text-[var(--ink-500)]">
                  Reservas no disponibles por ahora
                </span>
              )}
              <WhatsAppButton
                className="btn btn-ghost btn-block min-h-12"
                phone={club.whatsapp}
                message={whatsappMessage}
                label="Hablar por WhatsApp"
              />
            </div>

            <div className="mt-5 grid gap-2 text-sm text-[var(--ink-600)] sm:grid-cols-3">
              <TrustItem icon={<CalendarDays size={16} />} label="Reserva en pocos pasos" />
              <TrustItem icon={<CheckCircle2 size={16} />} label="Pago en club o transferencia" />
              <TrustItem icon={<Phone size={16} />} label="Atencion por WhatsApp" />
            </div>
          </div>

          <ReservationPanel
            slug={club.slug}
            bookingEnabled={club.bookingEnabled}
            whatsappPhone={club.whatsapp}
            whatsappMessage={whatsappMessage}
          />
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="space-y-8">
          <section className="rounded-[var(--r-xl)] border border-[var(--ink-200)] bg-white p-5 shadow-[var(--shadow-sm)] md:p-6">
            <SectionHeader
              eyebrow="Precios por hora"
              title="Compara antes de reservar"
              description="Los valores se mantienen segun la configuracion actual del club."
            />
            <ClubPriceSummary
              normalPricePerHour={club.normalPricePerHour}
              peakPricePerHour={club.peakPricePerHour}
              weekendPricePerHour={club.weekendPricePerHour}
            />
          </section>

          <section className="rounded-[var(--r-xl)] border border-[var(--ink-200)] bg-white p-5 shadow-[var(--shadow-sm)] md:p-6">
            <SectionHeader
              eyebrow="Canchas activas"
              title="Elige el espacio que prefieres"
              description="Canchas publicadas por el club para reservar."
            />
            <ClubCourtsList courts={activeCourts} />
          </section>

          <section className="rounded-[var(--r-xl)] border border-[var(--ink-200)] bg-white p-5 shadow-[var(--shadow-sm)] md:p-6">
            <SectionHeader
              eyebrow="Servicios y atributos"
              title="Lo esencial del club"
              description="Solo se muestran datos disponibles en este club."
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <AttributeCard
                icon={<CalendarDays size={18} />}
                title={`${activeCourtCount} cancha${
                  activeCourtCount === 1 ? "" : "s"
                } activa${activeCourtCount === 1 ? "" : "s"}`}
                description="Disponibles en el directorio publico."
              />
              {courtTypes.map((courtType) => (
                <AttributeCard
                  key={courtType}
                  icon={<Tag size={18} />}
                  title={courtType}
                  description="Tipo de cancha registrado."
                />
              ))}
              {coveredCourtCount > 0 ? (
                <AttributeCard
                  icon={<ShieldCheck size={18} />}
                  title={`${coveredCourtCount} cancha${
                    coveredCourtCount === 1 ? "" : "s"
                  } techada${coveredCourtCount === 1 ? "" : "s"}`}
                  description="Proteccion para jugar con mas comodidad."
                />
              ) : null}
              {openAirCourtCount > 0 ? (
                <AttributeCard
                  icon={<CheckCircle2 size={18} />}
                  title={`${openAirCourtCount} cancha${
                    openAirCourtCount === 1 ? "" : "s"
                  } al aire libre`}
                  description="Opcion abierta segun disponibilidad."
                />
              ) : null}
              <AttributeCard
                icon={<Phone size={18} />}
                title="Atencion por WhatsApp"
                description={club.whatsapp}
              />
            </div>
          </section>

          {galleryImages.length > 0 ? (
            <section className="rounded-[var(--r-xl)] border border-[var(--ink-200)] bg-white p-5 shadow-[var(--shadow-sm)] md:p-6">
              <SectionHeader
                eyebrow="Galeria"
                title="Fotos del club"
                description="Imagenes disponibles para conocer el ambiente antes de reservar."
              />
              <div className="-mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-1 md:mx-0 md:grid md:grid-cols-2 md:px-0 lg:grid-cols-3">
                {galleryImages.map((url) => (
                  <img
                    key={url}
                    className="aspect-[4/3] w-[78%] shrink-0 snap-start rounded-[var(--r-lg)] border border-[var(--ink-200)] object-cover shadow-[var(--shadow-sm)] sm:w-[46%] md:w-full"
                    src={url}
                    alt={`${club.name} galeria`}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-6">
          <section className="rounded-[var(--r-xl)] border border-[var(--ink-200)] bg-white p-5 shadow-[var(--shadow-sm)]">
            <h2 className="text-display text-2xl font-black">Ubicacion y contacto</h2>
            <div className="mt-4 overflow-hidden rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-[var(--ink-50)]">
              <div className="grid h-44 place-items-center bg-[linear-gradient(135deg,rgba(79,140,51,0.12),rgba(255,255,255,0.72)),repeating-linear-gradient(0deg,transparent_0,transparent_28px,rgba(15,19,17,0.08)_29px),repeating-linear-gradient(90deg,transparent_0,transparent_34px,rgba(15,19,17,0.08)_35px)]">
                <span className="grid h-14 w-14 place-items-center rounded-full bg-[var(--court-600)] text-white shadow-[var(--shadow-md)]">
                  <MapPin size={28} fill="currentColor" />
                </span>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <ContactRow icon={<MapPin size={17} />} value={club.address} />
              <ContactRow icon={<Clock3 size={17} />} value={club.openingHoursText} />
              <ContactRow icon={<Phone size={17} />} value={club.whatsapp} />
            </div>
            <div className="mt-5 grid gap-2">
              <a
                className="btn btn-ghost btn-block"
                href={mapHref}
                target="_blank"
                rel="noreferrer"
              >
                Como llegar
                <ArrowUpRight size={16} />
              </a>
              <WhatsAppButton
                className="btn btn-primary btn-block"
                phone={club.whatsapp}
                message={whatsappMessage}
                label="Contactar por WhatsApp"
              />
            </div>
          </section>

          <section className="rounded-[var(--r-xl)] border border-[var(--court-100)] bg-[var(--court-50)] p-5 text-[var(--court-800)] shadow-[var(--shadow-sm)]">
            <div className="flex gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-[var(--court-700)] shadow-[var(--shadow-sm)]">
                <CheckCircle2 size={20} />
              </span>
              <div>
                <h2 className="font-black">Listo para jugar</h2>
                <p className="mt-1 text-sm font-bold text-[var(--court-700)]">
                  Revisa disponibilidad, elige tu horario y confirma tus datos en el
                  flujo de reserva.
                </p>
              </div>
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}

function ReservationPanel({
  slug,
  bookingEnabled,
  whatsappPhone,
  whatsappMessage,
}: {
  slug: string;
  bookingEnabled: boolean;
  whatsappPhone: string;
  whatsappMessage: string;
}) {
  return (
    <aside className="rounded-[var(--r-xl)] border border-[var(--ink-200)] bg-[linear-gradient(180deg,#ffffff,rgba(241,247,237,0.8))] p-5 shadow-[var(--shadow-lg)] xl:sticky xl:top-6">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-[var(--r-md)] bg-[var(--court-600)] text-white shadow-[var(--shadow-sm)]">
          <CalendarDays size={21} />
        </span>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--ink-500)]">
            Reserva
          </p>
          <h2 className="text-display text-2xl font-black">Reserva tu cancha</h2>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <ReserveStep number="1" title="Elige fecha y duracion" />
        <ReserveStep number="2" title="Selecciona cancha y horario" />
        <ReserveStep number="3" title="Confirma tus datos" />
      </div>

      <div className="mt-5 rounded-[var(--r-lg)] border border-[var(--court-100)] bg-white p-4 text-sm font-bold text-[var(--court-800)]">
        Sin llamadas: puedes reservar online y elegir pago en club o transferencia.
      </div>

      <div className="mt-5 grid gap-2">
        {bookingEnabled ? (
          <Link
            className="btn btn-primary btn-block min-h-12 shadow-[var(--shadow-md)]"
            href={`/club/${slug}/reservar`}
          >
            Ver disponibilidad
          </Link>
        ) : (
          <span className="btn btn-ghost btn-block min-h-12 text-[var(--ink-500)]">
            Reservas no disponibles por ahora
          </span>
        )}
        <WhatsAppButton
          className="btn btn-ghost btn-block"
          phone={whatsappPhone}
          message={whatsappMessage}
          label="Preguntar por WhatsApp"
        />
      </div>
    </aside>
  );
}

function ReserveStep({ number, title }: { number: string; title: string }) {
  return (
    <div className="flex items-center gap-3 rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-3 shadow-[var(--shadow-sm)]">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--court-50)] text-xs font-black text-[var(--court-700)]">
        {number}
      </span>
      <span className="font-black text-[var(--ink-800)]">{title}</span>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--court-700)]">
        {eyebrow}
      </p>
      <h2 className="text-display mt-1 text-3xl font-black text-[var(--ink-950)]">
        {title}
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-[var(--ink-500)]">{description}</p>
    </div>
  );
}

function Info({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3 rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-[var(--ink-50)] p-3">
      <span className="mt-0.5 text-[var(--court-600)]">{icon}</span>
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--ink-500)]">
          {label}
        </p>
        <p className="font-black text-[var(--ink-900)]">{value}</p>
      </div>
    </div>
  );
}

function FeaturePill({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-[var(--r-pill)] border border-[var(--ink-200)] bg-white px-3 py-1.5 text-xs font-black text-[var(--ink-700)] shadow-[var(--shadow-sm)]">
      <span className="text-[var(--court-600)]">{icon}</span>
      {label}
    </span>
  );
}

function TrustItem({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-[var(--r-md)] bg-[var(--ink-50)] px-3 py-2 font-bold">
      <span className="text-[var(--court-600)]">{icon}</span>
      <span>{label}</span>
    </div>
  );
}

function AttributeCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <article className="rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-[var(--ink-50)] p-4">
      <span className="mb-3 grid h-9 w-9 place-items-center rounded-full bg-white text-[var(--court-700)] shadow-[var(--shadow-sm)]">
        {icon}
      </span>
      <h3 className="font-black text-[var(--ink-900)]">{title}</h3>
      <p className="mt-1 text-sm text-[var(--ink-500)]">{description}</p>
    </article>
  );
}

function ContactRow({ icon, value }: { icon: ReactNode; value: string }) {
  return (
    <div className="flex gap-3 rounded-[var(--r-md)] bg-[var(--ink-50)] p-3">
      <span className="mt-0.5 text-[var(--court-600)]">{icon}</span>
      <p className="font-bold text-[var(--ink-700)]">{value}</p>
    </div>
  );
}

function uniqueCourtTypes(courts: Doc<"courts">[]) {
  return Array.from(
    new Set(
      courts
        .map((court) => court.courtType.trim())
        .filter((courtType) => courtType.length > 0),
    ),
  );
}

function googleMapsHref(address: string, city: string, country: string) {
  const query = encodeURIComponent(`${address}, ${city}, ${country}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}
