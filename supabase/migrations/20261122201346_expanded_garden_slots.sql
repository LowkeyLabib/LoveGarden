begin;
alter table public.decoration_slots add column capacity smallint not null default 0 check (capacity between 0 and 3);

insert into public.planting_spots(id,x,y) values
 (15,496,56),
 (16,528,72),
 (17,560,88),
 (18,464,72),
 (19,496,88),
 (20,528,104),
 (21,608,288),
 (22,640,304),
 (23,672,320),
 (24,576,304),
 (25,608,320),
 (26,640,336),
 (27,80,280),
 (28,112,296),
 (29,144,312),
 (30,48,296),
 (31,80,312),
 (32,112,328),
 (33,192,16),
 (34,224,32),
 (35,256,48),
 (36,160,32),
 (37,192,48),
 (38,224,64);

insert into public.decoration_slots(id,capacity) values
 (10,3),
 (11,2),
 (12,3),
 (13,3),
 (14,3),
 (15,2),
 (16,3),
 (17,2),
 (18,3),
 (19,3),
 (20,2),
 (21,3),
 (22,3),
 (23,2),
 (24,1),
 (25,1),
 (26,1),
 (27,1);

insert into public.gift_locations(id,name) values
 (5,'Along the fern trail'),
 (6,'By the orchard path'),
 (7,'In the sunset meadow'),
 (8,'Near the lower pond bank'),
 (9,'Beyond the north beds');

commit;
