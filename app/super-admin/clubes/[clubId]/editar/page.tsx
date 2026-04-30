import { SuperAdminEditClubClient } from "@/components/super-admin/SuperAdminEditClubClient";

export default async function SuperAdminEditClubPage({
  params,
}: {
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;
  return <SuperAdminEditClubClient clubId={clubId} />;
}
