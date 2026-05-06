import type { ReactNode } from "react";
import { CalendarIcon, CheckIcon, MapIcon, MonitorIcon } from "./Icons";

const steps: { num: string; icon: ReactNode; title: string; desc: string }[] = [
  {
    num: "01",
    icon: <MapIcon size={20} />,
    title: "El club publica sus canchas",
    desc: "Carga tus canchas, horarios y precios en minutos. Personaliza tu página pública.",
  },
  {
    num: "02",
    icon: <CalendarIcon size={20} />,
    title: "El jugador elige fecha y hora",
    desc: "Desde la web, sin app ni descargas. Ve disponibilidad real en tiempo real.",
  },
  {
    num: "03",
    icon: <CheckIcon size={20} />,
    title: "Se crea la reserva",
    desc: "Confirmación inmediata y recordatorio por WhatsApp. Pago opcional en línea.",
  },
  {
    num: "04",
    icon: <MonitorIcon size={20} />,
    title: "El club administra la operación",
    desc: "Agenda, pagos, bloqueos y miembros — todo en una sola pantalla.",
  },
];

export function HowItWorks() {
  return (
    <section className="section-dark" id="funciona">
      <div className="container">
        <div className="section-header reveal">
          <div className="section-index">[ 02 · Cómo funciona ]</div>
          <h2 className="section-title">
            Cuatro pasos para llevar tu club{" "}
            <span className="accent">a otro nivel.</span>
          </h2>
        </div>
        <div className="steps">
          {steps.map((s) => (
            <div className="step reveal" key={s.num}>
              <div className="step-icon">{s.icon}</div>
              <div className="step-num">
                {s.num}
                <span style={{ flex: 1 }} />
              </div>
              <div className="step-title">{s.title}</div>
              <p className="step-desc">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
