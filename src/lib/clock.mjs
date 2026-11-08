export const EPOCH = Date.parse('2026-01-01T00:00:00Z');
export const DAY = 600_000;
export const CYCLE = DAY * 2;
export function daylightTotal(time, epoch = EPOCH) {
  const elapsed = time - epoch;
  const cycles = Math.floor(elapsed / CYCLE);
  return cycles * DAY + Math.min(DAY, elapsed - cycles * CYCLE);
}
export function growth(wateredAt, now, epoch = EPOCH) {
  if (!wateredAt) return 0;
  return Math.max(0, Math.min(1, (daylightTotal(now, epoch) - daylightTotal(Date.parse(wateredAt), epoch)) / 300_000));
}
export function clockState(now, epoch = EPOCH) {
  const phase = ((now - epoch) % CYCLE + CYCLE) % CYCLE;
  const day = phase < DAY;
  const seconds = Math.ceil((day ? DAY - phase : CYCLE - phase) / 1000);
  // Twilight ramps stay continuous across both phase boundaries.
  const night = phase < DAY ? Math.max(0, 1-phase/60_000, (phase-540_000)/60_000) : 1;
  return {day, phase, seconds, night, label: day ? (phase < 60_000 ? 'Sunrise' : phase > 540_000 ? 'Golden hour' : 'Daylight') : 'Moonlight'};
}
