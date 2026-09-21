import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "./SignOutButton";

export default async function Nav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <header className="sticky top-0 z-20 backdrop-blur bg-[color:var(--bg)]/85 border-b border-[color:var(--line)]">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="font-bold text-lg tracking-tight flex items-center gap-2">
            <span aria-hidden>⛰️</span> 정상석
          </Link>
          {user ? (
            <SignOutButton />
          ) : (
            <Link href="/login" className="text-sm font-semibold" style={{ color: "var(--forest)" }}>
              로그인
            </Link>
          )}
        </div>
      </header>

      {/* 하단 탭바 */}
      <nav className="fixed bottom-0 inset-x-0 z-20 border-t border-[color:var(--line)] bg-[color:var(--card)]">
        <div className="max-w-md mx-auto grid grid-cols-4 h-16 text-xs font-semibold">
          <Tab href="/" icon="🗺️" label="산 목록" />
          <Tab href="/verify" icon="📸" label="정상인증" />
          <Tab href="/ranking" icon="🏆" label="랭킹" />
          <Tab href="/me" icon="👤" label="마이" />
        </div>
      </nav>
    </>
  );
}

function Tab({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link href={href} className="flex flex-col items-center justify-center gap-1 muted hover:opacity-80">
      <span className="text-xl leading-none" aria-hidden>{icon}</span>
      {label}
    </Link>
  );
}
