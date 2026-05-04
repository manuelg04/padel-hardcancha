import type { Metadata } from "next";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  CreditCard,
  Headphones,
  LockKeyhole,
  Map,
  MapPin,
  MessageCircle,
  Monitor,
  Settings,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import bucaramangaCity from "@/assets-landing/bucaramangacity.png";
import playersImage from "@/assets-landing/cardimage1.png";
import clubAdminImage from "@/assets-landing/cardimage2.png";
import generalAdminImage from "@/assets-landing/cardimage3.png";
import clubImage from "@/assets-landing/clubimage.png";
import heroImage from "@/assets-landing/hero.png";
import racketImage from "@/assets-landing/padelracket.png";
import santanderCityImage from "@/assets-landing/santandercityimage.png";

export const metadata: Metadata = {
  title: "CanchaLista | Reservas web para clubes de pádel",
  description:
    "Plataforma santandereana para administrar clubes de pádel y recibir reservas en línea.",
};

const navItems = [
  { label: "Inicio", href: "#inicio" },
  { label: "Funcionalidades", href: "#funcionalidades" },
  { label: "Para clubes", href: "#clubes" },
  { label: "Para jugadores", href: "#roles" },
  { label: "Contacto", href: "#contacto" },
];

const localValues: Array<{ title: string; icon: LucideIcon }> = [
  { title: "Desarrollado aquí", icon: MapPin },
  { title: "Soporte cercano", icon: Headphones },
  { title: "Entendemos tu realidad", icon: Users },
  { title: "Comprometidos con la región", icon: BadgeCheck },
];

const features: Array<{
  title: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    title: "Reservas en línea",
    description: "Jugadores eligen fecha, hora y cancha en minutos.",
    icon: CalendarCheck,
  },
  {
    title: "Agenda diaria",
    description:
      "Visualiza y gestiona toda la operación del club desde un solo lugar.",
    icon: Clock3,
  },
  {
    title: "Reservas manuales",
    description: "Registra reservas hechas por WhatsApp o en recepción.",
    icon: Users,
  },
  {
    title: "Bloqueo de horarios",
    description:
      "Bloquea canchas por mantenimiento, eventos o disponibilidad interna.",
    icon: LockKeyhole,
  },
  {
    title: "Pagos y notas",
    description: "Registra pagos, observaciones y seguimiento de cada reserva.",
    icon: CreditCard,
  },
  {
    title: "Membresías",
    description: "Administra planes, beneficios y clientes miembros.",
    icon: BadgeCheck,
  },
];

const audiences: Array<{
  title: string;
  description: string;
  image: StaticImageData;
  icon: LucideIcon;
  alt: string;
}> = [
  {
    title: "Para jugadores",
    description:
      "Encuentra un club, revisa disponibilidad, reserva tu cancha y consulta tus reservas.",
    image: playersImage,
    icon: Users,
    alt: "Dos jugadores de pádel conversando en una cancha",
  },
  {
    title: "Para administradores de club",
    description:
      "Gestiona agenda, canchas, pagos, membresías y la operación diaria.",
    image: clubAdminImage,
    icon: ClipboardList,
    alt: "Administrador de club trabajando en una laptop junto a una cancha de pádel",
  },
  {
    title: "Para administradores generales",
    description:
      "Crea clubes, publica o despublica, administra canchas y asigna responsables.",
    image: generalAdminImage,
    icon: ShieldCheck,
    alt: "Administrador general revisando tableros en un monitor",
  },
];

const steps: Array<{ title: string; icon: LucideIcon }> = [
  { title: "El club publica sus canchas y horarios", icon: Map },
  { title: "El jugador elige fecha y hora", icon: CalendarDays },
  { title: "Se crea la reserva", icon: CheckCircle2 },
  { title: "El club administra toda la operación", icon: Monitor },
];

const trustItems: Array<{ title: string; icon: LucideIcon }> = [
  { title: "Seguridad y privacidad de tus datos", icon: ShieldCheck },
  { title: "Plataforma 100% web siempre disponible", icon: Settings },
  { title: "Funciona en cualquier dispositivo", icon: Smartphone },
  { title: "Soporte local, siempre contigo", icon: Headphones },
];

