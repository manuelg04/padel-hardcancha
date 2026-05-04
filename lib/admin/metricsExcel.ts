import type { Worksheet } from "exceljs";

import {
  buildMetricsWorkbookModel,
  type SummaryRow,
} from "./metricsCalculations";
import type {
  ClubMetricsExportData,
  MetricKey,
  MetricsExportParams,
} from "./metricsTypes";

type RowValue = string | number;
type DetailRow = Record<string, RowValue>;
type ColumnDefinition<T extends DetailRow> = {
  header: string;
  key: keyof T;
};

const metricSheets: Record<
  MetricKey,
  {
    name: string;
    title: string;
    filePrefix: string;
  }
> = {
  reservas: {
    name: "Reservas por estado",
    title: "Reservas por estado",
    filePrefix: "reservas-por-estado",
  },
  ingresos: {
    name: "Ingresos liquidados",
    title: "Ingresos liquidados",
    filePrefix: "ingresos-liquidados",
  },
  ocupacion: {
    name: "Ocupación canchas",
    title: "Ocupación de canchas",
    filePrefix: "ocupacion-canchas",
  },
  horarios: {
    name: "Rendimiento horarios",
    title: "Rendimiento por horario",
    filePrefix: "rendimiento-horarios",
  },
  membresias: {
    name: "Membresías",
    title: "Membresías",
    filePrefix: "membresias",
  },
};

const reservasColumns = [
  { header: "Fecha local", key: "date" },
  { header: "Hora inicio", key: "startTime" },
  { header: "Hora fin", key: "endTime" },
  { header: "Cancha", key: "court" },
  { header: "Cliente", key: "customer" },
  { header: "Teléfono o identificador", key: "customerIdentifier" },
  { header: "Estado reserva", key: "bookingStatus" },
  { header: "Tipo", key: "type" },
  { header: "Estado de pago", key: "paymentStatus" },
  { header: "Valor base", key: "baseValue" },
  { header: "Es efectuada", key: "completed" },
  { header: "Creada en", key: "createdAt" },
  { header: "Cancelada en", key: "cancelledAt" },
  { header: "ID reserva", key: "bookingId" },
] as const;

const ingresosColumns = [
  { header: "Fecha local de reserva", key: "date" },
  { header: "Hora inicio", key: "startTime" },
  { header: "Hora fin", key: "endTime" },
  { header: "Cancha", key: "court" },
  { header: "Cliente", key: "customer" },
  { header: "Estado reserva", key: "bookingStatus" },
  { header: "Estado pago reserva", key: "paymentStatus" },
  { header: "Estado liquidación", key: "settlementStatus" },
  { header: "Fecha cierre liquidación", key: "closedAt" },
  { header: "Fecha pago liquidación", key: "paidAt" },
  { header: "Valor base reserva", key: "baseValue" },
  { header: "Total final cobrado/liquidado", key: "finalCollected" },
  { header: "Descuentos aplicados", key: "discounts" },
  { header: "Ajustes", key: "adjustments" },
  { header: "Método de pago", key: "paymentMethod" },
  { header: "ID reserva", key: "bookingId" },
  { header: "ID liquidación", key: "settlementId" },
] as const;

const ocupacionColumns = [
  { header: "Fecha", key: "date" },
  { header: "Cancha", key: "court" },
  { header: "Estado cancha", key: "courtStatus" },
  { header: "Horas disponibles", key: "availableHours" },
  { header: "Horas reservadas confirmadas", key: "reservedCommercialHours" },
  { header: "Horas canceladas", key: "cancelledHours" },
  { header: "Horas bloqueadas", key: "blockedHours" },
  { header: "Ocupación comercial %", key: "occupancyPercent" },
  { header: "Reservas confirmadas", key: "confirmedBookings" },
  { header: "Reservas canceladas", key: "cancelledBookings" },
  { header: "Bloqueos", key: "blocks" },
] as const;

