import { ReserveClient } from "@/components/player/ReserveClient";

export default async function ReservePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ReserveClient slug={slug} />;
}
