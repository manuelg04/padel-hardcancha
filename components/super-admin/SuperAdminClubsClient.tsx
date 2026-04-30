"use client";

import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import { ClubTable } from "./ClubTable";
import { SuperAdminLayout } from "./SuperAdminLayout";

type ClubFilter = "all" | "published" | "draft" | "active" | "inactive";

export function SuperAdminClubsClient() {
  const clubs = useQuery(api.clubs.superAdminListClubs, {});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ClubFilter>("all");

  const filteredClubs = useMemo(() => {
    if (!clubs) return [];
    const term = search.trim().toLowerCase();

    return clubs.filter((club) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "published" && club.isPublished) ||
        (filter === "draft" && !club.isPublished) ||
        (filter === "active" && club.isActive) ||
        (filter === "inactive" && !club.isActive);

      const matchesSearch =
        !term ||
        [club.name, club.slug, club.city, club.address].some((value) =>
          value.toLowerCase().includes(term),
        );

      return matchesFilter && matchesSearch;
    });
  }, [clubs, filter, search]);

  return (
    <SuperAdminLayout>
      <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--ink-500)]">
            Directorio
          </p>
          <h1 className="text-display text-4xl font-black">Clubes</h1>
          <p className="mt-1 text-[var(--ink-500)]">
            Registra, publica y administra clubes de padel.
          </p>
        </div>
        <Link className="btn btn-primary" href="/super-admin/clubes/nuevo">
          <Plus size={17} />
          Nuevo club
        </Link>
      </header>

      <section className="mb-5 rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-4 shadow-[var(--shadow-sm)]">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <div className="field">
            <label htmlFor="club-search">Buscar</label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-400)]"
                size={16}
              />
              <input
                id="club-search"
                className="pl-9"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nombre, slug, ciudad o direccion"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            {[
              ["all", "Todos"],
              ["published", "Publicados"],
              ["draft", "No publicados"],
              ["active", "Activos"],
              ["inactive", "Inactivos"],
            ].map(([value, label]) => (
              <button
                key={value}
                className={`rounded-[var(--r-pill)] border px-4 py-2 text-sm font-black ${
                  filter === value
                    ? "border-[var(--court-600)] bg-[var(--court-500)] text-white"
                    : "border-[var(--ink-200)] bg-white text-[var(--ink-700)]"
                }`}
                onClick={() => setFilter(value as ClubFilter)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {clubs === undefined ? (
        <div className="rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-8 text-center font-bold text-[var(--ink-500)]">
          Cargando clubes...
        </div>
      ) : (
        <ClubTable clubs={filteredClubs} />
      )}
    </SuperAdminLayout>
  );
}
