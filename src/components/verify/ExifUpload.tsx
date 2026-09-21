"use client";

import { useState } from "react";
import type { Mountain } from "@/lib/types";
import { distanceM, formatDistance } from "@/lib/geo";
import { uploadAndVerify, type VerifyResult } from "@/lib/upload";
import { readPhotoMeta } from "@/lib/exif";
import { IconAlert, IconCheck, IconImage } from "@/components/icons";

interface Parsed {
  file: File;
  url: string;
  gps: { lat: number; lng: number } | null;
  /** gps 를 못 읽은 이유. 이 경우에도 업로드는 허용하고 서버가 판정한다. */
  reason: "no-gps" | "unreadable" | null;
  takenAt: Date | null;
  match: { m: Mountain; d: number; ok: boolean } | null;
}

const EXIF_RADIUS_MULTIPLIER = 1.5;

export default function ExifUpload({ mountains, onDone }: { mountains: Mountain[]; onDone: (r: VerifyResult) => void }) {
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [previewOk, setPreviewOk] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErr(null);
    setParsed(null);
    setPreviewOk(true); // 일단 그려보고, 디코딩 실패(onError)하면 대체 표시로 내린다

    const { gps, takenAt, reason } = await readPhotoMeta(file);

    let match: Parsed["match"] = null;
    if (gps) {
      let best: { m: Mountain; d: number } | null = null;
      for (const m of mountains) {
        const d = distanceM(gps.lat, gps.lng, m.lat, m.lng);
        if (!Number.isFinite(d)) continue;
        if (!best || d < best.d) best = { m, d };
      }
      if (best) match = { ...best, ok: best.d <= best.m.radius_m * EXIF_RADIUS_MULTIPLIER };
    }

    setParsed({ file, url: URL.createObjectURL(file), gps, reason, takenAt, match });
  }

  /**
   * 반경을 확실히 벗어난 경우에만 막는다.
   * 브라우저가 좌표를 못 읽었을 때(HEIC 등)는 서버가 원본으로 다시 판정하므로 보낸다.
   */
  const blocked = !!parsed?.match && !parsed.match.ok;
  const canSubmit = !!parsed && !blocked;

  async function submit() {
    if (!parsed || !canSubmit) return;
    setBusy(true);
    setErr(null);
    try {
      // 좌표를 못 읽었으면 산을 특정할 수 없으므로 서버에 후보를 맡긴다.
      const r = await uploadAndVerify(parsed.file, {
        mountainId: parsed.match?.m.id,
        method: "exif",
      });
      onDone(r);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="card p-4 text-sm">
        <p className="font-semibold mb-1">예전에 찍은 정상석 사진으로 인증</p>
        <p className="muted text-xs leading-relaxed">
          사진에 남아있는 위치 정보(EXIF GPS)가 정상 반경 안이면 인증됩니다. 서버가 원본 파일의 위치 정보를 직접 확인하므로
          갤러리 <b>원본</b>을 선택해 주세요. 카카오톡·인스타그램 등을 거친 사진은 위치가 지워져 인증할 수 없어요.
        </p>
      </div>

      <label className="btn btn-primary cursor-pointer">
        <IconImage size={18} /> 사진 선택
        <input
          type="file"
          /* image/* 만 두면 일부 브라우저에서 아이폰 HEIC 가 목록에 안 뜬다 */
          accept="image/*,image/heic,image/heif,.heic,.HEIC,.heif,.HEIF"
          className="hidden"
          onChange={onPick}
        />
      </label>

      {err && <p className="text-sm font-medium px-1">{err}</p>}

      {parsed && (
        <div className="card overflow-hidden">
          <div className="aspect-[4/3] flex items-center justify-center" style={{ background: "var(--subtle)" }}>
            {previewOk ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={parsed.url}
                alt="선택한 사진"
                className="w-full h-full object-contain"
                onError={() => setPreviewOk(false)}
              />
            ) : (
              <div className="text-center px-6">
                <IconImage size={28} className="mx-auto muted mb-2" />
                <p className="text-sm font-semibold">{parsed.file.name}</p>
                <p className="text-xs muted mt-1">
                  이 브라우저가 미리보기를 지원하지 않는 형식이에요. 인증에는 문제가 없습니다.
                </p>
              </div>
            )}
          </div>

          <div className="p-4">
            {parsed.match ? (
              <>
                <p className="font-bold text-lg flex items-center gap-1.5">
                  {parsed.match.ok ? <IconCheck size={18} strokeWidth={2.1} /> : <IconAlert size={18} className="muted" />}
                  {parsed.match.m.name}
                </p>
                <p className="text-sm muted">
                  정상에서 {formatDistance(parsed.match.d)}
                  {!parsed.match.ok && ` · 허용 ${Math.round(parsed.match.m.radius_m * EXIF_RADIUS_MULTIPLIER)}m 초과`}
                  {parsed.takenAt && ` · ${parsed.takenAt.toLocaleDateString("ko-KR")} 촬영`}
                </p>
                {!parsed.match.ok && (
                  <p className="text-xs muted mt-2">
                    가장 가까운 산이 {parsed.match.m.name}이지만 정상 반경을 벗어났어요. 정상석 앞에서 찍은 다른 사진을 골라주세요.
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="font-bold text-lg flex items-center gap-1.5">
                  <IconAlert size={18} className="muted" /> 위치 확인 필요
                </p>
                <p className="text-sm muted">
                  {parsed.reason === "no-gps"
                    ? "이 브라우저에서는 사진의 위치 정보를 찾지 못했어요."
                    : "이 브라우저가 사진 형식을 읽지 못했어요."}{" "}
                  그대로 올려서 서버에서 원본으로 다시 확인할 수 있습니다.
                </p>
              </>
            )}

            <button className="btn btn-primary w-full mt-4" disabled={!canSubmit || busy} onClick={submit}>
              {busy ? "인증 중…" : parsed.match?.ok ? "이 사진으로 인증하기" : "서버에서 위치 확인하고 인증"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
