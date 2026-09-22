# 하이피크 (Highpeak)

서울·경기 28개 산의 정상석을 GPS 기반으로 인증하고 컬렉션·랭킹을 쌓는 모바일 웹앱.

무채색 단색 UI, 산 모양 로고 마크를 쓴다.

- 프론트/백엔드: Next.js 15 (App Router, Route Handlers)
- 인증·DB·스토리지: Supabase (Auth, Postgres + RLS, Storage)
- 배포: Vercel

## 로컬 실행

```bash
cp .env.example .env.local   # Supabase 키 입력
npm install
npm run dev                   # http://localhost:3000
```

> 카메라·GPS 는 HTTPS 또는 localhost 에서만 동작합니다. 실기기 테스트는 `npx vercel` 프리뷰 배포 또는 `ngrok http 3000` 을 사용하세요.

## Supabase 세팅 (5분)

1. https://supabase.com 새 프로젝트 (리전: **Northeast Asia (Seoul)**)
2. SQL Editor 에서 순서대로 실행
   - `supabase/migrations/0001_init.sql` — 테이블·RLS·Storage 버킷·랭킹 뷰
   - `supabase/migrations/0002_seed_mountains.sql` — 서울/경기 산 시드
3. Authentication → Providers → Email 활성화
   - 개발 중엔 **Confirm email OFF** 가 편함 (운영 땐 ON + SMTP 설정)
4. Project Settings → API 에서 URL / anon key / service_role key 복사 → `.env.local`

## 산 데이터 수정 시

`supabase/migrations` 로 DB 를 고친 뒤 캐시 태그를 무효화해야 즉시 반영된다
(산 목록은 `unstable_cache` 로 1시간 캐시되며 Vercel 데이터 캐시는 재배포로 지워지지 않는다).

```bash
vercel cache invalidate --tag mountains
```

## 구조

```
src/app
  page.tsx                 산 목록 (정복 현황)
  mountains/[slug]         산 상세 + 최근 인증 사진
  verify                   정상인증 (현장 촬영 / EXIF 사진)
  me                       마이페이지: 정상석 모음집
  ranking                  랭킹
  login, signup, auth/callback
  api/verify/prepare       Storage 서명 업로드 URL 발급
  api/verify/confirm       GPS·EXIF 서버 검증 후 인증 저장
src/components             Nav/TabBar(하단 탭), icons.tsx(로고·단색 아이콘 세트)
src/components/verify      LiveCapture(카메라+오버레이), ExifUpload, StoneOverlay
src/lib                    supabase 클라이언트, geo, fitScore(실루엣 정합), upload
supabase/migrations        스키마 + 시드
```

## 인증 로직 요약

| 방식 | 클라이언트 | 서버 (`/api/verify/confirm`) |
|---|---|---|
| 현장 촬영 (live) | GPS watch → 반경 내 산 자동 선택 → 카메라 위 정상석 실루엣 오버레이 → 정합 점수 ≥ 0.3 유지 시 셔터 활성화 | 좌표 거리 ≤ `radius_m + min(accuracy,50)`, 정확도 ≤ 80m, 정합 점수 재확인 |
| 예전 사진 (exif) | 원본 파일 EXIF GPS 파싱 → 가장 가까운 산 매칭 미리보기 | Storage 원본을 다시 내려받아 **서버가 직접 EXIF 파싱** → 거리 ≤ `radius_m × 1.5` |

사진은 서버를 거치지 않고 Storage 로 직접 업로드(서명 URL)하고, 인증 레코드는 service role 로만 쓰기 때문에 클라이언트가 RLS 를 통해 직접 인증을 만들 수 없습니다.

자세한 배포 계획은 `DEPLOYMENT.md` 참고.
