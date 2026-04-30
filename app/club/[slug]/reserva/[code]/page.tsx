import { ReservationClient } from "@/components/player/ReservationClient";

export default async function ReservationPage({
  params,
}: {
  params: Promise<{ slug: string; code: string }>;
}) {
  const { slug, code } = await params;
  return <ReservationClient slug={slug} code={code} />;
}
