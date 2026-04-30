"use client";

import { useQuery } from "convex/react";
import { useMemo, useState } from "react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { todayBogota } from "@/lib/dates";

import { AdminLayout } from "./AdminLayout";
import { AgendaFilters } from "./agenda/AgendaFilters";
import { AgendaGrid } from "./agenda/AgendaGrid";
import { AgendaHeader } from "./agenda/AgendaHeader";
import { AgendaMetrics } from "./agenda/AgendaMetrics";
import { BookingDetailDrawer } from "./agenda/BookingDetailDrawer";
import { ManualBookingModal } from "./agenda/ManualBookingModal";
import type { BookingFilter, ModalDefaults } from "./agenda/types";
import { bookingMatchesFilter } from "./agendaRules";

export function AgendaClient() {
  const [localDate, setLocalDate] = useState(todayBogota);
  const [filter, setFilter] = useState<BookingFilter>("all");
  const [search, setSearch] = useState("");
  const [modalDefaults, setModalDefaults] = useState<ModalDefaults | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<Id<"bookings"> | null>(
    null,
  );
  const agenda = useQuery(api.bookings.listAgendaByDate, { localDate });
  const mercadoPagoStatus = useQuery(api.payments.getClubMercadoPagoStatus, {});

  const visibleBookingIds = useMemo(() => {
    if (!agenda) return new Set<string>();

    return new Set(
      agenda.bookings
        .filter((booking) => bookingMatchesFilter(booking, filter, search))
        .map((booking) => booking._id),
    );
  }, [agenda, filter, search]);

  const selectedBooking = agenda?.bookings.find(
    (booking) => booking._id === selectedBookingId,
  );

  return (
    <AdminLayout>
      <div className="p-4 md:p-8">
        <AgendaHeader
          clubName={agenda?.club.name ?? "Match Point Padel"}
          localDate={localDate}
          search={search}
          onDateChange={setLocalDate}
          onSearchChange={setSearch}
          onNewBooking={() => setModalDefaults({ localDate })}
        />

        {agenda === undefined ? (
          <div className="rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-8 text-center font-bold text-[var(--ink-500)]">
            Cargando agenda...
          </div>
        ) : (
          <>
            <AgendaMetrics
              metrics={agenda.metrics}
              courtCount={agenda.courts.length}
            />

            <AgendaFilters value={filter} onChange={setFilter} />

            <AgendaGrid
              bookings={agenda.bookings}
              courts={agenda.courts}
              openMinutes={agenda.openMinutes}
              closeMinutes={agenda.closeMinutes}
              visibleBookingIds={visibleBookingIds}
              onEmptySlot={(defaults) => setModalDefaults(defaults)}
              onBooking={(booking) => setSelectedBookingId(booking._id)}
              localDate={localDate}
            />

            {modalDefaults ? (
              <ManualBookingModal
                defaults={modalDefaults}
                courts={agenda.courts}
                pricing={agenda.club.pricing}
                clubName={agenda.club.name}
                mercadoPagoStatus={mercadoPagoStatus}
                onClose={() => setModalDefaults(null)}
              />
            ) : null}

            {selectedBooking ? (
              <BookingDetailDrawer
                key={selectedBooking._id}
                booking={selectedBooking}
                court={agenda.courts.find(
                  (court) => court._id === selectedBooking.courtId,
                )}
                clubName={agenda.club.name}
                mercadoPagoStatus={mercadoPagoStatus}
                onClose={() => setSelectedBookingId(null)}
              />
            ) : null}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
