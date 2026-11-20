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

commit;
