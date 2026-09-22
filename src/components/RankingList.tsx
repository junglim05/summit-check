"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { RankingRow, Summit } from "@/lib/types";
import SummitPhoto from "@/components/SummitPhoto";
import { IconAlert, IconCheck } from "@/components/icons";

type PickedSummit = Summit & { mountains?: { name: string; slug: string; elevation_m: number } };

export default function RankingList({ rows, meId }: { rows: RankingRow[]; meId?: string }) {
  const [open, setOpen] = useState<RankingRow | null>(null);

  return (
    <>
      <ol className="card divide-y divide-[color:var(--line)]">
        {rows.map((r) => (
          <li key={r.user_id}>
            <button
              onClick={() => setOpen(r)}
              className="w-full flex items-center gap-3 p-3 text-left hover:bg-black/[.02] transition"
            >
              <span
                className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold tabular-nums"
                style={
                  r.rank <= 3
                    ? { background: "var(--fill)", color: "var(--on-fill)" }
                    : { background: "var(--subtle)", color: "var(--muted)" }
                }
              >
                {r.rank}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">
                  {r.nickname}
                  {r.user_id === meId && <span className="chip ml-1.5">나</span>}
                </p>
                <p className="text-xs muted">
                  {r.last_summit_at ? `최근 ${new Date(r.last_summit_at).toLocaleDateString("ko-KR")}` : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold tabular-nums">
                  {r.summit_count}
                  <span className="text-xs muted font-normal">개</span>
                </p>
                <p className="text-xs muted tabular-nums">{r.total_elevation.toLocaleString()}m</p>
              </div>
            </button>
          </li>
        ))}
      </ol>

      {open && <ProfileModal row={open} isMe={open.user_id === meId} onClose={() => setOpen(null)} />}
    </>
  );
}

function ProfileModal({ row, isMe, onClose }: { row: RankingRow; isMe: boolean; onClose: () => void }) {
  const [summits, setSummits] = useState<PickedSummit[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("summits")
      .select("id, photo_path, method, taken_at, created_at, mountains(name, slug, elevation_m)")
      .eq("user_id", row.user_id)
      .order("created_at", { ascending: false });
    if (error) setErr("정상석 모음을 불러오지 못했어요.");
    else setSummits((data ?? []) as unknown as PickedSummit[]);
  }, [row.user_id]);

  useEffect(() => {
    load();
  }, [load]);

  // 모달이 열린 동안 뒤 배경 스크롤을 막고, Esc 로 닫는다
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  // 헤더·탭바(z-20) 위로 확실히 올리기 위해 body 로 포털하고 z-index 는 인라인으로 준다
  return createPortal(
    <div
      className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,.5)", zIndex: 100 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${row.nickname} 프로필`}
    >
      <div
        className="w-full max-w-md card rounded-b-none sm:rounded-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: "88dvh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="p-5 pb-4 border-b border-[color:var(--line)]">
          <div className="flex items-start gap-3">
            <div
              className="w-12 h-12 rounded-full shrink-0 flex items-center justify-center font-bold"
              style={{ background: "var(--fill)", color: "var(--on-fill)" }}
            >
              {row.rank}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold truncate">
                {row.nickname}
                {isMe && <span className="chip ml-1.5">나</span>}
              </h2>
              <p className="text-xs muted mt-0.5">
                {row.last_summit_at
                  ? `최근 인증 ${new Date(row.last_summit_at).toLocaleDateString("ko-KR")}`
                  : "인증 기록 없음"}
              </p>
            </div>
            <button className="text-sm muted shrink-0" onClick={onClose} aria-label="닫기">
              닫기
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4 text-center">
            <Stat label="정복한 산" value={`${row.summit_count}`} unit="개" />
            <Stat label="누적 고도" value={row.total_elevation.toLocaleString()} unit="m" />
            <Stat label="전체 랭킹" value={`${row.rank}`} unit="위" />
          </div>
        </div>

        {/* 정상석 모음 */}
        <div className="p-5 overflow-y-auto">
          <h3 className="font-bold mb-3 flex items-center gap-1.5">
            <IconCheck size={16} strokeWidth={2.2} /> 정상석 모음
            {summits && <span className="chip ml-1">{summits.length}</span>}
          </h3>

          {err ? (
            <p className="text-sm muted flex items-center gap-1.5">
              <IconAlert size={16} /> {err}
            </p>
          ) : !summits ? (
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="aspect-square rounded-xl animate-pulse" style={{ background: "var(--subtle)" }} />
              ))}
            </div>
          ) : summits.length === 0 ? (
            <p className="text-sm muted">아직 인증한 정상석이 없어요.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {summits.map((s) => (
                <Link
                  key={s.id}
                  href={s.mountains ? `/mountains/${s.mountains.slug}` : "#"}
                  className="group"
                  onClick={onClose}
                >
                  <figure className="relative aspect-square rounded-xl overflow-hidden border border-[color:var(--line)]">
                    <SummitPhoto path={s.photo_path} alt={`${s.mountains?.name ?? ""} 정상석`} sizes="160px" eager />
                  </figure>
                  <figcaption className="mt-1">
                    <p className="text-[11px] font-semibold truncate">{s.mountains?.name}</p>
                    <p className="text-[10px] muted truncate">
                      {new Date(s.taken_at ?? s.created_at).toLocaleDateString("ko-KR")}
                    </p>
                  </figcaption>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-xl p-2.5" style={{ background: "var(--bg)" }}>
      <p className="text-[11px] muted">{label}</p>
      <p className="font-bold leading-tight">
        {value} <span className="text-xs muted font-normal">{unit}</span>
      </p>
    </div>
  );
}
