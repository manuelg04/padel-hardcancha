"use client";

import { BadgeCheck, CircleDollarSign, Plus, Users } from "lucide-react";
import { useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import { formatCOP } from "@/lib/format";
import { AdminLayout } from "./AdminLayout";
import { MembershipAssignmentsPanel } from "./memberships/MembershipAssignmentsPanel";
import { MembershipPlansPanel } from "./memberships/MembershipPlansPanel";

function scrollToPlanForm() {
  document.getElementById("membership-plan-form")?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

export function MembershipsClient() {
  const club = useQuery(api.clubs.getCurrentUserClubForAdmin, {});
  const access = useQuery(api.users.getCurrentUserAccess, {});
  const plans = useQuery(
    api.memberships.listMembershipPlansByClub,
    club ? { clubId: club._id, includeInactive: true } : "skip",
  );
  const activeMemberships = useQuery(
    api.memberships.listCustomerMembershipsByClub,
    club ? { clubId: club._id, status: "active" } : "skip",
  );

  const clubAccess = access?.clubAccess.find((entry) => entry.clubId === club?._id);
  const canManage = Boolean(access?.isSuperAdmin || clubAccess?.role === "club_master");
  const activePlansCount = plans?.filter((plan) => plan.isActive).length ?? 0;
  const activeMembersCount = activeMemberships?.length ?? 0;
  const estimatedMonthlyIncome =
    activeMemberships?.reduce(
      (total, item) => total + (item.plan.monthlyPrice ?? 0),
      0,
    ) ?? 0;

  return (
    <AdminLayout>
      <div className="mx-auto w-full max-w-[1500px] p-4 md:p-8">
        <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--court-600)]">
              Membresías
            </p>
            <h1 className="text-display mt-1 text-3xl font-black leading-tight md:text-4xl">
              Planes y clientes miembros
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--ink-500)] md:text-base">
              Configura beneficios por jugador y asigna planes a tus clientes.
            </p>
          </div>
          {canManage ? (
            <button className="btn btn-primary w-full sm:w-auto" onClick={scrollToPlanForm}>
              <Plus size={17} />
              Crear plan
            </button>
          ) : (
            <span className="pill pill-pending self-start">Solo consulta</span>
          )}
        </header>

        {club === undefined ||
        access === undefined ||
        plans === undefined ||
        activeMemberships === undefined ? (
          <div className="rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-8 text-center font-bold text-[var(--ink-500)] shadow-[var(--shadow-sm)]">
            Cargando membresías...
          </div>
        ) : club === null ? (
          <div className="rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-8 shadow-[var(--shadow-sm)]">
            No encontramos el club.
          </div>
        ) : (
          <>
            <section className="mb-5 grid gap-4 md:grid-cols-3">
              <article className="rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-5 shadow-[var(--shadow-sm)]">
                <div className="flex items-center gap-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[var(--court-100)] text-[var(--court-700)]">
                    <BadgeCheck size={23} />
                  </span>
                  <div>
                    <p className="text-sm text-[var(--ink-500)]">Planes activos</p>
                    <p className="text-2xl font-black">{activePlansCount}</p>
                    <p className="text-xs text-[var(--ink-500)]">Planes disponibles</p>
                  </div>
                </div>
              </article>
              <article className="rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-5 shadow-[var(--shadow-sm)]">
                <div className="flex items-center gap-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[var(--court-100)] text-[var(--court-700)]">
                    <Users size={23} />
                  </span>
                  <div>
                    <p className="text-sm text-[var(--ink-500)]">Miembros vigentes</p>
                    <p className="text-2xl font-black">{activeMembersCount}</p>
                    <p className="text-xs text-[var(--ink-500)]">Con beneficio activo</p>
                  </div>
                </div>
              </article>
              <article className="rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-5 shadow-[var(--shadow-sm)]">
                <div className="flex items-center gap-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[var(--court-100)] text-[var(--court-700)]">
                    <CircleDollarSign size={23} />
                  </span>
                  <div>
                    <p className="text-sm text-[var(--ink-500)]">
                      Ingreso mensual estimado
                    </p>
                    <p className="text-2xl font-black">
                      {formatCOP(estimatedMonthlyIncome)}
                    </p>
                    <p className="text-xs text-[var(--ink-500)]">
                      Total de planes activos
                    </p>
                  </div>
                </div>
              </article>
            </section>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)]">
              <MembershipPlansPanel
                clubId={club._id}
                plans={plans}
                canManage={canManage}
              />
              <MembershipAssignmentsPanel
                clubId={club._id}
                plans={plans}
                memberships={activeMemberships}
                canManage={canManage}
              />
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
