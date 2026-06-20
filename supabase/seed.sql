insert into public.events(title, room_code, admin_key, status)
values ('Wedding Quiz Live デモ', 'DEMO24', 'demo-admin-key-change-me', 'waiting')
on conflict (room_code) do update
set title = excluded.title,
    admin_key = excluded.admin_key,
    status = 'waiting';

with demo_event as (
  select id from public.events where room_code = 'DEMO24'
)
insert into public.questions(
  event_id,
  order_no,
  text,
  option_1,
  option_2,
  option_3,
  option_4,
  correct_index,
  time_limit_sec
)
select
  demo_event.id,
  sample.order_no,
  sample.text,
  sample.option_1,
  sample.option_2,
  sample.option_3,
  sample.option_4,
  sample.correct_index,
  sample.time_limit_sec
from demo_event
cross join (
  values
    (1, '新郎新婦が初めて出会った場所は？', '職場', '友人の紹介', 'マッチングアプリ', '旅行先', 1, 10),
    (2, '新郎が新婦に初めてプレゼントしたものは？', '花', 'アクセサリー', 'お菓子', '手紙', 2, 10),
    (3, '新婦が新郎に直してほしいと思っていることは？', '寝落ち', '返信の速さ', '服の脱ぎっぱなし', '食べすぎ', 2, 10),
    (4, '新郎新婦が一番思い出に残っている旅行先は？', '北海道', '九州', '沖縄', '関西', 2, 10),
    (5, '新郎新婦が将来一番大事にしたいことは？', 'お金', '健康', '笑い', '家族時間', 3, 10)
) as sample(order_no, text, option_1, option_2, option_3, option_4, correct_index, time_limit_sec)
on conflict (event_id, order_no) do update
set text = excluded.text,
    option_1 = excluded.option_1,
    option_2 = excluded.option_2,
    option_3 = excluded.option_3,
    option_4 = excluded.option_4,
    correct_index = excluded.correct_index,
    time_limit_sec = excluded.time_limit_sec;
