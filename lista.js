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
    .sort((a, b) => !!a.guestOf - !!b.guestOf || ts(a) - ts(b) || (a.id < b.id ? -1 : 1)); // grupo primero, luego invitados; empate por pushId
  const arq = activos.filter(p => p.arq), campo = activos.filter(p => !p.arq);
  return {
    titulares: [...arq.slice(0, ARQ), ...campo.slice(0, cupo - ARQ)], // puestos 1..ARQ solo arqueros
    suplentes: campo.slice(cupo - ARQ),
    arqueros: arq.slice(ARQ), // fila de arqueros extra
    bajas: todos.filter(p => p.out).sort((a, b) => a.out - b.out),
  };
}

// Titulares que entraron en espera (suplente o fila de arqueros) y subieron porque alguien se bajó: tienen que reconfirmar que pueden ir.
// Se reconstruye la lista tal como estaba cuando cada uno se apuntó (los que se bajaron después aún estaban dentro).
export function porConfirmar(players, cupo) {
  const todos = Object.entries(players || {});
  return new Set(ordenar(players, cupo).titulares.filter(p => !p.conf && p.ts).filter(p => {
    const entonces = Object.fromEntries(todos.filter(([, q]) => q.ts <= p.ts).map(([k, q]) => [k, q.out > p.ts ? { ...q, out: undefined } : q]));
    return !ordenar(entonces, cupo).titulares.some(q => q.id === p.id);
  }).map(p => p.id));
}

export const yaEsta =(players, name) =>
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
// `grupo` ({ tz, when }) solo en partidos del grupo semanal: la baja lleva la hora y la multa si fue el mismo día.
export function cambios(players, cupo, desde, grupo) {
  const todos = Object.entries(players || {}).map(([id, p]) => ({ id, ...p }));
  const hasta = Math.max(desde || 0, marca(players));
  const antes = {};
  for (const p of todos) if ((p.ts || 0) <= desde) antes[p.id] = p.out > desde ? { ...p, out: undefined } : p;
  const a = ordenar(antes, cupo), ahora = ordenar(players, cupo);
  const tit = new Set(ahora.titulares.map(p => p.id)), titAntes = new Set(a.titulares.map(p => p.id));
  const ev = [];
  for (const p of todos) {
    if (p.ts > desde && !p.out) ev.push([p.ts, `${p.guestOf ? '🎟️' : '➕'} ${etiqueta(p)}${tit.has(p.id) ? '' : ' (suplente)'}`]);
    else if (p.out > desde && p.ts <= desde) ev.push([p.out, `➖ ${p.name} se bajó` + (grupo ? ` (${horaEn(p.out, grupo.tz)})${multa(p.out, grupo) ? ` 🍺 debe ${CERVEZAS} cervezas` : ''}` : '')]);
    if (p.ts <= desde && !p.out) {
      if (tit.has(p.id) && !titAntes.has(p.id)) ev.push([hasta, `⬆️ ${p.name} sube a titular (tiene que confirmar)`]);
      else if (!tit.has(p.id) && titAntes.has(p.id)) ev.push([hasta, `⬇️ ${p.name} pasa a suplente`]);
    }
  }
  return { lineas: ev.sort((x, y) => x[0] - y[0]).map(e => e[1]), hasta, titulares: ahora.titulares.length };
}

// ---------- Grupo semanal: partido fijo los lunes, la lista se abre el miércoles anterior a la 1 PM ----------
export const CERVEZAS = 3;
const DIA = 864e5;
const local = (ms, tz) => new Date(ms).toLocaleString('sv', { timeZone: tz }).replace(' ', 'T'); // 'YYYY-MM-DDTHH:MM:SS'
export const diaLocal = (ms, tz) => local(ms, tz).slice(0, 10);
const horaEn = (ms, tz) => new Date(ms).toLocaleString('es', { timeZone: tz, weekday: 'short', hour: 'numeric', minute: '2-digit' });
const sumar = (fecha, n) => new Date(Date.parse(fecha) + n * DIA).toISOString().slice(0, 10);

// '2026-10-26T20:00' en la zona tz -> ms. Dos pasadas para acertar el desfase cerca de un cambio de horario.
export function enZona(fechaHora, tz) {
  const g = Date.parse(fechaHora + 'Z');
  let t = g - (Date.parse(local(g, tz) + 'Z') - g);
  return g - (Date.parse(local(t, tz) + 'Z') - t);
}

// Partido del lunes que toca ahora: sigue siendo el de esta semana hasta 3h después de empezar.
export function semana(now, tz, hora) {
  const hoy = diaLocal(now, tz);
  let lunes = sumar(hoy, (8 - new Date(hoy).getUTCDay()) % 7);
  if (enZona(`${lunes}T${hora}`, tz) + 3 * 36e5 < now) lunes = sumar(lunes, 7);
  return { pid: lunes, when: `${lunes}T${hora}`, abre: enZona(`${sumar(lunes, -5)}T13:00`, tz) };
}

// Bajarse el mismo día del partido = multa.
const multa = (out, { tz, when }) => diaLocal(out, tz) === when.slice(0, 10);

// Multas pendientes: se derivan de la historia (las bajas no se pueden borrar ni cambiar de hora), menos las que el admin marcó pagadas.
export const deudas = (partidos, pagos, tz) => Object.entries(partidos || {}).flatMap(([pid, pa]) =>
  Object.entries(pa.players || {})
    .filter(([k, p]) => p.out && !p.sube && !pagos?.[`${pid}~${k}`] && multa(p.out, { tz, when: pa.when }))
    .map(([k, p]) => ({ ...p, id: k, key: `${pid}~${k}`, pid, when: pa.when })))
  .sort((a, b) => a.out - b.out);

// La multa es de quien se bajó: mismo nombre, o mismo celular si se apunta a sí mismo (uid vacío al apuntar a un invitado).
export const debe = (lista, name, uid) =>
  lista.find(d => normalizar(d.name) === normalizar(name) || (uid && d.uid === uid && !d.guestOf));

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