const horariosSlotColumns = [
  { header: "Franja horaria", key: "slot" },
  { header: "Reservas confirmadas", key: "confirmedBookings" },
  { header: "Reservas efectuadas", key: "completedBookings" },
  { header: "Reservas canceladas", key: "cancelledBookings" },
  { header: "Horas reservadas comerciales", key: "reservedCommercialHours" },
  { header: "Valor base esperado", key: "expectedBaseValue" },
  { header: "Total liquidado/cobrado", key: "collectedTotal" },
  { header: "% efectuadas sobre confirmadas", key: "completedOverConfirmedPercent" },
] as const;

const horariosBookingColumns = [
  { header: "Fecha", key: "date" },
  { header: "Hora inicio", key: "startTime" },
  { header: "Hora fin", key: "endTime" },
  { header: "Franja", key: "slot" },
  { header: "Cancha", key: "court" },
  { header: "Cliente", key: "customer" },
  { header: "Estado reserva", key: "bookingStatus" },
  { header: "Es efectuada", key: "completed" },
  { header: "Valor base", key: "baseValue" },
  { header: "Estado liquidación", key: "settlementStatus" },
  { header: "Total liquidado", key: "collectedTotal" },
  { header: "ID reserva", key: "bookingId" },
] as const;

const membershipColumns = [
  { header: "Cliente", key: "customer" },
  { header: "Plan", key: "plan" },
  { header: "Estado membresía", key: "status" },
  { header: "Fecha inicio", key: "startsAt" },
  { header: "Fecha fin/vencimiento", key: "endsAt" },
  { header: "Fecha creación", key: "createdAt" },
  { header: "ID membresía", key: "membershipId" },
  { header: "ID plan", key: "planId" },
] as const;

const benefitColumns = [
  { header: "Fecha reserva", key: "bookingDate" },
  { header: "Hora reserva", key: "bookingTime" },
  { header: "Cancha", key: "court" },
  { header: "Cliente", key: "customer" },
  { header: "Plan", key: "plan" },
  { header: "Tipo de beneficio", key: "benefitType" },
  { header: "Valor original", key: "originalValue" },
  { header: "Descuento aplicado", key: "discountApplied" },
  { header: "Valor cobrado", key: "chargedValue" },
  { header: "Estado liquidación", key: "settlementStatus" },
  { header: "ID reserva", key: "bookingId" },
  { header: "ID liquidación", key: "settlementId" },
] as const;

export async function exportFullMetricsWorkbook(
  data: ClubMetricsExportData,
  params: MetricsExportParams,
) {
  await exportWorkbook(data, params, [
    "reservas",
    "ingresos",
    "ocupacion",
    "horarios",
    "membresias",
  ]);
}

export async function exportSingleMetricWorkbook(
  data: ClubMetricsExportData,
  params: MetricsExportParams,
  metricKey: MetricKey,
) {
  await exportWorkbook(data, params, [metricKey]);
}

export async function createMetricsWorkbookBuffer(
  data: ClubMetricsExportData,
  params: MetricsExportParams,
  metricKeys: MetricKey[],
) {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const model = buildMetricsWorkbookModel(data, params);

  workbook.creator = "CanchaBGA";
  workbook.created = new Date(data.generatedAt);

  for (const metricKey of metricKeys) {
    const sheetInfo = metricSheets[metricKey];
    const worksheet = workbook.addWorksheet(sheetInfo.name);

    if (metricKey === "reservas") {
      addReportSheet(
        worksheet,
        sheetInfo.title,
        data,
        params,
        model.reservas.summaryRows,
        [{ title: "Detalle fila por fila", rows: model.reservas.detail, columns: reservasColumns }],
      );
    }

    if (metricKey === "ingresos") {
      addReportSheet(
        worksheet,
        sheetInfo.title,
        data,
        params,
        model.ingresos.summaryRows,
        [{ title: "Detalle fila por fila", rows: model.ingresos.detail, columns: ingresosColumns }],
      );
    }

    if (metricKey === "ocupacion") {
      addReportSheet(
        worksheet,
        sheetInfo.title,
        data,
        params,
        model.ocupacion.summaryRows,
        [{ title: "Detalle por cancha y día", rows: model.ocupacion.detail, columns: ocupacionColumns }],
      );
    }

    if (metricKey === "horarios") {
      addReportSheet(
        worksheet,
        sheetInfo.title,
        data,
        params,
        model.horarios.summaryRows,
        [
          { title: "Detalle por franja", rows: model.horarios.detailBySlot, columns: horariosSlotColumns },
          { title: "Detalle fila por fila", rows: model.horarios.detailByBooking, columns: horariosBookingColumns },
        ],
      );
    }

    if (metricKey === "membresias") {
      addReportSheet(
        worksheet,
        sheetInfo.title,
        data,
        params,
        model.membresias.summaryRows,
        [
          { title: "Detalle de membresías", rows: model.membresias.membershipDetails, columns: membershipColumns },
          { title: "Detalle de beneficios usados", rows: model.membresias.benefitDetails, columns: benefitColumns },
        ],
      );
    }
  }

  return await workbook.xlsx.writeBuffer();
}

