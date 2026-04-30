import { formatCOP } from "./format";

export function whatsappUrl(phone: string, message: string) {
  const normalized = phone.replace(/\D/g, "");
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function reservationShareMessage(details: {
  clubName: string;
  code: string;
  date: string;
  hour: string;
  court: string;
  value: number;
}) {
  return [
    `Hola, reservé en ${details.clubName}.`,
    `Código: ${details.code}`,
    `Fecha: ${details.date}`,
    `Hora: ${details.hour}`,
    `Cancha: ${details.court}`,
    `Valor: ${formatCOP(details.value)}`,
  ].join("\n");
}
