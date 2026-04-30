"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { api } from "@/convex/_generated/api";
import { choosePostLoginPath } from "@/lib/authRouting";
import type { CurrentUserAccess } from "@/lib/authRouting";

type AccessMode = "any" | "club" | "super";

function safeNext(value: string | null, mode: AccessMode) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  if (mode === "club" && !value.startsWith("/admin")) return null;
  if (mode === "super" && !value.startsWith("/super-admin")) return null;
  return value;
}

function targetForAccess(
  mode: AccessMode,
  access: CurrentUserAccess,
  next: string | null,
) {
  if (mode === "super") {
    return access.isSuperAdmin ? next ?? "/super-admin/clubes" : null;
  }

  if (mode === "club") {
    return access.clubAccess.length > 0 ? next ?? "/admin/agenda" : null;
  }

  return next ?? choosePostLoginPath(access);
}

export function AuthLoginForm({
  mode = "any",
  eyebrow,
  title,
  subtitle,
  sideTitle,
  sideSubtitle,
  sideFooter,
  Icon,
}: {
  mode?: AccessMode;
  eyebrow: string;
  title: string;
  subtitle: string;
  sideTitle: string;
  sideSubtitle: string;
  sideFooter: string;
  Icon: LucideIcon;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const access = useQuery(
    api.users.getCurrentUserAccess,
    isAuthenticated ? {} : "skip",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isLoading || !isAuthenticated || access === undefined) return;

    const target = targetForAccess(
      mode,
      access,
      safeNext(searchParams.get("next"), mode),
    );

    if (target) {
      router.replace(target);
    }
  }, [access, isAuthenticated, isLoading, mode, router, searchParams]);

  const accessError =
    !isLoading &&
    isAuthenticated &&
    access !== undefined &&
    !targetForAccess(mode, access, safeNext(searchParams.get("next"), mode))
      ? mode === "club"
        ? "No tienes acceso a ningun club."
        : mode === "super"
          ? "No tienes permisos de super admin."
          : ""
      : "";
  const visibleError = error || accessError;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Ingresa email y contrasena.");
      return;
    }

    try {
      setSubmitting(true);
      await signIn("password", {
        email: email.trim().toLowerCase(),
        password,
        flow: "signIn",
      });
    } catch {
      setError("No pudimos iniciar sesion con esos datos.");
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-[var(--ink-100)] lg:grid-cols-[1.05fr_0.95fr]">
      <section className="court-lines hidden flex-col justify-between p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-white/15 font-black">
            ●
          </span>
          <p className="text-xl font-black">CanchaBGA Padel</p>
        </div>
        <div>
          <p className="mb-4 text-xs font-black uppercase tracking-[0.22em] text-white/55">
            {eyebrow}
          </p>
          <h1 className="text-display max-w-xl text-6xl font-black leading-[0.95]">
            {sideTitle}
          </h1>
          <p className="mt-5 max-w-md text-lg text-white/68">{sideSubtitle}</p>
        </div>
        <p className="text-sm text-white/45">{sideFooter}</p>
      </section>

      <section className="grid place-items-center p-6">
        <form
          className="w-full max-w-md rounded-[var(--r-xl)] border border-[var(--ink-200)] bg-white p-6 shadow-[var(--shadow-md)]"
          onSubmit={submit}
        >
          <div className="mb-6 grid h-12 w-12 place-items-center rounded-[var(--r-lg)] bg-[var(--court-50)] text-[var(--court-700)]">
            <Icon size={24} />
          </div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--ink-500)]">
            {eyebrow}
          </p>
          <h1 className="text-display mt-2 text-4xl font-black">{title}</h1>
          <p className="mt-2 text-[var(--ink-500)]">{subtitle}</p>

          <div className="mt-6 space-y-4">
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                inputMode="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="password">Contrasena</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
          </div>

          {visibleError ? (
            <p className="mt-4 rounded-[var(--r-md)] bg-[var(--status-cancelled-bg)] p-3 text-sm font-bold text-[var(--status-cancelled-fg)]">
              {visibleError}
            </p>
          ) : null}

          <button className="btn btn-primary btn-block mt-6" type="submit">
            {submitting ? "Ingresando..." : "Ingresar"}
            <ArrowRight size={17} />
          </button>
        </form>
      </section>
    </main>
  );
}