const whatsappDemoHref =
  "https://wa.me/573166229191?text=Hola%2C%20quiero%20solicitar%20una%20demo%20de%20CanchaLista.";

function ColombiaMark() {
  return (
    <span className="inline-flex h-3.5 w-5 overflow-hidden rounded-[2px] border border-white/70 align-[-1px] shadow-sm">
      <span className="flex-1 bg-[#fcd116]" />
      <span className="flex-1 bg-[#003893]" />
      <span className="flex-1 bg-[#ce1126]" />
    </span>
  );
}

function ButtonLink({
  href,
  variant = "primary",
  children,
}: Readonly<{
  href: string;
  variant?: "primary" | "secondary" | "dark";
  children: React.ReactNode;
}>) {
  const classes = {
    primary:
      "bg-[#2faa3f] text-white shadow-[0_16px_35px_rgba(47,170,63,0.28)] hover:bg-[#258d36] focus-visible:outline-[#2faa3f]",
    secondary:
      "border border-[#2faa3f]/35 bg-white/90 text-[#10201c] hover:border-[#2faa3f] hover:bg-[#f5fbf4] focus-visible:outline-[#2faa3f]",
    dark: "border border-white/45 bg-white/5 text-white hover:bg-white/12 focus-visible:outline-white",
  };

  return (
    <Link
      href={href}
      className={`inline-flex min-h-12 items-center justify-center gap-3 rounded-full px-6 text-sm font-bold transition duration-200 active:translate-y-px active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 ${classes[variant]}`}
    >
      {children}
    </Link>
  );
}

