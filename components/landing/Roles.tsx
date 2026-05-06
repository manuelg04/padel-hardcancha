import Image, { type StaticImageData } from "next/image";
import playersImage from "@/assets-landing/cardimage1.png";
import clubAdminImage from "@/assets-landing/cardimage2.png";
import generalAdminImage from "@/assets-landing/cardimage3.png";
import { CheckIcon } from "./Icons";

type Role = {
  tag: string;
  title: string;
  desc: string;
  bullets: string[];
  image: StaticImageData;
  alt: string;
};

const roles: Role[] = [
  {
    tag: "Para jugadores",
    title: "Reserva en menos de un minuto.",
    desc: "Encuentra clubes cercanos, revisa disponibilidad real y reserva tu cancha desde la web. Consulta tu historial cuando quieras.",
    bullets: [
      "Disponibilidad en tiempo real",
      "Reserva sin app",
      "Recordatorios por WhatsApp",
    ],
    image: playersImage,
    alt: "Jugadores de pádel en una cancha",
  },
  {
    tag: "Para administradores de club",
    title: "Opera tu club sin caos.",
    desc: "Gestiona agenda, canchas, pagos, membresías y la operación diaria. Una sola pantalla, sin mensajes perdidos.",
    bullets: ["Agenda viva", "Pagos y notas", "Bloqueos y mantenimiento"],
    image: clubAdminImage,
    alt: "Administrador de club gestionando la agenda",
  },
  {
    tag: "Para administradores generales",
    title: "Control total de la red.",
    desc: "Crea clubes, publica o despublica, administra canchas y asigna responsables. Vista consolidada de toda tu operación.",
    bullets: ["Multi-club", "Roles y permisos", "Reportes consolidados"],
    image: generalAdminImage,
    alt: "Administrador general revisando reportes",
  },
];

export function Roles() {
  return (
    <section className="section-paper" id="roles">
      <div className="container">
        <div className="section-header reveal">
          <div className="section-index">[ 03 · Roles ]</div>
          <h2 className="section-title">
            Una plataforma <span className="accent">para cada rol.</span>
          </h2>
        </div>
        <div className="section-rule" />

        <div className="roles-grid">
          {roles.map((r) => (
            <div className="role reveal" key={r.tag}>
              <div className="role-img">
                <Image
                  src={r.image}
                  alt={r.alt}
                  className="role-img-photo"
                  sizes="(min-width: 980px) 33vw, 92vw"
                  placeholder="blur"
                />
                <span className="role-tag">{r.tag}</span>
              </div>
              <div className="role-body">
                <div className="role-title">{r.title}</div>
                <p className="role-desc">{r.desc}</p>
                <div className="role-list">
                  {r.bullets.map((b) => (
                    <div className="role-list-item" key={b}>
                      <span className="check">
                        <CheckIcon size={14} />
                      </span>
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
