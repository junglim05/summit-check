import { createClient } from "@/lib/supabase/client";
import { isLikelyUndisplayable, makeDisplayJpeg } from "@/lib/exif";

export interface ConfirmPayload {
  /** exif 인증에서는 생략 가능 — 서버가 EXIF 좌표로 산을 특정한다. */
  mountainId?: number;
  method: "live" | "exif";
  lat?: number;
  lng?: number;
  accuracy?: number;
  fitScore?: number;
}

export interface VerifyResult {
  ok: true;
  mountain: { id: number; name: string; slug: string };
  distance_m: number;
  replaced: boolean;
}

interface Prepared {
  path: string;
  token: string;
  displayPath?: string;
  displayToken?: string;
}

/** prepare → Storage 직접 업로드 → confirm 3단계를 하나로 감싼다. */
export async function uploadAndVerify(file: Blob, payload: ConfirmPayload): Promise<VerifyResult> {
  const asFile = file as File;
  // HEIC 등 브라우저가 못 그리는 포맷이면 표시용 JPEG 사본도 함께 올린다.
  // 원본은 손대지 않고 그대로 올려야 서버가 EXIF 로 검증할 수 있다.
  const wantDisplayCopy = typeof asFile.name === "string" && isLikelyUndisplayable(asFile);

  const prep = await fetch("/api/verify/prepare", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      mountainId: payload.mountainId,
      contentType: file.type,
      fileName: asFile.name,
      wantDisplayCopy,
    }),
  });
  if (!prep.ok) throw new Error((await prep.json()).error ?? "업로드 준비 실패");
  const { path, token, displayPath, displayToken } = (await prep.json()) as Prepared;

  const supabase = createClient();
  const { error: upErr } = await supabase.storage
    .from("summit-photos")
    .uploadToSignedUrl(path, token, file, { contentType: file.type || "image/jpeg", upsert: true });
  if (upErr) throw new Error("사진 업로드 실패: " + upErr.message);

  let uploadedDisplayPath: string | undefined;
  if (displayPath && displayToken) {
    const jpeg = await makeDisplayJpeg(asFile);
    if (jpeg) {
      const { error } = await supabase.storage
        .from("summit-photos")
        .uploadToSignedUrl(displayPath, displayToken, jpeg, { contentType: "image/jpeg", upsert: true });
      if (!error) uploadedDisplayPath = displayPath;
    }
  }

  const res = await fetch("/api/verify/confirm", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ path, displayPath: uploadedDisplayPath, ...payload }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "인증 실패");
  return json as VerifyResult;
}
