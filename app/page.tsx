import type { Metadata } from "next";
import { Landing } from "@/components/landing/Landing";
import "./landing.css";

export const metadata: Metadata = {
  title: "CanchaLista | Sistema operativo para clubes de pádel",
  description:
    "Agenda viva, reservas en línea, pagos y bloqueos en una sola pantalla. Hecho en Bucaramanga, Santander.",
};

export default function Home() {
  return <Landing />;
}
