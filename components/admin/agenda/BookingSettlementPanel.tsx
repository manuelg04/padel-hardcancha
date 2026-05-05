"use client";

import { Check, CircleDollarSign, Search, UserPlus, X } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";

import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { calculateFinalBalanceDue } from "@/lib/depositRules";
import { formatCOP } from "@/lib/format";

type BookingDoc = Doc<"bookings">;
type CourtDoc = Doc<"courts">;
type BenefitType = Doc<"membershipPlans">["benefitType"];
type MemberOption = {
  membership: Doc<"customerMemberships">;
  customer: Doc<"customers">;
  plan: Doc<"membershipPlans">;
};
type SelectedMemberSummary = {
  customerId: Id<"customers">;
  customerName: string;
  membershipPlanName: string;
  benefitType: BenefitType;
  discountPercent?: number;
  fixedPrice?: number;
};

function describeOptionBenefit(plan: Doc<"membershipPlans">) {
  if (plan.benefitType === "free") return "Paga $0";
  if (plan.benefitType === "percentage_discount") {
    return `${plan.discountPercent ?? 0}% de descuento`;
  }

  return `Paga ${formatCOP(plan.fixedPrice ?? 0)}`;
}

function describeSelectedBenefit(member: SelectedMemberSummary) {
  if (member.benefitType === "free") return "Membresia gratis";
  if (member.benefitType === "percentage_discount") {
    return `${member.discountPercent ?? 0}% descuento`;
  }

  return `Precio fijo ${formatCOP(member.fixedPrice ?? 0)}`;
}

function settlementPill(
  settlement: Doc<"bookingSettlements"> | null | undefined,
  booking: BookingDoc,
) {
  if (booking.bookingStatus === "blocked") {
    return { className: "pill-blocked", label: "No liquidable" };
  }

  if (booking.bookingStatus === "cancelled") {
    return { className: "pill-blocked", label: "Cancelada" };
  }

  if (settlement === undefined) {
    return { className: "pill-pending", label: "Cargando" };
  }

  if (!settlement) {
    return { className: "pill-pending", label: "Sin liquidar" };
  }

  if (settlement.status === "paid") {
    return { className: "pill-paid", label: "Liquidada pagada" };
  }

  if (settlement.status === "cancelled") {
    return { className: "pill-blocked", label: "Liquidacion cancelada" };
  }

  return { className: "pill-available", label: "Liquidada pendiente" };
}

function compactMoney(value: number) {
  if (value === 0) return formatCOP(0);
  if (value < 0) return `-${formatCOP(Math.abs(value))}`;

  return `+${formatCOP(value)}`;
}

