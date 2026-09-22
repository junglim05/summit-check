-- 100대 명산 추가 + 기존 28개 좌표 보정
--
-- 좌표 출처와 검증 방법
--  · 목록: 산림청 선정 100대 명산 (2002-10) — 이름·높이·소재지
--  · 좌표: OpenStreetMap natural=peak 노드 (전국 17,322개 중 매칭)
--  · 교차검증 3단계
--     1. 이름 일치 + 공식 높이와 OSM 고도 차 30m 이내
--     2. 산림청 등산로 공간정보(2016)의 해당 산 등산로망 반경 안에 있는지
--     3. 역지오코딩으로 실제 소재 시·도가 공식 소재지와 일치하는지 (100건 전수)
--  · 정상 봉우리 이름이 산 이름과 다른 곳(지리산 천왕봉, 설악산 대청봉 등)은
--    행정구역 질의·지오코딩 앵커로 개별 확인했다.
--
-- ※ 기존 28개 좌표는 대부분 인증 반경(150m)을 벗어나 있었다.
--   아차산 1.8km, 모락산 2.5km, 유명산 2.8km, 축령산 1.5km 등.
--   그대로 두면 정상에 올라가도 인증이 되지 않으므로 함께 보정한다.

-- 1) 전국 시·도를 허용하도록 제약 완화
alter table public.mountains drop constraint if exists mountains_region_check;
alter table public.mountains add constraint mountains_region_check check (region in (
  '서울','부산','대구','인천','광주','대전','울산','세종',
  '경기','강원','충북','충남','전북','전남','경북','경남','제주'
));


-- 2) 기존 산 좌표 보정 (이름은 그대로 둔다)
update public.mountains set lat = 37.663648, lng = 127.095245, elevation_m = 508 where slug = 'buramsan';  -- 불암산 → 불암산
update public.mountains set lat = 37.42802, lng = 127.04364, elevation_m = 582 where slug = 'cheonggyesan';  -- 청계산 매봉 → 매봉
update public.mountains set lat = 37.571123, lng = 127.10435, elevation_m = 295 where slug = 'achasan';  -- 아차산 → 아차산
update public.mountains set lat = 37.571168, lng = 127.09571, elevation_m = 348 where slug = 'yongmasan';  -- 용마산 → 용마산
update public.mountains set lat = 37.584999, lng = 126.957882, elevation_m = 339 where slug = 'inwangsan';  -- 인왕산 → 인왕산
update public.mountains set lat = 37.57693, lng = 126.945783, elevation_m = 296 where slug = 'ansan';  -- 안산 → 안산
update public.mountains set lat = 37.559152, lng = 127.261132, elevation_m = 683 where slug = 'yebongsan';  -- 예봉산 → 예봉산
update public.mountains set lat = 37.517655, lng = 127.249354, elevation_m = 658 where slug = 'geomdansan';  -- 검단산 → 검단산
update public.mountains set lat = 37.34494, lng = 127.034443, elevation_m = 582 where slug = 'gwanggyosan';  -- 광교산 시루봉 → 광교산 시루봉
update public.mountains set lat = 37.372888, lng = 126.913944, elevation_m = 489 where slug = 'surisan';  -- 수리산 태을봉 → 태을봉
update public.mountains set lat = 37.480594, lng = 127.204081, elevation_m = 522 where slug = 'namhansan';  -- 남한산 → 남한산
update public.mountains set lat = 37.370509, lng = 126.978647, elevation_m = 385 where slug = 'moraksan';  -- 모락산 → 모락산
update public.mountains set lat = 37.699264, lng = 127.08134, elevation_m = 638 where slug = 'suraksan';  -- 수락산 주봉 → 수락산
update public.mountains set lat = 37.593026, lng = 126.973765, elevation_m = 342 where slug = 'bugaksan';  -- 북악산 백악마루 → 북악산

