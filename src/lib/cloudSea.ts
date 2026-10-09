/**
 * 운해(구름바다) 예보.
 *
 * 맑은 밤 복사냉각으로 계곡에 찬 공기가 고이고, 습도가 높아 안개가 되며,
 * 그 위를 따뜻한 공기(기온역전)가 덮어 안개가 흩어지지 않을 때 운해가 생긴다.
 * 정상이 그 안개층보다 높아야 발아래로 보인다.
 *
 * 데이터: Open-Meteo 예보 API (키 불필요). 지상값은 "아래 계곡" 좌표·고도로,
 * 정상 높이 공기는 정상 고도에 가장 가까운 기압면(925/850hPa)으로 본다.
 * ⚠️ Open-Meteo 무료 API 는 비상업 용도 한정. 유료화 시 상용 플랜 또는 기상청 API 로 교체.
 *
 * 점수는 아직 실측 데이터로 보정하지 않은 규칙 기반 "지수"라 확률(%)로 표기하지 않는다.
 */

export interface CloudSeaSpot {
  key: string;
  name: string;
  /** 전망 지점 이름 */
  viewpoint: string;
  /** DB mountains.slug — 산 상세 페이지에 연결. DB 에 없는 지점은 null */
  mountainSlug: string | null;
  summitElevation: number;
  /** 운해가 고이는 아래 계곡·분지 (좌표는 근사값) */
  valley: { name: string; lat: number; lng: number; elevation: number };
  note: string;
}

export const CLOUD_SEA_SPOTS: CloudSeaSpot[] = [
  {
    key: "bukhansan",
    name: "북한산",
    viewpoint: "백운대",
    mountainSlug: "bukhansan",
    summitElevation: 836,
    valley: { name: "서울 도심·한강", lat: 37.57, lng: 126.98, elevation: 40 },
    note: "도심 열섬·미세먼지로 운해 대신 연무가 끼는 날이 많아요.",
  },
  {
    key: "geumgang-sokcho",
    name: "금강산(속초)",
    viewpoint: "화암사 신선대(성인대)",
    mountainSlug: null,
    summitElevation: 645,
    valley: { name: "속초·고성 해안", lat: 38.2, lng: 128.57, elevation: 20 },
    note: "울산바위 아래로 깔리는 운해 명소. 동해 바다안개 영향을 크게 받아요.",
  },
  {
    key: "seolaksan",
    name: "설악산",
    viewpoint: "대청봉",
    mountainSlug: "seolaksan",
    summitElevation: 1708,
    valley: { name: "인제 계곡", lat: 38.07, lng: 128.17, elevation: 200 },
    note: "정상이 높아 구름이 높게 깔린 날에도 운해를 볼 수 있어요.",
  },
  {
    key: "jirisan",
    name: "지리산",
    viewpoint: "천왕봉",
    mountainSlug: "jirisan",
    summitElevation: 1915,
    valley: { name: "산청·함양 분지", lat: 35.27, lng: 127.8, elevation: 200 },
    note: "분지 지형과 섬진강·경호강 수증기로 운해가 자주 생기는 대표 명소.",
  },
];

export type CloudSeaLevel = "매우 높음" | "높음" | "보통" | "낮음";

export interface CloudSeaFactor {
  key: "spread" | "inversion" | "wind" | "sky" | "diurnal";
  label: string;
  /** 0~1, 1 이 운해에 가장 유리 */
  score: number;
  /** 화면에 보여줄 실제 값 */
  value: string;
}

export interface CloudSeaDay {
  /** 해당 아침 날짜 YYYY-MM-DD */
  date: string;
  sunrise: string;
  score: number;
  level: CloudSeaLevel;
  factors: CloudSeaFactor[];
  /** 점수를 깎거나 올린 특이사항 */
  notes: string[];
}

export interface CloudSeaForecast {
  spot: CloudSeaSpot;
  days: CloudSeaDay[];
}

