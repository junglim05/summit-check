"use client";

import "leaflet/dist/leaflet.css";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Map as LeafletMap, Marker } from "leaflet";
import type { Mountain } from "@/lib/types";
import { distanceM, formatDistance } from "@/lib/geo";
import { stoneProfile } from "@/lib/stones";
import { IconCamera, IconCheck, IconPin } from "@/components/icons";

/** 지도에서 산을 찾아 바로 인증으로 넘어가는 화면. */
export default function MountainMap({
  mountains,
  doneIds,
}: {
  mountains: Mountain[];
  doneIds: number[];
}) {
  const done = useMemo(() => new Set(doneIds), [doneIds]);
  const [selected, setSelected] = useState<Mountain | null>(null);
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [ready, setReady] = useState(false);

  const boxRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<Map<number, Marker>>(new Map());
  const selectedRef = useRef<number | null>(null);

  // ---------- 지도 초기화 ----------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !boxRef.current || mapRef.current) return;

      const map = L.map(boxRef.current, {
        center: [36.5, 127.8],
        zoom: 7,
        zoomControl: false,
        attributionControl: true,
      });
      mapRef.current = map;

      // OSM 기본 타일(키 불필요). 색은 CSS 필터로 빼서 서비스의 무채색 결에 맞춘다.
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);
      L.control.zoom({ position: "bottomright" }).addTo(map);

      for (const m of mountains) {
        const marker = L.marker([m.lat, m.lng], {
          icon: L.divIcon({
            className: "",
            html: pinHtml(m, done.has(m.id), false),
            iconSize: [30, 38],
            iconAnchor: [15, 36],
          }),
          title: m.name,
        }).addTo(map);
        marker.on("click", () => select(m));
        markersRef.current.set(m.id, marker);
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
    // mountains 는 서버에서 내려온 고정 목록이라 재생성하지 않는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 선택 표시를 마커에 반영 */
  async function select(m: Mountain | null) {
    const L = (await import("leaflet")).default;
    const prev = selectedRef.current;
    if (prev != null) {
      const pm = markersRef.current.get(prev);
      const pmt = mountains.find((x) => x.id === prev);
      if (pm && pmt)
        pm.setIcon(L.divIcon({ className: "", html: pinHtml(pmt, done.has(pmt.id), false), iconSize: [30, 38], iconAnchor: [15, 36] }));
    }
    selectedRef.current = m?.id ?? null;
    setSelected(m);
    if (!m) return;
    const mk = markersRef.current.get(m.id);
    if (mk) {
      mk.setIcon(L.divIcon({ className: "", html: pinHtml(m, done.has(m.id), true), iconSize: [38, 48], iconAnchor: [19, 46] }));
      mk.setZIndexOffset(1000);
    }
    mapRef.current?.panTo([m.lat, m.lng], { animate: true });
  }

  /** 내 위치로 이동 + 가장 가까운 산 선택 */
  function locate() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const here = { lat: p.coords.latitude, lng: p.coords.longitude };
        setGeo(here);
        mapRef.current?.setView([here.lat, here.lng], 11, { animate: true });
        let best: { m: Mountain; d: number } | null = null;
        for (const m of mountains) {
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

  return (
    <div className="relative">
      <div
        ref={boxRef}
        className="map-mono w-full rounded-2xl overflow-hidden border border-[color:var(--line)]"
        style={{ height: "calc(100dvh - 11.5rem)", minHeight: 420, background: "var(--subtle)" }}
        onClick={(e) => {
          // 지도 빈 곳을 누르면 선택 해제 (마커 클릭은 위에서 처리)
          if ((e.target as HTMLElement).classList.contains("leaflet-container")) select(null);
        }}
      />

      {!ready && (
        <p className="absolute inset-0 flex items-center justify-center text-sm muted pointer-events-none">
          지도를 불러오는 중…
        </p>
      )}

      <button
        onClick={locate}
        aria-label="내 위치"
        className="absolute top-3 right-3 z-[1000] w-10 h-10 rounded-full border border-[color:var(--line)] flex items-center justify-center shadow-sm"
        style={{ background: "var(--card)" }}
      >
        <IconPin size={18} />
      </button>

      {/* 선택한 산 — 하단 시트 */}
      {selected && (
        <div className="absolute left-2 right-2 bottom-2 z-[1000] card p-4 shadow-lg" style={{ background: "var(--card)" }}>
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
            <button className="text-xs muted shrink-0" onClick={() => select(null)} aria-label="닫기">
              닫기
            </button>
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
  );
}

/** 정상석 실루엣을 담은 핀 마커 */
function pinHtml(m: Mountain, done: boolean, active: boolean): string {
  const { path } = stoneProfile(m);
  const w = active ? 38 : 30;
  const h = active ? 48 : 38;
  const fill = done || active ? "var(--ink)" : "var(--card)";
  const stroke = "var(--ink)";
  const glyph = done || active ? "var(--on-fill)" : "var(--ink)";
  return `<svg width="${w}" height="${h}" viewBox="0 0 30 38" aria-hidden>
    <path d="M15 37 C15 37 28 22.5 28 14 A13 13 0 1 0 2 14 C2 22.5 15 37 15 37 Z"
          fill="${fill}" stroke="${stroke}" stroke-width="1.6"/>
    <g transform="translate(7.5 6.5) scale(0.15)">
      <path d="${path}" fill="${glyph}" fill-rule="evenodd"/>
    </g>
  </svg>`;
}