-- 3) 100대 명산과 겹치는 기존 산: 좌표·고도·소재지 갱신 (이름 유지)
update public.mountains set region = '경기', district = '파주시', elevation_m = 675, lat = 37.941156, lng = 126.970076, radius_m = 150 where slug = 'gamaksan';  -- 감악산 (감악산)
update public.mountains set region = '서울', district = '관악구', elevation_m = 632, lat = 37.44514, lng = 126.964238, radius_m = 150 where slug = 'gwanaksan';  -- 관악산 (관악산)
update public.mountains set region = '서울', district = '도봉구', elevation_m = 740, lat = 37.698842, lng = 127.015459, radius_m = 150 where slug = 'dobongsan';  -- 도봉산 (도봉산자운봉)
update public.mountains set region = '경기', district = '가평군', elevation_m = 1252, lat = 37.94148, lng = 127.432145, radius_m = 200 where slug = 'myeongjisan';  -- 명지산 (명지산)
update public.mountains set region = '경기', district = '포천시', elevation_m = 903, lat = 38.074935, lng = 127.444531, radius_m = 150 where slug = 'baegunsan';  -- 백운산 (백운산)
update public.mountains set region = '서울', district = '강북구', elevation_m = 836, lat = 37.65863, lng = 126.978003, radius_m = 150 where slug = 'bukhansan';  -- 북한산 (북한산(백운대))
update public.mountains set region = '경기', district = '동두천시', elevation_m = 588, lat = 37.938516, lng = 127.087934, radius_m = 150 where slug = 'soyosan';  -- 소요산 (소요산)
update public.mountains set region = '경기', district = '양평군', elevation_m = 1157, lat = 37.561968, lng = 127.549072, radius_m = 200 where slug = 'yongmunsan';  -- 용문산 (용문산 가섭봉)
update public.mountains set region = '경기', district = '가평군', elevation_m = 935, lat = 37.87869, lng = 127.32288, radius_m = 150 where slug = 'unaksan';  -- 운악산 (운악산)
update public.mountains set region = '경기', district = '가평군', elevation_m = 864, lat = 37.575336, lng = 127.486706, radius_m = 150 where slug = 'yumyeongsan';  -- 유명산 (유명산)
update public.mountains set region = '경기', district = '남양주시', elevation_m = 810, lat = 37.680211, lng = 127.273346, radius_m = 150 where slug = 'cheonmasan';  -- 천마산 (천마산)
update public.mountains set region = '경기', district = '남양주시', elevation_m = 887, lat = 37.752763, lng = 127.333886, radius_m = 150 where slug = 'chungnyeongsan';  -- 축령산 (축령산)
update public.mountains set region = '경기', district = '가평군', elevation_m = 1468, lat = 37.994667, lng = 127.503431, radius_m = 200 where slug = 'hwaaksan';  -- 화악산 (화악산)

