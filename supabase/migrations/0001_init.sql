-- ============================================================
-- 정상석 인증 서비스 초기 스키마
-- Supabase SQL Editor 또는 `supabase db push` 로 실행
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- 프로필 (auth.users 1:1) ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nickname    text not null unique check (char_length(nickname) between 2 and 16),
  avatar_url  text,
  created_at  timestamptz not null default now()
);

-- 회원가입 시 프로필 자동 생성 (nickname 은 metadata 에서 가져오고 없으면 이메일 앞부분)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  base text;
  candidate text;
  n int := 0;
begin
  base := coalesce(new.raw_user_meta_data->>'nickname', split_part(new.email, '@', 1));
  base := left(regexp_replace(base, '[^가-힣a-zA-Z0-9_]', '', 'g'), 12);
  if char_length(base) < 2 then base := 'hiker'; end if;
  candidate := base;
  while exists (select 1 from public.profiles where nickname = candidate) loop
    n := n + 1;
    candidate := base || n::text;
  end loop;
  insert into public.profiles (id, nickname) values (new.id, candidate);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- 산 (정상 좌표 포함) ----------
create table if not exists public.mountains (
  id          serial primary key,
  slug        text not null unique,
  name        text not null,
  region      text not null check (region in ('서울', '경기')),
  district    text,                          -- 시/군/구
  elevation_m int  not null,
  lat         double precision not null,
  lng         double precision not null,
  radius_m    int  not null default 150,     -- 인증 허용 반경
  stone_shape text not null default 'rect',  -- 정상석 실루엣 종류: rect | tall | natural | pillar
  created_at  timestamptz not null default now()
);

-- ---------- 정상 인증 기록 ----------
create table if not exists public.summits (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  mountain_id   int  not null references public.mountains(id),
  photo_path    text not null,                -- storage 경로 (summit-photos 버킷)
  method        text not null check (method in ('live', 'exif')),
  lat           double precision not null,    -- 인증 시 사용된 좌표
  lng           double precision not null,
  distance_m    double precision not null,    -- 정상까지 거리
  taken_at      timestamptz,                  -- EXIF 촬영 시각 (live 는 now)
  created_at    timestamptz not null default now(),
  unique (user_id, mountain_id)               -- 산당 1회 (재인증 시 사진 교체)
);

create index if not exists summits_user_idx on public.summits(user_id);
create index if not exists summits_mountain_idx on public.summits(mountain_id);

-- ---------- 랭킹 뷰 ----------
create or replace view public.rankings with (security_invoker = on) as
select
  p.id           as user_id,
  p.nickname,
  p.avatar_url,
  count(s.id)::int                        as summit_count,
  coalesce(sum(m.elevation_m), 0)::int    as total_elevation,
  max(s.created_at)                       as last_summit_at,
  rank() over (order by count(s.id) desc, coalesce(sum(m.elevation_m),0) desc, max(s.created_at) asc) as rank
from public.profiles p
left join public.summits s on s.user_id = p.id
left join public.mountains m on m.id = s.mountain_id
group by p.id;

-- ---------- RLS ----------
alter table public.profiles  enable row level security;
alter table public.mountains enable row level security;
alter table public.summits   enable row level security;

-- 프로필: 누구나 조회, 본인만 수정
create policy "profiles_select_all"  on public.profiles for select using (true);
create policy "profiles_update_own"  on public.profiles for update using (auth.uid() = id);

-- 산: 누구나 조회
create policy "mountains_select_all" on public.mountains for select using (true);

-- 인증: 누구나 조회(피드/랭킹), 쓰기는 서버(service role)에서만 수행.
-- 클라이언트가 직접 insert 하면 GPS 검증을 우회할 수 있으므로 insert/update 정책을 열지 않는다.
create policy "summits_select_all"   on public.summits for select using (true);
create policy "summits_delete_own"   on public.summits for delete using (auth.uid() = user_id);

-- ---------- Storage ----------
insert into storage.buckets (id, name, public)
values ('summit-photos', 'summit-photos', true)
on conflict (id) do nothing;

-- 사진은 서버(service role)가 업로드. 읽기는 public 버킷이므로 URL 로 접근.
create policy "summit_photos_read" on storage.objects
  for select using (bucket_id = 'summit-photos');