const HOURLY = [
  "temperature_2m",
  "dew_point_2m",
  "wind_speed_10m",
  "cloud_cover_low",
  "cloud_cover_mid",
  "cloud_cover_high",
  "precipitation",
  "temperature_925hPa",
  "relative_humidity_925hPa",
  "geopotential_height_925hPa",
  "temperature_850hPa",
  "relative_humidity_850hPa",
  "geopotential_height_850hPa",
] as const;

type Hourly = Record<(typeof HOURLY)[number], (number | null)[]> & { time: string[] };

interface OpenMeteoLocation {
  hourly: Hourly;
  daily: { time: string[]; sunrise: string[]; temperature_2m_max: number[] };
}

/** x 가 good 쪽일수록 1, bad 쪽일수록 0 (선형) */
function ramp(x: number, good: number, bad: number): number {
  const t = (x - bad) / (good - bad);
  return Math.min(1, Math.max(0, t));
}

const WEIGHTS: Record<CloudSeaFactor["key"], number> = {
  spread: 30,
  inversion: 25,
  wind: 15,
  sky: 15,
  diurnal: 10,
};
const RAIN_BONUS = 5;

function levelOf(score: number): CloudSeaLevel {
  if (score >= 80) return "매우 높음";
  if (score >= 60) return "높음";
  if (score >= 30) return "보통";
  return "낮음";
}

function sum(arr: (number | null)[], from: number, to: number): number {
  let s = 0;
  for (let i = Math.max(0, from); i <= Math.min(arr.length - 1, to); i++) s += arr[i] ?? 0;
  return s;
}

function avg(arr: (number | null)[], from: number, to: number): number {
  const lo = Math.max(0, from), hi = Math.min(arr.length - 1, to);
  return hi >= lo ? sum(arr, lo, hi) / (hi - lo + 1) : 0;
}

function scoreDay(spot: CloudSeaSpot, loc: OpenMeteoLocation, dayIdx: number): CloudSeaDay | null {
  const h = loc.hourly;
  const date = loc.daily.time[dayIdx];
  const sunrise = loc.daily.sunrise[dayIdx];
  // 일출이 속한 정시(예: 06:34 → 06:00)를 기준 시각으로 본다.
  const i = h.time.indexOf(sunrise.slice(0, 13) + ":00");
  if (i < 0) return null;

  const t2m = h.temperature_2m[i];
  const td = h.dew_point_2m[i];
  if (t2m == null || td == null) return null;

  // 정상 고도에 가장 가까운 기압면을 "정상 높이 공기"로 쓴다.
  const z925 = h.geopotential_height_925hPa[i] ?? 760;
  const z850 = h.geopotential_height_850hPa[i] ?? 1500;
  const use850 = Math.abs(spot.summitElevation - z850) < Math.abs(spot.summitElevation - z925);
  const tUp = (use850 ? h.temperature_850hPa : h.temperature_925hPa)[i];
  const rhUp = (use850 ? h.relative_humidity_850hPa : h.relative_humidity_925hPa)[i];
  const zUp = use850 ? z850 : z925;
  if (tUp == null || rhUp == null) return null;

  // 1) 계곡 공기의 포화 정도: 기온-이슬점 차가 작을수록 안개가 잘 생긴다.
  const spread = t2m - td;
  // 2) 대기 안정도: 계곡→정상 기온감률이 0 이하면 역전, 표준(6.5°C/km)이면 불리.
  const lapse = ((t2m - tUp) / Math.max(100, zUp - spot.valley.elevation)) * 1000;
  // 3) 바람: 일출 전후 3시간 평균 지상풍
  const wind = avg(h.wind_speed_10m, i - 2, i);
  // 4) 밤사이 중·상층 구름: 복사냉각을 막는다 (00시~일출)
  const midnight = i - Number(sunrise.slice(11, 13));
  const upperCloud = Math.max(avg(h.cloud_cover_mid, midnight, i), avg(h.cloud_cover_high, midnight, i));
  // 5) 일교차: 전날 최고기온 - 밤사이 최저기온
  let tMin = t2m;
  for (let k = midnight; k <= i; k++) tMin = Math.min(tMin, h.temperature_2m[k] ?? tMin);
  const prevMax = dayIdx > 0 ? loc.daily.temperature_2m_max[dayIdx - 1] : null;
  const diurnal = prevMax != null ? prevMax - tMin : null;

  const factors: CloudSeaFactor[] = [
    { key: "spread", label: "계곡 습도", score: ramp(spread, 1, 5), value: `이슬점차 ${spread.toFixed(1)}°C` },
    {
      key: "inversion",
      label: "기온역전",
      score: ramp(lapse, 0, 6.5),
      value: lapse <= 0 ? `역전 (정상 ${tUp.toFixed(0)}°C)` : `${lapse.toFixed(1)}°C/km`,
    },
    { key: "wind", label: "바람", score: ramp(wind, 2, 5), value: `${wind.toFixed(1)}m/s` },
    { key: "sky", label: "밤하늘", score: ramp(upperCloud, 20, 80), value: `중·상층 구름 ${Math.round(upperCloud)}%` },
    {
      key: "diurnal",
      label: "일교차",
      score: diurnal != null ? ramp(diurnal, 12, 5) : 0.5,
      value: diurnal != null ? `${diurnal.toFixed(0)}°C` : "-",
    },
  ];

  let score = factors.reduce((s, f) => s + f.score * WEIGHTS[f.key], 0);
  const notes: string[] = [];

  // 비 온 뒤 갠 아침은 지면 수분이 많아 운해가 잘 생긴다.
  const rainBefore = sum(h.precipitation, i - 36, i - 4);
  const rainAtDawn = sum(h.precipitation, i - 2, i + 1);
  if (rainBefore >= 1 && rainAtDawn < 0.2) {
    score += RAIN_BONUS;
    notes.push("비 온 뒤 개는 아침");
  }
  if (rainAtDawn >= 0.2) {
    score = Math.min(score, 15);
    notes.push("일출 무렵 비 예보");
  }
  // 정상 높이도 포화 상태면 운해 위가 아니라 구름 속에 갇힌다.
  if (rhUp >= 90 && (h.cloud_cover_low[i] ?? 0) >= 60) {
    score *= 0.4;
    notes.push("정상도 구름 속일 가능성");
  }

  score = Math.round(Math.min(100, score));
  return { date, sunrise, score, level: levelOf(score), factors, notes };
}

