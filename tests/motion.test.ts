import assert from 'node:assert/strict';
import test from 'node:test';
import { fadeTransition, fillTransition, transition } from '../src/theme/motion.ts';
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
