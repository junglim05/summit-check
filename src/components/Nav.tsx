import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth";
import SignOutButton from "./SignOutButton";
import TabBar from "./TabBar";
import { Wordmark } from "./icons";

export default async function Nav() {
  const user = await getAuthUser(await createClient());

  return (
    <>
      <header className="sticky top-0 z-20 backdrop-blur bg-[color:var(--bg)]/85 border-b border-[color:var(--line)]">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" aria-label="하이피크 홈">
            <Wordmark size={22} />
          </Link>
          {user ? (
            <SignOutButton />
          ) : (
            <Link href="/login" className="text-sm font-semibold">
              로그인
            </Link>
          )}
        </div>
      </header>

      <TabBar />
    </>
  );
}
