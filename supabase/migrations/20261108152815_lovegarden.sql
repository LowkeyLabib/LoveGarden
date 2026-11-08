-- LoveGarden: public scenery, private memories, server-authoritative mutations.
begin;
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null unique check (role in ('GARDENER','CARETAKER'))
);
create table public.game_clock (
  id boolean primary key default true check(id),
  epoch timestamptz not null default '2026-01-01T00:00:00Z'
);
insert into public.game_clock default values;
create table public.flower_types (id text primary key, name text not null, color text not null);
insert into public.flower_types values ('rose','Blush rose','#df8c9e'),('daisy','Honey daisy','#f0cf7c'),('tulip','Peach tulip','#e9a489'),('lavender','Dreamy lavender','#a69ccf'),('cosmos','Pink cosmos','#dd9fbe'),('bluebell','Bluebell','#88b0cf');
create table public.planting_spots (id int primary key, x int not null, y int not null);
insert into public.planting_spots select n, 480 + (n%5)*120, 435 + (n/5)*105 from generate_series(0,14) n;
create table public.gift_locations (id int primary key, name text not null);
insert into public.gift_locations values (0,'By the willow'),(1,'Behind the hydrangeas'),(2,'Beside the pond'),(3,'Under the wishing tree'),(4,'Near the garden gate');
create table public.decoration_slots (id int primary key);
insert into public.decoration_slots select generate_series(0,9);
create table public.seeds (
  id uuid primary key default gen_random_uuid(),
  spot int not null unique references public.planting_spots(id),
  flower_type text not null references public.flower_types(id),
  planted_at timestamptz not null default now(),
  watered_at timestamptz,
  opened_at timestamptz,
  check (opened_at is null or watered_at is not null)
);
create table public.flower_content (
  seed_id uuid primary key references public.seeds(id) on delete cascade,
  message text not null default '' check(length(message)<=4000),
  spotify_url text check(spotify_url is null or spotify_url ~ '^https://open[.]spotify[.]com/track/[A-Za-z0-9]{22}$'),
  photo_path text check(length(photo_path)<=200),
  caption text not null default '' check(length(caption)<=300)
);
create table public.gift_types (id text primary key, name text not null, reward int not null check(reward>0));
insert into public.gift_types values ('letter','Love letter',20),('chocolate','Chocolates',25),('teddy','Teddy bear',30),('bouquet','Bouquet',40),('box','Gift box',50),('special','Special present',100);
create table public.gifts (
  id uuid primary key default gen_random_uuid(),
  kind text not null references public.gift_types(id),
  location int not null references public.gift_locations(id),
  created_at timestamptz not null default now(),
  claimed_at timestamptz
);
create unique index one_hidden_gift_per_location on public.gifts(location) where claimed_at is null;
create table public.gift_content (
  gift_id uuid primary key references public.gifts(id) on delete cascade,
  message text not null default '' check(length(message)<=4000),
  spotify_url text check(spotify_url is null or spotify_url ~ '^https://open[.]spotify[.]com/track/[A-Za-z0-9]{22}$'),
  photo_path text check(length(photo_path)<=200),
  caption text not null default '' check(length(caption)<=300)
);
create table public.wallets (user_id uuid primary key references public.profiles(id) on delete cascade, balance int not null default 0 check(balance>=0));
create table public.store_catalog (id text primary key, name text not null, description text not null, price int not null check(price>0));
insert into public.store_catalog values
('lantern','Fairy lantern','A little golden light for moonlit evenings.',75),
('bench','Garden bench','A quiet place to sit together, always.',100),
('butterfly','Butterfly haven','A tiny gathering place for fluttering friends.',150),
('arch','Flower arch','A doorway wrapped in climbing roses.',200),
('fountain','Little fountain','A soft ripple, a wish, a moment of peace.',250),
('cottage','Tiny cottage','A storybook home for your sweetest dreams.',500),
('birdhouse','Songbird house','A cozy home for the morning chorus.',125),
('heart','Heart ornament','A small reminder of a very big love.',80),
('tree','Wishing tree','Tie a little hope to every branch.',300),
('seasonal','Harvest pumpkins','Warm autumn colors for your little world.',90);
create table public.inventory (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  catalog_id text not null references public.store_catalog(id),
  purchased_at timestamptz not null default now()
);
create index inventory_user on public.inventory(user_id);
create index inventory_catalog on public.inventory(catalog_id);
create table public.decorations (
  inventory_id uuid primary key references public.inventory(id) on delete cascade,
  catalog_id text not null references public.store_catalog(id),
  slot int not null unique references public.decoration_slots(id)
);
create index decorations_catalog on public.decorations(catalog_id);
create table public.point_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount int not null check(amount<>0),
  reason text not null check(reason in ('flower','gift','purchase')),
  source_id uuid not null,
  created_at timestamptz not null default now(),
  unique(reason,source_id)
);
create index transactions_user_date on public.point_transactions(user_id,created_at desc);
create index seeds_type on public.seeds(flower_type);
create index gifts_kind on public.gifts(kind);
create index gifts_location on public.gifts(location);

