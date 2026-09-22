import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth";
import { getMountains } from "@/lib/mountains";
import type { Profile, RankingRow, Summit } from "@/lib/types";
import StoneIcon from "@/components/StoneIcon";
import DeleteSummitButton from "@/components/DeleteSummitButton";
import SummitPhoto from "@/components/SummitPhoto";
import { IconUser, Logo } from "@/components/icons";

export default async function MePage() {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);
  if (!user) redirect("/login?next=/me");

  const [{ data: profile }, { data: summits }, mountains, { data: rank }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("summits").select("*, mountains(*)").eq("user_id", user.id).order("created_at", { ascending: false }),
    getMountains(),
    supabase.from("rankings").select("*").eq("user_id", user.id).maybeSingle(),
  ]);

  const p = profile as Profile | null;
  const list = (summits ?? []) as Summit[];
  const all = mountains;
  const r = rank as RankingRow | null;
  const doneIds = new Set(list.map((s) => s.mountain_id));
  const remaining = all.filter((m) => !doneIds.has(m.id));

  return (
    <div>
      <section className="card p-5 mb-5">
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "var(--subtle)", color: "var(--muted)" }}
          >
            <IconUser size={26} />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{p?.nickname ?? "등산가"}</h1>
            <p className="text-sm muted">{user.email}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4 text-center">
          <Stat label="정복한 산" value={`${list.length}`} unit={`/ ${all.length}`} />
          <Stat label="누적 고도" value={(r?.total_elevation ?? 0).toLocaleString()} unit="m" />
          <Stat label="전체 랭킹" value={r?.rank ? `${r.rank}` : "-"} unit="위" />
        </div>
      </section>

      <h2 className="font-bold text-lg mb-2">내 정상석 모음집</h2>
      {list.length === 0 ? (
        <div className="card p-6 text-center mb-6">
          <Logo size={40} className="mx-auto mb-3 muted" />
          <p className="font-semibold mb-1">아직 인증한 정상석이 없어요</p>
          <p className="text-sm muted mb-4">첫 정상석을 컬렉션에 추가해 보세요.</p>
          <Link href="/verify" className="btn btn-primary">정상인증 시작</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 mb-6">
          {list.map((s) => (
            <figure key={s.id} className="card overflow-hidden">
              <div className="relative aspect-square">
                <SummitPhoto path={s.photo_path} alt={`${s.mountains?.name} 정상석`} sizes="50vw" />
                <span className="absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/60 text-white">
                  {s.method === "live" ? "현장 인증" : "사진 인증"}
                </span>
              </div>
              <figcaption className="p-3">
                <p className="font-semibold text-sm truncate">{s.mountains?.name}</p>
                <p className="text-[11px] muted">
                  {s.mountains?.elevation_m}m · {new Date(s.taken_at ?? s.created_at).toLocaleDateString("ko-KR")}
                </p>
                <DeleteSummitButton id={s.id} />
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      {remaining.length > 0 && (
        <>
          <h2 className="font-bold text-lg mb-2">아직 남은 산 <span className="chip">{remaining.length}</span></h2>
          <div className="card p-3 flex flex-wrap gap-2">
            {remaining.map((m) => (
              <Link key={m.id} href={`/mountains/${m.slug}`} className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-[color:var(--line)]">
                <StoneIcon shape={m.stone_shape} size={16} /> {m.name}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-xl p-3" style={{ background: "var(--bg)" }}>
      <p className="text-[11px] muted">{label}</p>
      <p className="font-bold text-lg leading-tight">
        {value} <span className="text-xs muted font-normal">{unit}</span>
      </p>
    </div>
  );
}
