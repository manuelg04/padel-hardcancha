"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import { ArrowRight, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { api } from "@/convex/_generated/api";
import { choosePostLoginPath } from "@/lib/authRouting";
import { onlyDigits } from "@/lib/format";

function validNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

export function RegisterClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const access = useQuery(
    api.users.getCurrentUserAccess,
    isAuthenticated ? {} : "skip",
  );
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isLoading || !isAuthenticated || access === undefined) return;
    router.replace(validNext(searchParams.get("next")) ?? choosePostLoginPath(access));
  }, [access, isAuthenticated, isLoading, router, searchParams]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Completa tu nombre.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Ingresa un email valido.");
      return;
    }
    if (onlyDigits(phone).length < 10) {
      setError("Ingresa un celular valido.");
      return;
    }
    if (password.length < 8) {
      setError("La contrasena debe tener minimo 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contrasenas no coinciden.");
      return;
    }

    try {
      setSubmitting(true);
      await signIn("password", {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        password,
        flow: "signUp",
      });
    } catch {
      setError("No pudimos crear la cuenta. Revisa los datos o inicia sesion.");
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-[var(--ink-100)] lg:grid-cols-[0.95fr_1.05fr]">
      <section className="court-lines hidden p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <p className="text-xl font-black">CanchaBGA Padel</p>
        <div>
          <p className="mb-4 text-xs font-black uppercase tracking-[0.22em] text-white/55">
            Registro jugador
          </p>
          <h1 className="text-display max-w-xl text-6xl font-black leading-[0.95]">
            Reserva sin llamadas.
          </h1>
          <p className="mt-5 max-w-md text-lg text-white/68">
            Guarda tus datos una vez y consulta tus reservas cuando quieras.
          </p>
        </div>
        <p className="text-sm text-white/45">Bucaramanga</p>
      </section>

      <section className="grid place-items-center p-6">
        <form
          className="w-full max-w-md rounded-[var(--r-xl)] border border-[var(--ink-200)] bg-white p-6 shadow-[var(--shadow-md)]"
          onSubmit={submit}
        >
          <div className="mb-6 grid h-12 w-12 place-items-center rounded-[var(--r-lg)] bg-[var(--court-50)] text-[var(--court-700)]">
            <UserPlus size={24} />
          </div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--ink-500)]">
            Crea tu cuenta
          </p>
          <h1 className="text-display mt-2 text-4xl font-black">Crea tu cuenta</h1>
          <p className="mt-2 text-[var(--ink-500)]">
            Reserva canchas de padel en clubes de tu ciudad.
          </p>

          <div className="mt-6 space-y-4">
            <div className="field">
              <label htmlFor="name">Nombre completo</label>
              <input id="name" value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="phone">Celular</label>
              <input
                id="phone"
                inputMode="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                inputMode="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="field">
                <label htmlFor="password">Contrasena</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="confirmPassword">Confirmar</label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </div>
            </div>
          </div>

          {error ? (
            <p className="mt-4 rounded-[var(--r-md)] bg-[var(--status-cancelled-bg)] p-3 text-sm font-bold text-[var(--status-cancelled-fg)]">
              {error}
            </p>
          ) : null}

          <button className="btn btn-primary btn-block mt-6" type="submit">
            {submitting ? "Creando..." : "Crear cuenta"}
            <ArrowRight size={17} />
          </button>
          <Link className="btn btn-ghost btn-block mt-3" href="/login">
            Ya tengo cuenta
          </Link>
        </form>
      </section>
    </main>
  );
}
