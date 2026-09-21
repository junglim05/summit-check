/** 하이피크 단색 아이콘 세트. 모두 currentColor 를 따르며 색을 갖지 않는다. */

type IconProps = { size?: number; className?: string; strokeWidth?: number };

/** 하이피크 로고 마크 — 능선 위로 솟은 봉우리와 정상 캡(정상석). */
export function Logo({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden>
      <path
        d="M3 25.5 L12 9 L17.5 18.5 L21.5 12 L29 25.5 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <path d="M12 9 L15.6 15.2 L8.4 15.2 Z" fill="currentColor" />
    </svg>
  );
}

/** 로고 + 워드마크. */
export function Wordmark({ size = 22 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Logo size={size} />
      <span className="font-bold tracking-tight" style={{ fontSize: size * 0.82 }}>
        하이피크
      </span>
    </span>
  );
}

function base({ size = 22, className, strokeWidth = 1.6 }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    className,
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
}

export function IconMountain(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M2.5 19 L9 7 L13 14 L15.5 9.5 L21.5 19 Z" />
    </svg>
  );
}

export function IconCamera(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M4 8.5h3l1.2-2h7.6l1.2 2H20a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 20 19.5H4A1.5 1.5 0 0 1 2.5 18v-8A1.5 1.5 0 0 1 4 8.5Z" />
      <circle cx="12" cy="14" r="3.2" />
    </svg>
  );
}

export function IconRank(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M3.5 13.5h4v6.5h-4zM10 8.5h4v11.5h-4zM16.5 15.5h4v4.5h-4z" />
    </svg>
  );
}

export function IconUser(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="8.5" r="3.6" />
      <path d="M4.5 20c0-3.5 3.4-5.5 7.5-5.5s7.5 2 7.5 5.5" />
    </svg>
  );
}

export function IconImage(p: IconProps) {
  return (
    <svg {...base(p)}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="10" r="1.3" />
      <path d="M4 17l5-4.5 4 3.5 3-2.5 4 3.5" />
    </svg>
  );
}

export function IconCheck(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M4.5 12.5l5 5 10-11" />
    </svg>
  );
}

export function IconPin(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M12 21.5s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" />
      <circle cx="12" cy="10.3" r="2.6" />
    </svg>
  );
}

export function IconAlert(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5M12 16.3v.2" />
    </svg>
  );
}
