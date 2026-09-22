"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Mountain } from "@/lib/types";
import { distanceM, formatDistance } from "@/lib/geo";
import { computeFitScore } from "@/lib/fitScore";
import { stoneProfile } from "@/lib/stones";
import { uploadAndVerify, type VerifyResult } from "@/lib/upload";
import StoneOverlay, { OVERLAY_BOX } from "./StoneOverlay";
import { IconAlert, IconCamera, IconCheck, IconPin } from "@/components/icons";

type Geo = { lat: number; lng: number; accuracy: number };

const FIT_THRESHOLD = 0.3;
const MAX_GPS_ACCURACY_M = 80;

export default function LiveCapture({
  mountains,
  preselectSlug,
  onDone,
}: {
  mountains: Mountain[];
  preselectSlug?: string;
  onDone: (r: VerifyResult) => void;
}) {
  const [geo, setGeo] = useState<Geo | null>(null);
  const [geoErr, setGeoErr] = useState<string | null>(null);
  const [camOpen, setCamOpen] = useState(false);
  const [camErr, setCamErr] = useState<string | null>(null);
  const [fit, setFit] = useState(0);
  const [shot, setShot] = useState<{ blob: Blob; url: string; fit: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // ---------- GPS ----------
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setGeoErr("이 브라우저는 위치 정보를 지원하지 않아요.");
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (p) => {
        setGeo({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy });
        setGeoErr(null);
      },
      (e) => {
        setGeoErr(
          e.code === e.PERMISSION_DENIED
            ? "위치 권한이 필요해요. 브라우저 설정에서 위치를 허용해 주세요."
            : "위치를 가져오지 못했어요. 하늘이 트인 곳에서 다시 시도해 주세요.",
        );
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // 현재 위치 기준 가장 가까운 산 + 반경 내 여부
  const nearest = useMemo(() => {
    if (!geo) return null;
    let best: { m: Mountain; d: number } | null = null;
    for (const m of mountains) {
      const d = distanceM(geo.lat, geo.lng, m.lat, m.lng);
      if (!Number.isFinite(d)) continue;
      if (!best || d < best.d) best = { m, d };
    }
    if (!best) return null;
    const allowed = best.m.radius_m + Math.min(geo.accuracy, 50);
    return { ...best, allowed, inRange: best.d <= allowed };
  }, [geo, mountains]);

  // 반경 안이면 그 산, 아니면 선택해 온 산 → 가장 가까운 산 순으로 프레임을 정한다.
  const preselected = mountains.find((m) => m.slug === preselectSlug) ?? null;
  const target = nearest?.inRange ? nearest.m : (preselected ?? nearest?.m ?? null);
  const stone = target ? stoneProfile(target) : null;

  /** 지금 인증이 가능한 상태인지 — 불가하면 사유를 돌려준다. */
  const blockers = useMemo(() => {
    const list: string[] = [];
    if (geoErr) list.push(geoErr);
    else if (!geo) list.push("위치를 아직 못 잡았어요. 하늘이 트인 곳에서 잠시 기다려 주세요.");
    else if (!nearest) list.push("주변에서 등록된 산을 찾지 못했어요.");
    else if (!nearest.inRange)
      list.push(
        `${nearest.m.name} 정상에서 ${formatDistance(nearest.d)} 떨어져 있어요. 인증은 정상 ${nearest.allowed}m 이내에서만 됩니다.`,
      );
    else if (geo.accuracy > MAX_GPS_ACCURACY_M)
      list.push(`GPS 정확도가 낮아요 (±${Math.round(geo.accuracy)}m). 하늘이 잘 보이는 곳에서 잠시 기다려 주세요.`);
    return list;
  }, [geo, geoErr, nearest]);

  // ---------- Camera ----------
  async function openCamera() {
    setCamErr(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      setCamOpen(true);
    } catch {
      setCamErr("카메라를 열 수 없어요. 카메라 권한을 허용했는지 확인해 주세요. (카카오톡 인앱 브라우저라면 Safari/Chrome 으로 열어주세요)");
    }
  }

  useEffect(() => {
    if (camOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [camOpen]);

  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), []);

  // 정합 점수 루프 (~6fps) — 촬영을 막는 용도가 아니라 프레임 안내용이다.
  useEffect(() => {
    if (!camOpen || shot || !stone) return;
    let raf = 0;
    let last = 0;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (t - last < 160) return;
      last = t;
      const v = videoRef.current;
      if (!v || v.readyState < 2) return;
      setFit(computeFitScore(v, stone.path, OVERLAY_BOX));
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [camOpen, shot, stone]);

  function capture() {
    const v = videoRef.current;
    if (!v) return;
    const maxSide = 1600;
    const scale = Math.min(1, maxSide / Math.max(v.videoWidth, v.videoHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(v.videoWidth * scale);
    c.height = Math.round(v.videoHeight * scale);
    c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height);
    c.toBlob(
      (blob) => {
        if (!blob) return;
        setShot({ blob, url: URL.createObjectURL(blob), fit });
        streamRef.current?.getTracks().forEach((t) => t.stop());
      },
      "image/jpeg",
      0.86,
    );
  }

  function retake() {
    if (shot) URL.revokeObjectURL(shot.url);
    setShot(null);
    setCamOpen(false);
    setFit(0);
    openCamera();
  }

  async function submit() {
    if (!shot || !geo || !target) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await uploadAndVerify(shot.blob, {
        mountainId: target.id,
        method: "live",
        lat: geo.lat,
        lng: geo.lng,
        accuracy: geo.accuracy,
        fitScore: shot.fit,
      });
      onDone(r);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // ---------- 촬영 후 확인 ----------
  if (shot) {
    const fitLow = shot.fit < FIT_THRESHOLD;
    const canSubmit = blockers.length === 0 && !fitLow;
    return (
      <div>
        <div className="relative aspect-[3/4] rounded-2xl overflow-hidden card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={shot.url} alt="촬영한 정상석" className="w-full h-full object-cover" />
        </div>

        <p className="text-center mt-3 font-semibold">{target?.name ?? "위치 확인 중"}</p>
        <p className="text-center text-xs muted mb-3">
          {nearest ? `정상에서 ${formatDistance(nearest.d)} · ` : ""}
          GPS ±{Math.round(geo?.accuracy ?? 0)}m · 정합 {Math.round(shot.fit * 100)}%
        </p>

        {/* 촬영은 자유롭게 하고, 인증이 안 되는 이유는 여기서 알려준다 */}
        {(blockers.length > 0 || fitLow) && (
          <div className="card p-3 mb-3 flex gap-2 text-sm" style={{ borderColor: "var(--ink)" }}>
            <IconAlert size={18} className="shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              {blockers.map((b) => (
                <p key={b}>{b}</p>
              ))}
              {fitLow && <p>정상석이 프레임에 잘 잡히지 않았어요. 실루엣에 맞춰 다시 찍어주세요.</p>}
              {blockers.length > 0 && (
                <p className="muted text-xs">
                  이 사진은 나중에 「예전 사진으로」 탭에서 위치 정보가 남아있는 원본으로 인증할 수 있어요.
                </p>
              )}
            </div>
          </div>
        )}

        {err && <p className="text-sm font-medium text-center mb-3">{err}</p>}

        <div className="grid grid-cols-2 gap-2">
          <button className="btn btn-ghost" onClick={retake} disabled={busy}>다시 찍기</button>
          <button className="btn btn-primary" onClick={submit} disabled={!canSubmit || busy}>
            {busy ? "인증 중…" : "인증 완료"}
          </button>
        </div>
      </div>
    );
  }

  // ---------- 촬영 화면 ----------
  if (camOpen && stone && target) {
    const ok = blockers.length === 0;
    return (
      <div>
        <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-black">
          <video ref={videoRef} playsInline muted className="absolute inset-0 w-full h-full object-cover" />
          <StoneOverlay path={stone.path} fit={fit} />
          <div className="absolute top-3 inset-x-3 flex justify-between gap-2 text-white text-xs">
            <span className="px-2 py-1 rounded-full bg-black/55 truncate">{target.name}</span>
            <span className="px-2 py-1 rounded-full bg-black/55 shrink-0">정합 {Math.round(fit * 100)}%</span>
          </div>
          <div className="absolute bottom-3 inset-x-3 text-center">
            {/* 위치가 안 맞아도 촬영은 막지 않고 상태만 알려준다 */}
            <p className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 text-white text-xs font-semibold">
              {ok ? <IconCheck size={14} strokeWidth={2.2} /> : <IconPin size={14} />}
              {ok
                ? "인증 가능한 위치예요"
                : nearest && !nearest.inRange
                  ? `정상에서 ${formatDistance(nearest.d)} · 여기서는 인증되지 않아요`
                  : "위치 확인 중"}
            </p>
            <p className="mt-2 text-white text-[11px] leading-snug drop-shadow px-2">{stone.hint}</p>
          </div>
        </div>
        <div className="flex justify-center mt-4">
          <button
            aria-label="촬영"
            onClick={capture}
            className="rounded-full border-4 transition"
            style={{ width: 72, height: 72, borderColor: "var(--line)", background: "var(--ink)" }}
          />
        </div>
        <button className="btn btn-ghost w-full mt-3" onClick={() => { streamRef.current?.getTracks().forEach((t) => t.stop()); setCamOpen(false); }}>
          닫기
        </button>
      </div>
    );
  }

  // ---------- 시작 화면 ----------
  return (
    <div className="flex flex-col gap-3">
      <div className="card p-4">
        <p className="text-xs muted mb-1">현재 위치</p>
        {geoErr ? (
          <p className="text-sm font-medium">{geoErr}</p>
        ) : !geo ? (
          <p className="text-sm muted">GPS 수신 중…</p>
        ) : nearest ? (
          <>
            <p className="font-bold text-lg flex items-center gap-1.5">
              {nearest.inRange ? <IconCheck size={18} strokeWidth={2.1} /> : <IconPin size={18} className="muted" />}
              {nearest.m.name}
            </p>
            <p className="text-sm muted">
              정상에서 {formatDistance(nearest.d)} · GPS ±{Math.round(geo.accuracy)}m
              {!nearest.inRange && ` · 인증은 ${nearest.allowed}m 이내에서 가능`}
            </p>
          </>
        ) : null}
      </div>

      {camErr && <p className="text-sm font-medium px-1">{camErr}</p>}

      {/* 위치와 무관하게 카메라는 열린다. 인증 가능 여부는 촬영 후 알려준다. */}
      <button className="btn btn-primary" onClick={openCamera} disabled={!target}>
        <IconCamera size={18} /> {target ? "정상석 촬영하기" : "주변 산을 찾는 중…"}
      </button>

      {target && blockers.length > 0 && (
        <p className="text-xs muted text-center px-2">
          지금은 인증 가능한 위치가 아니지만, 촬영해 보면서 프레임을 미리 맞춰볼 수 있어요.
        </p>
      )}

      <p className="text-xs muted text-center">
        정상석 촬영이 어려운 곳이라면 「예전 사진으로」 탭에서 위치 정보가 남아있는 사진으로 인증하세요.
      </p>
    </div>
  );
}
