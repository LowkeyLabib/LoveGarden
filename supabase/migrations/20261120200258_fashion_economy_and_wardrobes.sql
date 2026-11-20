-- Fashion extends the existing caretaker-funded store without changing decoration ownership.
begin;

alter table public.store_catalog
  add column category text not null default 'DECORATION'
  check (category in ('DECORATION','FASHION'));
alter table public.store_catalog drop constraint store_catalog_price_check;
alter table public.store_catalog
  add constraint store_catalog_price_check
  check (price>0 or (category='FASHION' and price=0));

alter table public.point_transactions drop constraint point_transactions_reason_check;
alter table public.point_transactions
  add constraint point_transactions_reason_check
  check (reason in ('flower','gift','purchase','fashion_purchase'));

create table public.fashion_catalog (
  catalog_id text primary key references public.store_catalog(id) on delete restrict,
  slot text not null check (slot in ('outfit','headwear','accessory')),
  rarity text not null check (rarity in ('common','uncommon','rare','epic','legendary')),
  ownership_target text not null check (ownership_target in ('LABIB','MEHEZAD','BOTH')),
  matching_set_id text,
  is_default boolean not null default false,
  unique(catalog_id,slot),
  check ((ownership_target='BOTH')=(matching_set_id is not null))
);

create table public.fashion_variants (
  catalog_id text not null,
  character text not null check (character in ('LABIB','MEHEZAD')),
  slot text not null check (slot in ('outfit','headwear','accessory')),
  sprite_ref text not null check (length(sprite_ref) between 1 and 200),
  primary key(catalog_id,character,slot),
  foreign key(catalog_id,slot) references public.fashion_catalog(catalog_id,slot) on delete cascade
);

create table public.fashion_ownership (
  id uuid primary key,
  catalog_id text not null unique references public.fashion_catalog(catalog_id) on delete restrict,
  purchased_by uuid not null references public.profiles(id) on delete restrict,
  purchased_at timestamptz not null default now()
);
create index fashion_ownership_buyer_date on public.fashion_ownership(purchased_by,purchased_at desc);

create table public.character_wardrobe (
  character text not null check (character in ('LABIB','MEHEZAD')),
  slot text not null check (slot in ('outfit','headwear','accessory')),
  catalog_id text not null,
  equipped_at timestamptz not null default now(),
  primary key(character,slot),
  foreign key(catalog_id,character,slot)
    references public.fashion_variants(catalog_id,character,slot) on delete restrict
);

insert into public.store_catalog(id,name,description,price,category) values
('default-labib','Labib’s Classic Black','Labib’s free everyday black outfit.',0,'FASHION'),
('default-mehezad','Mehezad’s Garden Pink','Mehezad’s free everyday pink outfit.',0,'FASHION'),
('pink-summer-dress','Pink Summer Dress','A light pink dress for sunny garden days.',100,'FASHION'),
('cozy-hoodie','Cozy Hoodie','A soft hoodie for quiet evenings in the garden.',150,'FASHION'),
('cottagecore-dress','Cottagecore Dress','A storybook dress made for flowers and picnics.',200,'FASHION'),
('matching-pajamas','Matching Pajamas','A coordinated pajama set for both characters.',350,'FASHION'),
('matching-hoodies','Matching Hoodies','Cozy coordinated hoodies for both characters.',450,'FASHION'),
('romantic-formal-set','Romantic Formal Set','A coordinated formal look for special garden moments.',800,'FASHION');

insert into public.fashion_catalog(catalog_id,slot,rarity,ownership_target,matching_set_id,is_default) values
('default-labib','outfit','common','LABIB',null,true),
('default-mehezad','outfit','common','MEHEZAD',null,true),
('pink-summer-dress','outfit','common','MEHEZAD',null,false),
('cozy-hoodie','outfit','uncommon','MEHEZAD',null,false),
('cottagecore-dress','outfit','rare','MEHEZAD',null,false),
('matching-pajamas','outfit','rare','BOTH','matching-pajamas',false),
('matching-hoodies','outfit','epic','BOTH','matching-hoodies',false),
('romantic-formal-set','outfit','legendary','BOTH','romantic-formal-set',false);

insert into public.fashion_variants(catalog_id,character,slot,sprite_ref) values
('default-labib','LABIB','outfit','fashion/labib/default-black'),
('default-mehezad','MEHEZAD','outfit','fashion/mehezad/default-pink'),
('pink-summer-dress','MEHEZAD','outfit','fashion/mehezad/pink-summer-dress'),
('cozy-hoodie','MEHEZAD','outfit','fashion/mehezad/cozy-hoodie'),
('cottagecore-dress','MEHEZAD','outfit','fashion/mehezad/cottagecore-dress'),
('matching-pajamas','LABIB','outfit','fashion/labib/matching-pajamas'),
('matching-pajamas','MEHEZAD','outfit','fashion/mehezad/matching-pajamas'),
('matching-hoodies','LABIB','outfit','fashion/labib/matching-hoodies'),
('matching-hoodies','MEHEZAD','outfit','fashion/mehezad/matching-hoodies'),
('romantic-formal-set','LABIB','outfit','fashion/labib/romantic-formal-set'),
('romantic-formal-set','MEHEZAD','outfit','fashion/mehezad/romantic-formal-set');

