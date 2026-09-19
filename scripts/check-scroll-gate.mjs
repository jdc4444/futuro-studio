// One swipe moves one project. `npm run check:scroll` plays simulated wheel streams through the gesture gate
// (app/pilot/pilot-navigation.ts) the way pilot-projects.tsx uses it and counts the steps. Run it after touching either.
//
// The streams are built the way macOS delivers a two-finger swipe: a short ramp while the fingers move, then inertia that
// fades by a constant factor per frame, handed out in whole pixels (hence the tail's 1,1,2,1 and its thinning). On top of
// that, the things a real page adds: neighbouring events merged into one, and a busy page that receives a whole stretch
// late as one lump. Comparing neighbouring deltas mistook each of those for a renewed push; that was the double scroll.
import { createScrollGestureGate } from '../app/pilot/pilot-navigation.ts';

function swipe({ start = 0, peak = 30, ramp = 8, decay = 0.955, stop = 0.25, frame = 1000 / 60, cutAt = Infinity, sign = 1 } = {}) {
  const out = []; let kept = 0, t = start, v = 0;
  const emit = () => { kept += v; const d = Math.trunc(kept); kept -= d; if (d) out.push({ t, d: d * sign }); t += frame; };
  for (let i = 1; i <= ramp && t < cutAt; i++) { v = peak * Math.sin((i / ramp) * Math.PI / 2); emit(); }
  while (v > stop && t < cutAt) { v *= decay; emit(); }
  return out;
}
const merge = (...parts) => parts.flat().sort((a, b) => a.t - b.t);
function mergedPair(trace, at) {   // two neighbours delivered as one: deltas add up, the later time stays
  const out = trace.slice(), i = out.findIndex((e) => e.t >= at);
  if (i < 0 || i + 1 >= out.length) return out;
  out.splice(i, 2, { t: out[i + 1].t, d: out[i].d + out[i + 1].d }); return out;
}
function busyPage(trace, from, ms) {   // everything in between arrives as one event, stamped with the last one's time
  const inside = trace.filter((e) => e.t >= from && e.t < from + ms);
  if (!inside.length) return trace;
  return merge(trace.filter((e) => e.t < from || e.t >= from + ms), [{ t: inside[inside.length - 1].t, d: inside.reduce((s, e) => s + e.d, 0) }]);
}

// pilot-projects.tsx with no project open: a step holds the gate for the 580ms transition, which ends with another hold.
function steps(trace, transit = 580) {
  const gate = createScrollGestureGate(); let until = -1, count = 0;
  for (const { t, d } of trace) {
    if (until >= 0 && t >= until) { gate.hold(until, true); until = -1; }
    if (until >= 0) { gate.wheel(t, d, true); continue; }
    if (gate.wheel(t, d) || !gate.underway) continue;
    gate.hold(t); count++; until = t + transit;
  }
  return count;
}

const one = swipe(), after = (at, peak) => merge(swipe({ cutAt: at - 30 }), swipe({ start: at, peak }));
const every = (ms, n, d) => Array.from({ length: n }, (_, i) => ({ t: i * ms, d }));
const named = [
  ['one swipe', one, 1], ['one gentle swipe', swipe({ peak: 6 }), 1], ['one hard flick', swipe({ peak: 120 }), 1],
  ['one swipe with a long tail', swipe({ peak: 40, decay: 0.97 }), 1], ['one swipe whose tail thins out', swipe({ stop: 0.08 }), 1],
  ['one swipe, two tail events merged', mergedPair(one, 1200), 1], ['one swipe, page busy for 220ms', busyPage(one, 950, 220), 1],
  ['one stray pixel', [{ t: 0, d: 1 }], 0], ['a resting finger: a stray pixel every 0.4s', every(400, 5, 1), 0],
  ['one slow drag', every(1000 / 60, 36, 2), 1], ['one steady drag for 3s', every(1000 / 60, 180, 3), 1],
  ['swipe, then a swipe at 0.9s', after(900, 30), 2], ['swipe, then a gentle swipe at 1.0s', after(1000, 4), 2],
  ['swipe, then a swipe after the tail ended', merge(one, swipe({ start: 2500, peak: 20 })), 2],
  ['swipe down, then up', merge(swipe({ cutAt: 870 }), swipe({ start: 900, peak: 20, sign: -1 })), 2],
  ['mouse wheel: one notch', [{ t: 0, d: 100 }], 1], ['mouse wheel: two notches 0.7s apart', [{ t: 0, d: 100 }, { t: 700, d: 100 }], 2],
  ['mouse wheel: three quick notches', every(60, 3, 100), 1], ['line-mode wheel: one notch', [{ t: 0, d: 48 }], 1],
];

