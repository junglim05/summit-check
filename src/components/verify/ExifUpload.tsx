"use client";

import { useState } from "react";
import exifr from "exifr";
import type { Mountain } from "@/lib/types";
import { distanceM, formatDistance } from "@/lib/geo";
import { uploadAndVerify, type VerifyResult } from "@/lib/upload";

interface Parsed {
  file: File;
  url: string;
  lat: number;
  lng: number;
  takenAt: Date | null;
  match: { m: Mountain; d: number; ok: boolean } | null;
}

const EXIF_RADIUS_MULTIPLIER = 1.5;

export default function ExifUpload({ mountains, onDone }: { mountains: Mountain[]; onDone: (r: VerifyResult) => void }) {
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErr(null);
    setParsed(null);

    let gps: { latitude: number; longitude: number } | undefined;
    let dt: Date | null = null;
    try {
      gps = await exifr.gps(file);
      const ex = await exifr.parse(file, ["DateTimeOriginal", "CreateDate"]);
      const raw = ex?.DateTimeOriginal ?? ex?.CreateDate;
      if (raw) dt = new Date(raw);
    } catch {
      /* 아래에서 처리 */
    }

    if (!gps) {
      setErr("이 사진에는 위치 정보가 없어요. 갤러리 원본을 선택했는지 확인해 주세요. 메신저로 받은 사진은 위치가 지워져 있습니다.");
      return;
    }

    let best: { m: Mountain; d: number } | null = null;
    for (const m of mountains) {
      const d = distanceM(gps.latitude, gps.longitude, m.lat, m.lng);
      if (!best || d < best.d) best = { m, d };
    }
    const match = best ? { ...best, ok: best.d <= best.m.radius_m * EXIF_RADIUS_MULTIPLIER } : null;

    setParsed({ file, url: URL.createObjectURL(file), lat: gps.latitude, lng: gps.longitude, takenAt: dt, match });
  }

  async function submit() {
    if (!parsed?.match?.ok) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await uploadAndVerify(parsed.file, { mountainId: parsed.match.m.id, method: "exif" });
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
        🖼️ 사진 선택
        <input type="file" accept="image/*" className="hidden" onChange={onPick} />
      </label>

      {err && <p className="text-sm text-red-600 px-1">{err}</p>}

      {parsed && (
        <div className="card overflow-hidden">
          <div className="aspect-[4/3] bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={parsed.url} alt="선택한 사진" className="w-full h-full object-contain" />
          </div>
          <div className="p-4">
            {parsed.match ? (
              <>
                <p className="font-bold text-lg">
                  {parsed.match.ok ? "✅ " : "❌ "}
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
              <p className="text-sm muted">등록된 산과 매칭되지 않았어요.</p>
            )}
            <button className="btn btn-primary w-full mt-4" disabled={!parsed.match?.ok || busy} onClick={submit}>
              {busy ? "인증 중…" : "이 사진으로 인증하기"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
