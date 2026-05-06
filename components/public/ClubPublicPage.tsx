/* eslint-disable @next/next/no-img-element */
"use client";

import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Star,
  Tag,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { whatsappUrl } from "@/lib/whatsapp";
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
  const reservarHref = `/club/${club.slug}/reservar`;

  return (
    <main className="min-h-screen bg-[var(--ink-100)] pb-24 lg:pb-12">
      <header className="sticky top-0 z-30 border-b border-[var(--ink-200)] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
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

      <div className="mx-auto max-w-[1400px] px-4 pt-6 sm:px-6 sm:pt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-8 lg:px-8 lg:pt-10 2xl:grid-cols-[minmax(0,1fr)_400px] 2xl:gap-12">
        <div className="lg:col-start-1 lg:row-start-1">
          <ClubHero
            club={club}
            locationLabel={locationLabel}
            galleryCount={galleryImages.length}
            whatsappMessage={whatsappMessage}
          />
        </div>

        <aside className="mt-6 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:sticky lg:top-24">
          <BookingCard
            slug={club.slug}
            bookingEnabled={club.bookingEnabled}
            whatsappPhone={club.whatsapp}
            whatsappMessage={whatsappMessage}
          />
        </aside>

        <div className="mt-10 space-y-10 lg:col-start-1 lg:row-start-2 lg:mt-14 lg:space-y-14">
          <section>
            <SectionHeader
              eyebrow="Precios por hora"
              title="Compara las tarifas antes de reservar"
              description="Los valores se mantienen segun la configuracion actual del club."
            />
            <ClubPriceSummary
              normalPricePerHour={club.normalPricePerHour}
              peakPricePerHour={club.peakPricePerHour}
              weekendPricePerHour={club.weekendPricePerHour}
            />
          </section>

          <section>
            <SectionHeader
              eyebrow="Canchas disponibles"
              title="Elige el espacio que prefieres"
              description="Canchas publicadas por el club para reservar."
            />
            <ClubCourtsList courts={activeCourts} />
          </section>

          <section>
            <SectionHeader
              eyebrow="Servicios y atributos"
              title="Lo esencial del club"
              description="Solo se muestran datos disponibles en este club."
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              <AttributeCard
                icon={<CalendarDays size={17} />}
                title={`${activeCourtCount} cancha${
                  activeCourtCount === 1 ? "" : "s"
                } activa${activeCourtCount === 1 ? "" : "s"}`}
                description="Disponibles en el directorio publico."
              />
              {courtTypes.map((courtType) => (
                <AttributeCard
                  key={courtType}
                  icon={<Tag size={17} />}
                  title={courtType}
                  description="Tipo de cancha registrado."
                />
              ))}
              {coveredCourtCount > 0 ? (
                <AttributeCard
                  icon={<ShieldCheck size={17} />}
                  title={`${coveredCourtCount} cancha${
                    coveredCourtCount === 1 ? "" : "s"
                  } techada${coveredCourtCount === 1 ? "" : "s"}`}
                  description="Proteccion para jugar con mas comodidad."
                />
              ) : null}
              {openAirCourtCount > 0 ? (
                <AttributeCard
                  icon={<CheckCircle2 size={17} />}
                  title={`${openAirCourtCount} cancha${
                    openAirCourtCount === 1 ? "" : "s"
                  } al aire libre`}
                  description="Opcion abierta segun disponibilidad."
                />
              ) : null}
            </div>
          </section>

          {galleryImages.length > 0 ? (
            <section>
              <SectionHeader
                eyebrow="Galeria"
                title="Fotos del club"
                description="Imagenes disponibles para conocer el ambiente antes de reservar."
              />
              <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 md:grid md:grid-cols-3">
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

          <section>
            <SectionHeader
              eyebrow="Ubicacion y contacto"
              title="Como llegar al club"
              description="Encuentra el club, mira el horario y comunicate por WhatsApp."
            />
            <article className="overflow-hidden rounded-[var(--r-xl)] border border-[var(--ink-200)] bg-white shadow-[var(--shadow-sm)] 2xl:grid 2xl:grid-cols-[1.1fr_minmax(0,1fr)]">
              <div className="grid h-44 place-items-center bg-[linear-gradient(135deg,rgba(79,140,51,0.12),rgba(255,255,255,0.72)),repeating-linear-gradient(0deg,transparent_0,transparent_28px,rgba(15,19,17,0.08)_29px),repeating-linear-gradient(90deg,transparent_0,transparent_34px,rgba(15,19,17,0.08)_35px)] 2xl:h-full 2xl:min-h-[280px]">
                <span className="grid h-14 w-14 place-items-center rounded-full bg-[var(--court-600)] text-white shadow-[var(--shadow-md)]">
                  <MapPin size={28} />
                </span>
              </div>
              <div className="flex flex-col 2xl:border-l 2xl:border-[var(--ink-200)]">
                <div className="grid grow gap-0 sm:grid-cols-3 2xl:grid-cols-1">
                  <ContactCell
                    icon={<MapPin size={17} />}
                    label="Direccion"
                    value={club.address}
                  />
                  <ContactCell
                    icon={<Clock3 size={17} />}
                    label="Horario"
                    value={club.openingHoursText}
                  />
                  <ContactCell
                    icon={<Phone size={17} />}
                    label="Contacto"
                    value={club.whatsapp}
                  />
                </div>
                <div className="grid gap-2 border-t border-[var(--ink-200)] bg-[var(--ink-50)] p-4 sm:grid-cols-2">
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
              </div>
            </article>
          </section>
        </div>
      </div>

      <MobileStickyCta
        bookingEnabled={club.bookingEnabled}
        whatsappPhone={club.whatsapp}
        whatsappMessage={whatsappMessage}
        reservarHref={reservarHref}
      />
    </main>
  );
}

function ClubHero({
  club,
  locationLabel,
  galleryCount,
  whatsappMessage,
}: {
  club: Doc<"clubs">;
  locationLabel: string;
  galleryCount: number;
  whatsappMessage: string;
}) {
  return (
    <section className="lg:col-start-1">
      <div className="relative overflow-hidden rounded-[var(--r-xl)] border border-[var(--ink-200)] bg-[var(--ink-200)] shadow-[var(--shadow-md)]">
        {club.coverImageUrl ? (
          <img
            className="aspect-[16/10] w-full object-cover sm:aspect-[16/9] lg:aspect-[16/8]"
            src={club.coverImageUrl}
            alt={`Vista del club ${club.name}`}
          />
        ) : (
          <div className="court-lines aspect-[16/10] w-full sm:aspect-[16/9] lg:aspect-[16/8]" />
        )}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_55%,rgba(15,19,17,0.55)_100%)]" />
        {club.isFeatured ? (
          <span className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-[var(--r-pill)] bg-white/95 px-3 py-1.5 text-xs font-black text-[var(--court-700)] shadow-[var(--shadow-sm)]">
            <Star size={13} fill="currentColor" />
            Destacado
          </span>
        ) : null}
        {galleryCount > 0 ? (
          <span className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 rounded-[var(--r-pill)] bg-white/95 px-3 py-1.5 text-xs font-black text-[var(--ink-800)] shadow-[var(--shadow-sm)]">
            +{galleryCount} foto{galleryCount === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      <div className="mt-5 sm:mt-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="pill bg-[var(--court-50)] text-[var(--court-700)] ring-1 ring-[var(--court-100)]">
            <ShieldCheck size={13} />
            Club publicado
          </span>
          <span className="pill bg-[var(--ink-100)] text-[var(--ink-700)]">
            <MapPin size={13} />
            {locationLabel}
          </span>
        </div>

        <h1 className="text-display mt-3 text-[clamp(2rem,5vw,3.25rem)] font-black leading-[1.02] text-[var(--ink-950)]">
          {club.name}
        </h1>

        {club.description ? (
          <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--ink-600)]">
            {club.description}
          </p>
        ) : null}

        <div className="mt-5 overflow-hidden rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white shadow-[var(--shadow-sm)]">
          <dl className="grid divide-y divide-[var(--ink-200)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <HeroFact icon={<MapPin size={16} />} label="Direccion" value={club.address} />
            <HeroFact
              icon={<Clock3 size={16} />}
              label="Horario"
              value={club.openingHoursText}
            />
            {club.phone ? (
              <HeroFact icon={<Phone size={16} />} label="Telefono" value={club.phone} />
            ) : (
              <HeroFact
                icon={<MessageCircle size={16} />}
                label="WhatsApp"
                value={club.whatsapp}
              />
            )}
          </dl>
        </div>

        <div className="mt-4 hidden lg:flex">
          <a
            className="inline-flex items-center gap-2 text-sm font-black text-[var(--court-700)] transition hover:text-[var(--court-800)]"
            href={whatsappUrl(club.whatsapp, whatsappMessage)}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle size={16} />
            Hablar por WhatsApp
            <ArrowUpRight size={14} />
          </a>
        </div>
      </div>
    </section>
  );
}

