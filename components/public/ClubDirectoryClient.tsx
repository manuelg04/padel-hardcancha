"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import { LogIn, LogOut, User } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { api } from "@/convex/_generated/api";
import { ClubCityFilter } from "./ClubCityFilter";
import { ClubDirectoryCard } from "./ClubDirectoryCard";
import { ClubSearch } from "./ClubSearch";

export function ClubDirectoryClient() {
  const clubs = useQuery(api.clubs.listPublishedClubs, {});
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const { signOut } = useAuthActions();
  const currentUser = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : "skip",
  );

  const cities = useMemo(() => {
    if (!clubs) return [];
    return Array.from(new Set(clubs.map((club) => club.city))).sort((a, b) =>
      a.localeCompare(b, "es"),
    );
  }, [clubs]);

  const filteredClubs = useMemo(() => {
    if (!clubs) return [];

    const term = search.trim().toLowerCase();

    return clubs.filter((club) => {
      const matchesCity = !city || club.city === city;
      const matchesSearch =
        !term ||
        [club.name, club.city, club.address].some((value) =>
          value.toLowerCase().includes(term),
        );

      return matchesCity && matchesSearch;
    });
  }, [clubs, city, search]);

  return (
    <main className="min-h-screen bg-[var(--ink-100)]">
      <header className="border-b border-[var(--ink-200)] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link href="/clubes" className="flex items-center gap-3 font-black">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--court-500)] text-white">
              ●
            </span>
            CanchaBGA Padel
          </Link>
          {!authLoading && (
            isAuthenticated && currentUser ? (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 rounded-full border border-[var(--ink-200)] bg-[var(--ink-100)] px-3 py-1.5 text-sm font-bold text-[var(--ink-700)]">
                  <User size={13} className="text-[var(--ink-400)]" />
                  {currentUser.name ?? currentUser.email}
                </span>
                <button
                  className="btn btn-ghost"
                  onClick={() => void signOut()}
                >
                  <LogOut size={15} />
                  Salir
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link className="btn btn-ghost" href="/login">
                  <LogIn size={15} />
                  Iniciar sesion
                </Link>
                <Link className="btn btn-ghost hidden sm:inline-flex" href="/super-admin/login">
                  Super admin
                </Link>
              </div>
            )
          )}
        </div>
      </header>

      <section
        className="relative overflow-hidden bg-[var(--court-900)] bg-cover bg-center text-white"
        style={{ backgroundImage: "url('/images/club-directory-cover.png')" }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,19,17,0.9)_0%,rgba(31,55,23,0.78)_42%,rgba(31,55,23,0.36)_100%)]" />
        <div className="relative mx-auto max-w-6xl px-5 py-14 md:py-20">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-white/60">
            Directorio publico
          </p>
          <h1 className="text-display mt-4 max-w-[21rem] text-4xl font-black leading-[0.95] sm:max-w-3xl sm:text-5xl md:text-7xl">
            Encuentra tu club de padel
          </h1>
          <p className="mt-5 max-w-xl text-lg text-white/72">
            Reserva facil en clubes de Bucaramanga y Santander.
          </p>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-5 py-6">
        <div className="-mt-14 mb-8 rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-4 shadow-[var(--shadow-lg)]">
          <div className="grid gap-3 md:grid-cols-[1fr_260px]">
            <ClubSearch value={search} onChange={setSearch} />
            <ClubCityFilter cities={cities} value={city} onChange={setCity} />
          </div>
        </div>

        {clubs === undefined ? (
          <div className="rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-8 text-center font-bold text-[var(--ink-500)]">
            Cargando clubes...
          </div>
        ) : clubs.length === 0 ? (
          <EmptyState
            title="No hay clubes disponibles por ahora."
            description="Pronto agregaremos nuevos clubes de padel."
          />
        ) : filteredClubs.length === 0 ? (
          <EmptyState
            title="No encontramos clubes con esa busqueda."
            description="Prueba con otra ciudad, nombre o direccion."
          />
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredClubs.map((club) => (
              <ClubDirectoryCard key={club._id} club={club} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-8 text-center shadow-[var(--shadow-sm)]">
      <h2 className="text-display text-3xl font-black">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-[var(--ink-500)]">{description}</p>
    </div>
  );
}
