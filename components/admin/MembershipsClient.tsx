"use client";

import { useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import { AdminLayout } from "./AdminLayout";
import { MembershipAssignmentsPanel } from "./memberships/MembershipAssignmentsPanel";
import { MembershipPlansPanel } from "./memberships/MembershipPlansPanel";

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

  return (
    <AdminLayout>
      <div className="p-4 md:p-8">
        <header className="mb-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--ink-500)]">
            Membresias
          </p>
          <h1 className="text-display text-4xl font-black">
            Planes y clientes miembros
          </h1>
          <p className="mt-1 text-[var(--ink-500)]">
            Configura beneficios por jugador para usarlos luego en recepcion.
          </p>
        </header>

        {club === undefined ||
        access === undefined ||
        plans === undefined ||
        activeMemberships === undefined ? (
          <div className="rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-8 text-center font-bold text-[var(--ink-500)]">
            Cargando membresias...
          </div>
        ) : club === null ? (
          <div className="rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-8">
            No encontramos el club.
          </div>
        ) : (
          <div className="grid gap-5 xl:grid-cols-[1fr_0.95fr]">
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
        )}
      </div>
    </AdminLayout>
  );
}
