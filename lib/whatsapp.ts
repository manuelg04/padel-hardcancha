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

export function paymentLinkMessage(details: {
  clubName: string;
  customerName: string;
  code: string;
  date: string;
  hour: string;
  court: string;
  value: number;
  checkoutUrl: string;
}) {
  return [
    `Hola ${details.customerName}, te comparto el link de pago para tu reserva en ${details.clubName}.`,
    "",
    `Codigo: ${details.code}`,
    `Cancha: ${details.court}`,
    `Fecha: ${details.date}`,
    `Hora: ${details.hour}`,
    `Valor: ${formatCOP(details.value)}`,
    "",
    "Pagar aqui:",
    details.checkoutUrl,
  ].join("\n");
}
