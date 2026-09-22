
/**
 * 정상석 실루엣 정합 점수 (0~1) — 경량 휴리스틱.
 *  - contrast : 실루엣 안/밖 평균 밝기 차이 (정상석은 배경(하늘·숲)과 밝기가 다름)
 *  - edge     : 실루엣 경계선 위 픽셀 중 실제 화면 경계(그라디언트)가 있는 비율
 * ML 모델 없이 "대충 맞췄는지" 판별하는 용도. 정밀 판별은 2단계(서버 비전 모델)에서.
 */
export function computeFitScore(
  video: HTMLVideoElement,
  /** 정상석 실루엣 path (@/lib/stones) */
  path: string,
  overlayBox: { x: number; y: number; w: number; h: number }, // 화면 비율(0~1) 기준 오버레이 위치
): number {
  const W = 96, H = 128;
  const frame = getCanvas("frame", W, H);
  const mask = getCanvas("mask", W, H);
  const fctx = frame.getContext("2d", { willReadFrequently: true })!;
  const mctx = mask.getContext("2d", { willReadFrequently: true })!;

  // 비디오 → 저해상도 프레임 (object-fit: cover 와 동일한 크롭)
  const vw = video.videoWidth, vh = video.videoHeight;
  if (!vw || !vh) return 0;
  const scale = Math.max(W / vw, H / vh);
  const sw = W / scale, sh = H / scale;
  fctx.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, W, H);

  // 마스크: 실루엣 path 를 오버레이 박스 위치에 그린다
  mctx.clearRect(0, 0, W, H);
  mctx.save();
  mctx.translate(overlayBox.x * W, overlayBox.y * H);
  mctx.scale((overlayBox.w * W) / 100, (overlayBox.h * H) / 100);
  mctx.fillStyle = "#fff";
  mctx.fill(new Path2D(path), "evenodd");
  mctx.restore();

  const f = fctx.getImageData(0, 0, W, H).data;
  const m = mctx.getImageData(0, 0, W, H).data;

  const lum = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) {
    lum[i] = 0.299 * f[i * 4] + 0.587 * f[i * 4 + 1] + 0.114 * f[i * 4 + 2];
  }
  const inside = (i: number) => m[i * 4 + 3] > 128;

  let sumIn = 0, nIn = 0, sumOut = 0, nOut = 0;
  let borderTotal = 0, borderEdge = 0;
  let gradSum = 0;

  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      const gx = lum[i + 1] - lum[i - 1];
      const gy = lum[i + W] - lum[i - W];
      const g = Math.abs(gx) + Math.abs(gy);
      gradSum += g;

      const isIn = inside(i);
      // 실루엣 경계: 이웃 중 하나라도 안/밖이 다르면 경계
      const isBorder =
        isIn !== inside(i - 1) || isIn !== inside(i + 1) || isIn !== inside(i - W) || isIn !== inside(i + W);

      if (isBorder) {
        borderTotal++;
        if (g > 40) borderEdge++;
      } else if (isIn) {
        sumIn += lum[i]; nIn++;
      } else {
        // 바깥은 실루엣 근처(오버레이 박스 주변)만 샘플
        const bx = (x / W - overlayBox.x) / overlayBox.w;
        const by = (y / H - overlayBox.y) / overlayBox.h;
        if (bx > -0.3 && bx < 1.3 && by > -0.3 && by < 1.3) { sumOut += lum[i]; nOut++; }
      }
    }
  }
  if (!nIn || !nOut || !borderTotal) return 0;

  const contrast = Math.min(1, Math.abs(sumIn / nIn - sumOut / nOut) / 60);
  const edge = borderEdge / borderTotal;
  const avgGrad = gradSum / (W * H);
  // 전체가 평평(렌즈 가림, 어두움)하면 감점
  const alive = Math.min(1, avgGrad / 8);

  return Math.max(0, Math.min(1, (0.5 * contrast + 0.5 * edge) * alive));
}

const canvases: Record<string, HTMLCanvasElement> = {};
function getCanvas(key: string, w: number, h: number) {
  if (!canvases[key]) {
    canvases[key] = document.createElement("canvas");
    canvases[key].width = w;
    canvases[key].height = h;
  }
  return canvases[key];
}
