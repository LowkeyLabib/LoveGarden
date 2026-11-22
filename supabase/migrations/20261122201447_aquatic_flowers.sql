begin;

alter table public.flower_types
 add column habitat text not null default 'land' check (habitat in ('land','water'));
alter table public.planting_spots
 add column habitat text not null default 'land' check (habitat in ('land','water')),
 add column pond_slot int references public.decoration_slots(id),
 add check (pond_slot is null or habitat='water');
create index planting_spots_pond_slot on public.planting_spots(pond_slot) where pond_slot is not null;

insert into public.flower_types(id,name,color,habitat) values
 ('sunflower','Sunflower','#e1b74e','land'),
 ('peony','Peony','#d9849c','land'),
 ('forget-me-not','Forget-Me-Not','#86a8d7','land'),
 ('jasmine','Jasmine','#f5ecd5','land'),
 ('pink-water-lily','Pink Water Lily','#df95b1','water'),
 ('white-water-lily','White Water Lily','#f5edd6','water'),
 ('moon-lily','Moon Lily','#9c9ee1','water');

insert into public.planting_spots(id,x,y,habitat,pond_slot) values
 (100,65.60000000000002,100,'water',null),
 (101,36.80000000000001,125.6,'water',null),
 (102,120,107.19999999999999,'water',null),
 (103,48.80000000000001,148.4,'water',null),
 (104,156,121.19999999999999,'water',null),
 (105,80,164.8,'water',null),
 (106,183.20000000000002,141.2,'water',null),
 (107,119.20000000000002,174.8,'water',null),
 (1030,289,-39,'water',10),
 (1031,304,-48,'water',10),
 (1032,319,-38,'water',10),
 (1033,369,1,'water',11),
 (1034,384,-8,'water',11),
 (1035,399,2,'water',11),
 (1036,625,129,'water',12),
 (1037,640,120,'water',12),
 (1038,655,130,'water',12),
 (1039,721,177,'water',13),
 (1040,736,168,'water',13),
 (1041,751,178,'water',13),
 (1042,817,225,'water',14),
 (1043,832,216,'water',14),
 (1044,847,226,'water',14),
 (1045,737,265,'water',15),
 (1046,752,256,'water',15),
 (1047,767,266,'water',15),
 (1048,497,353,'water',16),
 (1049,512,344,'water',16),
 (1050,527,354,'water',16),
 (1051,449,409,'water',17),
 (1052,464,400,'water',17),
 (1053,479,410,'water',17),
 (1054,353,457,'water',18),
 (1055,368,448,'water',18),
 (1056,383,458,'water',18),
 (1057,241,401,'water',19),
 (1058,256,392,'water',19),
 (1059,271,402,'water',19),
 (1060,145,369,'water',20),
 (1061,160,360,'water',20),
 (1062,175,370,'water',20),
 (1063,-47,257,'water',21),
 (1064,-32,248,'water',21),
 (1065,-17,258,'water',21),
 (1066,-143,209,'water',22),
 (1067,-128,200,'water',22),
 (1068,-113,210,'water',22),
 (1069,-79,161,'water',23),
 (1070,-64,152,'water',23),
 (1071,-49,162,'water',23);

-- A bay is the common lock for planting and for moving/removing its pond.
-- Permanent spot IDs keep expired and manually removed memories queryable.
create function private.check_flower_habitat()
returns trigger language plpgsql set search_path='' as $$
declare site_habitat text; flower_habitat text; parent_slot int;
begin
 select habitat,pond_slot into site_habitat,parent_slot from public.planting_spots where id=new.spot;
 select habitat into flower_habitat from public.flower_types where id=new.flower_type;
 if site_habitat is null or flower_habitat is null then return new; end if;
 if site_habitat<>flower_habitat then raise exception 'This flower needs a different planting habitat'; end if;
 if parent_slot is not null then
  perform 1 from public.decoration_slots where id=parent_slot for update;
  if not exists(select 1 from public.decorations where slot=parent_slot and catalog_id='koi-pond') then
   raise exception 'This planting spot needs a placed Koi Pond';
  end if;
 end if;
 return new;
end $$;
create trigger check_flower_habitat before insert on public.seeds
for each row execute function private.check_flower_habitat();

create function private.keep_occupied_pond()
returns trigger language plpgsql set search_path='' as $$
begin
 if old.catalog_id='koi-pond' then
  if tg_op='DELETE' or new.slot<>old.slot or new.catalog_id<>old.catalog_id then
   perform 1 from public.decoration_slots where id=old.slot for update;
   if exists (
    select 1 from public.planting_spots p join public.seeds s on s.spot=p.id
    where p.pond_slot=old.slot and s.removed_at is null
     and (s.opened_at is null or s.opened_at>clock_timestamp()-interval '2 minutes')
   ) then raise exception 'Remove the active lilies or let claimed blooms fade before moving this pond'; end if;
  end if;
 end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end $$;
create trigger keep_occupied_pond before update of slot,catalog_id or delete on public.decorations
for each row execute function private.keep_occupied_pond();

commit;