-- Private helpers have no exposed PostgREST schema and a fixed search_path.
create function private.my_role() returns text language sql stable security definer set search_path='' as $$
 select role from public.profiles where id=auth.uid()
$$;
create function private.require_role(wanted text) returns void language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or private.my_role() is distinct from wanted then raise exception 'This action is only available to the %', lower(wanted) using errcode='42501'; end if;
end $$;
create function private.daylight(t timestamptz) returns numeric language sql stable set search_path='' as $$
 select floor(extract(epoch from (t-epoch))/1200)*600 + least(600, extract(epoch from (t-epoch))-floor(extract(epoch from (t-epoch))/1200)*1200) from public.game_clock
$$;
create function private.validate_content(p_message text,p_spotify text,p_photo text,p_caption text) returns void language plpgsql security definer set search_path='' as $$
begin
 perform private.require_role('GARDENER');
 if length(coalesce(p_message,''))>4000 or length(coalesce(p_caption,''))>300 then raise exception 'Your message or caption is too long'; end if;
 if p_spotify is not null and p_spotify !~ '^https://open[.]spotify[.]com/track/[A-Za-z0-9]{22}$' then raise exception 'Use a Spotify track link'; end if;
 if p_photo is not null and (split_part(p_photo,'/',1)<>auth.uid()::text or not exists(select 1 from storage.objects where bucket_id='memories' and name=p_photo)) then raise exception 'Photo is not an authorized upload'; end if;
end $$;

create function private.plant_seed(p_id uuid,p_spot int,p_type text,p_message text,p_spotify text,p_photo text,p_caption text) returns uuid language plpgsql security definer set search_path='' as $$
begin
 perform private.require_role('GARDENER');
 if exists(select 1 from public.seeds where id=p_id) then return p_id; end if;
 perform private.validate_content(p_message,p_spotify,p_photo,p_caption);
 if trim(coalesce(p_message,''))='' and p_spotify is null and p_photo is null then raise exception 'Add a message, song, or photograph'; end if;
 insert into public.seeds(id,spot,flower_type) values(p_id,p_spot,p_type);
 insert into public.flower_content values(p_id,coalesce(p_message,''),p_spotify,p_photo,coalesce(p_caption,''));
 return p_id;
end $$;
create function private.hide_gift(p_id uuid,p_location int,p_kind text,p_message text,p_spotify text,p_photo text,p_caption text) returns uuid language plpgsql security definer set search_path='' as $$
begin
 perform private.require_role('GARDENER');
 if exists(select 1 from public.gifts where id=p_id) then return p_id; end if;
 perform private.validate_content(p_message,p_spotify,p_photo,p_caption);
 insert into public.gifts(id,location,kind) values(p_id,p_location,p_kind);
 insert into public.gift_content values(p_id,coalesce(p_message,''),p_spotify,p_photo,coalesce(p_caption,''));
 return p_id;
