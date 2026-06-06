-- ============================================================================
-- Casino Night — seed data
-- Safe to re-run: uses upserts / guarded inserts.
-- ============================================================================

-- Settings (single row) with the spec defaults.
insert into settings (id, starting_balance, default_wager_stake, default_buyin, leaderboard_visible)
values (1, 1000, 50, 200, false)
on conflict (id) do nothing;

-- Admin code. CHANGE THIS, and keep VITE_ADMIN_CODE in sync (see README).
insert into app_secrets (id, admin_code)
values (1, 'birthday-boss-2026')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Quests (20). Only seed if the board is empty so admin edits survive re-runs.
-- ---------------------------------------------------------------------------
insert into quests (title, description, reward, quest_type, auto_key, repeatable, repeat_cap, sort)
select * from (values
  -- App-detected (auto-pay)
  ('First Win',      'Win any wager or dealer hand.',                              100, 'auto'::quest_kind,  'first_win',    false, null::int, 1),
  ('Good Loser',     'Lose a hand and keep smiling. Consolation chips.',            75, 'auto'::quest_kind,  'good_loser',   true,  3,         2),
  ('High Roller',    'Place a single wager of 200+ chips.',                        100, 'auto'::quest_kind,  'high_roller',  false, null,      3),
  ('Hot Streak',     'Win twice in a row.',                                        150, 'auto'::quest_kind,  'hot_streak',   false, null,      4),
  ('Table Tourist',  'Take part in three different games tonight.',                150, 'auto'::quest_kind,  'table_tourist',false, null,      5),
  ('Cheers',         'Buy a drink from the shop.',                                  50, 'auto'::quest_kind,  'cheers',       false, null,      6),
  -- Claim (honor system, social)
  ('Birthday Selfie','Get a photo with the birthday person.',                      100, 'claim'::quest_kind, null,           false, null,      7),
  ('Group Shot',     'Get everyone into one photo.',                               150, 'claim'::quest_kind, null,           false, null,      8),
  ('Toastmaster',    'Make a toast to the birthday person.',                       150, 'claim'::quest_kind, null,           false, null,      9),
  ('Speech',         'Say one genuine thing you appreciate about the birthday person, out loud.', 150, 'claim'::quest_kind, null, false, null, 10),
  ('Throwback',      'Share a funny or old memory about the birthday person with the group.',     100, 'claim'::quest_kind, null, false, null, 11),
  ('Countdown',      'Get everyone to do a countdown or cheers together.',         100, 'claim'::quest_kind, null,           false, null,      12),
  ('Sing-Along',     'Get a song everyone knows played and sung along to.',        100, 'claim'::quest_kind, null,           false, null,      13),
  ('Dance Floor',    'Do a round of Just Dance.',                                  100, 'claim'::quest_kind, null,           false, null,      14),
  ('Sous Chef',      'Help with the sausages/steak or food prep.',                 200, 'claim'::quest_kind, null,           false, null,      15),
  ('Bartender',      'Hand out drinks or refill snack bowls for others.',          150, 'claim'::quest_kind, null,           true,  3,         16),
  ('Cleanup Hero',   'Clear a round of empties or tidy a table.',                  150, 'claim'::quest_kind, null,           true,  3,         17),
  ('Cake Crew',      'Be part of the cake / candle moment.',                       100, 'claim'::quest_kind, null,           false, null,      18),
  ('Card',           'Write something nice in the birthday card/message.',         100, 'claim'::quest_kind, null,           false, null,      19),
  ('DJ Pick',        'Request a song that actually gets played.',                   75, 'claim'::quest_kind, null,           false, null,      20)
) as v(title, description, reward, quest_type, auto_key, repeatable, repeat_cap, sort)
where not exists (select 1 from quests);

-- ---------------------------------------------------------------------------
-- Shop menu — tiered so chips drain from the economy.
-- ---------------------------------------------------------------------------
insert into shop_items (name, price, emoji, sort)
select * from (values
  -- Snacks
  ('Tortilla Chips',       20,  '🌮', 1),
  ('Paprika Chips',        20,  '🌶️', 2),
  ('Nature Chips',         20,  '🥔', 3),
  ('Salt & Vinegar Chips', 20,  '🧂', 4),
  ('Salzstängel',          15,  '🥨', 5),
  ('Popcorn',              15,  '🍿', 6),
  ('Bread',                15,  '🍞', 7),
  ('Watermelon',           25,  '🍉', 8),
  -- Soft drinks
  ('Coca Cola',            25,  '🥤', 9),
  ('Coca Cola Zero',       25,  '🧊', 10),
  ('Nestea Peach',         25,  '🍑', 11),
  ('Elmer Citro',          25,  '🍋', 12),
  ('Yuzu Drink',           30,  '🍊', 13),
  ('Virgin Mojito',        35,  '🌿', 14),
  -- Alcohol
  ('Beer',                 45,  '🍺', 15),
  ('Red Wine',             55,  '🍷', 16),
  ('Mojito',               70,  '🍸', 17),
  -- Food
  ('Cake',                 90,  '🎂', 18),
  ('Cervelat',             80,  '🌭', 19),
  ('Bratwurst',            80,  '🌭', 20),
  ('Steak (pork)',         110, '🍖', 21),
  ('Steak (beef)',         130, '🥩', 22)
) as v(name, price, emoji, sort)
where not exists (select 1 from shop_items);
