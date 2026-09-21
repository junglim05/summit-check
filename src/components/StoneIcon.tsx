import type { StoneShape } from "@/lib/types";

/** 정상석 실루엣 아이콘. 카메라 오버레이(StoneOverlay)와 동일한 path 를 사용한다. */
export const STONE_PATHS: Record<StoneShape, string> = {
  // 가장 흔한 직사각형 비석 (수락산, 불암산 등)
  rect: "M30 20 H70 Q74 20 74 24 V80 H26 V24 Q26 20 30 20 Z M18 80 H82 V90 H18 Z",
  // 세로로 긴 비석 (화악산, 명지산 등 고산)
  tall: "M40 8 H60 Q64 8 64 12 V82 H36 V12 Q36 8 40 8 Z M22 82 H78 V92 H22 Z",
  // 자연석 (북한산 백운대, 도봉산 등)
  natural: "M22 82 C18 60 26 40 40 26 C52 14 70 18 76 34 C82 50 80 66 78 82 Z",
  // 기둥형 (감악산 비 등)
  pillar: "M42 6 H58 V78 H42 Z M34 78 H66 V86 H34 Z M28 86 H72 V92 H28 Z",
};

export default function StoneIcon({
  shape,
  size = 32,
  done = false,
}: {
  shape: StoneShape;
  size?: number;
  done?: boolean;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      <path
        d={STONE_PATHS[shape] ?? STONE_PATHS.rect}
        fill={done ? "var(--ink)" : "var(--subtle)"}
        stroke={done ? "var(--ink)" : "var(--muted)"}
        strokeWidth={done ? 0 : 2}
        fillRule="evenodd"
      />
    </svg>
  );
}
