begin;

alter table public.fashion_catalog
  add column collection text not null default 'classic'
  check (collection in ('classic', 'desi'));

-- One catalog entry per purchase, with one wearable variant per eligible character.
with desi(id, name, description, price, rarity, matching) as (
 values
  ('desi-floral-kurti', 'Floral Kurti', 'A rose kurti with embroidered blossoms.', 90, 'common', false),
  ('desi-cotton-kameez', 'Cotton Kameez', 'Soft teal cotton with a woven border.', 110, 'common', false),
  ('desi-pastel-salwar-kameez', 'Pastel Salwar Kameez', 'A lilac kameez with a mint dupatta.', 120, 'uncommon', false),
  ('desi-anarkali-dress', 'Anarkali Dress', 'A flowing purple Anarkali with gold trim.', 160, 'uncommon', false),
  ('desi-lal-par-sharee', 'Lal-Par Sharee', 'An ivory Bengali sharee with a red border.', 180, 'rare', false),
  ('desi-black-sharee', 'Black Sharee', 'A black sharee with a warm gold border.', 200, 'rare', false),
  ('desi-jamdani-sharee', 'Jamdani Sharee', 'A sea-green sharee with woven Jamdani motifs.', 250, 'epic', false),
  ('desi-festive-lehenga', 'Festive Lehenga', 'A saffron skirt with an embroidered pink dupatta.', 300, 'epic', false),
  ('desi-casual-kurti-panjabi', 'Casual Kurti + Panjabi', 'A floral kurti and a moss-green cotton panjabi.', 250, 'rare', true),
  ('desi-pastel-kameez-panjabi', 'Pastel Kameez + Panjabi', 'A mint kameez paired with a lavender panjabi.', 300, 'rare', true),
  ('desi-lal-par-sharee-white-panjabi', 'Lal-Par Sharee + White Panjabi', 'An ivory sharee and white panjabi with red accents.', 350, 'rare', true),
  ('desi-black-sharee-black-panjabi', 'Black Sharee + Black Panjabi', 'Coordinated black outfits with copper trim.', 400, 'epic', true),
  ('desi-eid-special-matching-set', 'Eid Special Matching Set', 'An emerald Anarkali and a coordinated festive panjabi.', 450, 'epic', true),
  ('desi-jamdani-sharee-premium-panjabi', 'Jamdani Sharee + Premium Panjabi', 'A blue Jamdani sharee and indigo panjabi with ivory details.', 550, 'epic', true),
  ('desi-wedding-inspired-couple-set', 'Wedding-Inspired Couple Set', 'A red embroidered lehenga and a cream panjabi with gold trim.', 750, 'legendary', true)
), store_items as (
 insert into public.store_catalog(id, name, description, price, category)
 select id, name, description, price, 'FASHION' from desi
 returning id
), fashion_items as (
 insert into public.fashion_catalog(catalog_id, slot, rarity, ownership_target, matching_set_id, collection)
 select d.id, 'outfit', d.rarity,
   case when d.matching then 'BOTH' else 'MEHEZAD' end,
   case when d.matching then d.id end,
   'desi'
 from desi d join store_items s using (id)
 returning catalog_id, ownership_target
)
insert into public.fashion_variants(catalog_id, character, slot, sprite_ref)
select f.catalog_id, wearer.character, 'outfit',
  'fashion/' || lower(wearer.character) || '/' || f.catalog_id
from fashion_items f
cross join (values ('MEHEZAD'), ('LABIB')) as wearer(character)
where wearer.character = 'MEHEZAD' or f.ownership_target = 'BOTH';

-- Clothing purchases must go through the wardrobe's idempotent purchase RPC.
create or replace function private.purchase(p_catalog text,p_request uuid)
returns uuid language plpgsql security definer set search_path='' as $$
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
 select price into cost from public.store_catalog where id=p_catalog and category='DECORATION';
 if cost is null then raise exception 'Decoration not found'; end if;
 if funds<cost then raise exception 'A few more LovePoints are needed'; end if;
 insert into public.inventory(id,user_id,catalog_id) values(p_request,auth.uid(),p_catalog);
 update public.wallets set balance=balance-cost where user_id=auth.uid();
 insert into public.point_transactions(user_id,amount,reason,source_id) values(auth.uid(),-cost,'purchase',p_request);
 return p_request;
end $$;

commit;
