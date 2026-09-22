import type { StoneShape } from "@/lib/types";

/**
 * 정상석 실루엣 카탈로그.
 *
 * 카메라 오버레이 프레임, 산 목록 아이콘이 모두 여기서 나온다.
 * viewBox 는 0 0 100 100, 받침은 y≈90 에 맞춘다.
 *
 * `verified: true` 는 실물 형태의 근거(기사·지자체 안내 등)를 확인한 항목이고,
 * 나머지는 지역·고도 기준의 일반적인 형태로 둔 추정값이다. 사용자 인증 사진이
 * 쌓이면 실제 정상석에 맞춰 다듬을 수 있게 산별로 분리해 두었다.
 */
export type StoneArchetype = StoneShape | "boulder" | "flag" | "slab" | "peak";

export const ARCHETYPE_PATHS: Record<StoneArchetype, string> = {
  // 가장 흔한 직사각형 비석
  rect: "M30 20 H70 Q74 20 74 24 V80 H26 V24 Q26 20 30 20 Z M18 80 H82 V90 H18 Z",
  // 세로로 긴 비석
  tall: "M40 8 H60 Q64 8 64 12 V82 H36 V12 Q36 8 40 8 Z M22 82 H78 V92 H22 Z",
  // 자연석 그대로
  natural: "M22 82 C18 60 26 40 40 26 C52 14 70 18 76 34 C82 50 80 66 78 82 Z",
  // 기둥형 비 (받침 2단)
  pillar: "M42 6 H58 V78 H42 Z M34 78 H66 V86 H34 Z M28 86 H72 V92 H28 Z",
  // 너럭바위 위에 세운 표지석
  boulder:
    "M44 38 H60 Q63 38 63 41 V64 H41 V41 Q41 38 44 38 Z " +
    "M8 90 C10 76 22 66 38 64 C56 62 76 68 88 78 C92 82 93 86 93 90 Z",
  // 바위 정상 + 깃대 (북한산 백운대)
  flag: "M48 14 H52 V70 H48 Z M52 17 L78 25 L52 33 Z M12 90 C16 78 30 70 50 69 C70 68 84 77 90 90 Z",
  // 가로로 긴 판석
  slab: "M18 56 H82 Q85 56 85 59 V80 H15 V59 Q15 56 18 56 Z M10 80 H90 V90 H10 Z",
  // 뾰족한 첨탑형
  peak: "M50 10 L68 78 H32 Z M24 78 H76 V90 H24 Z",
};

interface StoneEntry {
  archetype: StoneArchetype;
  /** 촬영 화면에 띄우는 한 줄 안내 */
  hint?: string;
  /** 실물 근거를 확인했는지 */
  verified?: boolean;
}

/** 산별 정상석. 여기 없으면 DB 의 stone_shape 를 쓴다. */
const BY_SLUG: Record<string, StoneEntry> = {
  bukhansan: {
    archetype: "flag",
    hint: "백운대 정상은 너른 바위와 태극기 깃대예요. 깃대와 바위를 함께 담아보세요.",
    verified: true,
  },
  gwanaksan: {
    archetype: "boulder",
    hint: "정상석은 연주대 너럭바위 위에 있어요. 표지석 표기는 629m 입니다.",
    verified: true,
  },
  suraksan: {
    archetype: "tall",
    hint: "주봉 표지석은 높이 60cm 정도로 작아요. 가까이 다가가 세로로 담아주세요.",
    verified: true,
  },
  bugaksan: {
    archetype: "rect",
    hint: "정상 표석에 '白岳山 海拔 342m' 라고 새겨져 있어요.",
    verified: true,
  },
  gamaksan: {
    archetype: "pillar",
    hint: "정상에는 글자가 닳아 없어진 감악산비(몰자비)가 서 있어요.",
    verified: true,
  },
  dobongsan: { archetype: "natural" },
  inwangsan: { archetype: "natural" },
  soyosan: { archetype: "natural" },
  cheonmasan: { archetype: "natural" },
  hwaaksan: { archetype: "tall" },
  myeongjisan: { archetype: "tall" },
  unaksan: { archetype: "tall" },
  yongmunsan: { archetype: "tall" },
};

export interface StoneProfile {
  archetype: StoneArchetype;
  path: string;
  hint: string;
  verified: boolean;
}

const DEFAULT_HINT = "정상석이 실루엣 안에 들어오게 맞춰주세요.";

export function stoneProfile(mountain: { slug: string; stone_shape: StoneShape }): StoneProfile {
  const entry = BY_SLUG[mountain.slug];
  const archetype = entry?.archetype ?? mountain.stone_shape ?? "rect";
  return {
    archetype,
    path: ARCHETYPE_PATHS[archetype] ?? ARCHETYPE_PATHS.rect,
    hint: entry?.hint ?? DEFAULT_HINT,
    verified: entry?.verified ?? false,
  };
}
