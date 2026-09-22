import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMountains } from "@/lib/mountains";
import type { Summit } from "@/lib/types";
import StoneIcon from "@/components/StoneIcon";
import { IconCamera } from "@/components/icons";
import SummitPhoto from "@/components/SummitPhoto";

export default async function MountainPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const mountain = (await getMountains()).find((m) => m.slug === slug);
  if (!mountain) notFound();

  // 최근 사진과 인증자 수는 실시간 데이터라 병렬로 함께 조회한다.
  const supabase = await createClient();
  const [{ data: recent }, { count }] = await Promise.all([
    supabase
      .from("summits")
      .select("id, photo_path, created_at, method, profiles(nickname)")
      .eq("mountain_id", mountain.id)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase.from("summits").select("*", { count: "exact", head: true }).eq("mountain_id", mountain.id),
  ]);

  return (
    <div>
      <div className="card p-5 mb-4 flex items-center gap-4">
        <StoneIcon shape={mountain.stone_shape} size={56} done />
        <div>
          <span className="chip mb-1">{mountain.region} · {mountain.district}</span>
          <h1 className="text-2xl font-bold">{mountain.name}</h1>
          <p className="muted text-sm">해발 {mountain.elevation_m}m · 인증 반경 {mountain.radius_m}m · {count ?? 0}명 인증</p>
        </div>
      </div>

      <Link href={`/verify?m=${mountain.slug}`} className="btn btn-primary w-full mb-6">
        <IconCamera size={18} /> 이 산 정상인증하기
      </Link>

      <h2 className="font-bold mb-2">최근 인증 정상석</h2>
      {recent && recent.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {(recent as unknown as (Summit & { profiles: { nickname: string } })[]).map((s) => (
            <figure key={s.id} className="relative aspect-square rounded-xl overflow-hidden card">
              <SummitPhoto path={s.photo_path} alt={`${mountain.name} 정상석`} sizes="33vw" />
              <figcaption className="absolute bottom-0 inset-x-0 text-[11px] px-2 py-1 bg-black/50 text-white truncate">
                {s.profiles?.nickname}
              </figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <p className="muted text-sm card p-5 text-center">아직 인증한 사람이 없어요. 첫 번째가 되어보세요.</p>
      )}
    </div>
  );
}
