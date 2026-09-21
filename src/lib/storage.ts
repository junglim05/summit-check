export function photoUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/summit-photos/${path}`;
}

/** 브라우저가 못 그리는 포맷(HEIC)인지 — 업로드 시 만들어 둔 .jpg 사본을 먼저 쓴다. */
export function needsDisplayCopy(path: string): boolean {
  return /\.(heic|heif)$/i.test(path);
}

/** 표시용 URL. HEIC 원본이면 JPEG 사본 경로를 돌려준다. */
export function displayPhotoUrl(path: string): string {
  return photoUrl(needsDisplayCopy(path) ? `${path}.jpg` : path);
}
