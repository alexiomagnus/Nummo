import assert from 'node:assert/strict';
import test from 'node:test';
import { cardClip, closeLead, crossfade, detailSpring, fullClip, usableCard } from '../src/theme/containerTransform.ts';
import { springEasing, springValue } from '../src/theme/themeTransition.ts';

const phone = { left: 0, top: 0, width: 390, height: 844 };
const card = { left: 12, top: 300, width: 366, height: 62 };

test('dettaglio spesa: il ritaglio iniziale è la scheda, con il suo raggio, e quello finale tutta la superficie', () => {
  assert.equal(cardClip(card, phone, 20), 'inset(300px 12px 482px 12px round 20px)');
  assert.equal(fullClip(0), 'inset(0px 0px 0px 0px round 0px)');
  // Desktop: il pannello comincia più in basso e a destra; la scheda è nelle stesse coordinate.
  const panel = { left: 248, top: 76, width: 1000, height: 700 };
  assert.equal(cardClip({ left: 280, top: 200, width: 936, height: 56.5 }, panel, 20), 'inset(124px 32px 519.5px 32px round 20px)');
  assert.equal(fullClip(28), 'inset(0px 0px 0px 0px round 28px)');
});

test('dettaglio spesa: la copia della scheda segue l’angolo del contenitore', () => {
});

test('dettaglio spesa: si parte dalla scheda solo se è disposta e per almeno metà visibile', () => {
  assert.equal(usableCard(card, phone), true);
  assert.equal(usableCard(null, phone), false);
  // Pagina nascosta (display: none) o vista cambiata: misure nulle.
  assert.equal(usableCard({ left: 0, top: 0, width: 0, height: 0 }, phone), false);
  // Scorsa via, o spostata fuori dallo schermo da una modifica della data.
  assert.equal(usableCard({ ...card, top: -100 }, phone), false);
  assert.equal(usableCard({ ...card, top: 900 }, phone), false);
  // Tagliata dal bordo inferiore per meno di metà: sì; per più di metà: no.
  assert.equal(usableCard({ ...card, top: 844 - 40 }, phone), true);
  assert.equal(usableCard({ ...card, top: 844 - 20 }, phone), false);
});

test('dettaglio spesa: molla morbida, risposta pronta, nessun rimbalzo, sotto i 600 ms', () => {
  const { duration, easing } = springEasing(detailSpring);
  assert.ok(duration >= 500 && duration <= 600, `durata ${duration}`);
  assert.match(easing, /^linear\(0, /);
  const samples = Array.from({ length: 300 }, (_, i) => springValue(detailSpring, i / 300));
  assert.ok(Math.max(...samples) < 1.0005, 'nessun rimbalzo');
  const at = (v: number) => samples.findIndex((value) => value >= v) * (1000 / 300);
  assert.ok(at(0.5) <= 130, `metà strada in ${at(0.5)} ms: risposta pronta al tocco`);
  assert.ok(at(0.9) >= 230 && at(0.9) <= 290, `90 % in ${at(0.9)} ms`);
});

test('dettaglio spesa: dissolvenza incrociata, mai due contenuti pieni insieme', () => {
  const { open, close } = crossfade;
  // Apertura: prima sparisce la copia della scheda, poi (a contenitore quasi pieno) compare il contenuto: mai sovrapposti.
  assert.ok(open.cardOut <= open.contentIn && open.contentIn >= 0.35 && open.contentIn < open.contentShown && open.contentShown < 1);
  // Chiusura: il contenuto se ne va prima che il contenitore si restringa (mai tagliato), poi torna la scheda.
  assert.ok(closeLead >= 60 && closeLead <= 120, 'breve anticipo, la risposta resta pronta');
  assert.ok(close.cardIn < close.cardShown && close.cardShown <= 0.4);
});
