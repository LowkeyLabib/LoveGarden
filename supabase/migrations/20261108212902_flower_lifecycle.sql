-- Keep all historical rows. opened_at is the atomic reward-claim timestamp.
begin;
alter table public.seeds add column removed_at timestamptz;
alter table public.seeds drop constraint seeds_spot_key;
create index seeds_live_spot on public.seeds(spot,opened_at) where removed_at is null;

create or replace function private.plant_seed(p_id uuid,p_spot int,p_type text,p_message text,p_spotify text,p_photo text,p_caption text) returns uuid language plpgsql security definer set search_path='' as $$
begin
 perform private.require_role('GARDENER');
 -- Serialize competing plants on a permanent spot row, including an empty spot.
 perform 1 from public.planting_spots where id=p_spot for update;
 if not found then raise exception 'Planting spot not found'; end if;
 if exists(select 1 from public.seeds where id=p_id) then return p_id; end if;
 if exists(select 1 from public.seeds where spot=p_spot and removed_at is null and (opened_at is null or opened_at>clock_timestamp()-interval '2 minutes')) then
   raise exception 'This planting spot already holds a flower';
 end if;
 perform private.validate_content(p_message,p_spotify,p_photo,p_caption);
 if trim(coalesce(p_message,''))='' and p_spotify is null and p_photo is null then raise exception 'Add a message, song, or photograph'; end if;
 insert into public.seeds(id,spot,flower_type) values(p_id,p_spot,p_type);
 insert into public.flower_content values(p_id,coalesce(p_message,''),p_spotify,p_photo,coalesce(p_caption,''));
 return p_id;
end $$;

create or replace function private.water_seed(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare removed timestamptz;
begin
 perform private.require_role('CARETAKER');
 select removed_at into removed from public.seeds where id=p_id for update;
 if not found then raise exception 'Flower not found'; end if;
 if removed is not null then raise exception 'This flower has left the garden'; end if;
 update public.seeds set watered_at=now() where id=p_id and watered_at is null;
end $$;

create or replace function private.open_memory(p_id uuid,p_kind text) returns jsonb language plpgsql security definer set search_path='' as $$
declare reward int; already_opened timestamptz; watered timestamptz; removed timestamptz; result jsonb; mine text;
begin
 mine:=private.my_role();
 if auth.uid() is null or mine is null then raise exception 'This memory is private' using errcode='42501'; end if;
 if p_kind='flower' then
   select watered_at,opened_at,removed_at into watered,already_opened,removed from public.seeds where id=p_id for update;
   if not found then raise exception 'Flower not found'; end if;
   if mine='CARETAKER' and already_opened is null and removed is not null then raise exception 'This flower was removed before it was collected'; end if;
   if mine='CARETAKER' and (watered is null or private.daylight(now())-private.daylight(watered)<300) then raise exception 'This flower is still growing'; end if;
   reward:=10;
   select to_jsonb(c) into result from public.flower_content c where seed_id=p_id;
 elsif p_kind='gift' then
   select g.claimed_at,t.reward into already_opened,reward from public.gifts g join public.gift_types t on t.id=g.kind where g.id=p_id for update of g;
   if not found then raise exception 'Gift not found'; end if;
   select to_jsonb(c) into result from public.gift_content c where gift_id=p_id;
 else raise exception 'Unknown memory type'; end if;
 if mine='CARETAKER' and already_opened is null then
   insert into public.wallets(user_id) values(auth.uid()) on conflict do nothing;
   -- The source lock and unique ledger key prevent duplicate rewards, even across removal.
   insert into public.point_transactions(user_id,amount,reason,source_id) values(auth.uid(),reward,p_kind,p_id);
   update public.wallets set balance=balance+reward where user_id=auth.uid();
   if p_kind='flower' then update public.seeds set opened_at=clock_timestamp() where id=p_id returning opened_at into already_opened;
   else update public.gifts set claimed_at=now() where id=p_id; end if;
   result:=result || jsonb_build_object('awarded',reward);
 else result:=result || jsonb_build_object('awarded',0); end if;
 if p_kind='flower' then result:=result || jsonb_build_object('opened_at',already_opened); end if;
 return result;
end $$;

create function private.remove_seed(p_id uuid) returns timestamptz language plpgsql security definer set search_path='' as $$
declare removed timestamptz;
begin
 perform private.require_role('GARDENER');
 select removed_at into removed from public.seeds where id=p_id for update;
 if not found then raise exception 'Flower not found'; end if;
 if removed is null then
   update public.seeds set removed_at=clock_timestamp() where id=p_id returning removed_at into removed;
 end if;
 return removed;
end $$;
create function public.remove_seed(p_id uuid) returns timestamptz language sql security invoker set search_path='' as $$select private.remove_seed(p_id)$$;
revoke all on function private.remove_seed(uuid),public.remove_seed(uuid) from public,anon,authenticated;
grant execute on function private.remove_seed(uuid),public.remove_seed(uuid) to authenticated;
-- Existing RLS, read-only table grants, private content, storage and realtime remain intact.
commit;