/** 오늘 포함 3일 아침의 운해 지수. 30분 캐시. */
export async function getCloudSeaForecasts(): Promise<CloudSeaForecast[]> {
  const params = new URLSearchParams({
    latitude: CLOUD_SEA_SPOTS.map((s) => s.valley.lat).join(","),
    longitude: CLOUD_SEA_SPOTS.map((s) => s.valley.lng).join(","),
    elevation: CLOUD_SEA_SPOTS.map((s) => s.valley.elevation).join(","),
    hourly: HOURLY.join(","),
    daily: "sunrise,temperature_2m_max",
    timezone: "Asia/Seoul",
    past_days: "2",
    forecast_days: "3",
    wind_speed_unit: "ms",
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
    next: { revalidate: 1800, tags: ["cloud-sea"] },
  });
  if (!res.ok) throw new Error(`운해 예보를 불러오지 못했습니다 (${res.status})`);
  const data = (await res.json()) as OpenMeteoLocation[];

  return CLOUD_SEA_SPOTS.map((spot, n) => {
    const loc = data[n];
    // 과거 2일은 전날 강수·최고기온 계산용이라 오늘부터 보여준다.
    const days: CloudSeaDay[] = [];
    for (let d = 2; d < loc.daily.time.length; d++) {
      const day = scoreDay(spot, loc, d);
      if (day) days.push(day);
    }
    return { spot, days };
  });
}

/** 산 상세 페이지용: slug 에 해당하는 운해 지점이 있으면 그 예보만 */
export async function getCloudSeaForecastFor(slug: string): Promise<CloudSeaForecast | null> {
  if (!CLOUD_SEA_SPOTS.some((s) => s.mountainSlug === slug)) return null;
  const all = await getCloudSeaForecasts();
  return all.find((f) => f.spot.mountainSlug === slug) ?? null;
}