insert into public.character_wardrobe(character,slot,catalog_id) values
('LABIB','outfit','default-labib'),
('MEHEZAD','outfit','default-mehezad');

create function private.purchase_fashion(p_catalog text,p_request uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  cost int;
  funds int;
  existing_id uuid;
  existing_catalog text;
begin
  perform private.require_role('CARETAKER');
  if p_request is null then raise exception 'A purchase request ID is required'; end if;

  insert into public.wallets(user_id) values(auth.uid()) on conflict do nothing;
  select balance into funds from public.wallets where user_id=auth.uid() for update;

  select id,catalog_id into existing_id,existing_catalog
  from public.fashion_ownership where id=p_request;
  if found then
    if existing_catalog<>p_catalog then
      raise exception 'Purchase request already used for a different item';
    end if;
    return jsonb_build_object('ownership_id',existing_id,'catalog_id',existing_catalog,'purchased',false,'balance',funds);
  end if;

  select id into existing_id
  from public.fashion_ownership where catalog_id=p_catalog;
  if found then
    return jsonb_build_object('ownership_id',existing_id,'catalog_id',p_catalog,'purchased',false,'balance',funds);
  end if;

  select s.price into cost
  from public.store_catalog s
  join public.fashion_catalog f on f.catalog_id=s.id
  where s.id=p_catalog and s.category='FASHION' and not f.is_default;
  if cost is null then raise exception 'Fashion item not found'; end if;
  if funds<cost then raise exception 'A few more LovePoints are needed'; end if;

  insert into public.fashion_ownership(id,catalog_id,purchased_by)
  values(p_request,p_catalog,auth.uid());
  update public.wallets set balance=balance-cost
  where user_id=auth.uid() and balance>=cost;
  if not found then raise exception 'A few more LovePoints are needed'; end if;
  insert into public.point_transactions(user_id,amount,reason,source_id)
  values(auth.uid(),-cost,'fashion_purchase',p_request);

  return jsonb_build_object('ownership_id',p_request,'catalog_id',p_catalog,'purchased',true,'balance',funds-cost);
end $$;

create function private.equip_fashion(p_catalog text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  wearer text;
  item_slot text;
  sprite text;
  default_item boolean;
begin
  wearer:=case private.my_role()
    when 'GARDENER' then 'LABIB'
    when 'CARETAKER' then 'MEHEZAD'
    else null
  end;
  if auth.uid() is null or wearer is null then
    raise exception 'This wardrobe belongs to Labib and Mehezad' using errcode='42501';
  end if;

  select v.slot,v.sprite_ref,f.is_default into item_slot,sprite,default_item
  from public.fashion_variants v
  join public.fashion_catalog f on f.catalog_id=v.catalog_id
  where v.catalog_id=p_catalog and v.character=wearer;
  if not found then raise exception 'This fashion item is not available for this character'; end if;
  if not default_item and not exists(
    select 1 from public.fashion_ownership where catalog_id=p_catalog
  ) then raise exception 'This fashion item has not been unlocked'; end if;

  insert into public.character_wardrobe(character,slot,catalog_id,equipped_at)
  values(wearer,item_slot,p_catalog,now())
  on conflict(character,slot) do update
  set catalog_id=excluded.catalog_id,equipped_at=excluded.equipped_at;

  return jsonb_build_object('character',wearer,'slot',item_slot,'catalog_id',p_catalog,'sprite_ref',sprite);
end $$;

create function public.purchase_fashion(p_catalog text,p_request uuid)
returns jsonb language sql security invoker set search_path='' as $$
  select private.purchase_fashion(p_catalog,p_request)
$$;
create function public.equip_fashion(p_catalog text)
returns jsonb language sql security invoker set search_path='' as $$
  select private.equip_fashion(p_catalog)
$$;

alter table public.fashion_catalog enable row level security;
alter table public.fashion_variants enable row level security;
alter table public.fashion_ownership enable row level security;
alter table public.character_wardrobe enable row level security;
revoke all on public.fashion_catalog,public.fashion_variants,public.fashion_ownership,public.character_wardrobe from anon,authenticated;

grant select on public.fashion_catalog,public.fashion_variants,public.character_wardrobe to anon,authenticated;
create policy public_fashion_catalog on public.fashion_catalog for select to anon,authenticated using(true);
create policy public_fashion_variants on public.fashion_variants for select to anon,authenticated using(true);
create policy public_equipped_fashion on public.character_wardrobe for select to anon,authenticated using(true);

grant select on public.fashion_ownership to anon,authenticated;
create policy members_see_fashion_ownership on public.fashion_ownership
for select to authenticated using((select private.my_role()) is not null);

revoke all on function private.purchase_fashion(text,uuid),private.equip_fashion(text),public.purchase_fashion(text,uuid),public.equip_fashion(text) from public,anon,authenticated;
grant execute on function private.purchase_fashion(text,uuid),private.equip_fashion(text),public.purchase_fashion(text,uuid),public.equip_fashion(text) to authenticated;

do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    alter publication supabase_realtime add table public.character_wardrobe;
  end if;
end $$;

commit;
