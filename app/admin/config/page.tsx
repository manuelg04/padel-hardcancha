import { Suspense } from "react";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { ConfigClient } from "@/components/admin/ConfigClient";
import { getMercadoPagoOAuthResultMessage } from "@/lib/mercadoPagoConfigUiRules";

type ConfigPageProps = {
  searchParams?: Promise<{
    mp_oauth?: string;
    reason?: string;
  }>;
};

export default async function ConfigPage({ searchParams }: ConfigPageProps) {
  const params = await searchParams;
  const oauthResultMessage = getMercadoPagoOAuthResultMessage({
    result: params?.mp_oauth,
    reason: params?.reason,
  });

  return (
    <Suspense fallback={<ConfigPageFallback />}>
      <ConfigClient oauthResultMessage={oauthResultMessage} />
    </Suspense>
  );
}

function ConfigPageFallback() {
  return (
    <AdminLayout>
      <div className="p-4 md:p-8">
        <div className="rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-8 text-center font-bold text-[var(--ink-500)]">
          Cargando configuración...
        </div>
      </div>
    </AdminLayout>
  );
}
