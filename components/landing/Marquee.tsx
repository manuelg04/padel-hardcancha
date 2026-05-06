import { SparkleIcon } from "./Icons";

const items = [
  "Agenda en tiempo real",
  "Reservas en línea",
  "Pagos y notas",
  "Bloqueos por mantenimiento",
  "Membresías y planes",
  "Multi-cancha",
  "Hecho en Bucaramanga",
  "Soporte local",
];

export function Marquee() {
  const all = [...items, ...items];
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">
        {all.map((it, i) => (
          <span className="marquee-item" key={i}>
            <span className="star">
              <SparkleIcon />
            </span>
            {it}
          </span>
        ))}
      </div>
    </div>
  );
}
