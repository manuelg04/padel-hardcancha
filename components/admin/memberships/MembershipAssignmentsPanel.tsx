"use client";

import { Pause, Search, UserPlus, XCircle } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";

import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { todayBogota } from "@/lib/dates";

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
          <div className="mb-4">
            <h2 className="text-xl font-black">Asignar membresia</h2>
            <p className="text-sm text-[var(--ink-500)]">
              Usa clientes existentes del club.
            </p>
          </div>

          <div className="field">
            <label>Buscar cliente</label>
            <div className="flex items-center gap-2 rounded-[var(--r-md)] border border-[var(--ink-200)] bg-white px-3">
              <Search size={16} className="text-[var(--ink-400)]" />
              <input
                className="border-0 px-0"
                value={customerSearch}
                onChange={(event) => setCustomerSearch(event.target.value)}
                placeholder="Nombre, telefono o email"
              />
            </div>
          </div>

          <div className="mt-3 grid gap-2">
            {customers === undefined ? (
              <p className="text-sm font-bold text-[var(--ink-500)]">
                Buscando clientes...
              </p>
            ) : customers.length === 0 ? (
              <p className="rounded-[var(--r-md)] border border-dashed border-[var(--ink-300)] p-3 text-sm font-bold text-[var(--ink-500)]">
                No hay clientes que coincidan.
              </p>
            ) : (
              customers.map((customer) => (
                <button
                  key={customer._id}
                  className={`rounded-[var(--r-md)] border p-3 text-left text-sm ${
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

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="field">
              <label>Plan</label>
              <select
                value={planId}
                onChange={(event) =>
                  setPlanId(event.target.value as Id<"membershipPlans">)
                }
              >
                <option value="">Seleccionar</option>
                {activePlans.map((plan) => (
                  <option key={plan._id} value={plan._id}>
                    {plan.name}
                  </option>
                ))}
              </select>
            </div>
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
            <div className="field">
              <label>Notas</label>
              <input value={notes} onChange={(event) => setNotes(event.target.value)} />
            </div>
          </div>

          {error ? (
            <p className="mt-3 rounded-[var(--r-md)] bg-red-50 p-3 text-sm font-bold text-red-700">
              {error}
            </p>
          ) : null}

          <button
            className="btn btn-primary mt-4"
            disabled={!selectedCustomer || !planId || activePlans.length === 0}
            type="submit"
          >
            <UserPlus size={17} />
            Asignar membresia
          </button>
        </form>
      ) : null}

      <section className="rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-5 shadow-[var(--shadow-sm)]">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">Membresias activas</h2>
            <p className="text-sm text-[var(--ink-500)]">
              {memberships.length} clientes con beneficio vigente
            </p>
          </div>
          <div className="field min-w-64">
            <label>Filtrar</label>
            <input
              value={membershipSearch}
              onChange={(event) => setMembershipSearch(event.target.value)}
              placeholder="Nombre, telefono o plan"
            />
          </div>
        </div>

        <div className="space-y-3">
          {visibleMemberships.length === 0 ? (
            <p className="rounded-[var(--r-md)] border border-dashed border-[var(--ink-300)] p-4 text-sm font-bold text-[var(--ink-500)]">
              No hay membresias activas para mostrar.
            </p>
          ) : (
            visibleMemberships.map((item) => (
              <article
                key={item.membership._id}
                className="rounded-[var(--r-md)] border border-[var(--ink-200)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-black">{item.customer.fullName}</h3>
                    <p className="text-sm text-[var(--ink-500)]">
                      {item.customer.phone}
                      {item.customer.email ? ` · ${item.customer.email}` : ""}
                    </p>
                    <p className="mt-2 text-sm font-bold text-[var(--ink-700)]">
                      {item.plan.name}
                    </p>
                    <p className="text-sm text-[var(--ink-500)]">
                      Desde {formatMembershipDate(item.membership.startsAt)}
                      {item.membership.endsAt
                        ? ` hasta ${formatMembershipDate(item.membership.endsAt)}`
                        : ""}
                    </p>
                  </div>
                  {canManage ? (
                    <div className="flex gap-2">
                      <button
                        className="btn btn-ghost"
                        type="button"
                        onClick={() =>
                          updateStatus({
                            customerMembershipId: item.membership._id,
                            status: "paused",
                          })
                        }
                      >
                        <Pause size={16} />
                        Pausar
                      </button>
                      <button
                        className="btn btn-danger"
                        type="button"
                        onClick={() =>
                          updateStatus({
                            customerMembershipId: item.membership._id,
                            status: "cancelled",
                          })
                        }
                      >
                        <XCircle size={16} />
                        Cancelar
                      </button>
                    </div>
                  ) : null}
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </section>
  );
}
