type Point = { x: number; y: number };
type Size = { width: number; height: number };
type Camera = Point & { zoom: number };
type Pointer = Point & { capture: Element };

export const gardenSize = { width: 720, height: 450 };
const initialCamera = { x: gardenSize.width / 2, y: gardenSize.height / 2, zoom: 1 };
const baseHeight = 480;
const dragThreshold = 8;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const clampZoom = (zoom: number) => clamp(zoom, 0.75, 2.5);
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const midpoint = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const unitsPerPixel = (camera: Camera, viewport: Size) => baseHeight / (camera.zoom * viewport.height);

export function constrainCamera(camera: Camera, viewport: Size): Camera {
 const zoom = clampZoom(camera.zoom);
 const scale = unitsPerPixel({ ...camera, zoom }, viewport);
 const boundAxis = (center: number, world: number, pixels: number) => {
  // A small screen-space gutter makes edges reachable around the garden controls.
  const gutter = Math.min(64, pixels * 0.12) * scale;
  const minimum = Math.min(world / 2, pixels * scale / 2 - gutter);
  return clamp(center, minimum, world - minimum);
 };
 return { x: boundAxis(camera.x, gardenSize.width, viewport.width), y: boundAxis(camera.y, gardenSize.height, viewport.height), zoom };
}

export function moveCamera(camera: Camera, viewport: Size, from: Point, to: Point, zoom = camera.zoom): Camera {
 const nextZoom = clampZoom(zoom);
 const oldScale = unitsPerPixel(camera, viewport);
 const newScale = unitsPerPixel({ ...camera, zoom: nextZoom }, viewport);
 const cx = viewport.width / 2;
 const cy = viewport.height / 2;
 return constrainCamera({
  x: camera.x + (from.x - cx) * oldScale - (to.x - cx) * newScale,
  y: camera.y + (from.y - cy) * oldScale - (to.y - cy) * newScale,
  zoom: nextZoom,
 }, viewport);
}

