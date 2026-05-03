"use client";

import { Pause, Search, UserPlus, X, XCircle } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";

import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { todayBogota } from "@/lib/dates";
import { formatCOP, initials } from "@/lib/format";

type MembershipDetails = {
  membership: Doc<"customerMemberships">;
  customer: Doc<"customers">;
  plan: Doc<"membershipPlans">;
};

const bogotaDateToStartTimestamp = (date: string) =>
  new Date(`${date}T00:00:00-05:00`).getTime();

const bogotaDateToEndTimestamp = (date: string) =>
  new Date(`${date}T23:59:59-05:00`).getTime();

const formatMembershipDate = (timestamp: number) =>
  new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "America/Bogota",
  }).format(new Date(timestamp));

const searchableText = (membership: MembershipDetails) =>
  [
    membership.customer.fullName,
    membership.customer.phone,
    membership.customer.email,
    membership.plan.name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

function StepNumber({ value }: { value: number }) {
  return (
    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--court-500)] text-xs font-black text-white">
      {value}
    </span>
  );
}

export function MembershipAssignmentsPanel({
  clubId,
  plans,
  memberships,
  canManage,
}: {
  clubId: Id<"clubs">;
  plans: Doc<"membershipPlans">[];
  memberships: MembershipDetails[];
  canManage: boolean;
}) {
  const createMembership = useMutation(api.memberships.createCustomerMembership);
  const updateStatus = useMutation(api.memberships.updateCustomerMembershipStatus);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Doc<"customers"> | null>(
    null,
  );
  const [planId, setPlanId] = useState<Id<"membershipPlans"> | "">("");
  const [startsDate, setStartsDate] = useState(todayBogota());
  const [endsDate, setEndsDate] = useState("");
  const [notes, setNotes] = useState("");
  const [membershipSearch, setMembershipSearch] = useState("");
  const [error, setError] = useState("");

  const activePlans = plans.filter((plan) => plan.isActive);
  const customers = useQuery(api.memberships.searchCustomersByClub, {
    clubId,
    search: customerSearch,
    limit: 8,
  });
  const visibleMemberships = useMemo(() => {
    const query = membershipSearch.trim().toLowerCase();

    if (!query) return memberships;
    return memberships.filter((membership) =>
      searchableText(membership).includes(query),
    );
  }, [memberships, membershipSearch]);

  async function assignMembership(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCustomer || !planId) return;
    setError("");

    const payload: {
      clubId: Id<"clubs">;
      customerId: Id<"customers">;
      membershipPlanId: Id<"membershipPlans">;
      startsAt: number;
      endsAt?: number;
      notes?: string;
    } = {
      clubId,
      customerId: selectedCustomer._id,
      membershipPlanId: planId,
      startsAt: bogotaDateToStartTimestamp(startsDate),
    };

    if (endsDate) payload.endsAt = bogotaDateToEndTimestamp(endsDate);
    if (notes.trim()) payload.notes = notes;

    try {
      await createMembership(payload);
      setSelectedCustomer(null);
      setPlanId("");
      setEndsDate("");
      setNotes("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo asignar.");
    }
  }

  return (
    <section className="space-y-5">
      {canManage ? (
        <form
          className="rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-5 shadow-[var(--shadow-sm)]"
          onSubmit={assignMembership}
        >
          <div className="mb-5">
            <h2 className="text-xl font-black">Asignar membresía</h2>
            <p className="text-sm text-[var(--ink-500)]">
              Busca un cliente, selecciona un plan y define el período.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex gap-3">
              <StepNumber value={1} />
              <div className="field min-w-0 flex-1">
                <label>Buscar cliente</label>
                <div className="flex items-center gap-2 rounded-[var(--r-md)] border border-[var(--ink-200)] bg-white px-3 focus-within:border-[var(--court-500)] focus-within:shadow-[0_0_0_3px_rgba(79,140,51,0.15)]">
                  <Search size={16} className="text-[var(--ink-400)]" />
                  <input
                    className="border-0 px-0 shadow-none focus:shadow-none"
                    value={customerSearch}
                    onChange={(event) => setCustomerSearch(event.target.value)}
                    placeholder="Nombre, teléfono o email"
                  />
                </div>
                {customerSearch.trim() ? (
                  <div className="grid gap-2">
                    {customers === undefined ? (
                      <p className="text-sm font-bold text-[var(--ink-500)]">
                        Buscando clientes...
                      </p>
                    ) : customers.length === 0 ? (
                      <p className="rounded-[var(--r-md)] border border-dashed border-[var(--ink-300)] bg-[var(--ink-50)] p-3 text-sm font-bold text-[var(--ink-500)]">
                        No hay clientes que coincidan.
                      </p>
                    ) : (
                      customers.map((customer) => (
                        <button
                          key={customer._id}
                          className={`rounded-[var(--r-md)] border p-3 text-left text-sm transition ${
                            selectedCustomer?._id === customer._id
                              ? "border-[var(--court-500)] bg-[var(--court-50)]"
                              : "border-[var(--ink-200)] bg-white hover:bg-[var(--ink-50)]"
                          }`}
                          type="button"
                          onClick={() => setSelectedCustomer(customer)}
                        >
                          <span className="block font-black">{customer.fullName}</span>
                          <span className="text-[var(--ink-500)]">
                            {customer.phone}
                            {customer.email ? ` · ${customer.email}` : ""}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex gap-3">
              <StepNumber value={2} />
              <div className="min-w-0 flex-1">
                <p className="mb-1 text-xs font-bold text-[var(--ink-700)]">
                  Cliente seleccionado
                </p>
                {selectedCustomer ? (
                  <div className="flex items-center justify-between gap-3 rounded-[var(--r-md)] border border-[var(--ink-200)] bg-[var(--ink-50)] p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--court-300)] text-sm font-black text-[var(--court-900)]">
                        {initials(selectedCustomer.fullName)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-black">{selectedCustomer.fullName}</p>
                        <p className="truncate text-xs text-[var(--ink-500)]">
                          {selectedCustomer.phone}
                          {selectedCustomer.email ? ` · ${selectedCustomer.email}` : ""}
                        </p>
                      </div>
                    </div>
                    <button
                      aria-label="Quitar cliente seleccionado"
                      className="btn-icon shrink-0"
                      type="button"
                      onClick={() => setSelectedCustomer(null)}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="rounded-[var(--r-md)] border border-dashed border-[var(--ink-300)] bg-[var(--ink-50)] p-3 text-sm font-bold text-[var(--ink-500)]">
                    Selecciona un cliente de los resultados.
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <StepNumber value={3} />
              <div className="field min-w-0 flex-1">
                <label>Seleccionar plan</label>
                <select
                  value={planId}
                  onChange={(event) =>
                    setPlanId(event.target.value as Id<"membershipPlans">)
                  }
                >
                  <option value="">Seleccionar plan</option>
                  {activePlans.map((plan) => (
                    <option key={plan._id} value={plan._id}>
                      {plan.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <StepNumber value={4} />
              <div className="min-w-0 flex-1">
                <p className="mb-1 text-xs font-bold text-[var(--ink-700)]">
                  Definir período
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="field">
                    <label>Inicio</label>
                    <input
                      type="date"
                      value={startsDate}
                      onChange={(event) => setStartsDate(event.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label>Fin opcional</label>
                    <input
                      type="date"
                      value={endsDate}
                      onChange={(event) => setEndsDate(event.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <StepNumber value={5} />
              <div className="field min-w-0 flex-1">
                <label>Notas opcionales</label>
                <input
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Notas adicionales del plan"
                />
              </div>
            </div>
          </div>

          {error ? (
            <p className="mt-4 rounded-[var(--r-md)] bg-red-50 p-3 text-sm font-bold text-red-700">
              {error}
            </p>
          ) : null}

          <button
            className="btn btn-primary btn-block mt-5"
            disabled={!selectedCustomer || !planId || activePlans.length === 0}
            type="submit"
          >
            <UserPlus size={17} />
            Asignar membresía
          </button>
        </form>
      ) : null}

      <section className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white shadow-[var(--shadow-sm)]">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-black">Membresías activas</h2>
            <p className="text-sm text-[var(--ink-500)]">
              Clientes con beneficio vigente.
            </p>
          </div>
          <div className="field min-w-0 sm:w-72">
            <label>Filtrar</label>
            <div className="flex items-center gap-2 rounded-[var(--r-md)] border border-[var(--ink-200)] bg-white px-3 focus-within:border-[var(--court-500)] focus-within:shadow-[0_0_0_3px_rgba(79,140,51,0.15)]">
              <Search size={16} className="text-[var(--ink-400)]" />
              <input
                className="border-0 px-0 shadow-none focus:shadow-none"
                value={membershipSearch}
                onChange={(event) => setMembershipSearch(event.target.value)}
                placeholder="Nombre, teléfono o plan"
              />
            </div>
          </div>
        </div>

        {visibleMemberships.length === 0 ? (
          <div className="px-5 pb-5">
            <p className="rounded-[var(--r-md)] border border-dashed border-[var(--ink-300)] bg-[var(--ink-50)] p-4 text-sm font-bold text-[var(--ink-500)]">
              No hay membresías activas para mostrar.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-t border-[var(--ink-200)] text-left text-sm">
              <thead className="bg-[var(--ink-50)] text-xs font-black uppercase tracking-[0.04em] text-[var(--ink-500)]">
                <tr>
                  <th className="px-5 py-3">Cliente</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Período</th>
                  <th className="px-4 py-3">Estado</th>
                  {canManage ? <th className="px-5 py-3">Acciones</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--ink-200)]">
                {visibleMemberships.map((item) => (
                  <tr key={item.membership._id} className="align-top">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--court-300)] text-xs font-black text-[var(--court-900)]">
                          {initials(item.customer.fullName)}
                        </span>
                        <div className="min-w-0">
                          <p className="font-black">{item.customer.fullName}</p>
                          <p className="text-xs text-[var(--ink-500)]">
                            {item.customer.phone}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-bold">{item.plan.name}</p>
                      <p className="text-xs text-[var(--ink-500)]">
                        {item.plan.monthlyPrice !== undefined
                          ? `${formatCOP(item.plan.monthlyPrice)} / mes`
                          : "Sin mensualidad"}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-xs text-[var(--ink-600)]">
                      <p>Desde: {formatMembershipDate(item.membership.startsAt)}</p>
                      <p>
                        Hasta:{" "}
                        {item.membership.endsAt
                          ? formatMembershipDate(item.membership.endsAt)
                          : "Sin fecha final"}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <span className="pill pill-available">Vigente</span>
                    </td>
                    {canManage ? (
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="btn btn-ghost px-3 py-2"
                            type="button"
                            onClick={() =>
                              updateStatus({
                                customerMembershipId: item.membership._id,
                                status: "paused",
                              })
                            }
                          >
                            <Pause size={15} />
                            Pausar
                          </button>
                          <button
                            className="btn btn-danger px-3 py-2"
                            type="button"
                            onClick={() =>
                              updateStatus({
                                customerMembershipId: item.membership._id,
                                status: "cancelled",
                              })
                            }
                          >
                            <XCircle size={15} />
                            Cancelar
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="border-t border-[var(--ink-200)] bg-white px-5 py-3 text-xs font-bold text-[var(--ink-500)]">
          Mostrando {visibleMemberships.length} de {memberships.length} resultados
        </div>
      </section>
    </section>
  );
}
