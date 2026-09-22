"use client";

/** 카메라 위에 겹치는 정상석 실루엣. box 는 화면 비율(0~1) 좌표. */
export const OVERLAY_BOX = { x: 0.2, y: 0.18, w: 0.6, h: 0.6 };

export default function StoneOverlay({ path, fit }: { path: string; fit: number }) {
  const good = fit >= 0.3;
  // 단색 유지: 정합 여부는 색이 아니라 선의 굵기·실선 여부로 표현한다.
  const color = good ? "#ffffff" : "rgba(255,255,255,.7)";
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
            <path d={path} fill="#000" fillRule="evenodd" />
          </g>
        </mask>
      </defs>
      {/* 실루엣 바깥을 어둡게 */}
      <rect width="100" height="100" fill="rgba(0,0,0,.45)" mask="url(#stone-hole)" />
      {/* 실루엣 테두리 */}
      <g transform={`translate(${OVERLAY_BOX.x * 100} ${OVERLAY_BOX.y * 100}) scale(${OVERLAY_BOX.w} ${OVERLAY_BOX.h})`}>
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={good ? 2.6 : 1.4}
          strokeDasharray={good ? undefined : "4 3"}
          fillRule="evenodd"
          vectorEffect="non-scaling-stroke"
          style={{ transition: "stroke .2s" }}
        />
      </g>
    </svg>
  );
}
