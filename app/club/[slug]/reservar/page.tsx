import { ReserveClient } from "@/components/player/ReserveClient";

export default async function ReservePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    date?: string;
    durationMinutes?: string;
  }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const durationMinutes =
    Number(query.durationMinutes) === 120 ? 120 : 60;
  const initialLocalDate = /^\d{4}-\d{2}-\d{2}$/.test(query.date ?? "")
    ? query.date
    : undefined;

  return (
    <ReserveClient
      slug={slug}
      initialLocalDate={initialLocalDate}
      initialDurationMinutes={durationMinutes}
    />
  );
}
