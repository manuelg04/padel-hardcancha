import { Suspense } from "react";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { ConfigClient } from "@/components/admin/ConfigClient";

export default function ConfigPage() {
  return (
    <Suspense fallback={<ConfigPageFallback />}>
      <ConfigClient />
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
