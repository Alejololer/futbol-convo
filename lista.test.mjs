// node lista.test.mjs
import assert from 'node:assert/strict';
import { ordenar, yaEsta, fechaLarga, textoWhatsApp, cambios } from './lista.js';

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
assert.deepEqual(r.titulares.map(p => p.id), ['a', 'c'], '2 puestos son de arquero: solo cabe 1 de campo con cupo 3');
assert.deepEqual(r.suplentes.map(p => p.id), ['e', 'f', 'g', 'b'], 'invitado al final aunque llegó antes');
assert.deepEqual(r.bajas.map(p => p.id), ['d']);

assert.ok(yaEsta(players, '  andres  PAEZ'));
assert.ok(!yaEsta(players, 'sebas'), 'quien se bajó puede volver a apuntarse');

assert.equal(fechaLarga('2026-09-28T20:00'), 'LUNES 28 de septiembre a las 8:00 PM');

const txt = textoWhatsApp({ title: 'Convocatoria', when: '2026-09-28T20:00', place: 'Cancha 4', cupo: 4 }, ordenar(players, 4), 'http://x');
assert.match(txt, /^Convocatoria para el LUNES 28 de septiembre a las 8:00 PM Cancha 4/);
assert.match(txt, /\n1\. Alejo A\. \(arq\)\n2\. 🧤\n3\. Andrés Páez\n4\. Macha\nSuplente 1\. Richard\n/);
assert.match(txt, /Suplente 3. Marquinhos \(inv\. de Marcos\)/);

// arqueros: 2 puestos fijos, el resto en fila; el campo no los usa
const g = { a: { name: 'A1', arq: true, ts: 1 }, b: { name: 'A2', arq: true, ts: 2 }, c: { name: 'A3', arq: true, ts: 3 }, d: { name: 'C1', ts: 4 }, e: { name: 'C2', ts: 5 }, f: { name: 'C3', ts: 6 } };
let o = ordenar(g, 4);
assert.deepEqual(o.titulares.map(p => p.id), ['a', 'b', 'd', 'e']);
assert.deepEqual(o.arqueros.map(p => p.id), ['c']);
assert.deepEqual(o.suplentes.map(p => p.id), ['f']);
assert.deepEqual(cambios({ ...g, a: { ...g.a, out: 9 } }, 4, 6).lineas, ['➖ A1 se bajó', '⬆️ A3 sube a titular']);
assert.match(textoWhatsApp({ title: 'T', when: '2026-09-28T20:00', cupo: 4 }, o, 'u'), /\n1\. A1 \(arq\)\n2\. A2 \(arq\)\n3\. C1\n4\. C2\nSuplente 1\. C3\nArquero en fila 1\. A3 \(arq\)\n/);

// cambios: lo que pasó desde la última marca
const ps = { a: { name: 'Ana', ts: 1 }, b: { name: 'Beto', ts: 2 }, c: { name: 'Caro', ts: 3 } };
let c = cambios(ps, 4, 3);
assert.deepEqual(c.lineas, [], 'sin cambios → sin aviso');
c = cambios({ ...ps, d: { name: 'Dani', ts: 4 }, e: { name: 'Pedro', guestOf: 'Marcos', ts: 5 } }, 4, 3);
assert.deepEqual(c.lineas, ['➕ Dani (suplente)', '🎟️ Pedro (inv. de Marcos) (suplente)']);
c = cambios({ ...ps, a: { name: 'Ana', ts: 1, out: 6 } }, 4, 3);
assert.deepEqual(c.lineas, ['➖ Ana se bajó', '⬆️ Caro sube a titular']);
assert.equal(c.hasta, 6);
c = cambios({ ...ps, g: { name: 'Gus', ts: 9 } }, 6, 3);
assert.deepEqual(c.lineas, ['➕ Gus']);
c = cambios({ ...ps, x: { name: 'Xavi', ts: 7 } }, 6, 3);
assert.deepEqual(c.lineas, ['➕ Xavi'], 'nuevo en lista con cupo libre → titular');

console.log('ok');
