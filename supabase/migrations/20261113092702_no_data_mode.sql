-- A reversible presentation flag. No game records or existing moods are changed.
begin;
alter table public.game_clock add column no_data_mode boolean not null default false;
create or replace function public.garden_clock() returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('server_time',now(),'epoch',epoch,'angry_mode',angry_mode,'rainbow_mode',rainbow_mode,'no_data_mode',no_data_mode) from public.game_clock
$$;
create function private.set_no_data_mode(p_enabled boolean) returns boolean language plpgsql security definer set search_path='' as $$
begin
 perform private.require_role('GARDENER');
 if p_enabled is null then raise exception 'Choose whether NoData Mode is enabled'; end if;
 update public.game_clock set no_data_mode=p_enabled where id=true;
 return p_enabled;
end $$;
create function public.set_no_data_mode(p_enabled boolean) returns boolean language sql security invoker set search_path='' as $$select private.set_no_data_mode(p_enabled)$$;
revoke all on function private.set_no_data_mode(boolean),public.set_no_data_mode(boolean) from public,anon,authenticated;
grant execute on function private.set_no_data_mode(boolean),public.set_no_data_mode(boolean) to authenticated;
-- game_clock already has public read-only RLS and realtime publication.
commit;
