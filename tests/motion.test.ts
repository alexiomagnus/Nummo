import assert from 'node:assert/strict';
import test from 'node:test';
import { fadeTransition, fillTransition, transition, transitions } from '../src/theme/motion.ts';
import { motion } from '../src/theme/tokens.ts';

test('transizioni web: solo proprietà composite o di colore, durate e easing dei token', () => {
  const style = transition(['opacity', 'transform']) as Record<string, string>;
  assert.equal(style.transitionProperty, 'opacity, transform');
  assert.equal(style.transitionDuration, `${motion.short}ms`);
  assert.equal(style.transitionTimingFunction, `cubic-bezier(${motion.easing.join(', ')})`);
  const layout = /width|height|margin|padding|top|left|right|bottom/;
  for (const preset of [fadeTransition, fillTransition]) {
    assert.doesNotMatch((preset as Record<string, string>).transitionProperty!, layout);
  }
});

test('transizioni degli overlay: opacità rapida, trasformazione più lunga, uscita accelerata', () => {
  const style = transitions([['opacity', motion.fade], ['transform', motion.long, motion.enter]]) as Record<string, string>;
  assert.equal(style.transitionProperty, 'opacity, transform');
  assert.equal(style.transitionDuration, `${motion.fade}ms, ${motion.long}ms`);
  assert.equal(style.transitionTimingFunction, `cubic-bezier(${motion.easing.join(', ')}), cubic-bezier(${motion.enter.join(', ')})`);
  // Leaving surfaces stay solid first and vanish quickly: shorter than entering, on the accelerating curve.
  assert.ok(motion.fade < motion.short && motion.short < motion.exit && motion.exit < motion.long);
  assert.ok(motion.exitEasing[1]! === 0 && motion.exitEasing[0]! > motion.exitEasing[1]!);
});
