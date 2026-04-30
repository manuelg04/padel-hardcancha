"use client";

import {
  CheckCircle2,
  CreditCard,
  Power,
  RefreshCcw,
  Save,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAction, useMutation, useQuery } from "convex/react";
import { useState } from "react";

import { api } from "@/convex/_generated/api";
import { AdminLayout } from "./AdminLayout";

function formatDate(value?: number) {
  if (!value) return "No disponible";

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusCopy(status: string) {
  const labels: Record<string, string> = {
    connected: "Conectado",
    disconnected: "No conectado",
    expired: "Credenciales vencidas",
    error: "Error de conexion",
  };
  return labels[status] ?? "No conectado";
}

export function PaymentsConfigClient() {
  const searchParams = useSearchParams();
  const status = useQuery(api.payments.getClubMercadoPagoStatus, {});
  const updateSettings = useMutation(api.payments.updateClubPaymentSettings);
  const disconnect = useMutation(api.payments.disconnectMercadoPago);
  const refreshConnection = useAction(api.payments.refreshMercadoPagoConnection);
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);

  const mpResult = searchParams.get("mp");

  async function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback("");
    setSaving(true);
    const formData = new FormData(event.currentTarget);

    try {
      await updateSettings({
        onlinePaymentsEnabled: formData.get("onlinePaymentsEnabled") === "on",
        onlinePaymentRequired: formData.get("onlinePaymentRequired") === "on",
        paymentHoldMinutes: Number(formData.get("paymentHoldMinutes") ?? 15),
        allowOfflineMercadoPagoMethods:
          formData.get("allowOfflineMercadoPagoMethods") === "on",
      });
      setFeedback("Configuracion guardada.");
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "No pudimos guardar los cambios.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout>
      <div className="p-4 md:p-8">
        <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--ink-500)]">
              Configuracion
            </p>
            <h1 className="text-display text-4xl font-black">Pagos online</h1>
            <p className="mt-1 max-w-2xl text-[var(--ink-500)]">
              Conecta la cuenta Mercado Pago del club para recibir pagos online
              directamente. CanchaBGA no cobra comision por transaccion.
            </p>
          </div>
          <Link className="btn btn-ghost" href="/admin/config">
            Datos del club
          </Link>
        </header>

        {status === undefined ? (
          <div className="rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-8 text-center font-bold text-[var(--ink-500)]">
            Cargando pagos...
          </div>
        ) : (
          <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <section className="rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-5 shadow-[var(--shadow-sm)]">
              <div className="mb-5 flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-[var(--r-lg)] bg-[var(--court-50)] text-[var(--court-700)]">
                  <CreditCard size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-black">Mercado Pago</h2>
                  <p className="text-sm text-[var(--ink-500)]">
                    El dinero llega a la cuenta Mercado Pago del club.
                  </p>
                </div>
              </div>

              {mpResult === "connected" ? (
                <p className="mb-4 rounded-[var(--r-md)] bg-[var(--status-paid-bg)] p-3 text-sm font-bold text-[var(--court-700)]">
                  Mercado Pago quedo conectado.
                </p>
              ) : mpResult === "error" ? (
                <p className="mb-4 rounded-[var(--r-md)] bg-[var(--status-cancelled-bg)] p-3 text-sm font-bold text-[var(--status-cancelled-fg)]">
                  No pudimos completar la conexion. Intenta reconectar.
                </p>
              ) : null}

              <div className="space-y-3 rounded-[var(--r-lg)] border border-[var(--ink-200)] p-4">
                <Detail label="Estado" value={statusCopy(status.status)} />
                <Detail
                  label="Ambiente"
                  value={status.environment === "production" ? "Produccion" : "Sandbox"}
                />
                <Detail label="Collector ID" value={status.collectorId ?? "No disponible"} />
                <Detail label="Ultima conexion" value={formatDate(status.connectedAt)} />
                <Detail
                  label="Vencimiento estimado"
                  value={formatDate(status.accessTokenExpiresAt)}
                />
              </div>

              <div className="mt-5 grid gap-2">
                {status.canManageConnection ? (
                  <>
                    <a className="btn btn-primary btn-block" href="/api/mercadopago/oauth/start">
                      <ShieldCheck size={17} />
                      {status.status === "connected"
                        ? "Reconectar Mercado Pago"
                        : "Conectar Mercado Pago"}
                    </a>
                    <button
                      className="btn btn-ghost btn-block"
                      type="button"
                      onClick={() =>
                        void refreshConnection().then(() =>
                          setFeedback("Conexion revisada."),
                        )
                      }
                    >
                      <RefreshCcw size={17} />
                      Revisar credenciales
                    </button>
                    <button
                      className="btn btn-danger btn-block"
                      type="button"
                      disabled={status.status !== "connected"}
                      onClick={() => {
                        if (window.confirm("Desconectar Mercado Pago?")) {
                          void disconnect().then(() =>
                            setFeedback("Mercado Pago desconectado."),
                          );
                        }
                      }}
                    >
                      <Power size={17} />
                      Desconectar Mercado Pago
                    </button>
                  </>
                ) : (
                  <p className="rounded-[var(--r-md)] bg-[var(--ink-50)] p-3 text-sm font-bold text-[var(--ink-500)]">
                    Solo el club master puede conectar o desconectar Mercado Pago.
                  </p>
                )}
              </div>
            </section>

            <form
              key={`${status.onlinePaymentsEnabled}-${status.onlinePaymentRequired}-${status.paymentHoldMinutes}-${status.allowOfflineMercadoPagoMethods}`}
              className="rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-5 shadow-[var(--shadow-sm)]"
              onSubmit={saveSettings}
            >
              <h2 className="text-xl font-black">Reglas de pago</h2>
              <p className="mt-1 text-sm text-[var(--ink-500)]">
                Puedes ofrecer Mercado Pago como opcion o exigirlo para reservas web.
              </p>

              <div className="mt-5 grid gap-4">
                <label className="flex items-start gap-3 rounded-[var(--r-md)] border border-[var(--ink-200)] p-4">
                  <input
                    type="checkbox"
                    name="onlinePaymentsEnabled"
                    defaultChecked={status.onlinePaymentsEnabled}
                  />
                  <span>
                    <span className="block font-black">Activar pagos online</span>
                    <span className="text-sm text-[var(--ink-500)]">
                      Muestra Mercado Pago como metodo de pago cuando la conexion
                      este activa.
                    </span>
                  </span>
                </label>

                <label className="flex items-start gap-3 rounded-[var(--r-md)] border border-[var(--ink-200)] p-4">
                  <input
                    type="checkbox"
                    name="onlinePaymentRequired"
                    defaultChecked={status.onlinePaymentRequired}
                  />
                  <span>
                    <span className="block font-black">Exigir pago online</span>
                    <span className="text-sm text-[var(--ink-500)]">
                      Las reservas web quedan confirmadas solo cuando Mercado Pago
                      aprueba el pago.
                    </span>
                  </span>
                </label>

                <label className="flex items-start gap-3 rounded-[var(--r-md)] border border-[var(--ink-200)] p-4">
                  <input
                    type="checkbox"
                    name="allowOfflineMercadoPagoMethods"
                    defaultChecked={status.allowOfflineMercadoPagoMethods}
                  />
                  <span>
                    <span className="block font-black">Permitir medios offline</span>
                    <span className="text-sm text-[var(--ink-500)]">
                      Si esta apagado, se excluyen vouchers offline para evitar pagos
                      pendientes largos.
                    </span>
                  </span>
                </label>

                <div className="field max-w-xs">
                  <label htmlFor="hold-minutes">Minutos para pagar</label>
                  <input
                    id="hold-minutes"
                    name="paymentHoldMinutes"
                    type="number"
                    min={5}
                    max={60}
                    defaultValue={status.paymentHoldMinutes}
                  />
                </div>
              </div>

              {feedback ? (
                <p className="mt-4 rounded-[var(--r-md)] bg-[var(--ink-50)] p-3 text-sm font-bold text-[var(--ink-600)]">
                  {feedback}
                </p>
              ) : null}

              <button className="btn btn-primary mt-5" type="submit" disabled={saving}>
                {saving ? <CheckCircle2 size={17} /> : <Save size={17} />}
                {saving ? "Guardando..." : "Guardar reglas"}
              </button>
            </form>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--ink-200)] py-2 last:border-0">
      <span className="text-[var(--ink-500)]">{label}</span>
      <span className="text-right font-black">{value}</span>
    </div>
  );
}
