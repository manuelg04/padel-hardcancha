"use client";

import { LockKeyhole } from "lucide-react";

import { AuthLoginForm } from "@/components/auth/AuthLoginForm";

export function LoginClient() {
  return (
    <AuthLoginForm
      mode="club"
      eyebrow="Panel del club"
      title="Panel del club"
      subtitle="Ingresa con tu cuenta del club."
      sideTitle="Tu cancha, tu agenda, tu negocio."
      sideSubtitle="Reservas online y operacion diaria para clubes de padel en Santander."
      sideFooter="CanchaBGA"
      Icon={LockKeyhole}
    />
  );
}
