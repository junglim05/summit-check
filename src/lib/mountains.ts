import { unstable_cache } from "next/cache";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Mountain } from "@/lib/types";

/**
 * 산 목록은 사실상 정적인 시드 데이터(28행)라 요청마다 조회할 이유가 없다.
 * 쿠키를 쓰지 않는 anon 클라이언트로 읽어 Next 데이터 캐시에 담는다
 * (mountains 는 select 가 모두에게 열린 테이블).
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

/** 지역 → 고도 내림차순 (산 목록 화면 정렬) */
export function byRegionThenElevation(a: Mountain, b: Mountain): number {
  if (a.region !== b.region) return a.region < b.region ? -1 : 1;
  return b.elevation_m - a.elevation_m;
}

/** 이름 오름차순 (인증 화면 선택 목록) */
export function byName(a: Mountain, b: Mountain): number {
  return a.name.localeCompare(b.name, "ko");
}
