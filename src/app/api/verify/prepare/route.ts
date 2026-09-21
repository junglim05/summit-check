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

  const { mountainId, contentType } = (await req.json()) as { mountainId: number; contentType?: string };
  if (!mountainId) return NextResponse.json({ error: "mountainId 누락" }, { status: 400 });

  const { data: mountain } = await supabase.from("mountains").select("slug").eq("id", mountainId).single();
  if (!mountain) return NextResponse.json({ error: "존재하지 않는 산" }, { status: 404 });

  const ext = contentType === "image/png" ? "png" : contentType === "image/heic" ? "heic" : "jpg";
  const path = `${user.id}/${mountain.slug}-${Date.now()}.${ext}`;

  const admin = createAdminClient();
  const { data, error } = await admin.storage.from("summit-photos").createSignedUploadUrl(path);
  if (error || !data) return NextResponse.json({ error: error?.message ?? "업로드 URL 발급 실패" }, { status: 500 });

  return NextResponse.json({ path, token: data.token });
}
