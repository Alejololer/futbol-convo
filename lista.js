// Lógica pura de la lista: sin Firebase ni DOM, para poder probarla con node.

export const normalizar = s =>
  (s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim().replace(/\s+/g, ' ');

// players: objeto { pushId: { name, arq, guestOf, uid, ts, out? } } tal cual viene de Firebase
export function ordenar(players, cupo) {
  const todos = Object.entries(players || {}).map(([id, p]) => ({ id, ...p }));
  const ts = p => p.ts ?? Infinity; // ts pendiente (escritura local aún sin confirmar) va al final
  const activos = todos
    .filter(p => !p.out)
    .sort((a, b) => !!a.guestOf - !!b.guestOf || ts(a) - ts(b)); // grupo primero, luego invitados
  return {
    titulares: activos.slice(0, cupo),
    suplentes: activos.slice(cupo),
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

export function textoWhatsApp(convo, { titulares, suplentes }, url) {
  return [
    `${convo.title} para el ${fechaLarga(convo.when)}${convo.place ? ' ' + convo.place : ''}`,
    '',
    ...titulares.map((p, i) => `${i + 1}. ${etiqueta(p)}`),
    ...Array.from({ length: convo.cupo - titulares.length }, (_, i) => `${titulares.length + i + 1}.`),
    ...suplentes.map((p, i) => `Suplente ${i + 1}. ${etiqueta(p)}`),
    '',
    `👉 Apúntate / bájate aquí: ${url}`,
  ].join('\n');
}
