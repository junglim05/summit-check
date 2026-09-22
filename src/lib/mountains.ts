import { unstable_cache } from "next/cache";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Mountain } from "@/lib/types";

/**
 * 산 목록은 사실상 정적인 시드 데이터(28행)라 요청마다 조회할 이유가 없다.
 * 쿠키를 쓰지 않는 anon 클라이언트로 읽어 Next 데이터 캐시에 담는다
 * (mountains 는 select 가 모두에게 열린 테이블).
 *
 * ⚠️ 이 캐시는 Vercel 데이터 캐시라 재배포로 지워지지 않는다. 시드(이름·좌표 등)를
 * 바꾼 뒤에는 태그를 무효화해야 즉시 반영된다:
 *     vercel cache invalidate --tag mountains
 */
export const getMountains = unstable_cache(
  async (): Promise<Mountain[]> => {
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
    const { data, error } = await supabase.from("mountains").select("*");
    if (error) throw new Error("산 목록을 불러오지 못했습니다: " + error.message);
    return (data ?? []) as Mountain[];
  },
  ["mountains"],
  { revalidate: 3600, tags: ["mountains"] }
);

/** 화면에 지역을 노출하는 순서 (수도권 → 강원 → 충청 → 호남 → 영남 → 제주) */
export const REGION_ORDER = [
  "서울", "경기", "인천", "강원", "충북", "충남", "대전", "세종",
  "전북", "전남", "광주", "경북", "경남", "대구", "부산", "울산", "제주",
] as const;

function regionRank(r: string): number {
  const i = (REGION_ORDER as readonly string[]).indexOf(r);
  return i === -1 ? REGION_ORDER.length : i;
}

/** 지역 → 고도 내림차순 (산 목록 화면 정렬) */
export function byRegionThenElevation(a: Mountain, b: Mountain): number {
  const ra = regionRank(a.region), rb = regionRank(b.region);
  if (ra !== rb) return ra - rb;
  if (a.region !== b.region) return a.region < b.region ? -1 : 1;
  return b.elevation_m - a.elevation_m;
}

/** 지역별로 묶어 REGION_ORDER 순서대로 돌려준다. */
export function groupByRegion(list: Mountain[]): { region: string; items: Mountain[] }[] {
  const map = new Map<string, Mountain[]>();
  for (const m of list) {
    const arr = map.get(m.region);
    if (arr) arr.push(m);
    else map.set(m.region, [m]);
  }
  return [...map.entries()]
    .map(([region, items]) => ({ region, items: items.sort((a, b) => b.elevation_m - a.elevation_m) }))
    .sort((a, b) => regionRank(a.region) - regionRank(b.region));
}

/** 이름 오름차순 (인증 화면 선택 목록) */
export function byName(a: Mountain, b: Mountain): number {
  return a.name.localeCompare(b.name, "ko");
}
