begin;
alter table public.game_clock add column rainbow_mode boolean not null default false;
alter table public.game_clock add constraint one_garden_mood check(not (angry_mode and rainbow_mode));
create or replace function public.garden_clock() returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('server_time',now(),'epoch',epoch,'angry_mode',angry_mode,'rainbow_mode',rainbow_mode) from public.game_clock
$$;
create or replace function private.set_angry_mode(p_enabled boolean) returns boolean language plpgsql security definer set search_path='' as $$
begin
 perform private.require_role('GARDENER');
 if p_enabled is null then raise exception 'Choose whether Angry Mode is enabled'; end if;
 update public.game_clock set angry_mode=p_enabled,rainbow_mode=case when p_enabled then false else rainbow_mode end where id=true;
 return p_enabled;
end $$;
create function private.set_rainbow_mode(p_enabled boolean) returns boolean language plpgsql security definer set search_path='' as $$
begin
 perform private.require_role('GARDENER');
 if p_enabled is null then raise exception 'Choose whether Rainbow Mode is enabled'; end if;
 update public.game_clock set rainbow_mode=p_enabled,angry_mode=case when p_enabled then false else angry_mode end where id=true;
 return p_enabled;
end $$;
create function public.set_rainbow_mode(p_enabled boolean) returns boolean language sql security invoker set search_path='' as $$select private.set_rainbow_mode(p_enabled)$$;
revoke all on function private.set_rainbow_mode(boolean),public.set_rainbow_mode(boolean) from public,anon,authenticated;
grant execute on function private.set_rainbow_mode(boolean),public.set_rainbow_mode(boolean) to authenticated;
commit;
