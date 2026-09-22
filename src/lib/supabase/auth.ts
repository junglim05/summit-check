import type { SupabaseClient } from "@supabase/supabase-js";

export interface AuthUser {
  id: string;
  email: string | null;
}

/**
 * 로그인 사용자를 얻는다. `getUser()` 는 호출마다 Auth 서버로 왕복하지만
 * `getClaims()` 는 액세스 토큰을 ES256 로 **로컬 검증**한다 (검증용 JWKS 는
 * auth-js 가 프로세스 전역에 10분간 캐시). 서명을 암호학적으로 검증하므로
 * 쿠키를 신뢰하는 `getSession()` 과 달리 서버에서 안전하다.
 *
 * id·email 만 필요한 곳(대부분)에서는 이걸 쓰고, 전체 프로필이 필요할 때만
 * `getUser()` 를 쓴다.
 */
export async function getAuthUser(supabase: SupabaseClient): Promise<AuthUser | null> {
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return null;
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null };
}
