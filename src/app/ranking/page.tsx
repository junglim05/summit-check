import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth";
import type { RankingRow } from "@/lib/types";
import RankingList from "@/components/RankingList";

export default async function RankingPage() {
  const supabase = await createClient();
  const [{ data: rows }, user] = await Promise.all([
    supabase.from("rankings").select("*").gt("summit_count", 0).order("rank").limit(100),
    getAuthUser(supabase),
  ]);
  const list = (rows ?? []) as RankingRow[];
  const me = user ? list.find((r) => r.user_id === user.id) : undefined;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">랭킹</h1>
      <p className="text-sm muted mb-4">정복한 산 개수 → 누적 고도 → 먼저 달성한 순</p>

      {me && (
        <div className="card p-3 mb-3 flex items-center gap-3" style={{ borderColor: "var(--ink)" }}>
          <span className="font-bold w-8 text-center tabular-nums">{me.rank}</span>
          <span className="flex-1 font-semibold">
            {me.nickname} <span className="chip chip-solid ml-1">나</span>
          </span>
          <span className="text-sm muted">{me.summit_count}개 · {me.total_elevation.toLocaleString()}m</span>
        </div>
      )}

      {list.length === 0 ? (
        <p className="card p-6 text-center muted text-sm">아직 인증한 사람이 없어요. 첫 정복자가 되어보세요.</p>
      ) : (
        <RankingList rows={list} meId={user?.id} />
      )}
    </div>
  );
}
