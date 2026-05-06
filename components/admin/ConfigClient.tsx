"use client";

import {
  AlertCircle,
  Check,
  CreditCard,
  PlugZap,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Unplug,
} from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import {
  inputToMinutes,
  minutesToInput,
  minutesToTime,
} from "@/lib/dates";
import { formatCOP } from "@/lib/format";
import {
  buildMercadoPagoConfigConnectionView,
  buildMercadoPagoConnectionMetadata,
  formatMercadoPagoConnectionStatusLabel,
  getMercadoPagoOAuthResultMessage,
  type MercadoPagoOAuthResultMessage,
} from "@/lib/mercadoPagoConfigUiRules";
import { normalizeMercadoPagoConnectionInput } from "@/lib/mercadoPagoConnectionRules";
import { AdminLayout } from "./AdminLayout";

type OnlineDepositStatus = {
  clubId: string;
  onlineDepositsEnabled: boolean;
  depositMode: "optional";
  depositType: "percentage" | "fixed";
  depositPercentage: number;
  depositFixedAmount: number | null;
  depositMinAmount: number;
  depositMaxAmount: number;
  depositRoundingAmount: number;
  depositApplyAfterMembershipDiscounts: boolean;
  allowPayAtClub: boolean;
  mercadoPagoConnected: boolean;
  mercadoPagoConnectionStatus: string;
  connectionSource: "manual" | "oauth" | null;
  collectorId?: string | null;
  mpUserId: string | null;
  liveMode: boolean | null;
  accessTokenExpiresAt: number | null;
  lastRefreshAt: number | null;
  refreshError: string | null;
  refreshErrorAt: number | null;
  canManageConnection: boolean;
};

const dayLabels = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const MERCADO_PAGO_OAUTH_START_URL =
  "/api/mercadopago/oauth/start?redirectAfterSuccess=/admin/config";

