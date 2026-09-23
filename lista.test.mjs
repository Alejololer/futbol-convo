// node lista.test.mjs
import assert from 'node:assert/strict';
import { ordenar, yaEsta, fechaLarga, textoWhatsApp } from './lista.js';

const players = {
  a: { name: 'Alejo A.', arq: true, ts: 1 },
  b: { name: 'Marquinhos', guestOf: 'Marcos', ts: 2 }, // invitado temprano
  c: { name: 'Andrés Páez', ts: 3 },
  d: { name: 'Sebas', ts: 4, out: 10 },                // se bajó
  e: { name: 'Macha', ts: 5 },
  f: { name: 'Richard', ts: 6 },
  g: { name: 'Pendiente' },                            // ts aún sin confirmar
};

const r = ordenar(players, 3);
assert.deepEqual(r.titulares.map(p => p.id), ['a', 'c', 'e']);
assert.deepEqual(r.suplentes.map(p => p.id), ['f', 'g', 'b'], 'invitado al final aunque llegó antes');
assert.deepEqual(r.bajas.map(p => p.id), ['d']);

assert.ok(yaEsta(players, '  andres  PAEZ'));
assert.ok(!yaEsta(players, 'sebas'), 'quien se bajó puede volver a apuntarse');

assert.equal(fechaLarga('2026-09-28T20:00'), 'LUNES 28 de septiembre a las 8:00 PM');

const txt = textoWhatsApp({ title: 'Convocatoria', when: '2026-09-28T20:00', place: 'Cancha 4', cupo: 4 }, r, 'http://x');
assert.match(txt, /^Convocatoria para el LUNES 28 de septiembre a las 8:00 PM Cancha 4/);
assert.match(txt, /\n1\. Alejo A\. \(arq\)\n2\. Andrés Páez\n3\. Macha\n4\.\nSuplente 1\. Richard\n/);
assert.match(txt, /Suplente 3\. Marquinhos \(inv\. de Marcos\)/);

console.log('ok');
