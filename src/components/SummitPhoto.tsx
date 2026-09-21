"use client";

import Image from "next/image";
import { useState } from "react";
import { displayPhotoUrl, needsDisplayCopy, photoUrl } from "@/lib/storage";
import { IconImage } from "./icons";

/**
 * 인증 사진. HEIC 원본은 대부분의 브라우저가 못 그리므로 업로드 때 만들어 둔
 * JPEG 사본을 먼저 시도하고, 사본이 없으면 원본 → 그래도 실패하면 대체 표시.
 */
export default function SummitPhoto({
  path,
  alt,
  sizes,
  className = "object-cover",
}: {
  path: string;
  alt: string;
  sizes: string;
  className?: string;
}) {
  const [step, setStep] = useState<0 | 1 | 2>(0);

  if (step === 2) {
    return (
      <div className="w-full h-full flex items-center justify-center" style={{ background: "var(--subtle)" }}>
        <IconImage size={22} className="muted" />
      </div>
    );
  }

  const src = step === 0 ? displayPhotoUrl(path) : photoUrl(path);

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      className={className}
      unoptimized={step === 1 && needsDisplayCopy(path)}
      onError={() => setStep((s) => (s === 0 && needsDisplayCopy(path) ? 1 : 2))}
    />
  );
}
