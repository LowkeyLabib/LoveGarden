begin;

alter table public.store_catalog
 add column placement_size smallint not null default 0 check (placement_size between 0 and 3);

insert into public.store_catalog(id,name,description,price,category,placement_size) values
 ('garden-birdhouse','Birdhouse','A painted nesting box on a cedar post.',40,'DECORATION',1),
 ('heart-stepping-stones','Heart Stepping Stones','Three hand-cut rose quartz hearts.',50,'DECORATION',1),
 ('glowing-mushrooms','Glowing Mushrooms','Amber and lilac caps that glow after dusk.',60,'DECORATION',1),
 ('flower-cart','Flower Cart','A wooden handcart brimming with blooms.',80,'DECORATION',1),
 ('picnic-spot','Picnic Spot','A gingham blanket and a basket for two.',150,'DECORATION',2),
 ('garden-swing','Garden Swing','A two-seat swing beneath a timber frame.',180,'DECORATION',2),
 ('koi-pond','Koi Pond','A stone-lined pond with koi and space for lilies.',250,'DECORATION',2),
 ('cherry-blossom-tree','Cherry Blossom Tree','A layered canopy of spring blossoms.',300,'DECORATION',2),
 ('rose-heart-arch','Rose Heart Arch','A heart-shaped trellis wrapped in climbing roses.',400,'DECORATION',3),
 ('romantic-gazebo','Romantic Gazebo','A lantern-lit pavilion with a bench for two.',550,'DECORATION',3),
 ('moonlit-bridge','Moonlit Bridge','A curved timber bridge with four path lights.',650,'DECORATION',3),
 ('fairy-cottage','Fairy Cottage','A mossy storybook cottage with warm windows.',750,'DECORATION',3);

-- Bays reserve their full footprint even when a smaller piece occupies them.
-- The existing slot uniqueness handles simultaneous placements.
create function private.check_decoration_footprint()
returns trigger language plpgsql set search_path='' as $$
begin
 if exists (
  select 1 from public.store_catalog c cross join public.decoration_slots s
  where c.id=new.catalog_id and s.id=new.slot and c.placement_size>s.capacity
 ) then raise exception 'This decoration needs a larger clearing'; end if;
 return new;
end $$;
create trigger check_decoration_footprint
before insert or update of slot,catalog_id on public.decorations
for each row execute function private.check_decoration_footprint();

commit;
