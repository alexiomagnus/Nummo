import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useReducedMotion } from '../theme/useSizeClass';
import { useTheme } from 'react-native-paper';
import { radius } from '../theme/tokens';
import type { Background } from '../theme/background';

// The background of the app (27 November, on request, after Morphe's «Animazione dello sfondo»): `circles` = a few large soft circles
// drifting very slowly (GlobalStyle, `data-orb`); `rings`, `space`, `snow` and `particles` are drawn on a canvas; `none` draws nothing
// (the glass cards stay over the plain background). Behind everything, never a target; still with reduced motion.
const orbLayout = [
  { size: 0.95, top: -0.18, left: -0.42 },
  { size: 0.8, top: 0.12, left: 0.55 },
  { size: 0.7, top: 0.55, left: -0.3 },
  { size: 0.9, top: 0.78, left: 0.45 },
] as const;

// The `background` preference (App.tsx).
const BackgroundChoice = createContext<Background>('circles');
export const OrbsProvider = BackgroundChoice.Provider;

// The chosen animation, for a card that shows it in miniature (the Info header, 27 November, on request).
export const useBackgroundKind = () => useContext(BackgroundChoice);

// The canvas animations (not `circles`, `none`) drawn inside a small card, in the given ink: the card's own discs stand for `circles`.
export function MotionBackdrop({ ink }: { ink: string }) {
  const kind = useContext(BackgroundChoice);
  return kind === 'circles' || kind === 'none' ? null : <Canvas kind={kind} ink={ink} />;
}

export function Orbs({ color }: { color: string }) {
  const kind = useContext(BackgroundChoice);
  if (kind === 'none') return null;
  return kind === 'circles' ? <Circles color={color} /> : <Canvas kind={kind} />;
}

function Circles({ color }: { color: string }) {
  const [box, setBox] = useState<{ width: number; height: number } | null>(null);
  const side = box ? Math.max(Math.min(box.width, 900), 360) : 0;
  return (
    <View pointerEvents="none" aria-hidden style={styles.orbs} onLayout={(event) => setBox(event.nativeEvent.layout)}>
      {box && orbLayout.map((orb, index) => (
        <View key={index} {...{ dataSet: { orb: String(index) } }} style={[styles.orb, {
          backgroundColor: color, width: side * orb.size, height: side * orb.size,
          top: box.height * orb.top, left: box.width * orb.left,
        }]} />
      ))}
    </View>
  );
}

type Mote = { x: number; y: number; r: number; vx: number; vy: number; phase: number; speed: number };
type Ring = { x: number; y: number; age: number; period: number; max: number };

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const count = (kind: Background, w: number, h: number) => {
  const area = (w * h) / (390 * 800);
  return Math.round(Math.min(kind === 'space' ? 90 : kind === 'snow' ? 46 : 54, (kind === 'space' ? 70 : kind === 'snow' ? 34 : 40) * Math.max(area, 0.1)));
};

function Canvas({ kind, ink: given }: { kind: Background; ink?: string }) {
  const { colors } = useTheme();
  const host = useRef<unknown>(null);
  const reduce = useReducedMotion();
  // Light ink on dark, dark ink on light: the dots and flakes read on either background.
  const ink = given ?? colors.onSurface;
  useEffect(() => {
    const node = host.current as HTMLElement | null;
    if (!node) return;
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
    node.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) { canvas.remove(); return; }
    let w = 0, h = 0, motes: Mote[] = [], rings: Ring[] = [], frame = 0, last = 0;
    const setup = () => {
      const box = node.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(box.width, 1); h = Math.max(box.height, 1);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (kind === 'rings') {
        rings = Array.from({ length: 5 }, (_, i) => ({ x: rand(0.1, 0.9) * w, y: rand(0.1, 0.9) * h, age: i / 5, period: rand(24, 36), max: rand(0.35, 0.6) * Math.min(Math.max(w, 400), 900) }));
      } else {
        motes = Array.from({ length: count(kind, w, h) }, () => kind === 'snow'
          ? { x: rand(0, w), y: rand(0, h), r: rand(1.2, 4), vx: rand(-4, 4), vy: rand(14, 34), phase: rand(0, 6.28), speed: rand(0.4, 1) }
          : kind === 'space'
            ? { x: rand(0, w), y: rand(0, h), r: rand(0.4, 1.7), vx: rand(-1.5, 1.5), vy: rand(-1.5, 1.5), phase: rand(0, 6.28), speed: rand(0.3, 1.2) }
            : { x: rand(0, w), y: rand(0, h), r: rand(0.8, 2.4), vx: rand(-11, 11), vy: rand(-11, 11), phase: 0, speed: 1 });
      }
    };
    const draw = (t: number, dt: number) => {
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = ink; ctx.fillStyle = ink;
      if (kind === 'rings') {
        for (const ring of rings) {
          ring.age = (ring.age + dt / ring.period) % 1;
          for (let k = 0; k < 3; k++) {
            const a = (ring.age + k * 0.12) % 1;
            ctx.globalAlpha = 0.16 * (1 - a) ** 2; ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.arc(ring.x, ring.y, 6 + a * ring.max, 0, 6.2832); ctx.stroke();
          }
        }
      } else {
        for (const m of motes) {
          m.x += m.vx * dt; m.y += m.vy * dt;
          if (kind === 'snow') m.x += Math.sin(t * m.speed + m.phase) * 6 * dt;
          if (m.x < -10) m.x = w + 10; else if (m.x > w + 10) m.x = -10;
          if (m.y < -10) m.y = h + 10; else if (m.y > h + 10) m.y = -10;
          const twinkle = kind === 'space' ? 0.25 + 0.65 * (0.5 + 0.5 * Math.sin(t * m.speed * 1.6 + m.phase)) : kind === 'snow' ? 0.5 : 0.4;
          ctx.globalAlpha = twinkle;
          if (kind === 'snow' && m.r > 2.8) { // the larger flakes get six arms
            ctx.lineWidth = 1; ctx.beginPath();
            for (let a = 0; a < 3; a++) { const x = Math.cos(a * 1.0472 + m.phase) * m.r * 1.6, y = Math.sin(a * 1.0472 + m.phase) * m.r * 1.6; ctx.moveTo(m.x - x, m.y - y); ctx.lineTo(m.x + x, m.y + y); }
            ctx.stroke();
          } else { ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 6.2832); ctx.fill(); }
        }
        if (kind === 'particles') { // near particles are joined by a faint line
          ctx.lineWidth = 0.8;
          for (let i = 0; i < motes.length; i++) for (let j = i + 1; j < motes.length; j++) {
            const a = motes[i]!, b = motes[j]!, d = Math.hypot(a.x - b.x, a.y - b.y);
            if (d < 110) { ctx.globalAlpha = 0.14 * (1 - d / 110); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
          }
        }
      }
      ctx.globalAlpha = 1;
    };
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1); last = now;
      if (!document.hidden) draw(now / 1000, dt);
      frame = requestAnimationFrame(tick);
    };
    setup();
    if (reduce) draw(0, 0); else { last = performance.now(); frame = requestAnimationFrame(tick); }
    const observer = new ResizeObserver(() => { setup(); if (reduce) draw(0, 0); });
    observer.observe(node);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); canvas.remove(); };
  }, [kind, ink, reduce]);
  return <View ref={host as never} pointerEvents="none" aria-hidden style={styles.orbs} />;
}

const styles = StyleSheet.create({
  orbs: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  orb: { position: 'absolute', borderRadius: radius.pill },
});
