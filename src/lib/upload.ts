import { createClient } from "@/lib/supabase/client";

export interface ConfirmPayload {
  mountainId: number;
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

/** prepare → Storage 직접 업로드 → confirm 3단계를 하나로 감싼다. */
export async function uploadAndVerify(file: Blob, payload: ConfirmPayload): Promise<VerifyResult> {
  const prep = await fetch("/api/verify/prepare", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ mountainId: payload.mountainId, contentType: file.type }),
  });
  if (!prep.ok) throw new Error((await prep.json()).error ?? "업로드 준비 실패");
  const { path, token } = (await prep.json()) as { path: string; token: string };

  const supabase = createClient();
  const { error: upErr } = await supabase.storage
    .from("summit-photos")
    .uploadToSignedUrl(path, token, file, { contentType: file.type || "image/jpeg", upsert: true });
  if (upErr) throw new Error("사진 업로드 실패: " + upErr.message);

  const res = await fetch("/api/verify/confirm", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ path, ...payload }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "인증 실패");
  return json as VerifyResult;
}
