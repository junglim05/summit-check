import exifr from "exifr";

export interface PhotoMeta {
  /** 좌표를 읽었고 두 값 모두 유한수일 때만 채워진다. */
  gps: { lat: number; lng: number } | null;
  takenAt: Date | null;
  /** 브라우저에서 EXIF 를 읽지 못한 이유 (읽었으면 null) */
  reason: "no-gps" | "unreadable" | null;
}

/**
 * 브라우저에서 사진의 GPS·촬영시각을 읽는다.
 *
 * 여기서 읽지 못해도 인증을 막지 않는다 — 서버(`/api/verify/confirm`)가 원본을
 * 다시 내려받아 직접 파싱하며 그쪽이 최종 판정자다. 이 함수는 업로드 전에
 * 미리 보여주기 위한 힌트일 뿐이다. (HEIC 처럼 브라우저 파싱이 불안정한
 * 포맷에서 클라이언트가 먼저 거절해버리는 문제를 막기 위함)
 */
export async function readPhotoMeta(file: Blob): Promise<PhotoMeta> {
  let gps: { latitude?: number; longitude?: number } | undefined;
  let takenAt: Date | null = null;
  let unreadable = false;

  try {
    gps = await exifr.gps(file);
  } catch {
    unreadable = true;
  }

  try {
    const ex = await exifr.parse(file, ["DateTimeOriginal", "CreateDate"]);
    const raw = ex?.DateTimeOriginal ?? ex?.CreateDate;
    if (raw) {
      const d = new Date(raw);
      if (!Number.isNaN(d.getTime())) takenAt = d;
    }
  } catch {
    /* 촬영시각은 없어도 그만 */
  }

  // exifr 는 GPS 태그가 일부만 있으면 값이 undefined 인 객체를 돌려주기도 한다.
  // 서버와 동일하게 유한수인지까지 확인해야 NaN 거리 계산으로 이어지지 않는다.
  const lat = gps?.latitude;
  const lng = gps?.longitude;
  if (typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng)) {
    return { gps: { lat, lng }, takenAt, reason: null };
  }
  return { gps: null, takenAt, reason: unreadable ? "unreadable" : "no-gps" };
}

/** 브라우저가 디코딩할 수 있는 포맷인지 (HEIC 는 Safari 외에는 대부분 불가) */
export function isLikelyUndisplayable(file: File): boolean {
  const n = file.name.toLowerCase();
  return /image\/hei[cf]/.test(file.type) || n.endsWith(".heic") || n.endsWith(".heif");
}

/**
 * 갤러리 표시용 JPEG 사본을 만든다. 브라우저가 해당 포맷을 디코딩하지 못하면 null.
 * 원본은 그대로 올려서 서버가 EXIF 를 검증하고, 사본은 표시 용도로만 쓴다.
 */
export async function makeDisplayJpeg(file: File, maxSide = 1600): Promise<Blob | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    return await new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", 0.86));
  } catch {
    return null; // 디코딩 불가 (예: Chrome + HEIC)
  }
}
