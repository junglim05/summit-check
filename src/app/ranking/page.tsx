import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth";
import type { RankingRow } from "@/lib/types";

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
        <ol className="card divide-y divide-[color:var(--line)]">
          {list.map((r) => (
            <li key={r.user_id} className="flex items-center gap-3 p-3">
              <span
                className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold tabular-nums"
                style={
                  r.rank <= 3
                    ? { background: "var(--fill)", color: "var(--on-fill)" }
                    : { background: "var(--subtle)", color: "var(--muted)" }
                }
              >
                {r.rank}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{r.nickname}</p>
                <p className="text-xs muted">
                  {r.last_summit_at ? `최근 ${new Date(r.last_summit_at).toLocaleDateString("ko-KR")}` : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold tabular-nums">
                  {r.summit_count}<span className="text-xs muted font-normal">개</span>
                </p>
                <p className="text-xs muted tabular-nums">{r.total_elevation.toLocaleString()}m</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