let seed = 12345; const random = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
function rough(trace, busy) {   // times off by up to 2ms, one event in 12 merged into the next, the page busy once or twice
  let t = trace.map((e) => ({ t: e.t + (random() - 0.5) * 4, d: e.d })).sort((a, b) => a.t - b.t); const out = [];
  for (let i = 0; i < t.length; i++) { if (i + 1 < t.length && random() < 1 / 12) { out.push({ t: t[i + 1].t, d: t[i].d + t[i + 1].d }); i++; } else out.push(t[i]); }
  t = out; if (busy) for (let k = 1 + Math.floor(random() * 2); k > 0; k--) t = busyPage(t, 300 + random() * 1400, 40 + random() * 260);
  return t;
}
const tally = { 'one swipe, tidy': [0, 0, 1], 'one swipe, rough delivery': [0, 0, 0.99], 'swipe + follow-up, tidy': [0, 0, 1], 'swipe + follow-up, rough delivery': [0, 0, 0.98] };
const count = (key, got, want) => { tally[key][1]++; if (got === want) tally[key][0]++; };
for (const frame of [1000 / 60, 1000 / 120]) {
  const fast = frame < 10, at = (o) => ({ frame, ramp: fast ? 16 : 8, ...o, peak: fast ? o.peak / 2 : o.peak, decay: fast ? Math.sqrt(o.decay ?? 0.955) : o.decay ?? 0.955 });
  for (const peak of [4, 6, 10, 20, 30, 60, 120]) for (const decay of [0.94, 0.955, 0.97]) for (const stop of [0.5, 0.25, 0.08]) {
    const base = swipe(at({ peak, decay, stop })); count('one swipe, tidy', steps(base), 1);
    for (let i = 0; i < 6; i++) { let t = base; for (let k = 0; k < 3; k++) t = mergedPair(t, 600 + random() * 1200); count('one swipe, tidy', steps(t), 1); }
    for (let i = 0; i < 6; i++) count('one swipe, tidy', steps(busyPage(base, 600 + random() * 1000, 60 + random() * 340)), 1);
    for (let i = 0; i < 12; i++) count('one swipe, rough delivery', steps(rough(base, true)), 1);
  }
  for (const first of [10, 30, 80]) for (const second of [3, 4, 5, 8, 15, 30]) for (let start = 750; start <= 1700; start += 50) {
    const pair = merge(swipe(at({ peak: first, cutAt: start - 30 })), swipe(at({ start, peak: second })));
    count('swipe + follow-up, tidy', steps(pair), 2);
    for (let i = 0; i < 4; i++) count('swipe + follow-up, rough delivery', steps(rough(pair, false)), 2);
  }
}

let failed = 0;
for (const [name, trace, want] of named) { const got = steps(trace); if (got !== want) { failed++; console.log(`FAIL ${name}: ${got} steps, want ${want}`); } }
console.log(`${named.length - failed} of ${named.length} named streams right`);
for (const [key, [right, all, floor]] of Object.entries(tally)) {
  const share = right / all, ok = share >= floor; if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${key}: ${right} of ${all} (${(share * 100).toFixed(1)}%, wants ${floor * 100}%)`);
}
process.exit(failed ? 1 : 0);
