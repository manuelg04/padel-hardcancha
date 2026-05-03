"use client";

import {
  Check,
  Crown,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Save,
  Sparkles,
} from "lucide-react";
import { useMutation } from "convex/react";
import { useMemo, useState } from "react";

import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { formatCOP } from "@/lib/format";

type BenefitType = Doc<"membershipPlans">["benefitType"];

type PlanPayload = {
  name: string;
  benefitType: BenefitType;
  appliesAlways: boolean;
  description?: string;
  monthlyPrice?: number;
  discountPercent?: number;
  fixedPrice?: number;
  validDaysOfWeek?: number[];
  validStartTime?: string;
  validEndTime?: string;
};

const dayOptions = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mie" },
  { value: 4, label: "Jue" },
  { value: 5, label: "Vie" },
  { value: 6, label: "Sab" },
];

const benefitLabels: Record<BenefitType, string> = {
  free: "Gratis",
  percentage_discount: "Descuento",
  fixed_price: "Precio fijo",
};

const optionalNumber = (value: string) => {
  if (!value.trim()) return undefined;
  return Number(value);
};

function describeBenefit(plan: Doc<"membershipPlans">) {
  if (plan.benefitType === "free") return "El jugador paga $0";
  if (plan.benefitType === "percentage_discount") {
    return `${plan.discountPercent ?? 0}% sobre su parte`;
  }

  return `${formatCOP(plan.fixedPrice ?? 0)} por jugador`;
}

function describeSchedule(plan: Doc<"membershipPlans">) {
  if (plan.appliesAlways) return "Aplica siempre";

  const days =
    plan.validDaysOfWeek
      ?.map((day) => dayOptions.find((option) => option.value === day)?.label)
      .filter(Boolean)
      .join(", ") || "Todos los dias";
  const time =
    plan.validStartTime && plan.validEndTime
      ? `${plan.validStartTime} - ${plan.validEndTime}`
      : "Todo el dia";

  return `${days} · ${time}`;
}

