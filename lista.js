// Lógica pura de la lista: sin Firebase ni DOM, para poder probarla con node.

export const normalizar = s =>
  (s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim().replace(/\s+/g, ' ');

export const ARQ = 2; // cupos exclusivos para arqueros

// players: objeto { pushId: { name, arq, guestOf, uid, ts, out? } } tal cual viene de Firebase
export function ordenar(players, cupo) {
  const todos = Object.entries(players || {}).map(([id, p]) => ({ id, ...p }));
  const ts = p => p.ts ?? Infinity; // ts pendiente (escritura local aún sin confirmar) va al final
  const activos = todos
    .filter(p => !p.out)
    .sort((a, b) => !!a.guestOf - !!b.guestOf || ts(a) - ts(b)); // grupo primero, luego invitados
  const arq = activos.filter(p => p.arq), campo = activos.filter(p => !p.arq);
  return {
    titulares: [...arq.slice(0, ARQ), ...campo.slice(0, cupo - ARQ)], // puestos 1..ARQ solo arqueros
    suplentes: campo.slice(cupo - ARQ),
    arqueros: arq.slice(ARQ), // fila de arqueros extra
    bajas: todos.filter(p => p.out).sort((a, b) => a.out - b.out),
  };
}

export const yaEsta = (players, name) =>
  Object.values(players || {}).some(p => !p.out && normalizar(p.name) === normalizar(name));

const DIAS = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// "2026-09-28T20:00" -> "LUNES 28 de septiembre a las 8:00 PM"
export function fechaLarga(when) {
  const d = new Date(when);
  if (isNaN(d)) return when || '';
  const h = d.getHours(), m = String(d.getMinutes()).padStart(2, '0');
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]} a las ${h % 12 || 12}:${m} ${h < 12 ? 'AM' : 'PM'}`;
}

const etiqueta = p => p.name + (p.arq ? ' (arq)' : '') + (p.guestOf ? ` (inv. de ${p.guestOf})` : '');

// Mayor ts/out de la lista: marca de hasta dónde ya se avisó.
export const marca = players => Math.max(0, ...Object.values(players || {}).flatMap(p => [p.ts || 0, p.out || 0]));

// Qué pasó en la lista desde la marca `desde` (el mayor ts/out ya avisado). Devuelve las líneas del aviso y la nueva marca.
// Un jugador nuevo = ts > desde; una baja = out > desde. Se compara la lista de antes con la de ahora para detectar quién sube o baja de titular.
export function cambios(players, cupo, desde) {
  const todos = Object.entries(players || {}).map(([id, p]) => ({ id, ...p }));
  const hasta = Math.max(desde || 0, marca(players));
  const antes = {};
  for (const p of todos) if ((p.ts || 0) <= desde) antes[p.id] = p.out > desde ? { ...p, out: undefined } : p;
  const a = ordenar(antes, cupo), ahora = ordenar(players, cupo);
  const tit = new Set(ahora.titulares.map(p => p.id)), titAntes = new Set(a.titulares.map(p => p.id));
  const ev = [];
  for (const p of todos) {
    if (p.ts > desde && !p.out) ev.push([p.ts, `${p.guestOf ? '🎟️' : '➕'} ${etiqueta(p)}${tit.has(p.id) ? '' : ' (suplente)'}`]);
    else if (p.out > desde && p.ts <= desde) ev.push([p.out, `➖ ${p.name} se bajó`]);
    if (p.ts <= desde && !p.out) {
      if (tit.has(p.id) && !titAntes.has(p.id)) ev.push([hasta, `⬆️ ${p.name} sube a titular`]);
      else if (!tit.has(p.id) && titAntes.has(p.id)) ev.push([hasta, `⬇️ ${p.name} pasa a suplente`]);
    }
  }
  return { lineas: ev.sort((x, y) => x[0] - y[0]).map(e => e[1]), hasta, titulares: ahora.titulares.length };
}

export function textoWhatsApp(convo, { titulares, suplentes, arqueros = [] }, url) {
  const ta = titulares.filter(p => p.arq), tc = titulares.filter(p => !p.arq);
  const vac = (n, ini, sufijo) => Array.from({ length: Math.max(0, n) }, (_, i) => `${ini + i + 1}.${sufijo}`);
  return [
    `${convo.title} para el ${fechaLarga(convo.when)}${convo.place ? ' ' + convo.place : ''}`,
    '',
    ...ta.map((p, i) => `${i + 1}. ${etiqueta(p)}`),
    ...vac(ARQ - ta.length, ta.length, ' 🧤'),
    ...tc.map((p, i) => `${ARQ + i + 1}. ${etiqueta(p)}`),
    ...vac(convo.cupo - ARQ - tc.length, ARQ + tc.length, ''),
    ...suplentes.map((p, i) => `Suplente ${i + 1}. ${etiqueta(p)}`),
    ...arqueros.map((p, i) => `Arquero en fila ${i + 1}. ${etiqueta(p)}`),
    '',
    `👉 Apúntate / bájate aquí: ${url}`,
  ].join('\n');
}
