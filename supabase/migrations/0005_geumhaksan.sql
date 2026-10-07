-- 금학산 (강원 철원군, 947m) 추가
--
-- 좌표: OpenStreetMap natural=peak 노드 7698659117 (ele 946.9, wikidata Q27279471)
-- 검증: 역지오코딩 → 강원특별자치도 철원군 이평리.
--       OSM '금학산정상석' 노드(38.186256, 127.200406)와 약 70m 거리라
--       인증 반경 150m 안에 정상석이 들어온다.

insert into public.mountains (slug, name, region, district, elevation_m, lat, lng, radius_m, stone_shape) values
  ('geumhaksan', '금학산', '강원', '철원군', 947, 38.185679, 127.200755, 150, 'rect')
on conflict (slug) do update set
  name = excluded.name, region = excluded.region, district = excluded.district,
  elevation_m = excluded.elevation_m, lat = excluded.lat, lng = excluded.lng,
  radius_m = excluded.radius_m;
