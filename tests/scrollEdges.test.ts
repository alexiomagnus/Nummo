import assert from 'node:assert/strict';
import test from 'node:test';
import { noScrollEdges, scrollEdges } from '../src/components/scrollEdges.ts';

test('bordi dello scorrimento: divisori solo dove il contenuto continua', () => {
  // Contenuto che entra (anche per un pixel frazionario) o area non ancora misurata: nessun divisorio.
  assert.deepEqual(scrollEdges(0, 600, 600), noScrollEdges);
  assert.deepEqual(scrollEdges(0, 600, 600.5), noScrollEdges);
  assert.deepEqual(scrollEdges(0, 0, 700), noScrollEdges);
  // In cima: solo sotto; a metà: entrambi; in fondo (anche con offset frazionario): solo sopra.
  assert.deepEqual(scrollEdges(0, 598, 706), { above: false, below: true });
  assert.deepEqual(scrollEdges(50, 598, 706), { above: true, below: true });
  assert.deepEqual(scrollEdges(107.6, 598, 706), { above: true, below: false });
});
