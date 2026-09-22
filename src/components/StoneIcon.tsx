import type { StoneShape } from "@/lib/types";
import { stoneProfile } from "@/lib/stones";

/** 정상석 실루엣 아이콘. 카메라 오버레이와 같은 path 를 쓴다 (@/lib/stones). */
export default function StoneIcon({
  slug,
  shape,
  size = 32,
  done = false,
}: {
  slug: string;
  shape: StoneShape;
  size?: number;
  done?: boolean;
}) {
  const { path } = stoneProfile({ slug, stone_shape: shape });
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      <path
        d={path}
        fill={done ? "var(--ink)" : "var(--subtle)"}
        stroke={done ? "var(--ink)" : "var(--muted)"}
        strokeWidth={done ? 0 : 2}
        fillRule="evenodd"
      />
    </svg>
  );
}
