"use client";

import {
  BarChart3,
  Download,
  FileSpreadsheet,
  PackageCheck,
  ShieldAlert,
  UsersRound,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useQuery } from "convex/react";
import { useMemo, useState } from "react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { todayBogota } from "@/lib/dates";
import { formatCOP } from "@/lib/format";
import {
  attendanceStatusLabel,
  downloadCsv,
  formatDate,
  packageStatusLabel,
} from "./helpers";
import type { AcademyReports } from "./types";

export function AcademyReportsPanel({
  clubId,
  compact = false,
}: {
  clubId: Id<"clubs">;
  compact?: boolean;
}) {
  const today = useMemo(() => todayBogota(), []);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const reports = useQuery(api.academy.getReports, {
    clubId,
    startDate,
    endDate,
  }) as AcademyReports | undefined;

  function exportDaily() {
    if (!reports) return;

    const rows: (string | number)[][] = [
      [
        "Fecha",
        "Hora",
        "Profesor",
        "Alumno",
        "Tipo pago",
        "Precio individual",
        "Paquete",
        "Alumno confirmado",
        "Profesor validado",
        "Estado final",
      ],
    ];

    for (const item of reports.dailyClasses) {
      for (const attendance of item.attendances) {
        rows.push([
          item.session.localDate,
          item.session.startTime,
          item.professor.name,
          attendance.customer.fullName,
          attendance.attendance.paymentType,
          attendance.attendance.singleClassPrice ?? "",
          attendance.packagePurchase?.name ?? "",
          attendance.attendance.studentConfirmedAt ? "Si" : "No",
          attendance.attendance.professorValidatedAt ? "Si" : "No",
          attendanceStatusLabel(attendance.attendance.status),
        ]);
      }
    }

    downloadCsv(`academia-diario-${startDate}-a-${endDate}.csv`, rows);
  }

  function exportPackages() {
    if (!reports) return;

    const rows: (string | number)[][] = [
      [
        "Cliente",
        "Paquete",
        "Fecha compra",
        "Fecha expiracion",
        "Total clases",
        "Usadas",
        "Restantes",
        "Estado",
        "Valor pagado",
      ],
    ];

    for (const item of reports.packages) {
      rows.push([
        item.customer.fullName,
        item.packagePurchase.name,
        formatDate(item.packagePurchase.purchasedAt),
        formatDate(item.packagePurchase.expiresAt),
        item.packagePurchase.totalClasses,
        item.packagePurchase.usedClasses,
        item.remainingClasses,
        packageStatusLabel(item.packagePurchase.status),
        item.packagePurchase.amountPaid,
      ]);
    }

    downloadCsv(`academia-paquetes-${startDate}-a-${endDate}.csv`, rows);
  }

  if (reports === undefined) {
    return <ReportsSkeleton />;
  }

  return (
    <section className="space-y-5">
      <section className="rounded-[var(--r-xl)] border border-[var(--ink-200)] bg-white p-5 shadow-[var(--shadow-sm)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-black">Reportes de academia</h2>
            <p className="text-sm text-[var(--ink-500)]">Consulta ingresos, asistencia y saldos por rango.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto] md:items-end">
            <div className="field">
              <label>Fecha inicial</label>
              <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </div>
            <div className="field">
              <label>Fecha final</label>
              <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
            </div>
            <button className="btn btn-ghost active:scale-[0.98]" type="button" onClick={exportDaily}>
              <Download size={17} />
              Diario CSV
            </button>
            <button className="btn btn-ghost active:scale-[0.98]" type="button" onClick={exportPackages}>
              <FileSpreadsheet size={17} />
              Paquetes CSV
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ReportMetric icon={WalletCards} label="Ventas de paquetes" value={formatCOP(reports.revenue.packageSalesRevenue)} />
        <ReportMetric icon={UsersRound} label="Clases individuales" value={formatCOP(reports.revenue.singleClassRevenue)} />
        <ReportMetric icon={PackageCheck} label="Consumos de paquete" value={reports.revenue.packageClassesConsumed} />
        <ReportMetric icon={BarChart3} label="Total recibido" value={formatCOP(reports.revenue.totalReceived)} highlight />
      </section>

      <div className={compact ? "grid min-w-0 gap-5 xl:grid-cols-2" : "min-w-0 space-y-5"}>
        <ReportTable title="Validaciones pendientes" empty="No hay validaciones pendientes." count={reports.pendingValidations.length}>
          {reports.pendingValidations.length === 0 ? (
            <TableEmpty icon={ShieldAlert} text="Todo esta validado para este rango." />
          ) : (
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-[var(--ink-50)] text-xs font-black uppercase text-[var(--ink-500)]">
                <tr>
                  <th className="px-5 py-3">Fecha</th>
                  <th className="px-4 py-3">Profesor</th>
                  <th className="px-4 py-3">Alumnos pendientes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--ink-200)]">
                {reports.pendingValidations.map((item) => (
                  <tr key={item.session._id} className="transition hover:bg-[var(--ink-50)]">
                    <td className="px-5 py-4">{item.session.localDate} {item.session.startTime}</td>
                    <td className="px-4 py-4 font-black">{item.professor.name}</td>
                    <td className="px-4 py-4">
                      {item.attendances.filter((attendance) => !attendance.attendance.professorValidatedAt && attendance.attendance.status !== "cancelled").length}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </ReportTable>

        <ReportTable title="Reporte por profesor" empty="No hay profesores en el rango." count={reports.professorReport.length}>
          {reports.professorReport.length === 0 ? (
            <TableEmpty icon={UsersRound} text="No hay actividad de profesores en este rango." />
          ) : (
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead className="bg-[var(--ink-50)] text-xs font-black uppercase text-[var(--ink-500)]">
                <tr>
                  <th className="px-5 py-3">Profesor</th>
                  <th className="px-4 py-3">Sesiones</th>
                  <th className="px-4 py-3">Alumnos</th>
                  <th className="px-4 py-3">Individual</th>
                  <th className="px-4 py-3">Paquete</th>
                  <th className="px-5 py-3">Pendientes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--ink-200)]">
                {reports.professorReport.map((row) => (
                  <tr key={row.professorId} className="transition hover:bg-[var(--ink-50)]">
                    <td className="px-5 py-4 font-black">{row.professorName}</td>
                    <td className="px-4 py-4">{row.sessions}</td>
                    <td className="px-4 py-4">{row.studentsServed}</td>
                    <td className="px-4 py-4">{row.singleClassStudents}</td>
                    <td className="px-4 py-4">{row.packageStudents}</td>
                    <td className="px-5 py-4">{row.pendingValidations}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </ReportTable>
      </div>

      {!compact ? (
        <div className="grid min-w-0 gap-5 xl:grid-cols-2">
          <ReportTable title="Clases diarias" empty="No hay clases en el rango." count={reports.dailyClasses.length}>
            {reports.dailyClasses.length === 0 ? (
              <TableEmpty icon={BarChart3} text="No hay clases registradas en este rango." />
            ) : (
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="bg-[var(--ink-50)] text-xs font-black uppercase text-[var(--ink-500)]">
                  <tr>
                    <th className="px-5 py-3">Fecha</th>
                    <th className="px-4 py-3">Profesor</th>
                    <th className="px-4 py-3">Alumno</th>
                    <th className="px-4 py-3">Pago</th>
                    <th className="px-5 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--ink-200)]">
                  {reports.dailyClasses.flatMap((item) =>
                    item.attendances.map((attendance) => (
                      <tr key={attendance.attendance._id} className="transition hover:bg-[var(--ink-50)]">
                        <td className="px-5 py-4">{item.session.localDate} {item.session.startTime}</td>
                        <td className="px-4 py-4 font-black">{item.professor.name}</td>
                        <td className="px-4 py-4">{attendance.customer.fullName}</td>
                        <td className="px-4 py-4">{attendance.attendance.paymentType === "single" ? "Individual" : "Paquete"}</td>
                        <td className="px-5 py-4">{attendanceStatusLabel(attendance.attendance.status)}</td>
                      </tr>
                    )),
                  )}
                </tbody>
              </table>
            )}
          </ReportTable>

          <ReportTable title="Reporte de paquetes" empty="No hay paquetes." count={reports.packages.length}>
            {reports.packages.length === 0 ? (
              <TableEmpty icon={PackageCheck} text="No hay paquetes para este club." />
            ) : (
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="bg-[var(--ink-50)] text-xs font-black uppercase text-[var(--ink-500)]">
                  <tr>
                    <th className="px-5 py-3">Cliente</th>
                    <th className="px-4 py-3">Paquete</th>
                    <th className="px-4 py-3">Usadas</th>
                    <th className="px-4 py-3">Restantes</th>
                    <th className="px-4 py-3">Vence</th>
                    <th className="px-5 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--ink-200)]">
                  {reports.packages.map((item) => (
                    <tr key={item.packagePurchase._id} className="transition hover:bg-[var(--ink-50)]">
                      <td className="px-5 py-4 font-black">{item.customer.fullName}</td>
                      <td className="px-4 py-4">{item.packagePurchase.name}</td>
                      <td className="px-4 py-4">{item.packagePurchase.usedClasses}</td>
                      <td className="px-4 py-4">{item.remainingClasses}</td>
                      <td className="px-4 py-4">{formatDate(item.packagePurchase.expiresAt)}</td>
                      <td className="px-5 py-4">{packageStatusLabel(item.packagePurchase.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </ReportTable>
        </div>
      ) : null}
    </section>
  );
}

function ReportMetric({
  icon: Icon,
  label,
  value,
  highlight = false,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <article className={`rounded-[var(--r-lg)] border p-5 shadow-[var(--shadow-sm)] transition duration-150 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] ${highlight ? "border-[var(--court-200)] bg-[var(--court-50)]" : "border-[var(--ink-200)] bg-white"}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-[var(--ink-500)]">{label}</p>
          <p className="mt-2 text-2xl font-black text-[var(--ink-950)]">{value}</p>
        </div>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--court-100)] text-[var(--court-700)]">
          <Icon size={19} />
        </span>
      </div>
    </article>
  );
}

function ReportTable({
  title,
  empty,
  count,
  children,
}: {
  title: string;
  empty: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-[var(--r-xl)] border border-[var(--ink-200)] bg-white shadow-[var(--shadow-sm)]">
      <div className="flex items-start justify-between gap-3 p-5">
        <div>
          <h2 className="text-xl font-black">{title}</h2>
          <p className="text-sm text-[var(--ink-500)]">{empty}</p>
        </div>
        <span className="rounded-full bg-[var(--ink-50)] px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--ink-500)]">
          {count}
        </span>
      </div>
      <div className="overflow-x-auto border-t border-[var(--ink-200)]">{children}</div>
    </section>
  );
}

function TableEmpty({
  icon: Icon,
  text,
}: {
  icon: LucideIcon;
  text: string;
}) {
  return (
    <div className="p-8 text-center">
      <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-[var(--court-100)] text-[var(--court-700)]">
        <Icon size={21} />
      </span>
      <p className="mt-3 text-sm font-bold text-[var(--ink-500)]">{text}</p>
    </div>
  );
}

function ReportsSkeleton() {
  return (
    <section className="rounded-[var(--r-xl)] border border-[var(--ink-200)] bg-white p-5 shadow-[var(--shadow-sm)]">
      <div className="h-4 w-32 rounded-full bg-[var(--court-100)]" />
      <div className="mt-4 h-7 w-56 rounded-[var(--r-md)] bg-[var(--ink-100)]" />
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="h-24 rounded-[var(--r-lg)] bg-[var(--ink-50)]" />
        <div className="h-24 rounded-[var(--r-lg)] bg-[var(--ink-50)]" />
        <div className="h-24 rounded-[var(--r-lg)] bg-[var(--ink-50)]" />
        <div className="h-24 rounded-[var(--r-lg)] bg-[var(--ink-50)]" />
      </div>
    </section>
  );
}
