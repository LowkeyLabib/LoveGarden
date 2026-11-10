begin;
alter table public.game_clock add column angry_mode boolean not null default false;
create or replace function public.garden_clock() returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('server_time',now(),'epoch',epoch,'angry_mode',angry_mode) from public.game_clock
$$;
create function private.set_angry_mode(p_enabled boolean) returns boolean language plpgsql security definer set search_path='' as $$
begin
 perform private.require_role('GARDENER');
 if p_enabled is null then raise exception 'Choose whether Angry Mode is enabled'; end if;
 update public.game_clock set angry_mode=p_enabled where id=true;
 return p_enabled;
end $$;
create function public.set_angry_mode(p_enabled boolean) returns boolean language sql security invoker set search_path='' as $$select private.set_angry_mode(p_enabled)$$;
revoke all on function private.set_angry_mode(boolean),public.set_angry_mode(boolean) from public,anon,authenticated;
grant execute on function private.set_angry_mode(boolean),public.set_angry_mode(boolean) to authenticated;
-- The existing read-only scenery policy exposes only public clock and mood state.
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
   alter publication supabase_realtime add table public.game_clock;
 end if;
end $$;
commit;