function HeroFact({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 p-4">
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--court-50)] text-[var(--court-700)]">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-500)]">
          {label}
        </p>
        <p className="mt-0.5 truncate font-black text-[var(--ink-900)]" title={value}>
          {value}
        </p>
      </div>
    </div>
  );
}

function BookingCard({
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
    <div className="rounded-[var(--r-xl)] border border-[var(--ink-200)] bg-white p-5 shadow-[var(--shadow-md)]">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--r-md)] bg-[var(--court-600)] text-white shadow-[var(--shadow-sm)]">
          <CalendarDays size={20} />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--court-700)]">
            Reserva
          </p>
          <h2 className="text-display text-2xl font-black leading-tight text-[var(--ink-950)]">
            Reserva tu cancha
          </h2>
        </div>
      </div>

      <p className="mt-3 text-sm text-[var(--ink-600)]">
        Elige fecha, cancha y horario en pocos pasos.
      </p>

      <ol className="mt-5 space-y-2">
        <ReserveStep number="1" title="Elige fecha y duracion" />
        <ReserveStep number="2" title="Selecciona cancha y horario" />
        <ReserveStep number="3" title="Confirma tus datos" />
      </ol>

      <div className="mt-4 flex items-start gap-2 rounded-[var(--r-md)] bg-[var(--court-50)] p-3 text-xs font-bold text-[var(--court-800)]">
        <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-[var(--court-600)]" />
        Reserva online pagando por Mercado Pago.
      </div>

      <div className="mt-5 grid gap-2">
        {bookingEnabled ? (
          <Link
            className="btn btn-primary btn-block min-h-12 text-sm shadow-[var(--shadow-sm)]"
            href={`/club/${slug}/reservar`}
          >
            <CalendarDays size={17} />
            Ver disponibilidad
          </Link>
        ) : (
          <span className="btn btn-ghost btn-block min-h-12 text-[var(--ink-500)]">
            Reservas no disponibles por ahora
          </span>
        )}
        <WhatsAppButton
          className="btn btn-ghost btn-block min-h-12 text-sm"
          phone={whatsappPhone}
          message={whatsappMessage}
          label="Preguntar por WhatsApp"
        />
      </div>
    </div>
  );
}

