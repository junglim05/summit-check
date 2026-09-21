"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DeleteSummitButton({ id }: { id: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!confirming) {
    return (
      <button className="text-[11px] muted mt-1 underline" onClick={() => setConfirming(true)}>
        삭제
      </button>
    );
  }
  return (
    <div className="flex gap-2 mt-1 text-[11px]">
      <button
        className="text-red-600 font-semibold"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await createClient().from("summits").delete().eq("id", id);
          router.refresh();
        }}
      >
        {busy ? "삭제 중…" : "정말 삭제"}
      </button>
      <button className="muted" onClick={() => setConfirming(false)}>취소</button>
    </div>
  );
}
