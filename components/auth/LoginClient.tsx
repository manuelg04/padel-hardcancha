"use client";

import { LockKeyhole } from "lucide-react";

import { AuthLoginForm } from "./AuthLoginForm";

export function LoginClient() {
  return (
    <AuthLoginForm
      mode="any"
      eyebrow="Acceso"
      title="Ingresa a CanchaBGA"
      subtitle="Usa tu email y contrasena para continuar."
      sideTitle="Tu padel, ordenado."
      sideSubtitle="Entra para reservar canchas, revisar tus reservas o administrar tu club."
      sideFooter="Bucaramanga"
      Icon={LockKeyhole}
    />
  );
}
