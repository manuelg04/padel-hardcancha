"use client";

import { Check, Pencil, Plus, Save } from "lucide-react";
import { useMutation } from "convex/react";
import { useState } from "react";

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
    <section className="rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-5 shadow-[var(--shadow-sm)]">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black">Planes</h2>
          <p className="text-sm text-[var(--ink-500)]">
            {plans.filter((plan) => plan.isActive).length} activos
          </p>
        </div>
        {!canManage ? (
          <span className="pill pill-pending">Solo consulta</span>
        ) : null}
      </div>

      <div className="space-y-3">
        {plans.length === 0 ? (
          <p className="rounded-[var(--r-md)] border border-dashed border-[var(--ink-300)] p-4 text-sm font-bold text-[var(--ink-500)]">
            Aun no hay planes de membresia.
          </p>
        ) : (
          plans.map((plan) => (
            <article
              key={plan._id}
              className="rounded-[var(--r-md)] border border-[var(--ink-200)] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h3 className="font-black">{plan.name}</h3>
                    <span
                      className={`pill ${
                        plan.isActive ? "pill-available" : "pill-blocked"
                      }`}
                    >
                      <span className="dot" />
                      {plan.isActive ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-[var(--ink-700)]">
                    {benefitLabels[plan.benefitType]} · {describeBenefit(plan)}
                  </p>
                  <p className="mt-1 text-sm text-[var(--ink-500)]">
                    {describeSchedule(plan)}
                  </p>
                  {plan.monthlyPrice !== undefined ? (
                    <p className="mt-1 text-sm text-[var(--ink-500)]">
                      Mensualidad: {formatCOP(plan.monthlyPrice)}
                    </p>
                  ) : null}
                </div>
                {canManage ? (
                  <div className="flex gap-2">
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
                      {plan.isActive ? "Desactivar" : "Activar"}
                    </button>
                  </div>
                ) : null}
              </div>
            </article>
          ))
        )}
      </div>

      {canManage ? (
        <form
          className="mt-5 rounded-[var(--r-lg)] border border-dashed border-[var(--ink-300)] bg-[var(--ink-50)] p-4"
          onSubmit={savePlan}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="font-black">
              {editingPlan ? "Editar plan" : "Crear plan"}
            </p>
            {editingPlan ? (
              <button className="btn btn-ghost" type="button" onClick={resetForm}>
                Nuevo
              </button>
            ) : null}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="field">
              <label>Nombre</label>
              <input value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="field">
              <label>Mensualidad</label>
              <input
                type="number"
                min="0"
                value={monthlyPrice}
                onChange={(event) => setMonthlyPrice(event.target.value)}
              />
            </div>
            <div className="field md:col-span-2">
              <label>Descripcion</label>
              <input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
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
            {benefitType === "percentage_discount" ? (
              <div className="field">
                <label>Descuento</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={discountPercent}
                  onChange={(event) => setDiscountPercent(event.target.value)}
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
                />
              </div>
            ) : null}
          </div>

          <label className="mt-4 flex items-center gap-2 text-sm font-bold">
            <input
              type="checkbox"
              checked={appliesAlways}
              onChange={(event) => setAppliesAlways(event.target.checked)}
            />
            Aplica siempre
          </label>

          {!appliesAlways ? (
            <div className="mt-4 grid gap-3 rounded-[var(--r-md)] border border-[var(--ink-200)] bg-white p-3">
              <div className="flex flex-wrap gap-2">
                {dayOptions.map((day) => (
                  <label
                    key={day.value}
                    className="flex items-center gap-2 rounded-full border border-[var(--ink-200)] px-3 py-2 text-sm font-bold"
                  >
                    <input
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
            <p className="mt-3 rounded-[var(--r-md)] bg-red-50 p-3 text-sm font-bold text-red-700">
              {error}
            </p>
          ) : null}

          <button className="btn btn-dark mt-4" type="submit">
            {saved ? <Check size={17} /> : editingPlan ? <Save size={17} /> : <Plus size={17} />}
            {saved ? "Guardado" : editingPlan ? "Guardar plan" : "Crear plan"}
          </button>
        </form>
      ) : null}
    </section>
  );
}
