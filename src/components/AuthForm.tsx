"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/me";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    const supabase = createClient();

    if (mode === "signup") {
      if (nickname.trim().length < 2) {
        setError("닉네임은 2자 이상이어야 합니다.");
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { nickname: nickname.trim() },
          emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      setLoading(false);
      if (error) return setError(translate(error.message));
      // 이메일 확인이 켜져 있으면 session 이 null
      if (!data.session) {
        setInfo("가입 확인 메일을 보냈어요. 메일의 링크를 눌러 인증을 완료해 주세요.");
        return;
      }
      router.push(next);
      router.refresh();
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setError(translate(error.message));
    router.push(next);
    router.refresh();
  }

  return (
    <div className="pt-8">
      <h1 className="text-2xl font-bold mb-1">{mode === "login" ? "로그인" : "회원가입"}</h1>
      <p className="muted text-sm mb-6">
        {mode === "login" ? "정상석 컬렉션을 이어서 채워보세요." : "서울·경기 28개 산, 정상에서 만나요."}
      </p>

      <form onSubmit={onSubmit} className="card p-5 flex flex-col gap-3">
        {mode === "signup" && (
          <input
            className="input"
            placeholder="닉네임 (2~16자)"
            value={nickname}
            maxLength={16}
            onChange={(e) => setNickname(e.target.value)}
            required
          />
        )}
        <input
          className="input"
          type="email"
          placeholder="이메일"
          value={email}
          autoComplete="email"
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="input"
          type="password"
          placeholder="비밀번호 (6자 이상)"
          value={password}
          minLength={6}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {info && <p className="text-sm" style={{ color: "var(--forest)" }}>{info}</p>}
        <button className="btn btn-primary mt-1" disabled={loading}>
          {loading ? "처리 중…" : mode === "login" ? "로그인" : "가입하기"}
        </button>
      </form>

      <p className="text-sm muted text-center mt-5">
        {mode === "login" ? (
          <>
            아직 계정이 없나요?{" "}
            <Link href={`/signup?next=${encodeURIComponent(next)}`} className="font-semibold" style={{ color: "var(--forest)" }}>
              회원가입
            </Link>
          </>
        ) : (
          <>
            이미 계정이 있나요?{" "}
            <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-semibold" style={{ color: "var(--forest)" }}>
              로그인
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

function translate(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return "이메일 또는 비밀번호가 올바르지 않습니다.";
  if (/already registered/i.test(msg)) return "이미 가입된 이메일입니다.";
  if (/password should be at least/i.test(msg)) return "비밀번호는 6자 이상이어야 합니다.";
  if (/email not confirmed/i.test(msg)) return "이메일 인증이 완료되지 않았습니다. 메일함을 확인해 주세요.";
  if (/rate limit/i.test(msg)) return "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.";
  return msg;
}
