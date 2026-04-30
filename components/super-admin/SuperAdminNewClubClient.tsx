"use client";

import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";

import { api } from "@/convex/_generated/api";
import { ClubForm, type ClubFormValues } from "./ClubForm";
import { SuperAdminLayout } from "./SuperAdminLayout";

export function SuperAdminNewClubClient() {
  const router = useRouter();
  const createClub = useMutation(api.clubs.superAdminCreateClub);
  const assignClubMaster = useMutation(api.clubs.superAdminAssignClubMaster);

  async function save(values: ClubFormValues) {
    const clubId = await createClub({
      name: values.name,
      slug: values.slug,
      city: values.city,
      state: values.state,
      country: values.country,
      address: values.address,
      phone: values.phone,
      whatsapp: values.whatsapp,
      description: values.description,
      coverImageUrl: values.coverImageUrl,
      galleryImageUrls: values.galleryImageUrls,
      openingHoursText: values.openingHoursText,
      normalPricePerHour: values.normalPricePerHour,
      peakPricePerHour: values.peakPricePerHour,
      weekendPricePerHour: values.weekendPricePerHour,
      peakStartMinutes: values.peakStartMinutes,
      peakEndMinutes: values.peakEndMinutes,
      isPublished: values.isPublished,
      isFeatured: values.isFeatured,
      bookingEnabled: values.bookingEnabled,
      onlinePaymentsEnabled: values.onlinePaymentsEnabled,
      onlinePaymentRequired: values.onlinePaymentRequired,
      paymentHoldMinutes: values.paymentHoldMinutes,
      allowOfflineMercadoPagoMethods: values.allowOfflineMercadoPagoMethods,
    });

    if (values.masterEmail.trim()) {
      await assignClubMaster({
        clubId,
        email: values.masterEmail,
      });
    }

    router.push(`/super-admin/clubes/${clubId}/editar`);
  }

  return (
    <SuperAdminLayout>
      <header className="mb-6">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--ink-500)]">
          Nuevo club
        </p>
        <h1 className="text-display text-4xl font-black">Registrar club</h1>
        <p className="mt-1 text-[var(--ink-500)]">
          Crea un borrador o publicalo directo en el directorio.
        </p>
      </header>

      <ClubForm mode="create" onSubmit={save} />
    </SuperAdminLayout>
  );
}
