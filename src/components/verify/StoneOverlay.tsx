"use client";

import type { StoneShape } from "@/lib/types";
import { STONE_PATHS } from "@/components/StoneIcon";

/** 카메라 위에 겹치는 정상석 실루엣. box 는 화면 비율(0~1) 좌표. */
export const OVERLAY_BOX = { x: 0.2, y: 0.18, w: 0.6, h: 0.6 };

export default function StoneOverlay({ shape, fit }: { shape: StoneShape; fit: number }) {
  const good = fit >= 0.3;
  const color = good ? "#7CFF9B" : "rgba(255,255,255,.85)";
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <mask id="stone-hole">
          <rect width="100" height="100" fill="#fff" />
          <g transform={`translate(${OVERLAY_BOX.x * 100} ${OVERLAY_BOX.y * 100}) scale(${OVERLAY_BOX.w} ${OVERLAY_BOX.h})`}>
            <path d={STONE_PATHS[shape] ?? STONE_PATHS.rect} fill="#000" fillRule="evenodd" />
          </g>
        </mask>
      </defs>
      {/* 실루엣 바깥을 어둡게 */}
      <rect width="100" height="100" fill="rgba(0,0,0,.45)" mask="url(#stone-hole)" />
      {/* 실루엣 테두리 */}
      <g transform={`translate(${OVERLAY_BOX.x * 100} ${OVERLAY_BOX.y * 100}) scale(${OVERLAY_BOX.w} ${OVERLAY_BOX.h})`}>
        <path
          d={STONE_PATHS[shape] ?? STONE_PATHS.rect}
          fill="none"
          stroke={color}
          strokeWidth={good ? 2.2 : 1.6}
          strokeDasharray={good ? undefined : "4 3"}
          fillRule="evenodd"
          vectorEffect="non-scaling-stroke"
          style={{ transition: "stroke .2s" }}
        />
      </g>
    </svg>
  );
}