export function connectGardenCamera(svg: SVGSVGElement, onInteraction?: () => void) {
 let viewport: Size = { width: 1, height: 1 };
 let camera = initialCamera;
 let paintedCamera = camera;
 let resetTarget: Camera | undefined;
 let notifyInteraction = onInteraction;
 let frame = 0;
 let lastFrame = 0;
 let wheelZoom: { zoom: number; anchor: Point } | undefined;
 let velocity: Point = { x: 0, y: 0 };
 let coasting = false;
 const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
 const pointers = new Map<number, Pointer>();
 let start: Point = { x: 0, y: 0 };
 let blockClick = false;
 let lastMove = 0;

 const paint = () => {
  const scale = unitsPerPixel(camera, viewport);
  const width = viewport.width * scale;
  const height = viewport.height * scale;
  svg.setAttribute('viewBox', `${camera.x - width / 2} ${camera.y - height / 2} ${width} ${height}`);
  paintedCamera = camera;
 };

 function schedule() {
  if (!frame) frame = window.requestAnimationFrame(tick);
 }

 function tick(time: number) {
  const elapsed = lastFrame ? clamp(time - lastFrame, 0, 32) : 16;
  lastFrame = time;
  frame = 0;
  if (resetTarget) {
   const dx = resetTarget.x - camera.x;
   const dy = resetTarget.y - camera.y;
   const dz = resetTarget.zoom - camera.zoom;
   if (reducedMotion.matches || (Math.hypot(dx, dy) < 0.2 && Math.abs(dz) < 0.002)) {
    camera = resetTarget;
    resetTarget = undefined;
   } else {
    const progress = 1 - Math.exp(-elapsed / 48);
    camera = constrainCamera({
     x: camera.x + dx * progress,
     y: camera.y + dy * progress,
     zoom: camera.zoom + dz * progress,
    }, viewport);
   }
  }
  if (wheelZoom) {
   const remaining = wheelZoom.zoom - camera.zoom;
   const done = reducedMotion.matches || Math.abs(remaining) < 0.002;
   const zoom = done ? wheelZoom.zoom : camera.zoom + remaining * (1 - Math.exp(-elapsed / 36));
   camera = moveCamera(camera, viewport, wheelZoom.anchor, wheelZoom.anchor, zoom);
   if (done) wheelZoom = undefined;
  }
  if (coasting) {
   const decay = Math.exp(-elapsed / 85);
   const scale = unitsPerPixel(camera, viewport);
   const target = {
    x: camera.x - velocity.x * (1 - decay) * 85 * scale,
    y: camera.y - velocity.y * (1 - decay) * 85 * scale,
    zoom: camera.zoom,
   };
   if (!reducedMotion.matches) camera = constrainCamera(target, viewport);
   velocity = {
    x: camera.x === target.x ? velocity.x * decay : 0,
    y: camera.y === target.y ? velocity.y * decay : 0,
   };
   coasting = Math.hypot(velocity.x, velocity.y) > 0.03;
  }
  const changed = camera.x !== paintedCamera.x || camera.y !== paintedCamera.y || camera.zoom !== paintedCamera.zoom;
  paint();
  if (changed && notifyInteraction) {
   notifyInteraction();
   notifyInteraction = undefined;
  }
  if (wheelZoom || coasting || resetTarget) schedule();
  else lastFrame = 0;
 }

 function stopMotion() {
  resetTarget = undefined;
  wheelZoom = undefined;
  coasting = false;
  velocity = { x: 0, y: 0 };
 }

 function cancelGesture() {
  if (pointers.size) blockClick = true;
  for (const [id, pointer] of [...pointers]) {
   pointers.delete(id);
   if (pointer.capture.hasPointerCapture(id)) pointer.capture.releasePointerCapture(id);
  }
  stopMotion();
 }

 function resize() {
  const bounds = svg.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return;
  if (bounds.width === viewport.width && bounds.height === viewport.height) return;
  const isResetting = Boolean(resetTarget);
  cancelGesture();
  viewport = { width: bounds.width, height: bounds.height };
  camera = constrainCamera(camera, viewport);
  if (isResetting) {
   resetTarget = constrainCamera(initialCamera, viewport);
   schedule();
  }
  paint();
 }

 function down(event: PointerEvent) {
  if (event.button !== 0 || (pointers.size && event.pointerType !== 'touch')) return;
  const point = { x: event.clientX, y: event.clientY };
  const capture = event.target instanceof Element ? event.target : svg;
  if (!pointers.size) {
   start = point;
   blockClick = false;
  } else blockClick = true;
  stopMotion();
  lastMove = event.timeStamp;
  pointers.set(event.pointerId, { ...point, capture });
  // Keeping capture on the original hit target preserves native clicks for taps.
  capture.setPointerCapture(event.pointerId);
 }

 function move(event: PointerEvent) {
  const previous = pointers.get(event.pointerId);
  if (!previous) return;
  const point = { x: event.clientX, y: event.clientY };
  if (point.x === previous.x && point.y === previous.y) return;
  const before = Array.from(pointers.values());
  pointers.set(event.pointerId, { ...point, capture: previous.capture });
  if (pointers.size >= 2) {
   const [a, b] = pointers.values();
   const [oldA, oldB] = before;
   const bounds = svg.getBoundingClientRect();
   const local = (p: Point) => ({ x: p.x - bounds.left, y: p.y - bounds.top });
   camera = moveCamera(camera, viewport, local(midpoint(oldA, oldB)), local(midpoint(a, b)),
    camera.zoom * Math.max(1, distance(a, b)) / Math.max(1, distance(oldA, oldB)));
  } else {
   if (!blockClick && distance(start, point) < dragThreshold) return;
   const from = blockClick ? previous : start;
   blockClick = true;
   camera = moveCamera(camera, viewport, from, point);
   const elapsed = Math.max(8, event.timeStamp - lastMove);
   velocity = {
    x: clamp((point.x - previous.x) / elapsed, -0.48, 0.48),
    y: clamp((point.y - previous.y) / elapsed, -0.48, 0.48),
   };
  }
  lastMove = event.timeStamp;
  schedule();
 }

 function up(event: PointerEvent) {
  if (!pointers.has(event.pointerId)) return;
  const wasPinching = pointers.size > 1;
  move(event);
  pointers.delete(event.pointerId);
  if (wasPinching) {
   velocity = { x: 0, y: 0 };
   lastMove = event.timeStamp;
  } else if (blockClick && event.timeStamp - lastMove < 85 && !reducedMotion.matches) {
   coasting = Math.hypot(velocity.x, velocity.y) > 0.03;
   if (coasting) schedule();
  }
 }

 function interrupt(event: PointerEvent) {
  if (pointers.has(event.pointerId)) cancelGesture();
 }

 function click(event: MouseEvent) {
  // Keyboard and assistive technology can dispatch a click without a pointer.
  const pointerClick = event.detail > 0 || ('pointerId' in event && Number(event.pointerId) >= 0);
  if (pointerClick && (blockClick || pointers.size)) {
   event.preventDefault();
   event.stopPropagation();
  }
 }

 function zoomBy(factor: number, anchor: Point) {
  if (pointers.size) return;
  resetTarget = undefined;
  coasting = false;
  wheelZoom = { zoom: clampZoom((wheelZoom?.zoom ?? camera.zoom) * factor), anchor };
  schedule();
 }

 function wheel(event: WheelEvent) {
  if (!event.deltaY) return;
  event.preventDefault();
  if (pointers.size) return;
  const bounds = svg.getBoundingClientRect();
  const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.height : 1;
  const delta = clamp(event.deltaY * unit, -180, 180);
  zoomBy(Math.exp(-delta * 0.0025), { x: event.clientX - bounds.left, y: event.clientY - bounds.top });
 }

 const preventDrag = (event: Event) => event.preventDefault();
 const observer = new ResizeObserver(resize);
 resize();
 observer.observe(svg);
 svg.addEventListener('pointerdown', down);
 svg.addEventListener('pointermove', move);
 svg.addEventListener('pointerup', up);
 svg.addEventListener('pointercancel', interrupt);
 svg.addEventListener('click', click, true);
 svg.addEventListener('dragstart', preventDrag);
 svg.addEventListener('wheel', wheel, { passive: false });
 window.addEventListener('blur', cancelGesture);
 document.addEventListener('visibilitychange', cancelGesture);
 document.addEventListener('lostpointercapture', interrupt);

 return {
  zoom: (factor: number) => zoomBy(factor, { x: viewport.width / 2, y: viewport.height / 2 }),
  reset: () => {
   cancelGesture();
   resetTarget = constrainCamera(initialCamera, viewport);
   schedule();
  },
  dispose: () => {
   observer.disconnect();
   window.cancelAnimationFrame(frame);
   svg.removeEventListener('pointerdown', down);
   svg.removeEventListener('pointermove', move);
   svg.removeEventListener('pointerup', up);
   svg.removeEventListener('pointercancel', interrupt);
   svg.removeEventListener('click', click, true);
   svg.removeEventListener('dragstart', preventDrag);
   svg.removeEventListener('wheel', wheel);
   window.removeEventListener('blur', cancelGesture);
   document.removeEventListener('visibilitychange', cancelGesture);
   document.removeEventListener('lostpointercapture', interrupt);
   cancelGesture();
  },
 };
}
