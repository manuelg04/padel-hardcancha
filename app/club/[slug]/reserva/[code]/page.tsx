import { ReservationClient } from "@/components/player/ReservationClient";

export default async function ReservationPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; code: string }>;
  searchParams: Promise<{ payment?: string }>;
}) {
  const { slug, code } = await params;
  const query = await searchParams;
  return (
    <ReservationClient
      slug={slug}
      code={code}
      paymentStatusHint={query.payment}
    />
  );
}
