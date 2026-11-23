import assert from 'node:assert/strict';
import test from 'node:test';
import { revealOrigin, revealRadius, themeRevealSpring, springEasing, springValue, switchTheme, themeSwitchAttribute } from '../src/theme/themeTransition.ts';

test('cambio tema: molla morbida, parte da 0, senza rimbalzo visibile, si ferma a 1', () => {
  assert.equal(springValue(themeRevealSpring, 0), 0);
  const samples = Array.from({ length: 200 }, (_, i) => springValue(themeRevealSpring, i / 200));
  const peak = Math.max(...samples);
  assert.ok(peak < 1.001, `nessun rimbalzo visibile, non ${peak}`);
  const at = (value: number) => samples.findIndex((sample) => sample >= value) * 5;
  assert.ok(at(0.9) >= 380 && at(0.9) <= 450, `90 % del raggio verso 410 ms (215 con la molla precedente), non ${at(0.9)}`);
  const { easing, duration } = springEasing(themeRevealSpring);
  assert.ok(duration >= 800 && duration <= 950, `durata entro 0,95 s, non ${duration} ms`);
  assert.match(easing, /^linear\(0, [\d., ]+, 1\)$/);
  const points = easing.slice('linear('.length, -1).split(', ').map(Number);
  assert.equal(points.length, 41);
  assert.ok(Math.abs(springValue(themeRevealSpring, duration / 1000) - 1) < 0.003, 'alla fine della durata la molla è ferma');
});

test('cambio tema: il cerchio copre tutta la finestra dal punto di partenza', () => {
  assert.equal(revealRadius({ x: 0, y: 0 }, 300, 400), 500);
  assert.equal(revealRadius({ x: 300, y: 400 }, 300, 400), 500);
  assert.equal(revealRadius({ x: 150, y: 200 }, 300, 400), 250);
});

test('cambio tema: parte dal centro del controllo, o della finestra se manca o è fuori vista', () => {
  assert.deepEqual(revealOrigin({ left: 340, top: 8, width: 48, height: 48 }, 412, 915), { x: 364, y: 32 });
  assert.deepEqual(revealOrigin(null, 412, 915), { x: 206, y: 457.5 });
  assert.deepEqual(revealOrigin({ left: 0, top: 0, width: 0, height: 0 }, 412, 915), { x: 206, y: 457.5 });
  assert.deepEqual(revealOrigin({ left: 10, top: 2000, width: 40, height: 40 }, 412, 915), { x: 206, y: 457.5 });
});

// Minimal document: only what switchTheme touches.
function fakeDocument(options: { viewTransitions: boolean; reduced?: boolean; throws?: boolean }) {
  const attributes = new Set<string>();
  const animations: unknown[] = [];
  let ready: () => void = () => undefined;
  const root = {
    setAttribute: (name: string) => attributes.add(name), removeAttribute: (name: string) => attributes.delete(name),
    animate: (...args: unknown[]) => { animations.push(args); },
  };
  const doc = {
    documentElement: root, body: {}, activeElement: { getBoundingClientRect: () => ({ left: 340, top: 8, width: 48, height: 48 }) },
    defaultView: {
      innerWidth: 412, innerHeight: 915, matchMedia: () => ({ matches: options.reduced ?? false }),
      CSS: { supports: () => true },
    },
    ...(options.viewTransitions ? {
      startViewTransition(update: () => void) {
        if (options.throws) throw new Error('InvalidStateError');
        update();
        return { ready: new Promise<void>((resolve) => { ready = resolve; }), finished: new Promise<void>(() => undefined) };
      },
    } : {}),
  };
  return { doc: doc as unknown as Document, attributes, animations, ready: () => ready() };
}

test('cambio tema: senza View Transitions, con movimento ridotto o in errore il tema cambia subito', () => {
  for (const options of [{ viewTransitions: false }, { viewTransitions: true, reduced: true }, { viewTransitions: true, throws: true }]) {
    const fake = fakeDocument(options);
    let applied = 0;
    switchTheme(fake.doc, () => { applied++; }, { reducedMotion: false });
    assert.equal(applied, 1);
    assert.equal(fake.animations.length, 0);
    assert.equal(fake.attributes.has(themeSwitchAttribute), false);
  }
  const fake = fakeDocument({ viewTransitions: true });
  let applied = 0;
  switchTheme(fake.doc, () => { applied++; }, { reducedMotion: true });
  assert.equal(applied, 1);
  assert.equal(fake.animations.length, 0);
});

test('cambio tema: transizioni CSS spente durante l’istantanea, poi cerchio dal pulsante su tutta la finestra', async () => {
  const fake = fakeDocument({ viewTransitions: true });
  let applied = 0;
  switchTheme(fake.doc, () => { applied++; }, { reducedMotion: false });
  assert.equal(applied, 1);
  assert.equal(fake.attributes.has(themeSwitchAttribute), true);
  fake.ready();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(fake.attributes.has(themeSwitchAttribute), false);
  assert.equal(fake.animations.length, 1);
  const [keyframes, timing] = fake.animations[0] as [{ clipPath: string[] }, { pseudoElement: string; duration: number }];
  const radius = revealRadius({ x: 364, y: 32 }, 412, 915);
  assert.deepEqual(keyframes.clipPath, ['circle(0px at 364px 32px)', `circle(${radius}px at 364px 32px)`]);
  assert.equal(timing.pseudoElement, '::view-transition-new(root)');
  assert.equal(timing.duration, springEasing(themeRevealSpring).duration);
});