function ReserveStep({ number, title }: { number: string; title: string }) {
  return (
    <li className="flex items-center gap-3 rounded-[var(--r-md)] border border-[var(--ink-200)] bg-[var(--ink-50)] px-3 py-2.5">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--court-600)] text-[11px] font-black text-white">
        {number}
      </span>
      <span className="text-sm font-black text-[var(--ink-800)]">{title}</span>
    </li>
  );
}

function MobileStickyCta({
  bookingEnabled,
  whatsappPhone,
  whatsappMessage,
  reservarHref,
}: {
  bookingEnabled: boolean;
  whatsappPhone: string;
  whatsappMessage: string;
  reservarHref: string;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--ink-200)] bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(15,19,17,0.08)] backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-6xl items-center gap-2">
        <a
          className="btn btn-icon"
          href={whatsappUrl(whatsappPhone, whatsappMessage)}
          target="_blank"
          rel="noreferrer"
          aria-label="Preguntar por WhatsApp"
        >
          <MessageCircle size={18} />
        </a>
        {bookingEnabled ? (
          <Link className="btn btn-primary btn-block min-h-12 flex-1 text-sm" href={reservarHref}>
            <CalendarDays size={17} />
            Ver disponibilidad
          </Link>
        ) : (
          <span className="btn btn-ghost btn-block min-h-12 flex-1 text-[var(--ink-500)]">
            Reservas no disponibles
          </span>
        )}
      </div>
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
    <div className="mb-5">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--court-700)]">
        {eyebrow}
      </p>
      <h2 className="text-display mt-1.5 text-2xl font-black leading-tight text-[var(--ink-950)] sm:text-[28px]">
        {title}
      </h2>
      <p className="mt-1.5 max-w-2xl text-sm text-[var(--ink-500)]">{description}</p>
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
    <article className="flex gap-3 rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-4">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--court-50)] text-[var(--court-700)]">
        {icon}
      </span>
      <div className="min-w-0">
        <h3 className="text-sm font-black text-[var(--ink-900)]">{title}</h3>
        <p className="mt-0.5 text-xs text-[var(--ink-500)]">{description}</p>
      </div>
    </article>
  );
}

function ContactCell({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-[var(--ink-200)] p-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0 2xl:border-b 2xl:border-r-0 2xl:last:border-b-0">
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--court-50)] text-[var(--court-700)]">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-500)]">
          {label}
        </p>
        <p className="mt-0.5 text-sm font-black text-[var(--ink-900)]">{value}</p>
      </div>
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
