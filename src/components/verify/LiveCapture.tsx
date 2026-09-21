"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Mountain } from "@/lib/types";
import { distanceM, formatDistance } from "@/lib/geo";
import { computeFitScore } from "@/lib/fitScore";
import { uploadAndVerify, type VerifyResult } from "@/lib/upload";
import StoneOverlay, { OVERLAY_BOX } from "./StoneOverlay";

type Geo = { lat: number; lng: number; accuracy: number };

const FIT_THRESHOLD = 0.3;
const FIT_HOLD_MS = 700; // 이 시간 동안 연속으로 맞아야 셔터 활성화

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
  const [fitReady, setFitReady] = useState(false);
  const [shot, setShot] = useState<{ blob: Blob; url: string; fit: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fitSinceRef = useRef<number | null>(null);

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
      if (!best || d < best.d) best = { m, d };
    }
    if (!best) return null;
    const allowed = best.m.radius_m + Math.min(geo.accuracy, 50);
    return { ...best, allowed, inRange: best.d <= allowed };
  }, [geo, mountains]);

  const target = nearest?.inRange ? nearest.m : (mountains.find((m) => m.slug === preselectSlug) ?? nearest?.m ?? null);

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

  // 정합 점수 루프 (~6fps)
  useEffect(() => {
    if (!camOpen || shot || !target) return;
    let raf = 0;
    let last = 0;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (t - last < 160) return;
      last = t;
      const v = videoRef.current;
      if (!v || v.readyState < 2) return;
      const s = computeFitScore(v, target.stone_shape, OVERLAY_BOX);
      setFit(s);
      if (s >= FIT_THRESHOLD) {
        fitSinceRef.current ??= t;
        setFitReady(t - fitSinceRef.current >= FIT_HOLD_MS);
      } else {
        fitSinceRef.current = null;
        setFitReady(false);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [camOpen, shot, target]);

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
    setFitReady(false);
    fitSinceRef.current = null;
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

  // ---------- Render ----------
  if (shot && target) {
    return (
      <div>
        <div className="relative aspect-[3/4] rounded-2xl overflow-hidden card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={shot.url} alt="촬영한 정상석" className="w-full h-full object-cover" />
        </div>
        <p className="text-center mt-3 font-semibold">{target.name}</p>
        <p className="text-center text-xs muted mb-4">
          정상에서 {formatDistance(nearest?.d ?? 0)} · GPS ±{Math.round(geo?.accuracy ?? 0)}m · 정합 {Math.round(shot.fit * 100)}%
        </p>
        {err && <p className="text-sm text-red-600 text-center mb-3">{err}</p>}
        <div className="grid grid-cols-2 gap-2">
          <button className="btn btn-ghost" onClick={retake} disabled={busy}>다시 찍기</button>
          <button className="btn btn-primary" onClick={submit} disabled={busy}>{busy ? "인증 중…" : "인증 완료"}</button>
        </div>
      </div>
    );
  }

  if (camOpen && target) {
    return (
      <div>
        <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-black">
          <video ref={videoRef} playsInline muted className="absolute inset-0 w-full h-full object-cover" />
          <StoneOverlay shape={target.stone_shape} fit={fit} />
          <div className="absolute top-3 inset-x-3 flex justify-between text-white text-xs">
            <span className="px-2 py-1 rounded-full bg-black/50">{target.name}</span>
            <span className="px-2 py-1 rounded-full bg-black/50">정합 {Math.round(fit * 100)}%</span>
          </div>
          <p className="absolute bottom-3 inset-x-3 text-center text-white text-sm font-semibold drop-shadow">
            {fitReady ? "좋아요! 지금 촬영하세요" : "정상석을 실루엣 안에 맞춰주세요"}
          </p>
        </div>
        <div className="flex justify-center mt-4">
          <button
            aria-label="촬영"
            onClick={capture}
            disabled={!fitReady}
            className="w-18 h-18 rounded-full border-4 transition"
            style={{
              width: 72, height: 72,
              borderColor: fitReady ? "var(--forest)" : "var(--line)",
              background: fitReady ? "var(--forest)" : "var(--card)",
              opacity: fitReady ? 1 : 0.6,
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="card p-4">
        <p className="text-xs muted mb-1">현재 위치</p>
        {geoErr ? (
          <p className="text-sm text-red-600">{geoErr}</p>
        ) : !geo ? (
          <p className="text-sm muted">GPS 수신 중… 📡</p>
        ) : nearest ? (
          <>
            <p className="font-bold text-lg">
              {nearest.inRange ? "✅ " : "📍 "}
              {nearest.m.name}
            </p>
            <p className="text-sm muted">
              정상에서 {formatDistance(nearest.d)} · GPS ±{Math.round(geo.accuracy)}m
              {!nearest.inRange && ` · 인증은 ${nearest.allowed}m 이내에서 가능`}
            </p>
          </>
        ) : null}
      </div>

      {geo && nearest && !nearest.inRange && geo.accuracy > 80 && (
        <p className="text-xs muted px-1">GPS 정확도가 낮아요. 하늘이 잘 보이는 곳에서 잠시 기다리면 개선됩니다.</p>
      )}

      {camErr && <p className="text-sm text-red-600 px-1">{camErr}</p>}

      <button className="btn btn-primary" disabled={!nearest?.inRange} onClick={openCamera}>
        {nearest?.inRange ? "📸 정상석 촬영하기" : "정상 반경 안에서만 촬영할 수 있어요"}
      </button>

      <p className="text-xs muted text-center">
        정상석 촬영이 어려운 곳이라면 「예전 사진으로」 탭에서 위치 정보가 남아있는 사진으로 인증하세요.
      </p>
    </div>
  );
}