end $$;
create function private.water_seed(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 perform private.require_role('CARETAKER');
 update public.seeds set watered_at=now() where id=p_id and watered_at is null;
 if not exists(select 1 from public.seeds where id=p_id) then raise exception 'Flower not found'; end if;
end $$;
create function private.open_memory(p_id uuid,p_kind text) returns jsonb language plpgsql security definer set search_path='' as $$
declare reward int; already_opened timestamptz; watered timestamptz; result jsonb; mine text;
begin
 mine:=private.my_role();
 if auth.uid() is null or mine is null then raise exception 'This memory is private' using errcode='42501'; end if;
 if p_kind='flower' then
   select watered_at,opened_at into watered,already_opened from public.seeds where id=p_id for update;
   if not found then raise exception 'Flower not found'; end if;
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
   -- The source lock serializes competing opens; the unique ledger key is defense in depth.
   insert into public.point_transactions(user_id,amount,reason,source_id) values(auth.uid(),reward,p_kind,p_id);
   update public.wallets set balance=balance+reward where user_id=auth.uid();
   if p_kind='flower' then update public.seeds set opened_at=now() where id=p_id;
   else update public.gifts set claimed_at=now() where id=p_id; end if;
   result:=result || jsonb_build_object('awarded',reward);
 else result:=result || jsonb_build_object('awarded',0); end if;
 return result;
end $$;
create function private.purchase(p_catalog text,p_request uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare cost int; old_catalog text; funds int;
begin
 perform private.require_role('CARETAKER');
 insert into public.wallets(user_id) values(auth.uid()) on conflict do nothing;
 select balance into funds from public.wallets where user_id=auth.uid() for update;
 select catalog_id into old_catalog from public.inventory where id=p_request and user_id=auth.uid();
 if found then
   if old_catalog<>p_catalog then raise exception 'Purchase request already used for a different item'; end if;
   return p_request;
 end if;
 select price into cost from public.store_catalog where id=p_catalog;
 if cost is null then raise exception 'Decoration not found'; end if;
 if funds<cost then raise exception 'A few more LovePoints are needed'; end if;
 insert into public.inventory(id,user_id,catalog_id) values(p_request,auth.uid(),p_catalog);
 update public.wallets set balance=balance-cost where user_id=auth.uid();
 insert into public.point_transactions(user_id,amount,reason,source_id) values(auth.uid(),-cost,'purchase',p_request);
 return p_request;
end $$;
create function private.place_decoration(p_inventory uuid,p_slot int) returns void language plpgsql security definer set search_path='' as $$
declare item text;
begin
 perform private.require_role('CARETAKER');
 select catalog_id into item from public.inventory where id=p_inventory and user_id=auth.uid() for update;
 if item is null then raise exception 'This decoration is not in your collection'; end if;
 if p_slot is null then delete from public.decorations where inventory_id=p_inventory; return; end if;
 insert into public.decorations(inventory_id,catalog_id,slot) values(p_inventory,item,p_slot)
 on conflict(inventory_id) do update set slot=excluded.slot;
end $$;

-- Thin invoker endpoints; only private implementations can mutate tables.
create function public.plant_seed(p_id uuid,p_spot int,p_type text,p_message text,p_spotify text,p_photo text,p_caption text) returns uuid language sql security invoker set search_path='' as $$select private.plant_seed(p_id,p_spot,p_type,p_message,p_spotify,p_photo,p_caption)$$;
create function public.hide_gift(p_id uuid,p_location int,p_kind text,p_message text,p_spotify text,p_photo text,p_caption text) returns uuid language sql security invoker set search_path='' as $$select private.hide_gift(p_id,p_location,p_kind,p_message,p_spotify,p_photo,p_caption)$$;
create function public.water_seed(p_id uuid) returns void language sql security invoker set search_path='' as $$select private.water_seed(p_id)$$;
create function public.open_memory(p_id uuid,p_kind text) returns jsonb language sql security invoker set search_path='' as $$select private.open_memory(p_id,p_kind)$$;
create function public.purchase(p_catalog text,p_request uuid) returns uuid language sql security invoker set search_path='' as $$select private.purchase(p_catalog,p_request)$$;
create function public.place_decoration(p_inventory uuid,p_slot int) returns void language sql security invoker set search_path='' as $$select private.place_decoration(p_inventory,p_slot)$$;
create function public.garden_clock() returns jsonb language sql stable security invoker set search_path='' as $$select jsonb_build_object('server_time',now(),'epoch',epoch) from public.game_clock$$;

-- Read grants are explicit; there are no direct mutation grants or mutation policies.
do $$ declare t text; begin
 foreach t in array array['profiles','game_clock','flower_types','planting_spots','gift_locations','decoration_slots','seeds','flower_content','gift_types','gifts','gift_content','wallets','store_catalog','inventory','decorations','point_transactions'] loop
   execute format('alter table public.%I enable row level security',t);
   execute format('revoke all on public.%I from anon, authenticated',t);
 end loop;
 foreach t in array array['game_clock','flower_types','planting_spots','gift_locations','decoration_slots','seeds','gift_types','gifts','store_catalog','decorations'] loop
   execute format('grant select on public.%I to anon,authenticated',t);
   execute format('create policy public_scenery on public.%I for select to anon,authenticated using(true)',t);
 end loop;
 foreach t in array array['flower_content','gift_content'] loop
   execute format('grant select on public.%I to authenticated',t);
   execute format('create policy two_members_only on public.%I for select to authenticated using((select private.my_role()) is not null)',t);
 end loop;
end $$;
grant select on public.profiles,public.wallets,public.inventory,public.point_transactions to authenticated;
create policy own_profile on public.profiles for select to authenticated using(id=(select auth.uid()));
create policy own_wallet on public.wallets for select to authenticated using(user_id=(select auth.uid()) and (select private.my_role())='CARETAKER');
create policy owned_inventory on public.inventory for select to authenticated using(user_id=(select auth.uid()) and (select private.my_role())='CARETAKER');
create policy own_transactions on public.point_transactions for select to authenticated using(user_id=(select auth.uid()) and (select private.my_role())='CARETAKER');

-- Revoke default PUBLIC execute on every application function, including helpers.
do $$ declare f record; begin
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on p.pronamespace=n.oid
 where (n.nspname='private' and p.proname in ('my_role','require_role','daylight','validate_content','plant_seed','hide_gift','water_seed','open_memory','purchase','place_decoration'))
 or (n.nspname='public' and p.proname in ('plant_seed','hide_gift','water_seed','open_memory','purchase','place_decoration','garden_clock')) loop
 execute format('revoke all on function %s from public,anon,authenticated',f.signature);
 end loop;
end $$;
grant execute on function private.my_role() to authenticated;
grant execute on function private.plant_seed(uuid,int,text,text,text,text,text), private.hide_gift(uuid,int,text,text,text,text,text), private.water_seed(uuid), private.open_memory(uuid,text), private.purchase(text,uuid),private.place_decoration(uuid,int) to authenticated;
grant execute on function public.plant_seed(uuid,int,text,text,text,text,text), public.hide_gift(uuid,int,text,text,text,text,text), public.water_seed(uuid), public.open_memory(uuid,text), public.purchase(text,uuid), public.place_decoration(uuid,int) to authenticated;
grant execute on function public.garden_clock() to anon,authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('memories','memories',false,5242880,array['image/jpeg','image/png','image/webp']);
create policy memories_upload on storage.objects for insert to authenticated with check(bucket_id='memories' and (select private.my_role())='GARDENER' and split_part(name,'/',1)=(select auth.uid())::text);
create policy memories_read on storage.objects for select to authenticated using(bucket_id='memories' and (select private.my_role()) is not null);
-- Only unused uploads can be cleaned up by the gardener; attached memories persist.
create policy memories_cleanup on storage.objects for delete to authenticated using(bucket_id='memories' and (select private.my_role())='GARDENER' and split_part(name,'/',1)=(select auth.uid())::text and not exists(select 1 from public.flower_content where photo_path=name) and not exists(select 1 from public.gift_content where photo_path=name));
-- Publish only public appearance and lifecycle rows, never notes, photos or wallet data.
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
   alter publication supabase_realtime add table public.seeds,public.gifts,public.decorations;
 end if;
end $$;
commit;

