import type { Metadata } from "next";
import { getCloudSeaForecasts } from "@/lib/cloudSea";
import CloudSeaCard, { nextMorning } from "@/components/CloudSeaCard";

export const metadata: Metadata = {
  title: "운해 예보 — 하이피크",
  description: "북한산·금강산(속초)·설악산·지리산의 일출 무렵 운해 지수.",
};

// 예보는 30분마다 갱신 (fetch 캐시와 동일)
export const revalidate = 1800;

export default async function CloudSeaPage() {
  let forecasts;
  try {
    forecasts = await getCloudSeaForecasts();
  } catch {
    return <p className="muted text-sm card p-5 text-center">운해 예보를 불러오지 못했어요. 잠시 후 다시 시도해주세요.</p>;
  }
  // 다가오는 아침 기준 지수가 높은 순
  const sorted = [...forecasts].sort((a, b) => (nextMorning(b.days)?.score ?? 0) - (nextMorning(a.days)?.score ?? 0));

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">운해 예보</h1>
      <p className="text-sm muted mb-4">
        일출 무렵 정상에서 발아래 구름바다를 볼 수 있을지 0~100 지수로 알려드려요.
      </p>

      <div className="flex flex-col gap-3">
        {sorted.map((f) => (
          <CloudSeaCard key={f.spot.key} forecast={f} />
        ))}
      </div>

      <section className="card p-4 mt-5 text-xs muted leading-relaxed">
        <p className="font-semibold text-[color:var(--ink)] mb-1">이렇게 계산해요</p>
        <p>
          맑은 밤 계곡에 찬 공기가 고이고(일교차·맑은 하늘), 습도가 포화에 가깝고(이슬점차),
          바람이 약하며, 위쪽 공기가 더 따뜻해 안개를 눌러줄 때(기온역전) 운해가 생깁니다.
          비 온 뒤 갠 아침은 가산하고, 정상 높이까지 구름이 차 있으면 감산해요.
        </p>
        <p className="mt-2">
          아직 실제 관측으로 보정하지 않은 참고용 지수예요. 날씨 데이터: Open-Meteo.
        </p>
      </section>
    </div>
  );
}
