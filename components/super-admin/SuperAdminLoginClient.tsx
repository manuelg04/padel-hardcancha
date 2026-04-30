"use client";

import { ShieldCheck } from "lucide-react";

import { AuthLoginForm } from "@/components/auth/AuthLoginForm";

export function SuperAdminLoginClient() {
  return (
    <AuthLoginForm
      mode="super"
      eyebrow="CanchaBGA Super Admin"
      title="CanchaBGA Super Admin"
      subtitle="Administra clubes, publicacion y usuarios maestros."
      sideTitle="Clubes, canchas y publicacion."
      sideSubtitle="Administra el directorio publico sin mezclarlo con la operacion diaria."
      sideFooter="CanchaBGA"
      Icon={ShieldCheck}
    />
  );
}
