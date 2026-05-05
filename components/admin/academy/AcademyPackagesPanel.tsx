"use client";

import {
  Boxes,
  CheckCircle2,
  CircleAlert,
  PackageCheck,
  PackagePlus,
  Plus,
  Search,
  Save,
  Ticket,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";

import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { todayBogota } from "@/lib/dates";
import { formatCOP } from "@/lib/format";
import { formatDate, packageStatusLabel } from "./helpers";

const startTimestamp = (date: string) => new Date(`${date}T00:00:00-05:00`).getTime();
const endTimestamp = (date: string) => new Date(`${date}T23:59:59-05:00`).getTime();
const optionalNumber = (value: string) => (value.trim() ? Number(value) : undefined);

export function AcademyPackagesPanel({ clubId }: { clubId: Id<"clubs"> }) {
  const plans = useQuery(api.academy.listPackagePlans, {
    clubId,
    includeInactive: true,
  });
  const packages = useQuery(api.academy.listPackages, { clubId });
  const createPlan = useMutation(api.academy.createPackagePlan);
  const updatePlan = useMutation(api.academy.updatePackagePlan);
  const sellPackage = useMutation(api.academy.sellPackage);
  const [planName, setPlanName] = useState("");
  const [classesCount, setClassesCount] = useState("4");
  const [price, setPrice] = useState("");
  const [validityDays, setValidityDays] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<Id<"academyPackagePlans"> | "">("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Doc<"customers"> | null>(null);
  const [manualName, setManualName] = useState("");
  const [saleClasses, setSaleClasses] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [purchasedDate, setPurchasedDate] = useState(todayBogota());
  const [expiresDate, setExpiresDate] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const customers = useQuery(api.academy.searchCustomers, {
    clubId,
    search: customerSearch,
    limit: 8,
  });
  const selectedPlanDoc = useMemo(
    () => plans?.find((plan) => plan._id === selectedPlan),
    [plans, selectedPlan],
  );

  async function savePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      await createPlan({
        clubId,
        name: planName,
        classesCount: Number(classesCount),
        price: Number(price),
        validityDays: optionalNumber(validityDays),
      });
      setPlanName("");
      setClassesCount("4");
      setPrice("");
      setValidityDays("");
      setMessage("Plan creado.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo crear el plan.");
    }
  }

  async function saveSale(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!selectedCustomer) {
      setError("Selecciona un cliente.");
      return;
    }

    try {
      await sellPackage({
        clubId,
        customerId: selectedCustomer._id,
        packagePlanId: selectedPlan || undefined,
        name: manualName || selectedPlanDoc?.name || "Paquete de clases",
        totalClasses: Number(saleClasses || selectedPlanDoc?.classesCount || 0),
        amountPaid: Number(amountPaid || selectedPlanDoc?.price || 0),
        purchasedAt: startTimestamp(purchasedDate),
        expiresAt: expiresDate ? endTimestamp(expiresDate) : undefined,
      });
      setSelectedCustomer(null);
      setCustomerSearch("");
      setManualName("");
      setSaleClasses("");
      setAmountPaid("");
      setExpiresDate("");
      setMessage("Paquete vendido.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo vender el paquete.");
    }
  }

  if (plans === undefined || packages === undefined) {
    return <PackageSkeleton />;
  }

  const activePlans = plans.filter((plan) => plan.active);
  const activePackages = packages.filter((item) => item.packagePurchase.status === "active");

  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(360px,0.78fr)_minmax(0,1.22fr)]">
      <section className="min-w-0 space-y-5 xl:sticky xl:top-24 xl:self-start">
        <form className="rounded-[var(--r-xl)] border border-[var(--ink-200)] bg-white p-5 shadow-[var(--shadow-sm)]" onSubmit={savePlan}>
          <PanelHeader icon={Ticket} title="Planes de paquete" description="Define bonos reutilizables para vender rapido." />
          <div className="mt-5 grid gap-4">
            <div className="field">
              <label>Nombre</label>
              <input value={planName} onChange={(event) => setPlanName(event.target.value)} placeholder="Ej. Bono 8 clases" />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="field">
                <label>Clases</label>
                <input type="number" min="1" value={classesCount} onChange={(event) => setClassesCount(event.target.value)} />
              </div>
              <div className="field">
                <label>Precio</label>
                <input type="number" min="0" value={price} onChange={(event) => setPrice(event.target.value)} />
              </div>
              <div className="field">
                <label>Vigencia dias</label>
                <input type="number" min="1" value={validityDays} onChange={(event) => setValidityDays(event.target.value)} />
              </div>
            </div>
          </div>
          <button className="btn btn-primary mt-5 active:scale-[0.98]" type="submit">
            <Plus size={17} />
            Crear plan
          </button>
        </form>

        <form className="rounded-[var(--r-xl)] border border-[var(--ink-200)] bg-white p-5 shadow-[var(--shadow-sm)]" onSubmit={saveSale}>
          <PanelHeader icon={WalletCards} title="Vender paquete" description="Asigna clases prepagas a un cliente." />
          <div className="mt-5 grid gap-4">
            <div className="field">
              <label>Buscar cliente</label>
              <div className="flex items-center gap-2 rounded-[var(--r-md)] border border-[var(--ink-200)] bg-white px-3 transition focus-within:border-[var(--court-500)] focus-within:shadow-[0_0_0_3px_rgba(79,140,51,0.15)]">
                <Search size={16} className="text-[var(--ink-400)]" />
                <input className="border-0 px-0 shadow-none focus:shadow-none" value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} />
              </div>
              {customerSearch ? (
                <div className="grid gap-2 rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-[var(--ink-50)] p-2">
                  {customers?.map((customer) => (
                    <button key={customer._id} className="rounded-[var(--r-md)] border border-[var(--ink-200)] bg-white p-3 text-left text-sm transition hover:border-[var(--court-200)] hover:bg-[var(--court-50)] active:scale-[0.99]" type="button" onClick={() => setSelectedCustomer(customer)}>
                      <span className="block font-black">{customer.fullName}</span>
                      <span className="text-[var(--ink-500)]">{customer.phone}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            {selectedCustomer ? (
              <div className="rounded-[var(--r-lg)] border border-[var(--court-200)] bg-[var(--court-50)] p-3 text-sm font-bold text-[var(--court-800)]">
                Cliente: {selectedCustomer.fullName}
              </div>
            ) : null}
            <div className="field">
              <label>Plan opcional</label>
              <select value={selectedPlan} onChange={(event) => {
                const value = event.target.value as Id<"academyPackagePlans"> | "";
                const plan = plans.find((item) => item._id === value);
                setSelectedPlan(value);
                if (plan) {
                  setSaleClasses(String(plan.classesCount));
                  setAmountPaid(String(plan.price));
                  setManualName(plan.name);
                }
              }}>
                <option value="">Manual</option>
                {activePlans.map((plan) => (
                  <option key={plan._id} value={plan._id}>{plan.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Nombre del paquete</label>
              <input value={manualName} onChange={(event) => setManualName(event.target.value)} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="field">
                <label>Clases compradas</label>
                <input type="number" min="1" value={saleClasses} onChange={(event) => setSaleClasses(event.target.value)} />
              </div>
              <div className="field">
                <label>Valor pagado</label>
                <input type="number" min="0" value={amountPaid} onChange={(event) => setAmountPaid(event.target.value)} />
              </div>
              <div className="field">
                <label>Fecha compra</label>
                <input type="date" value={purchasedDate} onChange={(event) => setPurchasedDate(event.target.value)} />
              </div>
              <div className="field">
                <label>Vence opcional</label>
                <input type="date" value={expiresDate} onChange={(event) => setExpiresDate(event.target.value)} />
              </div>
            </div>
          </div>
          <button className="btn btn-primary mt-5 active:scale-[0.98]" type="submit">
            <PackagePlus size={17} />
            Vender paquete
          </button>
        </form>
      </section>

      <section className="min-w-0 space-y-5">
        {(error || message) ? <ActionNotice error={error} message={message} /> : null}

        <section className="rounded-[var(--r-xl)] border border-[var(--ink-200)] bg-white p-5 shadow-[var(--shadow-sm)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-black">Planes existentes</h2>
              <p className="text-sm text-[var(--ink-500)]">{activePlans.length} activos de {plans.length} creados.</p>
            </div>
            <span className="pill pill-available self-start">{activePlans.length} activos</span>
          </div>
          <div className="mt-4 grid gap-3">
            {plans.length === 0 ? (
              <EmptyBlock icon={Ticket} title="No hay planes" text="Crea un plan para vender paquetes con datos prellenados." />
            ) : (
              plans.map((plan) => (
                <article key={plan._id} className="rounded-[var(--r-lg)] border border-[var(--ink-200)] p-4 transition hover:border-[var(--court-200)] hover:bg-[var(--court-50)]">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-black text-[var(--ink-950)]">{plan.name}</p>
                        <span className={plan.active ? "pill pill-available" : "pill pill-blocked"}>{plan.active ? "Activo" : "Inactivo"}</span>
                      </div>
                      <p className="mt-1 text-sm text-[var(--ink-500)]">
                        {plan.classesCount} clases - {formatCOP(plan.price)} - {plan.validityDays ? `${plan.validityDays} dias` : "Sin vencimiento automatico"}
                      </p>
                    </div>
                    <button className={plan.active ? "btn btn-danger px-3 py-2 active:scale-[0.98]" : "btn btn-primary px-3 py-2 active:scale-[0.98]"} type="button" onClick={() => updatePlan({ packagePlanId: plan._id, active: !plan.active })}>
                      <Save size={15} />
                      {plan.active ? "Desactivar" : "Activar"}
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-[var(--r-xl)] border border-[var(--ink-200)] bg-white shadow-[var(--shadow-sm)]">
          <div className="flex flex-col gap-3 border-b border-[var(--ink-200)] p-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-black">Paquetes vendidos</h2>
              <p className="text-sm text-[var(--ink-500)]">Saldo calculado desde clases totales menos usadas.</p>
            </div>
            <span className="pill pill-available self-start">{activePackages.length} con saldo</span>
          </div>
          {packages.length === 0 ? (
            <div className="p-5">
              <EmptyBlock icon={PackageCheck} title="No hay paquetes vendidos" text="Vende un paquete para ver el saldo del cliente aqui." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-[var(--ink-50)] text-xs font-black uppercase text-[var(--ink-500)]">
                  <tr>
                    <th className="px-5 py-3">Cliente</th>
                    <th className="px-4 py-3">Paquete</th>
                    <th className="px-4 py-3">Saldo</th>
                    <th className="px-4 py-3">Pagado</th>
                    <th className="px-4 py-3">Vence</th>
                    <th className="px-5 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--ink-200)]">
                  {packages.map((item) => (
                    <tr key={item.packagePurchase._id} className="transition hover:bg-[var(--ink-50)]">
                      <td className="px-5 py-4 font-black">{item.customer.fullName}</td>
                      <td className="px-4 py-4">{item.packagePurchase.name}</td>
                      <td className="px-4 py-4">
                        <span className="font-black text-[var(--ink-950)]">{item.remainingClasses}</span>
                        <span className="text-[var(--ink-500)]"> restantes de {item.packagePurchase.totalClasses}</span>
                      </td>
                      <td className="px-4 py-4">{formatCOP(item.packagePurchase.amountPaid)}</td>
                      <td className="px-4 py-4">{formatDate(item.packagePurchase.expiresAt)}</td>
                      <td className="px-5 py-4">
                        <span className={item.packagePurchase.status === "active" ? "pill pill-available" : "pill pill-blocked"}>
                          <Boxes size={12} />
                          {packageStatusLabel(item.packagePurchase.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </div>
  );
}

function PanelHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--court-100)] text-[var(--court-700)]">
        <Icon size={19} />
      </span>
      <div>
        <h2 className="text-xl font-black">{title}</h2>
        <p className="text-sm text-[var(--ink-500)]">{description}</p>
      </div>
    </div>
  );
}

function ActionNotice({ error, message }: { error: string; message: string }) {
  const isError = Boolean(error);

  return (
    <div className={`flex items-start gap-3 rounded-[var(--r-lg)] border p-4 text-sm font-bold shadow-[var(--shadow-sm)] ${isError ? "border-[#e9c9c4] bg-[#fff7f5] text-[#8a2a1f]" : "border-[var(--court-200)] bg-[var(--court-50)] text-[var(--court-800)]"}`}>
      {isError ? <CircleAlert size={18} /> : <CheckCircle2 size={18} />}
      <span>{isError ? error : message}</span>
    </div>
  );
}

function EmptyBlock({
  icon: Icon,
  title,
  text,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[var(--r-lg)] border border-dashed border-[var(--ink-300)] bg-[var(--ink-50)] p-6 text-center">
      <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-white text-[var(--court-700)] shadow-[var(--shadow-sm)]">
        <Icon size={21} />
      </span>
      <h3 className="mt-3 font-black">{title}</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-[var(--ink-500)]">{text}</p>
    </div>
  );
}

function PackageSkeleton() {
  return (
    <section className="rounded-[var(--r-xl)] border border-[var(--ink-200)] bg-white p-5 shadow-[var(--shadow-sm)]">
      <div className="h-4 w-32 rounded-full bg-[var(--court-100)]" />
      <div className="mt-4 h-7 w-56 rounded-[var(--r-md)] bg-[var(--ink-100)]" />
      <div className="mt-6 grid gap-3">
        <div className="h-24 rounded-[var(--r-lg)] bg-[var(--ink-50)]" />
        <div className="h-24 rounded-[var(--r-lg)] bg-[var(--ink-50)]" />
      </div>
    </section>
  );
}
