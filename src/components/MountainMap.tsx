"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Mountain } from "@/lib/types";
import { distanceM, formatDistance } from "@/lib/geo";
import { stoneProfile } from "@/lib/stones";
import { IconAlert, IconCamera, IconCheck, IconPin } from "@/components/icons";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    kakao: any;
  }
}

const SDK_ID = "kakao-maps-sdk";

/** 카카오맵 SDK 를 한 번만 불러온다. */
function loadKakao(appKey: string): Promise<any> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("no window"));
    if (window.kakao?.maps?.Map) return resolve(window.kakao);

    const existing = document.getElementById(SDK_ID) as HTMLScriptElement | null;
    const onLoad = () => window.kakao.maps.load(() => resolve(window.kakao));
    if (existing) {
      existing.addEventListener("load", onLoad);
      existing.addEventListener("error", () => reject(new Error("sdk error")));
      return;
    }
    const s = document.createElement("script");
    s.id = SDK_ID;
    s.async = true;
    s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false&libraries=clusterer`;
    s.onload = onLoad;
    s.onerror = () => reject(new Error("sdk error"));
    document.head.appendChild(s);
  });
}

/** 정상석 실루엣을 담은 핀을 data URI 로 만든다 (마커 이미지는 CSS 변수를 못 쓴다). */
function pinDataUri(m: Mountain, done: boolean, active: boolean): string {
  const { path } = stoneProfile(m);
  const body = active || done ? "#101010" : "#ffffff";
  const glyph = active || done ? "#ffffff" : "#101010";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="38" viewBox="0 0 30 38">
<path d="M15 37C15 37 28 22.5 28 14A13 13 0 1 0 2 14C2 22.5 15 37 15 37Z" fill="${body}" stroke="#101010" stroke-width="1.6"/>
<g transform="translate(7.5 6.5) scale(0.15)"><path d="${path}" fill="${glyph}" fill-rule="evenodd"/></g></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** 위·경도 양 끝 5%를 떼어낸 목록 (섬 때문에 화면이 넓어지는 것을 막는다) */
function trimOutliers(list: Mountain[]): Mountain[] {
  const q = (vals: number[], p: number) => {
    const s = [...vals].sort((a, b) => a - b);
    return s[Math.min(s.length - 1, Math.floor(s.length * p))];
  };
  const lats = list.map((m) => m.lat);
  const lngs = list.map((m) => m.lng);
  const [latLo, latHi] = [q(lats, 0.05), q(lats, 0.95)];
  const [lngLo, lngHi] = [q(lngs, 0.05), q(lngs, 0.95)];
  const kept = list.filter((m) => m.lat >= latLo && m.lat <= latHi && m.lng >= lngLo && m.lng <= lngHi);
  return kept.length >= 3 ? kept : list;
}

export default function MountainMap({
  mountains,
  doneIds,
  appKey,
}: {
  mountains: Mountain[];
  doneIds: number[];
  appKey?: string;
}) {
  const done = useMemo(() => new Set(doneIds), [doneIds]);
  const regions = useMemo(() => {
    const seen: string[] = [];
    for (const m of mountains) if (!seen.includes(m.region)) seen.push(m.region);
    return seen;
  }, [mountains]);

  const [region, setRegion] = useState<string>("전체");
  const [selected, setSelected] = useState<Mountain | null>(null);
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const boxRef = useRef<HTMLDivElement>(null);
  const kakaoRef = useRef<any>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<number, any>>(new Map());
  const clustererRef = useRef<any>(null);
  const selectedRef = useRef<number | null>(null);

  const visible = useMemo(
    () => (region === "전체" ? mountains : mountains.filter((m) => m.region === region)),
    [mountains, region],
  );

  const paint = useCallback(
    (m: Mountain, active: boolean) => {
      const kakao = kakaoRef.current;
      const marker = markersRef.current.get(m.id);
      if (!kakao || !marker) return;
      const size = active ? new kakao.maps.Size(38, 48) : new kakao.maps.Size(30, 38);
      marker.setImage(
        new kakao.maps.MarkerImage(pinDataUri(m, done.has(m.id), active), size, {
          offset: new kakao.maps.Point(size.width / 2, size.height - 2),
        }),
      );
      marker.setZIndex(active ? 10 : 1);
    },
    [done],
  );

  const select = useCallback(
    (m: Mountain | null) => {
      const prevId = selectedRef.current;
      if (prevId != null) {
        const prev = mountains.find((x) => x.id === prevId);
        if (prev) paint(prev, false);
      }
      selectedRef.current = m?.id ?? null;
      setSelected(m);
      if (!m) return;
      paint(m, true);
      const kakao = kakaoRef.current;
      if (kakao && mapRef.current) mapRef.current.panTo(new kakao.maps.LatLng(m.lat, m.lng));
    },
    [mountains, paint],
  );

  // ---------- 지도 생성 ----------
  useEffect(() => {
    if (!appKey) return;
    let dead = false;
    loadKakao(appKey)
      .then((kakao) => {
        if (dead || !boxRef.current || mapRef.current) return;
        kakaoRef.current = kakao;
        const map = new kakao.maps.Map(boxRef.current, {
          center: new kakao.maps.LatLng(36.4, 127.9),
          level: 12,
        });
        mapRef.current = map;
        map.setZoomable(true);

        clustererRef.current = new kakao.maps.MarkerClusterer({
          map,
          averageCenter: true,
          minLevel: 8,
          disableClickZoom: false,
          styles: [
            {
              width: "36px", height: "36px", background: "#101010", color: "#fff",
              borderRadius: "18px", textAlign: "center", lineHeight: "36px",
              fontSize: "13px", fontWeight: "700",
            },
          ],
        });

        for (const m of mountains) {
          const size = new kakao.maps.Size(30, 38);
          const marker = new kakao.maps.Marker({
            position: new kakao.maps.LatLng(m.lat, m.lng),
            title: m.name,
            image: new kakao.maps.MarkerImage(pinDataUri(m, done.has(m.id), false), size, {
              offset: new kakao.maps.Point(15, 36),
            }),
          });
          kakao.maps.event.addListener(marker, "click", () => select(m));
          markersRef.current.set(m.id, marker);
        }
        clustererRef.current.addMarkers([...markersRef.current.values()]);
        kakao.maps.event.addListener(map, "click", () => select(null));
        setReady(true);
      })
      .catch(() =>
        setErr(
          "지도를 불러오지 못했어요. 카카오 개발자센터에서 ① 카카오맵 제품이 활성화되어 있는지, ② Web 플랫폼에 이 도메인이 등록되어 있는지 확인해 주세요.",
        ),
      );
    return () => {
      dead = true;
    };
    // mountains 는 서버에서 내려온 고정 목록
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appKey]);

  // ---------- 지역 필터: 보이는 마커만 남기고 화면을 맞춘다 ----------
  useEffect(() => {
    const kakao = kakaoRef.current;
    const clusterer = clustererRef.current;
    if (!kakao || !clusterer || !mapRef.current) return;
    clusterer.clear();
    const shown = visible.map((m) => markersRef.current.get(m.id)).filter(Boolean);
    clusterer.addMarkers(shown);
    if (!visible.length) return;

    // 전체 보기에서는 흑산도·울릉도·제주 같은 이상치까지 담으면 화면이 과하게
    // 넓어진다. 5~95 퍼센타일 범위로 본토 중심을 잡는다 (섬은 축소하면 보인다).
    const fitTo = region === "전체" && visible.length > 20 ? trimOutliers(visible) : visible;
    const bounds = new kakao.maps.LatLngBounds();
    for (const m of fitTo) bounds.extend(new kakao.maps.LatLng(m.lat, m.lng));
    mapRef.current.setBounds(bounds, 40, 40, 40, 40);
    if (selectedRef.current && !visible.some((m) => m.id === selectedRef.current)) select(null);
  }, [visible, ready, select, region]);

  function locate() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const here = { lat: p.coords.latitude, lng: p.coords.longitude };
        setGeo(here);
        const kakao = kakaoRef.current;
        if (kakao && mapRef.current) {
          mapRef.current.setLevel(8);
          mapRef.current.panTo(new kakao.maps.LatLng(here.lat, here.lng));
        }
        let best: { m: Mountain; d: number } | null = null;
        for (const m of visible) {
          const d = distanceM(here.lat, here.lng, m.lat, m.lng);
          if (!best || d < best.d) best = { m, d };
        }
        if (best) select(best.m);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  const selectedDist = selected && geo ? distanceM(geo.lat, geo.lng, selected.lat, selected.lng) : null;

  if (!appKey) {
    return (
      <div className="card p-6 text-center">
        <IconAlert size={24} className="mx-auto muted mb-2" />
        <p className="font-semibold mb-1">지도를 표시하려면 카카오맵 키가 필요해요</p>
        <p className="text-sm muted">
          환경변수 <code>NEXT_PUBLIC_KAKAO_MAP_KEY</code> 에 카카오 JavaScript 키를 넣어주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* 지역 필터 */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-4 px-4">
        {["전체", ...regions].map((r) => (
          <button
            key={r}
            onClick={() => setRegion(r)}
            className="shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold border transition"
            style={
              region === r
                ? { background: "var(--fill)", color: "var(--on-fill)", borderColor: "var(--fill)" }
                : { background: "var(--card)", color: "var(--muted)", borderColor: "var(--line)" }
            }
          >
            {r}
            {r !== "전체" && (
              <span className="ml-1 opacity-60">{mountains.filter((m) => m.region === r).length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="relative">
        <div
          ref={boxRef}
          className="w-full rounded-2xl overflow-hidden border border-[color:var(--line)]"
          style={{ height: "calc(100dvh - 14rem)", minHeight: 400, background: "var(--subtle)" }}
        />

        {(!ready || err) && (
          <p className="absolute inset-0 flex items-center justify-center text-sm muted text-center px-8 pointer-events-none">
            {err ?? "지도를 불러오는 중…"}
          </p>
        )}

        <button
          onClick={locate}
          aria-label="내 위치"
          className="absolute top-3 right-3 z-10 w-10 h-10 rounded-full border border-[color:var(--line)] flex items-center justify-center shadow-sm"
          style={{ background: "var(--card)" }}
        >
          <IconPin size={18} />
        </button>

        {selected && (
          <div className="absolute left-2 right-2 bottom-2 z-10 card p-4 shadow-lg" style={{ background: "var(--card)" }}>
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-lg truncate">{selected.name}</h3>
                  {done.has(selected.id) && (
                    <span className="chip chip-solid">
                      <IconCheck size={12} strokeWidth={2.4} /> 인증완료
                    </span>
                  )}
                </div>
                <p className="text-xs muted mt-0.5">
                  {selected.region} {selected.district ?? ""} · 해발 {selected.elevation_m}m
                  {selectedDist != null && ` · 내 위치에서 ${formatDistance(selectedDist)}`}
                </p>
              </div>
              <button className="text-xs muted shrink-0" onClick={() => select(null)}>닫기</button>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <Link href={`/mountains/${selected.slug}`} className="btn btn-ghost">상세보기</Link>
              <Link href={`/verify?m=${selected.slug}`} className="btn btn-primary">
                <IconCamera size={16} /> 인증하기
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
