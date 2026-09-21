import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Mountain } from "@/lib/types";
import StoneIcon from "@/components/StoneIcon";

export default async function HomePage() {
  const supabase = await createClient();
  const [{ data: mountains }, { data: { user } }] = await Promise.all([
    supabase.from("mountains").select("*").order("region").order("elevation_m", { ascending: false }),
    supabase.auth.getUser(),
  ]);

  let done = new Set<number>();
  if (user) {
    const { data } = await supabase.from("summits").select("mountain_id").eq("user_id", user.id);
    done = new Set((data ?? []).map((s) => s.mountain_id));
  }

  const list = (mountains ?? []) as Mountain[];
  const seoul = list.filter((m) => m.region === "서울");
  const gg = list.filter((m) => m.region === "경기");

  return (
    <div>
      <section className="card p-5 mb-5" style={{ background: "linear-gradient(135deg, var(--forest), var(--forest-dark))", color: "#fff", border: "none" }}>
        <p className="text-sm opacity-80 mb-1">서울·경기 정상석 도전</p>
        <h1 className="text-2xl font-bold leading-tight mb-3">
          {user ? `${done.size} / ${list.length} 정복` : "정상에서만 인증되는\n나만의 정상석 컬렉션"}
        </h1>
        <Link href="/verify" className="btn btn-accent w-full">📸 지금 정상인증하기</Link>
      </section>

      <Group title="서울" items={seoul} done={done} />
      <Group title="경기" items={gg} done={done} />
    </div>
  );
}

function Group({ title, items, done }: { title: string; items: Mountain[]; done: Set<number> }) {
  return (
    <section className="mb-6">
      <h2 className="font-bold text-lg mb-2 flex items-center gap-2">
        {title} <span className="chip">{items.filter((m) => done.has(m.id)).length}/{items.length}</span>
      </h2>
      <ul className="card divide-y divide-[color:var(--line)]">
        {items.map((m) => {
          const ok = done.has(m.id);
          return (
            <li key={m.id}>
              <Link href={`/mountains/${m.slug}`} className="flex items-center gap-3 p-3 hover:bg-black/[.02]">
                <StoneIcon shape={m.stone_shape} size={36} done={ok} />
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold ${ok ? "" : ""}`}>{m.name}</p>
                  <p className="text-xs muted">{m.district} · {m.elevation_m}m</p>
                </div>
                {ok ? <span className="text-sm font-bold" style={{ color: "var(--forest)" }}>인증완료 ✓</span> : <span className="text-xs muted">미정복</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
