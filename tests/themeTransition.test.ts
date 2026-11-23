import assert from 'node:assert/strict';
import test from 'node:test';
import { revealOrigin, revealRadius, slowSpatialSpring, springEasing, springValue, switchTheme, themeSwitchAttribute } from '../src/theme/themeTransition.ts';

test('cambio tema: molla spaziale lenta M3 Expressive, parte da 0, supera appena la fine e si ferma a 1', () => {
  assert.equal(springValue(slowSpatialSpring, 0), 0);
  const samples = Array.from({ length: 200 }, (_, i) => springValue(slowSpatialSpring, i / 200));
  const peak = Math.max(...samples);
  assert.ok(peak > 1 && peak < 1.03, `overshoot leggero (rapporto 0,8), non ${peak}`);
  const { easing, duration } = springEasing(slowSpatialSpring);
  assert.ok(duration >= 450 && duration <= 800, `durata da movimento a tutto schermo, non ${duration} ms`);
  assert.match(easing, /^linear\(0, [\d., ]+, 1\)$/);
  const points = easing.slice('linear('.length, -1).split(', ').map(Number);
  assert.equal(points.length, 41);
  assert.ok(Math.abs(springValue(slowSpatialSpring, duration / 1000) - 1) < 0.002, 'alla fine della durata la molla è ferma');
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
  assert.equal(timing.duration, springEasing(slowSpatialSpring).duration);
});
