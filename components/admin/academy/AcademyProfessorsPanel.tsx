"use client";

import {
  CheckCircle2,
  CircleAlert,
  Mail,
  Pencil,
  Phone,
  Plus,
  Power,
  PowerOff,
  Save,
  UserRound,
} from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import type { FormEvent } from "react";
import { useState } from "react";

import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";

export function AcademyProfessorsPanel({ clubId }: { clubId: Id<"clubs"> }) {
  const professors = useQuery(api.academy.listProfessors, {
    clubId,
    includeInactive: true,
  });
  const createProfessor = useMutation(api.academy.createProfessor);
  const updateProfessor = useMutation(api.academy.updateProfessor);
  const [editing, setEditing] = useState<Doc<"academyProfessors"> | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function reset() {
    setEditing(null);
    setName("");
    setEmail("");
    setPhone("");
    setError("");
  }

  function load(professor: Doc<"academyProfessors">) {
    setEditing(professor);
    setName(professor.name);
    setEmail(professor.email ?? "");
    setPhone(professor.phone ?? "");
    setError("");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      if (editing) {
        await updateProfessor({
          professorId: editing._id,
          name,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
        });
      } else {
        await createProfessor({
          clubId,
          name,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
        });
      }

      setMessage("Profesor guardado.");
      reset();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo guardar.");
    }
  }

  async function toggle(professor: Doc<"academyProfessors">) {
    setError("");
    setMessage("");
    try {
      await updateProfessor({
        professorId: professor._id,
        status: professor.status === "active" ? "inactive" : "active",
      });
      setMessage(professor.status === "active" ? "Profesor desactivado." : "Profesor activado.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo cambiar el estado.");
    }
  }

  if (professors === undefined) {
    return <ProfessorSkeleton />;
  }

  const activeCount = professors.filter((professor) => professor.status === "active").length;

  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(340px,0.72fr)_minmax(0,1.28fr)]">
      <form
        className="rounded-[var(--r-xl)] border border-[var(--ink-200)] bg-white p-5 shadow-[var(--shadow-sm)] xl:sticky xl:top-24 xl:self-start"
        onSubmit={save}
      >
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--court-100)] text-[var(--court-700)]">
            <UserRound size={19} />
          </span>
          <div>
            <h2 className="text-xl font-black">
              {editing ? "Editar profesor" : "Nuevo profesor"}
            </h2>
            <p className="text-sm text-[var(--ink-500)]">
              Mantiene disponible el equipo que dicta clases.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-4">
          <div className="field">
            <label>Nombre</label>
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="field">
            <label>Email opcional</label>
            <input value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          <div className="field">
            <label>Telefono opcional</label>
            <input value={phone} onChange={(event) => setPhone(event.target.value)} />
          </div>
        </div>
        {(error || message) ? <ActionNotice error={error} message={message} /> : null}
        <div className="mt-5 flex flex-wrap gap-3">
          <button className="btn btn-primary active:scale-[0.98]" type="submit">
            {editing ? <Save size={17} /> : <Plus size={17} />}
            Guardar
          </button>
          <button className="btn btn-ghost active:scale-[0.98]" type="button" onClick={reset}>
            Limpiar
          </button>
        </div>
      </form>

      <section className="min-w-0 overflow-hidden rounded-[var(--r-xl)] border border-[var(--ink-200)] bg-white shadow-[var(--shadow-sm)]">
        <div className="flex flex-col gap-3 border-b border-[var(--ink-200)] p-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-black">Profesores</h2>
            <p className="text-sm text-[var(--ink-500)]">
              {activeCount} activos de {professors.length} registrados.
            </p>
          </div>
          <span className="pill pill-available self-start">{activeCount} disponibles</span>
        </div>

        {professors.length === 0 ? (
          <div className="p-8 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--court-100)] text-[var(--court-700)]">
              <UserRound size={22} />
            </span>
            <h3 className="mt-4 text-xl font-black">No hay profesores</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--ink-500)]">
              Crea el primer profesor para empezar a registrar clases.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--ink-200)]">
            {professors.map((professor) => (
              <article key={professor._id} className="grid gap-4 p-5 transition hover:bg-[var(--ink-50)] lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-lg font-black text-[var(--ink-950)]">{professor.name}</h3>
                    <span className={professor.status === "active" ? "pill pill-available" : "pill pill-blocked"}>
                      {professor.status === "active" ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-[var(--ink-600)] sm:grid-cols-2">
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <Mail size={15} className="shrink-0 text-[var(--ink-400)]" />
                      <span className="truncate">{professor.email ?? "Sin email"}</span>
                    </span>
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <Phone size={15} className="shrink-0 text-[var(--ink-400)]" />
                      <span className="truncate">{professor.phone ?? "Sin telefono"}</span>
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="btn btn-ghost px-3 py-2 active:scale-[0.98]" type="button" onClick={() => load(professor)}>
                    <Pencil size={15} />
                    Editar
                  </button>
                  <button
                    className={professor.status === "active" ? "btn btn-danger px-3 py-2 active:scale-[0.98]" : "btn btn-primary px-3 py-2 active:scale-[0.98]"}
                    type="button"
                    onClick={() => void toggle(professor)}
                  >
                    {professor.status === "active" ? <PowerOff size={15} /> : <Power size={15} />}
                    {professor.status === "active" ? "Desactivar" : "Activar"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ActionNotice({ error, message }: { error: string; message: string }) {
  const isError = Boolean(error);

  return (
    <div className={`mt-4 flex items-start gap-3 rounded-[var(--r-lg)] border p-4 text-sm font-bold ${isError ? "border-[#e9c9c4] bg-[#fff7f5] text-[#8a2a1f]" : "border-[var(--court-200)] bg-[var(--court-50)] text-[var(--court-800)]"}`}>
      {isError ? <CircleAlert size={18} /> : <CheckCircle2 size={18} />}
      <span>{isError ? error : message}</span>
    </div>
  );
}

function ProfessorSkeleton() {
  return (
    <section className="rounded-[var(--r-xl)] border border-[var(--ink-200)] bg-white p-5 shadow-[var(--shadow-sm)]">
      <div className="h-4 w-32 rounded-full bg-[var(--court-100)]" />
      <div className="mt-4 h-7 w-56 rounded-[var(--r-md)] bg-[var(--ink-100)]" />
      <div className="mt-6 grid gap-3">
        <div className="h-20 rounded-[var(--r-lg)] bg-[var(--ink-50)]" />
        <div className="h-20 rounded-[var(--r-lg)] bg-[var(--ink-50)]" />
      </div>
    </section>
  );
}
