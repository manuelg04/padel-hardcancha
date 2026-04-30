"use client";

import { Check, Plus, Save } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";

import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import {
  inputToMinutes,
  minutesToInput,
  minutesToTime,
} from "@/lib/dates";
import { formatCOP } from "@/lib/format";
import { AdminLayout } from "./AdminLayout";

const dayLabels = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export function ConfigClient() {
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
            <CourtsPanel club={club} courts={courts} />
          </div>
        )}
      </div>
    </AdminLayout>
  );
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