async function exportWorkbook(
  data: ClubMetricsExportData,
  params: MetricsExportParams,
  metricKeys: MetricKey[],
) {
  const buffer = await createMetricsWorkbookBuffer(data, params, metricKeys);
  const prefix =
    metricKeys.length === 1 ? metricSheets[metricKeys[0]].filePrefix : "metricas-club";
  downloadBuffer(
    buffer as BlobPart,
    `${prefix}-${params.startDate}-a-${params.endDate}.xlsx`,
  );
}

function addReportSheet(
  worksheet: Worksheet,
  title: string,
  data: ClubMetricsExportData,
  params: MetricsExportParams,
  summary: SummaryRow[],
  tables: {
    title: string;
    rows: DetailRow[];
    columns: readonly ColumnDefinition<DetailRow>[];
  }[],
) {
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  worksheet.addRow([title]);
  worksheet.addRow(["Club", data.club.name]);
  worksheet.addRow(["Rango", `${params.startDate} a ${params.endDate}`]);
  worksheet.addRow([
    "Generado",
    new Intl.DateTimeFormat("es-CO", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(data.generatedAt)),
  ]);
  worksheet.addRow([]);
  worksheet.addRow(["Resumen"]);
  styleSectionTitle(worksheet.lastRow);
  worksheet.addRow(["Métrica", "Valor"]);
  styleHeaderRow(worksheet.lastRow);

  for (const row of summary) {
    worksheet.addRow([row.label, row.value]);
  }

  for (const table of tables) {
    worksheet.addRow([]);
    worksheet.addRow([table.title]);
    styleSectionTitle(worksheet.lastRow);
    worksheet.addRow(table.columns.map((column) => column.header));
    styleHeaderRow(worksheet.lastRow);

    for (const row of table.rows) {
      worksheet.addRow(table.columns.map((column) => row[column.key] ?? ""));
    }
  }

  worksheet.getRow(1).font = { bold: true, size: 16 };
  autoFitColumns(worksheet);
  formatNumberCells(worksheet);
}

function styleSectionTitle(row: Worksheet["lastRow"]) {
  if (!row) return;

  row.font = { bold: true, size: 13 };
}

function styleHeaderRow(row: Worksheet["lastRow"]) {
  if (!row) return;

  row.font = { bold: true };
  row.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE3E7E4" },
    };
    cell.border = {
      bottom: { style: "thin", color: { argb: "FFCDD2CE" } },
    };
  });
}

function autoFitColumns(worksheet: Worksheet) {
  worksheet.columns.forEach((column) => {
    let maxLength = 12;

    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const value = cell.value;
      const text = value === null || value === undefined ? "" : String(value);
      maxLength = Math.max(maxLength, Math.min(text.length + 2, 42));
    });

    column.width = maxLength;
  });
}

function formatNumberCells(worksheet: Worksheet) {
  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      if (typeof cell.value !== "number") return;

      cell.numFmt = "#,##0";
    });
  });
}

function downloadBuffer(buffer: BlobPart, fileName: string) {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