export function ConfigClient() {
  const searchParams = useSearchParams();
  const oauthResultMessage = getMercadoPagoOAuthResultMessage({
    result: searchParams.get("mp_oauth"),
    reason: searchParams.get("reason"),
  });
  const club = useQuery(api.clubs.getCurrentUserClubForAdmin, {});
  const courts = useQuery(
    api.courts.listCourtsByClub,
    club ? { clubId: club._id, includeInactive: true } : "skip",
  );

  return (
    <AdminLayout>
      <div className="p-4 md:p-8">
        <header className="mb-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--ink-500)]">
            Configuración
          </p>
          <h1 className="text-display text-4xl font-black">Datos del club</h1>
          <p className="mt-1 text-[var(--ink-500)]">
            Información visible para jugadores, precios y canchas.
          </p>
        </header>

        <OAuthResultAlert result={oauthResultMessage} />

        {club === undefined || courts === undefined ? (
          <div className="rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-8 text-center font-bold text-[var(--ink-500)]">
            Cargando configuración...
          </div>
        ) : club === null ? (
          <div className="rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-8">
            No encontramos el club demo.
          </div>
        ) : (
          <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
            <ClubSettingsForm key={club.updatedAt} club={club} />
            <div className="space-y-5">
              <OnlineDepositsPanel />
              <CourtsPanel club={club} courts={courts} />
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function OAuthResultAlert({
  result,
}: {
  result: MercadoPagoOAuthResultMessage | null;
}) {
  if (!result) return null;

  const isSuccess = result.kind === "success";
  const Icon = isSuccess ? Check : AlertCircle;

  return (
    <div
      className={`mb-5 flex gap-2 rounded-[var(--r-md)] p-3 text-sm font-bold ${
        isSuccess
          ? "bg-[var(--status-paid-bg)] text-[var(--status-paid-fg)]"
          : "bg-red-50 text-red-700"
      }`}
    >
      <Icon size={17} className="mt-0.5 shrink-0" />
      <span>{result.message}</span>
    </div>
  );
}

function OnlineDepositsPanel() {
  const status = useQuery(api.payments.getClubMercadoPagoStatus, {});

  if (status === undefined) {
    return (
      <section className="rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-5 shadow-[var(--shadow-sm)]">
        <p className="font-bold text-[var(--ink-500)]">Cargando pagos...</p>
      </section>
    );
  }

  return <OnlineDepositsForm key={`${status.clubId}-${status.onlineDepositsEnabled}`} status={status} />;
}

function OnlineDepositsForm({
  status,
}: {
  status: OnlineDepositStatus;
}) {
  const updateSettings = useMutation(api.payments.updateClubDepositSettings);
  const connect = useMutation(api.payments.connectMercadoPagoAccessToken);
  const disconnect = useMutation(api.payments.disconnectMercadoPago);
  const connectionView = buildMercadoPagoConfigConnectionView(status);
  const connectionMetadata = buildMercadoPagoConnectionMetadata(status);
  const connectionBadgeClassName = getMercadoPagoConnectionBadgeClassName(
    connectionView.kind,
  );
  const showDisconnectButton =
    status.canManageConnection && connectionView.kind !== "not_connected";
  const [manualConnectionOpen, setManualConnectionOpen] = useState(
    connectionView.kind === "manual_connected",
  );
  const [accessToken, setAccessToken] = useState("");
  const [collectorId, setCollectorId] = useState("");
  const [onlineDepositsEnabled, setOnlineDepositsEnabled] = useState(
    status.onlineDepositsEnabled,
  );
  const [depositType, setDepositType] = useState(status.depositType);
  const [depositPercentage, setDepositPercentage] = useState(
    status.depositPercentage,
  );
  const [depositFixedAmount, setDepositFixedAmount] = useState(
    status.depositFixedAmount?.toString() ?? "",
  );
  const [depositMinAmount, setDepositMinAmount] = useState(status.depositMinAmount);
  const [depositMaxAmount, setDepositMaxAmount] = useState(status.depositMaxAmount);
  const [depositRoundingAmount, setDepositRoundingAmount] = useState(
    status.depositRoundingAmount,
  );
  const [
    depositApplyAfterMembershipDiscounts,
    setDepositApplyAfterMembershipDiscounts,
  ] = useState(status.depositApplyAfterMembershipDiscounts);
  const [allowPayAtClub, setAllowPayAtClub] = useState(status.allowPayAtClub);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function saveConnection(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const connectionInput = normalizeMercadoPagoConnectionInput({
      accessToken,
      collectorId,
    });

    if (!connectionInput.ok) {
      setError(connectionInput.message);
      return;
    }

    try {
      const { accessToken: normalizedAccessToken, collectorId: normalizedCollectorId } =
        connectionInput;
      await connect(
        normalizedCollectorId
          ? { accessToken: normalizedAccessToken, collectorId: normalizedCollectorId }
          : { accessToken: normalizedAccessToken },
      );
      setAccessToken("");
      setCollectorId("");
      setManualConnectionOpen(true);
      setMessage("Mercado Pago conectado.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No pudimos conectar.");
    }
  }

  async function disconnectConnection() {
    setError("");
    setMessage("");

    try {
      await disconnect();
      setMessage("Mercado Pago desconectado. Los pagos históricos se conservan.");
    } catch {
      setError("No pudimos desconectar Mercado Pago.");
    }
  }

  async function saveDepositSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      await updateSettings({
        onlineDepositsEnabled,
        depositType,
        depositPercentage: Number(depositPercentage),
        depositFixedAmount:
          depositFixedAmount.trim() === "" ? null : Number(depositFixedAmount),
        depositMinAmount: Number(depositMinAmount),
        depositMaxAmount: Number(depositMaxAmount),
        depositRoundingAmount: Number(depositRoundingAmount),
        depositApplyAfterMembershipDiscounts,
        allowPayAtClub,
      });
      setMessage("Anticipos actualizados.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "No pudimos guardar anticipos.",
      );
    }
  }

  return (
    <section className="rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-5 shadow-[var(--shadow-sm)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-[var(--court-600)]" />
            <h2 className="text-xl font-black">Mercado Pago</h2>
          </div>
          <p className="text-sm text-[var(--ink-500)]">
            Pagos online del club y anticipos opcionales.
          </p>
        </div>
        <span className={`pill ${connectionBadgeClassName}`}>
          <span className="dot" />
          {connectionView.badgeLabel}
        </span>
      </div>

      <div className="mb-5 grid gap-4">
        <div>
          <p className="text-sm text-[var(--ink-700)]">{connectionView.message}</p>
          <p className="mt-2 text-sm text-[var(--ink-500)]">
            Los pagos online se procesan directamente en la cuenta de Mercado Pago
            del club. Nuestra plataforma no retiene el dinero; solo registra la
            transacción para mostrar anticipos, cargos, neto recibido y saldo
            pendiente.
          </p>
          <p className="mt-2 text-sm text-[var(--ink-500)]">
            OAuth permite conectar Mercado Pago sin copiar access tokens y facilita
            la renovación segura de credenciales.
          </p>
        </div>

        <div className="grid gap-2 text-sm md:grid-cols-2">
          <ConnectionDetail
            label="Estado"
            value={formatMercadoPagoConnectionStatusLabel(
              status.mercadoPagoConnectionStatus,
            )}
          />
          {connectionMetadata.map((item) => (
            <ConnectionDetail
              key={`${item.label}-${item.value}`}
              label={item.label}
              value={item.value}
            />
          ))}
        </div>

        {connectionView.kind === "reconnect_required" ? (
          <div className="flex gap-2 rounded-[var(--r-md)] bg-red-50 p-3 text-sm font-bold text-red-700">
            <AlertCircle size={17} className="mt-0.5 shrink-0" />
            <span>
              Detectamos un problema con la conexión. Vuelve a conectar Mercado
              Pago para mantener activos los pagos online.
            </span>
          </div>
        ) : null}

        {status.canManageConnection ? (
          <div className="flex flex-wrap gap-2">
            <a className="btn btn-primary" href={MERCADO_PAGO_OAUTH_START_URL}>
              {connectionView.kind === "not_connected" ? (
                <PlugZap size={17} />
              ) : (
                <RefreshCw size={17} />
              )}
              {connectionView.primaryActionLabel}
            </a>
            {showDisconnectButton ? (
              <button
                className="btn btn-ghost"
                type="button"
                onClick={disconnectConnection}
              >
                <Unplug size={17} />
                Desconectar
              </button>
            ) : null}
          </div>
        ) : (
          <p className="rounded-[var(--r-md)] bg-[var(--ink-50)] p-3 text-sm font-bold text-[var(--ink-600)]">
            Solo el administrador principal del club puede conectar o desconectar
            Mercado Pago.
          </p>
        )}

        {status.canManageConnection ? (
          <details
            className="border-t border-[var(--ink-200)] pt-4"
            open={manualConnectionOpen}
            onToggle={(event) =>
              setManualConnectionOpen(event.currentTarget.open)
            }
          >
            <summary className="cursor-pointer text-sm font-black text-[var(--ink-700)]">
              Conexión manual avanzada
            </summary>
            <div className="mt-3 grid gap-3">
              <p className="text-sm text-[var(--ink-500)]">
                Usa este método solo para pruebas internas o soporte. Para clubes,
                recomendamos OAuth. El método manual funciona para pruebas, pero no
                renueva tokens automáticamente.
              </p>
              <form className="grid gap-3" onSubmit={saveConnection}>
                <div className="field">
                  <label>Access token del club</label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={accessToken}
                    onChange={(event) => setAccessToken(event.target.value)}
                    placeholder="APP_USR-..."
                  />
                </div>
                <div className="field">
                  <label>ID Mercado Pago opcional</label>
                  <input
                    autoComplete="off"
                    value={collectorId}
                    onChange={(event) => setCollectorId(event.target.value)}
                  />
                </div>
                <button className="btn btn-dark w-fit" type="submit">
                  <PlugZap size={17} />
                  Conectar manualmente
                </button>
              </form>
            </div>
          </details>
        ) : null}
      </div>

      {!status.mercadoPagoConnected && onlineDepositsEnabled ? (
        <div className="mb-4 flex gap-2 rounded-[var(--r-md)] bg-[var(--status-pending-bg)] p-3 text-sm font-bold text-[var(--status-pending-fg)]">
          <AlertCircle size={17} className="mt-0.5 shrink-0" />
          Conecta Mercado Pago antes de activar anticipos.
        </div>
      ) : null}

      {error ? (
        <p className="mb-4 rounded-[var(--r-md)] bg-red-50 p-3 text-sm font-bold text-red-700">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mb-4 rounded-[var(--r-md)] bg-[var(--status-paid-bg)] p-3 text-sm font-bold text-[var(--status-paid-fg)]">
          {message}
        </p>
      ) : null}

      <form
        className="grid gap-4 border-t border-[var(--ink-200)] pt-5"
        onSubmit={saveDepositSettings}
      >
        <div>
          <h3 className="font-black">Anticipos online</h3>
          <p className="text-sm text-[var(--ink-500)]">
            Reglas del anticipo opcional que puede pagar el jugador al reservar.
          </p>
        </div>
        <label className="flex items-start gap-3 rounded-[var(--r-md)] border border-[var(--ink-200)] bg-[var(--ink-50)] p-3 text-sm font-bold">
          <input
            className="mt-1 accent-[var(--court-500)]"
            type="checkbox"
            checked={onlineDepositsEnabled}
            onChange={(event) => setOnlineDepositsEnabled(event.target.checked)}
          />
          <span>
            Activar anticipos opcionales
            <span className="block text-xs font-medium text-[var(--ink-500)]">
              El jugador siempre puede reservar y pagar en el club.
            </span>
          </span>
        </label>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="field">
            <label>Tipo</label>
            <select
              value={depositType}
              onChange={(event) =>
                setDepositType(event.target.value as "percentage" | "fixed")
              }
            >
              <option value="percentage">Porcentaje</option>
              <option value="fixed">Fijo</option>
            </select>
          </div>
          {depositType === "percentage" ? (
            <NumberInput
              label="Porcentaje"
              suffix="%"
              value={depositPercentage}
              onChange={setDepositPercentage}
            />
          ) : (
            <PriceInput
              label="Valor fijo"
              value={Number(depositFixedAmount || 0)}
              onChange={(value) => setDepositFixedAmount(String(value))}
            />
          )}
          <PriceInput
            label="Minimo"
            value={depositMinAmount}
            onChange={setDepositMinAmount}
          />
          <PriceInput
            label="Maximo"
            value={depositMaxAmount}
            onChange={setDepositMaxAmount}
          />
          <PriceInput
            label="Redondeo"
            value={depositRoundingAmount}
            onChange={setDepositRoundingAmount}
          />
        </div>

        <label className="flex items-center gap-2 text-sm font-bold">
          <input
            type="checkbox"
            checked={depositApplyAfterMembershipDiscounts}
            onChange={(event) =>
              setDepositApplyAfterMembershipDiscounts(event.target.checked)
            }
          />
          Calcular despues de beneficios de membresia
        </label>
        <label className="flex items-center gap-2 text-sm font-bold">
          <input
            type="checkbox"
            checked={allowPayAtClub}
            onChange={(event) => setAllowPayAtClub(event.target.checked)}
          />
          Permitir reservar sin anticipo
        </label>

        <button className="btn btn-primary" type="submit">
          <CreditCard size={17} />
          Guardar anticipos
        </button>
      </form>
    </section>
  );
}

function ConnectionDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--r-md)] bg-[var(--ink-50)] px-3 py-2">
      <p className="text-xs font-bold text-[var(--ink-500)]">{label}</p>
      <p className="break-words font-black text-[var(--ink-900)]">{value}</p>
    </div>
  );
}

