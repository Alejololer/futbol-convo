// node lista.test.mjs
import assert from 'node:assert/strict';
import { porConfirmar, ordenar, yaEsta, fechaLarga, textoWhatsApp, cambios, enZona, semana, deudas, debe } from './lista.js';

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
assert.deepEqual(cambios({ ...g, a: { ...g.a, out: 9 } }, 4, 6).lineas, ['➖ A1 se bajó', '⬆️ A3 sube a titular (tiene que confirmar)']);
assert.match(textoWhatsApp({ title: 'T', when: '2026-09-28T20:00', cupo: 4 }, o, 'u'), /\n1\. A1 \(arq\)\n2\. A2 \(arq\)\n3\. C1\n4\. C2\nSuplente 1\. C3\nArquero en fila 1\. A3 \(arq\)\n/);

// cambios: lo que pasó desde la última marca
const ps = { a: { name: 'Ana', ts: 1 }, b: { name: 'Beto', ts: 2 }, c: { name: 'Caro', ts: 3 } };
let c = cambios(ps, 4, 3);
assert.deepEqual(c.lineas, [], 'sin cambios → sin aviso');
c = cambios({ ...ps, d: { name: 'Dani', ts: 4 }, e: { name: 'Pedro', guestOf: 'Marcos', ts: 5 } }, 4, 3);
assert.deepEqual(c.lineas, ['➕ Dani (suplente)', '🎟️ Pedro (inv. de Marcos) (suplente)']);
c = cambios({ ...ps, a: { name: 'Ana', ts: 1, out: 6 } }, 4, 3);
assert.deepEqual(c.lineas, ['➖ Ana se bajó', '⬆️ Caro sube a titular (tiene que confirmar)']);
assert.equal(c.hasta, 6);
c = cambios({ ...ps, g: { name: 'Gus', ts: 9 } }, 6, 3);
assert.deepEqual(c.lineas, ['➕ Gus']);
c = cambios({ ...ps, x: { name: 'Xavi', ts: 7 } }, 6, 3);
assert.deepEqual(c.lineas, ['➕ Xavi'], 'nuevo en lista con cupo libre → titular');

// grupo semanal (Guayaquil = UTC-5)
const tz = 'America/Guayaquil', at = s => Date.parse(s + '-05:00');
assert.equal(enZona('2026-10-26T20:00', tz), at('2026-10-26T20:00'));
assert.equal(enZona('2026-03-08T12:00', 'America/New_York'), Date.parse('2026-03-08T12:00-04:00'), 'después del cambio de horario');
const lun26 = { pid: '2026-10-26', when: '2026-10-26T20:00', abre: at('2026-10-21T13:00') };
assert.deepEqual(semana(at('2026-10-21T12:59'), tz, '20:00'), lun26, 'miércoles antes de la 1: mismo lunes, aún cerrado');
assert.deepEqual(semana(at('2026-10-20T09:00'), tz, '20:00'), lun26, 'martes');
assert.deepEqual(semana(at('2026-10-26T22:30'), tz, '20:00'), lun26, 'lunes durante el partido');
assert.equal(semana(at('2026-10-26T23:01'), tz, '20:00').pid, '2026-11-02', '3h después pasa al siguiente lunes');
assert.equal(semana(at('2026-10-25T23:59'), tz, '20:00').pid, '2026-10-26', 'domingo');

const partidos = {
  '2026-10-26': { when: '2026-10-26T20:00', players: {
    a: { name: 'Ana', uid: 'u1', ts: 1, out: at('2026-10-26T18:05') },            // mismo día → multa
    b: { name: 'Beto', uid: 'u2', ts: 2, out: at('2026-10-25T23:59') },           // domingo → nada
    c: { name: 'Pedro', uid: 'u2', guestOf: 'Beto', ts: 3, out: at('2026-10-26T08:00') }, // invitado → multa a Pedro
    d: { name: 'Caro', uid: 'u3', ts: 4 },
  } },
  x1: { when: '2026-10-30T19:00', extra: true, players: { e: { name: 'Dani', uid: 'u4', ts: 5, out: at('2026-10-30T10:00') } } },
};
let ds = deudas(partidos, {}, tz);
assert.deepEqual(ds.map(d => d.key), ['2026-10-26~c', '2026-10-26~a', 'x1~e']);
ds = deudas(partidos, { '2026-10-26~a': true }, tz);
assert.deepEqual(ds.map(d => d.name), ['Pedro', 'Dani'], 'pagada no cuenta');
assert.ok(debe(ds, ' pedro ', ''), 'invitado bloqueado por nombre');
assert.ok(!debe(ds, 'Beto', 'u2'), 'quien lo invitó no debe nada');
assert.ok(debe(ds, 'Daniel', 'u4'), 'mismo celular con otro nombre');
assert.ok(!debe(ds, 'Amigo de Dani', ''), 'puede apuntar a otro invitado');
c = cambios(partidos['2026-10-26'].players, 4, 4, { tz, when: '2026-10-26T20:00' });
assert.match(c.lineas[0], /^➖ Beto se bajó \(dom, 23:59\)$/, 'domingo: sin multa');
assert.match(c.lineas[1], /^➖ Pedro se bajó \(lun, 8:00\) 🍺 debe 3 cervezas$/);
assert.match(c.lineas[2], /^➖ Ana se bajó .* 🍺 debe 3 cervezas$/);

// reconfirmación: quien entró en espera y subió
const sup = { a: { name: 'A', ts: 1 }, b: { name: 'B', ts: 2 }, c: { name: 'C', ts: 3 }, d: { name: 'D', ts: 4 } }; // cupo 3 → 1 campo (2 de arqueros)
assert.deepEqual([...porConfirmar(sup, 3)], [], 'nadie subió');
assert.deepEqual([...porConfirmar({ ...sup, a: { ...sup.a, out: 9 } }, 3)], ['b'], 'B entró suplente y subió');
assert.deepEqual([...porConfirmar({ ...sup, a: { ...sup.a, out: 9 }, b: { ...sup.b, conf: true } }, 3)], [], 'ya confirmó');
assert.deepEqual([...porConfirmar({ a: { name: 'A', ts: 1, out: 2 }, b: { name: 'B', ts: 3 } }, 3)], [], 'entró con cupo libre: no confirma');
assert.deepEqual(deudas({ l: { when: '2026-10-26T20:00', players: { b: { name: 'B', ts: 2, out: at('2026-10-26T18:00'), sube: true } } } }, {}, tz), [], 'suplente que subió y no puede: sin multa');

console.log('ok');