-- 4) 신규 87개 추가
insert into public.mountains (slug, name, region, district, elevation_m, lat, lng, radius_m, stone_shape) values
  ('garisan', '가리산', '강원', '홍천군', 1051, 37.871383, 127.956469, 200, 'rect'),
  ('gariwangsan', '가리왕산', '강원', '정선군', 1562, 37.461434, 128.563388, 200, 'rect'),
  ('gayasan', '가야산', '경남', '합천군', 1433, 35.822564, 128.122943, 200, 'rect'),
  ('gajisan', '가지산', '울산', '울주군', 1241, 35.620286, 129.002923, 200, 'rect'),
  ('gangcheonsan', '강천산', '전북', '순창군', 584, 35.40192, 127.04838, 150, 'rect'),
  ('gyeryongsan', '계룡산', '대전', null, 846, 36.342362, 127.20604, 150, 'rect'),
  ('gyebangsan', '계방산', '강원', '홍천군', 1579, 37.728339, 128.465497, 200, 'rect'),
  ('gongjaksan', '공작산', '강원', '홍천군', 887, 37.715958, 128.010665, 150, 'rect'),
  ('gubyeongsan', '구병산', '경북', null, 876, 36.469583, 127.861747, 150, 'rect'),
  ('geumsan', '금산', '경남', '남해군', 705, 34.753798, 127.982936, 150, 'rect'),
  ('geumsusan', '금수산', '충북', '제천시', 1016, 36.984726, 128.256909, 200, 'rect'),
  ('geumosan', '금오산', '경북', '구미시', 976, 36.091736, 128.300198, 150, 'rect'),
  ('geumjeongsan', '금정산', '부산', '금정구', 801, 35.28015, 129.050617, 150, 'rect'),
  ('gitdaebong', '깃대봉', '전남', '신안군', 361, 34.696875, 125.203186, 150, 'rect'),
  ('namsan-gyeongjusi', '남산', '경북', '경주시', 495, 35.76756, 129.22529, 150, 'rect'),
  ('naeyeonsan', '내연산', '경북', '포항시', 711, 36.278676, 129.289906, 150, 'rect'),
  ('naejangsan', '내장산', '전북', '정읍시', 764, 35.478332, 126.888987, 150, 'rect'),
  ('daedunsan', '대둔산', '충남', '논산시', 879, 36.124594, 127.320477, 150, 'rect'),
  ('daeamsan', '대암산', '강원', '양구군', 1313, 38.211065, 128.134713, 200, 'rect'),
  ('daeyasan', '대야산', '경북', '문경시', 931, 36.669258, 127.929481, 150, 'rect'),
  ('deoksungsan', '덕숭산', '충남', '예산군', 495, 36.671774, 126.624339, 150, 'rect'),
  ('deokyusan', '덕유산', '전북', '무주군', 1614, 35.860013, 127.746518, 200, 'rect'),
  ('deokhangsan', '덕항산', '강원', '삼척시', 1073, 37.308788, 129.012634, 200, 'rect'),
  ('doraksan', '도락산', '충북', '단양군', 965, 36.856264, 128.31128, 150, 'rect'),
  ('duryunsan', '두륜산', '전남', '해남군', 700, 34.471912, 126.637567, 150, 'rect'),
  ('dutasan', '두타산', '강원', '동해시', 1357, 37.426637, 129.004425, 200, 'rect'),
  ('manisan', '마니산', '인천', '강화군', 472, 37.615542, 126.429683, 150, 'rect'),
  ('maisan', '마이산', '전북', '진안군', 687, 35.76054, 127.411497, 150, 'rect'),
  ('myeongseongsan', '명성산', '강원', '철원군', 922, 38.1043, 127.338149, 150, 'rect'),
  ('moaksan', '모악산', '전북', '김제시', 795, 35.728587, 127.085174, 150, 'rect'),
  ('mudeungsan', '무등산', '광주', '동구', 1187, 35.125039, 127.008573, 200, 'rect'),
  ('muhaksan', '무학산', '경남', '창원시', 761, 35.210107, 128.535514, 150, 'rect'),
  ('mireuksan', '미륵산', '경남', '통영시', 458, 34.810664, 128.416114, 150, 'rect'),
  ('minjujisan', '민주지산', '충북', '영동군', 1242, 36.039794, 127.849273, 200, 'rect'),
  ('bangjangsan', '방장산', '전남', '장성군', 734, 35.455717, 126.754361, 150, 'rect'),
  ('bangtaesan', '방태산', '강원', '인제군', 1446, 37.888255, 128.39018, 200, 'rect'),
  ('baekdeoksan', '백덕산', '강원', '평창군', 1350, 37.396474, 128.293524, 200, 'rect'),
  ('baekamsan', '백암산', '전북', '순창군', 741, 35.46128, 126.868469, 150, 'rect'),
  ('baekunsan', '백운산', '전남', '광양시', 1222, 35.106378, 127.621325, 200, 'rect'),
  ('baekunsan-jeongseongun', '백운산', '강원', '정선군', 884, 37.27999, 128.59609, 150, 'rect'),
  ('byeonsan', '변산', '전북', '부안군', 459, 35.644743, 126.558229, 150, 'rect'),
  ('biseulsan', '비슬산', '대구', '달성군', 1083, 35.715597, 128.523184, 200, 'rect'),
  ('samaksan', '삼악산', '강원', '춘천시', 656, 37.839722, 127.660371, 150, 'rect'),
  ('seodaesan', '서대산', '충남', '금산군', 904, 36.22066, 127.53837, 150, 'rect'),
  ('seonunsan', '선운산', '전북', '고창군', 335, 35.49868, 126.56899, 150, 'rect'),
  ('seolaksan', '설악산', '강원', '속초시', 1708, 38.119172, 128.465308, 200, 'rect'),
  ('seonginbong', '성인봉', '경북', '울릉군', 986, 37.498006, 130.867047, 150, 'rect'),
  ('sobaeksan', '소백산', '경북', '영주시', 1440, 36.957493, 128.484897, 200, 'rect'),
  ('sokrisan', '속리산', '경북', '상주시', 1058, 36.5432, 127.8709, 200, 'rect'),
  ('sinbulsan', '신불산', '울산', '울주군', 1159, 35.539413, 129.054098, 200, 'rect'),
  ('yeonhwasan', '연화산', '경남', '고성군', 524, 35.071034, 128.265036, 150, 'rect'),
  ('odaesan', '오대산', '강원', '평창군', 1565, 37.793749, 128.542654, 200, 'rect'),
  ('obongsan', '오봉산', '강원', '춘천시', 778, 38.00017, 127.80718, 150, 'rect'),
  ('yonghwasan', '용화산', '강원', '화천군', 878, 38.038193, 127.747992, 150, 'rect'),
  ('unmunsan', '운문산', '경북', '청도군', 1195, 35.61551, 128.959663, 200, 'rect'),
  ('unjangsan', '운장산', '전북', '진안군', 1126, 35.911345, 127.357652, 200, 'rect'),
  ('wolaksan', '월악산', '충북', '제천시', 1095, 36.886079, 128.105837, 200, 'rect'),
  ('wolchulsan', '월출산', '전남', '영암군', 811, 34.766619, 126.704043, 150, 'rect'),
  ('eungbongsan', '응봉산', '강원', '삼척시', 1000, 37.076579, 129.230519, 150, 'rect'),
  ('jangansan', '장안산', '전북', '장수군', 1237, 35.629184, 127.595074, 200, 'rect'),
  ('jaeyaksan', '재약산', '경남', '밀양시', 1119, 35.545424, 128.980616, 200, 'rect'),
  ('jeoksangsan', '적상산', '전북', '무주군', 1031, 35.94638, 127.69019, 200, 'rect'),
  ('jeombongsan', '점봉산', '강원', '양양군', 1426, 38.04874, 128.425643, 200, 'rect'),
  ('jogyesan', '조계산', '전남', '순천시', 887, 35.001304, 127.313627, 150, 'rect'),
  ('juwangsan', '주왕산', '경북', '청송군', 722, 36.389355, 129.162386, 150, 'rect'),
  ('juheulsan', '주흘산', '경북', '문경시', 1108, 36.778069, 128.105993, 200, 'rect'),
  ('jirisan', '지리산', '전북', '남원시', 1915, 35.336954, 127.730591, 200, 'rect'),
  ('jirisan-tongyeongsi', '지리산', '경남', '통영시', 399, 34.84593, 128.18216, 150, 'rect'),
  ('cheongwansan', '천관산', '전남', '장흥군', 724, 34.531727, 126.91966, 150, 'rect'),
  ('cheonseongsan', '천성산', '경남', '양산시', 920, 35.401573, 129.106282, 150, 'rect'),
  ('cheontaesan', '천태산', '충북', '영동군', 715, 36.15913, 127.599952, 150, 'rect'),
  ('cheongryangsan', '청량산', '경북', '봉화군', 870, 36.794438, 128.90882, 150, 'rect'),
  ('chuwolsan', '추월산', '전남', '담양군', 731, 35.39993, 126.97604, 150, 'rect'),
  ('chiaksan', '치악산', '강원', '원주시', 1282, 37.365145, 128.055632, 200, 'rect'),
  ('chilgapsan', '칠갑산', '충남', '청양군', 560, 36.413023, 126.884882, 150, 'rect'),
  ('taebaeksan', '태백산', '강원', '태백시', 1567, 37.098562, 128.916152, 200, 'rect'),
  ('taehwasan', '태화산', '강원', '영월군', 1028, 37.117585, 128.485378, 200, 'rect'),
  ('palgongsan', '팔공산', '대구', '군위군', 1192, 36.016548, 128.695323, 200, 'rect'),
  ('palbongsan', '팔봉산', '강원', '홍천군', 328, 37.695883, 127.697119, 150, 'rect'),
  ('palyeongsan', '팔영산', '전남', '고흥군', 607, 34.617153, 127.436444, 150, 'rect'),
  ('hanrasan', '한라산', '제주', null, 1947, 33.361754, 126.529198, 200, 'rect'),
  ('hwawangsan', '화왕산', '경남', '창녕군', 758, 35.547148, 128.531694, 150, 'rect'),
  ('hwangmaesan', '황매산', '경남', '합천군', 1113, 35.494236, 127.974589, 200, 'rect'),
  ('hwangseoksan', '황석산', '경남', '함양군', 1192, 35.655117, 127.755484, 200, 'rect'),
  ('hwangaksan', '황악산', '경북', '김천시', 1111, 36.118049, 127.966796, 200, 'rect'),
  ('hwangjangsan', '황장산', '경북', '문경시', 1079, 36.81274, 128.278182, 200, 'rect'),
  ('huiyangsan', '희양산', '경북', '문경시', 996, 36.714641, 128.005065, 150, 'rect')
on conflict (slug) do update set
  name = excluded.name, region = excluded.region, district = excluded.district,
  elevation_m = excluded.elevation_m, lat = excluded.lat, lng = excluded.lng,
  radius_m = excluded.radius_m;