export function BookingSettlementPanel({
  booking,
  court,
}: {
  booking: BookingDoc;
  court?: CourtDoc;
}) {
  const liquidatable = booking.bookingStatus === "confirmed";
  const existingSettlement = useQuery(
    api.settlements.getBookingSettlement,
    liquidatable ? { bookingId: booking._id } : "skip",
  );
  const saveSettlement = useMutation(api.settlements.createOrUpdateBookingSettlement);
  const markSettlementPaid = useMutation(api.settlements.markBookingSettlementPaid);
  const markFullBookingPaid = useMutation(api.bookings.markBookingPaid);
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedCustomerIdsDraft, setSelectedCustomerIdsDraft] = useState<
    Id<"customers">[] | null
  >(null);
  const [selectedMembersDraft, setSelectedMembersDraft] = useState<
    SelectedMemberSummary[] | null
  >(null);
  const [manualAdjustmentAmountDraft, setManualAdjustmentAmountDraft] = useState<
    string | null
  >(null);
  const [manualAdjustmentReasonDraft, setManualAdjustmentReasonDraft] = useState<
    string | null
  >(null);
  const [notesDraft, setNotesDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [paying, setPaying] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const memberOptions = useQuery(
    api.settlements.searchSettlementMemberOptions,
    liquidatable
      ? { bookingId: booking._id, search: memberSearch, limit: 8 }
      : "skip",
  );

  const persistedSelectedMembers = useMemo<SelectedMemberSummary[]>(() => {
    if (!existingSettlement) return [];

    return existingSettlement.memberCharges.map((charge) => ({
      customerId: charge.customerId,
      customerName: charge.customerName,
      membershipPlanName: charge.membershipPlanName,
      benefitType: charge.benefitType,
      discountPercent: charge.discountPercent,
      fixedPrice: charge.fixedPrice,
    }));
  }, [existingSettlement]);
  const selectedMembers = selectedMembersDraft ?? persistedSelectedMembers;
  const selectedCustomerIds =
    selectedCustomerIdsDraft ??
    persistedSelectedMembers.map((member) => member.customerId);
  const manualAdjustmentAmount =
    manualAdjustmentAmountDraft ??
    (existingSettlement && existingSettlement.manualAdjustmentAmount !== 0
      ? String(existingSettlement.manualAdjustmentAmount)
      : "");
  const manualAdjustmentReason =
    manualAdjustmentReasonDraft ?? existingSettlement?.manualAdjustmentReason ?? "";
  const notes = notesDraft ?? existingSettlement?.notes ?? "";

  const manualAdjustmentValue = useMemo(() => {
    if (!manualAdjustmentAmount.trim()) return 0;

    return Number(manualAdjustmentAmount);
  }, [manualAdjustmentAmount]);

  const manualAdjustmentBlocksPreview = useMemo(() => {
    if (!Number.isFinite(manualAdjustmentValue)) {
      return "El ajuste debe ser un numero.";
    }

    if (!Number.isInteger(manualAdjustmentValue)) {
      return "El ajuste debe ser un valor entero en pesos.";
    }

    return "";
  }, [manualAdjustmentValue]);
  const manualAdjustmentReasonError = useMemo(() => {
    if (manualAdjustmentValue !== 0 && !manualAdjustmentReason.trim()) {
      return "El motivo del ajuste es obligatorio.";
    }

    return "";
  }, [manualAdjustmentReason, manualAdjustmentValue]);
  const manualAdjustmentError =
    manualAdjustmentBlocksPreview || manualAdjustmentReasonError;

  const settlementLocked =
    existingSettlement?.status === "paid" ||
    existingSettlement?.status === "cancelled";
  const canRequestPreview =
    liquidatable &&
    existingSettlement !== undefined &&
    !settlementLocked &&
    !manualAdjustmentBlocksPreview;
  const previewResult = useQuery(
    api.settlements.previewBookingSettlementResult,
    canRequestPreview
      ? {
          bookingId: booking._id,
          selectedMemberCustomerIds: selectedCustomerIds,
          manualAdjustmentAmount: manualAdjustmentReasonError
            ? 0
            : manualAdjustmentValue,
          manualAdjustmentReason:
            manualAdjustmentValue !== 0 && !manualAdjustmentReasonError
              ? manualAdjustmentReason.trim()
              : undefined,
        }
      : "skip",
  );
  const preview = previewResult?.ok ? previewResult.preview : null;
  const previewError =
    previewResult && !previewResult.ok ? previewResult.error : "";
  const settlementView = preview ?? existingSettlement ?? null;
  const baseShareValue = settlementView?.baseShareValue ?? Math.floor(booking.value / 4);
  const nonMemberCount =
    settlementView?.nonMemberCount ?? Math.max(0, 4 - selectedCustomerIds.length);
  const nonMemberUnitValue = settlementView?.nonMemberUnitValue ?? baseShareValue;
  const nonMemberTotalValue =
    settlementView?.nonMemberTotalValue ?? nonMemberCount * nonMemberUnitValue;
  const calculatedTotalCollectedValue =
    settlementView?.calculatedTotalCollectedValue ??
    selectedCustomerIds.length * baseShareValue + nonMemberTotalValue;
  const displayManualAdjustmentAmount =
    settlementLocked && settlementView
      ? settlementView.manualAdjustmentAmount
      : manualAdjustmentValue;
  const finalTotalCollectedValue =
    settlementLocked && settlementView
      ? settlementView.finalTotalCollectedValue
      : calculatedTotalCollectedValue + displayManualAdjustmentAmount;
  const depositPaidAmount = booking.depositPaidAmount ?? 0;
  const finalBalanceDue = calculateFinalBalanceDue(
    finalTotalCollectedValue,
    depositPaidAmount,
  );
  const discountAbsorbedByClubValue =
    settlementLocked && settlementView
      ? settlementView.discountAbsorbedByClubValue
      : booking.value - finalTotalCollectedValue;
  const chargeByCustomerId = useMemo(() => {
    return new Map(
      (settlementView?.memberCharges ?? []).map((charge) => [
        charge.customerId,
        charge,
      ]),
    );
  }, [settlementView]);
  const pill = settlementPill(existingSettlement, booking);
  const isPreviewLoading = canRequestPreview && previewResult === undefined;
  const canSave =
    liquidatable &&
    !settlementLocked &&
    previewResult?.ok === true &&
    !manualAdjustmentError &&
    !saving;

  function addMember(option: MemberOption) {
    if (settlementLocked) return;
    if (selectedCustomerIds.includes(option.customer._id)) return;
    if (selectedCustomerIds.length >= 4) return;

    setSelectedCustomerIdsDraft([...selectedCustomerIds, option.customer._id]);
    setSelectedMembersDraft([
      ...selectedMembers,
      {
        customerId: option.customer._id,
        customerName: option.customer.fullName,
        membershipPlanName: option.plan.name,
        benefitType: option.plan.benefitType,
        discountPercent: option.plan.discountPercent,
        fixedPrice: option.plan.fixedPrice,
      },
    ]);
    setMemberSearch("");
    setMessage("");
    setError("");
  }

  function removeMember(customerId: Id<"customers">) {
    if (settlementLocked) return;

    setSelectedCustomerIdsDraft(
      selectedCustomerIds.filter((selectedId) => selectedId !== customerId),
    );
    setSelectedMembersDraft(
      selectedMembers.filter((member) => member.customerId !== customerId),
    );
    setMessage("");
    setError("");
  }

  async function persistSettlement() {
    setMessage("");
    setError("");

    if (!canSave) {
      setError(manualAdjustmentError || previewError || "Revisa la liquidacion.");
      return;
    }

    try {
      setSaving(true);
      await saveSettlement({
        bookingId: booking._id,
        selectedMemberCustomerIds: selectedCustomerIds,
        manualAdjustmentAmount: manualAdjustmentValue,
        manualAdjustmentReason:
          manualAdjustmentValue !== 0
            ? manualAdjustmentReason.trim()
            : undefined,
        notes: notes.trim() || undefined,
      });
      setMessage("Liquidacion guardada.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "No pudimos guardar la liquidacion.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function markPaid() {
    setMessage("");
    setError("");

    try {
      setPaying(true);
      if (existingSettlement && existingSettlement.status !== "cancelled") {
        await markSettlementPaid({ bookingId: booking._id });
        setMessage("Liquidacion marcada como pagada.");
      } else {
        await markFullBookingPaid({ bookingId: booking._id });
        setMessage("Valor cancha marcado como pagado.");
      }
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "No pudimos marcar el pago.",
      );
    } finally {
      setPaying(false);
    }
  }

  if (!liquidatable) {
    return (
      <section className="mt-5 rounded-[var(--r-lg)] border border-[var(--ink-200)] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-black">Liquidacion</h3>
            <p className="text-sm text-[var(--ink-500)]">
              {booking.bookingStatus === "blocked"
                ? "Los bloqueos no se liquidan."
                : "Las reservas canceladas no se liquidan."}
            </p>
          </div>
          <span className={`pill ${pill.className}`}>
            <span className="dot" />
            {pill.label}
          </span>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-5 rounded-[var(--r-lg)] border border-[var(--ink-200)] p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--ink-500)]">
            Liquidacion
          </p>
          <h3 className="text-xl font-black">Cierre de cobro</h3>
          <p className="text-sm text-[var(--ink-500)]">
            {court?.name ?? "Cancha"} - {selectedCustomerIds.length} miembros
            seleccionados
          </p>
        </div>
        <span className={`pill ${pill.className}`}>
          <span className="dot" />
          {pill.label}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <MiniTotal label="Valor cancha" value={formatCOP(booking.value)} />
        <MiniTotal label="Base por jugador" value={formatCOP(baseShareValue)} />
      </div>

      {!settlementLocked ? (
        <div className="mt-4">
          <div className="field">
            <label>Buscar miembro</label>
            <div className="flex items-center gap-2 rounded-[var(--r-md)] border border-[var(--ink-200)] bg-white px-3">
              <Search size={16} className="text-[var(--ink-400)]" />
              <input
                className="border-0 px-0"
                value={memberSearch}
                disabled={selectedCustomerIds.length >= 4}
                onChange={(event) => setMemberSearch(event.target.value)}
                placeholder="Nombre, telefono o email"
              />
            </div>
          </div>

          <div className="mt-3 grid gap-2">
            {selectedCustomerIds.length >= 4 ? (
              <p className="rounded-[var(--r-md)] border border-dashed border-[var(--ink-300)] p-3 text-sm font-bold text-[var(--ink-500)]">
                Ya hay 4 miembros seleccionados.
              </p>
            ) : memberOptions === undefined ? (
              <p className="text-sm font-bold text-[var(--ink-500)]">
                Buscando miembros...
              </p>
            ) : memberOptions.length === 0 ? (
              <p className="rounded-[var(--r-md)] border border-dashed border-[var(--ink-300)] p-3 text-sm font-bold text-[var(--ink-500)]">
                No hay miembros vigentes para esta reserva.
              </p>
            ) : (
              memberOptions.map((option) => {
                const selected = selectedCustomerIds.includes(option.customer._id);

                return (
                  <button
                    key={option.membership._id}
                    className={`rounded-[var(--r-md)] border p-3 text-left text-sm ${
                      selected
                        ? "border-[var(--court-500)] bg-[var(--court-50)]"
                        : "border-[var(--ink-200)] bg-white hover:bg-[var(--ink-50)]"
                    }`}
                    type="button"
                    disabled={selected}
                    onClick={() => addMember(option)}
                  >
                    <span className="flex items-center gap-2 font-black">
                      <UserPlus size={15} />
                      {option.customer.fullName}
                    </span>
                    <span className="mt-1 block text-[var(--ink-500)]">
                      {option.plan.name} - {describeOptionBenefit(option.plan)}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}

      <div className="mt-5">
        <p className="mb-2 text-sm font-black text-[var(--ink-700)]">
          Miembros que jugaron
        </p>
        <div className="space-y-2">
          {selectedMembers.length === 0 ? (
            <p className="rounded-[var(--r-md)] border border-dashed border-[var(--ink-300)] p-3 text-sm font-bold text-[var(--ink-500)]">
              Sin miembros seleccionados. Los 4 cupos se cobran como no miembros.
            </p>
          ) : (
            selectedMembers.map((member) => {
              const charge = chargeByCustomerId.get(member.customerId);

              return (
                <div
                  key={member.customerId}
                  className="rounded-[var(--r-md)] border border-[var(--ink-200)] p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black">{member.customerName}</p>
                      <p className="text-sm text-[var(--ink-500)]">
                        {member.membershipPlanName} - {describeSelectedBenefit(member)}
                      </p>
                      {charge && !charge.benefitApplied ? (
                        <p className="mt-1 text-xs font-bold text-[var(--status-pending-fg)]">
                          Beneficio no aplica por horario. Paga base normal.
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-right font-black">
                        {charge ? formatCOP(charge.chargedValue) : "Calculando..."}
                      </span>
                      {!settlementLocked ? (
                        <button
                          className="btn-icon"
                          type="button"
                          onClick={() => removeMember(member.customerId)}
                        >
                          <X size={16} />
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="mt-5 rounded-[var(--r-md)] bg-[var(--ink-50)] p-3">
        <AmountRow
          label="No miembros"
          value={`${nonMemberCount} x ${formatCOP(nonMemberUnitValue)} = ${formatCOP(
            nonMemberTotalValue,
          )}`}
        />
        <AmountRow
          label="Total calculado"
          value={formatCOP(calculatedTotalCollectedValue)}
        />
        <AmountRow
          label="Ajuste manual"
          value={compactMoney(displayManualAdjustmentAmount)}
        />
        <AmountRow
          label="Total a cobrar"
          value={formatCOP(finalTotalCollectedValue)}
          strong
        />
        <AmountRow
          label="Anticipo pagado"
          value={`-${formatCOP(depositPaidAmount)}`}
        />
        <AmountRow
          label="Saldo final"
          value={formatCOP(finalBalanceDue)}
          strong
        />
        <AmountRow
          label="Descuento absorbido"
          value={formatCOP(discountAbsorbedByClubValue)}
        />
      </div>

      {!settlementLocked ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="field">
            <label>Ajuste manual</label>
              <input
                type="number"
                step="1000"
                value={manualAdjustmentAmount}
                onChange={(event) =>
                  setManualAdjustmentAmountDraft(event.target.value)
                }
                placeholder="0"
              />
          </div>
          <div className="field">
            <label>Motivo del ajuste</label>
            <input
              value={manualAdjustmentReason}
              onChange={(event) =>
                setManualAdjustmentReasonDraft(event.target.value)
              }
              placeholder="Obligatorio si hay ajuste"
            />
          </div>
          <div className="field sm:col-span-2">
            <label>Notas de liquidacion</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(event) => setNotesDraft(event.target.value)}
            />
          </div>
        </div>
      ) : existingSettlement?.notes ? (
        <p className="mt-4 rounded-[var(--r-md)] bg-[var(--ink-50)] p-3 text-sm text-[var(--ink-700)]">
          {existingSettlement.notes}
        </p>
      ) : null}

      {manualAdjustmentError || previewError ? (
        <p className="mt-3 rounded-[var(--r-md)] bg-red-50 p-3 text-sm font-bold text-red-700">
          {manualAdjustmentError || previewError}
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 rounded-[var(--r-md)] bg-red-50 p-3 text-sm font-bold text-red-700">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-3 rounded-[var(--r-md)] bg-[var(--status-paid-bg)] p-3 text-sm font-bold text-[var(--status-paid-fg)]">
          {message}
        </p>
      ) : null}
      {isPreviewLoading ? (
        <p className="mt-3 text-sm font-bold text-[var(--ink-500)]">
          Calculando liquidacion...
        </p>
      ) : null}

      <div className="mt-5 grid gap-2">
        {!settlementLocked ? (
          <button
            className="btn btn-dark btn-block"
            type="button"
            disabled={!canSave}
            onClick={persistSettlement}
          >
            <Check size={17} />
            {saving ? "Guardando..." : "Guardar liquidacion"}
          </button>
        ) : null}

        {existingSettlement === undefined ? (
          <p className="rounded-[var(--r-md)] bg-[var(--ink-50)] p-3 text-center text-sm font-black text-[var(--ink-500)]">
            Cargando estado de liquidacion...
          </p>
        ) : existingSettlement?.status === "paid" ? (
          <p className="rounded-[var(--r-md)] bg-[var(--status-paid-bg)] p-3 text-center text-sm font-black text-[var(--status-paid-fg)]">
            Liquidacion pagada por {formatCOP(existingSettlement.finalTotalCollectedValue)}
          </p>
        ) : existingSettlement && existingSettlement.status !== "cancelled" ? (
          <button
            className="btn btn-primary btn-block"
            type="button"
            disabled={paying}
            onClick={markPaid}
          >
            <CircleDollarSign size={17} />
            {paying ? "Marcando..." : "Marcar liquidacion pagada"}
          </button>
        ) : booking.paymentStatus === "paid" ? (
          <p className="rounded-[var(--r-md)] bg-[var(--status-paid-bg)] p-3 text-center text-sm font-black text-[var(--status-paid-fg)]">
            Valor cancha ya marcado como pagado.
          </p>
        ) : (
          <button
            className="btn btn-ghost btn-block"
            type="button"
            disabled={paying}
            onClick={markPaid}
          >
            <CircleDollarSign size={17} />
            {paying ? "Marcando..." : "Marcar valor cancha pagado"}
          </button>
        )}
      </div>
    </section>
  );
}

function MiniTotal({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--r-md)] border border-[var(--ink-200)] bg-white p-3">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--ink-500)]">
        {label}
      </p>
      <p className="mt-1 text-lg font-black">{value}</p>
    </div>
  );
}

function AmountRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--ink-200)] py-2 last:border-0">
      <span className="text-sm text-[var(--ink-500)]">{label}</span>
      <span className={strong ? "text-xl font-black" : "text-sm font-black"}>
        {value}
      </span>
    </div>
  );
}
