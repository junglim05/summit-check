import Link from "next/link";
import type { CloudSeaDay, CloudSeaForecast } from "@/lib/cloudSea";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** 아직 오지 않은 가장 가까운 일출 (지났으면 다음 날) */
export function nextMorning(days: CloudSeaDay[]): CloudSeaDay | undefined {
  const now = Date.now();
  return days.find((d) => new Date(`${d.sunrise}:00+09:00`).getTime() > now) ?? days[days.length - 1];
}

function dayLabel(date: string): string {
  const today = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
  const diff = Math.round((Date.parse(date) - Date.parse(today)) / 86400_000);
  if (diff === 0) return "오늘";
  if (diff === 1) return "내일";
  if (diff === 2) return "모레";
  return `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}(${WEEKDAYS[new Date(date).getUTCDay()]})`;
}

/** 무채색 UI 라 지수는 채움 정도(명도)로만 표현한다. */
function Meter({ score }: { score: number }) {
  return (
    <div className="h-1.5 rounded-full bg-[color:var(--subtle)]" role="meter" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-1.5 rounded-full" style={{ width: `${score}%`, background: "var(--fill)" }} />
    </div>
  );
}

export default function CloudSeaCard({ forecast, compact }: { forecast: CloudSeaForecast; compact?: boolean }) {
  const { spot, days } = forecast;
  const main = nextMorning(days);
  if (!main) return null;

  return (
    <section className="card p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-xs muted mb-0.5">
            {compact ? "운해 지수" : `${spot.viewpoint} ${spot.summitElevation}m`} · {dayLabel(main.date)} 일출 {main.sunrise.slice(11)}
          </p>
          <h3 className="font-bold text-lg leading-tight">
            {compact ? main.level : spot.name}
          </h3>
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-bold tabular-nums leading-none">{main.score}</p>
          {!compact && <p className="text-xs font-semibold mt-1">{main.level}</p>}
        </div>
      </div>

      <Meter score={main.score} />

      {main.notes.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {main.notes.map((n) => (
            <span key={n} className="chip">{n}</span>
          ))}
        </div>
      )}

      <dl className="grid grid-cols-5 gap-1 mt-3 text-center">
        {main.factors.map((f) => (
          <div key={f.key} className="rounded-lg py-2 px-0.5 bg-[color:var(--subtle)]">
            <dt className="text-[11px] muted">{f.label}</dt>
            <dd className="text-sm font-bold" aria-label={f.value} title={f.value}>
              {f.score >= 0.7 ? "좋음" : f.score >= 0.35 ? "보통" : "나쁨"}
            </dd>
          </div>
        ))}
      </dl>

      {!compact && (
        <>
          <ul className="text-[11px] muted mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5">
            {main.factors.map((f) => (
              <li key={f.key} className="truncate">{f.label}: {f.value}</li>
            ))}
          </ul>
          <p className="text-xs muted mt-3">{spot.note}</p>
        </>
      )}

      <div className="flex gap-2 mt-3">
        {days.map((d) => (
          <div
            key={d.date}
            className="flex-1 rounded-lg border border-[color:var(--line)] py-1.5 text-center"
            style={d === main ? { borderColor: "var(--ink)" } : undefined}
          >
            <p className="text-[11px] muted">{dayLabel(d.date)}</p>
            <p className="text-sm font-bold tabular-nums">{d.score}</p>
          </div>
        ))}
      </div>

      {compact ? (
        <Link href="/cloud-sea" className="block text-xs muted mt-3 underline underline-offset-2">
          다른 운해 명소 보기
        </Link>
      ) : (
        spot.mountainSlug && (
          <Link href={`/mountains/${spot.mountainSlug}`} className="block text-xs muted mt-3 underline underline-offset-2">
            {spot.name} 정상인증 보러가기
          </Link>
        )
      )}
    </section>
  );
}
