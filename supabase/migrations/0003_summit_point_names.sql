-- 정상에 고유 지명이 있는 산은 "산 + 정상 지명" 으로 표기를 통일한다.
-- (예: 북한산 백운대, 도봉산 신선대 처럼)
-- 근거: 수락산 정상 = 주봉 / 북악산 정상 = 백악마루(한양도성 최고점) /
--       소요산 정상 = 의상대 587m (동두천시 관광 안내)
-- 정상에 별도 지명이 없는 산(불암산·검단산·천마산 등)은 그대로 둔다.

update public.mountains set name = '수락산 주봉'    where slug = 'suraksan'  and name = '수락산';
update public.mountains set name = '북악산 백악마루' where slug = 'bugaksan'  and name = '북악산';
update public.mountains set name = '소요산 의상대'  where slug = 'soyosan'   and name = '소요산';