function getMercadoPagoConnectionBadgeClassName(
  kind: ReturnType<typeof buildMercadoPagoConfigConnectionView>["kind"],
) {
  if (kind === "oauth_connected") return "pill-available";
  if (kind === "manual_connected") return "pill-pending";
  if (kind === "reconnect_required") return "pill-blocked";
  return "pill-pending";
}

function ClubSettingsForm({ club }: { club: Doc<"clubs"> }) {
  const updateClub = useMutation(api.clubs.updateClubSettings);
  const [name, setName] = useState(club.name);
  const [city, setCity] = useState(club.city);
  const [address, setAddress] = useState(club.address);
  const [whatsapp, setWhatsapp] = useState(club.whatsapp);
  const [description, setDescription] = useState(club.description);
  const [normalPrice, setNormalPrice] = useState(club.pricing.normalPricePerHour);
  const [peakPrice, setPeakPrice] = useState(club.pricing.peakPricePerHour);
  const [weekendPrice, setWeekendPrice] = useState(
    club.pricing.weekendPricePerHour,
  );
  const [openingHours, setOpeningHours] = useState(club.openingHours);
  const [saved, setSaved] = useState(false);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await updateClub({
      slug: club.slug,
      name,
      city,
      address,
      whatsapp,
      description,
      pricing: {
        normalPricePerHour: Number(normalPrice),
        peakPricePerHour: Number(peakPrice),
        weekendPricePerHour: Number(weekendPrice),
        peakStartMinutes: club.pricing.peakStartMinutes,
        peakEndMinutes: club.pricing.peakEndMinutes,
      },
      openingHours,
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  }

  return (
    <form
      className="rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-5 shadow-[var(--shadow-sm)]"
      onSubmit={save}
    >
      <h2 className="mb-4 text-xl font-black">Información del club</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="field">
          <label>Nombre del club</label>
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div className="field">
          <label>Ciudad</label>
          <input value={city} onChange={(event) => setCity(event.target.value)} />
        </div>
        <div className="field md:col-span-2">
          <label>Dirección</label>
          <input value={address} onChange={(event) => setAddress(event.target.value)} />
        </div>
        <div className="field">
          <label>WhatsApp</label>
          <input value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} />
        </div>
        <div className="field">
          <label>Descripción</label>
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
      </div>

      <h2 className="mb-4 mt-7 text-xl font-black">Precios por hora</h2>
      <div className="grid gap-4 md:grid-cols-3">
        <PriceInput label="Normal" value={normalPrice} onChange={setNormalPrice} />
        <PriceInput label="Hora pico" value={peakPrice} onChange={setPeakPrice} />
        <PriceInput
          label="Fin de semana"
          value={weekendPrice}
          onChange={setWeekendPrice}
        />
      </div>
      <p className="mt-2 text-sm text-[var(--ink-500)]">
        Pico actual: {minutesToTime(club.pricing.peakStartMinutes)} -{" "}
        {minutesToTime(club.pricing.peakEndMinutes)} lunes a viernes.
      </p>

      <h2 className="mb-4 mt-7 text-xl font-black">Horarios</h2>
      <div className="grid gap-2">
        {openingHours
          .slice()
          .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
          .map((entry) => (
            <div
              key={entry.dayOfWeek}
              className="grid items-center gap-3 rounded-[var(--r-md)] border border-[var(--ink-200)] p-3 md:grid-cols-[56px_1fr_1fr_auto]"
            >
              <p className="font-black">{dayLabels[entry.dayOfWeek]}</p>
              <input
                type="time"
                value={minutesToInput(entry.openMinutes)}
                onChange={(event) =>
                  setOpeningHours((current) =>
                    current.map((item) =>
                      item.dayOfWeek === entry.dayOfWeek
                        ? { ...item, openMinutes: inputToMinutes(event.target.value) }
                        : item,
                    ),
                  )
                }
              />
              <input
                type="time"
                value={minutesToInput(entry.closeMinutes)}
                onChange={(event) =>
                  setOpeningHours((current) =>
                    current.map((item) =>
                      item.dayOfWeek === entry.dayOfWeek
                        ? { ...item, closeMinutes: inputToMinutes(event.target.value) }
                        : item,
                    ),
                  )
                }
              />
              <label className="flex items-center gap-2 text-sm font-bold">
                <input
                  type="checkbox"
                  checked={entry.isOpen}
                  onChange={(event) =>
                    setOpeningHours((current) =>
                      current.map((item) =>
                        item.dayOfWeek === entry.dayOfWeek
                          ? { ...item, isOpen: event.target.checked }
                          : item,
                      ),
                    )
                  }
                />
                Abierto
              </label>
            </div>
          ))}
      </div>

      <button className="btn btn-primary mt-5" type="submit">
        {saved ? <Check size={17} /> : <Save size={17} />}
        {saved ? "Guardado" : "Guardar cambios"}
      </button>
    </form>
  );
}

function PriceInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <span className="text-xs text-[var(--ink-500)]">{formatCOP(value || 0)}</span>
    </div>
  );
}

function NumberInput({
  label,
  suffix,
  value,
  onChange,
}: {
  label: string;
  suffix?: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      {suffix ? (
        <span className="text-xs text-[var(--ink-500)]">
          {value || 0}
          {suffix}
        </span>
      ) : null}
    </div>
  );
}

function CourtsPanel({
  club,
  courts,
}: {
  club: Doc<"clubs">;
  courts: Doc<"courts">[];
}) {
  const createCourt = useMutation(api.courts.createCourt);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCourtType, setNewCourtType] = useState("Cristal");
  const [newCovered, setNewCovered] = useState(true);

  async function addCourt(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newName.trim()) return;

    await createCourt({
      clubId: club._id,
      name: newName,
      description: newDescription || newCourtType,
      courtType: newCourtType,
      isCovered: newCovered,
      sortOrder: courts.length + 1,
    });
    setNewName("");
    setNewDescription("");
    setNewCourtType("Cristal");
    setNewCovered(true);
  }

  return (
    <section className="rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-5 shadow-[var(--shadow-sm)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black">Canchas</h2>
          <p className="text-sm text-[var(--ink-500)]">
            {courts.filter((court) => court.isActive).length} activas
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {courts
          .slice()
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((court) => (
            <CourtRow key={`${court._id}-${court.updatedAt}`} court={court} />
          ))}
      </div>

      <form
        className="mt-5 rounded-[var(--r-lg)] border border-dashed border-[var(--ink-300)] bg-[var(--ink-50)] p-4"
        onSubmit={addCourt}
      >
        <p className="mb-3 font-black">Agregar cancha</p>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="field">
            <label>Nombre</label>
            <input value={newName} onChange={(event) => setNewName(event.target.value)} />
          </div>
          <div className="field">
            <label>Tipo</label>
            <input
              value={newCourtType}
              onChange={(event) => setNewCourtType(event.target.value)}
            />
          </div>
          <div className="field md:col-span-2">
            <label>Descripción</label>
            <input
              value={newDescription}
              onChange={(event) => setNewDescription(event.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm font-bold">
            <input
              type="checkbox"
              checked={newCovered}
              onChange={(event) => setNewCovered(event.target.checked)}
            />
            Techada
          </label>
        </div>
        <button className="btn btn-dark mt-4" type="submit">
          <Plus size={17} />
          Agregar cancha
        </button>
      </form>
    </section>
  );
}

function CourtRow({ court }: { court: Doc<"courts"> }) {
  const updateCourt = useMutation(api.courts.updateCourt);
  const deactivateCourt = useMutation(api.courts.deactivateCourt);
  const [name, setName] = useState(court.name);
  const [description, setDescription] = useState(court.description);
  const [courtType, setCourtType] = useState(court.courtType);
  const [isCovered, setIsCovered] = useState(court.isCovered);
  const [sortOrder, setSortOrder] = useState(court.sortOrder);
  const [saved, setSaved] = useState(false);

  async function save() {
    await updateCourt({
      courtId: court._id,
      name,
      description,
      courtType,
      isCovered,
      sortOrder,
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1200);
  }

  return (
    <div className="rounded-[var(--r-md)] border border-[var(--ink-200)] p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span
          className={`pill ${court.isActive ? "pill-available" : "pill-blocked"}`}
        >
          <span className="dot" />
          {court.isActive ? "Activa" : "Inactiva"}
        </span>
        <div className="flex gap-2">
          <button className="btn btn-ghost" type="button" onClick={save}>
            {saved ? "Guardada" : "Guardar"}
          </button>
          {court.isActive ? (
            <button
              className="btn btn-danger"
              type="button"
              onClick={() => deactivateCourt({ courtId: court._id })}
            >
              Desactivar
            </button>
          ) : (
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => updateCourt({ courtId: court._id, isActive: true })}
            >
              Activar
            </button>
          )}
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="field">
          <label>Nombre</label>
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div className="field">
          <label>Orden</label>
          <input
            type="number"
            value={sortOrder}
            onChange={(event) => setSortOrder(Number(event.target.value))}
          />
        </div>
        <div className="field">
          <label>Tipo</label>
          <input value={courtType} onChange={(event) => setCourtType(event.target.value)} />
        </div>
        <div className="field">
          <label>Descripción</label>
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm font-bold">
          <input
            type="checkbox"
            checked={isCovered}
            onChange={(event) => setIsCovered(event.target.checked)}
          />
          Techada
        </label>
      </div>
    </div>
  );
}
