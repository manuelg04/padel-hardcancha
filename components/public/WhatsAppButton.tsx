import { MessageCircle } from "lucide-react";

import { whatsappUrl } from "@/lib/whatsapp";

export function WhatsAppButton({
  phone,
  message,
  className = "btn btn-ghost",
  label = "WhatsApp",
}: {
  phone: string;
  message: string;
  className?: string;
  label?: string;
}) {
  return (
    <a
      className={className}
      href={whatsappUrl(phone, message)}
      target="_blank"
      rel="noreferrer"
    >
      <MessageCircle size={17} />
      {label}
    </a>
  );
}
