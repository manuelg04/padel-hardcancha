"use client";

import {
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Plus,
  Search,
  ShieldCheck,
  UserRoundCheck,
  UsersRound,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";

import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { todayBogota } from "@/lib/dates";
import { formatCOP } from "@/lib/format";
import { attendanceStatusLabel, formatDateTime } from "./helpers";
import type { AcademySessionDetails } from "./types";

type PaymentType = "single" | "package";
type PaymentStatus = "pending" | "paid" | "not_required";

export function AcademyClassesPanel({ clubId }: { clubId: Id<"clubs"> }) {
  const today = useMemo(() => todayBogota(), []);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [selectedSessionId, setSelectedSessionId] = useState<Id<"academyClassSessions"> | "">("");
  const [professorId, setProfessorId] = useState<Id<"academyProfessors"> | "">("");
  const [localDate, setLocalDate] = useState(today);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("");
  const [classType, setClassType] = useState<"private" | "group" | "other">("private");
  const [notes, setNotes] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Doc<"customers"> | null>(null);
  const [paymentType, setPaymentType] = useState<PaymentType>("single");
  const [singleClassPrice, setSingleClassPrice] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("pending");
  const [packagePurchaseId, setPackagePurchaseId] = useState<Id<"academyPackagePurchases"> | "">("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const professors = useQuery(api.academy.listProfessors, {
    clubId,
    includeInactive: false,
  });
  const sessions = useQuery(api.academy.listSessions, {
    clubId,
    startDate,
    endDate,
  }) as AcademySessionDetails[] | undefined;
  const customers = useQuery(api.academy.searchCustomers, {
    clubId,
    search: customerSearch,
    limit: 8,
  });
  const usablePackages = useQuery(
    api.academy.listUsablePackagesForCustomer,
    selectedCustomer ? { clubId, customerId: selectedCustomer._id } : "skip",
  );
  const createSession = useMutation(api.academy.createSession);
  const addAttendance = useMutation(api.academy.addAttendance);
  const confirmAttendance = useMutation(api.academy.confirmAttendance);
  const validateAttendance = useMutation(api.academy.validateAttendanceByProfessor);
  const cancelAttendance = useMutation(api.academy.cancelAttendance);
  const cancelSession = useMutation(api.academy.cancelSession);

  async function saveSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!professorId) {
      setError("Selecciona un profesor.");
      return;
    }

    try {
      const sessionId = await createSession({
        clubId,
        professorId,
        localDate,
        startTime,
        endTime: endTime || undefined,
        classType,
        notes: notes || undefined,
      });
      setSelectedSessionId(sessionId);
      setMessage("Clase registrada.");
      setNotes("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo crear la clase.");
    }
  }

  async function saveAttendance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!selectedSessionId || !selectedCustomer) {
      setError("Selecciona una clase y un alumno.");
      return;
    }

    try {
      await addAttendance({
        classSessionId: selectedSessionId,
        customerId: selectedCustomer._id,
        paymentType,
        singleClassPrice: paymentType === "single" ? Number(singleClassPrice) : undefined,
        packagePurchaseId: paymentType === "package" ? packagePurchaseId || undefined : undefined,
        paymentStatus: paymentType === "single" ? paymentStatus : "not_required",
      });
      setSelectedCustomer(null);
      setCustomerSearch("");
      setSingleClassPrice("");
      setPackagePurchaseId("");
      setMessage("Alumno agregado.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo agregar el alumno.");
    }
  }

  async function runAction(action: () => Promise<unknown>, success: string) {
    setError("");
    setMessage("");
    try {
      await action();
      setMessage(success);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo completar la accion.");
    }
  }

  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(360px,0.78fr)_minmax(0,1.22fr)]">
      <section className="min-w-0 space-y-5 xl:sticky xl:top-24 xl:self-start">
        <form className="rounded-[var(--r-xl)] border border-[var(--ink-200)] bg-white p-5 shadow-[var(--shadow-sm)]" onSubmit={saveSession}>
          <PanelHeader icon={CalendarDays} title="Registrar clase" description="Agenda una sesion de academia sin bloquear cancha." />
          <div className="mt-5 grid gap-4">
            <div className="field">
              <label>Profesor</label>
              <select value={professorId} onChange={(event) => setProfessorId(event.target.value as Id<"academyProfessors">)}>
                <option value="">Seleccionar profesor</option>
                {professors?.map((professor) => (
                  <option key={professor._id} value={professor._id}>{professor.name}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="field">
                <label>Fecha</label>
                <input type="date" value={localDate} onChange={(event) => setLocalDate(event.target.value)} />
              </div>
              <div className="field">
                <label>Inicio</label>
                <input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
              </div>
              <div className="field">
                <label>Fin opcional</label>
                <input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
              </div>
            </div>
            <div className="field">
              <label>Tipo</label>
              <select value={classType} onChange={(event) => setClassType(event.target.value as "private" | "group" | "other")}>
                <option value="private">Privada</option>
                <option value="group">Grupal</option>
                <option value="other">Otra</option>
              </select>
            </div>
            <div className="field">
              <label>Notas opcionales</label>
              <input value={notes} onChange={(event) => setNotes(event.target.value)} />
            </div>
          </div>
          <button className="btn btn-primary mt-5 active:scale-[0.98]" type="submit">
            <Plus size={17} />
            Crear clase
          </button>
        </form>

        <form className="rounded-[var(--r-xl)] border border-[var(--ink-200)] bg-white p-5 shadow-[var(--shadow-sm)]" onSubmit={saveAttendance}>
          <PanelHeader icon={UsersRound} title="Agregar alumno" description="El paquete se consume cuando la asistencia queda completa." />
          <div className="mt-5 grid gap-4">
            <div className="field">
              <label>Clase</label>
              <select value={selectedSessionId} onChange={(event) => setSelectedSessionId(event.target.value as Id<"academyClassSessions">)}>
                <option value="">Seleccionar clase</option>
                {sessions?.map((item) => (
                  <option key={item.session._id} value={item.session._id}>
                    {item.session.localDate} {item.session.startTime} - {item.professor.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Buscar alumno</label>
              <div className="flex items-center gap-2 rounded-[var(--r-md)] border border-[var(--ink-200)] bg-white px-3 transition focus-within:border-[var(--court-500)] focus-within:shadow-[0_0_0_3px_rgba(79,140,51,0.15)]">
                <Search size={16} className="text-[var(--ink-400)]" />
                <input className="border-0 px-0 shadow-none focus:shadow-none" value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} />
              </div>
              {customerSearch ? (
                <div className="grid gap-2 rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-[var(--ink-50)] p-2">
                  {customers?.map((customer) => (
                    <button key={customer._id} className="rounded-[var(--r-md)] border border-[var(--ink-200)] bg-white p-3 text-left text-sm transition hover:border-[var(--court-200)] hover:bg-[var(--court-50)] active:scale-[0.99]" type="button" onClick={() => setSelectedCustomer(customer)}>
                      <span className="block font-black">{customer.fullName}</span>
                      <span className="text-[var(--ink-500)]">{customer.phone}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            {selectedCustomer ? (
              <div className="flex items-center gap-2 rounded-[var(--r-lg)] border border-[var(--court-200)] bg-[var(--court-50)] p-3 text-sm font-bold text-[var(--court-800)]">
                <UserRoundCheck size={17} />
                {selectedCustomer.fullName}
              </div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="field">
                <label>Forma de pago</label>
                <select value={paymentType} onChange={(event) => setPaymentType(event.target.value as PaymentType)}>
                  <option value="single">Clase individual</option>
                  <option value="package">Paquete</option>
                </select>
              </div>
              {paymentType === "single" ? (
                <div className="field">
                  <label>Estado pago</label>
                  <select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value as PaymentStatus)}>
                    <option value="pending">Pendiente</option>
                    <option value="paid">Pagado</option>
                  </select>
                </div>
              ) : null}
            </div>
            {paymentType === "single" ? (
              <div className="field">
                <label>Precio clase individual</label>
                <input type="number" min="0" value={singleClassPrice} onChange={(event) => setSingleClassPrice(event.target.value)} />
              </div>
            ) : (
              <div className="field">
                <label>Paquete disponible</label>
                <select value={packagePurchaseId} onChange={(event) => setPackagePurchaseId(event.target.value as Id<"academyPackagePurchases">)}>
                  <option value="">Seleccionar paquete</option>
                  {usablePackages?.map((item) => (
                    <option key={item.packagePurchase._id} value={item.packagePurchase._id}>
                      {item.packagePurchase.name} - {item.remainingClasses} restantes
                    </option>
                  ))}
                </select>
                {selectedCustomer && usablePackages?.length === 0 ? (
                  <p className="text-sm font-bold text-[#8a2a1f]">Este alumno no tiene paquetes activos con saldo.</p>
                ) : null}
              </div>
            )}
          </div>
          <button className="btn btn-primary mt-5 active:scale-[0.98]" type="submit">
            <Plus size={17} />
            Agregar alumno
          </button>
        </form>
      </section>

      <section className="min-w-0 space-y-5">
        {(error || message) ? <ActionNotice error={error} message={message} /> : null}

        <section className="rounded-[var(--r-xl)] border border-[var(--ink-200)] bg-white p-5 shadow-[var(--shadow-sm)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">Clases registradas</h2>
              <p className="text-sm text-[var(--ink-500)]">Filtra el rango y abre una clase para agregar alumnos.</p>
            </div>
            <span className="hidden rounded-full bg-[var(--ink-50)] px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--ink-500)] sm:inline-flex">
              {sessions?.length ?? 0} total
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div className="field">
              <label>Desde</label>
              <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </div>
            <div className="field">
              <label>Hasta</label>
              <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
            </div>
            <button className="btn btn-ghost active:scale-[0.98]" type="button" onClick={() => {
              setStartDate(today);
              setEndDate(today);
            }}>
              Hoy
            </button>
          </div>
        </section>

        <section className="space-y-3">
          {sessions === undefined ? (
            <ClassListSkeleton />
          ) : sessions.length === 0 ? (
            <EmptyClasses />
          ) : (
            sessions.map((item) => (
              <ClassCard
                key={item.session._id}
                item={item}
                selected={selectedSessionId === item.session._id}
                onSelect={() => setSelectedSessionId(item.session._id)}
                onConfirm={(attendanceId) => runAction(() => confirmAttendance({ attendanceId }), "Alumno confirmado.")}
                onValidate={(attendanceId) => runAction(() => validateAttendance({ attendanceId }), "Validacion registrada.")}
                onCancelAttendance={(attendanceId) => runAction(() => cancelAttendance({ attendanceId }), "Asistencia cancelada.")}
                onCancelSession={(sessionId) => runAction(() => cancelSession({ sessionId }), "Clase cancelada.")}
              />
            ))
          )}
        </section>
      </section>
    </div>
  );
}

function ClassCard({
  item,
  selected,
  onSelect,
  onConfirm,
  onValidate,
  onCancelAttendance,
  onCancelSession,
}: {
  item: AcademySessionDetails;
  selected: boolean;
  onSelect: () => void;
  onConfirm: (attendanceId: Id<"academyClassAttendances">) => void;
  onValidate: (attendanceId: Id<"academyClassAttendances">) => void;
  onCancelAttendance: (attendanceId: Id<"academyClassAttendances">) => void;
  onCancelSession: (sessionId: Id<"academyClassSessions">) => void;
}) {
  return (
    <article className={`min-w-0 overflow-hidden rounded-[var(--r-xl)] border bg-white shadow-[var(--shadow-sm)] transition duration-150 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] ${selected ? "border-[var(--court-500)] ring-2 ring-[var(--court-100)]" : "border-[var(--ink-200)]"}`}>
      <div className={selected ? "h-1 bg-[var(--court-500)]" : "h-1 bg-transparent"} />
      <div className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <button className="min-w-0 text-left" type="button" onClick={onSelect}>
            <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-[var(--court-600)]">
              <span className="inline-flex items-center gap-1">
                <CalendarDays size={14} />
                {item.session.localDate}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock3 size={14} />
                {item.session.startTime}{item.session.endTime ? ` - ${item.session.endTime}` : ""}
              </span>
            </div>
            <h3 className="mt-2 truncate text-xl font-black text-[var(--ink-950)]">{item.professor.name}</h3>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="pill pill-available">{item.attendances.length} alumnos</span>
              <span className={item.session.status === "cancelled" ? "pill pill-blocked" : item.session.status === "completed" ? "pill pill-paid" : "pill pill-pending"}>
                {classStatusLabel(item.session.status)}
              </span>
            </div>
          </button>
          <button className="btn btn-danger self-start px-3 py-2 active:scale-[0.98]" type="button" onClick={() => onCancelSession(item.session._id)}>
            <XCircle size={15} />
            Cancelar clase
          </button>
        </div>
        {item.attendances.length === 0 ? (
          <div className="mt-4 rounded-[var(--r-lg)] border border-dashed border-[var(--ink-300)] bg-[var(--ink-50)] p-5 text-sm font-bold text-[var(--ink-500)]">
            Esta clase aun no tiene alumnos.
          </div>
        ) : (
          <>
          <div className="mt-4 grid gap-3 md:hidden">
            {item.attendances.map(({ attendance, customer, packagePurchase }) => (
              <article key={attendance._id} className="rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-[var(--ink-50)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-black text-[var(--ink-950)]">{customer.fullName}</h4>
                    <p className="mt-1 text-sm text-[var(--ink-600)]">
                      {attendance.paymentType === "single"
                        ? `${formatCOP(attendance.singleClassPrice ?? 0)} - ${attendance.paymentStatus}`
                        : `${packagePurchase?.name ?? "Paquete"} - saldo prepago`}
                    </p>
                  </div>
                  <span className={attendance.status === "completed" ? "pill pill-paid" : attendance.status === "cancelled" ? "pill pill-blocked" : "pill pill-pending"}>
                    {attendanceStatusLabel(attendance.status)}
                  </span>
                </div>
                <dl className="mt-3 grid gap-2 text-xs text-[var(--ink-500)]">
                  <div className="flex justify-between gap-3">
                    <dt className="font-black uppercase tracking-[0.12em]">Confirmacion</dt>
                    <dd className="text-right">{formatDateTime(attendance.studentConfirmedAt)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="font-black uppercase tracking-[0.12em]">Profesor</dt>
                    <dd className="text-right">{formatDateTime(attendance.professorValidatedAt)}</dd>
                  </div>
                </dl>
                <div className="mt-4 grid gap-2">
                  <button className="btn btn-ghost w-full px-3 py-2 active:scale-[0.98]" type="button" disabled={Boolean(attendance.studentConfirmedAt) || attendance.status === "cancelled"} onClick={() => onConfirm(attendance._id)}>
                    <CheckCircle2 size={15} />
                    Confirmar alumno
                  </button>
                  <button className="btn btn-primary w-full px-3 py-2 active:scale-[0.98]" type="button" disabled={Boolean(attendance.professorValidatedAt) || attendance.status === "cancelled"} onClick={() => onValidate(attendance._id)}>
                    <ShieldCheck size={15} />
                    Validar profesor
                  </button>
                  <button className="btn btn-danger w-full px-3 py-2 active:scale-[0.98]" type="button" disabled={attendance.status === "cancelled"} onClick={() => onCancelAttendance(attendance._id)}>
                    <XCircle size={15} />
                    Cancelar asistencia
                  </button>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-4 hidden overflow-x-auto rounded-[var(--r-lg)] border border-[var(--ink-200)] md:block">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-[var(--ink-50)] text-xs font-black uppercase text-[var(--ink-500)]">
                <tr>
                  <th className="py-3 pl-4 pr-2">Alumno</th>
                  <th className="py-3 pr-2">Pago</th>
                  <th className="py-3 pr-2">Confirmacion</th>
                  <th className="py-3 pr-2">Profesor</th>
                  <th className="py-3 pr-2">Estado</th>
                  <th className="py-3 pr-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--ink-200)]">
                {item.attendances.map(({ attendance, customer, packagePurchase }) => (
                  <tr key={attendance._id} className="align-top transition hover:bg-[var(--ink-50)]">
                    <td className="py-3 pl-4 pr-2 font-black">{customer.fullName}</td>
                    <td className="py-3 pr-2">
                      {attendance.paymentType === "single" ? (
                        <span>{formatCOP(attendance.singleClassPrice ?? 0)} - {attendance.paymentStatus}</span>
                      ) : (
                        <span>{packagePurchase?.name ?? "Paquete"} - saldo prepago</span>
                      )}
                    </td>
                    <td className="py-3 pr-2">{formatDateTime(attendance.studentConfirmedAt)}</td>
                    <td className="py-3 pr-2">{formatDateTime(attendance.professorValidatedAt)}</td>
                    <td className="py-3 pr-2">
                      <span className={attendance.status === "completed" ? "pill pill-paid" : attendance.status === "cancelled" ? "pill pill-blocked" : "pill pill-pending"}>
                        {attendanceStatusLabel(attendance.status)}
                      </span>
                    </td>
                    <td className="py-3 pr-3">
                      <div className="flex flex-wrap gap-1.5">
                        <button className="btn btn-ghost px-2.5 py-2 active:scale-[0.98]" type="button" disabled={Boolean(attendance.studentConfirmedAt) || attendance.status === "cancelled"} onClick={() => onConfirm(attendance._id)}>
                          <CheckCircle2 size={15} />
                          Confirmar
                        </button>
                        <button className="btn btn-primary px-2.5 py-2 active:scale-[0.98]" type="button" disabled={Boolean(attendance.professorValidatedAt) || attendance.status === "cancelled"} onClick={() => onValidate(attendance._id)}>
                          <ShieldCheck size={15} />
                          Validar
                        </button>
                        <button className="btn btn-danger px-2.5 py-2 active:scale-[0.98]" type="button" disabled={attendance.status === "cancelled"} onClick={() => onCancelAttendance(attendance._id)}>
                          <XCircle size={15} />
                          Cancelar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </article>
  );
}

function PanelHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--court-100)] text-[var(--court-700)]">
        <Icon size={19} />
      </span>
      <div>
        <h2 className="text-xl font-black">{title}</h2>
        <p className="text-sm text-[var(--ink-500)]">{description}</p>
      </div>
    </div>
  );
}

function ActionNotice({ error, message }: { error: string; message: string }) {
  const isError = Boolean(error);

  return (
    <div className={`flex items-start gap-3 rounded-[var(--r-lg)] border p-4 text-sm font-bold shadow-[var(--shadow-sm)] ${isError ? "border-[#e9c9c4] bg-[#fff7f5] text-[#8a2a1f]" : "border-[var(--court-200)] bg-[var(--court-50)] text-[var(--court-800)]"}`}>
      {isError ? <CircleAlert size={18} /> : <CheckCircle2 size={18} />}
      <span>{isError ? error : message}</span>
    </div>
  );
}

function ClassListSkeleton() {
  return (
    <div className="rounded-[var(--r-xl)] border border-[var(--ink-200)] bg-white p-5 shadow-[var(--shadow-sm)]">
      <div className="h-4 w-32 rounded-full bg-[var(--court-100)]" />
      <div className="mt-4 h-6 w-56 rounded-[var(--r-md)] bg-[var(--ink-100)]" />
      <div className="mt-5 h-24 rounded-[var(--r-lg)] bg-[var(--ink-50)]" />
    </div>
  );
}

function EmptyClasses() {
  return (
    <div className="rounded-[var(--r-xl)] border border-dashed border-[var(--ink-300)] bg-white p-8 text-center shadow-[var(--shadow-sm)]">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--court-100)] text-[var(--court-700)]">
        <CalendarDays size={22} />
      </span>
      <h3 className="mt-4 text-xl font-black">No hay clases en este rango</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--ink-500)]">
        Registra una clase desde el panel izquierdo o cambia el rango de fechas.
      </p>
    </div>
  );
}

function classStatusLabel(status: string) {
  const labels: Record<string, string> = {
    registered: "Registrada",
    completed: "Completada",
    cancelled: "Cancelada",
  };

  return labels[status] ?? status;
}
