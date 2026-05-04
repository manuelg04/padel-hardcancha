"use client";

import { Download, FileSpreadsheet } from "lucide-react";
import { useQuery } from "convex/react";
import { makeFunctionReference } from "convex/server";
import { useMemo, useState } from "react";

import type {
  ClubMetricsExportData,
  MetricKey,
} from "@/lib/admin/metricsTypes";
import { todayBogota } from "@/lib/dates";
import { AdminLayout } from "./AdminLayout";

type ExportTarget = MetricKey | "full";

const metricButtons: {
  key: MetricKey;
  label: string;
}[] = [
  { key: "reservas", label: "Exportar reservas por estado" },
  { key: "ingresos", label: "Exportar ingresos liquidados" },
  { key: "ocupacion", label: "Exportar ocupación de canchas" },
  { key: "horarios", label: "Exportar rendimiento por horario" },
  { key: "membresias", label: "Exportar membresías" },
];
const getClubMetricsExportData = makeFunctionReference<
  "query",
  { startDate: string; endDate: string },
  ClubMetricsExportData
>("metrics:getClubMetricsExportData");

function defaultMonthRange() {
  const today = todayBogota();
  const [year, month] = today.split("-").map(Number);
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);

  return { startDate, endDate };
}

function dateRangeDays(startDate: string, endDate: string) {
  const start = Date.parse(`${startDate}T00:00:00.000Z`);
  const end = Date.parse(`${endDate}T00:00:00.000Z`);

  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;

  return Math.floor((end - start) / 86400000) + 1;
}

function getRangeError(startDate: string, endDate: string) {
  if (!startDate || !endDate) return "Elige fecha inicial y fecha final.";
  if (startDate > endDate) return "La fecha inicial no puede ser posterior a la final.";

  const days = dateRangeDays(startDate, endDate);

  if (days === null) return "El rango de fechas no es válido.";
  if (days > 92) return "El rango máximo permitido es de 92 días.";

  return "";
}

export function MetricsClient() {
  const initialRange = useMemo(() => defaultMonthRange(), []);
  const [startDate, setStartDate] = useState(initialRange.startDate);
  const [endDate, setEndDate] = useState(initialRange.endDate);
  const [exporting, setExporting] = useState<ExportTarget | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const rangeError = getRangeError(startDate, endDate);
  const data = useQuery(
    getClubMetricsExportData,
    rangeError ? "skip" : { startDate, endDate },
  );
  const hasData = Boolean(
    data &&
      (data.bookings.length > 0 ||
        data.settlements.length > 0 ||
        data.memberships.length > 0),
  );
  const isPreparing = !rangeError && data === undefined;
  const buttonsDisabled = Boolean(rangeError || isPreparing || exporting || !hasData);

  async function exportReport(target: ExportTarget) {
    setMessage("");
    setError("");

    if (!data || rangeError) {
      setError(rangeError || "No hay datos listos para exportar.");
      return;
    }

    if (!hasData) {
      setError("No hay datos para este rango.");
      return;
    }

    try {
      setExporting(target);
      const exporter = await import("@/lib/admin/metricsExcel");
      const params = { startDate, endDate };

      if (target === "full") {
        await exporter.exportFullMetricsWorkbook(data, params);
      } else {
        await exporter.exportSingleMetricWorkbook(data, params, target);
      }

      setMessage("Exportación generada.");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No pudimos generar el archivo.",
      );
    } finally {
      setExporting(null);
    }
  }

  return (
    <AdminLayout>
      <div className="mx-auto w-full max-w-[1100px] p-4 md:p-8">
        <header className="mb-6">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--court-600)]">
            Métricas
          </p>
          <h1 className="text-display mt-1 text-3xl font-black leading-tight md:text-4xl">
            Métricas del club
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--ink-500)] md:text-base">
            Esta sección se encuentra en desarrollo. Por ahora puedes exportar
            reportes operativos en Excel.
          </p>
        </header>

        <section className="rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-5 shadow-[var(--shadow-sm)]">
          <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <div className="field">
              <label htmlFor="metrics-start-date">Fecha inicial</label>
              <input
                id="metrics-start-date"
                type="date"
                value={startDate}
                onChange={(event) => {
                  setStartDate(event.target.value);
                  setMessage("");
                  setError("");
                }}
              />
            </div>
            <div className="field">
              <label htmlFor="metrics-end-date">Fecha final</label>
              <input
                id="metrics-end-date"
                type="date"
                value={endDate}
                onChange={(event) => {
                  setEndDate(event.target.value);
                  setMessage("");
                  setError("");
                }}
              />
            </div>
            <button
              className="btn btn-primary w-full md:w-auto"
              disabled={buttonsDisabled}
              onClick={() => void exportReport("full")}
            >
              <Download size={17} />
              {exporting === "full" ? "Exportando..." : "Exportar reporte completo"}
            </button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {metricButtons.map((button) => (
              <button
                key={button.key}
                className="btn btn-ghost justify-start"
                disabled={buttonsDisabled}
                onClick={() => void exportReport(button.key)}
              >
                <FileSpreadsheet size={17} />
                {exporting === button.key ? "Exportando..." : button.label}
              </button>
            ))}
          </div>

          <div className="mt-5 min-h-6 text-sm font-bold">
            {rangeError ? (
              <p className="text-[#8a2a1f]">{rangeError}</p>
            ) : isPreparing ? (
              <p className="text-[var(--ink-500)]">Preparando datos...</p>
            ) : !hasData ? (
              <p className="text-[var(--ink-500)]">No hay datos para este rango.</p>
            ) : exporting ? (
              <p className="text-[var(--ink-500)]">Exportando...</p>
            ) : error ? (
              <p className="text-[#8a2a1f]">{error}</p>
            ) : message ? (
              <p className="text-[var(--court-700)]">{message}</p>
            ) : null}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
