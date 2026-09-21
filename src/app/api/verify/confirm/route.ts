import { NextResponse } from "next/server";
import exifr from "exifr";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { distanceM } from "@/lib/geo";
import type { Mountain } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

interface ConfirmBody {
  path: string;
  /** exif 인증에서는 생략 가능 — 서버가 EXIF 좌표로 가장 가까운 산을 고른다. */
  mountainId?: number;
  /** 표시 전용 JPEG 사본 경로 (검증에는 쓰지 않음) */
  displayPath?: string;
  method: "live" | "exif";
  /** live 인증 시 클라이언트 GPS */
  lat?: number;
  lng?: number;
  accuracy?: number;
  /** 정상석 실루엣 정합 점수 (0~1) */
  fitScore?: number;
}

const MAX_GPS_ACCURACY_M = 80;   // 이보다 부정확한 GPS 는 거부
const MIN_FIT_SCORE = 0.3;       // 오버레이 정합 최소치 (휴리스틱)
const EXIF_RADIUS_MULTIPLIER = 1.5; // 과거 사진은 GPS 오차 여유를 조금 더 준다

/**
 * 2단계: 업로드된 사진을 검증하고 인증 레코드를 생성.
 * - live : 클라이언트 GPS 좌표가 정상 반경 안인지 + 정확도 + 정합 점수 확인
 * - exif : 서버에서 원본 EXIF 를 직접 파싱해 GPS 가 정상 반경 안인지 확인 (클라이언트 값 신뢰 안 함)
 * 실패 시 업로드된 파일을 삭제한다.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = (await req.json()) as ConfirmBody;
  const admin = createAdminClient();

  // 경로 소유권 확인: 남의 폴더에 올린 파일로 인증 시도 방지
  if (!body.path?.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "잘못된 파일 경로" }, { status: 400 });
  }

  // 표시 사본은 사용자 폴더 안, 원본 경로 기반이어야 한다 (임의 경로 삭제 방지)
  const displayPath = body.displayPath === `${body.path}.jpg` ? body.displayPath : undefined;

  const fail = async (msg: string, status = 422) => {
    await admin.storage.from("summit-photos").remove(displayPath ? [body.path, displayPath] : [body.path]);
    return NextResponse.json({ error: msg }, { status });
  };

  let mountain: Mountain | null = null;
  if (body.mountainId) {
    const { data: m } = await admin.from("mountains").select("*").eq("id", body.mountainId).single();
    if (!m) return fail("존재하지 않는 산입니다.", 404);
    mountain = m as Mountain;
  } else if (body.method === "live") {
    return fail("산이 지정되지 않았습니다.");
  }

  let lat: number, lng: number, takenAt: string | null = null;

  if (body.method === "live") {
    if (typeof body.lat !== "number" || typeof body.lng !== "number") return fail("위치 정보가 없습니다.");
    if ((body.accuracy ?? 999) > MAX_GPS_ACCURACY_M) {
      return fail(`GPS 정확도가 낮습니다 (±${Math.round(body.accuracy ?? 0)}m). 하늘이 트인 곳에서 다시 시도해 주세요.`);
    }
    if ((body.fitScore ?? 0) < MIN_FIT_SCORE) return fail("정상석이 실루엣에 맞지 않았어요. 다시 맞춰서 촬영해 주세요.");
    lat = body.lat;
    lng = body.lng;
    takenAt = new Date().toISOString();
  } else {
    // 원본 다운로드 후 EXIF 파싱
    const { data: blob, error } = await admin.storage.from("summit-photos").download(body.path);
    if (error || !blob) return fail("업로드된 사진을 읽을 수 없습니다.", 500);
    const buf = Buffer.from(await blob.arrayBuffer());

    let gps: { latitude: number; longitude: number } | undefined;
    let exif: Record<string, unknown> | undefined;
    try {
      gps = await exifr.gps(buf);
      exif = (await exifr.parse(buf, ["DateTimeOriginal", "CreateDate"])) ?? undefined;
    } catch {
      /* 파싱 실패는 아래에서 처리 */
    }
    if (!gps || !Number.isFinite(gps.latitude) || !Number.isFinite(gps.longitude)) {
      return fail("사진에 위치 정보(GPS EXIF)가 없어요. 카카오톡·인스타로 받은 사진은 위치가 지워져 있어 인증할 수 없습니다.");
    }
    lat = gps.latitude;
    lng = gps.longitude;
    const dt = (exif?.DateTimeOriginal ?? exif?.CreateDate) as Date | string | undefined;
    if (dt) {
      const d = new Date(dt);
      if (!Number.isNaN(d.getTime())) takenAt = d.toISOString();
    }

    // 클라이언트가 산을 특정하지 못한 경우(HEIC 등 브라우저 파싱 실패) 서버가 고른다.
    if (!mountain) {
      const { data: all } = await admin.from("mountains").select("*");
      let best: { m: Mountain; d: number } | null = null;
      for (const cand of (all ?? []) as Mountain[]) {
        const d = distanceM(lat, lng, cand.lat, cand.lng);
        if (!Number.isFinite(d)) continue;
        if (!best || d < best.d) best = { m: cand, d };
      }
      if (!best) return fail("등록된 산이 없습니다.", 500);
      mountain = best.m;
    }
  }

  if (!mountain) return fail("산을 특정하지 못했습니다.");

  const dist = distanceM(lat, lng, mountain.lat, mountain.lng);
  const allowed = body.method === "live"
    ? mountain.radius_m + Math.min(body.accuracy ?? 0, 50)
    : mountain.radius_m * EXIF_RADIUS_MULTIPLIER;

  if (dist > allowed) {
    return fail(`${mountain.name} 정상에서 ${Math.round(dist)}m 떨어져 있어요 (허용 ${Math.round(allowed)}m).`);
  }

  // 기존 인증이 있으면 사진 교체 (unique(user_id, mountain_id))
  const { data: prev } = await admin
    .from("summits")
    .select("photo_path")
    .eq("user_id", user.id)
    .eq("mountain_id", mountain.id)
    .maybeSingle();

  const { error: upsertErr } = await admin.from("summits").upsert(
    {
      user_id: user.id,
      mountain_id: mountain.id,
      photo_path: body.path,
      method: body.method,
      lat,
      lng,
      distance_m: dist,
      taken_at: takenAt,
    },
    { onConflict: "user_id,mountain_id" }
  );
  if (upsertErr) return fail("인증 저장 실패: " + upsertErr.message, 500);

  if (prev?.photo_path && prev.photo_path !== body.path) {
    await admin.storage.from("summit-photos").remove([prev.photo_path, `${prev.photo_path}.jpg`]);
  }

  return NextResponse.json({
    ok: true,
    mountain: { id: mountain.id, name: mountain.name, slug: mountain.slug },
    distance_m: Math.round(dist),
    replaced: !!prev,
  });
}
