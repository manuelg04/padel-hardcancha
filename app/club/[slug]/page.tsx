import { ClubPublicPage } from "@/components/public/ClubPublicPage";

export default async function ClubPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ClubPublicPage slug={slug} />;
}
