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
 const migration=(await readdir('supabase/migrations')).find(f=>f.endsWith('_lovegarden.sql'));
 await db.exec((await readFile(`supabase/migrations/${migration}`,'utf8')).replace(/^\uFEFF/,''));
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
