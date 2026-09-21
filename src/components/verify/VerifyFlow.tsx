"use client";

import { useState } from "react";
import Link from "next/link";
import type { Mountain } from "@/lib/types";
import type { VerifyResult } from "@/lib/upload";
import LiveCapture from "./LiveCapture";
import ExifUpload from "./ExifUpload";
import { IconCamera, IconCheck, IconImage } from "@/components/icons";

type Tab = "live" | "exif";

export default function VerifyFlow({ mountains, preselectSlug }: { mountains: Mountain[]; preselectSlug?: string }) {
  const [tab, setTab] = useState<Tab>("live");
  const [result, setResult] = useState<VerifyResult | null>(null);

  if (result) {
    return (
      <div className="pt-10 text-center">
        <div
          className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
          style={{ background: "var(--fill)", color: "var(--on-fill)" }}
        >
          <IconCheck size={30} strokeWidth={2.2} />
        </div>
        <h1 className="text-2xl font-bold mb-1">{result.mountain.name} 정복</h1>
        <p className="muted text-sm mb-6">
          정상에서 {result.distance_m}m · {result.replaced ? "기존 인증 사진을 교체했어요" : "컬렉션에 추가되었어요"}
        </p>
        <div className="flex flex-col gap-2">
          <Link href="/me" className="btn btn-primary">내 정상석 모음 보기</Link>
          <button className="btn btn-ghost" onClick={() => setResult(null)}>다른 산 인증하기</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-3">정상인증</h1>
      <div className="grid grid-cols-2 gap-1 p-1 rounded-xl mb-4" style={{ background: "var(--subtle)", border: "1px solid var(--line)" }}>
        <TabBtn active={tab === "live"} onClick={() => setTab("live")}>
          <IconCamera size={16} /> 지금 정상에서
        </TabBtn>
        <TabBtn active={tab === "exif"} onClick={() => setTab("exif")}>
          <IconImage size={16} /> 예전 사진으로
        </TabBtn>
      </div>

      {tab === "live" ? (
        <LiveCapture mountains={mountains} preselectSlug={preselectSlug} onDone={setResult} />
      ) : (
        <ExifUpload mountains={mountains} onDone={setResult} />
      )}
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="py-2 rounded-lg text-sm font-semibold transition inline-flex items-center justify-center gap-1.5"
      style={active ? { background: "var(--card)", color: "var(--ink)" } : { color: "var(--muted)" }}
    >
      {children}
    </button>
  );
}
