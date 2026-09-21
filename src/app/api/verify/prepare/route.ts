import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

/**
 * 1단계: 사진 업로드용 서명 URL 발급.
 * 원본(EXIF 포함) 파일이 수 MB 를 넘을 수 있어 서버를 거치지 않고
 * Storage 로 직접 올리게 한다 (Vercel 요청 바디 4.5MB 제한 회피).
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { mountainId, contentType, fileName, wantDisplayCopy } = (await req.json()) as {
    mountainId?: number;
    contentType?: string;
    fileName?: string;
    wantDisplayCopy?: boolean;
  };

  // EXIF 인증은 서버가 좌표로 산을 특정할 수 있으므로 mountainId 가 없어도 받는다.
  let slug = "photo";
  if (mountainId) {
    const { data: mountain } = await supabase.from("mountains").select("slug").eq("id", mountainId).single();
    if (!mountain) return NextResponse.json({ error: "존재하지 않는 산" }, { status: 404 });
    slug = mountain.slug;
  }

  const path = `${user.id}/${slug}-${Date.now()}.${extFor(contentType, fileName)}`;

  const admin = createAdminClient();
  const { data, error } = await admin.storage.from("summit-photos").createSignedUploadUrl(path);
  if (error || !data) return NextResponse.json({ error: error?.message ?? "업로드 URL 발급 실패" }, { status: 500 });

  // 브라우저가 표시할 수 없는 포맷(HEIC 등)일 때 쓰는 표시 전용 JPEG 사본.
  // 검증에는 절대 쓰지 않고 갤러리 렌더링에만 사용한다.
  let display: { path: string; token: string } | null = null;
  if (wantDisplayCopy) {
    const displayPath = `${path}.jpg`;
    const { data: d } = await admin.storage.from("summit-photos").createSignedUploadUrl(displayPath);
    if (d) display = { path: displayPath, token: d.token };
  }

  return NextResponse.json({ path, token: data.token, displayPath: display?.path, displayToken: display?.token });
}

/** 확장자는 content-type 우선, 없으면 파일명에서 추론한다. */
function extFor(contentType?: string, fileName?: string): string {
  const t = (contentType ?? "").toLowerCase();
  if (t === "image/png") return "png";
  if (t === "image/webp") return "webp";
  if (t === "image/heic" || t === "image/heif") return "heic";
  if (t === "image/jpeg" || t === "image/jpg") return "jpg";

  const n = (fileName ?? "").toLowerCase();
  const m = n.match(/\.(png|webp|heic|heif|jpe?g)$/);
  if (m) return m[1] === "heif" ? "heic" : m[1] === "jpeg" ? "jpg" : m[1];
  return "jpg";
}