export default function Home() {
  return (
    <main
      id="inicio"
      className="min-h-screen overflow-x-hidden bg-white text-[#10201c]"
    >
      <header className="sticky top-0 z-50 bg-[#062e29] shadow-[0_1px_0_rgba(255,255,255,0.08)]">
        <div className="mx-auto flex h-[74px] max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
          <Link href="#inicio" className="text-3xl font-black">
            <span className="text-white">Cancha</span>
            <span className="text-[#37b24d]">Lista</span>
          </Link>
          <nav
            aria-label="Navegación principal"
            className="hidden items-center gap-9 text-sm font-bold text-white/88 lg:flex"
          >
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="transition duration-200 hover:text-[#8fdf80] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#8fdf80]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <ButtonLink href={whatsappDemoHref}>
            Solicitar demo
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </ButtonLink>
        </div>
      </header>

      <section className="relative isolate overflow-hidden bg-white pb-12 pt-11 sm:pb-16 lg:pb-24">
        <div className="absolute inset-x-0 bottom-[-38px] -z-10 hidden h-[250px] sm:block sm:h-[290px] lg:h-[330px]">
          <Image
            src={bucaramangaCity}
            alt="Panorámica de Bucaramanga con montañas al fondo"
            fill
            priority
            sizes="100vw"
            className="object-cover object-bottom opacity-85"
          />
        </div>
        <div className="absolute inset-y-0 right-0 -z-10 hidden w-1/2 bg-[radial-gradient(circle_at_60%_20%,rgba(47,170,63,0.12),transparent_36%)] lg:block" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-[180px] bg-[linear-gradient(180deg,transparent,rgba(234,247,234,0.72))] sm:hidden" />
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-[0.94fr_1.06fr] lg:px-10">
          <div className="max-w-2xl pt-2 lg:pt-7">
            <div className="inline-flex min-h-11 items-center gap-3 rounded-full border border-[#2faa3f]/45 bg-white/82 px-5 text-sm font-extrabold text-[#248234] shadow-[0_12px_28px_rgba(16,32,28,0.08)] backdrop-blur">
              <MapPin className="h-5 w-5" aria-hidden="true" />
              Hecho en Bucaramanga, Santander
            </div>
            <h1 className="mt-8 max-w-[700px] font-[var(--font-display)] text-[clamp(3rem,5.7vw,4.85rem)] font-black leading-[0.96] text-[#071713]">
              Administra tu club de pádel y recibe{" "}
              <span className="text-[#2faa3f]">reservas en línea</span>
            </h1>
            <p className="mt-6 max-w-[560px] text-lg leading-8 text-[#344841] sm:text-xl">
              CanchaLista te ayuda a mostrar tus canchas, horarios disponibles
              y precios, mientras los jugadores reservan fácil desde la web.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <ButtonLink href={whatsappDemoHref}>
                Solicitar demo
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </ButtonLink>
              <ButtonLink href="#funciona" variant="secondary">
                Ver cómo funciona
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#eaf7ea] text-[#2faa3f]">
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </ButtonLink>
            </div>
            <div className="mt-7 flex flex-col gap-3 text-sm font-semibold text-[#41544d] sm:flex-row sm:items-center">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-[#2faa3f]" aria-hidden="true" />
                Tecnología local para clubes de pádel
              </span>
              <span className="hidden h-4 w-px bg-[#c9d8cf] sm:block" />
              <span className="inline-flex items-center gap-2">
                <ColombiaMark />
                Hecho en Bucaramanga, Santander
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[890px] lg:mr-[-58px]">
            <div className="absolute -inset-8 rounded-[44px] bg-[radial-gradient(circle_at_55%_35%,rgba(47,170,63,0.18),transparent_42%),linear-gradient(145deg,rgba(6,46,41,0.08),rgba(255,255,255,0))] blur-2xl" />
            <div className="relative z-10 overflow-hidden rounded-[26px] bg-white/35 shadow-[0_32px_70px_rgba(6,46,41,0.16)] ring-1 ring-white/70 [mask-image:radial-gradient(ellipse_at_center,black_64%,transparent_100%)] sm:rounded-[36px]">
              <Image
                src={heroImage}
                alt="Laptop y teléfono mostrando la agenda y reserva de CanchaLista"
                priority
                sizes="(min-width: 1024px) 60vw, 94vw"
                className="h-auto w-full scale-[1.06] object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 -mt-2 px-5 sm:px-8 lg:-mt-10 lg:px-10">
        <div className="mx-auto grid max-w-7xl items-center gap-7 rounded-[28px] border border-[#dde9de] bg-white/96 p-6 shadow-[0_24px_70px_rgba(16,32,28,0.13)] backdrop-blur sm:p-8 md:grid-cols-[0.95fr_1.05fr] lg:grid-cols-[1fr_1.35fr_1.95fr]">
          <div className="overflow-hidden rounded-[22px] bg-[#f2fbf0] md:max-h-[230px] lg:max-h-none">
            <Image
              src={santanderCityImage}
              alt="Ilustración verde de Bucaramanga y Santander"
              sizes="(min-width: 1024px) 24vw, 90vw"
              className="h-auto w-full object-cover object-center md:h-full"
            />
          </div>
          <div>
            <h2 className="font-[var(--font-display)] text-3xl font-black leading-tight text-[#10201c] sm:text-4xl">
              Producto <span className="text-[#2faa3f]">santandereano</span>,
              pensado para clubes reales.
            </h2>
            <p className="mt-4 text-base leading-7 text-[#5a6b64]">
              Nacido en Bucaramanga para digitalizar la operación de clubes de
              pádel en Santander y Colombia.
            </p>
          </div>
          <div className="grid gap-4 border-[#cfe0d3] md:col-span-2 md:grid-cols-2 lg:col-span-1 lg:grid-cols-4 lg:border-l lg:pl-7">
            {localValues.map(({ title, icon: Icon }) => (
              <div
                key={title}
                className="flex items-center gap-3 rounded-2xl bg-[#f7faf7] p-4 text-[#10201c] lg:flex-col lg:bg-white lg:p-2 lg:text-center"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#eaf7ea] text-[#2faa3f]">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <span className="text-sm font-bold leading-snug">{title}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="funcionalidades"
        className="bg-[linear-gradient(180deg,#ffffff_0%,#f7faf7_52%,#ffffff_100%)] px-5 py-16 sm:px-8 lg:px-10"
      >
        <div className="mx-auto max-w-7xl">
          <div className="grid items-end gap-6 lg:grid-cols-[0.92fr_1.08fr]">
            <div>
              <span className="inline-flex rounded-full border border-[#cfe6cf] bg-white px-4 py-2 text-sm font-black text-[#248f35] shadow-[0_10px_24px_rgba(16,32,28,0.05)]">
                Operación completa del club
              </span>
              <h2 className="mt-5 max-w-[720px] font-[var(--font-display)] text-3xl font-black leading-tight text-[#10201c] sm:text-5xl">
                Todo lo que tu club necesita, organizado por prioridad
              </h2>
            </div>
            <p className="max-w-[640px] text-base leading-8 text-[#5a6b64] lg:justify-self-end">
              CanchaLista pone primero las tareas que más mueven la operación:
              agenda, reservas y control diario. Lo demás queda cerca, claro y
              sin ruido.
            </p>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-[1.18fr_0.82fr]">
            <article className="group overflow-hidden rounded-[30px] border border-[#d7e8d7] bg-white shadow-[0_26px_70px_rgba(16,32,28,0.09)] transition duration-300 hover:-translate-y-1">
              <div className="grid min-h-[420px] gap-0 md:grid-cols-[0.92fr_1.08fr]">
                <div className="flex flex-col justify-between p-7 sm:p-9">
                  <div>
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eaf7ea] text-[#2faa3f]">
                      <Clock3 className="h-7 w-7" aria-hidden="true" />
                    </span>
                    <h3 className="mt-6 font-[var(--font-display)] text-3xl font-black leading-tight text-[#10201c] sm:text-4xl">
                      Agenda diaria que se entiende de un vistazo
                    </h3>
                    <p className="mt-4 text-base leading-7 text-[#5a6b64]">
                      Visualiza reservas, bloqueos, pagos y disponibilidad del
                      día sin depender de mensajes dispersos.
                    </p>
                  </div>
                  <div className="mt-8 grid grid-cols-3 gap-3 text-center">
                    {["Reservas", "Pagos", "Bloqueos"].map((item) => (
                      <div
                        key={item}
                        className="rounded-2xl border border-[#e2eee2] bg-[#f7faf7] px-3 py-4"
                      >
                        <span className="text-sm font-black text-[#10201c]">
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="relative min-h-[280px] bg-[#062e29] p-5 sm:p-7">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_8%,rgba(55,178,77,0.32),transparent_36%)]" />
                  <div className="relative h-full rounded-[24px] border border-white/12 bg-white/94 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
                    <div className="flex items-center justify-between border-b border-[#dbe8dd] pb-4">
                      <div>
                        <p className="text-xs font-black uppercase text-[#6b7d75]">
                          Agenda de hoy
                        </p>
                        <p className="mt-1 text-xl font-black text-[#10201c]">
                          Cancha Central
                        </p>
                      </div>
                      <span className="rounded-full bg-[#eaf7ea] px-3 py-1 text-xs font-black text-[#248f35]">
                        En vivo
                      </span>
                    </div>
                    <div className="mt-5 space-y-4">
                      {[
                        ["08:00", "Disponible", "bg-[#eaf7ea] text-[#248f35]"],
                        ["10:00", "Andrés & Juan", "bg-[#9ed58e] text-[#10201c]"],
                        ["12:00", "Mantenimiento", "bg-[#f5eadc] text-[#7a4a12]"],
                        ["16:00", "Laura & Sofía", "bg-[#37b24d] text-white"],
                      ].map(([time, label, style]) => (
                        <div
                          key={`${time}-${label}`}
                          className="grid grid-cols-[58px_1fr] items-center gap-3"
                        >
                          <span className="text-sm font-black text-[#6b7d75]">
                            {time}
                          </span>
                          <span
                            className={`rounded-full px-4 py-3 text-sm font-black ${style}`}
                          >
                            {label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </article>

            <div className="grid gap-5">
              <article className="rounded-[30px] border border-[#d7e8d7] bg-[#062e29] p-7 text-white shadow-[0_26px_70px_rgba(6,46,41,0.15)]">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-[#8fdf80] ring-1 ring-white/15">
                  <CalendarCheck className="h-7 w-7" aria-hidden="true" />
                </span>
                <h3 className="mt-6 font-[var(--font-display)] text-3xl font-black leading-tight">
                  Reservas en línea listas para vender
                </h3>
                <p className="mt-4 text-base leading-7 text-white/78">
                  Jugadores eligen fecha, hora y cancha en minutos desde
                  cualquier dispositivo.
                </p>
                <div className="mt-7 rounded-[22px] border border-white/12 bg-white/8 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                  <div className="grid grid-cols-4 gap-2">
                    {["8", "10", "12", "16", "18", "19", "20", "21"].map(
                      (hour) => (
                        <span
                          key={hour}
                          className="rounded-xl bg-white/10 py-2 text-center text-sm font-black text-white/86"
                        >
                          {hour}:00
                        </span>
                      ),
                    )}
                  </div>
                </div>
              </article>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                {features.slice(2).map(({ title, description, icon: Icon }) => (
                  <article
                    key={title}
                    className="group flex gap-4 rounded-[24px] border border-[#dcebdc] bg-white p-5 shadow-[0_18px_44px_rgba(16,32,28,0.06)] transition duration-300 hover:-translate-y-1 hover:border-[#a8d9a1]"
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#eaf7ea] text-[#2faa3f] transition duration-300 group-hover:bg-[#2faa3f] group-hover:text-white">
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </span>
                    <span>
                      <h3 className="text-lg font-black text-[#10201c]">
                        {title}
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-[#5a6b64]">
                        {description}
                      </p>
                    </span>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="roles" className="px-5 pb-9 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-center font-[var(--font-display)] text-3xl font-black text-[#10201c] sm:text-5xl">
            Una plataforma para cada rol
          </h2>
          <div className="mt-10 grid gap-5 lg:grid-cols-[0.9fr_1.2fr_0.9fr] lg:items-end">
            {audiences.map(({ title, description, image, icon: Icon, alt }) => (
              <article
                key={title}
                className={`group relative overflow-hidden rounded-[22px] bg-[#062e29] shadow-[0_24px_58px_rgba(6,46,41,0.18)] ${
                  title === "Para administradores de club"
                    ? "min-h-[330px] lg:min-h-[360px]"
                    : "min-h-[270px] lg:min-h-[305px]"
                }`}
              >
                <Image
                  src={image}
                  alt={alt}
                  fill
                  loading="eager"
                  sizes="(min-width: 1024px) 31vw, 92vw"
                  className="object-cover transition duration-500 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,46,41,0.02)_0%,rgba(6,46,41,0.58)_55%,rgba(3,29,25,0.9)_100%)]" />
                <div className="relative flex h-full min-h-[inherit] flex-col justify-end p-7 text-white">
                  <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#0b3d2e]/88 text-[#8fdf80] ring-1 ring-white/15">
                    <Icon className="h-7 w-7" aria-hidden="true" />
                  </span>
                  <h3 className="text-2xl font-black leading-tight">{title}</h3>
                  <p className="mt-3 max-w-[360px] text-base leading-7 text-white/88">
                    {description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="funciona" className="px-5 py-10 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center font-[var(--font-display)] text-3xl font-black text-[#10201c] sm:text-5xl">
            Así de fácil funciona CanchaLista
          </h2>
          <div className="mt-11 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(({ title, icon: Icon }, index) => (
              <article key={title} className="relative text-center">
                {index < steps.length - 1 ? (
                  <span className="absolute left-[calc(50%+58px)] top-[58px] hidden h-px w-[calc(100%-116px)] border-t-2 border-dotted border-[#83c878] lg:block" />
                ) : null}
                <div className="relative mx-auto flex h-[116px] w-[116px] items-center justify-center rounded-full border border-[#d8ead7] bg-[#f2fbf0] text-[#2faa3f] shadow-[0_18px_36px_rgba(16,32,28,0.08)]">
                  <span className="absolute -right-1 -top-1 flex h-8 w-8 items-center justify-center rounded-full bg-[#248f35] text-sm font-black text-white">
                    {index + 1}
                  </span>
                  <Icon className="h-12 w-12" aria-hidden="true" />
                </div>
                <h3 className="mx-auto mt-5 max-w-[210px] text-lg font-black leading-snug text-[#10201c]">
                  {title}
                </h3>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="clubes" className="px-5 py-12 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl overflow-hidden rounded-[22px] border border-[#d9e9d9] bg-[#f7faf7] shadow-[0_22px_50px_rgba(16,32,28,0.08)] lg:grid-cols-[0.88fr_1.12fr]">
          <div className="flex min-h-[330px] flex-col justify-center p-8 sm:p-12 lg:p-14">
            <span className="text-[92px] font-black leading-none text-[#2faa3f]">
              “
            </span>
            <blockquote className="-mt-6 max-w-[560px] text-2xl font-semibold leading-tight text-[#10201c] sm:text-4xl">
              CanchaLista nos ayudó a ordenar la agenda y a recibir reservas de
              forma mucho más simple.
            </blockquote>
            <p className="mt-6 text-base font-bold text-[#40554c]">
              — Club de pádel en Bucaramanga
            </p>
          </div>
          <div className="relative min-h-[330px]">
            <Image
              src={clubImage}
              alt="Club de pádel con canchas y zona social en ambiente cálido"
              fill
              loading="eager"
              sizes="(min-width: 1024px) 50vw, 92vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,#f7faf7_0%,rgba(247,250,247,0.58)_18%,rgba(247,250,247,0)_48%)]" />
          </div>
        </div>
      </section>

      <section id="contacto" className="relative isolate overflow-hidden bg-[#062e29] px-5 py-12 text-white sm:px-8 lg:px-10">
        <Image
          src={racketImage}
          alt="Pala de pádel y bola con iluminación verde"
          fill
          loading="eager"
          sizes="100vw"
          className="-z-20 object-cover object-center opacity-80"
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(6,46,41,0.96)_0%,rgba(6,46,41,0.86)_45%,rgba(6,46,41,0.2)_100%)]" />
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h2 className="max-w-[620px] font-[var(--font-display)] text-4xl font-black leading-tight sm:text-6xl">
              Lleva tu club al{" "}
              <span className="text-[#37b24d]">siguiente nivel</span>
            </h2>
            <p className="mt-5 max-w-[520px] text-lg leading-8 text-white/88">
              Empieza a organizar tus reservas, canchas y operación desde una
              sola plataforma.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <ButtonLink href={whatsappDemoHref}>
                Solicitar demo
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </ButtonLink>
              <ButtonLink href={whatsappDemoHref} variant="dark">
                <MessageCircle className="h-5 w-5" aria-hidden="true" />
                Hablar por WhatsApp
              </ButtonLink>
            </div>
            <p className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-white/92">
              <Sparkles className="h-5 w-5 text-[#8fdf80]" aria-hidden="true" />
              Hecho en Bucaramanga, Santander
              <ColombiaMark />
            </p>
          </div>
          <div className="hidden justify-center lg:flex">
            <div className="relative h-[230px] w-[260px] text-[#37b24d]">
              <Building2 className="absolute left-10 top-8 h-16 w-16 opacity-40" aria-hidden="true" />
              <Wrench className="absolute right-10 top-12 h-14 w-14 opacity-35" aria-hidden="true" />
              <span className="absolute bottom-7 left-0 right-0 text-center text-3xl font-black uppercase leading-none text-[#37b24d]">
                Somos
                <br />
                Santander
              </span>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-white px-5 py-5 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {trustItems.map(({ title, icon: Icon }) => (
            <div
              key={title}
              className="flex min-h-16 items-center gap-4 border-[#e6efe7] py-2 lg:border-r lg:last:border-r-0"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#eaf7ea] text-[#2faa3f]">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <span className="text-sm font-semibold leading-snug text-[#40554c]">
                {title}
              </span>
            </div>
          ))}
        </div>
      </footer>
    </main>
  );
}
