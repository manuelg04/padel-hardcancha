"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ClubForm, type ClubFormValues } from "./ClubForm";
import { CourtsManager } from "./CourtsManager";
import { SuperAdminLayout } from "./SuperAdminLayout";

export function SuperAdminEditClubClient({ clubId }: { clubId: string }) {
  const typedClubId = clubId as Id<"clubs">;
  const club = useQuery(api.clubs.superAdminGetClub, { clubId: typedClubId });
  const master = useQuery(api.clubs.superAdminGetClubMaster, {
    clubId: typedClubId,
  });
  const updateClub = useMutation(api.clubs.superAdminUpdateClub);
  const assignClubMaster = useMutation(api.clubs.superAdminAssignClubMaster);

  async function save(values: ClubFormValues) {
    await updateClub({
      clubId: typedClubId,
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
      isActive: values.isActive,
      isPublished: values.isPublished,
      isFeatured: values.isFeatured,
      bookingEnabled: values.bookingEnabled,
    });

    if (
      values.masterEmail.trim() &&
      values.masterEmail.trim().toLowerCase() !== master?.user.email
    ) {
      await assignClubMaster({
        clubId: typedClubId,
        email: values.masterEmail,
      });
    }
  }

  return (
    <SuperAdminLayout>
      {club === undefined || master === undefined ? (
        <div className="rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-8 text-center font-bold text-[var(--ink-500)]">
          Cargando club...
        </div>
      ) : club === null ? (
        <div className="rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-8 text-center shadow-[var(--shadow-sm)]">
          <h1 className="text-display text-4xl font-black">Club no encontrado</h1>
          <Link className="btn btn-primary mt-5" href="/super-admin/clubes">
            Volver a clubes
          </Link>
        </div>
      ) : (
        <>
          <header className="mb-6">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--ink-500)]">
              Editar club
            </p>
            <h1 className="text-display text-4xl font-black">{club.name}</h1>
            <p className="text-mono mt-1 text-sm text-[var(--ink-500)]">
              {club.slug}
            </p>
          </header>

          <div className="grid gap-5 xl:grid-cols-[1fr_0.85fr]">
            <ClubForm
              mode="edit"
              initialClub={club}
              initialMaster={
                master
                  ? {
                      name: master.user.name,
                      email: master.user.email,
                      phone: master.user.phone,
                    }
                  : null
              }
              onSubmit={save}
            />
            <CourtsManager clubId={club._id} />
          </div>
        </>
      )}
    </SuperAdminLayout>
  );
}
