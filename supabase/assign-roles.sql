-- Run only in the Supabase SQL Editor as administrator after creating and verifying both Auth users.
-- Replace both placeholders. Never expose database administration credentials in the frontend.
begin;
insert into public.profiles(id,role) values
  ('LABIB_AUTH_USER_UUID'::uuid,'GARDENER'),
  ('MEHEZAD_AUTH_USER_UUID'::uuid,'CARETAKER');
commit;
