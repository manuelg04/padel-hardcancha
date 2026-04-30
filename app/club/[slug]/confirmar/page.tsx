import { ConfirmClient } from "@/components/player/ConfirmClient";

export default async function ConfirmPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    courtId?: string;
    date?: string;
    startMinutes?: string;
    durationMinutes?: string;
  }>;
}) {
  const { slug } = await params;
  const query = await searchParams;

  return (
    <ConfirmClient
      slug={slug}
      courtId={query.courtId ?? ""}
      localDate={query.date ?? ""}
      startMinutes={Number(query.startMinutes ?? 0)}
      durationMinutes={Number(query.durationMinutes ?? 60)}
    />
  );
}
