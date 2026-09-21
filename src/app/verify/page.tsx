import { createClient } from "@/lib/supabase/server";
import type { Mountain } from "@/lib/types";
import VerifyFlow from "@/components/verify/VerifyFlow";

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("mountains").select("*").order("name");
  return <VerifyFlow mountains={(data ?? []) as Mountain[]} preselectSlug={m} />;
}
