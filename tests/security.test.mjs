import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { daylightTotal, EPOCH } from '../src/lib/clock.mjs';
const gardener='10000000-0000-0000-0000-000000000001',caretaker='10000000-0000-0000-0000-000000000002',stranger='10000000-0000-0000-0000-000000000003';
const flower='20000000-0000-0000-0000-000000000001',gift='30000000-0000-0000-0000-000000000001',purchase='40000000-0000-0000-0000-000000000001';
test('PostgreSQL permissions, private storage, atomic rewards and purchases',async t=>{
 const db=new PGlite();await db.waitReady;
 // These are only platform fixtures. All app tables, policies and functions are the actual migration.
 await db.exec(`create role anon nologin; create role authenticated nologin;
 create schema auth; create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema public,auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;
 create schema storage;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
 alter table storage.objects enable row level security;
 grant usage on schema storage to anon,authenticated; grant select,insert,delete on storage.objects to anon,authenticated;
 insert into auth.users values('${gardener}'),('${caretaker}'),('${stranger}');`);
 for(const migration of (await readdir('supabase/migrations')).filter(f=>f.endsWith('.sql')).sort())await db.exec((await readFile(`supabase/migrations/${migration}`,'utf8')).replace(/^\uFEFF/,''));
 await db.exec(`insert into public.profiles values('${gardener}','GARDENER'),('${caretaker}','CARETAKER');`);
 const as=async(user,role='authenticated')=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user||'']);await db.exec(`set role ${role}`);};
 const one=async(sql,params=[]) => (await db.query(sql,params)).rows[0];
 const plant=()=>db.query('select public.plant_seed($1,0,$2,$3,null,null,$4)',[flower,'rose','Only for us','']);
 await t.test('guest and unassigned accounts cannot read private data or perform mutations',async()=>{
  await as(null,'anon');assert.equal((await one('select count(*)::int n from public.store_catalog')).n,10);
  await assert.rejects(()=>db.query('select * from public.flower_content'),/permission denied/);
  await assert.rejects(()=>db.query('select * from public.profiles'),/permission denied/);
  await assert.rejects(()=>db.query('select public.water_seed($1)',[flower]),/permission denied/);
  await assert.rejects(()=>plant(),/permission denied/);
  await as(stranger);assert.equal((await one('select count(*)::int n from public.flower_content')).n,0);
  await assert.rejects(()=>plant(),/gardener/);
  await assert.rejects(()=>db.query('insert into public.profiles values($1,$2)',[stranger,'GARDENER']),/permission denied/);
 });
 await t.test('gardener can plant and hide gifts but cannot water, claim points or buy',async()=>{
  await as(gardener);await plant();await plant();
  assert.equal((await one('select count(*)::int n from public.seeds')).n,1);
  await assert.rejects(()=>db.query('select public.water_seed($1)',[flower]),/caretaker/);
  await assert.rejects(()=>db.query('select public.purchase($1,$2)',['lantern',purchase]),/caretaker/);
  await assert.rejects(()=>db.query('update public.seeds set watered_at=now()'),/permission denied/);
  await db.query('select public.hide_gift($1,0,$2,$3,null,null,$4)',[gift,'special','A special surprise','']);
  assert.equal((await one('select public.open_memory($1,$2) result',[gift,'gift'])).result.awarded,0);
  assert.equal((await one('select claimed_at from public.gifts where id=$1',[gift])).claimed_at,null);
 });
 await t.test('private photos enforce both role and uploader folder',async()=>{
  const path=`${gardener}/photo.jpg`;
  await as(gardener);await db.query('insert into storage.objects(bucket_id,name) values($1,$2)',['memories',path]);
  await assert.rejects(()=>db.query('insert into storage.objects(bucket_id,name) values($1,$2)',['memories',`${caretaker}/forged.jpg`]),/row-level security/);
  await as(caretaker);assert.equal((await one('select count(*)::int n from storage.objects')).n,1);
  await assert.rejects(()=>db.query('insert into storage.objects(bucket_id,name) values($1,$2)',['memories',`${caretaker}/photo.jpg`]),/row-level security/);
  await as(stranger);assert.equal((await one('select count(*)::int n from storage.objects')).n,0);
  await as(null,'anon');assert.equal((await one('select count(*)::int n from storage.objects')).n,0);
 });
 await t.test('flower lifecycle validates server daylight and reward retries cannot duplicate points',async()=>{
  await as(caretaker);await assert.rejects(()=>plant(),/gardener/);
  await assert.rejects(()=>db.query('select public.hide_gift($1,1,$2,$3,null,null,$4)',[crypto.randomUUID(),'letter','','']),/gardener/);
  await assert.rejects(()=>db.query('select public.open_memory($1,$2)',[flower,'flower']),/still growing/);
  await db.query('select public.water_seed($1)',[flower]);const first=(await one('select watered_at from public.seeds where id=$1',[flower])).watered_at;
  await db.query('select public.water_seed($1)',[flower]);assert.deepEqual((await one('select watered_at from public.seeds where id=$1',[flower])).watered_at,first);
  await assert.rejects(()=>db.query('select public.open_memory($1,$2)',[flower,'flower']),/still growing/);
  await db.exec('reset role');await db.query("update public.seeds set watered_at=now()-interval '1 day' where id=$1",[flower]);await as(caretaker);
  const opened=await one('select public.open_memory($1,$2) result',[flower,'flower']);assert.equal(opened.result.awarded,10);assert.equal(opened.result.message,'Only for us');
  assert.equal((await one('select public.open_memory($1,$2) result',[flower,'flower'])).result.awarded,0);
  assert.equal((await one('select public.open_memory($1,$2) result',[gift,'gift'])).result.awarded,100);
  assert.equal((await one('select public.open_memory($1,$2) result',[gift,'gift'])).result.awarded,0);
  assert.equal((await one('select balance from public.wallets')).balance,110);
  assert.equal((await one('select count(*)::int n from public.point_transactions')).n,2);
  await assert.rejects(()=>db.query('insert into public.point_transactions(user_id,amount,reason,source_id) values($1,10000,$2,$3)',[caretaker,'gift',crypto.randomUUID()]),/permission denied/);
 });
 await t.test('purchase idempotency, funds checks, placement ownership and rollback',async()=>{
  await as(caretaker);await db.query('select public.purchase($1,$2)',['lantern',purchase]);await db.query('select public.purchase($1,$2)',['lantern',purchase]);
  assert.equal((await one('select balance from public.wallets')).balance,35);
  assert.equal((await one('select count(*)::int n from public.inventory')).n,1);
  await assert.rejects(()=>db.query('select public.purchase($1,$2)',['bench',purchase]),/different item/);
  await assert.rejects(()=>db.query('select public.purchase($1,$2)',['cottage',crypto.randomUUID()]),/LovePoints/);
  assert.equal((await one('select balance from public.wallets')).balance,35);
  assert.equal((await one('select count(*)::int n from public.point_transactions')).n,3);
  await assert.rejects(()=>db.query('select public.place_decoration($1,0)',[crypto.randomUUID()]),/not in your collection/);
  await db.query('select public.place_decoration($1,0)',[purchase]);await db.query('select public.place_decoration($1,1)',[purchase]);
  assert.equal((await one('select slot from public.decorations')).slot,1);
  await assert.rejects(()=>db.query('select public.place_decoration($1,99)',[purchase]),/foreign key/);
  assert.equal((await one('select slot from public.decorations')).slot,1);
  await as(gardener);await assert.rejects(()=>db.query('select public.place_decoration($1,0)',[purchase]),/caretaker/);
  await as(null,'anon');assert.equal((await one('select count(*)::int n from public.decorations')).n,1);
  const publicSeed=await one('select * from public.seeds');assert.equal('message' in publicSeed,false);assert.equal('photo_path' in publicSeed,false);
 });
 await t.test('claimed flowers expire by real timestamps, release spots offline and keep history',async()=>{
  await as(gardener);
  const replacement=crypto.randomUUID();
  const replant=()=>db.query('select public.plant_seed($1,0,$2,$3,null,null,$4)',[replacement,'daisy','A new chapter','']);
  await db.exec('reset role');await db.query("update public.seeds set opened_at=now()-interval '119 seconds' where id=$1",[flower]);await as(gardener);
  await assert.rejects(replant,/already holds/);
  await db.exec('reset role');await db.query("update public.seeds set opened_at=now()-interval '121 seconds' where id=$1",[flower]);await as(gardener);
  await replant();await replant();
  assert.equal((await one('select count(*)::int n from public.seeds where spot=0')).n,2);
  assert.equal((await one('select message from public.flower_content where seed_id=$1',[flower])).message,'Only for us');
  await db.query('select public.open_memory($1,$2)',[replacement,'flower']);
  assert.equal((await one('select opened_at from public.seeds where id=$1',[replacement])).opened_at,null);
  await assert.rejects(()=>db.query('select public.plant_seed($1,0,$2,$3,null,null,$4)',[crypto.randomUUID(),'rose','Collision','']),/already holds/);
  await as(caretaker);assert.equal((await one('select public.open_memory($1,$2) result',[flower,'flower'])).result.awarded,0);
  assert.equal((await one('select balance from public.wallets')).balance,35);
  assert.equal((await one('select count(*)::int n from public.point_transactions')).n,3);
 });
 await t.test('only the gardener can soft-remove, including direct private RPC attempts',async()=>{
  for(const user of [caretaker,stranger]){await as(user);await assert.rejects(()=>db.query('select public.remove_seed($1)',[flower]),/gardener/);await assert.rejects(()=>db.query('select private.remove_seed($1)',[flower]),/gardener/);await assert.rejects(()=>db.query('update public.seeds set removed_at=now() where id=$1',[flower]),/permission denied/);}
  await as(null,'anon');await assert.rejects(()=>db.query('select public.remove_seed($1)',[flower]),/permission denied/);
  await as(gardener);await assert.rejects(()=>db.query('delete from public.seeds where id=$1',[flower]),/permission denied/);
  const first=await one('select public.remove_seed($1) stamp',[flower]);assert.ok(first.stamp);
  assert.deepEqual((await one('select public.remove_seed($1) stamp',[flower])).stamp,first.stamp);
  await as(caretaker);const memory=(await one('select public.open_memory($1,$2) result',[flower,'flower'])).result;
  assert.equal(memory.awarded,0);assert.equal(memory.message,'Only for us');assert.equal((await one('select balance from public.wallets')).balance,35);
 });
 await t.test('unclaimed seeds, sprouts, buds and blooms remove without rewards or lost media',async()=>{
  for(let stage=0;stage<4;stage++){
   const id=crypto.randomUUID(),slot=stage+1;await as(gardener);
   await db.query('select public.plant_seed($1,$2,$3,$4,$5,$6,$7)',[id,slot,'rose','Keep the original','https://open.spotify.com/track/0123456789012345678901',gardener+'/photo.jpg','Our photograph']);
   if(stage){await db.exec('reset role');await db.query("update public.seeds set watered_at=now()-($2::int * interval '1 second') where id=$1",[id,stage===3?86400:stage===2?150:1]);}
   await as(gardener);await db.query('select public.remove_seed($1)',[id]);
   const kept=await one('select * from public.flower_content where seed_id=$1',[id]);assert.equal(kept.caption,'Our photograph');assert.equal(kept.photo_path,gardener+'/photo.jpg');assert.ok(kept.spotify_url);
   assert.equal((await one('select opened_at from public.seeds where id=$1',[id])).opened_at,null);
   await db.query('select public.plant_seed($1,$2,$3,$4,null,null,$5)',[crypto.randomUUID(),slot,'tulip','Ready immediately','']);
   await as(caretaker);await assert.rejects(()=>db.query('select public.water_seed($1)',[id]),/left the garden/);await assert.rejects(()=>db.query('select public.open_memory($1,$2)',[id,'flower']),/removed before/);
  }
  assert.equal((await one('select balance from public.wallets')).balance,35);
  assert.equal((await one('select count(*)::int n from public.point_transactions')).n,3);
  assert.equal((await one('select count(*)::int n from storage.objects')).n,1);
 });
 await t.test('Angry Mode is shared, reversible and restricted to the gardener without changing garden data',async()=>{
  await db.exec('reset role');
  const snapshot=()=>one("select (select epoch from public.game_clock) epoch,(select count(*)::int from public.seeds) seeds,(select count(*)::int from public.flower_content) memories,(select sum(balance)::int from public.wallets) points");
  const before=await snapshot();
  await as(null,'anon');assert.equal((await one('select public.garden_clock() state')).state.angry_mode,false);
  await assert.rejects(()=>db.query('select public.set_angry_mode(true)'),/permission denied/);
  for(const user of [caretaker,stranger]){await as(user);await assert.rejects(()=>db.query('select public.set_angry_mode(true)'),/gardener/);await assert.rejects(()=>db.query('select private.set_angry_mode(true)'),/gardener/);await assert.rejects(()=>db.query('update public.game_clock set angry_mode=true'),/permission denied/);}
  await as(gardener);await db.query('select public.set_angry_mode(true)');await db.query('select public.set_angry_mode(true)');
  await assert.rejects(()=>db.query('select public.set_angry_mode(null)'),/Choose whether/);
  for(const user of [caretaker,null]){await as(user,user?'authenticated':'anon');assert.equal((await one('select public.garden_clock() state')).state.angry_mode,true);}
  await as(gardener);await db.query('select public.set_angry_mode(false)');
  await as(null,'anon');assert.equal((await one('select public.garden_clock() state')).state.angry_mode,false);
  await db.exec('reset role');assert.deepEqual(await snapshot(),before);
 });
 await t.test('Rainbow Mode is gardener-only and atomically replaces Angry Mode without changing time or history',async()=>{
  await db.exec('reset role');const snapshot=()=>one("select (select epoch from public.game_clock) epoch,(select count(*)::int from public.seeds) seeds,(select count(*)::int from public.flower_content) memories,(select sum(balance)::int from public.wallets) points");const before=await snapshot();
  await as(null,'anon');await assert.rejects(()=>db.query('select public.set_rainbow_mode(true)'),/permission denied/);
  for(const user of [caretaker,stranger]){await as(user);await assert.rejects(()=>db.query('select public.set_rainbow_mode(true)'),/gardener/);await assert.rejects(()=>db.query('select private.set_rainbow_mode(true)'),/gardener/);await assert.rejects(()=>db.query('update public.game_clock set rainbow_mode=true'),/permission denied/);}
  await as(gardener);await db.query('select public.set_angry_mode(true)');await db.query('select public.set_rainbow_mode(true)');await db.query('select public.set_rainbow_mode(true)');
  await assert.rejects(()=>db.query('select public.set_rainbow_mode(null)'),/Choose whether/);
  for(const user of [caretaker,null]){await as(user,user?'authenticated':'anon');const state=(await one('select public.garden_clock() state')).state;assert.equal(state.rainbow_mode,true);assert.equal(state.angry_mode,false);}
  await as(gardener);await db.query('select public.set_angry_mode(false)');assert.equal((await one('select public.garden_clock() state')).state.rainbow_mode,true);
  await db.query('select public.set_angry_mode(true)');let state=(await one('select public.garden_clock() state')).state;assert.equal(state.rainbow_mode,false);assert.equal(state.angry_mode,true);
  await db.query('select public.set_rainbow_mode(true)');await db.query('select public.set_rainbow_mode(false)');state=(await one('select public.garden_clock() state')).state;assert.equal(state.rainbow_mode,false);assert.equal(state.angry_mode,false);
  await db.exec('reset role');await assert.rejects(()=>db.query('update public.game_clock set angry_mode=true,rainbow_mode=true'),/one_garden_mood/);assert.deepEqual(await snapshot(),before);
 });
 await t.test('SQL and frontend agree on daylight at boundaries and before the epoch',async()=>{
  await db.exec('reset role');
  for(const elapsed of [-1_200_001,-900_000,-1,0,599_999,600_000,1_199_999,1_200_000,10_800_000]){
   const row=await one('select private.daylight($1) value',[new Date(EPOCH+elapsed).toISOString()]);assert.equal(Number(row.value)*1000,daylightTotal(EPOCH+elapsed));
  }
  const rls=await one("select count(*)::int n from pg_tables where schemaname='public' and not rowsecurity");assert.equal(rls.n,0);
  const exposed=await one("select count(*)::int n from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef");assert.equal(exposed.n,0);
 });
 await db.close();
});
