"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconCamera, IconMountain, IconRank, IconUser } from "./icons";

const TABS = [
  { href: "/", label: "산 목록", Icon: IconMountain },
  { href: "/verify", label: "정상인증", Icon: IconCamera },
  { href: "/ranking", label: "랭킹", Icon: IconRank },
  { href: "/me", label: "마이", Icon: IconUser },
] as const;

export default function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-20 border-t border-[color:var(--line)] bg-[color:var(--card)]">
      <div className="max-w-md mx-auto grid grid-cols-4 h-16 text-[11px] font-semibold">
        {TABS.map(({ href, label, Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className="flex flex-col items-center justify-center gap-1.5 transition-opacity hover:opacity-70"
              style={{ color: active ? "var(--ink)" : "var(--muted)" }}
            >
              <Icon size={22} strokeWidth={active ? 1.9 : 1.5} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