function scrollToForm() {
  document.getElementById("membership-plan-form")?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

export function MembershipPlansPanel({
  clubId,
  plans,
  canManage,
}: {
  clubId: Id<"clubs">;
  plans: Doc<"membershipPlans">[];
  canManage: boolean;
}) {
  const createPlan = useMutation(api.memberships.createMembershipPlan);
  const updatePlan = useMutation(api.memberships.updateMembershipPlan);
  const setPlanActive = useMutation(api.memberships.setMembershipPlanActive);
  const [editingPlan, setEditingPlan] = useState<Doc<"membershipPlans"> | null>(
    null,
  );
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [monthlyPrice, setMonthlyPrice] = useState("");
  const [benefitType, setBenefitType] = useState<BenefitType>("free");
  const [discountPercent, setDiscountPercent] = useState("");
  const [fixedPrice, setFixedPrice] = useState("");
  const [appliesAlways, setAppliesAlways] = useState(true);
  const [validDaysOfWeek, setValidDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5]);
  const [validStartTime, setValidStartTime] = useState("06:00");
  const [validEndTime, setValidEndTime] = useState("18:00");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [onlyActive, setOnlyActive] = useState(true);

  const activePlansCount = plans.filter((plan) => plan.isActive).length;
  const visiblePlans = useMemo(
    () => (onlyActive ? plans.filter((plan) => plan.isActive) : plans),
    [onlyActive, plans],
  );

  function loadPlan(plan: Doc<"membershipPlans">) {
    setEditingPlan(plan);
    setName(plan.name);
    setDescription(plan.description ?? "");
    setMonthlyPrice(plan.monthlyPrice?.toString() ?? "");
    setBenefitType(plan.benefitType);
    setDiscountPercent(plan.discountPercent?.toString() ?? "");
    setFixedPrice(plan.fixedPrice?.toString() ?? "");
    setAppliesAlways(plan.appliesAlways);
    setValidDaysOfWeek(plan.validDaysOfWeek ?? [1, 2, 3, 4, 5]);
    setValidStartTime(plan.validStartTime ?? "06:00");
    setValidEndTime(plan.validEndTime ?? "18:00");
    setError("");
    window.requestAnimationFrame(scrollToForm);
  }

  function resetForm() {
    setEditingPlan(null);
    setName("");
    setDescription("");
    setMonthlyPrice("");
    setBenefitType("free");
    setDiscountPercent("");
    setFixedPrice("");
    setAppliesAlways(true);
    setValidDaysOfWeek([1, 2, 3, 4, 5]);
    setValidStartTime("06:00");
    setValidEndTime("18:00");
    setError("");
  }

  function buildPayload(): PlanPayload {
    const payload: PlanPayload = {
      name,
      benefitType,
      appliesAlways,
    };
    const monthly = optionalNumber(monthlyPrice);
    const discount = optionalNumber(discountPercent);
    const fixed = optionalNumber(fixedPrice);

    if (description.trim()) payload.description = description;
    if (monthly !== undefined) payload.monthlyPrice = monthly;
    if (benefitType === "percentage_discount" && discount !== undefined) {
      payload.discountPercent = discount;
    }
    if (benefitType === "fixed_price" && fixed !== undefined) {
      payload.fixedPrice = fixed;
    }
    if (!appliesAlways) {
      payload.validDaysOfWeek = validDaysOfWeek;
      payload.validStartTime = validStartTime;
      payload.validEndTime = validEndTime;
    }

    return payload;
  }

  async function savePlan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    try {
      if (editingPlan) {
        await updatePlan({
          membershipPlanId: editingPlan._id,
          ...buildPayload(),
        });
      } else {
        await createPlan({
          clubId,
          ...buildPayload(),
        });
      }

      setSaved(true);
      window.setTimeout(() => setSaved(false), 1200);
      resetForm();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo guardar.");
    }
  }

  return (
    <section className="space-y-5">
      <section className="rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-5 shadow-[var(--shadow-sm)]">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-black">Planes</h2>
            <p className="text-sm text-[var(--ink-500)]">
              Gestiona los planes y beneficios disponibles.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-black text-[var(--ink-700)]">
              Solo activos
              <button
                aria-pressed={onlyActive}
                className={`relative h-6 w-11 rounded-full border transition ${
                  onlyActive
                    ? "border-[var(--court-600)] bg-[var(--court-500)]"
                    : "border-[var(--ink-300)] bg-[var(--ink-200)]"
                }`}
                onClick={() => setOnlyActive((current) => !current)}
                type="button"
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-[var(--shadow-sm)] transition ${
                    onlyActive ? "left-5" : "left-0.5"
                  }`}
                />
              </button>
            </label>
            {!canManage ? <span className="pill pill-pending">Solo consulta</span> : null}
          </div>
        </div>

        <div className="space-y-3">
          {plans.length === 0 ? (
            <p className="rounded-[var(--r-md)] border border-dashed border-[var(--ink-300)] bg-[var(--ink-50)] p-5 text-sm font-bold text-[var(--ink-500)]">
              Aun no hay planes de membresía.
            </p>
          ) : visiblePlans.length === 0 ? (
            <p className="rounded-[var(--r-md)] border border-dashed border-[var(--ink-300)] bg-[var(--ink-50)] p-5 text-sm font-bold text-[var(--ink-500)]">
              No hay planes activos para mostrar.
            </p>
          ) : (
            visiblePlans.map((plan) => (
              <article
                key={plan._id}
                className="rounded-[var(--r-md)] border border-[var(--ink-200)] bg-white p-4 shadow-[var(--shadow-sm)] transition hover:border-[var(--ink-300)]"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex min-w-0 gap-4">
                    <span
                      className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${
                        plan.isActive
                          ? "bg-[var(--court-100)] text-[var(--court-700)]"
                          : "bg-[var(--ink-100)] text-[var(--ink-600)]"
                      }`}
                    >
                      {plan.isActive ? <Crown size={22} /> : <Sparkles size={22} />}
                    </span>
                    <div className="min-w-0">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <h3 className="font-black">{plan.name}</h3>
                        <span
                          className={`pill ${
                            plan.isActive ? "pill-available" : "pill-blocked"
                          }`}
                        >
                          {plan.isActive ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-[var(--ink-800)]">
                        Beneficio: {benefitLabels[plan.benefitType]} ·{" "}
                        {describeBenefit(plan)}
                      </p>
                      <p className="mt-1 text-sm text-[var(--ink-500)]">
                        {describeSchedule(plan)}
                      </p>
                      <p className="mt-1 text-sm text-[var(--ink-500)]">
                        Mensualidad:{" "}
                        {plan.monthlyPrice !== undefined
                          ? formatCOP(plan.monthlyPrice)
                          : "Sin mensualidad"}
                      </p>
                    </div>
                  </div>
                  {canManage ? (
                    <div className="flex shrink-0 flex-wrap gap-2 md:justify-end">
                      <button
                        className="btn btn-ghost"
                        type="button"
                        onClick={() => loadPlan(plan)}
                      >
                        <Pencil size={16} />
                        Editar
                      </button>
                      <button
                        className={plan.isActive ? "btn btn-danger" : "btn btn-primary"}
                        type="button"
                        onClick={() =>
                          setPlanActive({
                            membershipPlanId: plan._id,
                            isActive: !plan.isActive,
                          })
                        }
                      >
                        {plan.isActive ? <PowerOff size={16} /> : <Power size={16} />}
                        {plan.isActive ? "Desactivar" : "Activar"}
                      </button>
                    </div>
                  ) : null}
                </div>
              </article>
            ))
          )}
        </div>

        {plans.length > activePlansCount && onlyActive ? (
          <button
            className="mx-auto mt-4 flex text-sm font-bold text-[var(--ink-600)] hover:text-[var(--ink-900)]"
            onClick={() => setOnlyActive(false)}
            type="button"
          >
            Ver planes inactivos ({plans.length - activePlansCount})
          </button>
        ) : null}
      </section>

      {canManage ? (
        <form
          id="membership-plan-form"
          className="scroll-mt-6 rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-5 shadow-[var(--shadow-sm)]"
          onSubmit={savePlan}
        >
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-black">
                {editingPlan ? "Editar plan" : "Nuevo plan"}
              </h2>
              <p className="text-sm text-[var(--ink-500)]">
                {editingPlan
                  ? "Actualiza la información del plan seleccionado."
                  : "Crea un nuevo plan de membresía."}
              </p>
            </div>
            {editingPlan ? (
              <span className="pill pill-pending">Editando</span>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="field">
              <label>Nombre del plan</label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ej. Plan mensual"
              />
            </div>
            <div className="field">
              <label>Mensualidad</label>
              <input
                type="number"
                min="0"
                value={monthlyPrice}
                onChange={(event) => setMonthlyPrice(event.target.value)}
                placeholder="Ej. 150000"
              />
            </div>
            <div className="field">
              <label>Beneficio</label>
              <select
                value={benefitType}
                onChange={(event) => setBenefitType(event.target.value as BenefitType)}
              >
                <option value="free">Gratis</option>
                <option value="percentage_discount">Descuento porcentual</option>
                <option value="fixed_price">Precio fijo</option>
              </select>
            </div>
            <div className="field md:col-span-2">
              <label>Descripción opcional</label>
              <textarea
                className="min-h-20 resize-none"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe los beneficios principales de este plan"
              />
            </div>
            <div className="grid gap-3">
              {benefitType === "percentage_discount" ? (
                <div className="field">
                  <label>Descuento</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discountPercent}
                    onChange={(event) => setDiscountPercent(event.target.value)}
                    placeholder="Ej. 20"
                  />
                </div>
              ) : null}
              {benefitType === "fixed_price" ? (
                <div className="field">
                  <label>Precio fijo</label>
                  <input
                    type="number"
                    min="0"
                    value={fixedPrice}
                    onChange={(event) => setFixedPrice(event.target.value)}
                    placeholder="Ej. 25000"
                  />
                </div>
              ) : null}
              <label className="flex items-start gap-3 rounded-[var(--r-md)] border border-[var(--ink-200)] bg-[var(--ink-50)] p-3 text-sm font-bold">
                <input
                  className="mt-1 accent-[var(--court-500)]"
                  type="checkbox"
                  checked={appliesAlways}
                  onChange={(event) => setAppliesAlways(event.target.checked)}
                />
                <span>
                  Aplica siempre
                  <span className="block text-xs font-medium text-[var(--ink-500)]">
                    Este plan estará disponible para todos los clientes.
                  </span>
                </span>
              </label>
            </div>
          </div>

          {!appliesAlways ? (
            <div className="mt-4 grid gap-3 rounded-[var(--r-md)] border border-[var(--ink-200)] bg-[var(--ink-50)] p-4">
              <div className="flex flex-wrap gap-2">
                {dayOptions.map((day) => (
                  <label
                    key={day.value}
                    className="flex items-center gap-2 rounded-full border border-[var(--ink-200)] bg-white px-3 py-2 text-sm font-bold"
                  >
                    <input
                      className="accent-[var(--court-500)]"
                      type="checkbox"
                      checked={validDaysOfWeek.includes(day.value)}
                      onChange={(event) =>
                        setValidDaysOfWeek((current) =>
                          event.target.checked
                            ? [...current, day.value].sort((a, b) => a - b)
                            : current.filter((value) => value !== day.value),
                        )
                      }
                    />
                    {day.label}
                  </label>
                ))}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="field">
                  <label>Desde</label>
                  <input
                    type="time"
                    value={validStartTime}
                    onChange={(event) => setValidStartTime(event.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Hasta</label>
                  <input
                    type="time"
                    value={validEndTime}
                    onChange={(event) => setValidEndTime(event.target.value)}
                  />
                </div>
              </div>
            </div>
          ) : null}

          {error ? (
            <p className="mt-4 rounded-[var(--r-md)] bg-red-50 p-3 text-sm font-bold text-red-700">
              {error}
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-3">
            <button className="btn btn-primary" type="submit">
              {saved ? <Check size={17} /> : editingPlan ? <Save size={17} /> : <Plus size={17} />}
              {saved ? "Guardado" : "Guardar plan"}
            </button>
            <button className="btn btn-ghost" type="button" onClick={resetForm}>
              Cancelar
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
