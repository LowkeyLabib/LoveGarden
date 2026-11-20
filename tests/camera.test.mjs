import test from 'node:test';
import assert from 'node:assert/strict';
import { connectGardenCamera, constrainCamera, gardenSize, moveCamera } from '../src/garden/camera.ts';

const portrait = { width: 390, height: 650 };

test('viewport and zoom bounds allow both world edges in each axis', () => {
 for (const viewport of [portrait, { width: 1400, height: 540 }]) {
  for (const zoom of [0.75, 1, 2.5]) {
   const low = constrainCamera({ x: -10000, y: -10000, zoom }, viewport);
   const high = constrainCamera({ x: 10000, y: 10000, zoom }, viewport);
   const halfHeight = 240 / zoom;
   const halfWidth = halfHeight * viewport.width / viewport.height;
   assert.ok(low.x - halfWidth <= 0 && low.y - halfHeight <= 0);
   assert.ok(high.x + halfWidth >= gardenSize.width && high.y + halfHeight >= gardenSize.height);
   assert.ok(low.x >= 0 && high.x <= gardenSize.width);
   assert.ok(low.y >= 0 && high.y <= gardenSize.height);
  }
 }
});

test('pinch keeps the world point under a moving midpoint at the zoom limit', () => {
 const initial = { x: 360, y: 225, zoom: 2 };
 const from = { x: 120, y: 250 };
 const to = { x: 146, y: 291 };
 const next = moveCamera(initial, portrait, from, to, 3);
 const world = (camera, point) => [
  camera.x + (point.x - portrait.width / 2) * 480 / (camera.zoom * portrait.height),
  camera.y + (point.y - portrait.height / 2) * 480 / (camera.zoom * portrait.height),
 ];
 assert.equal(next.zoom, 2.5);
 assert.ok(world(next, to).every((value, index) => Math.abs(value - world(initial, from)[index]) < 1e-9));
});

test('camera accumulates buffered pointer moves and only lets genuine taps through', t => {
 const frames = new Map();
 let frameID = 0;
 let resize;
 class Surface extends EventTarget {
  bounds = { ...portrait, left: 12, top: 30 };
  captured = new Set();
  getBoundingClientRect() { return this.bounds; }
  setAttribute(_name, value) { this.viewBox = value.split(' ').map(Number); }
  setPointerCapture(id) { this.captured.add(id); }
  hasPointerCapture(id) { return this.captured.has(id); }
  releasePointerCapture(id) { this.captured.delete(id); }
 }
 const globals = {
  window: Object.assign(new EventTarget(), {
   matchMedia: () => ({ matches: true }),
   requestAnimationFrame: cb => (frames.set(++frameID, cb), frameID),
   cancelAnimationFrame: id => frames.delete(id),
  }),
  document: new EventTarget(),
  Element: Surface,
  ResizeObserver: class {
   constructor(callback) { resize = callback; }
   observe() {}
   disconnect() {}
  },
 };
 const originals = Object.entries(globals).map(([key, value]) => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
  Object.defineProperty(globalThis, key, { value, configurable: true });
  return [key, descriptor];
 });
 let controls;
 t.after(() => {
  controls?.dispose();
  for (const [key, descriptor] of originals) {
   if (descriptor) Object.defineProperty(globalThis, key, descriptor);
   else Reflect.deleteProperty(globalThis, key);
  }
 });
 const surface = new Surface();
 let interactions = 0;
 controls = connectGardenCamera(surface, () => interactions++);
 const send = (type, values) => {
  const event = Object.assign(new Event(type, { cancelable: true }), values);
  return surface.dispatchEvent(event);
 };
 const pointer = (type, x, y, id = 1, pointerType = 'mouse') =>
  send('pointer' + type, { clientX: x, clientY: y, pointerId: id, pointerType, button: 0 });
 const click = () => send('click', { detail: 1 });
 const flush = () => {
  const pending = [...frames.values()];
  frames.clear();
  pending.forEach(cb => cb(performance.now()));
 };
 const initial = surface.viewBox;
 pointer('down', 180, 300);
 pointer('move', 185, 303);
 pointer('up', 185, 303);
 assert.equal(click(), true);
 assert.equal(interactions, 0);
 assert.equal(frames.size, 0);
 pointer('down', 180, 300);
 pointer('move', 200, 310);
 pointer('move', 220, 320);
 pointer('up', 220, 320);
 assert.equal(click(), false);
 assert.equal(send('click', { detail: 0 }), true);
 assert.equal(frames.size, 1);
 flush();
 assert.equal(interactions, 1);
 assert.ok(Math.abs(surface.viewBox[0] - (initial[0] - 40 * 480 / portrait.height)) < 1e-9);
 assert.ok(surface.viewBox[1] < initial[1]);

 pointer('down', 110, 300, 1, 'touch');
 pointer('down', 210, 300, 2, 'touch');
 pointer('move', 260, 300, 2, 'touch');
 pointer('up', 260, 300, 2, 'touch');
 flush();
 const pinched = surface.viewBox;
 assert.equal(pinched[3], 320);
 pointer('move', 125, 300, 1, 'touch');
 flush();
 assert.ok(surface.viewBox[0] < pinched[0]);
 pointer('cancel', 125, 300, 1, 'touch');
 assert.equal(click(), false);
 pointer('down', 180, 300, 3, 'touch');
 pointer('up', 180, 300, 3, 'touch');
 assert.equal(click(), true);

 const cursor = { x: 140, y: 280 };
 const atCursor = ([x, y, w, h]) => [x + cursor.x * w / portrait.width, y + cursor.y * h / portrait.height];
 const before = atCursor(surface.viewBox);
 assert.equal(send('wheel', { clientX: cursor.x + 12, clientY: cursor.y + 30, deltaY: -100, deltaMode: 0 }), false);
 flush();
 assert.ok(atCursor(surface.viewBox).every((value, index) => Math.abs(value - before[index]) < 1e-9));
 assert.equal(interactions, 1);
 controls.reset();
 flush();
 assert.deepEqual(surface.viewBox, initial);
 surface.bounds = { ...surface.bounds, width: 650, height: 390 };
 resize();
 assert.ok(Math.abs(surface.viewBox[2] / surface.viewBox[3] - 650 / 390) < 1e-9);
});
