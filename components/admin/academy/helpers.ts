export function formatDateTime(timestamp?: number) {
  if (!timestamp) return "Pendiente";

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(new Date(timestamp));
}

export function formatDate(timestamp?: number) {
  if (!timestamp) return "Sin vencimiento";

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeZone: "America/Bogota",
  }).format(new Date(timestamp));
}

export function downloadCsv(fileName: string, rows: (string | number)[][]) {
  const csv = rows
    .map((row) =>
      row
        .map((value) => {
          const text = String(value ?? "");
          return `"${text.replace(/"/g, '""')}"`;
        })
        .join(","),
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function attendanceStatusLabel(status: string) {
  const labels: Record<string, string> = {
    registered: "Registrada",
    student_confirmed: "Alumno confirmado",
    professor_validated: "Profesor valido",
    completed: "Completada",
    cancelled: "Cancelada",
  };

  return labels[status] ?? status;
}

export function packageStatusLabel(status: string) {
  const labels: Record<string, string> = {
    active: "Activo",
    exhausted: "Agotado",
    expired: "Vencido",
    cancelled: "Cancelado",
  };

  return labels[status] ?? status;
}
