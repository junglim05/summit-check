import { byName, getMountains } from "@/lib/mountains";
import VerifyFlow from "@/components/verify/VerifyFlow";

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  const mountains = [...(await getMountains())].sort(byName);
  return <VerifyFlow mountains={mountains} preselectSlug={m} />;
}
